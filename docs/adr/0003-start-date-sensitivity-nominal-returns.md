# ADR 0003 — Start Date Sensitivity uses nominal returns

**Date:** June 2026  
**Status:** Accepted

## Context

The Start Date Sensitivity chart plots two lines at each reference year: the 10-year backward CAGR (Prev 10 Yrs) and the 10-year forward CAGR (Next 10 Yrs). The source of inspiration — Portfolio Charts — labels its Y-axis "10-Year Real CAGR," using inflation-adjusted returns.

Every other return figure on PortfolioDB is nominal: Growth of $10K, Rolling Returns, Holding Period Heatmap, CAGR, Best/Worst Year. There is no CPI data in the database and no inflation-adjustment infrastructure.

## Decision

Use nominal returns, consistent with the rest of the site.

## Consequences

- The Y-axis values will be higher than Portfolio Charts' equivalent chart by roughly 2–3% (the historical average US inflation rate), so direct visual comparison is not possible.
- The headline scalar (Timing Sensitivity = `rolling_10yr_high − rolling_10yr_low`) is identical whether computed on real or nominal returns — inflation cancels out of the spread.
- A "nominal returns" caption is added to the chart to set expectations.
- Switching to real returns in the future would require sourcing and storing monthly CPI data and adjusting the entire rolling-returns computation pipeline — a meaningful infrastructure addition, not a one-liner.
