"""
Shared helpers for the auto-returns pipeline.
Both stage1_calculate.py and stage2_promote.py import from here.
"""

import os
from datetime import date, timedelta
from pathlib import Path
from typing import Optional
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
