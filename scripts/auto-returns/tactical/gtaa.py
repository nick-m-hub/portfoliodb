"""
Signal rules for the Meb Faber GTAA portfolio family.

Each function receives:
  target_month  — date, first day of the month the holdings are IN EFFECT
  price_cache   — dict {ticker: [price_data]} covering ~13 months of history

Each function returns:
  dict {ticker: weight}  e.g. {"SPY": 0.20, "BIL": 0.80}
  or None if price data is insufficient to calculate a signal.

Signal date = last calendar day of the prior month.

Sources:
  Faber, "A Quantitative Approach to Tactical Asset Allocation" (2007, SSRN 962461)
  Ivy Timing / GTAA 5: hold each asset if price > 10-month SMA, else BIL
  GTAA 13: same SMA timing across 12-asset universe
  GTAA AGG 3/6: top N by composite momentum (1/3/6/12M avg) + SMA filter
  Ivy Rotation: top 1 by composite momentum (3/6/12M avg), no SMA filter
"""

from calendar import monthrange
from datetime import date, timedelta

from utils import get_last_trading_day_price, n_month_return

# ---------------------------------------------------------------------------
# Asset universes (match the tickers in the Supabase allocations table)
# ---------------------------------------------------------------------------

IVY_UNIVERSE       = ["VTI", "VEU", "VNQ", "AGG", "DBC"]
GTAA5_UNIVERSE     = ["SPY", "EFA", "IEF", "VNQ", "DBC"]
GTAA13_UNIVERSE    = ["IWD", "MTUM", "IWN", "EFA", "EEM",
                      "IEF", "BWX", "LQD", "TLT", "DBC", "GLD", "VNQ"]
GTAA_AGG_UNIVERSE  = ["IWD", "MTUM", "IWN", "IWM", "EFA", "EEM",
                      "IEF", "BWX", "LQD", "TLT", "DBC", "GLD", "VNQ"]

CASH = "BIL"  # safe haven for all timing strategies

# All tickers this module needs — stage0_signals.py unions these into the fetch list
ALL_TICKERS = list({CASH} | set(IVY_UNIVERSE) | set(GTAA5_UNIVERSE)
                         | set(GTAA13_UNIVERSE) | set(GTAA_AGG_UNIVERSE))


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _signal_date(target_month):
    """Last calendar day of the prior month — the date we calculate signals from."""
    return target_month - timedelta(days=1)


def _above_sma(price_data, signal_date, periods=10):
    """
    Return True if the price on signal_date is above its N-month simple moving average.
    SMA = average of the last N month-end adjusted close prices (including signal_date month).
    Returns None if there is insufficient price history.
    """
    prices = []
    for i in range(periods):
        month = signal_date.month - i
        year = signal_date.year
        while month <= 0:
            month += 12
            year -= 1
        last_day = monthrange(year, month)[1]
        month_end = date(year, month, last_day)
        price = get_last_trading_day_price(price_data, month_end)
        if price is not None:
            prices.append(price)

    if len(prices) < periods:
        return None  # not enough history

    sma = sum(prices) / len(prices)
    current_price = prices[0]  # most recent month-end
    return current_price >= sma


def _composite_score(price_cache, ticker, signal_date, periods):
    """
    Composite momentum score = simple average of returns over each period in `periods`.
    Skips any period where return data is unavailable.
    Returns None if no periods have data.
    """
    returns = [n_month_return(price_cache.get(ticker, []), signal_date, p)
               for p in periods]
    available = [r for r in returns if r is not None]
    if not available:
        return None
    return sum(available) / len(available)


def _sma_timing(universe, weight_each, target_month, price_cache):
    """
    Shared logic for pure SMA timing strategies (Ivy Timing, GTAA 5, GTAA 13).
    Each asset gets weight_each if above 10-month SMA; remaining weight goes to BIL.
    """
    sd = _signal_date(target_month)
    combined = {}

    for ticker in universe:
        data = price_cache.get(ticker, [])
        above = _above_sma(data, sd)

        if above is None:
            # Insufficient data — treat as below SMA (defensive)
            ticker_out = CASH
        elif above:
            ticker_out = ticker
        else:
            ticker_out = CASH

        combined[ticker_out] = round(combined.get(ticker_out, 0.0) + weight_each, 8)

    return {t: round(w, 6) for t, w in combined.items()}


def _momentum_rotation(universe, n_hold, momentum_periods, sma_filter,
                       target_month, price_cache):
    """
    Shared logic for momentum rotation strategies (GTAA AGG 3/6, Ivy Rotation).
    Ranks assets by composite momentum score, holds top n_hold.
    If sma_filter=True, any top asset below its 10-month SMA is replaced with BIL.
    """
    sd = _signal_date(target_month)
    weight_each = round(1.0 / n_hold, 8)

    # Score every asset in the universe
    scored = []
    for ticker in universe:
        score = _composite_score(price_cache, ticker, sd, momentum_periods)
        scored.append((ticker, score))

    # Sort descending by score; push None scores to the end
    scored.sort(key=lambda x: (x[1] is None, -(x[1] or 0)))
    top = scored[:n_hold]

    combined = {}
    for ticker, score in top:
        if score is None:
            # No data — go defensive
            out = CASH
        elif sma_filter:
            data = price_cache.get(ticker, [])
            above = _above_sma(data, sd)
            out = ticker if (above is True) else CASH
        else:
            out = ticker

        combined[out] = round(combined.get(out, 0.0) + weight_each, 8)

    return {t: round(w, 6) for t, w in combined.items()}


# ---------------------------------------------------------------------------
# Ivy Portfolio — Timing
#
# Universe: VTI, VEU, VNQ, AGG, DBC (5 assets, equal 20% weight)
# Rule: hold each asset if price > 10-month SMA; otherwise BIL
# ---------------------------------------------------------------------------

def ivy_timing(target_month, price_cache):
    return _sma_timing(IVY_UNIVERSE, 0.20, target_month, price_cache)


# ---------------------------------------------------------------------------
# Ivy Portfolio — Rotation
#
# Universe: VTI, VEU, VNQ, AGG, DBC (5 assets)
# Rule: hold the single asset with the highest 3/6/12M composite momentum score
# No SMA filter — always fully invested in top 1 asset
# ---------------------------------------------------------------------------

def ivy_rotation(target_month, price_cache):
    return _momentum_rotation(
        universe=IVY_UNIVERSE,
        n_hold=1,
        momentum_periods=[3, 6, 12],
        sma_filter=False,
        target_month=target_month,
        price_cache=price_cache,
    )


# ---------------------------------------------------------------------------
# GTAA 5
#
# Universe: SPY, EFA, IEF, VNQ, DBC (5 assets, equal 20% weight)
# Rule: identical to Ivy Timing but with a different asset universe
# ---------------------------------------------------------------------------

def gtaa5(target_month, price_cache):
    return _sma_timing(GTAA5_UNIVERSE, 0.20, target_month, price_cache)


# ---------------------------------------------------------------------------
# GTAA 13
#
# Universe: 12 risky assets (IWD, MTUM, IWN, EFA, EEM, IEF, BWX, LQD,
#           TLT, DBC, GLD, VNQ)
# Rule: hold each asset at equal weight if above 10-month SMA; else BIL
# Weight per asset = 1/12 ≈ 8.33%
# ---------------------------------------------------------------------------

def gtaa13(target_month, price_cache):
    weight_each = round(1.0 / len(GTAA13_UNIVERSE), 8)
    return _sma_timing(GTAA13_UNIVERSE, weight_each, target_month, price_cache)


# ---------------------------------------------------------------------------
# GTAA AGG 3
#
# Universe: same 13-asset universe as above (includes IWM)
# Rule: rank all 13 assets by composite momentum (avg of 1/3/6/12M returns)
#       Hold top 3 at 1/3 each; replace any below 10-month SMA with BIL
# ---------------------------------------------------------------------------

def gtaa_agg3(target_month, price_cache):
    return _momentum_rotation(
        universe=GTAA_AGG_UNIVERSE,
        n_hold=3,
        momentum_periods=[1, 3, 6, 12],
        sma_filter=True,
        target_month=target_month,
        price_cache=price_cache,
    )


# ---------------------------------------------------------------------------
# GTAA AGG 6
#
# Universe: same 13-asset universe
# Rule: same as AGG 3 but hold top 6 at 1/6 each
# ---------------------------------------------------------------------------

def gtaa_agg6(target_month, price_cache):
    return _momentum_rotation(
        universe=GTAA_AGG_UNIVERSE,
        n_hold=6,
        momentum_periods=[1, 3, 6, 12],
        sma_filter=True,
        target_month=target_month,
        price_cache=price_cache,
    )
