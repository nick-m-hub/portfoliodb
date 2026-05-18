"""
Stage 0: Calculate tactical portfolio signals and store monthly holdings.

Run on the 2nd of each month, before Stage 1 runs on the 3rd.
Fetches ~13 months of price history, calculates each strategy's signal,
and writes the resulting holdings to tactical_monthly_holdings in Supabase.

Usage:
    python stage0_signals.py              # holdings for current month
    python stage0_signals.py --month 2026-05   # override month
"""

import argparse
import inspect
import os
import time
from datetime import timedelta

from dotenv import load_dotenv

from utils import (
    get_supabase_client, get_target_month, month_display, DOTENV_PATH,
    fetch_ticker_prices, subtract_months,
)
from tactical import dual_momentum, gtaa, rules_based

# Polite delay between EODHD API requests
API_DELAY = 0.1

# Months of price history to fetch (13 covers a 12-month lookback plus buffer)
LOOKBACK_MONTHS = 13

# ---------------------------------------------------------------------------
# Signal registry
# Maps each portfolio slug to its signal function.
# To add a new portfolio: add its slug here and the function in its module.
# ---------------------------------------------------------------------------

SIGNAL_REGISTRY = {
    # Dual Momentum family (Antonacci)
    "gem-dual-momentum":                       dual_momentum.gem,
    "gem-emerging-markets-dual-momentum":      dual_momentum.gem_em,
    "diversified-gem-dual-momentum":           dual_momentum.diversified_gem,
    "composite-dual-momentum":                 dual_momentum.composite_dm,
    "accelerating-dual-momentum":              dual_momentum.accelerating_dm,
    # GTAA family (Meb Faber)
    "ivy-portfolio-timing":                                         gtaa.ivy_timing,
    "ivy-portfolio-rotation":                                       gtaa.ivy_rotation,
    "global-tactical-asset-allocation-5-gtaa-5-meb-faber":         gtaa.gtaa5,
    "global-tactical-asset-allocation-13-gtaa-13-meb-faber":       gtaa.gtaa13,
    "global-tactical-asset-allocation-agg-3-meb-faber":            gtaa.gtaa_agg3,
    "global-tactical-asset-allocation-agg-6-meb-faber":            gtaa.gtaa_agg6,
    # Simple rules-based family
    "tactical-permanent-portfolio":            rules_based.tactical_permanent,
    "three-way-model-by-ned-davis":            rules_based.three_way_model,
    "paired-switching-lewis-glenn":            rules_based.paired_switching,
    "quint-switching-filtered":                rules_based.quint_switching,
    "trend-following-bonds-by-paul-novell":    rules_based.trend_following_bonds,
    "stokens-active-combined-asset":           rules_based.stoken_aca,
}

# All tickers needed across all registered strategy modules
ALL_TICKERS = sorted(
    set(dual_momentum.ALL_TICKERS) | set(gtaa.ALL_TICKERS) | set(rules_based.ALL_TICKERS)
)

# Slugs whose signal functions accept a third argument: prior_holdings dict.
# stage0 queries last month's holdings for these before running the signal loop.
_PRIOR_HOLDINGS_SLUGS = {"stokens-active-combined-asset"}


def main():
    parser = argparse.ArgumentParser(description="Stage 0: Calculate tactical portfolio signals")
    parser.add_argument("--month", type=str, default=None, help="Target month YYYY-MM")
    args = parser.parse_args()

    load_dotenv(dotenv_path=DOTENV_PATH)
    api_key = os.environ.get("EODHD_API_KEY")
    if not api_key:
        raise EnvironmentError("Missing EODHD_API_KEY in .env.local")

    target_month = get_target_month(args.month)
    # Signal date = last calendar day of prior month
    # get_last_trading_day_price() finds the actual last trading day on or before this
    signal_date = target_month - timedelta(days=1)

    print(f"\n{'='*60}")
    print(f"Stage 0: Calculating signals for {month_display(target_month)}")
    print(f"  Signal date (prices through): {signal_date}")
    print(f"{'='*60}\n")

    supabase = get_supabase_client()

    # -----------------------------------------------------------------------
    # Fetch price history for all tickers
    # Need LOOKBACK_MONTHS of data to support a 12-month momentum calculation
    # -----------------------------------------------------------------------
    from_date = subtract_months(target_month, LOOKBACK_MONTHS)
    to_date = signal_date

    print(f"Fetching {len(ALL_TICKERS)} tickers ({from_date} to {to_date})...\n")

    price_cache = {}
    for ticker in ALL_TICKERS:
        print(f"  Fetching {ticker}...", end=" ", flush=True)
        data = fetch_ticker_prices(ticker, from_date, to_date, api_key)
        price_cache[ticker] = data
        print("ok" if data else "MISSING")
        time.sleep(API_DELAY)

    print()

    # -----------------------------------------------------------------------
    # Fetch prior month's holdings for strategies that need state continuity
    # (currently: Stoken's ACA — "between channels" uses last month's position)
    # -----------------------------------------------------------------------
    prior_month = subtract_months(target_month, 1)
    prior_holdings_map = {}

    if _PRIOR_HOLDINGS_SLUGS:
        print("Fetching prior month holdings for stateful strategies...\n")
        for slug in _PRIOR_HOLDINGS_SLUGS:
            resp = (
                supabase.table("tactical_monthly_holdings")
                .select("ticker, weight")
                .eq("portfolio_slug", slug)
                .eq("date", prior_month.isoformat())
                .execute()
            )
            if resp.data:
                prior_holdings_map[slug] = {
                    row["ticker"]: float(row["weight"]) for row in resp.data
                }
                print(f"  {slug}: prior holdings found ({len(resp.data)} tickers)")
            else:
                print(f"  {slug}: no prior holdings — sleeves will default to defensive")
        print()

    # -----------------------------------------------------------------------
    # Calculate signals and write holdings to Supabase
    # -----------------------------------------------------------------------
    print("Calculating signals and writing holdings...\n")

    success = []
    skipped = []

    for slug, signal_fn in SIGNAL_REGISTRY.items():
        sig = inspect.signature(signal_fn)
        if len(sig.parameters) >= 3:
            holdings = signal_fn(target_month, price_cache, prior_holdings_map.get(slug))
        else:
            holdings = signal_fn(target_month, price_cache)

        if holdings is None:
            print(f"  [SKIP] {slug} — insufficient price data")
            skipped.append(slug)
            continue

        # Delete any existing holdings for this portfolio + month, then insert fresh.
        # This makes the script safe to re-run if you need to correct a signal.
        supabase.table("tactical_monthly_holdings").delete().eq(
            "portfolio_slug", slug
        ).eq("date", target_month.isoformat()).execute()

        rows = [
            {
                "portfolio_slug": slug,
                "date": target_month.isoformat(),
                "ticker": ticker,
                "weight": round(weight, 6),
            }
            for ticker, weight in holdings.items()
        ]
        supabase.table("tactical_monthly_holdings").insert(rows).execute()

        holdings_str = ", ".join(f"{t} {w*100:.1f}%" for t, w in sorted(holdings.items()))
        print(f"  {slug}")
        print(f"    → {holdings_str}")
        success.append(slug)

    print(f"\n{'='*60}")
    print(f"SUMMARY — {month_display(target_month)}")
    print(f"{'='*60}")
    print(f"  Signals calculated : {len(success)}")
    if skipped:
        print(f"  Skipped (no data) : {len(skipped)}")
        for s in skipped:
            print(f"    {s}")
    print(f"\n  Holdings stored in tactical_monthly_holdings.")
    print(f"  Stage 1 will pick these up when it runs on the 3rd.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
