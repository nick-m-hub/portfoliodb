"""
Backfill monthly returns for the JL Collins Wealth Preservation Portfolio.

Allocations:
  VTI  50% — US Total Stock Market
  VNQ  25% — US Real Estate
  BND  20% — US Aggregate Bond Index
  BIL   5% — Cash

Proxy chain:
  VTSMX → VTI    Jun 2001   (Vanguard Total Stock Market Index)
  VGSIX → VNQ    Oct 2004   (Vanguard REIT Index Investor Shares)
  VBMFX → BND    Apr 2007   (Vanguard Total Bond Market Investor Shares)
  SHY   → BIL    May 2007   (iShares 1-3yr Treasury, proxy for cash pre-BIL)
    Before SHY (pre-Jul 2002): cash return approximated at 0.35%/month
    (~4.2% annual, in line with short-term rates during 1996-2001)

Backfill starts May 1996 (VGSIX inception, the binding constraint).
Stage 1 handles this portfolio automatically going forward.

Usage:
    python backfill_jl_collins_wealth_preservation.py
    python backfill_jl_collins_wealth_preservation.py --through 2024-12
    python backfill_jl_collins_wealth_preservation.py --dry-run
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

PORTFOLIO_SLUG = "jl-collins-wealth-preservation-portfolio"
API_DELAY = 0.2

# Cash fallback monthly return (%) for months before SHY existed
CASH_FALLBACK_MONTHLY_PCT = 0.35

# Transition dates: first month using the next ticker
VTI_START  = date(2001, 6, 1)   # VTSMX → VTI
VNQ_START  = date(2004, 10, 1)  # VGSIX → VNQ
BND_START  = date(2007, 4, 1)   # VBMFX → BND
BIL_START  = date(2007, 5, 1)   # SHY   → BIL
SHY_START  = date(2002, 7, 1)   # constant → SHY

# Earliest month to attempt (VGSIX launched May 1996)
FIRST_MONTH = date(1996, 5, 1)


def last_day_of_month(year, month):
    return date(year, month, monthrange(year, month)[1])


def prev_month_end(d):
    """Last day of the month before date d's month."""
    first = d.replace(day=1)
    return first - timedelta(days=1)


def main():
    parser = argparse.ArgumentParser(
        description="Backfill JL Collins Wealth Preservation Portfolio monthly returns"
    )
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
    print(f"Backfill: JL Collins Wealth Preservation Portfolio")
    print(f"  Attempting from : {FIRST_MONTH.strftime('%b %Y')} (VGSIX inception)")
    print(f"  Through         : {through_month.strftime('%b %Y')}")
    print(f"  Dry run         : {args.dry_run}")
    print(f"{'='*60}\n")

    fetch_specs = [
        ("VTSMX", date(1996, 3, 1),             prev_month_end(VTI_START)),
        ("VTI",   prev_month_end(VTI_START),    fetch_to),
        ("VGSIX", date(1996, 3, 1),             prev_month_end(VNQ_START)),
        ("VNQ",   prev_month_end(VNQ_START),    fetch_to),
        ("VBMFX", date(1996, 3, 1),             prev_month_end(BND_START)),
        ("BND",   prev_month_end(BND_START),    fetch_to),
        ("SHY",   prev_month_end(SHY_START),    prev_month_end(BIL_START)),
        ("BIL",   prev_month_end(BIL_START),    fetch_to),
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

    def get_cash_return(m, prior_end, month_end):
        """Return the monthly % return for the cash sleeve."""
        if m >= BIL_START:
            start = get_last_trading_day_price(all_prices["BIL"], prior_end)
            end   = get_last_trading_day_price(all_prices["BIL"], month_end)
        elif m >= SHY_START:
            start = get_last_trading_day_price(all_prices["SHY"], prior_end)
            end   = get_last_trading_day_price(all_prices["SHY"], month_end)
        else:
            return CASH_FALLBACK_MONTHLY_PCT, True  # (return_pct, used_fallback)

        if start is None or end is None or start == 0:
            return None, False
        return (end / start - 1) * 100, False

    results = []
    m = FIRST_MONTH
    while m <= through_month:
        prior_end = m - timedelta(days=1)
        month_end = last_day_of_month(m.year, m.month)
        label = m.strftime("%Y-%m")

        equity_ticker = "VTI" if m >= VTI_START else "VTSMX"
        reit_ticker   = "VNQ" if m >= VNQ_START else "VGSIX"
        bond_ticker   = "BND" if m >= BND_START else "VBMFX"

        skip = False
        blended = 0.0

        for weight, ticker in [(0.50, equity_ticker), (0.25, reit_ticker), (0.20, bond_ticker)]:
            start = get_last_trading_day_price(all_prices[ticker], prior_end)
            end   = get_last_trading_day_price(all_prices[ticker], month_end)
            if start is None or end is None or start == 0:
                print(f"  [SKIP] {label}: missing price data for {ticker}")
                skip = True
                break
            blended += weight * (end / start - 1) * 100

        if not skip:
            cash_return, used_fallback = get_cash_return(m, prior_end, month_end)
            if cash_return is None:
                print(f"  [SKIP] {label}: missing price data for cash proxy")
                skip = True
            else:
                if used_fallback and m == FIRST_MONTH:
                    print(f"  [INFO] Using {CASH_FALLBACK_MONTHLY_PCT}%/mo constant for cash sleeve before SHY ({SHY_START.strftime('%b %Y')})")
                blended += 0.05 * cash_return

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
