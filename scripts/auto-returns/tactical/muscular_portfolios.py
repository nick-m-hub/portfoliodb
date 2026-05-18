"""
Signal rules for the Muscular Portfolios family (Brian Livingston).

Each function receives:
  target_month  — date, first day of the month the holdings are IN EFFECT
  price_cache   — dict {ticker: [price_data]} covering ~13 months of history

Each function returns:
  dict {ticker: weight}  e.g. {"SPY": 0.333333, "GLD": 0.333333, "TLT": 0.333334}
  or None if price data is insufficient to calculate a signal.

Signal date = last calendar day of the prior month.

Sources:
  Mama Bear: Brian Livingston, "Muscular Portfolios" (BenBella, 2018);
             based on Steve LeCompte / CXO Advisory momentum strategy (tracked since 2006)
  Papa Bear: Brian Livingston, "Muscular Portfolios" (BenBella, 2018);
             based on Mebane Faber's Ivy Portfolio concept (SSRN 962461)
"""

from datetime import timedelta

from utils import n_month_return

# ---------------------------------------------------------------------------
# Asset universes (match the tickers in the Supabase allocations table)
# ---------------------------------------------------------------------------

MAMA_BEAR_UNIVERSE = ["SPY", "IWM", "EFA", "EEM", "VNQ", "DBC", "GLD", "TLT", "BIL"]

PAPA_BEAR_UNIVERSE = ["IWF", "IWD", "IWO", "IWN", "EFA", "EEM",
                      "VNQ", "DBC", "GLD", "TLT", "IEF", "LQD", "BNDX", "BWX"]

ALL_TICKERS = list(set(MAMA_BEAR_UNIVERSE) | set(PAPA_BEAR_UNIVERSE))

_TOP_N = 3


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _signal_date(target_month):
    """Last calendar day of the prior month — the date we calculate signals from."""
    return target_month - timedelta(days=1)


def _ret(price_cache, ticker, signal_date, months):
    data = price_cache.get(ticker, [])
    if not data:
        return None
    return n_month_return(data, signal_date, months)


def _top_n_equal(scores, n):
    """
    Return the top N tickers by score as an equal-weighted dict.
    Tickers with None scores are excluded. Returns None if fewer than N
    tickers have valid scores (insufficient price data to form the portfolio).
    """
    valid = [(ticker, score) for ticker, score in scores.items() if score is not None]
    if len(valid) < n:
        return None
    valid.sort(key=lambda x: -x[1])
    weight = round(1.0 / n, 8)
    return {ticker: round(weight, 6) for ticker, _ in valid[:n]}


# ---------------------------------------------------------------------------
# Mama Bear (Brian Livingston / Steve LeCompte / CXO Advisory)
#
# Universe: 9 assets — SPY, IWM, EFA, EEM, VNQ, DBC, GLD, TLT, BIL
# Lookback: 5 months
# Rule: hold the 3 funds with the highest 5-month return, equal weight (1/3 each)
# BIL is included in the universe and acts as the defensive holding when
# risk assets are all falling — it wins the momentum race in a bear market.
# ---------------------------------------------------------------------------

def mama_bear(target_month, price_cache):
    sd = _signal_date(target_month)
    scores = {t: _ret(price_cache, t, sd, 5) for t in MAMA_BEAR_UNIVERSE}
    return _top_n_equal(scores, _TOP_N)


# ---------------------------------------------------------------------------
# Papa Bear (Brian Livingston / Mebane Faber)
#
# Universe: 14 assets — IWF, IWD, IWO, IWN, EFA, EEM, VNQ, DBC, GLD,
#                       TLT, IEF, LQD, BNDX, BWX
# Lookback: composite of 3, 6, and 12 months (simple average)
# Rule: hold the 3 funds with the highest composite score, equal weight (1/3 each)
# Unlike Mama Bear, cash is not in the universe — the portfolio is always
# invested in the top 3 risk assets regardless of absolute momentum.
# ---------------------------------------------------------------------------

def papa_bear(target_month, price_cache):
    sd = _signal_date(target_month)
    scores = {}
    for ticker in PAPA_BEAR_UNIVERSE:
        returns = [_ret(price_cache, ticker, sd, n) for n in [3, 6, 12]]
        available = [r for r in returns if r is not None]
        scores[ticker] = sum(available) / len(available) if available else None
    return _top_n_equal(scores, _TOP_N)
