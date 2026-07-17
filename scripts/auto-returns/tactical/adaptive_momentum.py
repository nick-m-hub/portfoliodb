"""
Signal rules for the Adaptive Momentum family — momentum-ranked selection from a
global asset universe, sized by a configurable weighting scheme.

Each function receives:
  target_month  — date, first day of the month the holdings are IN EFFECT
  price_cache   — dict {ticker: [price_data]} covering ~13 months of history

Each function returns:
  dict {ticker: weight}  e.g. {"SPY": 0.47, "QQQ": 0.31, "EEM": 0.21}
  or None if price data is insufficient to calculate a signal.

Signal date = last calendar day of the prior month.

Selection method — "weighted average of rank orders" (Portfolio Visualizer
Adaptive Allocation Model): for each momentum lookback window, rank every asset
in the universe by its return (best = rank 1); combine the ranks as a weighted
average; hold the N assets with the lowest (best) weighted rank. This ranks on
relative order rather than raw return magnitude, so one outlier window can't
dominate the blend.

This model holds the top 3 at all times (no cash/absolute-momentum filter) —
defensive assets (TLT, IEF, GLD) enter the mix on their own momentum during
risk-off periods rather than via a switch to cash.

Weighting schemes (the distinguishing feature across the family):
  volatility_weighted_global_momentum — inverse-volatility (this file)
  (future siblings: equal-weighted, minimum-variance, ... reuse _weighted_rank_selection)
"""

from calendar import monthrange
from datetime import date, timedelta

from utils import n_month_return

# ---------------------------------------------------------------------------
# Strategy configuration
# ---------------------------------------------------------------------------

# 8 global asset classes (match the tickers in the Supabase allocations table)
UNIVERSE = ["SPY", "QQQ", "EFA", "EEM", "XLE", "GLD", "TLT", "IEF"]

# Momentum lookback windows and their weights in the rank blend (sum to 1.0).
# 1mo 20%, 3mo 40%, 6mo 30%, 12mo 10% — front/intermediate weighted.
MOMENTUM_WEIGHTS = [(1, 0.20), (3, 0.40), (6, 0.30), (12, 0.10)]

# Number of top-ranked assets to hold.
N_HOLD = 3

# Volatility lookback for inverse-vol weighting: 4 calendar months of daily data.
VOL_WINDOW_MONTHS = 4

# All tickers this module needs — stage0_signals.py unions these into the fetch list
ALL_TICKERS = list(UNIVERSE)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _signal_date(target_month):
    """Last calendar day of the prior month — the date we calculate signals from."""
    return target_month - timedelta(days=1)


def _weighted_rank_selection(universe, momentum_weights, n_hold, signal_date, price_cache):
    """
    Select the n_hold assets with the best weighted-average rank across the
    momentum windows. For each window every asset is ranked by return (best = 1);
    ranks are combined by the window weights; the lowest combined ranks win.
    Ties broken by ticker for determinism.
    Returns a list of tickers, or None if any asset lacks a return for any window.
    """
    period_returns = {}
    for period, _w in momentum_weights:
        rets = {}
        for t in universe:
            r = n_month_return(price_cache.get(t, []), signal_date, period)
            if r is None:
                return None  # incomplete history — skip the whole portfolio
            rets[t] = r
        period_returns[period] = rets

    weighted_rank = {t: 0.0 for t in universe}
    for period, w in momentum_weights:
        rets = period_returns[period]
        # Best return first; ties broken by ticker so ranks are deterministic.
        ordered = sorted(universe, key=lambda t: (-rets[t], t))
        for rank, t in enumerate(ordered, start=1):
            weighted_rank[t] += w * rank

    return sorted(universe, key=lambda t: (weighted_rank[t], t))[:n_hold]


def _daily_returns_months(price_data, signal_date, n_months):
    """
    Daily returns (as decimals) over the trailing n_months calendar months
    ending on signal_date. Returns None if fewer than ~15 observations exist.
    """
    month = signal_date.month - n_months
    year = signal_date.year
    while month <= 0:
        month += 12
        year -= 1
    start = date(year, month, monthrange(year, month)[1])

    lo, hi = start.isoformat(), signal_date.isoformat()
    prices = [row["adjusted_close"] for row in price_data if lo <= row["date"] <= hi]
    if len(prices) < 15:  # need a meaningful sample for a stable vol estimate
        return None
    return [prices[i] / prices[i - 1] - 1 for i in range(1, len(prices))]


def _inverse_vol_weights(tickers, signal_date, price_cache, n_months):
    """
    Weight each ticker in inverse proportion to the standard deviation of its
    daily returns over the trailing n_months. Normalised to sum to 1.0.
    Returns None if any ticker lacks sufficient daily history.
    """
    inv = {}
    for t in tickers:
        rets = _daily_returns_months(price_cache.get(t, []), signal_date, n_months)
        if rets is None:
            return None
        n = len(rets)
        mean = sum(rets) / n
        var = sum((r - mean) ** 2 for r in rets) / (n - 1)  # sample variance
        vol = var ** 0.5
        inv[t] = (1.0 / vol) if vol > 0 else 0.0

    total = sum(inv.values())
    if total == 0:
        return None
    return {t: inv[t] / total for t in tickers}


# ---------------------------------------------------------------------------
# Volatility-Weighted Global Momentum Portfolio
#
# Universe: SPY, QQQ, EFA, EEM, XLE, GLD, TLT, IEF (8 global assets)
# Selection: hold top 3 by weighted-average rank (1mo 20%, 3mo 40%, 6mo 30%, 12mo 10%)
# Weighting: inverse volatility over the trailing 4 months of daily returns
# ---------------------------------------------------------------------------

def volatility_weighted_global_momentum(target_month, price_cache):
    sd = _signal_date(target_month)
    selected = _weighted_rank_selection(UNIVERSE, MOMENTUM_WEIGHTS, N_HOLD, sd, price_cache)
    if selected is None:
        return None
    weights = _inverse_vol_weights(selected, sd, price_cache, VOL_WINDOW_MONTHS)
    if weights is None:
        return None
    return {t: round(w, 6) for t, w in weights.items()}
