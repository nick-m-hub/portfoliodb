"""
Stage 2: Promote approved staging rows into the live monthly_returns table.

Run this MANUALLY after reviewing the staging data — never on a cron schedule.
Usage:
    python stage2_promote.py --month 2026-04
"""

import argparse
import sys

from utils import get_supabase_client, get_target_month, month_display


def main():
    parser = argparse.ArgumentParser(description="Stage 2: Promote staged returns to live table")
    parser.add_argument("--month", type=str, required=True, help="Month to promote in YYYY-MM format")
    args = parser.parse_args()

    target_month = get_target_month(args.month)
    target_date = target_month.isoformat()

    print(f"\n{'='*60}")
    print(f"Stage 2: Promoting returns for {month_display(target_month)}")
    print(f"{'='*60}\n")

    supabase = get_supabase_client()

    # -----------------------------------------------------------------------
    # STEP 1: Fetch pending rows from staging for this month
    # -----------------------------------------------------------------------
    print(f"Fetching pending rows from staging for {target_date}...")

    # Fetch non-tactical slugs so we never promote tactical portfolios
    # (those are updated manually via a separate script)
    non_tactical_resp = (
        supabase.table("portfolios")
        .select("slug")
        .neq("category", "Tactical")
        .execute()
    )
    non_tactical_slugs = [p["slug"] for p in non_tactical_resp.data]

    staging_resp = (
        supabase.table("monthly_returns_staging")
        .select("portfolio_slug, date, monthly_return, flagged, flag_reason")
        .eq("status", "pending")
        .eq("date", target_date)
        .in_("portfolio_slug", non_tactical_slugs)
        .execute()
    )

    pending_rows = staging_resp.data

    if not pending_rows:
        print(f"  Nothing to promote for {month_display(target_month)}. Exiting.")
        sys.exit(0)

    print(f"  {len(pending_rows)} pending rows found.\n")

    # -----------------------------------------------------------------------
    # STEP 2: Safety check — require confirmation for flagged rows
    # -----------------------------------------------------------------------
    flagged_rows = [r for r in pending_rows if r["flagged"]]

    if flagged_rows:
        print(f"  WARNING: {len(flagged_rows)} flagged portfolio(s) are in this batch:\n")
        for r in flagged_rows:
            print(f"    {r['portfolio_slug']}")
            print(f"      Reason: {r['flag_reason']}")
        print()

        # In GitHub Actions there is no interactive terminal — auto-abort so
        # the workflow doesn't hang waiting for input that will never arrive.
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print("  Running in GitHub Actions — cannot prompt for confirmation.")
            print("  Fix the flagged portfolios in Supabase staging, then re-run this workflow.")
            sys.exit(1)

        confirmation = input(
            f"  {len(flagged_rows)} flagged portfolio(s) will be promoted. "
            f"Type CONFIRM to proceed (or anything else to abort): "
        ).strip()

        if confirmation != "CONFIRM":
            print("\n  Aborted. No rows were promoted.")
            sys.exit(0)

        print()

    # -----------------------------------------------------------------------
    # STEP 3: Check for duplicate rows already in the live table
    # -----------------------------------------------------------------------
    print("Checking for existing rows in monthly_returns...")

    slugs_to_promote = [r["portfolio_slug"] for r in pending_rows]

    existing_resp = (
        supabase.table("monthly_returns")
        .select("portfolio_slug, date")
        .eq("date", target_date)
        .in_("portfolio_slug", slugs_to_promote)
        .execute()
    )

    existing_rows = existing_resp.data

    if existing_rows:
        print(f"\n  ERROR: {len(existing_rows)} row(s) already exist in monthly_returns for {target_date}:")
        for r in existing_rows:
            print(f"    {r['portfolio_slug']}")
        print(
            "\n  Aborting — will not overwrite live data automatically.\n"
            "  To fix: delete the conflicting rows in Supabase SQL Editor, then re-run Stage 2.\n"
            "  SQL: DELETE FROM monthly_returns WHERE date = '" + target_date + "' AND portfolio_slug IN (...);"
        )
        sys.exit(1)

    print(f"  No duplicates found. Safe to proceed.\n")

    # -----------------------------------------------------------------------
    # STEP 4: Insert into monthly_returns
    # -----------------------------------------------------------------------
    print(f"Inserting {len(pending_rows)} rows into monthly_returns...")

    live_rows = [
        {
            "portfolio_slug": r["portfolio_slug"],
            "date": r["date"],
            "monthly_return": r["monthly_return"],
        }
        for r in pending_rows
    ]

    supabase.table("monthly_returns").insert(live_rows).execute()
    print("  Inserted.\n")

    # -----------------------------------------------------------------------
    # STEP 5: Mark staging rows as approved
    # -----------------------------------------------------------------------
    print("Marking staging rows as approved...")

    supabase.table("monthly_returns_staging").update(
        {"status": "approved"}
    ).eq("date", target_date).eq("status", "pending").execute()

    print("  Done.\n")

    # -----------------------------------------------------------------------
    # STEP 6: Final summary
    # -----------------------------------------------------------------------
    print(f"{'='*60}")
    print(f"DONE — {month_display(target_month)}")
    print(f"{'='*60}")
    print(f"  Rows promoted to monthly_returns : {len(live_rows)}")
    print(f"  Staging rows marked approved     : {len(live_rows)}")
    print()
    print("  portfolio_stats recalculates automatically — all site stats")
    print("  are already updated. No Vercel redeploy needed.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
