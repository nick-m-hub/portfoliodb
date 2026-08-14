"""
Monthly Recap: auto-generate the "[Month] [Year] in Review" blog post from
Stage 1's computed returns.

Called from stage1_calculate.py right after staging is written, reusing the
same `results` list already in memory (no extra Supabase round trip for
returns). Writes a status='draft' row to blog_posts. Stage 2 flips it to
'published' when that month's returns are promoted (see stage2_promote.py's
build_recap_slug usage) -- review happens once, in the Stage 1 email, not as
a separate manual step.

Unlike the evergreen 25-post calendar (which always leaves two
[ADD YOUR TAKE HERE] slots for Nick, see CLAUDE.md), this format is fully
auto-drafted: the data-driven sections are stats computed here in Python,
and the "What Moved Markets" + "Buy and Hold vs. Tactical" analysis are
written by Claude via the Anthropic API, with the web_search tool giving it
real-time news grounding for the market section. Nick's review happens by
reading the full draft in the Stage 1 email before deciding whether to run
Stage 2.

Idempotent by default: if a blog_posts row already exists at the target
month's slug (draft or published), generation is skipped rather than
re-spending on a fresh Claude + web search call every time Stage 1 happens
to be re-run for that month. Pass force=True (or --force on the CLI) to
regenerate a draft; a published post is never overwritten.

Confidence checks (Aug 2026): the email includes a confidence label, but it
is NEVER an LLM self-report ("how confident are you") -- that's an unreliable
guess dressed up as a number. Instead `_check_draft_quality()` mechanically
inspects the raw API response and the generated text against ground truth
we already have: did web search actually run, does every /portfolios/slug
link in the draft point to a portfolio we actually gave Claude data for, and
does the return figure quoted near each link match that portfolio's real
monthly_return. `evaluate_confidence()` turns those checks into a label via
fixed rules, not a model judgment call. This only verifies data provenance
(links resolve, cited numbers match, search happened) -- it can't verify
that the market-context narrative correctly interprets what it found, so
that section still needs a human read regardless of the label.

Standalone usage (e.g. to manually regenerate a draft):
    python monthly_recap.py --month 2026-07
    python monthly_recap.py --month 2026-07 --force
"""

import json
import re
from datetime import date

from anthropic import Anthropic

from utils import get_supabase_client, get_target_month, month_display

CLAUDE_MODEL = "claude-sonnet-5"
MAX_SEARCHES = 6

# The three benchmark portfolios every recap gives context against.
BENCHMARK_SLUGS = ["united-states-60-40-portfolio", "us-stock-market", "global-stock-market"]


# ---------------------------------------------------------------------------
# Deterministic naming -- shared with stage2_promote.py so the auto-publish
# step can find the right row without any extra state.
# ---------------------------------------------------------------------------

def build_recap_slug(target_month: date) -> str:
    """e.g. 'july-2026-portfolio-performance-review' -- matches the slug
    format used by every previously published recap."""
    return f"{target_month.strftime('%B').lower()}-{target_month.year}-portfolio-performance-review"


def build_recap_title(month_str: str, portfolio_count: int) -> str:
    return f"{month_str} in Review: How {portfolio_count} Portfolio Strategies Performed"


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

def _fetch_categories(supabase, slugs):
    resp = supabase.table("portfolios").select("slug, category").in_("slug", slugs).execute()
    return {r["slug"]: r["category"] for r in resp.data}


def compute_recap_stats(results, categories):
    """
    results: the list stage1_calculate.py's main() already built --
    [{portfolio_slug, name, monthly_return, flagged, flag_reason, ...}, ...]
    categories: {slug: category} from the portfolios table

    Flagged rows are excluded from every number below -- their return may
    be a data error and hasn't been reviewed yet. They come back separately
    under "excluded" so the Stage 1 email can surface them to Nick without
    ever letting them into the post itself.
    """
    clean = [r for r in results if not r["flagged"]]
    excluded = [r for r in results if r["flagged"]]

    sorted_clean = sorted(clean, key=lambda r: r["monthly_return"], reverse=True)
    positive_count = sum(1 for r in clean if r["monthly_return"] > 0)
    avg_return = round(sum(r["monthly_return"] for r in clean) / len(clean), 2) if clean else None

    benchmarks = []
    for slug in BENCHMARK_SLUGS:
        match = next((r for r in clean if r["portfolio_slug"] == slug), None)
        if match:
            benchmarks.append({"slug": slug, "name": match["name"], "monthly_return": match["monthly_return"]})

    by_category = {}
    for r in clean:
        cat = categories.get(r["portfolio_slug"], "Uncategorized")
        by_category.setdefault(cat, []).append(r["monthly_return"])
    category_averages = {
        cat: {"avg_return": round(sum(vals) / len(vals), 2), "count": len(vals)}
        for cat, vals in by_category.items()
    }

    def _slim(r):
        return {
            "slug": r["portfolio_slug"],
            "name": r["name"],
            "monthly_return": r["monthly_return"],
            "category": categories.get(r["portfolio_slug"], "Uncategorized"),
        }

    return {
        "total_tracked": len(results),
        "clean_count": len(clean),
        "positive_count": positive_count,
        "avg_return": avg_return,
        "benchmarks": benchmarks,
        "category_averages": category_averages,
        "top": [_slim(r) for r in sorted_clean[:8]],
        "bottom": [_slim(r) for r in sorted_clean[-8:]] if len(sorted_clean) > 8 else [],
        "excluded": [
            {"slug": r["portfolio_slug"], "name": r["name"], "flag_reason": r["flag_reason"]}
            for r in excluded
        ],
    }


# ---------------------------------------------------------------------------
# Draft quality checks -- mechanical, not an LLM self-report
# ---------------------------------------------------------------------------

def _check_draft_quality(response, content, stats):
    """
    Every value here is computed by inspecting the raw API response and the
    generated text against ground truth we already have (the stats we fed
    Claude) -- never by asking the model to grade itself. Only covers what's
    mechanically checkable: search actually happened, every portfolio link
    resolves to data we gave Claude, and the return figure quoted near each
    link matches the real number. It does NOT verify that the market-context
    narrative correctly interprets its search results -- that still needs a
    human read.
    """
    search_count = sum(
        1 for b in response.content if b.type == "server_tool_use" and getattr(b, "name", None) == "web_search"
    )
    search_errors = sum(
        1 for b in response.content
        if b.type == "web_search_tool_result" and getattr(b.content, "type", None) == "web_search_tool_result_error"
    )
    truncated = response.stop_reason == "max_tokens"
    word_count = len(content.split())

    # Only slugs Claude was actually given return data for -- top/bottom
    # performers and the three benchmarks. A link to anything else means
    # Claude referenced portfolio performance it wasn't handed this run.
    known = {p["slug"]: p["monthly_return"] for p in stats["top"] + stats["bottom"] + stats["benchmarks"]}

    invalid_links = []
    unverified_links = []
    verified_count = 0
    link_total = 0

    for m in re.finditer(r"\]\(/portfolios/([a-z0-9-]+)\)", content):
        link_total += 1
        slug = m.group(1)
        if slug not in known:
            invalid_links.append(slug)
            continue
        # Best-effort: the value could be formatted with or without a
        # leading "+", so check both. Window covers text on either side of
        # the link, since the number can precede or follow it in prose.
        expected_signed = f"{known[slug]:+.2f}"
        expected_plain = f"{known[slug]:.2f}"
        window = content[max(0, m.start() - 180): m.end() + 180]
        if expected_signed in window or expected_plain in window:
            verified_count += 1
        else:
            unverified_links.append(slug)

    return {
        "search_count": search_count,
        "search_errors": search_errors,
        "truncated": truncated,
        "word_count": word_count,
        "link_total": link_total,
        "invalid_links": invalid_links,
        "verified_count": verified_count,
        "unverified_links": unverified_links,
    }


def evaluate_confidence(checks):
    """
    Turns _check_draft_quality()'s output into a label via fixed rules --
    not a judgment call. Returns (label, issues).
    """
    critical = []
    moderate = []

    if checks["invalid_links"]:
        critical.append(
            f"{len(checks['invalid_links'])} portfolio link(s) point to a slug not in this month's "
            f"data: {', '.join(checks['invalid_links'])}"
        )
    if checks["search_count"] == 0:
        critical.append("No web searches were performed -- the market context section is not grounded in verified research.")
    if checks["truncated"]:
        critical.append("Response was cut off at the token limit -- the draft may be incomplete.")

    if checks["search_errors"] > 0:
        moderate.append(f"{checks['search_errors']} web search call(s) returned an error.")
    if checks["link_total"] > 0:
        unverified = checks["link_total"] - checks["verified_count"]
        if unverified > 0 and unverified / checks["link_total"] > 0.25:
            moderate.append(
                f"Only {checks['verified_count']}/{checks['link_total']} linked portfolio return figures "
                f"could be confirmed near their link in the text."
            )
    if not (900 <= checks["word_count"] <= 1600):
        moderate.append(f"Word count ({checks['word_count']}) is outside the expected ~1,200-word range.")

    if critical:
        label = "LOW confidence -- review carefully before publishing"
    elif moderate:
        label = "MODERATE confidence -- spot check the flagged item(s) below"
    else:
        label = "HIGH confidence -- all automated checks passed"

    return label, critical + moderate


# ---------------------------------------------------------------------------
# Claude -- draft the post
# ---------------------------------------------------------------------------

def call_claude(month_str, stats):
    """
    Returns (excerpt, content, quality). `quality` is _check_draft_quality()'s
    output, for evaluate_confidence() to turn into a label upstream. Raises
    RuntimeError on malformed output -- the caller is expected to catch this
    and continue without blocking the returns pipeline.
    """
    client = Anthropic()

    prompt_stats = {k: v for k, v in stats.items() if k != "excluded"}

    prompt = f"""You are writing the "Monthly Recap" blog post for PortfolioDB.com, a portfolio backtesting and screener site for finance/investing readers. This is a recurring monthly feature: a data-journalism look at how {stats['total_tracked']} backtested portfolio strategies performed in {month_str}.

## Rules (this is published content on a live site)

- Use ONLY the numbers in the DATA block below for anything about portfolio returns, benchmark returns, or category averages. Never invent, estimate, or round a number that isn't given to you. All `monthly_return` values are already percentages (e.g. 2.27 means +2.27%).
- `total_tracked` is the full number of portfolios PortfolioDB tracks this month -- use this for the title context and any "N portfolios" framing. `clean_count` and `positive_count` reflect the subset with reviewed, non-flagged data -- use these (not total_tracked) for breadth statements like "X of Y portfolios finished positive," unless clean_count equals total_tracked.
- Use the web_search tool to research REAL financial/market news and events specific to {month_str} (Fed decisions, interest rates, inflation data, major index moves, sector rotations, etc.). Base the "What Moved Markets" section only on what you find via search. Do not invent events, dates, or figures, and do not confuse {month_str} with any other month or year. If search results are thin, keep that section brief and general rather than guessing.
- Do not include inline citations, footnotes, or links to external news sources in the post body -- write the market context in your own words as plain prose. The only links in the post should be internal PortfolioDB links.
- No em dashes anywhere (use separate sentences, commas, or colons instead).
- No "Here's what that looks like" or similar AI-transition phrases.
- Open the post with a concrete observation using the headline numbers, not a question.
- Use H2 (##) subheadings only, no H1 (the title is stored separately from the body).
- Target ~1,200 words total.
- Tone: observational and analytical, not predictive. Describe what happened; don't forecast what's next.
- Every portfolio you name must link to its detail page as [Portfolio Name](/portfolios/slug), using the exact slug from the data.

## Post structure

1. Opening paragraph (no heading): the headline average return and breadth, framed as an observation about what the month reveals.
2. "## What Moved Markets": 1-2 short paragraphs of real market context for {month_str} from your research, then a paragraph connecting it to the three benchmark portfolios' actual returns (given in the data) with links.
3. "## The Winners": discuss 3-5 of the top performers (pick the most narratively interesting from the `top` list, not necessarily all of them) with their exact returns, linked, and what about their construction explains the result.
4. "## The Laggards": discuss 2-4 of the weakest performers (from the `bottom` list) the same way.
5. "## Buy and Hold vs. Tactical": state the category averages plainly (only the categories actually present in the data), then write an analytical "Our take:" paragraph on what one month of data does and doesn't prove about the two approaches. Avoid declaring a permanent winner from a single month.
6. "## Where to Go From Here": a natural closing CTA linking to the [Strategy Leaderboard](/leaderboard) (primary), the [portfolio database](/database), and the [Portfolio Screener](/portfolio-screener).

## Data for {month_str}

{json.dumps(prompt_stats, indent=2)}

## Output format

Respond with ONLY valid JSON, no markdown code fences, no other text, in this exact shape:
{{
  "excerpt": "One sentence, under 160 characters, summarizing the month's key finding -- for meta description use.",
  "content": "The full post body in Markdown, starting with the opening paragraph, using \\n\\n between paragraphs."
}}"""

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": MAX_SEARCHES}],
        messages=[{"role": "user", "content": prompt}],
    )

    # Web search interleaves server_tool_use / web_search_tool_result blocks
    # with plain text (Claude narrating "I'll search for..." before it has
    # anything to say). The actual final answer is whatever text comes after
    # the LAST search result -- take only that, so we don't prepend that
    # narration onto the JSON we asked for.
    last_result_idx = -1
    for i, block in enumerate(response.content):
        if block.type == "web_search_tool_result":
            last_result_idx = i

    text = "".join(
        block.text for block in response.content[last_result_idx + 1:] if block.type == "text"
    ).strip()

    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    # Even when told to respond with ONLY JSON, Claude sometimes prefixes a
    # short lead-in after search results (e.g. "Based on the search
    # results, ..." -- the exact pattern Anthropic's own web search docs
    # show). Extract the outermost {...} rather than requiring the whole
    # string to parse as-is.
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        truncated = response.stop_reason == "max_tokens"
        raise RuntimeError(
            f"Claude returned malformed JSON for the {month_str} recap "
            f"(stop_reason={response.stop_reason}"
            f"{', likely truncated by max_tokens' if truncated else ''}): {e}\n"
            f"--- raw response ---\n{text}"
        ) from e

    excerpt, content = parsed["excerpt"], parsed["content"]
    quality = _check_draft_quality(response, content, stats)
    return excerpt, content, quality


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def generate_monthly_recap(supabase, target_month, results, force=False):
    """
    Never raises -- Stage 1's core job (computing returns) must succeed even
    if blog generation fails. Returns a dict describing what happened, for
    the Stage 1 email:
      {status: 'generated', slug, title, excerpt, content, excluded,
       confidence, confidence_issues, checks}
      {status: 'skipped_existing_draft'|'skipped_existing_published', slug}
      {status: 'error', slug, error}
    `confidence` is a fixed-rule label from evaluate_confidence(), never an
    LLM self-report -- see the module docstring.
    """
    month_str = month_display(target_month)
    slug = build_recap_slug(target_month)

    try:
        existing = supabase.table("blog_posts").select("status").eq("slug", slug).execute()
        existing_status = existing.data[0]["status"] if existing.data else None

        if existing_status == "published":
            return {"status": "skipped_existing_published", "slug": slug}
        if existing_status == "draft" and not force:
            return {"status": "skipped_existing_draft", "slug": slug}

        slugs_needed = [r["portfolio_slug"] for r in results]
        categories = _fetch_categories(supabase, slugs_needed)
        stats = compute_recap_stats(results, categories)

        if stats["clean_count"] == 0:
            return {"status": "error", "slug": slug, "error": "No non-flagged portfolios to build a recap from."}

        title = build_recap_title(month_str, stats["total_tracked"])
        excerpt, content, quality = call_claude(month_str, stats)
        confidence, confidence_issues = evaluate_confidence(quality)

        supabase.table("blog_posts").upsert(
            {"slug": slug, "title": title, "excerpt": excerpt, "content": content, "status": "draft"},
            on_conflict="slug",
        ).execute()

        return {
            "status": "generated",
            "slug": slug,
            "title": title,
            "excerpt": excerpt,
            "content": content,
            "excluded": stats["excluded"],
            "confidence": confidence,
            "confidence_issues": confidence_issues,
            "checks": quality,
        }
    except Exception as e:
        return {"status": "error", "slug": slug, "error": str(e)}


# ---------------------------------------------------------------------------
# Standalone CLI (manual regeneration / testing)
# ---------------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate (or regenerate) the monthly recap blog post draft")
    parser.add_argument("--month", type=str, default=None, help="Target month YYYY-MM (defaults to last completed month)")
    parser.add_argument("--force", action="store_true", help="Regenerate even if a draft already exists (a published post is never overwritten)")
    args = parser.parse_args()

    supabase = get_supabase_client()
    target_month = get_target_month(args.month)
    month_str = month_display(target_month)

    print(f"\n{'='*60}")
    print(f"Monthly Recap: {month_str}{' (force)' if args.force else ''}")
    print(f"{'='*60}\n")

    print(f"Fetching {month_str} staging returns...")
    staging = (
        supabase.table("monthly_returns_staging")
        .select("portfolio_slug, monthly_return, flagged, flag_reason")
        .eq("date", target_month.isoformat())
        .execute()
    )

    if not staging.data:
        print(f"  No staging rows found for {target_month.isoformat()}. Run stage1_calculate.py first.")
        return

    names_resp = (
        supabase.table("portfolios")
        .select("slug, name")
        .in_("slug", [r["portfolio_slug"] for r in staging.data])
        .execute()
    )
    names = {r["slug"]: r["name"] for r in names_resp.data}
    results = [{**r, "name": names.get(r["portfolio_slug"], r["portfolio_slug"])} for r in staging.data]

    print(f"  {len(results)} portfolios loaded.\n")
    print("Generating draft (this calls Claude with web search -- may take a minute)...")
    result = generate_monthly_recap(supabase, target_month, results, force=args.force)

    print(f"\n{'='*60}")
    print(f"RESULT: {result['status']}")
    print(f"{'='*60}")
    if result["status"] == "generated":
        print(f"  Slug: {result['slug']}")
        print(f"  Title: {result['title']}")
        print(f"  Excerpt: {result['excerpt']}")
        if result["excluded"]:
            print(f"  Excluded (flagged) portfolios: {len(result['excluded'])}")
        print(f"\n  Confidence: {result['confidence']}")
        c = result["checks"]
        print(f"    Web searches performed : {c['search_count']} ({c['search_errors']} error(s))")
        print(f"    Portfolio links        : {c['link_total'] - len(c['invalid_links'])}/{c['link_total']} point to real slugs from this month's data")
        print(f"    Return figures matched : {c['verified_count']}/{c['link_total']} confirmed near their link")
        print(f"    Response truncated     : {'Yes' if c['truncated'] else 'No'}")
        print(f"    Word count             : {c['word_count']}")
        for issue in result["confidence_issues"]:
            print(f"    - {issue}")
        print(f"\n{result['content']}\n")
    elif result["status"].startswith("skipped_existing"):
        print(f"  {result['slug']} already has a {result['status'].split('_')[-1]} row -- use --force to regenerate.")
    else:
        print(f"  Error: {result.get('error')}")


if __name__ == "__main__":
    main()
