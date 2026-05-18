"""
Signal rules for the simple rules-based tactical portfolio family.

Each function receives:
  target_month  — date, first day of the month the holdings are IN EFFECT
  price_cache   — dict {ticker: [price_data]} covering ~13 months of history

Each function returns:
  dict {ticker: weight}  e.g. {"SPY": 0.50, "BIL": 0.50}
  or None if price data is insufficient to calculate a signal.

stoken_aca() accepts an optional third argument:
  prior_holdings — dict {ticker: weight} from last month's tactical_monthly_holdings,
                   used to resolve the "between channels" state. If None, defaults
                   to the defensive asset for each sleeve.

Signal date = last calendar day of the prior month.

Sources:
  Tactical Permanent: Harry Browne (1981) + Faber 10-month SMA overlay
  Three-Way Model: Ned Davis / Meb Faber — mebfaber.com/2015/06/16/three-way-model/
  Paired Switching: Lewis A. Glenn, SSRN 2437049
  Quint Switching Filtered: Lewis A. Glenn, SSRN 3129098
  Trend Following Bonds: Paul Novell, investingforaliving.us
  Stoken ACA: Dick Stoken, "Survival of the Fittest for Investors" (McGraw-Hill, 2012)
"""

from calendar import monthrange
from datetime import date, timedelta

from utils import get_last_trading_day_price, n_month_return

# ---------------------------------------------------------------------------
# All tickers required by this module.
# stage0_signals.py unions these across all modules to build the fetch list.
# ---------------------------------------------------------------------------

ALL_TICKERS = list({
    # Tactical Permanent + Three-Way + Paired Switching core
    "SPY", "TLT", "GLD", "BIL",
    # Quint Switching Filtered
    "QQQ", "EFA", "EEM", "IEF",
    # Trend Following Bonds universe
    "SHY", "TIP", "LQD", "HYG", "BNDX", "EMB",
    # Stoken ACA (SPY, GLD, IEF, TLT already above)
    "VNQ",
})


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _signal_date(target_month):
    """Last calendar day of the prior month — the date we calculate signals from."""
    return target_month - timedelta(days=1)


def _month_end_price(price_data, year, month):
    """Adjusted close on the last trading day of the given year/month."""
    last_day = monthrange(year, month)[1]
    return get_last_trading_day_price(price_data, date(year, month, last_day))


def _calc_sma(price_data, signal_date, periods):
    """
    Average of the last N month-end closes, starting from signal_date's month.
    Returns None if fewer than N prices are available.
    """
    prices = []
    for i in range(periods):
        month = signal_date.month - i
        year = signal_date.year
        while month <= 0:
            month += 12
            year -= 1
        price = _month_end_price(price_data, year, month)
        if price is not None:
            prices.append(price)
    if len(prices) < periods:
        return None
    return sum(prices) / len(prices)


def _above_sma(price_data, signal_date, periods=10):
    """
    True if the close on signal_date is >= the N-month SMA.
    Returns None if there is insufficient price history.
    """
    sma = _calc_sma(price_data, signal_date, periods)
    if sma is None:
        return None
    current = get_last_trading_day_price(price_data, signal_date)
    if current is None:
        return None
    return current >= sma


def _channel_extreme(price_data, signal_date, n_months, fn):
    """
    Apply fn (max or min) over the N months PRIOR TO signal_date's month.
    Used for Stoken's price channel: compares today's price to the prior channel.
    Returns None if any of the N months has no price data.
    """
    prices = []
    for i in range(1, n_months + 1):
        month = signal_date.month - i
        year = signal_date.year
        while month <= 0:
            month += 12
            year -= 1
        price = _month_end_price(price_data, year, month)
        if price is None:
            return None
        prices.append(price)
    return fn(prices)


# ---------------------------------------------------------------------------
# Tactical Permanent Portfolio
#
# Universe: SPY (stocks), TLT (bonds), GLD (gold), BIL (cash)
# Rule: each of SPY/TLT/GLD is held at 25% if above its 10-month SMA;
#       otherwise that 25% moves to BIL. The cash sleeve is always BIL.
# ---------------------------------------------------------------------------

def tactical_permanent(target_month, price_cache):
    sd = _signal_date(target_month)
    combined = {"BIL": 0.25}  # cash sleeve is always BIL

    for ticker in ["SPY", "TLT", "GLD"]:
        data = price_cache.get(ticker, [])
        above = _above_sma(data, sd, periods=10)
        out = ticker if (above is True) else "BIL"
        combined[out] = round(combined.get(out, 0.0) + 0.25, 8)

    return {t: round(w, 6) for t, w in combined.items()}


# ---------------------------------------------------------------------------
# Three-Way Model (Ned Davis / Meb Faber)
#
# Universe: SPY (US stocks), TLT (long bonds), GLD (gold)
# Rule: hold each asset at equal weight if its 3-month SMA > 10-month SMA.
#       If none pass the filter, hold 100% BIL.
# ---------------------------------------------------------------------------

def three_way_model(target_month, price_cache):
    sd = _signal_date(target_month)
    passing = []

    for ticker in ["SPY", "TLT", "GLD"]:
        data = price_cache.get(ticker, [])
        sma3  = _calc_sma(data, sd, 3)
        sma10 = _calc_sma(data, sd, 10)
        if sma3 is not None and sma10 is not None and sma3 > sma10:
            passing.append(ticker)

    if not passing:
        return {"BIL": 1.0}

    w = round(1.0 / len(passing), 8)
    return {t: round(w, 6) for t in passing}


# ---------------------------------------------------------------------------
# Paired Switching (Lewis A. Glenn, SSRN 2437049)
#
# Universe: SPY (US stocks), TLT (long bonds)
# Rule: hold whichever had the higher 3-month return. Always 100% in one.
# ---------------------------------------------------------------------------

def paired_switching(target_month, price_cache):
    sd = _signal_date(target_month)
    spy = n_month_return(price_cache.get("SPY", []), sd, 3)
    tlt = n_month_return(price_cache.get("TLT", []), sd, 3)

    if spy is None or tlt is None:
        return None

    return {"SPY": 1.0} if spy >= tlt else {"TLT": 1.0}


# ---------------------------------------------------------------------------
# Quint Switching Filtered (Lewis A. Glenn, SSRN 3129098)
#
# Universe: SPY, QQQ, EFA, EEM, TLT (5 risk assets); IEF (defensive)
# Rule: all 5 risk assets must have a positive 3-month return.
#       If yes → hold the single best-performer at 100%.
#       If any one is negative (or zero) → 100% IEF.
# ---------------------------------------------------------------------------

_QUINT_UNIVERSE  = ["SPY", "QQQ", "EFA", "EEM", "TLT"]
_QUINT_DEFENSIVE = "IEF"


def quint_switching(target_month, price_cache):
    sd = _signal_date(target_month)
    returns = {}

    for ticker in _QUINT_UNIVERSE:
        r = n_month_return(price_cache.get(ticker, []), sd, 3)
        if r is None:
            return None  # insufficient data for this ticker
        returns[ticker] = r

    if any(r <= 0 for r in returns.values()):
        return {_QUINT_DEFENSIVE: 1.0}

    winner = max(returns, key=returns.get)
    return {winner: 1.0}


# ---------------------------------------------------------------------------
# Trend Following Bonds (Paul Novell, investingforaliving.us)
#
# Universe: SHY, IEF, TLT, TIP, LQD, HYG, BNDX, EMB (8 global bond ETFs)
# Rule: rank all 8 by 6-month return. Select the top 3.
#       Only hold a selected asset if its 6M return is positive AND exceeds BIL.
#       Equal weight among qualifiers. If none qualify, hold 100% BIL.
# ---------------------------------------------------------------------------

_TFB_UNIVERSE = ["SHY", "IEF", "TLT", "TIP", "LQD", "HYG", "BNDX", "EMB"]
_TFB_TOP_N    = 3
_TFB_CASH     = "BIL"


def trend_following_bonds(target_month, price_cache):
    sd = _signal_date(target_month)

    bil_ret = n_month_return(price_cache.get(_TFB_CASH, []), sd, 6)
    if bil_ret is None:
        bil_ret = 0.0  # treat as zero if BIL data unavailable

    scores = []
    for ticker in _TFB_UNIVERSE:
        r = n_month_return(price_cache.get(ticker, []), sd, 6)
        if r is not None:
            scores.append((ticker, r))

    scores.sort(key=lambda x: -x[1])

    qualified = [
        (t, r) for t, r in scores[:_TFB_TOP_N]
        if r > 0 and r > bil_ret
    ]

    if not qualified:
        return {_TFB_CASH: 1.0}

    w = round(1.0 / len(qualified), 8)
    return {t: round(w, 6) for t, _ in qualified}


# ---------------------------------------------------------------------------
# Stoken's Active Combined Asset (Dick Stoken, 2012)
#
# Structure: 3 equal sleeves (1/3 each), each with a risk/defensive pair.
#   Sleeve 1 — SPY / IEF   upper = 6M high,  lower = 12M low
#   Sleeve 2 — GLD / TLT   upper = 12M high, lower = 6M low  (inverted)
#   Sleeve 3 — VNQ / IEF   upper = 6M high,  lower = 12M low
#
# Per-sleeve rule (monthly, evaluated at signal date):
#   current_price > prior-N-month high → hold risk asset
#   current_price < prior-N-month low  → hold defensive asset
#   between channels                   → hold prior position (default: defensive)
#
# prior_holdings: optional dict {ticker: weight} from last month's
#   tactical_monthly_holdings. Passed by stage0_signals.py. If None (first run),
#   all sleeves default to their defensive asset.
# ---------------------------------------------------------------------------

_STOKEN_SLEEVES = [
    # (risk_ticker, defensive_ticker, upper_months, lower_months)
    ("SPY", "IEF",  6, 12),
    ("GLD", "TLT", 12,  6),
    ("VNQ", "IEF",  6, 12),
]


def stoken_aca(target_month, price_cache, prior_holdings=None):
    sd = _signal_date(target_month)
    sleeve_weight = round(1.0 / 3, 8)
    combined = {}

    for risk, defensive, upper_months, lower_months in _STOKEN_SLEEVES:
        data    = price_cache.get(risk, [])
        current = get_last_trading_day_price(data, sd)
        upper   = _channel_extreme(data, sd, upper_months, max)
        lower   = _channel_extreme(data, sd, lower_months, min)

        if current is None or upper is None or lower is None:
            out = defensive  # insufficient data — go defensive
        elif current > upper:
            out = risk
        elif current < lower:
            out = defensive
        else:
            # Between channels — maintain prior position
            out = risk if (prior_holdings or {}).get(risk, 0) > 0 else defensive

        combined[out] = round(combined.get(out, 0.0) + sleeve_weight, 8)

    return {t: round(w, 6) for t, w in combined.items()}
