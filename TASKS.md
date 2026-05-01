# PortfolioDB — Task Backlog
# Items to pick up in future sessions.

---

## In Progress / Next Up

_(nothing currently in progress)_

---

## Backlog

_(no open items)_

---

## Completed

- [x] Tailwind CSS v4 design tokens (globals.css)
- [x] Root layout — Manrope/Inter fonts, Material Symbols, Navbar
- [x] Homepage (app/page.tsx) — hero, filter bar, AI recommend, benchmark cards, premium section
- [x] FilterBar.jsx — category dropdown, risk 1–5 buttons, max drawdown input, navigates to /database
- [x] AIRecommend.jsx — AI-powered portfolio search using claude-haiku-4-5
- [x] app/api/screener/route.js — Anthropic API endpoint
- [x] Database page (app/database/page.js + DatabaseClient.jsx) — grid/list view, sidebar filters (Category, Risk Level, Asset Exposure, Strategy, Max Drawdown), sort
- [x] Portfolio Screener page (app/portfolio-screener/page.js + ScreenerClient.jsx) — 11 performance sliders, collapsible asset class list, asset exposure buckets, table, CSV export
- [x] Portfolio Detail page (app/portfolios/[slug]/page.js) — hero, donut chart, performance snapshot (with 10yr CAGR, Ulcer Index, UPI, GFC/Dotcom CAGR), rolling returns summary table, charts section
- [x] AllocationDonut.jsx — server-renderable SVG donut chart
- [x] GrowthChart.jsx — Recharts area chart for Growth of $10K (with optional benchmark overlay + Full/10Y toggle)
- [x] DrawdownChart.jsx — Recharts area chart for Historical Drawdown (with optional benchmark overlay)
- [x] RollingReturnChart.jsx — Recharts line chart for 1Y/3Y/5Y/10Y rolling returns (with optional benchmark overlay)
- [x] ChartsSection.jsx — client wrapper owning benchmark toggle and Full/10Y toggle state
- [x] lib/db.js — getAllAllocations(), getAssetClasses(), getMonthlyReturns(), getAllPortfolioStrategies()
- [x] stripMarkdown() — handles **bold**, [links](url), and literal \n sequences from DB
- [x] generateStaticParams() + generateMetadata() on portfolio detail pages
- [x] Sitemap, robots.txt, JSON-LD structured data
- [x] US 60/40 benchmark overlay on all three portfolio detail charts
- [x] portfolio_strategies table integration — Strategy filter on Database page
- [x] Growth of $10K chart — log scale by default with Log / Linear toggle (ChartsSection + GrowthChart)
- [x] Navbar search — live portfolio search with dropdown, navigates to portfolio detail page (NavSearch.jsx + layout.tsx)
