"""
Backfill monthly returns for the Warren Buffett Portfolio.

Allocation: 90% S&P 500 + 10% Short-Term Government Bonds
Blended return = 0.90 * equity_return + 0.10 * bond_return per month.

Data sources:
  Equity (90%):
    VFINX (Vanguard 500 Index Fund) from EODHD  — Dec 1991 through Jan 1993
    SPY   (SPDR S&P 500 ETF)        from EODHD  — Feb 1993 through present

  Bonds (10%):
    VFISX (Vanguard Short-Term Treasury) from EODHD — Dec 1991 through Jul 2002
    SHY   (iShares 1-3 Yr Treasury ETF) from EODHD  — Aug 2002 through present

Start month: December 1991 — earliest month where both VFINX and VFISX have data.
  VFISX launched October 28, 1991; November 30 is the first available boundary
  price, making December 1991 the first calculable month.

Usage:
    python backfill_warren_buffett.py
    python backfill_warren_buffett.py --through 2024-12
    python backfill_warren_buffett.py --dry-run
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

PORTFOLIO_SLUG = "warren-buffett-portfolio"
EQUITY_WEIGHT  = 0.90
BOND_WEIGHT    = 0.10
API_DELAY      = 0.15

VFINX_TICKER = "VFINX"
SPY_TICKER   = "SPY"
VFISX_TICKER = "VFISX"
SHY_TICKER   = "SHY"

# SPY launched Jan 29, 1993 — use it from Feb 1993 onwards
SPY_TRANSITION = date(1993, 2, 1)

# SHY launched Jul 22, 2002 — Jul 31 price available; use SHY from Aug 2002 onwards
SHY_TRANSITION = date(2002, 8, 1)

# EODHD fetch ranges (slightly wider than needed to get boundary prices)
VFINX_FETCH_FROM = date(1991, 10, 1)
VFINX_FETCH_TO   = date(1993, 1, 31)

SPY_FETCH_FROM   = date(1993, 1, 1)   # need Jan 31 SPY price as start for Feb 1993

VFISX_FETCH_FROM = date(1991, 10, 1)
VFISX_FETCH_TO   = date(2002, 7, 31)

SHY_FETCH_FROM   = date(2002, 7, 1)   # need Jul 31 SHY price as start for Aug 2002

BACKFILL_START = date(1991, 12, 1)


def last_day_of_month(year, month):
    return date(year, month, monthrange(year, month)[1])


def get_equity_price(vfinx_prices, spy_prices, target_date, month_date):
    # Use month_date (not target_date) to pick the instrument so both
    # boundary prices for a given month always come from the same source.
    if month_date < SPY_TRANSITION:
        return get_last_trading_day_price(vfinx_prices, target_date)
    return get_last_trading_day_price(spy_prices, target_date)


def get_bond_price(vfisx_prices, shy_prices, target_date, month_date):
    if month_date < SHY_TRANSITION:
        return get_last_trading_day_price(vfisx_prices, target_date)
    return get_last_trading_day_price(shy_prices, target_date)


def calc_blended_monthly_returns(
    vfinx_prices, spy_prices,
    vfisx_prices, shy_prices,
    from_month, through_month,
):
    """
    Calculate blended monthly returns for each month in [from_month, through_month].
    Skips months where any boundary price is missing.
    Returns list of (month_date, blended_return_pct) tuples.
    """
    results = []
    m = from_month
    while m <= through_month:
        prior_end = m - timedelta(days=1)
        month_end = last_day_of_month(m.year, m.month)

        eq_start = get_equity_price(vfinx_prices, spy_prices, prior_end, m)
        eq_end   = get_equity_price(vfinx_prices, spy_prices, month_end, m)
        bd_start = get_bond_price(vfisx_prices, shy_prices, prior_end, m)
        bd_end   = get_bond_price(vfisx_prices, shy_prices, month_end, m)

        if all(p and p != 0 for p in [eq_start, eq_end, bd_start, bd_end]):
            eq_ret  = (eq_end  / eq_start  - 1) * 100
            bd_ret  = (bd_end  / bd_start  - 1) * 100
            blended = round(EQUITY_WEIGHT * eq_ret + BOND_WEIGHT * bd_ret, 6)
            results.append((m, blended))
        else:
            missing = []
            if not (eq_start and eq_end):
                missing.append("equity")
            if not (bd_start and bd_end):
                missing.append("bonds")
            print(f"  [SKIP] {m.strftime('%Y-%m')} — missing {' + '.join(missing)} price data")

        next_month = m.month + 1
        next_year  = m.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        m = date(next_year, next_month, 1)

    return results


def main():
    parser = argparse.ArgumentParser(description="Backfill Warren Buffett Portfolio monthly returns")
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
        y, mo = args.through.split("-")
        through_month = date(int(y), int(mo), 1)
    else:
        today = date.today()
        through_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)

    print(f"\n{'='*60}")
    print(f"Backfill: Warren Buffett Portfolio (90/10)")
    print(f"  Equity : VFINX (Dec 1991–Jan 1993) → SPY (Feb 1993–{through_month.strftime('%b %Y')})")
    print(f"  Bonds  : VFISX (Dec 1991–Jul 2002) → SHY (Aug 2002–{through_month.strftime('%b %Y')})")
    print(f"  Dry run: {args.dry_run}")
    print(f"{'='*60}\n")

    fetch_to = last_day_of_month(through_month.year, through_month.month)

    print("Fetching VFINX (Oct 1991 – Jan 1993)...")
    vfinx_prices = fetch_ticker_prices(VFINX_TICKER, VFINX_FETCH_FROM, VFINX_FETCH_TO, api_key)
    time.sleep(API_DELAY)
    if not vfinx_prices:
        print("  [ERROR] No VFINX data — aborting")
        return
    print(f"  {len(vfinx_prices)} daily rows loaded")

    print(f"Fetching SPY (Jan 1993 – {through_month.strftime('%b %Y')})...")
    spy_prices = fetch_ticker_prices(SPY_TICKER, SPY_FETCH_FROM, fetch_to, api_key)
    time.sleep(API_DELAY)
    if not spy_prices:
        print("  [ERROR] No SPY data — aborting")
        return
    print(f"  {len(spy_prices)} daily rows loaded")

    print("Fetching VFISX (Oct 1991 – Jul 2002)...")
    vfisx_prices = fetch_ticker_prices(VFISX_TICKER, VFISX_FETCH_FROM, VFISX_FETCH_TO, api_key)
    time.sleep(API_DELAY)
    if not vfisx_prices:
        print("  [ERROR] No VFISX data — aborting")
        return
    print(f"  {len(vfisx_prices)} daily rows loaded")

    print(f"Fetching SHY (Jul 2002 – {through_month.strftime('%b %Y')})...")
    shy_prices = fetch_ticker_prices(SHY_TICKER, SHY_FETCH_FROM, fetch_to, api_key)
    time.sleep(API_DELAY)
    if not shy_prices:
        print("  [ERROR] No SHY data — aborting")
        return
    print(f"  {len(shy_prices)} daily rows loaded\n")

    all_returns = calc_blended_monthly_returns(
        vfinx_prices, spy_prices,
        vfisx_prices, shy_prices,
        BACKFILL_START, through_month,
    )

    if not all_returns:
        print("[ERROR] No monthly returns calculated — check price data above")
        return

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
            on_conflict="portfolio_slug,date",
        ).execute()
        inserted += len(batch)
        print(f"  Upserted {inserted}/{len(rows)} rows...")

    print(f"\nDone. {len(rows)} monthly returns written to Supabase.")
    print(f"Stage 1 will handle {PORTFOLIO_SLUG} going forward (SPY + SHY in allocations table).")


if __name__ == "__main__":
    main()
