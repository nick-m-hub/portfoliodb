"""
One-off: calculate the corrected April 2026 return for tactical-permanent-portfolio.
Holdings (from tactical_monthly_holdings):
  IEF  72.383%
  GLD  12.5315%
  BIL  15.0855%
"""

import os
import time
from datetime import date

from dotenv import load_dotenv
from utils import DOTENV_PATH, fetch_ticker_prices, get_last_trading_day_price

load_dotenv(dotenv_path=DOTENV_PATH)
api_key = os.environ["EODHD_API_KEY"]

HOLDINGS = {
    "IEF": 0.72383,
    "GLD": 0.125315,
    "BIL": 0.150855,
}

# April return = price on last trading day of April / price on last trading day of March - 1
mar_end = date(2026, 3, 31)
apr_end = date(2026, 4, 30)

print("\nFetching prices...\n")

portfolio_return = 0.0
for ticker, weight in HOLDINGS.items():
    data = fetch_ticker_prices(ticker, date(2026, 3, 1), apr_end, api_key)
    p_start = get_last_trading_day_price(data, mar_end)
    p_end   = get_last_trading_day_price(data, apr_end)
    if p_start is None or p_end is None:
        print(f"  {ticker}: MISSING PRICE DATA")
        continue
    ticker_return = (p_end / p_start - 1) * 100
    contribution  = weight * ticker_return
    portfolio_return += contribution
    print(f"  {ticker:4s}  weight={weight:.4%}  mar_close={p_start:.4f}  apr_close={p_end:.4f}  return={ticker_return:+.4f}%  contrib={contribution:+.4f}%")
    time.sleep(0.1)

print(f"\n  Portfolio April return: {portfolio_return:+.4f}%")
print(f"\nSQL to fix the row:")
print(f"""
DELETE FROM monthly_returns
WHERE portfolio_slug = 'tactical-permanent-portfolio' AND date = '2026-04-01';

INSERT INTO monthly_returns (portfolio_slug, date, monthly_return)
VALUES ('tactical-permanent-portfolio', '2026-04-01', {round(portfolio_return, 4)});

REFRESH MATERIALIZED VIEW portfolio_stats;
""")
