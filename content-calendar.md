# PortfolioDB.co — SEO Content Calendar
# 25 posts sorted Easy → Medium → Hard, data-richest first within each tier.
# Pull all stats fresh from portfolio_stats before writing each post — never hardcode numbers.

---

## How to Write a Post

Use this prompt with Claude (claude.ai or Claude Code) when you're ready to write a post. Fill in the bracketed sections from the calendar entries below, then paste 3–5 rows of real stats from Supabase before sending.

```
Write a roughly 1,200-word SEO post for portfoliodb.co.

Post title: [FROM YOUR CALENDAR]
Primary keyword: [FROM YOUR CALENDAR]
Portfolios to reference: [SLUGS — e.g. golden-butterfly-portfolio, pinwheel-portfolio]

Real data to include:
[PASTE 3–5 ROWS OF STATS FROM YOUR SUPABASE DATABASE]

Requirements:
- Open with a specific, concrete observation — not a question
- H2 subheadings every 250–300 words
- Reference specific performance numbers (CAGR, drawdown) — no vague claims
- Natural CTA near end mentioning portfoliodb.co/database
- Clear, confident tone — not academic

Leave [ADD YOUR TAKE HERE] in 2 spots for my editorial input.

Then output a second block with:
- slug: (URL-friendly, e.g. golden-butterfly-vs-permanent-portfolio)
- excerpt: (1 sentence, under 160 chars, SEO-friendly)

I'll paste the content into Supabase as a new blog_posts row.
```

---

## Production Notes

- **Pull stats fresh before writing each post.** All numbers should come from live `portfolio_stats` — hardcoding a CAGR today will be wrong in 12 months.
- **Posts 13, 18, 21, 22, 24** specifically require sorting the full dataset to find top/bottom performers. Run those queries in Supabase before drafting.
- **Suggested publishing order:** Start with Posts 1–3 (highest search volume, fastest to produce), then 11–12 (comparison posts with strong SEO upside), then 21 as the flagship.
- **Internal links are the compounding value.** Every post should link to at least two portfolio detail pages and one strategy page.

---

## Summary Table

| # | Title | Tier | Primary Keyword | Portfolios Referenced |
|---|-------|------|-----------------|----------------------|
| 1 | What Is the Ulcer Index? | Easy | ulcer index investing | all-weather, vigilant-g4, permanent | ✓ Published 2026-05-16 |
| 2 | Permanent Portfolio Review | Easy | permanent portfolio review | permanent, 60/40, golden butterfly |
| 3 | All-Weather Portfolio Review | Easy | all weather portfolio review | all-weather, 60/40, permanent |
| 4 | Bogleheads 3-Fund vs 4-Fund | Easy | bogleheads three fund vs four fund | 3-fund, 4-fund, 60/40 |
| 5 | What Is the Sharpe Ratio? | Easy | sharpe ratio portfolio comparison | top Sharpe portfolios from live data |
| 6 | Best Simple Portfolios for Beginners | Easy | simple index fund portfolio beginners | 3-fund, coffeehouse, gone fishin, cowards, andrew tobias |
| 7 | What Is Dual Momentum? | Easy | dual momentum investing strategy | GEM variants x4 |
| 8 | Paul Merriman 7-Fund vs 8-Fund | Easy | paul merriman buy and hold portfolio | merriman x2, 3-fund |
| 9 | Coffeehouse Portfolio Review | Easy | coffeehouse portfolio review | coffeehouse, 60/40, 3-fund |
| 10 | Gone Fishin' Portfolio Review | Easy | gone fishin portfolio | gone fishin, 3-fund, 60/40 |
| 11 | Golden Butterfly vs Permanent | Medium | golden butterfly vs permanent portfolio | golden butterfly, permanent, all-weather |
| 12 | All-Weather vs 60/40 | Medium | all weather portfolio vs 60 40 | all-weather, 60/40, permanent |
| 13 | Which Portfolios Survived 2008? | Medium | best portfolio 2008 financial crisis | top/bottom 5 by GFC CAGR from live data |
| 14 | Tactical vs Buy-and-Hold | Medium | tactical vs buy and hold investing | GEM, DAA, VAA-G4 vs 60/40, all-weather, 3-fund |
| 15 | What Are Rolling Returns? | Medium | rolling returns investing explained | permanent, 60/40, golden butterfly |
| 16 | Vigilant Asset Allocation Review | Medium | vigilant asset allocation strategy | VAA-G12, VAA-G4, 60/40, GEM |
| 17 | Meb Faber GTAA Review | Medium | meb faber gtaa portfolio | GTAA x4, ivy-portfolio-faber |
| 18 | Best Portfolios for Risk-Averse Investors | Medium | low drawdown portfolio strategies | top 7 by max drawdown from live data |
| 19 | The Larry Portfolio Review | Medium | larry portfolio larry swedroe | larry portfolio, 60/40, no-brainer |
| 20 | AAA vs DAA Comparison | Medium | adaptive vs defensive asset allocation | AAA, DAA, PAA, VAA-G4 |
| 21 | 10 Best Index Fund Portfolios Since 1970 | Hard | best index fund portfolios | top 10 by Sharpe from live data |
| 22 | What the Dot-Com Crash Revealed | Hard | portfolio performance dot com crash | top/bottom 5 by dotcom CAGR from live data |
| 23 | 5 Best Momentum Strategies | Hard | momentum investing backtested | GEM, composite DM, accel DM, GPM, KDA |
| 24 | UPI vs Sharpe Ratio | Hard | ulcer performance index vs sharpe ratio | 5–6 with diverging Sharpe/UPI ranks |
| 25 | Best and Worst 3-Year Rolling Windows | Hard | rolling 3 year returns index fund | 60/40, permanent, GEM, VAA-G4, golden butterfly |

---

## EASY (Posts 1–10)

---

### Post 1 ✓ Published 2026-05-16
**Title:** What Is the Ulcer Index? The Risk Metric Most Investors Have Never Heard Of
**Slug:** `what-is-the-ulcer-index`

**Primary keyword:** `ulcer index investing` — Informational / educational

**Why Easy:** Almost no quality content exists on this term. You have live data for all 70 portfolios, so you own the comparison angle completely.

**Outline:**
1. What the Ulcer Index measures — not just drawdown depth, but *duration* (tie to the "ulcer" name: prolonged pain, not a single bad day)
2. How it differs from max drawdown and standard deviation — max drawdown only shows the worst single moment; Ulcer Index penalizes strategies that stay underwater for months
3. Show the range across your 70 portfolios — pull the lowest and highest Ulcer Index values from `portfolio_stats`; frame it as "a well-designed portfolio can have an Ulcer Index below X; the worst in our database is Y"
4. Ulcer Performance Index (UPI) — introduce UPI as a Sharpe-like ratio that uses Ulcer Index as the denominator instead of standard deviation; explain why it's arguably better for retirement investors than Sharpe
5. How to use it when screening portfolios — screenshot/description of the Portfolio Screener's Ulcer Index slider; CTA to filter by Ulcer Index

**Portfolios to reference:** `ray-dalios-all-weather-portfolio` (typically low Ulcer Index), `vigilant-asset-allocation-g4-aggressive` (high CAGR but potentially higher Ulcer), `permanent-portfolio` (known for low volatility) — pull actual values from live data

**Difficulty:** Easy — no meaningful competition for "Ulcer Index investing" content

**Internal links:** `/portfolio-screener` (filter by Ulcer Index), `/methodology` (how UPI is calculated), `/glossary-of-terms` (Ulcer Index definition entry)

---

### Post 2
**Title:** The Permanent Portfolio Review: Harry Browne's 4-Asset Strategy, Backtested Since 1970

**Primary keyword:** `permanent portfolio harry browne review` — Informational

**Why Easy:** Very high monthly search volume; most existing content is thin or opinion-based. You have backtested data back to 1970 — almost no competitors do.

**Outline:**
1. What the Permanent Portfolio is — four equal 25% allocations (stocks, long bonds, gold, cash); Harry Browne's 1981 design thesis: each asset thrives in one of four economic conditions (prosperity, deflation, inflation, recession)
2. Actual backtested CAGR from 1970 to present — pull from `portfolio_stats`; compare to `united-states-60-40-portfolio` CAGR over same period
3. The drawdown story — max drawdown from `portfolio_stats`; how it performed in 2000–2002 (dotcom CAGR) and 2008 (GFC CAGR); contrast with 60/40
4. The trade-off: lower ceiling, higher floor — rolling 10-year low vs. 60/40 rolling 10-year low; who should accept the lower long-term CAGR in exchange for smoother rides
5. Who it's built for — minimum timeline, risk level 1–2 investor profile; link to the Screener filtered to similar profiles

**Portfolios to reference:** `permanent-portfolio` (primary), `united-states-60-40-portfolio` (benchmark), `golden-butterfly-portfolio` (spiritual successor)

**Difficulty:** Easy — lots of searches, but competitor content lacks real data

**Internal links:** `/portfolios/permanent-portfolio`, `/portfolios/golden-butterfly-portfolio`, `/portfolios/united-states-60-40-portfolio`, `/strategies/all-weather`

---

### Post 3
**Title:** Ray Dalio's All-Weather Portfolio: Full Backtest Review (1970–2024)

**Primary keyword:** `all weather portfolio review` — Informational

**Why Easy:** Massive search volume. Existing content is largely Wikipedia-style. Your backtested stats from 1970 are the differentiator.

**Outline:**
1. Where it came from — Bridgewater, risk parity philosophy, designed to survive any economic environment without forecasting
2. The actual numbers — CAGR, max drawdown, Sharpe, Sortino, Ulcer Index from `portfolio_stats`; pull best year and worst year
3. 2008 GFC performance — GFC CAGR from `portfolio_stats`; contrast with the S&P 500 (~-37% in 2008) and `united-states-60-40-portfolio` GFC CAGR
4. The 40% bond exposure debate — bond-heavy allocation was genius in falling-rate environments (1980–2020); discuss the headwind in rising-rate environments (2022 — pull worst_year if it's 2022)
5. Who it's actually right for — risk level, time horizon, temperament; alternative if you want higher CAGR with similar smoothness (link to `golden-butterfly-portfolio`)

**Portfolios to reference:** `ray-dalios-all-weather-portfolio` (primary), `united-states-60-40-portfolio`, `permanent-portfolio`, `golden-butterfly-portfolio`

**Difficulty:** Easy — high volume, weak competition on the data side

**Internal links:** `/portfolios/ray-dalios-all-weather-portfolio`, `/strategies/all-weather`, `/strategies/risk-parity`, `/methodology`

---

### Post 4
**Title:** Bogleheads Three-Fund vs Four-Fund Portfolio: Which Is Right for You?

**Primary keyword:** `bogleheads three fund portfolio vs four fund` — Comparative / informational

**Why Easy:** Bogleheads forums drive constant search traffic; this is a perennial question. Easy to write, direct comparison, clear data to back it up.

**Outline:**
1. What the three-fund portfolio is — US total market, international, US bonds; Vanguard philosophy; simplicity as a feature
2. What the four-fund portfolio adds — emerging markets as a separate slice; the diversification argument and the historical return premium for EM
3. Side-by-side backtested data — CAGR, max drawdown, Sharpe, best year, worst year for both from `portfolio_stats`
4. When the fourth fund helped and when it didn't — rolling 10-year return windows; pull rolling_10yr_low and rolling_10yr_high for both; note any periods where EM dragged performance
5. The decision framework — simplicity vs. completeness; three-fund is good enough; four-fund for those who specifically want EM exposure as a deliberate bet

**Portfolios to reference:** `bogleheads-three-fund-portfolio`, `bogleheads-four-fund-portfolio`, `united-states-60-40-portfolio` (as a simpler benchmark)

**Difficulty:** Easy — Bogleheads community drives steady search volume; most content is forum posts, not data-driven articles

**Internal links:** `/portfolios/bogleheads-three-fund-portfolio`, `/portfolios/bogleheads-four-fund-portfolio`, `/strategies/simple`

---

### Post 5
**Title:** What Is the Sharpe Ratio? How to Compare Portfolio Risk-Adjusted Returns

**Primary keyword:** `sharpe ratio portfolio comparison` — Informational / educational

**Why Easy:** Evergreen educational content. Your Methodology page already has the formula — this post extends it into a practical guide with real portfolio examples.

**Outline:**
1. The basic problem — CAGR alone is misleading; a portfolio returning 12% with 40% drawdowns is worse than one returning 9% with 15% drawdowns for most investors
2. How Sharpe Ratio works — formula (using your 4.5% risk-free rate benchmark), intuition: return per unit of risk
3. What "good" looks like in practice — pull your highest Sharpe portfolios from `portfolio_stats`; what's the range across your 70 portfolios (low end vs. high end)
4. Where Sharpe falls short — penalizes upside volatility equally with downside; introduce Sortino Ratio as the fix (only penalizes downside); then Ulcer Performance Index as the next refinement
5. How to use it on PortfolioDB — walk through sorting the Screener by Sharpe; use the Advanced Filters to set a minimum Sharpe threshold

**Portfolios to reference:** Top 3 Sharpe portfolios from live data (pull dynamically — DAA likely leads at Sharpe 0.98 per live data)

**Difficulty:** Easy — high volume keyword; your real data examples are the differentiator

**Internal links:** `/portfolio-screener`, `/methodology`, `/glossary-of-terms` (Sharpe entry), `/strategies/tactical`

---

### Post 6
**Title:** The Best Simple Index Fund Portfolios for Beginners (5 Strategies That Require Almost No Work)

**Primary keyword:** `simple index fund portfolio for beginners` — Informational / listicle

**Why Easy:** Huge audience; most existing listicles have no real data — yours will be the only one with backtested numbers.

**Outline:**
1. Why simple portfolios win — behavioral advantage: you can't panic-tinker what you barely have to touch; John Bogle's argument for staying the course
2. The five portfolios ranked from simplest to slightly-less-simple — `bogleheads-three-fund-portfolio`, `coffeehouse-portfolio`, `gone-fishin-portfolio`, `cowards-portfolio-bill-bernstein`, `andrew-tobias-portfolio`
3. Side-by-side data table — CAGR, max drawdown, Sharpe, number of funds for each; pull from `portfolio_stats`
4. Who each is right for — brief 2-sentence profile for each portfolio type; risk level, rebalancing frequency
5. The one thing simple portfolios can't do — they can't reduce drawdowns during crashes; pull worst year and GFC CAGR for each; contrast with tactical approaches (link to `/strategies/tactical`) for readers who want more protection

**Portfolios to reference:** `bogleheads-three-fund-portfolio`, `coffeehouse-portfolio`, `gone-fishin-portfolio`, `cowards-portfolio-bill-bernstein`, `andrew-tobias-portfolio`

**Difficulty:** Easy — competitive keyword but competitors don't have real backtest data

**Internal links:** `/strategies/simple`, `/database?cat=Buy+and+Hold`, `/portfolio-screener`, each portfolio detail page

---

### Post 7
**Title:** What Is Dual Momentum? Gary Antonacci's Strategy Explained (With Backtest Results)

**Primary keyword:** `dual momentum investing strategy` — Informational

**Why Easy:** "Dual momentum" is searched by investors who've heard the term but want to understand it. Your site has four variations — a rare depth advantage.

**Outline:**
1. The core idea — absolute momentum (is this asset beating cash?) + relative momentum (which asset is beating the others?); avoid drawdowns while capturing trending gains
2. The four GEM variants in the database — `gem-dual-momentum`, `gem-emerging-markets-dual-momentum`, `composite-dual-momentum`, `accelerating-dual-momentum`; what each adds or modifies
3. Backtested numbers — CAGR, max drawdown, Sharpe for each variant from `portfolio_stats`; how they compare to `united-states-60-40-portfolio` as a baseline
4. The real trade-off — whipsaw risk in sideways or choppy markets; momentum strategies can lag in flat years; pull worst year and rolling 1-year low for context
5. Who this is right for — high discipline required; minimum timeline; link to the momentum strategy page

**Portfolios to reference:** `gem-dual-momentum`, `gem-emerging-markets-dual-momentum`, `composite-dual-momentum`, `accelerating-dual-momentum`

**Difficulty:** Easy — moderate competition but no one is comparing four variants with real data

**Internal links:** `/strategies/momentum`, `/portfolios/gem-dual-momentum`, `/portfolio-screener`

---

### Post 8
**Title:** Paul Merriman's Ultimate Buy-and-Hold Portfolio: 7-Fund vs 8-Fund Compared

**Primary keyword:** `paul merriman ultimate buy and hold portfolio` — Informational / comparative

**Why Easy:** Merriman has a dedicated following; both portfolio versions are searched regularly. Direct A/B comparison with real numbers.

**Outline:**
1. Merriman's factor-tilt philosophy — small-cap value premium; why diversifying across all equity factors is the goal; Fama-French backing
2. The 7-fund vs 8-fund difference — what the 8th fund adds; allocation breakdown for both
3. Backtested performance comparison — CAGR, max drawdown, Sharpe, worst year for both from `portfolio_stats`; which has the higher rolling 10-year low?
4. How both compare to simpler alternatives — `bogleheads-three-fund-portfolio` and `united-states-60-40-portfolio` as anchors; the premium you pay in complexity for the additional factor exposure
5. Implementation notes — set-it-and-rebalance-annually portfolios; who has the patience and discipline to hold 7–8 funds; link to `/strategies/factor-tilt`

**Portfolios to reference:** `ultimate-buy-and-hold-portfolio-7-paul-merriman`, `ultimate-buy-and-hold-portfolio-8-paul-merriman`, `bogleheads-three-fund-portfolio`

**Difficulty:** Easy — Merriman audience actively searches; competitors don't have backtest data

**Internal links:** `/portfolios/ultimate-buy-and-hold-portfolio-7-paul-merriman`, `/portfolios/ultimate-buy-and-hold-portfolio-8-paul-merriman`, `/strategies/factor-tilt`

---

### Post 9
**Title:** The Coffeehouse Portfolio Review: A 7-Fund Strategy for People Who Hate Complexity

**Primary keyword:** `coffeehouse portfolio review` — Informational

**Why Easy:** Named portfolio with steady search traffic; Bill Schultheis has a loyal following. Your backtest data is the entire competitive advantage.

**Outline:**
1. The origin — Schultheis's book *The Coffeehouse Investor*; the philosophy: stop trying to beat the market and start owning it
2. Allocation breakdown — the seven funds, what each represents, why this balance was chosen
3. Backtested numbers — CAGR, max drawdown, Sharpe, Sortino, best year, worst year from `portfolio_stats`; compare to `united-states-60-40-portfolio`
4. Crash performance — how it held up in 2000–2002 (dotcom CAGR) and 2008 (GFC CAGR); was the bond allocation a genuine cushion?
5. Who it's for and who should look elsewhere — income investors and retirees; if you want higher CAGR, link to factor-tilt strategies; if you want smoother drawdowns, link to all-weather strategies

**Portfolios to reference:** `coffeehouse-portfolio`, `united-states-60-40-portfolio`, `bogleheads-three-fund-portfolio`

**Difficulty:** Easy — moderate competition, no competitors with backtest data

**Internal links:** `/portfolios/coffeehouse-portfolio`, `/strategies/simple`, `/database?cat=Buy+and+Hold`

---

### Post 10
**Title:** The Gone Fishin' Portfolio by Alexander Green: Lazy Investing With a Global Twist

**Primary keyword:** `gone fishin portfolio alexander green` — Informational

**Why Easy:** Named portfolio search; low competition; short post with a clear comparison opportunity.

**Outline:**
1. Alexander Green's design — Oxford Club newsletter origin; 10-fund globally diversified approach; designed to rebalance once a year and ignore the market the rest of the time
2. Allocation breakdown — how the diversification across domestic equity, international, bonds, REITs, and gold compares to a standard 60/40
3. Backtested CAGR vs simpler alternatives — `bogleheads-three-fund-portfolio` comparison; does the global tilt add returns or just complexity?
4. Drawdown history — max drawdown and GFC performance from `portfolio_stats`; how global diversification affected 2008 results
5. The "once a year" appeal — why enforced simplicity is a behavioral advantage; ideal for investors who don't want to think about their portfolio

**Portfolios to reference:** `gone-fishin-portfolio`, `bogleheads-three-fund-portfolio`, `united-states-60-40-portfolio`

**Difficulty:** Easy — very low competition on named portfolio searches

**Internal links:** `/portfolios/gone-fishin-portfolio`, `/strategies/simple`, `/strategies/global`

---

## MEDIUM (Posts 11–20)

---

### Post 11
**Title:** Golden Butterfly vs Permanent Portfolio: Which Holds Up Better in Every Market Condition?

**Primary keyword:** `golden butterfly vs permanent portfolio` — Comparative / informational

**Why Medium:** Both portfolio names are well-searched; head-to-head comparisons face more existing content than single-portfolio reviews.

**Outline:**
1. What they share — both are all-weather designs built to survive any economic environment without forecasting; both hold gold
2. The key difference — Golden Butterfly adds small-cap value equity (10%) to Browne's original formula, shifting the mix toward slightly higher long-term return potential at the cost of more equity exposure
3. Full stat comparison table — CAGR, 10yr CAGR, max drawdown, Sharpe, Sortino, Ulcer Index, best year, worst year for both from `portfolio_stats`
4. Crisis-period showdown — GFC CAGR and dotcom CAGR for both; which recovered faster? Use rolling 1-year and 3-year lows to show recovery speed
5. Verdict by investor type — who should pick Permanent Portfolio (maximum smoothness, accepting lower CAGR); who should pick Golden Butterfly (willing to accept slightly more volatility for better long-term returns)

**Portfolios to reference:** `golden-butterfly-portfolio`, `permanent-portfolio`, `ray-dalios-all-weather-portfolio` (third-column comparison), `united-states-60-40-portfolio` (benchmark)

**Difficulty:** Medium — both portfolio names have SEO traction; some comparison content exists but lacks real data

**Internal links:** `/portfolios/golden-butterfly-portfolio`, `/portfolios/permanent-portfolio`, `/portfolios/ray-dalios-all-weather-portfolio`, `/strategies/all-weather`

---

### Post 12
**Title:** All-Weather Portfolio vs 60/40: 50-Year Backtested Comparison

**Primary keyword:** `all weather portfolio vs 60 40` — Comparative

**Why Medium:** High intent search from investors evaluating a specific move; some competition exists but it's mostly forum-level quality.

**Outline:**
1. The philosophical divide — risk parity (All-Weather: equal economic sensitivity) vs. traditional asset allocation (60/40: equity-dominated growth with bonds as a buffer)
2. Full stat comparison — CAGR, max drawdown, Sharpe, Sortino, Ulcer Index, best year, worst year; pull all from `portfolio_stats` for both
3. Year-by-year divergence — use GFC CAGR and dotcom CAGR to show crash periods; use rolling_10yr_avg for both to show long-term compounding difference
4. The bond problem in the 2020s — 2022 was uniquely bad for bond-heavy portfolios; pull worst_year if applicable; discuss whether this is structural or cyclical
5. Decision framework — timeline-based recommendation; if your horizon is 30+ years, the CAGR gap matters more; if you're within 10 years of retirement, the drawdown difference matters more

**Portfolios to reference:** `ray-dalios-all-weather-portfolio`, `united-states-60-40-portfolio`, `permanent-portfolio` (bonus third comparison)

**Difficulty:** Medium — "all weather vs 60/40" is searched often; most content is not data-backed

**Internal links:** `/portfolios/ray-dalios-all-weather-portfolio`, `/portfolios/united-states-60-40-portfolio`, `/strategies/all-weather`, `/strategies/risk-parity`, `/methodology`

---

### Post 13
**Title:** Which Portfolios Survived the 2008 Financial Crisis Best? (Ranked by GFC Performance)

**Primary keyword:** `best portfolio 2008 financial crisis` — Informational / crisis research

**Why Medium:** High intent from investors who lived through 2008 and are planning for the next one. Your `cagr_gfc` field is a data asset almost no competitor can replicate.

**Outline:**
1. What the 2008 crisis actually looked like for different strategies — S&P 500 returned approximately -37% in 2008; frame this as the stress test every long-term investor should run their portfolio through
2. Top 5 GFC performers in your database — pull the five portfolios with the highest (least negative or positive) `cagr_gfc` from `portfolio_stats`; show GFC CAGR, max drawdown, and standard CAGR for context
3. Bottom 5 GFC performers — show what happened to the worst-hit strategies; these will likely be the most equity-heavy or momentum-based
4. The trade-off — strategies that survived 2008 best weren't always the best long-term compounders; pull rolling_10yr_avg to show the cost of defensiveness
5. What this tells us about portfolio design — diversification across economic environments (not just asset classes) is the lesson; link to all-weather and tactical strategy pages

**Portfolios to reference:** Pull dynamically — sort `portfolio_stats` by `cagr_gfc` for top and bottom 5. Likely strong GFC performers: `permanent-portfolio`, `ray-dalios-all-weather-portfolio`, `golden-butterfly-portfolio`, and tactical strategies that had exited equities.

**Difficulty:** Medium — emotional/high-intent keyword; requires presenting multiple portfolios comparatively

**Internal links:** `/strategies/all-weather`, `/strategies/tactical`, `/portfolio-screener` (filter by GFC CAGR), `/methodology`

---

### Post 14
**Title:** Tactical vs Buy-and-Hold: Do Active Rebalancing Strategies Actually Beat Passive Investing?

**Primary keyword:** `tactical vs buy and hold investing` — Informational / comparative

**Why Medium:** High-intent debate content; investors actively searching this are close to a strategy decision. Requires pulling two full sets of portfolio stats.

**Outline:**
1. Define the terms — tactical: rules-based signals tell you when to be in or out of assets; buy-and-hold: stay fully invested through all cycles and rebalance on a schedule
2. Performance comparison — pull average CAGR and average max drawdown for all "Tactical" category portfolios vs. all "Buy and Hold" category portfolios from your database; use medians to avoid outlier skew
3. The crash protection case for tactical — GFC and dotcom CAGR averages by category; tactical strategies often moved to cash in 2008; show the concrete difference
4. The whipsaw cost — tactical portfolios miss recovery rallies if signals don't re-enter in time; pull rolling_1yr_low for top tactical vs top buy-and-hold; show the worst single-year gaps
5. Tax and friction considerations — tactical strategies trigger more taxable events; mention this trade-off even if you can't quantify it; link to the screener where readers can filter by category

**Portfolios to reference:** `gem-dual-momentum`, `defensive-asset-allocation`, `vigilant-asset-allocation-g4-aggressive` (tactical); `united-states-60-40-portfolio`, `ray-dalios-all-weather-portfolio`, `bogleheads-three-fund-portfolio` (buy and hold)

**Difficulty:** Medium — ideological debate with strong existing content; your category-level aggregated data is the differentiator

**Internal links:** `/strategies/tactical`, `/strategies/simple`, `/database?cat=Tactical`, `/database?cat=Buy+and+Hold`, `/portfolio-screener`

---

### Post 15
**Title:** What Are Rolling Returns? Why They Tell You More Than Annual CAGR

**Primary keyword:** `rolling returns investing explained` — Educational / informational

**Why Medium:** Searched by more sophisticated investors; moderate competition; your rolling return data (1/3/5/10yr low/avg/high) is unusually rich.

**Outline:**
1. The problem with CAGR — a 10% CAGR tells you nothing about the *sequence* of returns; a portfolio might have great long-run returns but a terrible 5-year window right before your retirement
2. What rolling returns measure — rolling 3-year return means: for every possible 3-year period since 1970, what did this portfolio return? The distribution of those outcomes (low, average, high) tells you what to realistically expect
3. Real example using two portfolios — pull rolling_3yr_low, rolling_3yr_avg, rolling_3yr_high from `portfolio_stats` for `permanent-portfolio` vs `united-states-60-40-portfolio`; show that the Permanent Portfolio's floor is higher even if its ceiling is lower
4. The 10-year rolling window for retirement planning — rolling_10yr_low is the most retirement-relevant stat; which portfolios have the highest rolling 10-year floor? Pull top 5 from `portfolio_stats`
5. How to use this on PortfolioDB — link to portfolio screener rolling return sliders; guide to setting a minimum 10-year rolling average when screening

**Portfolios to reference:** `permanent-portfolio`, `united-states-60-40-portfolio`, `golden-butterfly-portfolio`, top rolling_10yr_low portfolios from live data

**Difficulty:** Medium — slightly advanced topic but unique data supports a standout post

**Internal links:** `/portfolio-screener`, `/methodology`, `/glossary-of-terms` (rolling returns entry)

---

### Post 16
**Title:** Vigilant Asset Allocation Review: Does This Momentum Strategy Outperform?

**Primary keyword:** `vigilant asset allocation strategy` — Informational

**Why Medium:** Tactical/momentum strategies attract investors who've outgrown simple portfolios. Two variants in the DB allow a meaningful comparison.

**Outline:**
1. What Vigilant Asset Allocation is — Wouter Keller and JW Grossman's rules-based momentum system; selects between risky assets and defensive assets based on recent momentum signals; trades monthly
2. G12 vs G4 Aggressive — G12 selects from 12 assets; G4 Aggressive narrows the universe to 4 aggressive assets; different risk profiles and signal frequency
3. Full stat comparison — CAGR, max drawdown, Sharpe, Sortino, Ulcer Index, best year, worst year for both variants; compare to `united-states-60-40-portfolio`
4. Crisis performance — GFC CAGR and dotcom CAGR for both; did VAA deliver on its crash-protection promise?
5. Who should consider it — requires monthly rebalancing discipline; tax-inefficient in taxable accounts; works best in tax-advantaged accounts; recommended minimum timeline

**Portfolios to reference:** `vigilant-asset-allocation-g12`, `vigilant-asset-allocation-g4-aggressive`, `united-states-60-40-portfolio`, `gem-dual-momentum`

**Difficulty:** Medium — specialist topic; your backtest data is the competitive differentiator

**Internal links:** `/portfolios/vigilant-asset-allocation-g12`, `/portfolios/vigilant-asset-allocation-g4-aggressive`, `/strategies/momentum`, `/strategies/tactical`

---

### Post 17
**Title:** Meb Faber's GTAA Portfolio: Does Global Tactical Asset Allocation Actually Work?

**Primary keyword:** `meb faber gtaa portfolio` — Informational

**Why Medium:** Faber has a dedicated readership; four GTAA variants in your DB is a rare comparative advantage.

**Outline:**
1. The GTAA concept — Faber's 2006 paper "A Quantitative Approach to Tactical Asset Allocation"; the 10-month moving average signal for each asset class; global diversification plus timing signals
2. The four variants — GTAA-5, GTAA-13, AGG-3, AGG-6; what the numbers mean (number of assets tracked); what "AGG" means in the aggressive variants
3. Performance across all four — CAGR, max drawdown, Sharpe for each from `portfolio_stats`; compare to `ivy-portfolio-faber`
4. Crash protection track record — GFC CAGR and dotcom CAGR across all four variants; does the more granular signal (GTAA-13) outperform the simpler one (GTAA-5) in crashes?
5. Practical friction — monthly rebalancing, potential tax drag; who this is realistically right for; link to the screener filtered to rules-based strategies

**Portfolios to reference:** `global-tactical-asset-allocation-5-gtaa-5-meb-faber`, `global-tactical-asset-allocation-13-gtaa-13-meb-faber`, `global-tactical-asset-allocation-agg-3-meb-faber`, `global-tactical-asset-allocation-agg-6-meb-faber`, `ivy-portfolio-faber`

**Difficulty:** Medium — specific researcher name drives targeted traffic; four variants make this a rare comparison

**Internal links:** `/strategies/tactical`, `/strategies/global`, `/portfolio-screener`, `/portfolios/ivy-portfolio-faber`

---

### Post 18
**Title:** Best Portfolios for Risk-Averse Investors: 7 Strategies With the Smallest Maximum Drawdowns

**Primary keyword:** `low drawdown portfolio strategies` — Informational / listicle

**Why Medium:** High intent from investors approaching or in retirement. Requires pulling and ranking multiple portfolios by max drawdown — your data makes this trivial to produce but impossible for most competitors.

**Outline:**
1. Why maximum drawdown matters more as you age — sequence-of-returns risk; a 40% drawdown at age 62 has a different consequence than at age 32
2. The 7 lowest max drawdown portfolios in the database — pull from `portfolio_stats` sorted by `max_drawdown` descending (least negative); include CAGR alongside so readers can see the trade-off
3. The CAGR cost of low drawdown — table showing the inverse relationship between max drawdown and long-term CAGR; every point of drawdown reduction typically costs some CAGR
4. The Ulcer Index angle — max drawdown only shows the worst single moment; introduce Ulcer Index here as a better measure of sustained pain; show which portfolios have the lowest Ulcer Index
5. How to screen for low-drawdown portfolios — walk through the screener's Max Drawdown filter; set minimum thresholds and watch which strategies remain

**Portfolios to reference:** Top 7 by max drawdown from live data. Likely candidates: `permanent-portfolio`, `ray-dalios-all-weather-portfolio`, `golden-butterfly-portfolio`, conservative income portfolios, possibly tactical strategies — pull actual rankings.

**Difficulty:** Medium — "low risk portfolio" is competitive; your ranking-by-data angle is the differentiator

**Internal links:** `/portfolio-screener`, `/glossary-of-terms` (max drawdown, Ulcer Index), `/methodology`, `/strategies/all-weather`

---

### Post 19
**Title:** The Larry Portfolio by Larry Swedroe: Is Small-Cap Value Worth the Extra Risk?

**Primary keyword:** `larry portfolio larry swedroe` — Informational

**Why Medium:** Factor investing audience is engaged and searches by author name; requires explaining Fama-French theory alongside the data.

**Outline:**
1. Swedroe's argument — size and value premiums are real, persistent, and compensated; by concentrating in small-cap value you can hold more bonds and still achieve equity-like returns; the "more efficient" portfolio thesis
2. Allocation breakdown — small-cap value equity heavy; significant bond allocation; what this looks like vs. a standard stock-bond portfolio
3. Backtested numbers — CAGR, max drawdown, Sharpe, Sortino from `portfolio_stats`; compare to `united-states-60-40-portfolio`
4. The small-cap value premium question — pull rolling_10yr_low and rolling_10yr_avg; are there 10-year windows where the premium didn't show up? (There are — 2010s were famously unkind to value)
5. Who this is and isn't for — requires conviction in factor theory to hold through long underperformance periods; high discipline required; link to factor-tilt strategy page

**Portfolios to reference:** `the-larry-portfolio-swedroe`, `united-states-60-40-portfolio`, `no-brainer-portfolio-bill-bernstein`

**Difficulty:** Medium — factor investing audience is specific but engaged

**Internal links:** `/portfolios/the-larry-portfolio-swedroe`, `/strategies/factor-tilt`, `/portfolio-screener`

---

### Post 20
**Title:** Adaptive Asset Allocation vs Defensive Asset Allocation: Which Tactical Strategy Is Better?

**Primary keyword:** `adaptive asset allocation vs defensive asset allocation` — Comparative

**Why Medium:** Both strategies are from the same research lineage; comparison content is rarely done well; your data makes a side-by-side trivial.

**Outline:**
1. The shared origin — both are systematic, rules-based momentum strategies from ReSolve Asset Management / Wouter Keller research; both allocate dynamically across global asset classes
2. Key differences — AAA: momentum + minimum variance optimization; DAA: defensive filter that moves to cash/bonds when momentum signals weaken; frequency of signal changes
3. Full stat comparison — CAGR, max drawdown, Sharpe, Sortino, Ulcer Index for both from `portfolio_stats`; include `protective-asset-allocation` as a third data point
4. Crisis and tail-risk performance — GFC CAGR and dotcom CAGR for both; which moved to safety faster in 2008?
5. Implementation reality — monthly rebalancing for both; tax-inefficient in taxable accounts; minimum timeline and temperament requirements

**Portfolios to reference:** `adaptive-asset-allocation`, `defensive-asset-allocation`, `protective-asset-allocation`, `vigilant-asset-allocation-g4-aggressive`

**Difficulty:** Medium — specialist audience; comparison not widely available elsewhere

**Internal links:** `/portfolios/adaptive-asset-allocation`, `/portfolios/defensive-asset-allocation`, `/strategies/tactical`, `/strategies/momentum`

---

## HARD (Posts 21–25)

---

### Post 21
**Title:** 10 Best Index Fund Portfolios Since 1970: Ranked by Risk-Adjusted Returns

**Primary keyword:** `best index fund portfolios` — Informational / listicle

**Why Hard:** "Best portfolios" is extremely competitive — every financial blog has a version. Winning requires being the most data-dense and clearly structured article on the topic.

**Outline:**
1. How this ranking works — explain the methodology: primary sort by Sharpe ratio (risk-adjusted returns), secondary filters by max drawdown and minimum 30-year data coverage; transparency matters here
2. The top 10 table — pull top 10 by Sharpe from `portfolio_stats`; columns: Rank, Portfolio Name, CAGR, Max Drawdown, Sharpe, Category; link each portfolio name to its detail page
3. Breakdown of what the top performers have in common — pattern analysis: are they mostly tactical? All-weather? Factor-tilted? What can readers learn from the distribution?
4. The CAGR-first alternative ranking — re-sort by CAGR instead of Sharpe; show how the list changes; illustrate the risk-vs-return trade-off concretely
5. How to build your own ranking — walk through the Portfolio Screener column picker; explain how to sort by any combination of stats; CTA to explore

**Portfolios to reference:** Top 10 by Sharpe from live data — pull dynamically from `portfolio_stats`. DAA likely leads at Sharpe 0.98 per live data.

**Difficulty:** Hard — extremely competitive keyword; your real backtested data from 1970 is the only differentiator that can outrank generic "best portfolios" listicles

**Internal links:** `/portfolio-screener`, `/methodology`, `/database`, `/strategies/tactical`, `/strategies/all-weather`

---

### Post 22
**Title:** What the Dot-Com Crash Revealed About Portfolio Design (2000–2002 Analysis)

**Primary keyword:** `portfolio performance dot com crash 2000 2002` — Informational / historical

**Why Hard:** Historical analysis requires framing and interpretation, not just data. But the dotcom crash is underanalyzed vs. 2008 — less competition for this angle.

**Outline:**
1. Why the dot-com crash is the underappreciated stress test — 2008 gets all the attention but 2000–2002 was a 3-year sustained drawdown for US equity; technology-heavy portfolios lost 70–80%; bonds and gold actually helped
2. Best and worst performers 2000–2002 — pull the top 5 and bottom 5 by `cagr_dotcom` from `portfolio_stats`; table with dotcom CAGR, standard CAGR, and max drawdown side by side
3. What made the difference — portfolios with gold, bonds, and international diversification largely survived; pure US equity exposure was devastating; cross-reference allocations of top/bottom performers
4. Tactical strategies in 2000–2002 — did momentum signals exit before the crash? Pull dotcom CAGR for GTAA, dual momentum variants, VAA; show which ones actually protected capital
5. The lesson for today — technology is again a large % of US equity indices; what 2000–2002 tells investors about concentration risk; link to portfolios that historically diversify away from single-sector concentration

**Portfolios to reference:** Top and bottom 5 by `cagr_dotcom` from live data. Likely good performers: `permanent-portfolio`, `golden-butterfly-portfolio`, tactical strategies. Pull dynamically.

**Difficulty:** Hard — historical analysis requires original framing; lower search volume but high shareability and link potential

**Internal links:** `/portfolio-screener` (filter by Dotcom CAGR), `/strategies/all-weather`, `/strategies/tactical`, `/methodology`

---

### Post 23
**Title:** The 5 Best Momentum Strategies: Backtested vs Buy-and-Hold Since 1970

**Primary keyword:** `momentum investing strategy backtested results` — Informational / comparative

**Why Hard:** Momentum investing is a well-covered topic in academic and practitioner circles; standing out requires comprehensive multi-strategy comparison with real data.

**Outline:**
1. What momentum investing actually is — price momentum (recent winners tend to continue); relative vs. absolute momentum; why it works (behavioral finance: underreaction and herding)
2. The five strategies ranked — pull CAGR, max drawdown, Sharpe from `portfolio_stats` for all momentum-tagged portfolios: `gem-dual-momentum`, `composite-dual-momentum`, `accelerating-dual-momentum`, `generalized-protective-momentum`, `kipnis-defensive-adaptive-asset-allocation-kda`; rank by Sharpe
3. The crash protection test — GFC CAGR and dotcom CAGR for all five; momentum's key promise is getting out before major crashes; does the data support this?
4. Momentum vs. buy-and-hold head-to-head — compare the median CAGR and median max drawdown of the five momentum strategies against `united-states-60-40-portfolio` and `bogleheads-three-fund-portfolio`
5. The whipsaw problem — pull rolling_1yr_low for all five; show the worst single-year outcomes; a -15% year after a momentum strategy signals wrong is a real investor experience; who can stomach this?

**Portfolios to reference:** `gem-dual-momentum`, `composite-dual-momentum`, `accelerating-dual-momentum`, `generalized-protective-momentum`, `kipnis-defensive-adaptive-asset-allocation-kda`, `united-states-60-40-portfolio`

**Difficulty:** Hard — competitive space; researchers and practitioners publish extensively on this topic

**Internal links:** `/strategies/momentum`, `/strategies/tactical`, `/portfolio-screener`, `/methodology`

---

### Post 24
**Title:** Ulcer Performance Index vs Sharpe Ratio: Which Risk Metric Is Better for Retirement Investors?

**Primary keyword:** `ulcer performance index vs sharpe ratio` — Informational / analytical

**Why Hard:** Deep educational content requiring financial literacy; essentially no competition for this specific comparison — most content only covers Sharpe vs. Sortino. Potential to own this keyword permanently.

**Outline:**
1. The problem with Sharpe Ratio — it treats upside and downside volatility equally; a portfolio that has big up years gets *penalized* the same way a portfolio with big down years does; this is backwards for risk-averse investors
2. How Sortino fixed half the problem — Sortino only counts downside volatility; better for investors who care about drawdowns; but still doesn't capture *duration* of pain, only magnitude
3. What Ulcer Index adds — captures both depth AND duration of drawdowns; a portfolio that falls 20% and recovers in 2 months is very different from one that falls 20% and stays down for 18 months; Ulcer Index penalizes the latter appropriately
4. UPI as the logical conclusion — same structure as Sharpe; CAGR divided by Ulcer Index instead of standard deviation; pull UPI values for 5–6 portfolios from `portfolio_stats` and compare their Sharpe rank vs. UPI rank — show how the rankings shift
5. Practical guidance — for accumulation phase investors with 20+ year horizons, Sharpe is adequate; for investors within 10 years of retirement or already drawing down, UPI and Ulcer Index deserve equal or more weight; link to screener where both stats are filterable

**Portfolios to reference:** 5–6 portfolios where Sharpe rank and UPI rank diverge meaningfully — pull from live data to find real examples. Check `defensive-asset-allocation` and `ray-dalios-all-weather-portfolio` as likely candidates.

**Difficulty:** Hard — deep analytical content; you essentially own this comparison because you're one of very few sites surfacing UPI

**Internal links:** `/portfolio-screener`, `/methodology`, `/glossary-of-terms`, `/portfolios/defensive-asset-allocation`, `/portfolios/ray-dalios-all-weather-portfolio`

---

### Post 25
**Title:** What the Best (and Worst) 3-Year Rolling Windows Look Like for 5 Popular Portfolios

**Primary keyword:** `rolling 3 year returns index fund portfolios` — Informational / data

**Why Hard:** Requires pulling and presenting rolling return data in a compelling, readable format. But this is a genuine data journalism piece that could earn links from personal finance blogs.

**Outline:**
1. The problem with point-in-time returns — a portfolio that averaged 9% CAGR might have also had a 3-year window where it returned -4% annualized; that 3-year window is exactly when investors panic and sell; understanding the distribution matters more than the average
2. The five portfolios — `united-states-60-40-portfolio` (benchmark), `permanent-portfolio` (low-variance), `gem-dual-momentum` (tactical/momentum), `vigilant-asset-allocation-g4-aggressive` (aggressive tactical), `golden-butterfly-portfolio` (all-weather); pull rolling_3yr_low, rolling_3yr_avg, rolling_3yr_high for all five
3. The floor comparison — show rolling_3yr_low for all five in a table; which had the highest floor (best worst case)? Which had the lowest floor (worst worst case)? Frame this as sequence-of-returns risk
4. The ceiling comparison — rolling_3yr_high for all five; which caught the best market tailwinds? Tactical strategies likely have wider ranges (higher highs, but also lower lows in whipsaw years)
5. The behavioral insight — investor experience is defined by their worst 3-year window more than their long-run CAGR; use rolling return range width (high minus low) as a measure of "predictability"; link to the screener where readers can find portfolios with tight rolling return ranges

**Portfolios to reference:** `united-states-60-40-portfolio`, `permanent-portfolio`, `gem-dual-momentum`, `vigilant-asset-allocation-g4-aggressive`, `golden-butterfly-portfolio`

**Difficulty:** Hard — data journalism format; harder to write but generates natural inbound links from other finance blogs

**Internal links:** `/portfolio-screener`, `/methodology`, `/glossary-of-terms`, all five portfolio detail pages
