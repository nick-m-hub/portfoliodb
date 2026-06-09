# Backtest Proxy Chain Reference
# Standing reference for all asset classes used in PortfolioDB backtests.
# When writing a new backfill script, look up each ETF here first.
#
# Legend:
#   CONFIRMED   — proxy already used and tested in an existing backfill script
#   APPROVED    — proxy approved by Nick, not yet used in a script; verify EODHD data on first use
#   CANDIDATE   — identified from public sources, not yet approved
#   FLOOR ONLY  — no proxy exists; ETF launch date is the data floor
#
# All transition dates = first month that uses the live ETF.
# EODHD uses adjusted_close prices (dividends + splits accounted for).
# BEN FELIX backfill script is the canonical implementation reference.

---

## US EQUITY

| Live ETF | Asset Class | Proxy Ticker | Proxy Fund Name | Transition | Status | Data Floor |
|---|---|---|---|---|---|---|
| SPY | S&P 500 | VFINX | Vanguard 500 Index Investor | Feb 1993 | CONFIRMED | Dec 1991 |
| VTI | US Total Market | VTSMX | Vanguard Total Stock Market Investor | Jun 2001 | CONFIRMED | Jun 2001 |
| QQQ | NASDAQ 100 | NDX.INDX | NASDAQ 100 Index (EODHD index feed) | Apr 1999 | APPROVED | Oct 1985 |
| IWM | US Small Cap | NAESX | Vanguard Small Cap Index Investor | Jun 2000 | CONFIRMED | Jul 1980 |
| IWD | US Large Cap Value | VWNDX | Vanguard Windsor Fund | Jun 2000 | CONFIRMED | Jan 1980 |
| IWF | US Large Cap Growth | VWUSX | Vanguard US Growth Fund | Jun 2000 | APPROVED | Nov 1985 |
| IWN | US Small Cap Value | DFSVX | DFA US Small Cap Value | Aug 2000 | CONFIRMED | Aug 2000 |
| IWO | US Small Cap Growth | VEXPX | Vanguard Explorer Fund | Aug 2000 | APPROVED | Jun 1986 |
| MTUM | US Momentum | — | No clean EODHD proxy (factor ETF, 2013) | — | FLOOR ONLY | May 2013 |

### SPY / VFINX notes
- Warren Buffett and US Stock Market portfolios both use this chain
- VFINX EODHD data starts: Nov 1991 (Oct 31, 1991 is the first boundary price)
- SPY first full month: Feb 1993 (launched Jan 29, 1993)
- Both VFINX and SPY track S&P 500 — returns are nearly identical in overlap

### VTI / VTSMX notes
- Used in JL Collins, Ben Felix, and multiple Buy & Hold portfolios
- VTSMX inception: April 27, 1992
- Ben Felix backfill script is the reference implementation for this chain

### IWN / DFSVX notes
- Used in Ben Felix Model Portfolio
- DFSVX inception: April 19, 1993
- Transition August 2000 because IWN launched July 24, 2000 (first full month = Aug)

### QQQ / NDX.INDX notes
- NDX.INDX confirmed in EODHD: 10,255 daily rows from Sep 25, 1985
- This IS the NASDAQ 100 index — zero composition mismatch with QQQ
- QQQ launched Mar 10, 1999 — transition Apr 1999 (first full month)
- NDX.INDX is price return only; QQQ total return includes dividends (~0.5%/yr)
  The difference is ~6–7 basis points per month — negligible for backtest purposes
- Uses the .INDX exchange suffix — fetch with a raw URL, NOT fetch_ticker_prices()
  which appends .US. Same pattern as XAUUSD.FOREX.
- Optional extension: FSPTX.US (Fidelity Select Technology, data from Jul 1981) can
  push history to Aug 1981, but it tracks tech sector only — not the full NASDAQ 100.
  Only use FSPTX if the extra 4 years materially changes the analysis.

### IWO / VEXPX notes
- VEXPX (Vanguard Explorer Fund) EODHD data starts May 15, 1986 — data floor Jun 1986
- Small-cap growth fund with multiple sub-advisors; right style box for IWO
- IWO launched Jul 24, 2000 — transition Aug 2000
- Actively managed; reasonable match given no small-cap growth index funds predate IWO
- IWO tracks Russell 2000 Growth; VEXPX selects its own stocks with a consistent small-cap growth tilt
- Verify EODHD data on first use

### IWF / VWUSX notes
- VWUSX (Vanguard US Growth Fund) EODHD data starts Oct 2, 1985 — data floor Nov 1985
- Large-cap growth fund with lower tracking error to the growth factor than actively managed peers
- IWF launched May 22, 2000 — transition Jun 2000
- Actively managed; closer index fidelity than PRGFX (T. Rowe Price Growth Stock)
- IWF tracks Russell 1000 Growth; VWUSX selects its own stocks but with a consistent growth tilt
- Verify EODHD data on first use

### IWD / VWNDX notes
- VWNDX (Vanguard Windsor Fund) EODHD data starts Dec 26, 1979 — data floor Jan 1980
- Long-running large-cap value fund managed by Wellington since 1958
- IWD launched May 22, 2000 — transition Jun 2000
- Actively managed: carries manager discretion on top of the value tilt; returns will
  diverge from Russell 1000 Value in periods where Wellington made concentrated bets
- Verify EODHD data on first use

### IWM / NAESX notes
- NAESX (Vanguard Small Cap Index) EODHD data starts Jun 9, 1980 — data floor Jul 1980
- IWM launched May 22, 2000 — transition Jun 2000
- NAESX tracks CRSP US Small Cap (~1,400 stocks); IWM tracks Russell 2000 (~2,000 stocks)
- Both are US small cap — high correlation but index methodology differs slightly
- Verify EODHD data on first use

---

## INTERNATIONAL EQUITY

| Live ETF | Asset Class | Proxy Ticker | Proxy Fund Name | Transition | Status | Data Floor |
|---|---|---|---|---|---|---|
| EFA | Intl Developed Equity | PRITX | T. Rowe Price International Stock | Sep 2001 | CONFIRMED | Sep 2001 |
| EEM | Emerging Markets Equity | FEMKX | Fidelity Emerging Markets | May 2003 | CONFIRMED | May 2003 |
| AVDV | Intl Small-Cap Value | DISVX → DLS | DFA Intl Small Cap Value → WisdomTree Intl SmallCap Div | Oct 2019 / Jul 2006 | CONFIRMED | Jul 1995 |
| VGK | European Equity | VEURX | Vanguard European Stock Index Investor | Apr 2005 | APPROVED | Jun 1990 |
| EWJ | Japanese Equity | — | No confirmed EODHD proxy | — | FLOOR ONLY | Apr 1996 |
| VEU | Intl ex-US | — | No confirmed EODHD proxy | — | FLOOR ONLY | Apr 2007 |
| EFV | Intl Developed Value | — | No confirmed EODHD proxy | — | FLOOR ONLY | Sep 2005 |

### EFA / PRITX notes
- Used in Ben Felix Model Portfolio
- PRITX (T. Rowe Price International Stock) inception: Sep 1980
- Long history makes this chain useful for portfolios needing 1980s data
- Transition Sep 2001 because EFA launched Aug 2001

### EEM / FEMKX notes
- Used in Ben Felix Model Portfolio
- FEMKX (Fidelity Emerging Markets) inception: Nov 1990
- Transition May 2003 because EEM launched Apr 2003

### AVDV / DLS / DISVX notes
- Three-step chain: DISVX through Jun 2006, DLS Jul 2006 – Sep 2019, AVDV Oct 2019 onwards
- DISVX (DFA International Small Cap Value): EODHD data floor Jul 1995 — this is the binding
  constraint for any portfolio holding AVDV. Cannot go earlier than Jul 1995.
- DLS was previously the live ETF on the site (swapped to AVDV in May 2026 site-wide)
- Ben Felix backfill script is the reference implementation for this 3-step chain

### VGK / VEURX notes
- VEURX (Vanguard European Stock Index Investor) inception: Jun 23, 1990
- Tracks FTSE Developed Europe Index — close match to VGK
- Transition Apr 2005 because VGK launched Mar 4, 2005
- Extends European equity history back to Jun 1990 (vs. Apr 2005 without proxy)
- Verify EODHD data on first use

---

## REAL ESTATE

| Live ETF | Asset Class | Proxy Ticker | Proxy Fund Name | Transition | Status | Data Floor |
|---|---|---|---|---|---|---|
| VNQ | US REITs | VGSIX | Vanguard REIT Index Investor Shares | Oct 2004 | CONFIRMED | May 1996 |
| IYR | US Real Estate | VGSIX | Vanguard REIT Index Investor Shares | Oct 2004 | CANDIDATE | Jul 2000 |
| RWX | Intl Real Estate | — | No confirmed EODHD proxy | — | FLOOR ONLY | Jan 2007 |
| RWO | Global Real Estate | — | No confirmed EODHD proxy | — | FLOOR ONLY | Jun 2008 |

### VNQ / VGSIX notes
- Used in JL Collins Wealth Preservation Portfolio
- VGSIX (Vanguard REIT Index Investor) inception: May 13, 1996
- May 1996 is the earliest floor for any portfolio with a significant REIT allocation
- Transition Oct 2004 because VNQ launched Sep 29, 2004

### IYR / VGSIX candidate note
- IYR and VNQ both track US REITs; VGSIX is a reasonable proxy for IYR pre-launch
- IYR launched Jun 19, 2000 (floor Jul 2000 without a proxy)
- Not yet confirmed in a script — verify proxy logic before using

---

## FIXED INCOME — GOVERNMENT

| Live ETF | Asset Class | Proxy Ticker | Proxy Fund Name | Transition | Status | Data Floor |
|---|---|---|---|---|---|---|
| BND | US Aggregate Bond | VBMFX | Vanguard Total Bond Market Investor | Apr 2007 | CONFIRMED | Apr 2007 |
| AGG | US Aggregate Bond | VBMFX | Vanguard Total Bond Market Investor | Oct 2003 | APPROVED | Jun 1986 |
| IEF | 7-10yr US Treasury | VFITX | Vanguard Intermediate-Term Treasury Investor | Aug 2002 | APPROVED | Oct 1991 |
| TLT | 20+ yr US Treasury | VUSTX | Vanguard Long-Term Treasury Investor | Aug 2002 | APPROVED | May 1986 |
| SHY | 1-3yr US Treasury | — | SHY is the oldest standard cash proxy; used as proxy for BIL | — | CONFIRMED | Aug 2002 |
| BIL | 1-3mo T-Bill (Cash) | SHY → constant | iShares 1-3yr Treasury → 0.35%/mo constant | May 2007 | CONFIRMED | any |
| TIP | TIPS | — | No confirmed EODHD proxy | — | FLOOR ONLY | Jan 2004 |

### BND / VBMFX notes
- Used in JL Collins Wealth Preservation Portfolio
- VBMFX (Vanguard Total Bond Market Investor) inception: Jun 4, 1986
- Also used as CANDIDATE proxy for AGG (both track US aggregate bond index)
- Transition Apr 2007 because BND launched Apr 3, 2007

### AGG / VBMFX notes
- AGG and BND track essentially the same index (Bloomberg US Aggregate)
- VBMFX already confirmed for BND; same proxy applies here
- AGG launched Sep 26, 2003 — transition Oct 2003
- Using VBMFX extends AGG history back to Jun 1986
- Verify EODHD data on first use

### IEF / VFITX notes
- VFITX (Vanguard Intermediate-Term Treasury Investor) inception: Oct 28, 1991
- Tracks intermediate-term Treasuries — close match to IEF's 7-10yr duration
- IEF launched Jul 22, 2002 — transition Aug 2002
- Using VFITX extends IEF history back to Oct 1991
- Verify EODHD data on first use

### TLT / VUSTX notes
- VUSTX (Vanguard Long-Term Treasury Investor) inception: May 19, 1986
- Tracks long-term Treasuries — reasonable match to TLT's 20+ yr duration
- TLT launched Jul 22, 2002 — transition Aug 2002
- Using VUSTX extends TLT history back to May 1986
- Verify EODHD data on first use

### BIL / SHY / constant notes
- BIL (launched May 25, 2007) = the cash position in most tactical strategies
- Pre-May 2007: use SHY (iShares 1-3yr Treasury, launched Jul 22, 2002)
- Pre-Jul 2002: use 0.35%/month constant return (~4.2% annual)
  -- 0.35% approximates short-term Treasury rates during 1996–2001
  -- Used in JL Collins and other portfolios
- This three-tier approach is established and confirmed across multiple scripts

---

## FIXED INCOME — CREDIT

| Live ETF | Asset Class | Proxy Ticker | Proxy Fund Name | Transition | Status | Data Floor |
|---|---|---|---|---|---|---|
| LQD | Investment Grade Corp Bond | VWESX | Vanguard Long-Term Investment Grade Investor | Aug 2002 | APPROVED | Jul 1973 |
| HYG | High Yield Corporate Bond | VWEHX | Vanguard High-Yield Corporate Investor | May 2007 | APPROVED | Dec 1978 |
| BWX | Intl Government Bond | — | No confirmed EODHD proxy | — | FLOOR ONLY | Nov 2007 |
| BNDX | Intl Bond | — | No confirmed EODHD proxy | — | FLOOR ONLY | Jul 2013 |
| EMB | Emerging Markets Bond | — | No confirmed EODHD proxy | — | FLOOR ONLY | Jan 2008 |

### LQD / VWESX notes
- VWESX (Vanguard Long-Term Investment Grade Investor) inception: Jul 9, 1973
- LQD tracks BBB-rated and higher corporate bonds with varying maturities
- VWESX is longer-duration than LQD; returns will diverge somewhat in rate-change environments
- LQD launched Jul 26, 2002 — transition Aug 2002
- Using VWESX extends LQD history back to Jul 1973
- Verify EODHD data on first use; note the duration mismatch when interpreting results

### HYG / VWEHX notes
- VWEHX (Vanguard High-Yield Corporate Investor) inception: Dec 27, 1978
- Both track high-yield (below investment grade) corporate bonds — reasonable match
- HYG launched Apr 4, 2007 — transition May 2007
- Using VWEHX extends HYG history back to Dec 1978
- Verify EODHD data on first use

---

## COMMODITIES & REAL ASSETS

| Live ETF | Asset Class | Proxy | Notes | Status | Data Floor |
|---|---|---|---|---|---|
| GLD | Gold | XAUUSD.FOREX | Gold spot price via EODHD FOREX feed | APPROVED | Dec 1979 |
| DBC | Broad Commodities | — | No confirmed EODHD proxy | FLOOR ONLY | Mar 2006 |

### GLD / XAUUSD.FOREX notes
- GLD (SPDR Gold Shares) launched Nov 18, 2004 — transition Dec 2004
- XAUUSD.FOREX confirmed available in EODHD: 12,434 daily rows from Dec 26, 1979
- Gold spot has no dividends or splits, so spot price = total return
  (GLD charges ~0.40%/yr custody fee, negligible over long periods)
- USERX (US Global Investors Gold & Precious Metals Fund) is NOT a suitable proxy —
  it holds gold mining stocks, not bullion. Miners carry equity market beta and
  amplify gold price moves 2–3x. Would misrepresent crisis-hedging properties.
- XAUUSD.FOREX uses the .FOREX exchange suffix — fetch with a raw URL, NOT
  fetch_ticker_prices() which appends .US. See backfill_global_stock_market.py
  for the pattern of fetching non-.US tickers.

### DBC notes
- DBC (Invesco DB Commodity Index) launched Feb 3, 2006 (floor Mar 2006)
- Previously the site used GSG (iShares S&P GSCI, launched Jul 2006) — replaced May 2026
- No confirmed EODHD mutual fund proxy for broad commodity indexes
- DJ-AIG/Bloomberg Commodity Index total return data exists but not as an EODHD ticker
- For portfolios requiring pre-2006 commodities data, this is an open problem

---

## GLOBAL EQUITY (SPECIAL CASES)

| Live ETF | Asset Class | Proxy | Notes | Status | Data Floor |
|---|---|---|---|---|---|
| VT | Global Total Market | MSCI ACWI Index | Daily price data sourced separately (not EODHD mutual fund) | CONFIRMED | Jan 1999 |

### VT / MSCI ACWI notes
- VT (Vanguard Total World Stock) launched Jun 24, 2008 (floor Jul 2008)
- Pre-Jul 2008: MSCI ACWI Index daily prices sourced via a separate data download
  (see backfill_global_stock_market.py for implementation details)
- MSCI ACWI data available from Jan 1, 1999 — that is the hard floor for Global Stock Market portfolio
- Before Jan 1999: no data available for this portfolio

---

## QUICK REFERENCE: DATA FLOORS BY EARLIEST DATE

Sorted by how far back each chain goes. Use this when choosing between similar ETFs.

| Start Date | ETF/Proxy | Chain Used For |
|---|---|---|
| Jul 1973 | VWESX (→ LQD) | Investment grade corporate bonds |
| May 1986 | VUSTX (→ TLT) | Long-term US Treasuries |
| Jun 1986 | VBMFX (→ BND / AGG) | US aggregate bonds |
| Dec 1978 | VWEHX (→ HYG) | High yield corporate bonds |
| Dec 1979 | XAUUSD.FOREX (→ GLD) | Gold |
| Sep 1980 | PRITX (→ EFA) | International developed equity |
| Jun 1990 | VEURX (→ VGK) | European equity |
| Nov 1990 | FEMKX (→ EEM) | Emerging markets equity |
| Oct 1991 | VFITX (→ IEF) | Intermediate-term US Treasuries |
| Dec 1991 | VFINX (→ SPY) | US large cap / S&P 500 |
| Apr 1992 | VTSMX (→ VTI) | US total market |
| Apr 1993 | DFSVX (→ IWN) | US small cap value |
| Jul 1995 | DISVX (→ DLS → AVDV) | International small cap value |
| May 1996* | VGSIX (→ VNQ) | US REITs |
| Apr 1996 | EWJ direct | Japan equity |
| Jan 1999 | MSCI ACWI (→ VT) | Global total market |
| Jun 1986 | VEXPX (→ IWO) | US small cap growth |
| Nov 1985 | VWUSX (→ IWF) | US large cap growth |
| Jul 1980 | NAESX (→ IWM) | US small cap |
| Jan 1980 | VWNDX (→ IWD) | US large cap value |
| Oct 1985 | NDX.INDX (→ QQQ) | NASDAQ 100 |

*VGSIX available from May 1996; this is the binding floor for any portfolio with US REITs.
Note: rows marked APPROVED have not yet been run against EODHD — verify data availability on first backfill use.

---

## CONFIRMED PROXY CHAINS: IMPLEMENTATION REFERENCE

The scripts listed below are the authoritative source for each proxy chain's
Python implementation. Read these when writing a new backfill script.

| Chain | Reference Script |
|---|---|
| VFINX → SPY (equity) | backfill_warren_buffett.py, backfill_us_stock_market.py |
| VTSMX → VTI | backfill_jl_collins_wealth_preservation.py, backfill_ben_felix_model_portfolio.py |
| DFSVX → IWN | backfill_ben_felix_model_portfolio.py |
| PRITX → EFA | backfill_ben_felix_model_portfolio.py |
| FEMKX → EEM | backfill_ben_felix_model_portfolio.py |
| DISVX → DLS → AVDV | backfill_ben_felix_model_portfolio.py |
| VGSIX → VNQ | backfill_jl_collins_wealth_preservation.py |
| VWNDX → IWD | backfill_paul_merriman_4fund_us.py |
| NAESX → IWM | backfill_paul_merriman_4fund_us.py |
| VBMFX → BND | backfill_jl_collins_wealth_preservation.py |
| constant → SHY → BIL | backfill_jl_collins_wealth_preservation.py |
| VFINX → SPY + VFISX → SHY | backfill_warren_buffett.py |
| MSCI ACWI → VT | backfill_global_stock_market.py |

The multi-proxy Ben Felix script is the canonical example for portfolios
with multiple chains and complex transition logic.

---

## STANDARD IMPLEMENTATION PATTERN

When writing a new backfill script:

1. Identify each ETF's proxy from the table above
2. Set transition date constants at the top of the script
3. Use `prev_month_end(TRANSITION_DATE)` as the fetch-to date for the proxy
   and as the fetch-from date for the live ETF (to get the boundary price)
4. In the per-month ticker selector, use: `"LIVE_ETF" if m >= TRANSITION_DATE else "PROXY"`
5. Fetch slightly before the proxy's needed date range to ensure boundary prices exist
6. Run with --dry-run first and inspect the first and last 3 months

The `get_last_trading_day_price(prices_dict, target_date)` helper in utils.py
handles weekends and holidays automatically — always use it, never index directly.

---

## OPEN PROBLEMS (no proxy currently available)

These ETFs are used in existing tactical portfolios. Since tactical strategies
are forward-only (Stage 0 stores holdings monthly), there is no backfill need
for most of them. But if a new Buy & Hold portfolio needs any of these,
a proxy would need to be sourced and tested.

- **QQQ** (NASDAQ 100) — resolved: use NDX.INDX (approved, see above)
- **DBC** (Commodities) — no broad commodity total-return proxy in EODHD; under research by Nick
- **IWO** (Russell 2000 Growth) — resolved: use VEXPX (approved, see above)
- **BWX / BNDX / EMB** (International bonds) — launched too late for long backtests; no proxies needed
- **MTUM** (Momentum factor) — factor ETF launched 2013; no pre-2013 proxy
- **RWX / RWO** (International/Global Real Estate) — launched too late; no proxies needed
