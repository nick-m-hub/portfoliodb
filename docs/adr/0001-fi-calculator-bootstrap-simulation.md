# Financial Independence Calculator uses bootstrap simulation, not rolling historical windows

The original backlog item described computing "years to FI" via every historical start year in `monthly_returns` (the same rolling-window approach as `buildWithdrawalRates()`). We instead reuse the Monte Carlo tool's bootstrap resampling engine.

Years-to-FI is typically a 15-35 year horizon. Most portfolios have 25-50 years of history, so rolling non-overlapping windows of that length yield only a handful of heavily-overlapping starting points — not enough for a meaningful distribution, and newer portfolios (10-15 years of data) could produce zero complete windows at all (fully censored). Bootstrap resampling generates thousands of plausible sequences from the same underlying months, handles short-history portfolios, and produces a percentile range (10th/50th/90th) consistent with the existing Monte Carlo tool's output style.
