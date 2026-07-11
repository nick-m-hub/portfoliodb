"""
Stage 0 Email: Generate and send the monthly Signals trading email.

Run on the same day as stage0_signals.py (last trading day of the month),
after holdings for the upcoming month have been stored. Diffs this month's
holdings against last month's, asks Claude for a short data-driven "market
context" paragraph plus a one-line summary per rebalanced portfolio, builds
the HTML email, and sends a preview to NOTIFY_EMAIL.

Two-step, GitHub Actions friendly workflow (no interactive prompt):
    1. python stage0_email.py --month 2026-06
       Generates the email, sends a preview to NOTIFY_EMAIL, and saves it
       as a draft (signal_emails.html_body) for review.
    2. Review the preview email. If it looks good:
       python stage0_email.py --month 2026-06 --send
       Sends the saved draft to every active Signals subscriber via Resend
       and logs sent_at + recipient_count.

--force regenerates a draft that already exists, or resends a month that
was already sent.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import requests
from anthropic import Anthropic
from dotenv import load_dotenv

from utils import get_supabase_client, get_target_month, month_display, DOTENV_PATH, subtract_months

RESEND_API_URL = "https://api.resend.com/emails"
FROM_EMAIL = "PortfolioDB <support@portfoliodb.com>"
CLAUDE_MODEL = "claude-haiku-4-5"

# Polite delay between individual member sends (seconds)
SEND_DELAY = 0.5


# ---------------------------------------------------------------------------
# Data fetching + diffing
# ---------------------------------------------------------------------------

def fetch_holdings(supabase, target_date):
    """Return { portfolio_slug: [{ticker, weight}, ...] } sorted by weight desc."""
    resp = (
        supabase.table("tactical_monthly_holdings")
        .select("portfolio_slug, ticker, weight")
        .eq("date", target_date)
        .execute()
    )
    grouped = {}
    for row in resp.data:
        grouped.setdefault(row["portfolio_slug"], []).append(
            {"ticker": row["ticker"], "weight": float(row["weight"])}
        )
    for slug in grouped:
        grouped[slug].sort(key=lambda h: h["weight"], reverse=True)
    return grouped


def diff_holdings(current, prior):
    """Compare two holdings lists. Returns (entered, exited, changed)."""
    cur_map = {h["ticker"]: h["weight"] for h in current}
    pri_map = {h["ticker"]: h["weight"] for h in prior}

    entered = [{"ticker": t, "weight": cur_map[t]} for t in cur_map if t not in pri_map]
    exited = [{"ticker": t, "weight": pri_map[t]} for t in pri_map if t not in cur_map]
    changed = [
        {"ticker": t, "from": pri_map[t], "to": cur_map[t]}
        for t in cur_map
        if t in pri_map and abs(pri_map[t] - cur_map[t]) > 0.001
    ]
    return entered, exited, changed


# ---------------------------------------------------------------------------
# Claude — market context + per-portfolio summaries
# ---------------------------------------------------------------------------

def call_claude(rebalanced):
    """
    rebalanced: list of { slug, name, entered, exited, changed } (weights as 0-1 fractions)
    Returns { "market_context": str, "summaries": { slug: str } }
    """
    client = Anthropic()

    # Convert weights to percentages for the prompt
    prompt_data = []
    for p in rebalanced:
        prompt_data.append({
            "name": p["name"],
            "entered": [{"ticker": e["ticker"], "pct": round(e["weight"] * 100, 1)} for e in p["entered"]],
            "exited": [{"ticker": e["ticker"], "pct": round(e["weight"] * 100, 1)} for e in p["exited"]],
            "changed": [
                {"ticker": c["ticker"], "from_pct": round(c["from"] * 100, 1), "to_pct": round(c["to"] * 100, 1)}
                for c in p["changed"]
            ],
        })

    prompt = f"""You are writing the "market context" section of PortfolioDB's monthly tactical signals email, sent to paying subscribers.

Below is data on every tactical portfolio that changed its holdings this month, comparing last month's holdings to this month's. Weights are percentages of the portfolio.

Rules:
- Base everything ONLY on the data provided. Do not invent market events, news, or causes that aren't visible in this data.
- Write 2-4 sentences identifying the overall theme(s) across these changes (e.g. a shift toward or away from equities, bonds, cash, or commodities). Reference specific portfolio names and numbers where useful.
- Use plain language a retail investor would understand. Where natural, pair a ticker with what it represents (e.g. "cash (BIL)", "long-term Treasuries (IEF)", "U.S. equities (SPY)", "gold (GLD)").
- Also write ONE concise sentence (under 15 words) per portfolio describing its specific change, e.g. "Increased cash to 40%, exited commodities."

Data:
{json.dumps(prompt_data, indent=2)}

Respond with ONLY valid JSON in this exact format, no markdown fences, no other text:
{{
  "market_context": "...",
  "summaries": {{
    "Portfolio Name": "...",
    ...
  }}
}}"""

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    # Strip markdown code fences if Claude adds them anyway
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        truncated = response.stop_reason == "max_tokens"
        raise RuntimeError(
            f"Claude returned malformed JSON for {len(rebalanced)} rebalanced portfolios "
            f"(stop_reason={response.stop_reason}"
            f"{', likely truncated by max_tokens' if truncated else ''}): {e}\n"
            f"--- raw response ---\n{text}"
        ) from e

    # Map summaries back to slugs by name
    name_to_slug = {p["name"]: p["slug"] for p in rebalanced}
    summaries_by_slug = {}
    for name, summary in parsed.get("summaries", {}).items():
        slug = name_to_slug.get(name)
        if slug:
            summaries_by_slug[slug] = summary

    return parsed["market_context"], summaries_by_slug


# ---------------------------------------------------------------------------
# HTML email
# ---------------------------------------------------------------------------

def format_pct(weight):
    pct = weight * 100
    if abs(pct - round(pct)) < 0.05:
        return f"{round(pct)}%"
    return f"{pct:.1f}%"


def holdings_table_html(holdings):
    rows = "".join(
        f'<tr><td style="padding:1px 8px 1px 0;font-weight:bold;">{h["ticker"]}</td>'
        f'<td style="padding:1px 0;">&mdash; {format_pct(h["weight"])}</td></tr>'
        for h in holdings
    )
    return f'<table style="font-size:13px;color:#1a1c1a;border-collapse:collapse;">{rows}</table>'


def build_email_html(month_str, market_context, rebalanced, unchanged_names):
    rebalanced_html = ""
    for p in rebalanced:
        summary = p.get("summary", "")
        summary_html = (
            f'<p style="margin:0 0 6px;font-size:13px;color:#404943;font-style:italic;">{summary}</p>'
            if summary else ""
        )
        rebalanced_html += f"""
      <div style="margin-bottom:18px;">
        <p style="margin:0 0 2px;font-size:14px;font-weight:bold;color:#1a1c1a;">{p['name']}</p>
        {summary_html}
        {holdings_table_html(p['current'])}
      </div>"""

    unchanged_html = ""
    if unchanged_names:
        unchanged_html = f"""
    <div style="padding:4px 24px 20px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#074a34;border-bottom:2px solid #074a34;padding-bottom:6px;">No change this month ({len(unchanged_names)})</p>
      <p style="margin:0;font-size:13px;line-height:1.8;color:#404943;">
        {" &middot; ".join(unchanged_names)}
      </p>
    </div>"""

    rebalanced_section = ""
    if rebalanced:
        rebalanced_section = f"""
    <div style="padding:20px 24px 8px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#074a34;border-bottom:2px solid #074a34;padding-bottom:6px;">Rebalanced this month ({len(rebalanced)})</p>
      {rebalanced_html}
    </div>"""
    else:
        rebalanced_section = """
    <div style="padding:20px 24px 8px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0;font-size:13px;color:#404943;">No portfolios in the Signals set changed their holdings this month.</p>
    </div>"""

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf8;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #bfc9c2;">
          <tr>
            <td style="background:#074a34;padding:20px 24px;">
              <p style="margin:0;font-size:13px;font-weight:bold;color:#ffffff;letter-spacing:0.02em;">PORTFOLIODB SIGNALS</p>
              <p style="margin:4px 0 0;font-size:18px;color:#ffffff;">{month_str} monthly update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 4px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#404943;text-transform:uppercase;letter-spacing:0.04em;">Market context</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#1a1c1a;">{market_context}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 4px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#404943;background:#f0f4f0;border-radius:8px;padding:12px 16px;">
                Have a custom mix saved in the Portfolio Builder? <a href="https://www.portfoliodb.com/account" style="color:#074a34;font-weight:bold;">Visit your account page</a> to see this month's blended holdings for your saved portfolios.
              </p>
            </td>
          </tr>
          <tr>
            <td>{rebalanced_section}</td>
          </tr>
          <tr>
            <td>{unchanged_html}</td>
          </tr>
          <tr>
            <td style="background:#f0f4f0;padding:16px 24px;">
              <p style="margin:0 0 4px;font-size:12px;color:#404943;line-height:1.6;">
                Holdings shown are this month's signals for each portfolio in the Signals set. Past performance does not guarantee future results.
              </p>
              <p style="margin:0;font-size:12px;color:#404943;">
                <a href="https://portfoliodb.memberful.com/account" style="color:#074a34;">Manage your subscription</a> &middot; <a href="mailto:support@portfoliodb.com" style="color:#074a34;">support@portfoliodb.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Resend
# ---------------------------------------------------------------------------

def send_email(api_key, to_email, subject, html):
    resp = requests.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"from": FROM_EMAIL, "to": [to_email], "subject": subject, "html": html},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def send_to_subscribers(supabase, resend_key, target_month, month_str, html):
    """Send the draft HTML to every entitled Signals subscriber and log the result.

    CR-2 (July 2026): mirrors lib/entitlements.js — 'cancelled' members are paid
    through the end of their billing period and still get the email until
    current_period_end passes; 'expired' members don't.
    """
    subs_resp = (
        supabase.table("user_subscriptions")
        .select("email, status, current_period_end")
        .eq("plan", "signals")
        .in_("status", ["active", "cancelled"])
        .execute()
    )
    now = datetime.now(timezone.utc)
    entitled = [
        r for r in subs_resp.data
        if r.get("email")
        and (
            not r.get("current_period_end")
            or datetime.fromisoformat(r["current_period_end"].replace("Z", "+00:00")) > now
        )
    ]
    recipient_emails = sorted({r["email"] for r in entitled})

    print(f"Sending {month_str} Signals email to {len(recipient_emails)} subscriber(s)...")
    subject = f"PortfolioDB Signals — {month_str}"
    sent_count = 0
    for email in recipient_emails:
        try:
            send_email(resend_key, email, subject, html)
            sent_count += 1
            print(f"  sent  {email}")
        except requests.exceptions.RequestException as e:
            print(f"  FAILED {email}: {e}")
        time.sleep(SEND_DELAY)

    print(f"\n  {sent_count}/{len(recipient_emails)} sent successfully.\n")

    supabase.table("signal_emails").update({
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "recipient_count": sent_count,
    }).eq("month", target_month.isoformat()).execute()

    print(f"{'='*60}")
    print(f"DONE — {month_str} sent to {sent_count} subscriber(s)")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="Stage 0 Email: Generate and send the monthly Signals email")
    parser.add_argument("--month", type=str, required=True, help="Month the holdings are in effect for, YYYY-MM")
    parser.add_argument("--send", action="store_true", help="Send the previously generated draft to all active Signals subscribers")
    parser.add_argument("--force", action="store_true", help="Regenerate a draft that already exists, or resend a month already sent")
    args = parser.parse_args()

    load_dotenv(dotenv_path=DOTENV_PATH)
    resend_key = os.environ.get("RESEND_API_KEY")
    notify_email = os.environ.get("NOTIFY_EMAIL")
    if not resend_key:
        raise EnvironmentError("Missing RESEND_API_KEY in .env.local")
    if not notify_email and not args.send:
        raise EnvironmentError("Missing NOTIFY_EMAIL in .env.local")

    target_month = get_target_month(args.month)
    prior_month = subtract_months(target_month, 1)
    month_str = month_display(target_month)

    print(f"\n{'='*60}")
    print(f"Stage 0 Email: {month_str}{' (send)' if args.send else ' (draft)'}")
    print(f"{'='*60}\n")

    supabase = get_supabase_client()

    existing = (
        supabase.table("signal_emails")
        .select("month, html_body, market_context, sent_at, recipient_count")
        .eq("month", target_month.isoformat())
        .execute()
    )
    existing_row = existing.data[0] if existing.data else None

    # -------------------------------------------------------------------
    # SEND MODE — deliver a previously generated draft to subscribers
    # -------------------------------------------------------------------
    if args.send:
        if not existing_row or not existing_row.get("html_body"):
            print(f"  No draft found for {month_str}.")
            print(f"  Run without --send first to generate and preview it:")
            print(f"    python stage0_email.py --month {args.month}")
            sys.exit(1)

        if existing_row.get("sent_at") and not args.force:
            print(f"  Already sent for {month_str}: sent_at={existing_row['sent_at']}, recipients={existing_row['recipient_count']}")
            print("  Use --force to resend.")
            sys.exit(0)

        send_to_subscribers(supabase, resend_key, target_month, month_str, existing_row["html_body"])
        return

    # -------------------------------------------------------------------
    # DRAFT MODE — generate (or reuse) the email and send a preview
    # -------------------------------------------------------------------
    if existing_row and existing_row.get("sent_at") and not args.force:
        print(f"  {month_str} was already sent (sent_at={existing_row['sent_at']}).")
        print("  Use --force to regenerate a new draft.")
        sys.exit(0)

    if existing_row and existing_row.get("html_body") and not args.force:
        print(f"  Draft already exists for {month_str} — resending preview without regenerating.")
        print("  (use --force to regenerate from scratch)\n")
        html = existing_row["html_body"]
        market_context = existing_row["market_context"]

        print(f"Sending preview to {notify_email}...")
        send_email(resend_key, notify_email, f"[PREVIEW] PortfolioDB Signals — {month_str}", html)
        print("  Sent.\n")

        print(f"{'='*60}")
        print("MARKET CONTEXT")
        print(f"{'='*60}")
        print(market_context)
        print()
        print(f"Review the preview at {notify_email}. If it looks good, run:")
        print(f"  python stage0_email.py --month {args.month} --send")
        return

    # -------------------------------------------------------------------
    # STEP 1: Fetch holdings + signal portfolios
    # -------------------------------------------------------------------
    print(f"Fetching holdings for {target_month.isoformat()} and {prior_month.isoformat()}...")
    current_holdings = fetch_holdings(supabase, target_month.isoformat())
    prior_holdings = fetch_holdings(supabase, prior_month.isoformat())

    portfolios_resp = (
        supabase.table("portfolios")
        .select("slug, name")
        .not_.is_("kofi_link", "null")
        .order("name")
        .execute()
    )
    signal_portfolios = portfolios_resp.data
    print(f"  {len(signal_portfolios)} portfolios in the Signals set\n")

    # -------------------------------------------------------------------
    # STEP 2: Diff each portfolio
    # -------------------------------------------------------------------
    rebalanced = []
    unchanged = []

    for p in signal_portfolios:
        slug, name = p["slug"], p["name"]
        current = current_holdings.get(slug)

        if not current:
            print(f"  [WARN] No holdings found for {name} ({slug}) in {target_month.isoformat()} — skipping")
            continue

        prior = prior_holdings.get(slug)

        if prior is None:
            # No prior-month data at all (newly tracked) — can't compute a diff,
            # so don't claim a rebalance happened.
            unchanged.append(name)
            continue

        entered, exited, changed = diff_holdings(current, prior)

        if entered or exited or changed:
            rebalanced.append({
                "slug": slug,
                "name": name,
                "current": current,
                "entered": entered,
                "exited": exited,
                "changed": changed,
            })
        else:
            unchanged.append(name)

    print(f"  Rebalanced: {len(rebalanced)}")
    print(f"  No change : {len(unchanged)}\n")

    # -------------------------------------------------------------------
    # STEP 3: Claude — market context + per-portfolio summaries
    # -------------------------------------------------------------------
    if rebalanced:
        print("Calling Claude for market context...")
        market_context, summaries = call_claude(rebalanced)
        for p in rebalanced:
            p["summary"] = summaries.get(p["slug"], "")
        print("  Done.\n")
    else:
        market_context = "No portfolios in the Signals set changed their holdings this month — all current positions remain unchanged from last month."

    # -------------------------------------------------------------------
    # STEP 4: Build HTML, save draft, send preview
    # -------------------------------------------------------------------
    html = build_email_html(month_str, market_context, rebalanced, unchanged)

    supabase.table("signal_emails").upsert({
        "month": target_month.isoformat(),
        "market_context": market_context,
        "html_body": html,
        "sent_at": None,
        "recipient_count": None,
    }, on_conflict="month").execute()

    print(f"Sending preview to {notify_email}...")
    send_email(resend_key, notify_email, f"[PREVIEW] PortfolioDB Signals — {month_str}", html)
    print("  Sent.\n")

    print(f"{'='*60}")
    print("MARKET CONTEXT")
    print(f"{'='*60}")
    print(market_context)
    print()

    if rebalanced:
        print("REBALANCED PORTFOLIOS:")
        for p in rebalanced:
            print(f"  {p['name']}")
            print(f"    {p['summary']}")
        print()

    print(f"Review the preview at {notify_email}. If it looks good, run:")
    print(f"  python stage0_email.py --month {args.month} --send")


if __name__ == "__main__":
    main()
