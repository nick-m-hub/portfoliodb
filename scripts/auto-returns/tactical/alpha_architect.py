"""
Signal rules for the Alpha Architect Robust Asset Allocation (RAA) family.

Each function receives:
  target_month  — date, first day of the month the holdings are IN EFFECT
  price_cache   — dict {ticker: [price_data]} covering ~13 months of history

Each function returns:
  dict {ticker: weight}  e.g. {"MTUM": 0.20, "BIL": 0.30, ...}
  or None if price data is insufficient to calculate a signal.

Signal date = last calendar day of the prior month.

Sources:
  Gray & Vogel, "The Robust Asset Allocation (RAA) Index" (Alpha Architect, 2017)
  https://alphaarchitect.com/the-robust-asset-allocation-raa-index/

  Framework:
    Each asset is evaluated against TWO independent signals:
      TMOM: 12-month excess return vs BIL > 0  →  positive
      MA:   current price > 10-month SMA       →  positive

    Graduated allocation based on signal count:
      Both positive  → 100% of base weight to the asset
      One positive   →  50% of base weight to the asset + 50% to BIL
      Neither        →   0% to the asset + 100% of base weight to BIL

  Variants differ only in base weights:
    RAA Aggressive: 80% equity / 10% real assets / 10% bonds
    RAA Balanced:   40% equity / 40% real assets / 20% bonds
"""

from calendar import monthrange
from datetime import date, timedelta

from utils import get_last_trading_day_price, n_month_return

# ---------------------------------------------------------------------------
# Base weights (fully-invested target allocations, before signal adjustment)
# ---------------------------------------------------------------------------

RAA_AGGRESSIVE_WEIGHTS = {
    "MTUM": 0.20,   # US Equity Momentum
    "IWD":  0.20,   # US Large Cap Value
    "EFV":  0.20,   # International Equity Value
    "EFA":  0.20,   # International Developed
    "VNQ":  0.05,   # Real Assets — REITs
    "DBC":  0.05,   # Real Assets — Commodities
    "IEF":  0.10,   # Bonds — US 10yr Treasuries
}

RAA_BALANCED_WEIGHTS = {
    "MTUM": 0.10,   # US Equity Momentum
    "IWD":  0.10,   # US Large Cap Value
    "EFV":  0.10,   # International Equity Value
    "EFA":  0.10,   # International Developed
    "VNQ":  0.20,   # Real Assets — REITs
    "DBC":  0.20,   # Real Assets — Commodities
    "IEF":  0.20,   # Bonds — US 10yr Treasuries
}

CASH = "BIL"

# All tickers this module needs — stage0_signals.py unions these into the fetch list
ALL_TICKERS = list(set(RAA_AGGRESSIVE_WEIGHTS) | set(RAA_BALANCED_WEIGHTS) | {CASH})


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
    return prices[0] >= sma  # True if current price >= SMA


def _tmom_positive(price_cache, ticker, signal_date):
    """
    Trend momentum signal: True if the ticker's 12-month return exceeds BIL's 12-month return.
    Positive excess return vs cash = positive absolute momentum.
    Returns None if either return is unavailable.
    """
    asset_ret = n_month_return(price_cache.get(ticker, []), signal_date, 12)
    bil_ret   = n_month_return(price_cache.get(CASH, []), signal_date, 12)
    if asset_ret is None or bil_ret is None:
        return None
    return asset_ret > bil_ret


def _dual_signal_allocation(weights, signal_date, price_cache):
    """
    Apply the RAA dual-signal graduated allocation to a base weight dict.

    For each asset in the weight dict:
      Both signals positive  → 100% of base weight allocated to the asset
      One signal positive    →  50% of base weight to asset, 50% to BIL
      Neither signal         →   0% to asset, 100% of base weight to BIL

    Signals are treated as negative (defensive) when data is unavailable.
    Multiple assets' BIL contributions accumulate into a single BIL position.
    """
    combined = {}

    for ticker, base_weight in weights.items():
        tmom = _tmom_positive(price_cache, ticker, signal_date)
        ma   = _above_sma(price_cache.get(ticker, []), signal_date)

        # Count positive signals; None treated as negative (defensive)
        signals_positive = (1 if tmom is True else 0) + (1 if ma is True else 0)

        if signals_positive == 2:
            asset_alloc = base_weight
            bil_alloc   = 0.0
        elif signals_positive == 1:
            asset_alloc = base_weight * 0.5
            bil_alloc   = base_weight * 0.5
        else:
            asset_alloc = 0.0
            bil_alloc   = base_weight

        if asset_alloc > 0:
            combined[ticker] = round(combined.get(ticker, 0.0) + asset_alloc, 8)
        if bil_alloc > 0:
            combined[CASH] = round(combined.get(CASH, 0.0) + bil_alloc, 8)

    return {t: round(w, 6) for t, w in combined.items()}


# ---------------------------------------------------------------------------
# RAA Aggressive
#
# Base: 80% equity (MTUM/IWD/EFV/EFA at 20% each)
#       10% real assets (VNQ/DBC at 5% each)
#       10% bonds (IEF)
# ---------------------------------------------------------------------------

def raa_aggressive(target_month, price_cache):
    sd = _signal_date(target_month)
    return _dual_signal_allocation(RAA_AGGRESSIVE_WEIGHTS, sd, price_cache)


# ---------------------------------------------------------------------------
# RAA Balanced
#
# Base: 40% equity (MTUM/IWD/EFV/EFA at 10% each)
#       40% real assets (VNQ/DBC at 20% each)
#       20% bonds (IEF)
# ---------------------------------------------------------------------------

def raa_balanced(target_month, price_cache):
    sd = _signal_date(target_month)
    return _dual_signal_allocation(RAA_BALANCED_WEIGHTS, sd, price_cache)
