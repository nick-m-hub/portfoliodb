# PortfolioDB — Task Backlog
# Items to pick up in future sessions.

---

## In Progress / Next Up

_(nothing currently in progress)_

---

## Backlog

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
- [x] GitHub SSH auth — switched remote from HTTPS to SSH (ed25519 key, macOS Keychain)
- [x] Vercel TypeScript build errors — `getPortfolioNames() ?? []` in layout.tsx + JSDoc type annotation in Navbar.jsx
- [x] Canonical tags — NEXT_PUBLIC_SITE_URL env var set in Vercel; all pages now emit correct production canonical URLs
- [x] Sitemap audit — all 70 portfolio slugs confirmed present in /sitemap.xml
- [x] PageSpeed Insights (55 → 75) — narrowed Material Symbols font axes to single values, added preconnect hints, browserslist config, WCAG contrast fixes on homepage
- [x] Mobile nav fix — Database/Screener links now show in a second row on mobile via `flex md:hidden` row in Navbar.jsx
- [x] Mobile filter toggle — "Filters" button added to DatabaseClient.jsx and ScreenerClient.jsx; sidebar hidden by default on mobile, toggled with showFilters state
- [x] Mobile table horizontal scroll — overflow-x-auto wrapper + min-w-[600px] on Database list view table; min-w-[700px] on Screener table
- [x] Site footer — Footer.jsx component with copyright + nav links; added to layout.tsx (site-wide); Methodology link points to /methodology
- [x] Methodology page — app/methodology/page.js with 6 sections, design tokens, NEXT_PUBLIC_SITE_URL canonical, generateMetadata()
- [x] Database index — `idx_monthly_returns_slug_date` on `monthly_returns(portfolio_slug, date)` to speed up materialized view refresh
- [x] portfolio_stats view updated — added `kofi_link` column (pass-through from portfolios table)
- [x] Ko-fi trade signals CTA — two placements on portfolio detail pages (hero + sidebar); conditional on `kofi_link` being non-null in DB
- [x] Navbar logo — replaced Material Symbols analytics icon with custom SVG (portfoliodb-icon.svg in public/)
- [x] Sitemap fix — added /methodology to staticPages array in app/sitemap.js
- [x] OG images — dynamic per-portfolio (app/portfolios/[slug]/opengraph-image.js) + homepage fallback (app/opengraph-image.js); Manrope TTF fonts stored in public/fonts/; twitter:card updated to summary_large_image
- [x] Related Portfolios section — bottom of every portfolio detail page; getRelatedPortfolios(slug) in lib/db.js ranks by same category + strategy tag overlap
- [x] Popular links — hardcoded to All-Weather, Permanent Portfolio, Bogleheads Three-Fund with correct /portfolios/[slug] hrefs
- [x] Top Strategies section — renamed from "Benchmark Strategies"; TopStrategies.jsx client component with Sharpe/CAGR/Min Drawdown dropdown; data pre-computed server-side from getAllAllocations()
- [x] Portfolio descriptions — markdown rendering fixed (react-markdown replaces stripMarkdown); all 49 description drafts written to description-drafts/ folder following DB format spec (see CLAUDE.md for rules); ready to paste into Supabase
- [x] Description draft quality review — all 45 original agent-written drafts audited; 9 rewritten with web research to fix vague content, wrong creator attributions, and invalid internal links; Paired Switching corrected to Lewis A. Glenn (SSRN 2437049) after initial agent misattributed it
- [x] WebSearch + WebFetch permissions — added to ~/.claude/settings.json globally so background agents can research portfolios
