"""
Signal rules for the Dual Momentum portfolio family (Gary Antonacci).

Each function receives:
  target_month  — date, first day of the month the holdings are IN EFFECT
  price_cache   — dict {ticker: [price_data]} covering ~13 months of history

Each function returns:
  dict {ticker: weight}  e.g. {"SPY": 1.0} or {"AGG": 0.5, "BIL": 0.5}
  or None if price data is insufficient to calculate a signal.

Signal date = last calendar day of the prior month. We find the actual last
trading day on or before that date using get_last_trading_day_price().

Sources:
  GEM / GEM+EM / Diversified GEM: Antonacci, "Dual Momentum Investing" (2014)
  Composite DM: Antonacci, allocatesmartly.com/antonaccis-composite-dual-momentum
  Accelerating DM: engineeredportfolio.com/2018/05/02/accelerating-dual-momentum-investing
"""

from datetime import timedelta

from utils import get_last_trading_day_price, n_month_return

# ---------------------------------------------------------------------------
# Tickers required by this module.
# stage0_signals.py unions these across all modules to build the fetch list.
# ---------------------------------------------------------------------------

ALL_TICKERS = list({
    # GEM + GEM+EM + Diversified GEM
    "SPY", "EFA", "EEM", "AGG", "BIL",
    # Composite DM
    "LQD", "HYG", "VNQ", "REM", "GLD", "TLT",
    # Accelerating DM
    "SCZ", "TIP",
})


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _signal_date(target_month):
    """Last calendar day of the prior month — the date we calculate signals from."""
    return target_month - timedelta(days=1)


def _ret(price_cache, ticker, signal_date, months):
    """Convenience wrapper: n-month return for one ticker, or None if missing."""
    data = price_cache.get(ticker, [])
    if not data:
        return None
    return n_month_return(data, signal_date, months)


# ---------------------------------------------------------------------------
# GEM Dual Momentum (Antonacci original)
#
# Universe: SPY (US equities), EFA (international), AGG (bonds), BIL (T-bills)
# Lookback: 12 months
# Rules:
#   1. Absolute momentum: if SPY 12M return > BIL 12M return → equities positive
#   2. If positive: hold whichever of SPY or EFA has the higher 12M return
#   3. If negative: hold AGG
# ---------------------------------------------------------------------------

def gem(target_month, price_cache):
    sd = _signal_date(target_month)
    spy = _ret(price_cache, "SPY", sd, 12)
    efa = _ret(price_cache, "EFA", sd, 12)
    bil = _ret(price_cache, "BIL", sd, 12)

    if spy is None or bil is None:
        return None

    if spy > bil:
        # Equity momentum is positive — pick the stronger of US vs international
        if efa is not None and efa > spy:
            return {"EFA": 1.0}
        return {"SPY": 1.0}
    else:
        return {"AGG": 1.0}


# ---------------------------------------------------------------------------
# GEM + Emerging Markets Dual Momentum (community variant of GEM)
#
# Universe: SPY, EFA, EEM (emerging markets), AGG, BIL
# Lookback: 12 months
# Rules: same as GEM but EEM competes in the relative momentum step
# ---------------------------------------------------------------------------

def gem_em(target_month, price_cache):
    sd = _signal_date(target_month)
    spy = _ret(price_cache, "SPY", sd, 12)
    efa = _ret(price_cache, "EFA", sd, 12)
    eem = _ret(price_cache, "EEM", sd, 12)
    bil = _ret(price_cache, "BIL", sd, 12)

    if spy is None or bil is None:
        return None

    if spy > bil:
        # Pick the best-performing equity market
        candidates = {"SPY": spy}
        if efa is not None:
            candidates["EFA"] = efa
        if eem is not None:
            candidates["EEM"] = eem
        winner = max(candidates, key=candidates.get)
        return {winner: 1.0}
    else:
        return {"AGG": 1.0}


# ---------------------------------------------------------------------------
# Diversified GEM Dual Momentum (Antonacci variant)
#
# Universe: SPY, EFA, AGG
# Lookback: 7 parallel windows — 6, 7, 8, 9, 10, 11, 12 months
# Rules:
#   Split into 7 equal tranches (1/7 each). For each lookback window:
#     - Absolute: compare SPY vs AGG (not BIL) over that window
#     - If SPY > AGG: hold better of SPY or EFA for that tranche
#     - Else: hold AGG for that tranche
#   Combine all 7 tranches to get final weights.
# Purpose: reduces specification risk of a single lookback period.
# ---------------------------------------------------------------------------

def diversified_gem(target_month, price_cache):
    sd = _signal_date(target_month)
    lookbacks = [6, 7, 8, 9, 10, 11, 12]
    tranche = 1.0 / len(lookbacks)
    combined = {}

    for n in lookbacks:
        spy = _ret(price_cache, "SPY", sd, n)
        efa = _ret(price_cache, "EFA", sd, n)
        agg = _ret(price_cache, "AGG", sd, n)

        if spy is None or agg is None:
            # Insufficient data — put this tranche in AGG defensively
            ticker = "AGG"
        elif spy > agg:
            # Equity momentum positive — pick US or international
            if efa is not None and efa > spy:
                ticker = "EFA"
            else:
                ticker = "SPY"
        else:
            ticker = "AGG"

        combined[ticker] = round(combined.get(ticker, 0.0) + tranche, 8)

    # Clean up floating-point noise and ensure weights sum to 1.0
    total = sum(combined.values())
    return {t: round(w / total, 6) for t, w in combined.items()}


# ---------------------------------------------------------------------------
# Composite Dual Momentum (Antonacci)
#
# Universe: 8 assets across 4 equal modules, plus BIL as safe haven
# Lookback: 12 months
# Rules: each 25% module runs dual momentum independently:
#   - Pick the asset in the module with the higher 12M return (relative)
#   - If that return > BIL 12M return (absolute): hold it
#   - Else: hold BIL for that module's 25%
# Modules:
#   Equities:      SPY vs EFA
#   Credit:        LQD vs HYG
#   Real estate:   VNQ vs REM
#   Stress hedge:  GLD vs TLT
# ---------------------------------------------------------------------------

def composite_dm(target_month, price_cache):
    sd = _signal_date(target_month)
    bil = _ret(price_cache, "BIL", sd, 12)

    if bil is None:
        return None

    modules = [
        ("SPY", "EFA"),
        ("LQD", "HYG"),
        ("VNQ", "REM"),
        ("GLD", "TLT"),
    ]
    module_weight = 0.25
    combined = {}

    for asset1, asset2 in modules:
        r1 = _ret(price_cache, asset1, sd, 12)
        r2 = _ret(price_cache, asset2, sd, 12)

        # Pick the better asset in this module
        if r1 is not None and r2 is not None:
            winner, winner_ret = (asset1, r1) if r1 >= r2 else (asset2, r2)
        elif r1 is not None:
            winner, winner_ret = asset1, r1
        elif r2 is not None:
            winner, winner_ret = asset2, r2
        else:
            # No data for this module — default to BIL
            winner, winner_ret = "BIL", bil

        # Absolute momentum: does the winner beat T-bills?
        ticker = winner if winner_ret > bil else "BIL"
        combined[ticker] = round(combined.get(ticker, 0.0) + module_weight, 8)

    return {t: round(w, 6) for t, w in combined.items()}


# ---------------------------------------------------------------------------
# Accelerating Dual Momentum
#
# Universe: SPY (US large-cap), SCZ (intl small-cap), TLT (long bonds), TIP (TIPS)
# Lookback: composite of 1, 3, and 6 months (equal weight)
# Rules:
#   1. Composite score for SPY and SCZ = average of 1M, 3M, 6M returns
#   2. If SPY score > SCZ score AND SPY score > 0: hold SPY
#   3. Elif SCZ score > SPY score AND SCZ score > 0: hold SCZ
#   4. Else (both ≤ 0): hold whichever of TLT or TIP had the better 1M return
# ---------------------------------------------------------------------------

def accelerating_dm(target_month, price_cache):
    sd = _signal_date(target_month)

    def composite_score(ticker):
        returns = [_ret(price_cache, ticker, sd, n) for n in [1, 3, 6]]
        available = [r for r in returns if r is not None]
        if not available:
            return None
        return sum(available) / len(available)

    spy_score = composite_score("SPY")
    scz_score = composite_score("SCZ")

    # Determine if either equity has positive accelerating momentum
    spy_leads = (
        spy_score is not None
        and spy_score > 0
        and (scz_score is None or spy_score >= scz_score)
    )
    scz_leads = (
        scz_score is not None
        and scz_score > 0
        and (spy_score is None or scz_score > spy_score)
    )

    if spy_leads:
        return {"SPY": 1.0}
    elif scz_leads:
        return {"SCZ": 1.0}
    else:
        # Both equity scores non-positive — hold the stronger bond
        tlt_1 = _ret(price_cache, "TLT", sd, 1)
        tip_1 = _ret(price_cache, "TIP", sd, 1)

        if tlt_1 is not None and (tip_1 is None or tlt_1 >= tip_1):
            return {"TLT": 1.0}
        elif tip_1 is not None:
            return {"TIP": 1.0}
        else:
            return {"TLT": 1.0}  # fallback if no bond data
