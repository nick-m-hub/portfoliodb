"""
Backfill monthly returns for the Ben Felix Model Portfolio.

Allocations:
  SPY  30% — US Large-Cap Blend
  VTI  30% — US Total Stock Market
  EFA  16% — International Developed Equity
  IWN  10% — US Small-Cap Value
  EEM   8% — Emerging Markets Equity
  AVDV  6% — International Small-Cap Value

Proxy chain (older fund → live ETF, with transition month):
  VTSMX → VTI    Jun 2001   (Vanguard Total Stock Market Index)
  DFSVX → IWN    Aug 2000   (DFA US Small Cap Value)
  PRITX → EFA    Sep 2001   (T. Rowe Price International Stock)
  FEMKX → EEM    May 2003   (Fidelity Emerging Markets)
  DISVX → DLS → AVDV        (DFA Intl Small Cap Value → WisdomTree → Avantis)
    DISVX through Jun 2006
    DLS   Jul 2006 – Sep 2019
    AVDV  Oct 2019 onwards

SPY (launched Jan 1993) needs no proxy. Actual backtest start is determined
by EODHD data availability across all proxies — expected ~early 1993.
Stage 1 handles this portfolio automatically going forward.

Usage:
    python backfill_ben_felix_model_portfolio.py
    python backfill_ben_felix_model_portfolio.py --through 2024-12
    python backfill_ben_felix_model_portfolio.py --dry-run
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

PORTFOLIO_SLUG = "ben-felix-model-portfolio"
API_DELAY = 0.2

# Transition dates: first month using the next ticker in each chain
VTI_START  = date(2001, 6, 1)   # VTSMX → VTI
IWN_START  = date(2000, 8, 1)   # DFSVX → IWN
EFA_START  = date(2001, 9, 1)   # PRITX → EFA
EEM_START  = date(2003, 5, 1)   # FEMKX → EEM
DLS_START  = date(2006, 7, 1)   # DISVX → DLS  (DLS proxies AVDV historically)
AVDV_START = date(2019, 10, 1)  # DLS → AVDV   (AVDV launched Sep 24 2019)

# Earliest month to attempt — actual first month depends on EODHD data availability
FIRST_MONTH = date(1993, 2, 1)  # SPY's first full month


def last_day_of_month(year, month):
    return date(year, month, monthrange(year, month)[1])


def prev_month_end(d):
    """Last day of the month before date d's month."""
    first = d.replace(day=1)
    return first - timedelta(days=1)


def main():
    parser = argparse.ArgumentParser(description="Backfill Ben Felix Model Portfolio monthly returns")
    parser.add_argument("--through", type=str, default=None,
                        help="Last month to backfill YYYY-MM (default: last completed month)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be inserted without writing to Supabase")
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
    print(f"Backfill: Ben Felix Model Portfolio")
    print(f"  Attempting from : {FIRST_MONTH.strftime('%b %Y')} (actual start per EODHD data)")
    print(f"  Through         : {through_month.strftime('%b %Y')}")
    print(f"  Dry run         : {args.dry_run}")
    print(f"{'='*60}\n")

    # Fetch ranges: proxy tickers through their transition, live tickers from just before
    # their transition so we have the prior-month-end price available.
    fetch_specs = [
        # (ticker, from, to)
        ("SPY",   date(1993, 1, 1),               fetch_to),
        ("VTSMX", date(1992, 11, 1),              prev_month_end(VTI_START)),
        ("VTI",   prev_month_end(VTI_START),      fetch_to),
        ("DFSVX", date(1993, 3, 1),               prev_month_end(IWN_START)),
        ("IWN",   prev_month_end(IWN_START),      fetch_to),
        ("PRITX", date(1980, 1, 1),               prev_month_end(EFA_START)),
        ("EFA",   prev_month_end(EFA_START),      fetch_to),
        ("FEMKX", date(1990, 10, 1),              prev_month_end(EEM_START)),
        ("EEM",   prev_month_end(EEM_START),      fetch_to),
        ("DISVX", date(1993, 12, 1),              prev_month_end(DLS_START)),
        ("DLS",   prev_month_end(DLS_START),      prev_month_end(AVDV_START)),
        ("AVDV",  prev_month_end(AVDV_START),     fetch_to),
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
        """Return (ticker, price_data) for each allocation slot given month m."""
        return [
            (0.30, "SPY",                          all_prices["SPY"]),
            (0.30, "VTI"   if m >= VTI_START else "VTSMX",
                   all_prices["VTI"]   if m >= VTI_START else all_prices["VTSMX"]),
            (0.10, "IWN"   if m >= IWN_START else "DFSVX",
                   all_prices["IWN"]   if m >= IWN_START else all_prices["DFSVX"]),
            (0.16, "EFA"   if m >= EFA_START else "PRITX",
                   all_prices["EFA"]   if m >= EFA_START else all_prices["PRITX"]),
            (0.08, "EEM"   if m >= EEM_START else "FEMKX",
                   all_prices["EEM"]   if m >= EEM_START else all_prices["FEMKX"]),
            (0.06, "AVDV"  if m >= AVDV_START else "DLS" if m >= DLS_START else "DISVX",
                   all_prices["AVDV"]  if m >= AVDV_START else
                   all_prices["DLS"]   if m >= DLS_START  else all_prices["DISVX"]),
        ]

    # Calculate blended monthly returns
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
