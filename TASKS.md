# PortfolioDB — Task Backlog
# Items to pick up in future sessions.
# See also: content-calendar.md — 25-post SEO content calendar with full outlines, keywords, and portfolio slugs.

---

## In Progress / Next Up

- [x] **Tactical portfolio automation — Keller et al. family** — `tactical/keller.py` implements PAA, VAA G4, VAA G12, DAA, GPM, KDA, AAA. All 7 registered in SIGNAL_REGISTRY. numpy + scipy added to requirements.txt. 28 total automated tactical portfolios. Only remaining: "The Trend is Our Friend - Global" (no source docs available yet).

- [x] **Tactical portfolio automation — "The Trend is Our Friend - Global"** — Implemented in `tactical/rules_based.py`. Risk-parity (inverse-volatility) weighting across 7 global asset classes (SPY, EEM, IEF, BWX, DBC, VNQ, RWO); 10-month SMA filter redirects failing assets to BIL. 29 tactical portfolios now fully automated. (May 2026)

- [ ] **Blog content** — Post 1 published 2026-05-16. Next recommended: Post 2 (Permanent Portfolio Review) or Post 3 (All-Weather Portfolio Review) — both high search volume, easy to produce. See `content-calendar.md` for full outlines and SQL queries to pull fresh stats before writing.

- [x] **Shrink hero stat cards (May 2026)** — Switched from `flex flex-wrap` to `grid grid-cols-2 lg:grid-cols-4` so 4 tiles always stay in one row on desktop and max 2 rows on mobile. Reduced padding (`px-6 py-4` → `px-4 py-3`) and number font size (`text-[36px]` → `text-[26px]`). Empty `hidden lg:block` div fills the 4th slot when YTD Return is null.

- [x] **Signal Teaser + portfolio page layout overhaul (May 2026)** — `components/SignalTeaser.jsx` added: blurred placeholder ticker rows + lock overlay, links to `/membership`, only renders on covered portfolios. Hero CTA card removed on covered portfolios (Teaser replaces it). Portfolio detail page restructured to lead with data: first description paragraph stays in hero, Investment Philosophy/Who It's For/Pros/Cons moved to a card after the charts. Membership page: "+ N more portfolios" count made dynamic (`signalCount - 3`); main CTA button changed to "Subscribe on Ko-fi".

- [x] **Lead magnet visibility + homepage flow improvements (May 2026)** — `EmailCapture.jsx`: added "Free Report" badge + `picture_as_pdf` icon, replaced question headline with actual report title, updated subline to name the PDF format. Homepage: moved EmailCapture above Top Strategies (now directly below hero); removed redundant compact membership callout banner; Premium section headline updated to "Monthly Signals for {signalCount} Portfolios" (live count). `AIRecommend.jsx`: placeholder updated to goal-based language ("saving for retirement in 20 years") instead of jargon ("high growth with low volatility").

---

## Reminders

- [ ] **Email funnel review (check ~2026-06-01)** — Welcome sequence went live 2026-05-16. Review in MailerLite:
  - Open rates (benchmark: 25–30% for finance)
  - Click rate on Email 2 (signals database interest)
  - Drop-off between Email 3 and Email 4 (high unsubscribes = Email 3 needs tightening)
  - Ko-fi conversion on Email 4 (good open rate but low clicks = offer framing needs work)

---

## Backlog

- [x] **Kit → MailerLite migration** — Replaced Kit V3 API with MailerLite in `app/api/subscribe/route.js`. New env vars: `MAILERLITE_API_KEY` (Sensitive) + `MAILERLITE_GROUP_ID` (187575433316795808 = "General Email List"). Set in Vercel. Kit env vars (`KIT_API_KEY`, `NEXT_PUBLIC_KIT_FORM_ID`) can be removed from Vercel.

- [x] **Lead magnet + email welcome sequence** — PDF report ("How Index Fund Portfolios Performed in the Two Worst Crashes of the Last 25 Years") set as lead magnet. `EmailCapture.jsx` copy updated. 4-email MailerLite automation built and live as of 2026-05-16 (see CLAUDE.md for sequence details).

- [x] **Fix #1 — Signal email example on membership page** — "What a signal looks like" section added to `app/membership/page.js`. Mock email card shows portfolio name headers with ticker/allocation pill badges (real data: ADM, Composite DM, GEM DM). Format reflects actual signal email style rather than a generic table.

- [x] **Fix #2 — Fix dead-end CTA on non-covered portfolio pages** — Non-covered portfolios now show a compact neutral card (no green background) in both hero and sidebar locations, explaining signals cover tactical portfolios only, with 'See covered portfolios →' link to `/membership`. Covered portfolios keep the full green card.

- [x] **Fix #3 — Email capture for non-members** — `components/EmailCapture.jsx` (client) + `app/api/subscribe/route.js` (Kit V3 API, server-side). Placed on homepage (below Top Strategies), membership page (above price callout), and portfolio detail pages (below Related Portfolios). Uses Kit V3 API Secret + numeric form ID 9435321 (Clare form). All env vars set in Vercel.

- [x] **Fix #5A — Make social proof prominent (trust badge)** — Trust badge moved between H1 and subheadline in `app/page.tsx`; styled as pill badge (`bg-surface-container-low`, `border-outline-variant`, `rounded-full`, `check_circle` icon); count updated to "20,000+ DIY Investors". Part B (manual, pending): gather 2–3 testimonial quotes from Ko-fi members/readers, then add a testimonial strip between hero and Top Strategies.

- [x] **Fix #6 — Lead membership page with top performer stats** — Three-card stats strip added to `app/membership/page.js` between hero and "What's included". Hardcoded: Top Sharpe 0.98 (DAA), Top CAGR 16.1% (Vigilant G4), Best Worst Year -8.4% (DAA). Backtested disclaimer caption below.

- [x] **Fix #7 — Surface Methodology link in content flow** — Part A: `app/portfolios/[slug]/page.js` shows "How are these calculated? →" link below 'Performance Snapshot' heading. Part B: `components/ScreenerClient.jsx` shows same link inline in the strategy count paragraph.

- [x] **Fix #9 — Mobile screener UX: filters before results** — `showFilters` default changed to `true` in `components/ScreenerClient.jsx`. Sticky "Show Results (N)" pill button added (`fixed bottom-4 left-4 right-4 lg:hidden z-50`); appears when filters are open; closes filters on click.

- [x] **Fix #10 — Stat tooltips throughout the site** — `components/StatTooltip.jsx` (client, `position: fixed` tooltip escaping `overflow-hidden`; hover + click; `e.stopPropagation()`). `lib/statDefinitions.js` (plain JS, 19 stat definitions, importable by both server and client components). Tooltips wired to all 11 StatRow entries on portfolio detail pages and all 11 Advanced Filters sliders in screener sidebar. Tooltips intentionally NOT added to screener table column headers (didn't look right there).

- [x] **Fix #12 — Mobile horizontal overflow (site-wide audit)** — Root cause: `<main>` elements are flex items inside the `flex flex-col` body and expand to fit content rather than the viewport. Fixed all affected pages: strategy detail (`w-full overflow-x-hidden` on `<main>`), homepage (`gap-y-8 md:gap-8` to prevent 12-column grid gap overflow), EmailCapture (input `flex-1 min-w-0` on mobile), ChartsSection (`overflow-hidden` on all 3 chart cards to contain portfolio name legend), ScreenerClient toolbar stacked to `flex-col sm:flex-row`, membership page (`w-full overflow-x-hidden` on `<main>`).

- [x] **Returns automation — Muscular Portfolios tactical family** — `tactical/muscular_portfolios.py` implements: Mama Bear (top-3 of 9-asset universe by 5-month return; BIL in universe as defensive) and Papa Bear (top-3 of 14-asset universe by avg 3/6/12-month composite momentum; always invested). 19 tactical slugs now automated total.

- [x] **Returns automation — Alpha Architect RAA tactical family** — `tactical/alpha_architect.py` implements: RAA Aggressive (80/10/10 equity/real/bonds) and RAA Balanced (40/40/20). Dual-signal framework: TMOM (12M excess return vs BIL) + MA (price vs 10M SMA). Both signals positive → 100% weight; one positive → 50% asset + 50% BIL; neither → 100% BIL. Base weights: Aggressive MTUM/IWD/EFV/EFA 20% each, VNQ/DBC 5% each, IEF 10%; Balanced MTUM/IWD/EFV/EFA 10% each, VNQ/DBC 20% each, IEF 20%. 21 tactical slugs now automated total.

- [x] **Returns automation — simple rules-based tactical family** — `tactical/rules_based.py` implements: Tactical Permanent (rules corrected May 2026 — see below), Three-Way Model (3M vs 10M SMA on SPY/TLT/GLD), Paired Switching (3M SPY vs TLT), Quint Switching Filtered (unanimity filter + top-1 of 5), Trend Following Bonds (dual momentum on 8-asset bond universe, top 3), Stoken's ACA (3-sleeve price channel with prior-state continuity). `stage0_signals.py` updated with `inspect`-based 3-arg dispatch for Stoken prior-holdings query. 17 slugs now automated total.

- [x] **Returns automation — Phases 1–4 + Dual Momentum + GTAA tactical families** — Staging table + review view in Supabase. Python scripts in `scripts/auto-returns/`: Stage 0 (tactical signals, manual on last trading day), Stage 1 (B&H + tactical returns, cron 3rd of month), Stage 2 (promote, manual). `tactical/dual_momentum.py` implements GEM, GEM+EM, Diversified GEM, Composite DM, Accelerating DM. `tactical/gtaa.py` implements Ivy Timing, Ivy Rotation, GTAA 5, GTAA 13, GTAA AGG 3, GTAA AGG 6. `tactical_monthly_holdings` table stores monthly holdings per tactical portfolio. `SIGNAL_REGISTRY` in stage0_signals.py — add one line per new portfolio. GitHub Actions: Stage 0 manual-only, Stage 1 cron, Stage 2 manual. April 2026 returns live.

- [x] **YTD Return stat (May 2026)** — Added `ytd_return` CTE to `portfolio_stats` materialized view (source of truth: `scripts/portfolio_stats_view.sql`). Surfaced on portfolio detail page (hero tile alongside CAGR/MaxDD/Sharpe + StatRow in Performance Snapshot), screener table (default-on YTD column, neutral color), and database list view table. No '+' prefix — green for positive, red for negative, hidden if null.

- [x] **portfolio_stats_view.sql created (May 2026)** — `scripts/portfolio_stats_view.sql` is now the source of truth for the full materialized view definition (DROP + CREATE). To add a column: edit this file first, then paste into Supabase SQL Editor. Eliminates needing to query pg_views to get the current definition.

- [x] **Stage 2 bug fix — tactical returns not being promoted (May 2026)** — `stage2_promote.py` had a non-tactical slug filter that silently excluded all tactical portfolios from promotion. Stage 1 was correctly writing tactical returns to staging and the summary email included them, but Stage 2 never inserted them into `monthly_returns`. Fix: removed the filter so Stage 2 promotes all pending staging rows regardless of category. Also fixed a missing `import os` that would have caused a `NameError` on flagged-row paths in GitHub Actions.

- [x] **Tactical Permanent Portfolio rules corrected (May 2026)** — Old implementation used TLT, 10-month SMA, equal 25% weights. Rewritten in `tactical/rules_based.py` to match GestaltU rules: universe SPY/IEF/GLD, 200-day MA filter on daily prices, 1/vol risk parity (21-day annualized daily vol), portfolio vol target 7% via 60-day covariance matrix (no leverage if vol ≤ 7%; scale down + add BIL if vol > 7%). Three new helpers: `_above_200dma()`, `_daily_returns_n()`, `_portfolio_annualized_vol()`. April 2026 return recalculated via one-off script `scripts/auto-returns/calc_april_tactical_permanent.py`.

- [ ] **Fix #11 — Signal email automation + Brief market context** — Build a Claude-powered workflow to auto-generate the monthly signal email with a brief market context paragraph (what drove changes that month). Once the automation is in place, add "Brief market context" back to the 'What you get each month' list in `app/membership/page.js` (it was removed May 2026 pending automation). Prompt template already designed — see session history.

- [ ] **Returns automation — rebalancing frequency** — Stage 1 calculates buy-and-hold portfolio returns using fixed target weights from the `allocations` table every month, which is mathematically equivalent to monthly rebalancing. True buy-and-hold would require tracking drifted weights over time. Monthly rebalancing is the industry standard (used by Portfolio Visualizer, etc.) and produces a small rebalancing bonus vs. annual or no rebalancing. Consider adding annual rebalancing as an option if precision becomes a priority.

- [ ] **Fix #13 — Non-render-blocking Material Symbols font** — The Material Symbols CSS `<link rel="stylesheet">` in `app/layout.tsx` is render-blocking, costing ~150ms on FCP (flagged by PageSpeed Insights, May 2026). Fix: change to `rel="preload" as="style"` + `onLoad="this.rel='stylesheet'"` pattern with a `<noscript>` fallback. Icons will be briefly unstyled (show as text characters) until the font loads — acceptable trade-off. Expected improvement: ~3–5 PageSpeed points.

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
- [x] GitHub SSH auth — switched remote from HTTPS to SSH (ed25519 key, macOS Keychain); configured `~/.ssh/config` with `UseKeychain yes` + `AddKeysToAgent yes` (May 2026) so Claude Code subprocesses can push directly without an interactive terminal session.
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
- [x] 19 new description drafts — coffeehouse, permanent, all-weather, 60/40, golden butterfly, GEM, GEM emerging markets, composite dual momentum, accelerating dual momentum, AAA, PAA, DAA, gone fishin, andrew tobias, quint switching filtered, stoken ACA, three-way model, GTAA AGG 3, GTAA AGG 6
- [x] scripts/update-descriptions.js — bulk-pushes all description-drafts/*.md to Supabase using service role key; run with `node scripts/update-descriptions.js`
- [x] Description moved below stat tiles on portfolio detail pages (portfolios/[slug]/page.js)
- [x] Screener column picker — Columns dropdown with 23 toggleable columns (Performance Benchmarks + Rolling Returns Low/Avg/High); CAGR/Max DD/Sharpe on by default; +N badge; Reset to defaults; CSV export reflects visible columns
- [x] Membership CTA copy updated — hero + sidebar cards on portfolio detail pages refreshed with new copy; all buttons route to /membership (not Ko-fi directly)
- [x] Homepage membership callout banner — compact single-row banner between hero and Top Strategies; shows live signal portfolio count from DB
- [x] Homepage Premium section — headline updated to "Monthly Rebalancing Guidance"; pricing card replaced with pill link to /membership; cancel copy retained
- [x] /membership page — app/membership/page.js with price ($19/mo), what's included, what you get each month, signal portfolio list, disclaimer; generateMetadata(); /membership added to sitemap
- [x] getSignalPortfolios() + getSignalPortfolioCount() — added to lib/db.js; query portfolios where kofi_link IS NOT NULL; used by homepage banner and membership page
- [x] Portfolio detail CTA cards always rendered — kofi_link used as copy switcher (covered vs. not-covered variants) rather than on/off conditional; both hero + sidebar cards appear on every portfolio page
- [x] Membership link — added to Navbar (desktop + mobile row) and Footer
- [x] WordPress redirect rules — `/portfolios` and `/timeline-risk/:path*` both redirect to `/database` via `next.config.ts`; all portfolio slugs confirmed present in Next.js DB (no per-portfolio redirects needed)
- [x] QA pass (May 2026) — all pages load with real Supabase data, no console errors, no broken images, sitemap has 76 URLs (6 static + 70 portfolios), robots.txt correct, /api/test-db returns 200
- [x] Glossary of Terms page — 30 terms across 14 letter sections (A–V); alphabet anchor nav; links to Methodology page and related portfolios; `generateMetadata()` with canonical/OG/Twitter tags.
- [x] Fix #4 — Hero H1 rewritten to '70+ Portfolio Strategies, Backtested Since 1970'; subheadline updated; 'Backtested Since 1970' styled green in existing span; `<br />` restored.
- [x] Fix #8 — Top Strategies default metric changed from Sharpe to CAGR (`useState('cagr')` in `components/TopStrategies.jsx`).
- [x] Footer Glossary link — added 'Glossary' link to `components/Footer.jsx` nav list.
- [x] GA4 fix — `GoogleAnalytics.jsx` was gating on `NEXT_PUBLIC_VERCEL_ENV === 'production'` (Vercel never sets this); replaced with `window.location.hostname === 'portfoliodb.co'` check inside the inline gtag script. `NEXT_PUBLIC_GA_MEASUREMENT_ID` also added to Vercel environment variables (Production) and redeployed.
- [x] QA pass #2 (May 2026) — all 11 checks passed: homepage real data, 3 portfolio detail pages (CAGR/Sharpe/MaxDD confirmed), /database 70 portfolios, /portfolio-screener 11 sliders, /glossary-of-terms, /methodology, /sitemap.xml 76 URLs, /robots.txt Disallow:/api/ only, both WP redirects (/portfolios + /timeline-risk/:path*) land on /database, /api/test-db 200, no broken images or console errors.
- [x] Vercel Analytics — `@vercel/analytics` installed; `<Analytics />` added to `app/layout.tsx`
- [x] Strategies pages — `app/strategies/page.js` (index grid, portfolio counts) + `app/strategies/[slug]/page.js` (SSG detail pages, 2-para intro, ranked comparison table). 12 strategy types, all pre-generated at build. Sitemap updated (89 URLs total). Navbar "Strategies" link added (desktop + mobile).
- [x] lib/db.js — `getPortfoliosByStrategy(slug)`, `getAllStrategiesWithCounts()` added
- [x] Fix #1 — Signal email example on membership page (see Backlog above)
- [x] Fix #2 — Dead-end CTA on non-covered portfolio pages (see Backlog above)
- [x] Fix #3 — Email capture (see Backlog above)
- [x] SEO content calendar — 25-post calendar created in `content-calendar.md`; posts sorted Easy/Medium/Hard with full outlines, primary keywords, portfolio slugs, and internal links. Writing prompt template included at top of file.
- [x] Blog — `app/blog/page.js` (index, static), `app/blog/[slug]/page.js` (post, dynamicParams: true + react-markdown + remark-gfm), 3 db.js functions (getBlogPosts, getBlogPost, getAllBlogSlugs), sitemap updated. Publishing a post requires only a Supabase insert with status='published' — no redeploy needed.
- [x] Blog Post 1 published — "What Is the Ulcer Index?" (`/blog/what-is-the-ulcer-index`), published 2026-05-16. Used live portfolio_stats data for all numbers.
- [x] Blog footer link — Added 'Blog' to `components/Footer.jsx` nav list (between Membership and Terms of Service). Intentionally kept out of navbar to avoid clutter; revisit when blog has 5–10 posts.
- [x] remark-gfm — Added to `app/blog/[slug]/page.js` to fix markdown table rendering. Required for any post with a comparison table.
- [x] **US Stock Market + Global Stock Market portfolios (May 2026)** — Two new Buy and Hold portfolios added. US Stock Market: VFINX proxy Jan 1980–May 2001, VTI Jun 2001–present. Global Stock Market: MSCI ACWI Index daily data Jan 1999–Jun 2008, VT Jul 2008–present. New `Global Stocks` asset class (#2E75B6) added to `asset_classes`. Backfill scripts: `scripts/auto-returns/backfill_us_stock_market.py` and `backfill_global_stock_market.py`. Stage 1 handles both automatically going forward (43 total B&H + Robo-Advisor portfolios).
- [x] **Compare to benchmarks expanded (May 2026)** — Portfolio detail charts now offer three benchmark options: US 60/40, US Stocks, Global Stocks. Each page's own slug is automatically excluded. `ChartsSection.jsx` uses `selectedBenchmark` state (slug string, not boolean); `benchmarks` prop is an object keyed by slug. `alignGrowthToCommonStart()` normalizes both lines to $10,000 at the first common year. All three chart tooltips (Growth, Drawdown, Rolling Returns) show the dynamic benchmark label instead of hardcoded "60/40".
- [x] **Portfolio Comparison page (May 2026)** — `/compare` page with up to 4 portfolios side-by-side. Server component reads `?slugs=` param and fetches all data. `CompareClient.jsx` handles search/add/remove via `useTransition` + `router.push`. Stats table uses site-standard green/red for positive/negative values; winner per stat gets a subtle green cell background + `emoji_events` trophy icon. Growth chart normalized to the shortest common lookback period (`mergeGrowthData` re-indexes all portfolios to $10K at the latest start year). `CompareGrowthChart.jsx` is a multi-line Recharts `LineChart` with `connectNulls={false}`. "Compare This Portfolio" button added to every portfolio detail page hero. Compare link added to navbar (desktop + mobile). `/compare` added to sitemap.
