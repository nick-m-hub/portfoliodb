# PortfolioDB — Task Backlog
# Items to pick up in future sessions.

---

## In Progress / Next Up

_(nothing currently in progress)_

---

## Backlog

- [ ] **Fix #1 — Signal email example on membership page** — Add a "What a signal looks like" section in `app/membership/page.js` between the 'What you get each month' list and the signal portfolio list. Mock email preview card with a 3-row table (Portfolio / Signal / Action), 'Example — April 2025 Signal' label, and one-sentence disclaimer below.

- [ ] **Fix #2 — Fix dead-end CTA on non-covered portfolio pages** — In `app/portfolios/[slug]/page.js`, portfolios where `kofi_link` IS NULL currently show nothing useful. Replace with a smaller alternative CTA card in both the hero and sidebar locations explaining signals cover tactical portfolios only, with a 'See covered portfolios →' link to `/membership`.

- [ ] **Fix #3 — Email capture for non-members** *(requires Kit account first)* — New `components/EmailCapture.jsx` client component (compact horizontal card, email input, 'Subscribe free' button, posts to Kit API via `NEXT_PUBLIC_KIT_FORM_ID`). Place in: membership page (above price callout), homepage (below Top Strategies), portfolio detail pages (below Related Portfolios). Add `NEXT_PUBLIC_KIT_FORM_ID` to `.env.local` and Vercel.

- [ ] **Fix #5 — Make social proof prominent** — Part A: elevate 'Trusted by 50,000+ DIY Investors' in `app/page.tsx` — move it between H1 and subheadline, style as a pill badge (`bg-surface-container-low`, `border-outline-variant`, `rounded-full`, `check_circle` icon). Part B (manual): gather 2–3 testimonial quotes from Ko-fi members/readers, then add a testimonial strip between hero and Top Strategies.

- [ ] **Fix #6 — Lead membership page with top performer stats** — In `app/membership/page.js`, add a three-card stats strip directly below the H1 and intro paragraph. Hardcoded values: Top Sharpe 0.98 (DAA), Top CAGR 16.1% (Vigilant G4), Best Worst Year -8.4% (DAA). Cards use `bg-surface-container-lowest border border-outline-variant rounded-xl p-5`; add a backtested disclaimer caption below.

- [ ] **Fix #7 — Surface Methodology link in content flow** — Part A: in `app/portfolios/[slug]/page.js`, add a one-line methodology link below the 'Performance Snapshot' heading. Part B: in `components/ScreenerClient.jsx`, add the same link below the main screener heading.

- [ ] **Fix #9 — Mobile screener UX: filters before results** — In `components/ScreenerClient.jsx`, change `showFilters` default from `false` to `true`. Add a sticky 'Show Results (N)' pill button fixed to the bottom of the screen on mobile only (`fixed bottom-4 left-4 right-4 lg:hidden z-50`) that appears when filters are open; clicking it collapses filters and shows results.

- [ ] **Fix #10 — Stat tooltips throughout the site** — New `components/StatTooltip.jsx` client component (label + `info` icon + hover tooltip card). Wire up to Performance Snapshot stat labels in `app/portfolios/[slug]/page.js` and column headers in `components/ScreenerClient.jsx`. Definitions for: CAGR, Sharpe, Max Drawdown, Sortino, Ulcer Index, UPI, 10yr CAGR, GFC CAGR, Dot-com CAGR, Rolling Returns.

- [ ] **Fix #11 — Signal email automation + Brief market context** — Build a Claude-powered workflow to auto-generate the monthly signal email with a brief market context paragraph (what drove changes that month). Once the automation is in place, add "Brief market context" back to the 'What you get each month' list in `app/membership/page.js` (it was removed May 2026 pending automation). Prompt template already designed — see session history.

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
