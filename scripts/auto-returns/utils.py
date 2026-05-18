"""
Shared helpers for the auto-returns pipeline.
Imported by stage0_signals.py, stage1_calculate.py, and stage2_promote.py.
"""

import os
from calendar import monthrange
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# .env.local lives at the project root, two levels up from scripts/auto-returns/
DOTENV_PATH = Path(__file__).parent.parent.parent / ".env.local"


def get_supabase_client() -> Client:
    """
    Load environment variables and return an authenticated Supabase client.
    Uses the service role key so the script can write data (bypasses RLS).
    """
    load_dotenv(dotenv_path=DOTENV_PATH)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise EnvironmentError(
            "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) in .env.local"
        )
    if not key:
        raise EnvironmentError(
            "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local"
        )

    return create_client(url, key)


def get_target_month(month_arg: Optional[str]) -> date:
    """
    Return the first day of the target month as a date object.

    If month_arg is provided (format: YYYY-MM), use that.
    Otherwise default to the most recently completed calendar month.
    Example: if today is 2026-05-17, the default target is 2026-04-01.
    """
    if month_arg:
        try:
            year, month = month_arg.split("-")
            return date(int(year), int(month), 1)
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid --month format '{month_arg}'. Expected YYYY-MM (e.g. 2026-04)")

    # Default: first day of last month
    today = date.today()
    first_of_this_month = today.replace(day=1)
    last_month = first_of_this_month - timedelta(days=1)
    return last_month.replace(day=1)


def month_display(target: date) -> str:
    """Return a human-readable month string like 'April 2026'."""
    return target.strftime("%B %Y")


def subtract_months(d, n):
    """Return the first day of the month n months before date d."""
    month = d.month - n
    year = d.year
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 1)


def fetch_ticker_prices(ticker, from_date, to_date, api_key):
    """
    Fetch end-of-day price history for one ticker from EODHD.
    Returns a list of dicts with 'date' and 'adjusted_close' keys.
    Returns an empty list on any error.
    EODHD requires the .US suffix for US-listed ETFs.
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


def get_last_trading_day_price(price_data, before_or_on):
    """
    Return the adjusted_close on the last trading day on or before the given date.
    Price data must be sorted ascending by date (EODHD default).
    Returns None if no matching data exists.
    """
    result = None
    cutoff = before_or_on.isoformat()
    for row in price_data:
        if row["date"] <= cutoff:
            result = row.get("adjusted_close")
        else:
            break
    return result


def n_month_return(price_data, signal_date, n):
    """
    Calculate return from n months before signal_date through signal_date.
    Uses adjusted_close on last available trading day at each endpoint.
    Returns None if price data is missing at either endpoint.
    """
    end_price = get_last_trading_day_price(price_data, signal_date)

    # Last day of the month n months before signal_date
    month = signal_date.month - n
    year = signal_date.year
    while month <= 0:
        month += 12
        year -= 1
    last_day = monthrange(year, month)[1]
    start_date = date(year, month, last_day)

    start_price = get_last_trading_day_price(price_data, start_date)

    if end_price is None or start_price is None or start_price == 0:
        return None
    return (end_price / start_price - 1) * 100
