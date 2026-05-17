"""
Stage 1: Fetch prices, calculate portfolio returns, write to staging table.

Run this manually or via GitHub Actions on the 3rd of each month.
Usage:
    python stage1_calculate.py              # auto-detects last completed month
    python stage1_calculate.py --month 2026-04   # override to a specific month
"""

import argparse
import os
import smtplib
import time
from calendar import monthrange
from datetime import date, timedelta
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

from utils import get_supabase_client, get_target_month, month_display, DOTENV_PATH

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Flag a portfolio if its blended return is outside this range (in percent).
# These are intentionally wide — a monthly move beyond ±25% is very unusual
# for a diversified portfolio and almost certainly indicates a data error.
FLAG_THRESHOLD_LOW = -25.0
FLAG_THRESHOLD_HIGH = 25.0

# Polite delay between EODHD API requests (seconds)
API_DELAY = 0.1


# ---------------------------------------------------------------------------
# EODHD price fetching
# ---------------------------------------------------------------------------

def fetch_ticker_prices(ticker: str, from_date: date, to_date: date, api_key: str) -> list:
    """
    Fetch end-of-day price history for one ticker from EODHD.
    Returns a list of dicts with 'date' and 'adjusted_close' keys.
    Returns an empty list if the request fails.

    EODHD requires tickers in the format TICKER.US for US-listed ETFs.
    """
    url = (
        f"https://eodhd.com/api/eod/{ticker}.US"
        f"?api_token={api_key}&fmt=json"
        f"&from={from_date}&to={to_date}"
    )

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, list) or len(data) == 0:
            print(f"  [WARN] No price data returned for {ticker}")
            return []

        return data

    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Failed to fetch {ticker}: {e}")
        return []


def get_last_trading_day_price(price_data: list, before_or_on: date) -> Optional[float]:
    """
    Find the adjusted_close on the last available trading day on or before
    the given date. Price data must be sorted ascending by date (EODHD default).
    Returns None if no data is available.
    """
    result = None
    cutoff = before_or_on.isoformat()

    for row in price_data:
        if row["date"] <= cutoff:
            result = row.get("adjusted_close")
        else:
            break

    return result


def calculate_ticker_return(price_data: list, target_month: date) -> Optional[float]:
    """
    Calculate a ticker's return for the target month.
    start_price = adjusted close on last trading day of the PRIOR month
    end_price   = adjusted close on last trading day of the TARGET month
    return      = (end / start - 1) * 100, rounded to 6 decimal places
    Returns None if either price is missing.
    """
    # Last day of the prior month
    prior_month_end = target_month - timedelta(days=1)

    # Last day of the target month
    last_day = monthrange(target_month.year, target_month.month)[1]
    target_month_end = target_month.replace(day=last_day)

    start_price = get_last_trading_day_price(price_data, prior_month_end)
    end_price = get_last_trading_day_price(price_data, target_month_end)

    if start_price is None or end_price is None or start_price == 0:
        return None

    return round((end_price / start_price - 1) * 100, 6)


# ---------------------------------------------------------------------------
# Email notification
# ---------------------------------------------------------------------------

def send_summary_email(target_month: date, results: list, missing_tickers: list) -> None:
    """
    Send a plain-text summary email after staging is written.
    Reads NOTIFY_EMAIL, SMTP_USER, and SMTP_PASSWORD from environment.
    Logs a warning and continues if email credentials are missing — the
    script should never fail just because the email didn't send.
    """
    notify_email = os.environ.get("NOTIFY_EMAIL")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    if not all([notify_email, smtp_user, smtp_password]):
        print("  [WARN] Email env vars not set (NOTIFY_EMAIL, SMTP_USER, SMTP_PASSWORD) — skipping email.")
        return

    flagged_results = [r for r in results if r["flagged"]]
    sorted_by_return = sorted(results, key=lambda r: r["monthly_return"], reverse=True)
    month_str = month_display(target_month)
    run_date = date.today().strftime("%B %d, %Y")

    # Build the email body
    lines = []
    lines.append(f"PortfolioDB — Monthly Returns Ready for Review: {month_str}")
    lines.append(f"Run date: {run_date}")
    lines.append("")
    lines.append(f"Portfolios processed : {len(results)}")
    lines.append(f"Flagged for review   : {len(flagged_results)}")
    lines.append(f"Missing tickers      : {', '.join(missing_tickers) if missing_tickers else 'None'}")
    lines.append("")

    if flagged_results:
        lines.append("FLAGGED PORTFOLIOS — review before promoting:")
        for r in flagged_results:
            lines.append(f"  {r['name']}")
            lines.append(f"    Reason: {r['flag_reason']}")
        lines.append("")

    lines.append("ALL RETURNS (highest to lowest):")
    lines.append(f"  {'Portfolio':<45} {'Return':>8}")
    lines.append(f"  {'-'*45} {'-'*8}")
    for r in sorted_by_return:
        flag = " *" if r["flagged"] else ""
        lines.append(f"  {r['name'][:45]:<45} {r['monthly_return']:>+7.2f}%{flag}")

    lines.append("")
    lines.append("TO PROMOTE TO LIVE:")
    lines.append("  Go to GitHub Actions → Monthly Returns — Stage 2 Promote → Run workflow")
    lines.append(f"  Enter month: {target_month.strftime('%Y-%m')}")

    body = "\n".join(lines)

    msg = MIMEText(body)
    msg["Subject"] = f"PortfolioDB — Monthly Returns Ready for Review: {month_str}"
    msg["From"] = smtp_user
    msg["To"] = notify_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, notify_email, msg.as_string())
        print(f"  Summary email sent to {notify_email}")
    except Exception as e:
        print(f"  [WARN] Failed to send email: {e}")


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Stage 1: Calculate monthly portfolio returns")
    parser.add_argument("--month", type=str, default=None, help="Target month in YYYY-MM format")
    args = parser.parse_args()

    # Load env vars
    load_dotenv(dotenv_path=DOTENV_PATH)
    api_key = os.environ.get("EODHD_API_KEY")
    if not api_key:
        raise EnvironmentError("Missing EODHD_API_KEY in .env.local")

    # Determine target month
    target_month = get_target_month(args.month)
    print(f"\n{'='*60}")
    print(f"Stage 1: Calculating returns for {month_display(target_month)}")
    print(f"{'='*60}\n")

    # Connect to Supabase
    supabase = get_supabase_client()

    # -----------------------------------------------------------------------
    # STEP 1: Fetch portfolio and allocation data
    # -----------------------------------------------------------------------
    print("Fetching portfolios and allocations from Supabase...")

    # Exclude Tactical portfolios — those are updated manually via a separate script
    portfolios_resp = (
        supabase.table("portfolios")
        .select("slug, name")
        .neq("category", "Tactical")
        .execute()
    )
    allocations_resp = supabase.table("allocations").select("portfolio_slug, ticker, percentage").execute()

    portfolios = {p["slug"]: p["name"] for p in portfolios_resp.data}

    # Build a map: portfolio_slug → list of {ticker, weight}
    portfolio_allocations = {slug: [] for slug in portfolios}
    for row in allocations_resp.data:
        slug = row["portfolio_slug"]
        if slug in portfolio_allocations:
            portfolio_allocations[slug].append({
                "ticker": row["ticker"],
                "weight": row["percentage"] / 100,
            })

    print(f"  {len(portfolios)} portfolios loaded (Buy and Hold + Robo-Advisor only — Tactical excluded)")
    print(f"  {len(allocations_resp.data)} allocation rows loaded\n")

    # -----------------------------------------------------------------------
    # STEP 2: Determine date range for EODHD requests
    # -----------------------------------------------------------------------
    # We need prices from the last day of the prior month through the last day
    # of the target month. Fetching a small window keeps API calls fast.
    prior_month_start = (target_month - timedelta(days=1)).replace(day=1)
    last_day = monthrange(target_month.year, target_month.month)[1]
    target_month_end = target_month.replace(day=last_day)

    print(f"Fetching price data from {prior_month_start} to {target_month_end}")

    # -----------------------------------------------------------------------
    # STEP 3: Fetch prices for every unique ticker
    # -----------------------------------------------------------------------
    unique_tickers = sorted({a["ticker"] for allocs in portfolio_allocations.values() for a in allocs})
    print(f"  {len(unique_tickers)} unique tickers to fetch\n")

    ticker_returns = {}  # ticker -> float or None
    missing_tickers = []

    for ticker in unique_tickers:
        print(f"  Fetching {ticker}...", end=" ")
        price_data = fetch_ticker_prices(ticker, prior_month_start, target_month_end, api_key)

        if not price_data:
            ticker_returns[ticker] = None
            missing_tickers.append(ticker)
            print("MISSING")
        else:
            monthly_return = calculate_ticker_return(price_data, target_month)
            ticker_returns[ticker] = monthly_return
            if monthly_return is not None:
                print(f"{monthly_return:+.2f}%")
            else:
                print("MISSING (no price on boundary dates)")
                missing_tickers.append(ticker)

        time.sleep(API_DELAY)

    # -----------------------------------------------------------------------
    # STEP 4: Calculate each portfolio's blended return
    # -----------------------------------------------------------------------
    print(f"\nCalculating blended portfolio returns...")

    results = []

    for slug, name in portfolios.items():
        allocations = portfolio_allocations.get(slug, [])

        if not allocations:
            # Skip portfolios with no allocation data
            print(f"  [SKIP] {name} — no allocations found")
            continue

        # Check if weights sum to ~1.0
        total_weight = sum(a["weight"] for a in allocations)
        weight_ok = abs(total_weight - 1.0) <= 0.01

        # Calculate blended return
        blended = 0.0
        has_missing = False
        missing_in_portfolio = []

        for a in allocations:
            t_return = ticker_returns.get(a["ticker"])
            if t_return is None:
                has_missing = True
                missing_in_portfolio.append(a["ticker"])
            else:
                blended += t_return * a["weight"]

        blended = round(blended, 4)

        # -----------------------------------------------------------------------
        # STEP 5: Validate and flag
        # -----------------------------------------------------------------------
        flagged = False
        flag_reasons = []

        if has_missing:
            flagged = True
            flag_reasons.append(f"Missing price data for: {', '.join(missing_in_portfolio)}")

        if not weight_ok:
            flagged = True
            flag_reasons.append(f"Weights sum to {total_weight:.4f} (expected ~1.0)")

        if blended < FLAG_THRESHOLD_LOW:
            flagged = True
            flag_reasons.append(f"Return {blended:.2f}% is below {FLAG_THRESHOLD_LOW}% threshold")

        if blended > FLAG_THRESHOLD_HIGH:
            flagged = True
            flag_reasons.append(f"Return {blended:.2f}% is above {FLAG_THRESHOLD_HIGH}% threshold")

        results.append({
            "portfolio_slug": slug,
            "name": name,
            "date": target_month.isoformat(),
            "monthly_return": blended,
            "flagged": flagged,
            "flag_reason": "; ".join(flag_reasons) if flag_reasons else None,
            "status": "pending",
        })

    # -----------------------------------------------------------------------
    # STEP 6: Write results to monthly_returns_staging
    # -----------------------------------------------------------------------
    print(f"\nWriting {len(results)} rows to monthly_returns_staging...")

    staging_rows = [
        {
            "portfolio_slug": r["portfolio_slug"],
            "date": r["date"],
            "monthly_return": r["monthly_return"],
            "flagged": r["flagged"],
            "flag_reason": r["flag_reason"],
            "status": r["status"],
        }
        for r in results
    ]

    # Upsert — safe to re-run; overwrites any existing pending row for this month
    supabase.table("monthly_returns_staging").upsert(
        staging_rows,
        on_conflict="portfolio_slug,date"
    ).execute()

    print("  Done.\n")

    # -----------------------------------------------------------------------
    # STEP 7: Print summary
    # -----------------------------------------------------------------------
    flagged_results = [r for r in results if r["flagged"]]
    sorted_by_return = sorted(results, key=lambda r: r["monthly_return"], reverse=True)

    print(f"{'='*60}")
    print(f"SUMMARY — {month_display(target_month)}")
    print(f"{'='*60}")
    print(f"  Portfolios processed : {len(results)}")
    print(f"  Flagged for review   : {len(flagged_results)}")
    print(f"  Missing tickers      : {', '.join(missing_tickers) if missing_tickers else 'None'}")
    print(f"  Price data range     : {prior_month_start} to {target_month_end}")

    print(f"\n  Top 5 returns:")
    for r in sorted_by_return[:5]:
        flag = " [FLAGGED]" if r["flagged"] else ""
        print(f"    {r['name'][:40]:<40} {r['monthly_return']:+.2f}%{flag}")

    print(f"\n  Bottom 5 returns:")
    for r in sorted_by_return[-5:]:
        flag = " [FLAGGED]" if r["flagged"] else ""
        print(f"    {r['name'][:40]:<40} {r['monthly_return']:+.2f}%{flag}")

    if flagged_results:
        print(f"\n  Flagged portfolios:")
        for r in flagged_results:
            print(f"    {r['name']}")
            print(f"      Reason: {r['flag_reason']}")

    print(f"\n  To review in Supabase: SELECT * FROM staging_review;")
    print(f"  To promote to live:    python stage2_promote.py --month {target_month.strftime('%Y-%m')}")
    print(f"{'='*60}\n")

    # Send email summary
    print("Sending summary email...")
    send_summary_email(target_month, results, missing_tickers)


if __name__ == "__main__":
    main()
