"""
Backfill monthly returns for the Global Stock Market portfolio.

Data sources:
  - MSCI ACWI Index daily prices (CSV from MSCI) → Jan 1999 – Jun 2008
  - VT (Vanguard Total World Stock ETF) from EODHD → Jul 2008 – present

VT launched June 24, 2008. July 2008 is the first month Stage 1 can calculate
a full VT return (start = last trading day of Jun 2008, end = last day of Jul 2008).
This script handles everything up through the most recently completed month,
after which Stage 1 takes over automatically.

Usage:
    python backfill_global_stock_market.py --acwi-csv /path/to/acwi.csv
    python backfill_global_stock_market.py --acwi-csv /path/to/acwi.csv --through 2024-12
    python backfill_global_stock_market.py --acwi-csv /path/to/acwi.csv --dry-run
"""

import argparse
import csv
import os
import time
from calendar import monthrange
from datetime import date, timedelta

from dotenv import load_dotenv

from utils import (
    get_supabase_client, DOTENV_PATH,
    fetch_ticker_prices, get_last_trading_day_price,
)

PORTFOLIO_SLUG = "global-stock-market"
API_DELAY = 0.1

# ACWI proxy covers Jan 1999 through Jun 2008 (VT's first full month is Jul 2008)
ACWI_START = date(1999, 1, 1)
ACWI_END   = date(2008, 6, 1)

# VT EODHD coverage starts Jul 2008
VT_START = date(2008, 7, 1)
VT_TICKER = "VT"


def last_day_of_month(year, month):
    return date(year, month, monthrange(year, month)[1])


def parse_acwi_csv(csv_path):
    """
    Parse the MSCI ACWI daily price CSV.
    Returns dict {date_str: float} for all rows where column 1 looks like YYYY-MM-DD
    and column 2 is a valid float.
    Skips the 6-row header block automatically.
    """
    prices = {}
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or len(row) < 2:
                continue
            date_str = row[0].strip()
            val_str  = row[1].strip()
            if len(date_str) != 10 or date_str[4] != "-" or date_str[7] != "-":
                continue
            try:
                prices[date_str] = float(val_str)
            except ValueError:
                continue
    return prices


def acwi_last_trading_day_price(acwi_prices, year, month):
    """Return the last available ACWI index level on or before the last calendar day of the given month."""
    last_cal = last_day_of_month(year, month)
    cutoff = last_cal.isoformat()
    result = None
    for ds in sorted(acwi_prices):
        if ds <= cutoff:
            result = acwi_prices[ds]
        else:
            break
    return result


def calc_acwi_returns(acwi_prices, from_month, through_month):
    """
    Calculate monthly returns from ACWI index levels.
    from_month and through_month are date(year, month, 1).
    Returns list of (month_date, return_pct) tuples.
    """
    results = []
    m = from_month
    while m <= through_month:
        prev_month = (m - timedelta(days=1)).replace(day=1)
        start_price = acwi_last_trading_day_price(acwi_prices, prev_month.year, prev_month.month)
        end_price   = acwi_last_trading_day_price(acwi_prices, m.year, m.month)

        if start_price and end_price and start_price != 0:
            ret = round((end_price / start_price - 1) * 100, 6)
            results.append((m, ret))
        else:
            print(f"  [WARN] Missing ACWI price for {m.strftime('%Y-%m')} — skipped")

        # Advance one month
        next_month = m.month + 1
        next_year  = m.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        m = date(next_year, next_month, 1)

    return results


def calc_vt_returns(price_data, from_month, through_month):
    """
    Calculate monthly returns from VT EODHD price data.
    Returns list of (month_date, return_pct) tuples.
    """
    results = []
    m = from_month
    while m <= through_month:
        prior_end = m - timedelta(days=1)
        last_cal  = last_day_of_month(m.year, m.month)
        last_date = date(m.year, m.month, last_cal.day)

        start_price = get_last_trading_day_price(price_data, prior_end)
        end_price   = get_last_trading_day_price(price_data, last_date)

        if start_price and end_price and start_price != 0:
            ret = round((end_price / start_price - 1) * 100, 6)
            results.append((m, ret))
        else:
            print(f"  [WARN] Missing VT price for {m.strftime('%Y-%m')} — skipped")

        next_month = m.month + 1
        next_year  = m.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        m = date(next_year, next_month, 1)

    return results


def main():
    parser = argparse.ArgumentParser(description="Backfill Global Stock Market monthly returns")
    parser.add_argument("--acwi-csv", required=True, help="Path to MSCI ACWI daily price CSV")
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

    print(f"\n{'='*60}")
    print(f"Backfill: Global Stock Market")
    print(f"  ACWI proxy : {ACWI_START.strftime('%b %Y')} – {ACWI_END.strftime('%b %Y')}")
    print(f"  VT (EODHD) : {VT_START.strftime('%b %Y')} – {through_month.strftime('%b %Y')}")
    print(f"  Dry run    : {args.dry_run}")
    print(f"{'='*60}\n")

    # --- ACWI segment ---
    print(f"Parsing MSCI ACWI CSV: {args.acwi_csv}")
    acwi_prices = parse_acwi_csv(args.acwi_csv)
    print(f"  {len(acwi_prices)} daily price rows loaded")

    acwi_returns = calc_acwi_returns(acwi_prices, ACWI_START, ACWI_END)
    print(f"  {len(acwi_returns)} monthly returns calculated (ACWI)\n")

    # --- VT segment ---
    vt_through = through_month
    print(f"Fetching VT from EODHD ({VT_START.strftime('%Y-%m')} – {vt_through.strftime('%Y-%m')})...")
    # Fetch from end of prior month (Jun 2008) through end of through_month
    fetch_from = date(2008, 6, 1)
    last_day   = last_day_of_month(vt_through.year, vt_through.month)
    vt_prices  = fetch_ticker_prices(VT_TICKER, fetch_from, last_day, api_key)

    if not vt_prices:
        print("  [ERROR] No VT price data returned — aborting")
        return

    print(f"  {len(vt_prices)} daily price rows loaded")
    vt_returns = calc_vt_returns(vt_prices, VT_START, vt_through)
    print(f"  {len(vt_returns)} monthly returns calculated (VT)\n")

    # --- Combine ---
    all_returns = acwi_returns + vt_returns
    all_returns.sort(key=lambda x: x[0])

    print(f"Total monthly returns to insert: {len(all_returns)}")
    print(f"  Range: {all_returns[0][0].strftime('%b %Y')} – {all_returns[-1][0].strftime('%b %Y')}\n")

    # Print first and last few for sanity check
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

    # Upsert in batches of 500
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
    print(f"Stage 1 will handle {PORTFOLIO_SLUG} going forward (VT in allocations table).")


if __name__ == "__main__":
    main()
