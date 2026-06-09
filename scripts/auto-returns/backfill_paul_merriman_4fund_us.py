"""
Backfill monthly returns for the Paul Merriman 4-Fund United States Portfolio.

Allocations (equal weight):
  SPY  25% — US Large Cap Blend (S&P 500)
  IWD  25% — US Large Cap Value
  IWM  25% — US Small Cap Blend
  IWN  25% — US Small Cap Value

Proxy chains:
  VFINX → SPY    Feb 1993   Vanguard 500 Index Investor (CONFIRMED)
  VWNDX → IWD    Jun 2000   Vanguard Windsor Fund (APPROVED — verify EODHD data on first run)
  NAESX → IWM    Jun 2000   Vanguard Small Cap Index Investor (APPROVED — verify EODHD data on first run)
  DFSVX → IWN    Aug 2000   DFA US Small Cap Value (CONFIRMED)

Data floor: ~May 1993 (DFSVX inception April 19, 1993; first full month May 1993).

Run with --dry-run first to verify EODHD returns data for VWNDX and NAESX
before writing to Supabase (these proxies are APPROVED but not yet confirmed
in a live script).

Usage:
    python backfill_paul_merriman_4fund_us.py --dry-run
    python backfill_paul_merriman_4fund_us.py
    python backfill_paul_merriman_4fund_us.py --through 2025-12
"""

import argparse
import os
import time
from calendar import monthrange
from datetime import date, timedelta

from dotenv import load_dotenv

from utils import (
    DOTENV_PATH,
    fetch_ticker_prices,
    get_last_trading_day_price,
    get_supabase_client,
)

PORTFOLIO_SLUG = "paul-merriman-4-fund-portfolio-united-states"
API_DELAY = 0.2

# Transition dates: first month using the live ETF
SPY_START = date(1993, 2, 1)   # VFINX → SPY  (SPY launched Jan 29, 1993)
IWD_START = date(2000, 6, 1)   # VWNDX → IWD  (IWD launched May 22, 2000)
IWM_START = date(2000, 6, 1)   # NAESX → IWM  (IWM launched May 22, 2000)
IWN_START = date(2000, 8, 1)   # DFSVX → IWN  (IWN launched Jul 24, 2000)

# Attempt from this date; EODHD data availability determines the actual first month.
# DFSVX inception April 19, 1993 — first calculable month is May 1993.
FIRST_MONTH = date(1993, 2, 1)


def last_day_of_month(year, month):
    return date(year, month, monthrange(year, month)[1])


def prev_month_end(d):
    """Last day of the month before date d's month."""
    first = d.replace(day=1)
    return first - timedelta(days=1)


def main():
    parser = argparse.ArgumentParser(
        description="Backfill Paul Merriman 4-Fund United States Portfolio monthly returns"
    )
    parser.add_argument(
        "--through", type=str, default=None,
        help="Last month to backfill YYYY-MM (default: last completed month)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would be inserted without writing to Supabase"
    )
    args = parser.parse_args()

    load_dotenv(dotenv_path=DOTENV_PATH)
    api_key = os.environ.get("EODHD_API_KEY")
    if not api_key:
        raise EnvironmentError("Missing EODHD_API_KEY in .env.local")

    if args.through:
        y, m = args.through.split("-")
        through_month = date(int(y), int(m), 1)
    else:
        today = date.today()
        through_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)

    fetch_to = last_day_of_month(through_month.year, through_month.month)

    print(f"\n{'='*60}")
    print(f"Backfill: Paul Merriman 4-Fund United States Portfolio")
    print(f"  Attempting from : {FIRST_MONTH.strftime('%b %Y')}")
    print(f"  Through         : {through_month.strftime('%b %Y')}")
    print(f"  Dry run         : {args.dry_run}")
    print(f"{'='*60}\n")

    fetch_specs = [
        # (ticker, from_date, to_date)
        # SPY chain
        ("VFINX", date(1992, 11, 1),          prev_month_end(SPY_START)),
        ("SPY",   prev_month_end(SPY_START),   fetch_to),
        # IWD chain (APPROVED proxy — verify EODHD data)
        ("VWNDX", date(1979, 12, 1),           prev_month_end(IWD_START)),
        ("IWD",   prev_month_end(IWD_START),   fetch_to),
        # IWM chain (APPROVED proxy — verify EODHD data)
        ("NAESX", date(1980, 6, 1),            prev_month_end(IWM_START)),
        ("IWM",   prev_month_end(IWM_START),   fetch_to),
        # IWN chain (CONFIRMED proxy)
        ("DFSVX", date(1993, 3, 1),            prev_month_end(IWN_START)),
        ("IWN",   prev_month_end(IWN_START),   fetch_to),
    ]

    all_prices = {}
    for ticker, from_date, to_date in fetch_specs:
        print(f"Fetching {ticker} ({from_date} – {to_date})...")
        prices = fetch_ticker_prices(ticker, from_date, to_date, api_key)
        time.sleep(API_DELAY)
        if not prices:
            print(f"  [ERROR] No data returned for {ticker} — aborting")
            return
        print(f"  {len(prices)} daily price rows loaded")
        all_prices[ticker] = prices

    print()

    def ticker_for_month(m):
        """Return list of (weight, ticker, prices) for each allocation slot given month m."""
        return [
            (0.25, "SPY"   if m >= SPY_START else "VFINX",
                   all_prices["SPY"]   if m >= SPY_START else all_prices["VFINX"]),
            (0.25, "IWD"   if m >= IWD_START else "VWNDX",
                   all_prices["IWD"]   if m >= IWD_START else all_prices["VWNDX"]),
            (0.25, "IWM"   if m >= IWM_START else "NAESX",
                   all_prices["IWM"]   if m >= IWM_START else all_prices["NAESX"]),
            (0.25, "IWN"   if m >= IWN_START else "DFSVX",
                   all_prices["IWN"]   if m >= IWN_START else all_prices["DFSVX"]),
        ]

    results = []
    m = FIRST_MONTH
    while m <= through_month:
        prior_end = m - timedelta(days=1)
        month_end = last_day_of_month(m.year, m.month)
        label     = m.strftime("%Y-%m")

        blended = 0.0
        skip = False
        for weight, ticker, prices in ticker_for_month(m):
            start = get_last_trading_day_price(prices, prior_end)
            end   = get_last_trading_day_price(prices, month_end)
            if start is None or end is None or start == 0:
                print(f"  [SKIP] {label}: missing price data for {ticker}")
                skip = True
                break
            blended += weight * (end / start - 1) * 100

        if not skip:
            results.append((m, round(blended, 6)))

        next_month = m.month + 1
        next_year  = m.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        m = date(next_year, next_month, 1)

    print(f"Total monthly returns calculated: {len(results)}")
    if results:
        print(f"  Range: {results[0][0].strftime('%b %Y')} – {results[-1][0].strftime('%b %Y')}")
        print("\nSample (first 3):")
        for d, r in results[:3]:
            print(f"  {d.strftime('%Y-%m')}  {r:+.4f}%")
        print("Sample (last 3):")
        for d, r in results[-3:]:
            print(f"  {d.strftime('%Y-%m')}  {r:+.4f}%")
    print()

    if args.dry_run:
        print("Dry run — no data written.")
        return

    supabase = get_supabase_client()

    rows = [
        {
            "portfolio_slug": PORTFOLIO_SLUG,
            "date": d.isoformat(),
            "monthly_return": r,
        }
        for d, r in results
    ]

    batch_size = 500
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        supabase.table("monthly_returns").upsert(
            batch,
            on_conflict="portfolio_slug,date"
        ).execute()
        inserted += len(batch)
        print(f"  Upserted {inserted}/{len(rows)} rows...")

    print(f"\nDone. {len(rows)} monthly returns written to Supabase.")
    print("Next: REFRESH MATERIALIZED VIEW portfolio_stats; in Supabase SQL Editor.")
    print(f"Stage 1 will handle {PORTFOLIO_SLUG} going forward (allocations in DB).")


if __name__ == "__main__":
    main()
