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

**Years to FI**:
The headline output of the Financial Independence Calculator — the simulation year (rounded up) in which portfolio value first reaches the FI Number, reported as a 10th/50th/90th percentile range across bootstrap simulations. If Current Savings already meets or exceeds the FI Number at the start, reported as "Already FI" instead of running the simulation.
_Avoid_: time to retirement (when referring to this specific calculated value)
