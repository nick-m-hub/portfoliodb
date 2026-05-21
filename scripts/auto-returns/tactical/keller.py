"""
Signal rules for the Keller et al. family of tactical strategies.

Strategies implemented:
  PAA     — Protective Asset Allocation (Keller & Keuning, 2016, SSRN 2759734)
  VAA G4  — Vigilant Asset Allocation, 4-asset (Keller & Keuning, 2017, SSRN 3002624)
  VAA G12 — Vigilant Asset Allocation, 12-asset (Keller & Keuning, 2017, SSRN 3002624)
  DAA     — Defensive Asset Allocation (Keller & Keuning, 2018, SSRN 3212862)
  GPM     — Generalized Protective Momentum (Keller & Keuning)
  KDA     — Kipnis Defensive Adaptive AA (Kipnis, 2019, QuantStrat TradeR)
  AAA     — Adaptive Asset Allocation (Butler et al., ReSolve AM, 2012)

Each function receives:
  target_month  — date, first day of the month the holdings are IN EFFECT
  price_cache   — dict {ticker: [price_data]} covering ~13 months of daily history

Each function returns:
  dict {ticker: weight}  e.g. {"SPY": 0.5, "IEF": 0.5}
  or None if price data is insufficient to calculate a signal.

Signal date = last calendar day of the prior month.

Key momentum formulas:
  13612W (VAA/DAA/KDA): 12*R1 + 4*R3 + 2*R6 + R12  (fast, front-weighted)
  SMA(12) (PAA):  p0 / average(p1..p12) - 1
  Simple avg (GPM): (R1 + R3 + R6 + R12) / 4
  where R1/R3/R6/R12 = 1/3/6/12-month returns in percentage terms.
"""

import math
from calendar import monthrange
from datetime import date, timedelta

import numpy as np
from scipy.optimize import minimize

from utils import get_last_trading_day_price, n_month_return


# ---------------------------------------------------------------------------
# All tickers required by this module.
# stage0_signals.py unions these across all modules to build the fetch list.
# ---------------------------------------------------------------------------

ALL_TICKERS = list({
    # PAA / GPM risky universe
    "SPY", "QQQ", "IWM", "VGK", "EWJ", "EEM", "IYR", "GSG", "GLD", "TLT", "HYG", "LQD",
    # VAA G12 / DAA risky universe extras (EEM shared with PAA; VNQ replaces IYR; DBC replaces GSG)
    "VNQ", "DBC",
    # VAA G4 extras
    "EFA", "AGG",
    # Cash universe for VAA / DAA / KDA  (BIL replaces SHY)
    "BIL", "IEF",
    # KDA / AAA investment universe extras
    "RWX", "DBC",
    # DAA / KDA canary
    "BND",
})


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _signal_date(target_month):
    """Last calendar day of the prior month — the date signals are calculated from."""
    return target_month - timedelta(days=1)


def _mom_13612w(price_cache, ticker, signal_date):
    """
    13612W fast momentum filter (Keller 2017).
    mom = 12*R1 + 4*R3 + 2*R6 + R12, where returns are in percentage.
    Returns None if any lookback period is missing data.
    """
    data = price_cache.get(ticker, [])
    if not data:
        return None
    r1  = n_month_return(data, signal_date, 1)
    r3  = n_month_return(data, signal_date, 3)
    r6  = n_month_return(data, signal_date, 6)
    r12 = n_month_return(data, signal_date, 12)
    if any(r is None for r in [r1, r3, r6, r12]):
        return None
    return 12 * r1 + 4 * r3 + 2 * r6 + r12


def _mom_simple(price_cache, ticker, signal_date):
    """
    Simple equal-weight momentum: (R1 + R3 + R6 + R12) / 4.
    Used by GPM. Returns None if any lookback period is missing.
    """
    data = price_cache.get(ticker, [])
    if not data:
        return None
    r1  = n_month_return(data, signal_date, 1)
    r3  = n_month_return(data, signal_date, 3)
    r6  = n_month_return(data, signal_date, 6)
    r12 = n_month_return(data, signal_date, 12)
    if any(r is None for r in [r1, r3, r6, r12]):
        return None
    return (r1 + r3 + r6 + r12) / 4


def _sma_mom(price_cache, ticker, signal_date, n=12):
    """
    SMA-based momentum: p0 / SMA(n) - 1  (Keller 2016, PAA).
    SMA(n) = arithmetic mean of the last n end-of-month closing prices.
    Returns None if any price is unavailable.
    """
    data = price_cache.get(ticker, [])
    if not data:
        return None
    p0 = get_last_trading_day_price(data, signal_date)
    if p0 is None:
        return None
    past_prices = []
    for i in range(1, n + 1):
        month = signal_date.month - i
        year  = signal_date.year
        while month <= 0:
            month += 12
            year  -= 1
        last_day  = monthrange(year, month)[1]
        past_date = date(year, month, last_day)
        px = get_last_trading_day_price(data, past_date)
        if px is None:
            return None
        past_prices.append(px)
    sma = sum(past_prices) / len(past_prices)
    return (p0 / sma - 1) if sma != 0 else None


def _best_cash(cash_moms):
    """Return the cash ticker with the highest momentum score (ignores None)."""
    valid = {t: m for t, m in cash_moms.items() if m is not None}
    return max(valid, key=valid.get) if valid else "BIL"


def _easy_trading_slots(b, T, B):
    """
    VAA/DAA Easy Trading formula: CF = (1/T) * floor(b*T/B).
    Returns (risky_slots, cash_slots) where risky_slots + cash_slots = T.
    """
    cash_slots  = min(T, math.floor(b * T / B))
    return T - cash_slots, cash_slots


def _rank_desc(moms):
    """Return tickers sorted by momentum score, highest first (None sorts last)."""
    return sorted(
        moms.keys(),
        key=lambda t: moms[t] if moms[t] is not None else float("-inf"),
        reverse=True,
    )


def _eom_date(signal_date, n_months_ago):
    """Last calendar day of the month n_months_ago before signal_date."""
    month = signal_date.month - n_months_ago
    year  = signal_date.year
    while month <= 0:
        month += 12
        year  -= 1
    return date(year, month, monthrange(year, month)[1])


def _monthly_returns_series(price_cache, ticker, signal_date, n_months):
    """
    Return a list of n_months monthly percentage returns, newest first.
    ret[i] = return from end of month (i+1) ago to end of month i ago.
    Returns None if any end-of-month price is unavailable.
    """
    data = price_cache.get(ticker, [])
    if not data:
        return None
    prices = []
    for i in range(n_months + 1):
        px = get_last_trading_day_price(data, _eom_date(signal_date, i))
        if px is None:
            return None
        prices.append(px)
    return [(prices[i] / prices[i + 1] - 1) * 100 for i in range(n_months)]


def _build_aligned_returns(tickers, price_cache, start_date, end_date):
    """
    Build a (n_days, n_tickers) matrix of daily returns over [start_date, end_date],
    restricted to dates common to ALL tickers. Returns None if data is insufficient.
    """
    start_str = start_date.isoformat()
    end_str   = end_date.isoformat()

    series = {}
    for t in tickers:
        data = price_cache.get(t, [])
        if not data:
            return None
        s = {row["date"]: row["adjusted_close"]
             for row in data if start_str <= row["date"] <= end_str}
        if not s:
            return None
        series[t] = s

    common_dates = sorted(set.intersection(*[set(s.keys()) for s in series.values()]))
    if len(common_dates) < 5:
        return None

    price_matrix = np.array([[series[t][d] for t in tickers] for d in common_dates])
    if price_matrix.shape[0] < 2:
        return None

    return np.diff(price_matrix, axis=0) / price_matrix[:-1]  # (n_days-1, n_tickers)


def _safe_corrcoef(ret_matrix, n):
    """Compute correlation matrix from a return matrix; falls back to identity."""
    if ret_matrix is None or ret_matrix.shape[0] < 5:
        return np.eye(n)
    return np.atleast_2d(np.corrcoef(ret_matrix.T))


def _psd_clip(matrix):
    """Clip negative eigenvalues to ensure positive semi-definiteness."""
    ev, evec = np.linalg.eigh(matrix)
    ev = np.maximum(ev, 1e-8)
    return evec @ np.diag(ev) @ evec.T


def _min_var_weights(tickers, cov):
    """
    Minimum variance portfolio: min w'Σw  s.t. sum(w)=1, w >= 0.
    Returns dict {ticker: weight}.
    """
    n = len(tickers)
    if n == 1:
        return {tickers[0]: 1.0}

    def objective(w):
        return float(w @ cov @ w)

    def grad(w):
        return 2.0 * cov @ w

    result = minimize(
        objective,
        np.ones(n) / n,
        jac=grad,
        method="SLSQP",
        bounds=[(0.0, 1.0)] * n,
        constraints=[{"type": "eq", "fun": lambda w: w.sum() - 1.0}],
        options={"ftol": 1e-12, "maxiter": 1000},
    )
    w = np.maximum(result.x, 0.0)
    w /= w.sum()
    return {tickers[i]: round(float(w[i]), 6) for i in range(n)}


# ---------------------------------------------------------------------------
# PAA — Protective Asset Allocation  (PAA2 variant)
#
# Universe (N=12): SPY, QQQ, IWM, VGK, EWJ, EEM, IYR, GSG, GLD, TLT, HYG, LQD
# Momentum:  SMA(12) = p0 / avg(p1..p12) - 1
# Protection (a=2): BF = (N-n) / (N/2), capped at 100%
#   → 100% IEF when n ≤ 6
# Allocation: equal weight among top 6 highest-momentum good assets + IEF for BF
# Source: Keller & Keuning (2016), SSRN 2759734
# ---------------------------------------------------------------------------

_PAA_RISKY = ["SPY", "QQQ", "IWM", "VGK", "EWJ", "EEM", "IYR", "GSG", "GLD", "TLT", "HYG", "LQD"]
_PAA_N     = 12
_PAA_TOP   = 6


def paa(target_month, price_cache):
    sd = _signal_date(target_month)

    moms = {t: _sma_mom(price_cache, t, sd, 12) for t in _PAA_RISKY}
    good = {t: m for t, m in moms.items() if m is not None and m > 0}
    n    = len(good)

    # PAA2 bond fraction: BF = (N-n) / (N/2), capped at 1.0
    bf = min(1.0, (_PAA_N - n) / (_PAA_N / 2))

    if bf >= 1.0:
        return {"IEF": 1.0}

    top_assets   = sorted(good, key=good.get, reverse=True)[:_PAA_TOP]
    risky_weight = round((1.0 - bf) / len(top_assets), 6)

    result = {t: risky_weight for t in top_assets}
    if bf > 0:
        result["IEF"] = round(result.get("IEF", 0.0) + bf, 6)
    return result


# ---------------------------------------------------------------------------
# VAA G4 — Vigilant Asset Allocation, 4-asset universe
#
# Risky:  SPY, EFA, EEM, AGG  (T=1, B=1)
# Cash:   BIL, IEF, LQD  — best by 13612W momentum
# Rule:   any bad risky asset (b ≥ 1) → 100% cash; else hold single best risky
# Source: Keller & Keuning (2017), SSRN 3002624
# ---------------------------------------------------------------------------

_VAA_CASH    = ["BIL", "IEF", "LQD"]
_VAA_G4_RISKY = ["SPY", "EFA", "EEM", "AGG"]


def vaa_g4(target_month, price_cache):
    sd = _signal_date(target_month)

    risky_moms = {t: _mom_13612w(price_cache, t, sd) for t in _VAA_G4_RISKY}
    cash_moms  = {t: _mom_13612w(price_cache, t, sd) for t in _VAA_CASH}

    b = sum(1 for m in risky_moms.values() if m is None or m <= 0)

    if b >= 1:
        return {_best_cash(cash_moms): 1.0}

    best_risky = max(
        (t for t in _VAA_G4_RISKY if risky_moms[t] is not None),
        key=lambda t: risky_moms[t],
    )
    return {best_risky: 1.0}


# ---------------------------------------------------------------------------
# VAA G12 — Vigilant Asset Allocation, 12-asset universe
#
# Risky:  SPY, IWM, QQQ, VGK, EWJ, EEM, VNQ, DBC, GLD, TLT, LQD, HYG
# Cash:   BIL, IEF, LQD  — best by 13612W momentum
# Params: T=5, B=4  (Easy Trading formula)
#   b=0–1 → Top 5 risky, equal weight (1/5 each)
#   b=2–3 → Top 4 risky (80%) + best cash (20%); then 3+40%, 2+60%, 1+80%
#   b≥4   → 100% best cash
# Source: Keller & Keuning (2017), SSRN 3002624
# ---------------------------------------------------------------------------

_VAA_G12_RISKY = ["SPY", "IWM", "QQQ", "VGK", "EWJ", "EEM", "VNQ", "DBC", "GLD", "TLT", "LQD", "HYG"]
_VAA_G12_T = 5
_VAA_G12_B = 4


def vaa_g12(target_month, price_cache):
    sd = _signal_date(target_month)

    risky_moms = {t: _mom_13612w(price_cache, t, sd) for t in _VAA_G12_RISKY}
    cash_moms  = {t: _mom_13612w(price_cache, t, sd) for t in _VAA_CASH}

    b = sum(1 for m in risky_moms.values() if m is None or m <= 0)

    risky_slots, cash_slots = _easy_trading_slots(b, _VAA_G12_T, _VAA_G12_B)

    if risky_slots == 0:
        return {_best_cash(cash_moms): 1.0}

    # Take top T assets by 13612W, keep the top risky_slots (drop worst cash_slots)
    top_T        = _rank_desc(risky_moms)[:_VAA_G12_T]
    actual_risky = top_T[:risky_slots]

    w      = 1.0 / _VAA_G12_T
    result = {t: round(w, 6) for t in actual_risky}
    if cash_slots > 0:
        best_cash = _best_cash(cash_moms)
        result[best_cash] = round(result.get(best_cash, 0.0) + cash_slots * w, 6)
    return result


# ---------------------------------------------------------------------------
# DAA — Defensive Asset Allocation
#
# Risky:  same 12 assets as VAA G12
# Cash:   BIL, IEF, LQD  — best by 13612W
# Canary: EEM, BND  (separate crash-protection universe, B=2)
# Params: T=6, B=2  (canary breadth drives Easy Trading formula)
#   b_canary=0 → Top 6 risky, equal weight (1/6 each)
#   b_canary=1 → Top 3 risky (50%) + best cash (50%)
#   b_canary=2 → 100% best cash
# Source: Keller & Keuning (2018), SSRN 3212862
# ---------------------------------------------------------------------------

_DAA_RISKY  = _VAA_G12_RISKY
_DAA_CANARY = ["EEM", "BND"]
_DAA_T      = 6
_DAA_B      = 2


def daa(target_month, price_cache):
    sd = _signal_date(target_month)

    canary_moms = {t: _mom_13612w(price_cache, t, sd) for t in _DAA_CANARY}
    b_canary    = sum(1 for m in canary_moms.values() if m is None or m <= 0)

    risky_slots, cash_slots = _easy_trading_slots(b_canary, _DAA_T, _DAA_B)
    cash_moms = {t: _mom_13612w(price_cache, t, sd) for t in _VAA_CASH}

    if risky_slots == 0:
        return {_best_cash(cash_moms): 1.0}

    risky_moms   = {t: _mom_13612w(price_cache, t, sd) for t in _DAA_RISKY}
    actual_risky = _rank_desc(risky_moms)[:risky_slots]

    w      = 1.0 / _DAA_T
    result = {t: round(w, 6) for t in actual_risky}
    if cash_slots > 0:
        best_cash = _best_cash(cash_moms)
        result[best_cash] = round(result.get(best_cash, 0.0) + cash_slots * w, 6)
    return result


# ---------------------------------------------------------------------------
# GPM — Generalized Protective Momentum
#
# Universe (N=12): SPY, QQQ, IWM, VGK, EWJ, EEM, IYR, GSG, GLD, TLT, HYG, LQD
# CP assets: IEF, BIL  (select one by highest zi score)
# Scores:
#   ri = (R1 + R3 + R6 + R12) / 4   (simple average momentum, %)
#   ci = 12-month rolling correlation of asset vs equal-weight portfolio of 12 risky
#   zi = ri * (1 - ci)
# Protection: n = count(zi > 0)
#   n ≤ 6    → 100% CP asset (IEF or BIL, whichever has higher zi)
#   n > 6    → CP% = (12-n)/6; risky% = 1-CP% split equally among top 3 by zi
# ---------------------------------------------------------------------------

_GPM_RISKY = _PAA_RISKY
_GPM_CP    = ["IEF", "BIL"]
_GPM_N     = 12
_GPM_TOP   = 3


def gpm(target_month, price_cache):
    sd = _signal_date(target_month)

    # ri for each risky asset
    ri = {t: _mom_simple(price_cache, t, sd) for t in _GPM_RISKY}

    # 12-month monthly return series for each risky asset (needed for ci)
    asset_rets = {}
    for t in _GPM_RISKY:
        asset_rets[t] = _monthly_returns_series(price_cache, t, sd, 12)

    # Equal-weight portfolio monthly returns (average across all risky assets each month)
    ew_rets = []
    for i in range(12):
        month_vals = [
            asset_rets[t][i]
            for t in _GPM_RISKY
            if asset_rets[t] is not None
        ]
        ew_rets.append(sum(month_vals) / len(month_vals) if month_vals else None)

    # zi = ri * (1 - ci) for each risky asset
    zi = {}
    for t in _GPM_RISKY:
        if ri[t] is None or asset_rets[t] is None:
            zi[t] = None
            continue
        pairs = [
            (a, e)
            for a, e in zip(asset_rets[t], ew_rets)
            if a is not None and e is not None
        ]
        if len(pairs) < 6:
            zi[t] = None
            continue
        a_arr = np.array([p[0] for p in pairs])
        e_arr = np.array([p[1] for p in pairs])
        if np.std(a_arr) < 1e-10 or np.std(e_arr) < 1e-10:
            ci = 0.0
        else:
            ci = float(np.corrcoef(a_arr, e_arr)[0, 1])
        zi[t] = ri[t] * (1.0 - ci)

    # zi for CP assets (IEF and BIL) — for CP selection
    zi_cp = {}
    for t in _GPM_CP:
        ri_cp  = _mom_simple(price_cache, t, sd)
        cp_rets = _monthly_returns_series(price_cache, t, sd, 12)
        if ri_cp is None:
            zi_cp[t] = None
            continue
        if cp_rets is None:
            zi_cp[t] = ri_cp  # no correlation adjustment available
            continue
        pairs = [
            (a, e)
            for a, e in zip(cp_rets, ew_rets)
            if a is not None and e is not None
        ]
        if len(pairs) < 6:
            zi_cp[t] = ri_cp
            continue
        a_arr = np.array([p[0] for p in pairs])
        e_arr = np.array([p[1] for p in pairs])
        if np.std(a_arr) < 1e-10 or np.std(e_arr) < 1e-10:
            ci_cp = 0.0
        else:
            ci_cp = float(np.corrcoef(a_arr, e_arr)[0, 1])
        zi_cp[t] = ri_cp * (1.0 - ci_cp)

    # Count n = risky assets with zi > 0
    n = sum(1 for z in zi.values() if z is not None and z > 0)

    # Best CP asset by zi score
    best_cp = _best_cash(zi_cp)

    if n <= _GPM_N // 2:  # n ≤ 6 → 100% CP
        return {best_cp: 1.0}

    # CP fraction = (12-n)/6; top 3 risky by zi get the remainder equally
    bf         = (_GPM_N - n) / (_GPM_N // 2)  # = (12-n)/6
    top_risky  = sorted(
        (t for t in _GPM_RISKY if zi[t] is not None),
        key=lambda t: zi[t],
        reverse=True,
    )[:_GPM_TOP]

    if not top_risky:
        return {best_cp: 1.0}

    risky_weight = round((1.0 - bf) / len(top_risky), 6)
    result = {t: risky_weight for t in top_risky}
    if bf > 0:
        result[best_cp] = round(result.get(best_cp, 0.0) + bf, 6)
    return result


# ---------------------------------------------------------------------------
# KDA — Kipnis Defensive Adaptive Asset Allocation
#
# Investment universe (10 assets): SPY, VGK, EWJ, EEM, VNQ, RWX, IEF, TLT, DBC, GLD
# Canary: EEM, BND  (13612W momentum determines risky exposure)
# Signal:
#   1. Rank all 10 assets by 13612W momentum, select top 5 with positive momentum
#   2. Minimum variance weights using 13612W-weighted correlation + 1M volatility
#   3. Canary scales risky exposure:
#        both positive (p=1.0) → 100% risky
#        one positive  (p=0.5) → 50% risky + 50% IEF (or BIL if IEF negative)
#        none positive (p=0.0) → 100% IEF (or BIL if IEF negative)
# Source: Kipnis (2019), QuantStrat TradeR blog; combines DAA canary + AAA universe
# ---------------------------------------------------------------------------

_KDA_INVEST = ["SPY", "VGK", "EWJ", "EEM", "VNQ", "RWX", "IEF", "TLT", "DBC", "GLD"]
_KDA_CANARY = ["EEM", "BND"]
_KDA_TOP    = 5


def _kda_covariance(tickers, price_cache, signal_date):
    """
    Covariance matrix for KDA/AAA minimum variance optimization.
    Correlation: 13612W-weighted avg of 1M/3M/6M/12M daily return correlations.
    Volatility:  1M (last ~21 trading days) annualized std dev.
    """
    n = len(tickers)

    start_1m  = _eom_date(signal_date, 1)
    start_3m  = _eom_date(signal_date, 3)
    start_6m  = _eom_date(signal_date, 6)
    start_12m = _eom_date(signal_date, 12)

    ret_1m  = _build_aligned_returns(tickers, price_cache, start_1m,  signal_date)
    ret_3m  = _build_aligned_returns(tickers, price_cache, start_3m,  signal_date)
    ret_6m  = _build_aligned_returns(tickers, price_cache, start_6m,  signal_date)
    ret_12m = _build_aligned_returns(tickers, price_cache, start_12m, signal_date)

    # 13612W-weighted correlation (weights 12/4/2/1, total 19)
    corr = _psd_clip(
        (12 * _safe_corrcoef(ret_1m, n)
         + 4 * _safe_corrcoef(ret_3m, n)
         + 2 * _safe_corrcoef(ret_6m, n)
         +     _safe_corrcoef(ret_12m, n)) / 19
    )

    # 1M annualized volatility
    vols = np.full(n, 0.15)  # 15% default if data unavailable
    if ret_1m is not None and ret_1m.shape[0] >= 5:
        for i in range(n):
            v = np.std(ret_1m[:, i], ddof=1) * np.sqrt(252)
            if v > 0:
                vols[i] = v

    return np.outer(vols, vols) * corr


def kda(target_month, price_cache):
    sd = _signal_date(target_month)

    # Step 1: Canary check — determines risky exposure level
    canary_moms    = {t: _mom_13612w(price_cache, t, sd) for t in _KDA_CANARY}
    n_pos_canary   = sum(1 for m in canary_moms.values() if m is not None and m > 0)
    p_aggressive   = n_pos_canary / len(_KDA_CANARY)  # 0.0, 0.5, or 1.0
    p_cp           = 1.0 - p_aggressive

    # Step 2: Momentum for all investment assets
    inv_moms = {t: _mom_13612w(price_cache, t, sd) for t in _KDA_INVEST}

    # Step 3: Select top KDA_TOP assets with positive 13612W momentum
    positive = {t: m for t, m in inv_moms.items() if m is not None and m > 0}
    selected = sorted(positive, key=positive.get, reverse=True)[:_KDA_TOP]

    if not selected:
        # No qualifying assets — park in IEF or BIL
        ief_mom = inv_moms.get("IEF")
        cp_dest = "IEF" if (ief_mom is not None and ief_mom > 0) else "BIL"
        return {cp_dest: 1.0}

    if len(selected) == 1:
        risky_weights = {selected[0]: 1.0}
    else:
        # Step 4: Minimum variance weights for selected assets
        cov = _kda_covariance(selected, price_cache, sd)
        risky_weights = _min_var_weights(selected, cov)

    # Step 5: Apply canary scaling
    result = {t: round(w * p_aggressive, 6) for t, w in risky_weights.items()}

    if p_cp > 0:
        ief_mom = inv_moms.get("IEF")
        cp_dest = "IEF" if (ief_mom is not None and ief_mom > 0) else "BIL"
        result[cp_dest] = round(result.get(cp_dest, 0.0) + p_cp, 6)

    return {t: w for t, w in result.items() if w > 1e-4}


# ---------------------------------------------------------------------------
# AAA — Adaptive Asset Allocation
#
# Universe (10 assets): SPY, VGK, EWJ, EEM, VNQ, RWX, IEF, TLT, DBC, GLD
# Signal:
#   1. Rank all 10 assets by 6-month return, select top 5
#   2. Minimum variance weights using 126-day (6M) correlation + 20-day (1M) volatility
#   No crash protection — always fully invested in top 5
# Source: Butler et al., ReSolve Asset Management (2012), SSRN 2328254
# ---------------------------------------------------------------------------

_AAA_UNIVERSE = _KDA_INVEST
_AAA_TOP      = 5


def aaa(target_month, price_cache):
    sd = _signal_date(target_month)

    # Step 1: 6-month return for all assets — rank and take top 5
    moms_6m = {}
    for t in _AAA_UNIVERSE:
        data = price_cache.get(t, [])
        moms_6m[t] = n_month_return(data, sd, 6) if data else None

    ranked = sorted(
        (t for t in _AAA_UNIVERSE if moms_6m[t] is not None),
        key=lambda t: moms_6m[t],
        reverse=True,
    )[:_AAA_TOP]

    if not ranked:
        return None

    if len(ranked) == 1:
        return {ranked[0]: 1.0}

    # Step 2: Covariance using 126-day correlation + 20-day volatility
    start_20d  = _eom_date(sd, 1)   # ~20 trading days back
    start_126d = _eom_date(sd, 6)   # ~126 trading days back

    n       = len(ranked)
    ret_20d  = _build_aligned_returns(ranked, price_cache, start_20d,  sd)
    ret_126d = _build_aligned_returns(ranked, price_cache, start_126d, sd)

    corr = _psd_clip(_safe_corrcoef(ret_126d, n))

    vols = np.full(n, 0.15)
    if ret_20d is not None and ret_20d.shape[0] >= 5:
        for i in range(n):
            v = np.std(ret_20d[:, i], ddof=1) * np.sqrt(252)
            if v > 0:
                vols[i] = v

    cov = np.outer(vols, vols) * corr

    return _min_var_weights(ranked, cov)
