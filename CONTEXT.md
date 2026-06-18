# PortfolioDB

PortfolioDB.com — a portfolio database, screener, and analysis toolset for DIY investors. This file is a glossary of project-specific domain terms (not a spec or implementation log).

## Language

**FI Number**:
The target portfolio value a user must reach to be considered "financially independent" — calculated as annual spending divided by the Withdrawal Rate. Used by the Financial Independence Calculator (`/tools/financial-independence`).
_Avoid_: target net worth, retirement number (when referring to this specific calculated value)

**Withdrawal Rate** (for the FI Calculator):
The annual percentage used to convert annual spending into an FI Number. Defaults to the selected portfolio's own 30-year SWR (Safe Withdrawal Rate, real), with a user override. Distinct from SWR itself — SWR is a computed portfolio statistic; Withdrawal Rate is the (possibly user-adjusted) input derived from it.
_Avoid_: SWR (when referring to the user-adjustable input — use SWR only for the underlying computed stat)

**Savings Rate**:
The percentage of Annual Income that a user contributes to their portfolio each year, on the Financial Independence Calculator. Combined with Annual Income to derive the annual contribution amount used in the simulation.
_Avoid_: contribution rate

**Annual Income**:
A user input on the Financial Independence Calculator, used only to derive the annual contribution amount (Annual Income × Savings Rate). Not otherwise used by the simulation.

**Investment Horizon** (Lump Sum vs. DCA tool):
The total window from the first dollar deployed to the measurement date — shared identically by both strategies. A 10-year horizon means both lump sum and DCA are measured at the same end date, 10 years after the first investment. Distinct from "holding period after DCA completes" — the DCA period is contained *within* the Investment Horizon, not added on top of it.
_Avoid_: holding period (ambiguous — implies time after deployment ends), investment period

**DCA Period** (Lump Sum vs. DCA tool):
The number of months over which the total investment amount is spread in equal beginning-of-month installments. Always shorter than the Investment Horizon. Options: 3, 6, or 12 months.
_Avoid_: contribution period, averaging period

**Timing Sensitivity** (Performance Snapshot label) / **Start Date Sensitivity** (chart section heading):
The same stat shown in two contexts. Measures how much a portfolio's 10-year outcome varied depending on when an investor happened to start — computed as `rolling_10yr_high − rolling_10yr_low` (the spread between the best and worst 10-year annualized returns across every possible start month in the portfolio's history). Displayed as "Timing Sensitivity" in the Performance Snapshot stat row (space-constrained) and "Start Date Sensitivity" as the heading of the full-width chart section. All values are nominal (not inflation-adjusted), consistent with every other return figure on the site. Requires ≥10 years of history for the scalar; ≥20 years for the chart section to render. The chart plots two lines at each reference year: Prev 10 Yrs CAGR (red) and Next 10 Yrs CAGR (teal), with "Luckiest" and "Unluckiest" annotations at the max and min of the Next 10 Yrs line.
_Avoid_: timing luck (colloquial, not a defined term), start date risk, entry point sensitivity

**AI Picks**:
The 3 portfolios surfaced by the AI Recommendation feature on the database page, pinned above the regular sorted grid in a distinct "AI Recommendations" section. Produced by submitting a natural-language goal description to the AI; replaced when the user submits a new query; dismissed explicitly via "Clear AI picks."
_Avoid_: AI results, recommendations (too generic — use "AI Picks" when referring to the pinned cards specifically)

**Years to FI**:
The headline output of the Financial Independence Calculator — the simulation year (rounded up) in which portfolio value first reaches the FI Number, reported as a 10th/50th/90th percentile range across bootstrap simulations. If Current Savings already meets or exceeds the FI Number at the start, reported as "Already FI" instead of running the simulation.
_Avoid_: time to retirement (when referring to this specific calculated value)
