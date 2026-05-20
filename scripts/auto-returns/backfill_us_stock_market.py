"""
Backfill monthly returns for the US Stock Market portfolio.

Data sources:
  - VFINX (Vanguard 500 Index Fund) from EODHD → Sep 1976 – May 2001
  - VTI (Vanguard Total Market ETF) from EODHD  → Jun 2001 – present

VFINX launched August 31, 1976 — the first full monthly return calculable is
September 1976 (start = Aug 31 close, end = Sep 30 close). The script starts
there automatically since EODHD has no prior data.

VTI launched May 31, 2001. June 2001 is its first calculable full-month return
(start = May 31 VTI close, end = Jun 30 VTI close). VFINX is used through
May 2001 to provide the start price for June 2001 VTI — no overlap or gap.

Usage:
    python backfill_us_stock_market.py
    python backfill_us_stock_market.py --through 2024-12
    python backfill_us_stock_market.py --dry-run
"""

import argparse
import os
import time
from calendar import monthrange
from datetime import date, timedelta

from dotenv import load_dotenv

from utils import (
    get_supabase_client, DOTENV_PATH,
    fetch_ticker_prices, get_last_trading_day_price,
)

PORTFOLIO_SLUG = "us-stock-market"
API_DELAY = 0.1

VFINX_TICKER = "VFINX"
VTI_TICKER   = "VTI"

# VFINX covers Sep 1976 (first calculable) through May 2001
VFINX_FETCH_FROM = date(1976, 8, 1)   # need Aug 31 as start price for Sep 1976
VFINX_FETCH_TO   = date(2001, 5, 31)  # May 31 = VTI launch day (VTI takes over from Jun 2001)

# VTI covers Jun 2001 onwards
VTI_FETCH_FROM = date(2001, 5, 1)     # need May 31 VTI price as start for Jun 2001


def last_day_of_month(year, month):
    return date(year, month, monthrange(year, month)[1])


def calc_monthly_returns(price_data, from_month, through_month, ticker_label):
    """
    Calculate monthly returns from EODHD price data.
    Skips months where either boundary price is missing.
    Returns list of (month_date, return_pct) tuples.
    """
    results = []
    m = from_month
    while m <= through_month:
        prior_end = m - timedelta(days=1)
        month_end = last_day_of_month(m.year, m.month)

        start_price = get_last_trading_day_price(price_data, prior_end)
        end_price   = get_last_trading_day_price(price_data, month_end)

        if start_price and end_price and start_price != 0:
            ret = round((end_price / start_price - 1) * 100, 6)
            results.append((m, ret))
        else:
            print(f"  [SKIP] {ticker_label} missing price data for {m.strftime('%Y-%m')}")

        next_month = m.month + 1
        next_year  = m.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        m = date(next_year, next_month, 1)

    return results


def main():
    parser = argparse.ArgumentParser(description="Backfill US Stock Market monthly returns")
    parser.add_argument("--through", type=str, default=None,
                        help="Last month to backfill YYYY-MM (default: last completed month)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be inserted without writing to Supabase")
    args = parser.parse_args()

    load_dotenv(dotenv_path=DOTENV_PATH)
    api_key = os.environ.get("EODHD_API_KEY")
    if not api_key:
        raise EnvironmentError("Missing EODHD_API_KEY in .env.local")

    # Determine through-month (default: last completed month)
    if args.through:
        y, m = args.through.split("-")
        through_month = date(int(y), int(m), 1)
    else:
        today = date.today()
        through_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)

    vfinx_through = date(2001, 5, 1)  # May 2001 — last VFINX month
    vti_start     = date(2001, 6, 1)  # Jun 2001 — first VTI month

    print(f"\n{'='*60}")
    print(f"Backfill: US Stock Market")
    print(f"  VFINX (EODHD) : Sep 1976 – May 2001")
    print(f"  VTI   (EODHD) : Jun 2001 – {through_month.strftime('%b %Y')}")
    print(f"  Dry run       : {args.dry_run}")
    print(f"{'='*60}\n")

    # --- VFINX segment ---
    print(f"Fetching VFINX from EODHD (Aug 1976 – May 2001)...")
    vfinx_prices = fetch_ticker_prices(VFINX_TICKER, VFINX_FETCH_FROM, VFINX_FETCH_TO, api_key)
    time.sleep(API_DELAY)

    if not vfinx_prices:
        print("  [ERROR] No VFINX data returned — aborting")
        return

    print(f"  {len(vfinx_prices)} daily price rows loaded")

    # First month depends on what EODHD actually has — start from Sep 1976
    vfinx_start = date(1976, 9, 1)
    vfinx_returns = calc_monthly_returns(vfinx_prices, vfinx_start, vfinx_through, "VFINX")
    print(f"  {len(vfinx_returns)} monthly returns calculated (VFINX)\n")

    # --- VTI segment ---
    print(f"Fetching VTI from EODHD (May 2001 – {through_month.strftime('%b %Y')})...")
    vti_fetch_to = last_day_of_month(through_month.year, through_month.month)
    vti_prices   = fetch_ticker_prices(VTI_TICKER, VTI_FETCH_FROM, vti_fetch_to, api_key)
    time.sleep(API_DELAY)

    if not vti_prices:
        print("  [ERROR] No VTI data returned — aborting")
        return

    print(f"  {len(vti_prices)} daily price rows loaded")
    vti_returns = calc_monthly_returns(vti_prices, vti_start, through_month, "VTI")
    print(f"  {len(vti_returns)} monthly returns calculated (VTI)\n")

    # --- Combine ---
    all_returns = vfinx_returns + vti_returns
    all_returns.sort(key=lambda x: x[0])

    print(f"Total monthly returns to insert: {len(all_returns)}")
    print(f"  Range: {all_returns[0][0].strftime('%b %Y')} – {all_returns[-1][0].strftime('%b %Y')}\n")

    print("Sample (first 3):")
    for d, r in all_returns[:3]:
        print(f"  {d.strftime('%Y-%m')}  {r:+.4f}%")
    print("Sample (last 3):")
    for d, r in all_returns[-3:]:
        print(f"  {d.strftime('%Y-%m')}  {r:+.4f}%")
    print()

    if args.dry_run:
        print("Dry run — no data written.")
        return

    # --- Write to Supabase ---
    supabase = get_supabase_client()

    rows = [
        {
            "portfolio_slug": PORTFOLIO_SLUG,
            "date": d.isoformat(),
            "monthly_return": r,
        }
        for d, r in all_returns
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
    print(f"Stage 1 will handle {PORTFOLIO_SLUG} going forward (VTI in allocations table).")


if __name__ == "__main__":
    main()
