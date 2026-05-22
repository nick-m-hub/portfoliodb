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
  Tactical Permanent: GestaltU — 200-day MA filter, 1/vol risk parity, 7% vol target
  Three-Way Model: Ned Davis / Meb Faber — mebfaber.com/2015/06/16/three-way-model/
  Paired Switching: Lewis A. Glenn, SSRN 2437049
  Quint Switching Filtered: Lewis A. Glenn, SSRN 3129098
  Trend Following Bonds: Paul Novell, investingforaliving.us
  Stoken ACA: Dick Stoken, "Survival of the Fittest for Investors" (McGraw-Hill, 2012)
  Trend is Our Friend — Global: Clare, Seaton, Smith & Thomas (SSRN 2126478)
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
    # Trend is Our Friend — Global (SPY, EEM, IEF, VNQ, BIL already above)
    "BWX", "DBC", "RWO",
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
# Universe: SPY (stocks), IEF (bonds), GLD (gold)
# Cash: BIL
#
# Rule (GestaltU / PortfolioDB implementation):
#   1. Select assets whose price is above their 200-day MA (signal date).
#      If none qualify → 100% BIL.
#   2. Assign 1/vol risk-parity weights using 21-day annualized daily volatility.
#   3. Compute portfolio annualized volatility via 60-day daily covariance matrix.
#      If portfolio vol > 7% → scale risky weights down by (7% / port_vol),
#      putting the remainder in BIL.
#      If portfolio vol ≤ 7% → hold as-is (no leverage).
# ---------------------------------------------------------------------------

def _above_200dma(price_data, signal_date):
    """True if the close on signal_date is >= the 200-day MA. None if insufficient data."""
    cutoff = signal_date.isoformat()
    prices = [row["adjusted_close"] for row in price_data if row["date"] <= cutoff]
    if len(prices) < 200:
        return None
    return prices[-1] >= sum(prices[-200:]) / 200


def _daily_returns_n(price_data, signal_date, n_days):
    """Return a list of n_days daily returns (as decimals) ending at signal_date.
    Returns None if there is insufficient price history."""
    cutoff = signal_date.isoformat()
    prices = [row["adjusted_close"] for row in price_data if row["date"] <= cutoff]
    if len(prices) < n_days + 1:
        return None
    prices = prices[-(n_days + 1):]
    return [prices[i] / prices[i - 1] - 1 for i in range(1, len(prices))]


def _portfolio_annualized_vol(weights_dict, price_cache, signal_date, n_days=60):
    """Annualized portfolio volatility via n_days daily-returns covariance matrix."""
    tickers = list(weights_dict.keys())
    n = len(tickers)

    returns = []
    for t in tickers:
        rets = _daily_returns_n(price_cache.get(t, []), signal_date, n_days)
        if rets is None:
            return None
        returns.append(rets)

    n_obs = len(returns[0])
    if n_obs < 2:
        return None

    means = [sum(returns[i]) / n_obs for i in range(n)]

    cov = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            cov[i][j] = (
                sum((returns[i][k] - means[i]) * (returns[j][k] - means[j])
                    for k in range(n_obs))
                / (n_obs - 1)
            ) * 252  # annualise

    w = [weights_dict[t] for t in tickers]
    port_var = sum(w[i] * w[j] * cov[i][j] for i in range(n) for j in range(n))
    return max(port_var, 0.0) ** 0.5


def tactical_permanent(target_month, price_cache):
    sd = _signal_date(target_month)

    # Step 1: 200-day MA filter
    selected = []
    for ticker in ["SPY", "IEF", "GLD"]:
        data = price_cache.get(ticker, [])
        above = _above_200dma(data, sd)
        if above is None:
            return None  # insufficient history
        if above:
            selected.append(ticker)

    if not selected:
        return {"BIL": 1.0}

    # Step 2: 1/vol risk-parity weights (21-day annualised vol)
    inv_vols = {}
    for ticker in selected:
        rets = _daily_returns_n(price_cache.get(ticker, []), sd, 21)
        if rets is None or len(rets) < 2:
            return None
        n = len(rets)
        mean = sum(rets) / n
        sample_var = sum((r - mean) ** 2 for r in rets) / (n - 1)
        vol = (sample_var ** 0.5) * (252 ** 0.5)
        if vol == 0:
            return None
        inv_vols[ticker] = 1.0 / vol

    total_inv = sum(inv_vols.values())
    risky_weights = {t: inv_vols[t] / total_inv for t in selected}

    # Step 3: portfolio vol scaling (60-day covariance)
    port_vol = _portfolio_annualized_vol(risky_weights, price_cache, sd)
    if port_vol is None:
        return None

    if port_vol <= 0.07:
        # Below target vol — hold risk-parity weights as-is, no leverage
        return {t: round(w, 6) for t, w in risky_weights.items()}

    # Above 7% — scale down to 7%, remainder to BIL
    scale = 0.07 / port_vol
    result = {t: round(w * scale, 8) for t, w in risky_weights.items()}
    cash = round(1.0 - sum(result.values()), 8)
    if cash > 1e-9:
        result["BIL"] = cash
    return {t: round(w, 6) for t, w in result.items()}


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


# ---------------------------------------------------------------------------
# The Trend is Our Friend — Global (Risk-Parity Variant)
# Clare, Seaton, Smith & Thomas (SSRN 2126478)
#
# Universe: SPY, EEM, IEF, BWX, DBC, VNQ, RWO (7 global asset classes)
# Cash: BIL
#
# Each asset receives an inverse-volatility weight based on the standard
# deviation of its 12 trailing monthly returns. Assets whose price is below
# their 10-month SMA are excluded from the risky portfolio — their weight
# is redirected to BIL.
# ---------------------------------------------------------------------------

_TTIOF_UNIVERSE = ["SPY", "EEM", "IEF", "BWX", "DBC", "VNQ", "RWO"]
_TTIOF_CASH     = "BIL"


def _calc_monthly_returns(price_data, signal_date, n_months):
    """
    Return a list of n_months consecutive monthly returns ending at signal_date's month.
    Returns None if any month-end price is missing.
    """
    returns = []
    for i in range(n_months):
        end_month = signal_date.month - i
        end_year  = signal_date.year
        while end_month <= 0:
            end_month += 12
            end_year  -= 1

        start_month = end_month - 1
        start_year  = end_year
        if start_month <= 0:
            start_month += 12
            start_year  -= 1

        end_price   = _month_end_price(price_data, end_year,   end_month)
        start_price = _month_end_price(price_data, start_year, start_month)

        if end_price is None or start_price is None or start_price == 0:
            return None
        returns.append((end_price / start_price - 1) * 100)
    return returns


def trend_is_our_friend_global(target_month, price_cache):
    sd = _signal_date(target_month)

    # Step 1: compute inverse-volatility weights from 12M rolling std of monthly returns
    inv_vols = {}
    for ticker in _TTIOF_UNIVERSE:
        data    = price_cache.get(ticker, [])
        monthly = _calc_monthly_returns(data, sd, 12)
        if monthly is None:
            return None  # insufficient history for this asset

        n    = len(monthly)
        mean = sum(monthly) / n
        vol  = (sum((r - mean) ** 2 for r in monthly) / n) ** 0.5
        inv_vols[ticker] = (1.0 / vol) if vol > 0 else 0.0

    total_inv_vol = sum(inv_vols.values())
    if total_inv_vol == 0:
        return None

    base_weights = {t: inv_vols[t] / total_inv_vol for t in _TTIOF_UNIVERSE}

    # Step 2: apply 10-month SMA filter — failed assets move weight to BIL
    combined = {}
    for ticker in _TTIOF_UNIVERSE:
        data  = price_cache.get(ticker, [])
        above = _above_sma(data, sd, periods=10)
        if above is None:
            return None
        out = ticker if above else _TTIOF_CASH
        combined[out] = round(combined.get(out, 0.0) + base_weights[ticker], 8)

    return {t: round(w, 6) for t, w in combined.items()}
