# PortfolioDB.co — Project Context
# Claude reads this file at the start of every session.
# Do not delete or rename this file.

---

## What This Project Is

PortfolioDB.co is a portfolio database and screener site for finance/investing
audiences. It is being migrated from WordPress to a modern Next.js stack.

The owner (Nick) is not a developer. All explanations should be in plain
English alongside any technical output.

---

## Tech Stack

| Layer       | Technology                                         |
|-------------|----------------------------------------------------|
| Frontend    | Next.js 16 (App Router, mostly JS with one .tsx)  |
| Styling     | Tailwind CSS v4 with custom `@theme` design tokens |
| Fonts       | Manrope (headings) + Inter (body), via next/font   |
| Icons       | Material Symbols Outlined (Google CDN, axes fixed: opsz=24,wght=400,FILL=0,GRAD=0) |
| Charts      | Recharts (client) + custom SVG donut (server)      |
| Database    | Supabase (PostgreSQL)                              |
| AI          | Anthropic API — claude-haiku-4-5 for screener      |
| Hosting     | Vercel (auto-deploy from GitHub)                   |
| Build tool  | Claude Code Desktop                                |

---

## Repository

- Project folder: `portfoliodb`
- GitHub repo: `portfoliodb`
- Vercel: connected to GitHub, auto-deploys on every push

---

## Supabase Database Schema

### Table: portfolios
Stores manual metadata only. No calculated stats.

| Column             | Type        | Notes                                           |
|--------------------|-------------|-------------------------------------------------|
| id                 | uuid        | Auto-generated — never manually entered         |
| slug               | text        | Unique. Must match WordPress URL slugs exactly  |
| name               | text        |                                                 |
| category           | text        | 'Buy and Hold', 'Tactical', or 'Robo-Advisor'  |
| trade_frequency    | text        |                                                 |
| min_timeline_years | integer     |                                                 |
| risk_level         | integer     | 1–5 only (check constraint enforced)            |
| description        | text        | May contain markdown + literal `\n` — see below |
| m1_link            | text        | Nullable — cleared May 2026, reserved for future use |
| kofi_link          | text        | Ko-fi membership URL — drives trade signals CTA on portfolio detail pages |
| created_at         | timestamptz | Auto-generated                                  |

### Table: allocations
One row per asset class per portfolio.

| Column         | Type    | Notes                                  |
|----------------|---------|----------------------------------------|
| id             | uuid    | Auto-generated                         |
| portfolio_slug | text    | Foreign key → portfolios.slug          |
| asset_class    | text    |                                        |
| ticker         | text    |                                        |
| percentage     | numeric | 0–100 (check constraint enforced)      |
| color          | text    | Hex color code e.g. #4E79A7            |

### Table: monthly_returns
Append-only. One row per portfolio per month.
ONLY THREE DATA COLUMNS — portfolio_value is NOT stored here.

| Column         | Type    | Notes                                          |
|----------------|---------|------------------------------------------------|
| id             | uuid    | Auto-generated                                 |
| portfolio_slug | text    | Foreign key → portfolios.slug                  |
| date           | date    | Always first day of month e.g. 2024-11-01      |
| monthly_return | numeric | Percentage e.g. 1.8 means +1.8%, -0.9 = -0.9% |

Unique constraint on (portfolio_slug, date).

### Table: portfolio_strategies
Many-to-many: each portfolio can have multiple strategy tags.

| Column         | Type | Notes                          |
|----------------|------|--------------------------------|
| portfolio_slug | text | Foreign key → portfolios.slug  |
| strategy_slug  | text | e.g. momentum, factor-tilt, rules-based, global, income, tactical, simple, risk-parity, all-weather, bond-heavy, robo-advisor, target-date |

### Table: asset_classes
Reference/lookup table.

| Column        | Type | Notes           |
|---------------|------|-----------------|
| asset_class   | text | Primary key     |
| default_color | text | Hex color code  |
| description   | text |                 |

### Table: blog_posts
Stores blog content. RLS set so only published rows are publicly readable.

| Column       | Type        | Notes                                      |
|--------------|-------------|--------------------------------------------|
| id           | uuid        | Auto-generated                             |
| slug         | text        | Unique URL identifier e.g. golden-butterfly-vs-permanent-portfolio |
| title        | text        |                                            |
| excerpt      | text        | 1-sentence summary, under 160 chars — used as meta description |
| content      | text        | Full post body in Markdown                 |
| status       | text        | 'draft' or 'published' — RLS enforces public read only on 'published' |
| published_at | timestamptz | Set manually when publishing               |
| created_at   | timestamptz | Auto-generated                             |
| updated_at   | timestamptz | Auto-generated                             |

To publish a post: insert a row with `status = 'published'` and a `published_at` timestamp. No redeploy needed — `dynamicParams: true` on the post page means it goes live immediately.

### Blog post writing workflow

1. Pick the next post from `content-calendar.md` (recommended order: Posts 1–3 first, then 11–12)
2. Run the SQL query below to pull fresh stats for the portfolios referenced in that post — never hardcode numbers
3. Write the post in Claude (target ~1,200 words; follow style rules below)
4. Insert into `blog_posts` with `status = 'draft'`, review on the live site at `/blog/[slug]`
5. Flip to `status = 'published'` and set `published_at` when ready — goes live immediately
6. Mark the post as published in `content-calendar.md`

**SQL to pull fresh portfolio stats for writing:**
```sql
SELECT slug, name, cagr, max_drawdown, sharpe_ratio, sortino_ratio,
       ulcer_index, ulcer_performance_index, best_year, worst_year,
       cagr_10yr, cagr_gfc, cagr_dotcom,
       rolling_1yr_low, rolling_1yr_avg, rolling_1yr_high,
       rolling_3yr_low, rolling_3yr_avg, rolling_3yr_high,
       rolling_10yr_low, rolling_10yr_avg, rolling_10yr_high
FROM portfolio_stats
WHERE slug IN ('slug-1', 'slug-2', 'slug-3');
```

**Blog post style rules:**
- ~1,200 words; H2 subheadings every 250–300 words
- Open with a concrete observation, not a question and not "Most investors..."
- No em dashes or hyphens used as em dashes — rephrase as separate sentences or use commas/colons
- No "Here's what that looks like" or similar AI transition phrases
- Reference specific numbers (CAGR, drawdown, Sharpe) pulled from live data
- Leave `[ADD YOUR TAKE HERE]` in 2 spots for Nick's editorial input before publishing
- Internal links to at least two portfolio detail pages and one strategy page
- Natural CTA near end linking to `/database` or `/portfolio-screener`
- `remark-gfm` is installed — markdown tables render correctly in blog posts

### View: portfolio_stats
Calculates all performance stats automatically from monthly_returns.
This is what the Next.js site queries — never query monthly_returns directly
for display purposes.

Columns returned: slug, name, category, trade_frequency, min_timeline_years,
risk_level, description, m1_link, kofi_link, cagr, current_value, max_drawdown,
sharpe_ratio, sortino_ratio, best_year, worst_year, total_months, last_updated,
cagr_10yr, ulcer_index, ulcer_performance_index, cagr_gfc, cagr_dotcom,
rolling_1yr_low, rolling_1yr_avg, rolling_1yr_high,
rolling_3yr_low, rolling_3yr_avg, rolling_3yr_high,
rolling_5yr_low, rolling_5yr_avg, rolling_5yr_high,
rolling_10yr_low, rolling_10yr_avg, rolling_10yr_high.

Key formula approach:
- portfolio_value and current_value use window functions:
  EXP(SUM(LN(1 + monthly_return/100)) OVER (PARTITION BY portfolio_slug ORDER BY date)) * 10000
- max_drawdown derived from peak-to-trough decline in the above running value
- sharpe_ratio uses 4.5% annual (0.375% monthly) risk-free rate
- All stats derived from monthly_return alone — no stored portfolio_value

---

## Key Architecture Decisions

- portfolio_value is NEVER manually entered or stored. It is always
  auto-calculated by the portfolio_stats view from monthly_return entries.

- The INSERT order for new data is always:
  1. portfolios (slug must exist first)
  2. allocations (references portfolio slug)
  3. monthly_returns (references portfolio slug)
  Violating this order causes a foreign key constraint error.

- The id column is auto-generated in all tables. Never include it in
  INSERT statements.

- Slugs in portfolios must exactly match the URL slugs on the current
  WordPress site. One mismatch = one lost Google ranking.

---

## Known Data Quirks

- **Portfolio descriptions contain markdown and literal `\n` strings.**
  The `description` column stores text with `**bold**`, `[text](url)` links,
  and newlines stored as the two-character sequence `\n` (backslash + n),
  NOT actual newline characters. The `stripMarkdown()` function in the
  portfolio detail page handles all of these before display.

- **max_drawdown is stored as a negative number** (e.g. `-16.61` means
  a 16.61% drawdown). Display it with `Math.abs()` or check sign carefully.

- **Color fallback chain:** allocation.color → asset_classes.default_color → FALLBACK_COLORS array.
  The `getAllocations()` and `getAllAllocations()` db functions already apply
  this coalesce logic, so components just use `a.color`.

---

## File Structure

```
portfoliodb/
  app/
    page.tsx                         # Homepage (server component) — H1: "70+ Portfolio Strategies, / Backtested Since 1970" ('Backtested Since 1970' in text-[#27624a] span)
    layout.tsx                       # Root layout — fonts, preconnect hints, GA4, Navbar, Vercel Analytics
    globals.css                      # Tailwind v4 @theme design tokens
    database/
      page.js                        # Database page (server, wraps DatabaseClient in Suspense)
    portfolios/
      [slug]/
        page.js                      # Portfolio detail page (server, SSG)
    portfolio-screener/
      page.js                        # Screener page (server, wraps ScreenerClient)
    glossary-of-terms/
      page.js                        # Glossary page (server) — 30 terms, A–V, alphabet anchor nav, links to Methodology + related portfolios
    membership/
      page.js                        # Membership page (server) — price, what's included, signal portfolio list
    api/
      screener/
        route.js                     # POST — AI portfolio recommendations (Haiku 4.5)
      test-db/
        route.js                     # GET — quick DB connectivity check
      subscribe/
        route.js                     # POST — Kit V3 email capture (server-side, uses KIT_API_KEY + NEXT_PUBLIC_KIT_FORM_ID)
    strategies/
      page.js                        # Strategy index page (server, SSG) — grid of all 12 strategy types with portfolio counts
      [slug]/
        page.js                      # Strategy detail page (server, SSG) — 2-para intro + ranked comparison table (CAGR/MaxDD/Sharpe/WorstYear/Risk)
    blog/
      page.js                        # Blog index (server, static) — lists published posts newest-first; "No posts yet" empty state
      [slug]/
        page.js                      # Blog post page (server, dynamicParams: true) — react-markdown renderer, generateStaticParams, notFound() guard
    sitemap.js                       # Dynamic sitemap (portfolio slugs + static pages + strategy pages + blog posts)
    robots.js                        # robots.txt
    opengraph-image.js               # Static OG image for homepage and other pages (1200×630)
    portfolios/
      [slug]/
        opengraph-image.js           # Dynamic per-portfolio OG image — fetches live data, renders name/CAGR/Sharpe/MaxDD
  components/
    Navbar.jsx                       # Top navigation bar (server) — accepts portfolios prop, renders NavSearch; uses portfoliodb-icon.svg logo
    portfoliodb-icon.svg             # Site logo SVG (also copied to public/ for Next.js Image)
    NavSearch.jsx                    # Navbar search box (client) — live portfolio search with dropdown
    FilterBar.jsx                    # Home page filter bar (client) — navigates to /database
    AIRecommend.jsx                  # AI "find portfolios" search bar (client)
    TopStrategies.jsx                # Homepage "Top Strategies by" section (client) — dropdown toggles Sharpe/CAGR/Min Drawdown; data pre-computed server-side
    DatabaseClient.jsx               # Database page UI with filters/sort/grid/list (client)
    ScreenerClient.jsx               # Screener page UI with sliders/table/export/column-picker (client)
    AllocationDonut.jsx              # SVG donut chart — server-renderable, no JS
    GrowthChart.jsx                  # Recharts area chart for Growth of $10K (client)
    DrawdownChart.jsx                # Recharts area chart for Historical Drawdown (client)
    RollingReturnChart.jsx           # Recharts line chart for Rolling Returns 1Y/3Y/5Y/10Y (client)
    ChartsSection.jsx                # Client wrapper owning benchmark, timeline, and log/linear scale toggle state
    StructuredData.jsx               # JSON-LD structured data for portfolio pages
    GoogleAnalytics.jsx              # GA4 script tag — fires only on portfoliodb.co (hostname check in inline script)
    EmailCapture.jsx                 # Email capture card (client) — compact horizontal layout, posts to /api/subscribe, success/error states
    Footer.jsx                       # Site-wide footer (server) — copyright, nav links (Membership, ToS, Privacy Policy, Methodology, Glossary, Support)
    StatTooltip.jsx                  # Stat info tooltip (client) — label + info icon + fixed-position hover/click tooltip card; re-exports STAT_DEFINITIONS from lib/statDefinitions.js
  lib/
    supabase.js                      # Supabase client init
    db.js                            # All database query functions (see below)
    statDefinitions.js               # Plain JS (no 'use client') — STAT_DEFINITIONS object with definitions for 19 stat keys; importable by both server and client components
  public/
    fonts/
      Manrope-Bold.ttf               # Manrope 700 — used by OG image routes (next/og requires TTF)
      Manrope-ExtraBold.ttf          # Manrope 800 — used by OG image routes
  scripts/
    update-descriptions.js           # Node.js script — reads all description-drafts/*.md and pushes to Supabase via service role key. Run with: node scripts/update-descriptions.js
  CLAUDE.md                          # This file
  TASKS.md                           # Migration task checklist
  .env.local                         # Secrets — not in git (see Environment Variables)
  next.config.ts                     # Next.js config — contains permanent redirects (see Redirects section)
```

---

## lib/db.js Query Functions

| Function               | Description                                                        |
|------------------------|--------------------------------------------------------------------|
| `getPortfolios()`      | All rows from portfolio_stats, ordered by sharpe_ratio desc        |
| `getPortfolio(slug)`   | Single portfolio from portfolio_stats by slug                      |
| `getAllocations(slug)`  | Allocations for one portfolio, ordered by % desc, with color fallback |
| `getAllAllocations()`   | All allocations across all portfolios, with color fallback         |
| `getAssetClasses()`    | All asset classes with default_color and description               |
| `getMonthlyReturns(slug)` | Monthly return rows for one portfolio, ordered by date asc      |
| `getAllPortfolioStrategies()` | All rows from portfolio_strategies (portfolio_slug + strategy_slug) |
| `getAllSlugs()`         | Slug column only from portfolios table (for generateStaticParams)  |
| `getPortfolioNames()`  | name + slug from portfolios table, alphabetical (for Navbar search) |
| `getRelatedPortfolios(slug)` | Top 3 same-category portfolios ranked by strategy tag overlap then Sharpe ratio — used by portfolio detail page |
| `getSignalPortfolios()` | name + slug for all portfolios where kofi_link IS NOT NULL, alphabetical — used by membership page |
| `getSignalPortfolioCount()` | Count of portfolios where kofi_link IS NOT NULL — used by homepage banner and membership page H1 |
| `getPortfoliosByStrategy(slug)` | All portfolio_stats rows tagged with a given strategy_slug, ordered by sharpe_ratio desc |
| `getAllStrategiesWithCounts()` | All unique strategy_slugs with portfolio counts, sorted alphabetically |
| `getBlogPosts()`               | All published blog_posts ordered by published_at desc — slug, title, excerpt, published_at |
| `getBlogPost(slug)`            | Single published blog_post by slug — all columns; returns null if not found or not published |
| `getAllBlogSlugs()`            | slug column only from published blog_posts (for generateStaticParams on blog post page) |

All functions include error handling and return `null` or `[]` on failure.

Color fallback is applied inside `getAllocations()` and `getAllAllocations()`:
allocation.color → asset_classes.default_color → null (components use FALLBACK_COLORS array as last resort).

---

## Environment Variables

| Variable                      | Where used                   |
|-------------------------------|------------------------------|
| NEXT_PUBLIC_SUPABASE_URL      | lib/supabase.js              |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | lib/supabase.js              |
| SUPABASE_SERVICE_ROLE_KEY     | scripts/update-descriptions.js — bypasses RLS for writes; never expose client-side |
| ANTHROPIC_API_KEY             | app/api/screener/route.js    |
| NEXT_PUBLIC_SITE_URL          | generateMetadata() canonical URLs |
| NEXT_PUBLIC_GA_MEASUREMENT_ID | components/GoogleAnalytics.jsx — GA4 measurement ID (e.g. G-XXXXXXX) |
| MAILERLITE_API_KEY            | app/api/subscribe/route.js — MailerLite API token (server-side only, never expose client-side) |
| MAILERLITE_GROUP_ID           | app/api/subscribe/route.js — MailerLite group ID to add subscribers to |
| EODHD_API_KEY                 | scripts/auto-returns/stage1_calculate.py — EODHD price data API key (scripts only, not needed in Vercel) |
| NOTIFY_EMAIL                  | scripts/auto-returns/stage1_calculate.py — recipient address for monthly summary email |
| SMTP_USER                     | scripts/auto-returns/stage1_calculate.py — Gmail sending address |
| SMTP_PASSWORD                 | scripts/auto-returns/stage1_calculate.py — Gmail App Password (16-char, not regular Gmail password) |

All must also be set in Vercel project settings for production (except SUPABASE_SERVICE_ROLE_KEY, EODHD_API_KEY, NOTIFY_EMAIL, SMTP_USER, SMTP_PASSWORD — scripts only, not needed in Vercel).

**Important:** `NEXT_PUBLIC_` variables are baked into the bundle at build time — a Vercel redeploy is required after adding or changing them. Do NOT use `NEXT_PUBLIC_VERCEL_ENV` — Vercel does not auto-set this variable; use hostname-based detection in client-side code instead.

---

## Pages Built So Far

| Page                   | Route                    | Status   |
|------------------------|--------------------------|----------|
| Homepage               | `/`                      | Complete |
| Database               | `/database`              | Complete |
| Portfolio Detail       | `/portfolios/[slug]`     | Complete |
| Portfolio Screener     | `/portfolio-screener`    | Complete |
| Glossary               | `/glossary-of-terms`     | Complete |
| Methodology            | `/methodology`           | Complete |
| Membership             | `/membership`            | Complete |
| Terms of Service       | `/terms-of-service`      | Complete |
| Strategy Index         | `/strategies`            | Complete |
| Strategy Detail        | `/strategies/[slug]`     | Complete |
| Blog Index             | `/blog`                  | Complete |
| Blog Post              | `/blog/[slug]`           | Complete |
| Sitemap                | `/sitemap.xml`           | Complete |
| Robots                 | `/robots.txt`            | Complete |

---

## Key Component Notes

### StatTooltip.jsx + lib/statDefinitions.js
- `StatTooltip` is a client component: renders `{label}` + a small `info` Material Symbol button + a fixed-position tooltip card
- Tooltip uses `position: fixed` (calculated from `getBoundingClientRect()`) so it escapes `overflow-hidden` parent containers
- Icon size is set via inline `style={{ fontSize: '11px' }}` — Tailwind arbitrary classes like `text-[11px]` are overridden by the Material Symbols CSS; inline style wins
- `e.stopPropagation()` on click prevents sort triggers when the tooltip button is inside a table header
- `STAT_DEFINITIONS` lives in `lib/statDefinitions.js` (plain JS, no `'use client'`), making it importable by both server and client components. **Do NOT move it into StatTooltip.jsx** — named exports from `'use client'` files are undefined when imported into server components (a Next.js/Turbopack limitation)
- `StatTooltip.jsx` re-exports `STAT_DEFINITIONS` via `export { STAT_DEFINITIONS } from '@/lib/statDefinitions'` as a convenience for client-only files
- Currently used on: all 11 `StatRow` entries on portfolio detail pages; all 11 `FilterSlider` entries in the screener Advanced Filters sidebar. NOT used in screener table column headers.

### EmailCapture.jsx
- Client component — compact horizontal card with email input + "Send me the report" button
- Posts to `/api/subscribe` (Next.js API route) which calls MailerLite API server-side
- Three states: idle, loading (spinner), success (confirmation message), error (inline message)
- Placed on: homepage (below Top Strategies), membership page (above price callout), portfolio detail pages (below Related Portfolios)
- Current copy: headline "Which portfolios survived the dot-com crash and 2008?", subline "Get our free crash analysis report — plus monthly portfolio insights."
- Lead magnet: "How Index Fund Portfolios Performed in the Two Worst Crashes of the Last 25 Years" PDF, delivered via MailerLite automation

### app/api/subscribe/route.js
- POST handler — reads `MAILERLITE_API_KEY` and `MAILERLITE_GROUP_ID` from env
- Calls `https://connect.mailerlite.com/api/subscribers` with `{ email, groups: [groupId] }`
- Returns `{ success: true }` or `{ error: "..." }`

### app/strategies/[slug]/page.js + app/strategies/page.js
- 12 strategy types: all-weather, bond-heavy, factor-tilt, global, income, momentum, risk-parity, robo-advisor, rules-based, simple, tactical, target-date
- STRATEGY_INFO object in the detail page holds label, 2-paragraph intro, and brief description for each slug
- Detail page: `generateStaticParams()` from `getAllStrategiesWithCounts()`, table sorted by Sharpe ratio desc, `notFound()` for unknown slugs
- Index page: grid of cards with Material Symbols icon, portfolio count badge, brief description
- Navbar "Strategies" link added to both desktop (`hidden md:flex`) and mobile row

### Navbar.jsx
- Two-row layout: first row has logo + desktop nav links (`hidden md:flex`) + NavSearch; second row (`flex md:hidden`) shows Database/Screener/Strategies links on mobile only
- Stays a server component — all interactivity is in NavSearch.jsx (client)
- JSDoc `@param` type annotation on props is required to avoid TypeScript `never[]` errors when called from layout.tsx
- Logo uses `<Image src="/portfoliodb-icon.svg">` (file lives in `public/`); the copy in `components/` is the original source

### FilterBar.jsx (home page)
- No longer uses assetClasses prop — categories are hardcoded (Buy and Hold, Robo-Advisor, Tactical)
- Category: native `<select>` dropdown (single select)
- Risk Tolerance: pill buttons 1–5 (single select)
- Max Drawdown: number-only text input
- On submit: navigates to `/database?risk=N&max_drawdown=N&cat=Name`

### DatabaseClient.jsx
- Reads `risk`, `max_drawdown`, and `cat` URL params on first render to
  pre-fill filters (from the home page FilterBar)
- Wrapped in `<Suspense>` in database/page.js (required by useSearchParams)
- Risk levels 1–2 = Conservative, 3 = Moderate, 4–5 = Aggressive
- Sidebar filters: Category (pill buttons), Risk Level (checkboxes),
  Asset Exposure (EQ/FI/CMD/RE/ALT bucket buttons), Strategy (bucket buttons
  from portfolio_strategies table), Max Drawdown (text input)
- `assetBadges()` function maps asset class names → EQ/FI/CMD/RE/ALT buckets
- `strategyLabel()` formats strategy slugs → title case labels
- Receives `strategyOptions` prop (sorted unique strategy_slugs) from database/page.js
- database/page.js also fetches getAllPortfolioStrategies() and attaches
  `strategies: string[]` to each portfolio object
- Mobile: `showFilters` state (default false) controls sidebar visibility; "Filters" toggle button (`lg:hidden`) shown above the results area
- List view table has an `overflow-x-auto` wrapper div; table has `min-w-[600px]` so it overflows on mobile and users can scroll horizontally

### AllocationDonut.jsx
- Pure SVG, server-renderable — no client JS needed
- Uses strokeDasharray/strokeDashoffset on `<circle>` elements
- Rotated -90° so first segment starts at top

### NavSearch.jsx
- Client component — extracted from Navbar so Navbar stays a server component
- Accepts `portfolios` prop (array of `{ name, slug }`) fetched in layout.tsx
- Filters client-side as user types (case-insensitive, up to 8 results shown)
- Dropdown: click a result navigates to `/portfolios/[slug]`, Enter navigates to first result
- Escape or click-outside closes the dropdown

### GrowthChart.jsx
- Client component using Recharts AreaChart
- Input: `data` array of `{ label: 'YYYY-MM', value: number, benchmark?: number }`
- Accepts `logScale` boolean prop — passes `scale="log"` to Recharts YAxis when true
- Renders optional grey dashed benchmark Area when any data point has `benchmark != null`
- Growth of $10K computed in portfolio detail page by compounding monthly_returns

### DrawdownChart.jsx
- Recharts AreaChart showing % decline from running peak (values always ≤ 0)
- Input: `data` array of `{ label: 'YYYY-MM', value: number, benchmark?: number }`
- Y-axis domain: `Math.floor(min/5)*5 - 5` to 0

### RollingReturnChart.jsx
- Recharts LineChart with 1Y/3Y/5Y/10Y tab buttons
- Input: `datasets` object keyed by window label, each value is same data shape
- Tabs hidden when that window's data is empty
- Optional grey dashed benchmark Line

### ChartsSection.jsx
- Client component — owns `showBenchmark`, `show10yr`, and `logScale` toggle state
- `logScale` defaults to `true` (log scale is the default view for Growth of $10K)
- Renders Growth of $10K, Historical Drawdown, and Rolling Returns sections
- "Compare to: None / US 60/40" toggle hidden on the benchmark page itself
- "Full / Last 10Y" toggle and "Log / Linear" toggle both appear under the Growth of $10K heading
- `mergeWithBenchmark()` merges benchmark data into chart data by label (YYYY-MM)
- Benchmark slug: `united-states-60-40-portfolio`
- All benchmark data computed in portfolios/[slug]/page.js using same
  `buildGrowthData()`, `buildDrawdownData()`, `buildRollingReturnData()` helpers

### ScreenerClient.jsx
- Sidebar filters: Asset Classes (collapsible checkbox list, uses assetClasses prop),
  Performance Benchmarks sliders (CAGR, Sharpe, Max Drawdown, Worst Year, 10yr CAGR,
  Sortino Ratio, Ulcer Index), Rolling Returns (Min) sliders (1yr/3yr/5yr/10yr),
  Asset Exposure bucket buttons (EQ/FI/CMD/RE/ALT)
- Risk Profile filter was removed — risk column still shown in the results table
- All slider defaults are set at the permissive end so all 70 portfolios show on load
- Sortino default = -0.5 and Ulcer default = 14.0 (two portfolios have values outside
  tighter ranges — do not tighten these defaults without checking the data first)
- `assetBadges()` and `BADGE_STYLES` map allocations → colored EQ/FI/CMD/RE/ALT badges
  shown in the Asset Mix column of the results table
- Receives `assetClasses` prop from portfolio-screener/page.js
- Mobile: `showFilters` defaults to `true` (filters open on load). A sticky "Show Results (N)" pill button (`fixed bottom-4 left-4 right-4 lg:hidden z-50`) appears when filters are open — clicking it collapses filters so the user can see results.
- Table min-width grows dynamically based on number of visible columns (base 420px + 90px per column)
- **Column picker:** "Columns" button next to Export CSV opens a dropdown with 23 toggleable
  columns — Performance Benchmarks (CAGR, Max DD, Sharpe on by default; Sortino, Worst Year,
  Best Year, 10yr CAGR, Ulcer Index, UPI, GFC CAGR, Dotcom CAGR off by default) and Rolling
  Returns (1yr/3yr/5yr/10yr Low/Avg/High, all off by default). +N badge shows extra active
  columns. "Reset to defaults" link appears when defaults are changed. All visible columns are
  sortable. CSV export reflects currently visible columns. `ALL_COLUMNS` array in the component
  is the single source of truth for available columns.

### app/api/screener/route.js (AI Screener)
- POST endpoint, accepts `{ goal }` in request body
- Fetches all portfolios from Supabase, sends to Anthropic API
- Uses claude-haiku-4-5 (no thinking parameter — Haiku doesn't support it)
- Returns `{ recommendations: [{ slug, name, reason }] }` (3 portfolios)
- Strips markdown code fences from response before JSON.parse

### stripMarkdown() in portfolios/[slug]/page.js
- Must handle literal `\n` (two chars) in addition to real newlines
- Pattern order matters: handle `\\n` first, then `/\n\n+/`, then `/\n/`

### TopStrategies.jsx
- Client component — owns `metric` state (default: `'cagr'`)
- Receives `sections` prop: `{ sharpe, cagr, drawdown }` — each an array of 3 portfolios with allocations pre-attached
- Data is pre-computed server-side in `page.tsx` using `getAllAllocations()` + array sort; no client-side fetching
- Dropdown is a styled native `<select>` with `appearance-none` + Material Symbols `expand_more` arrow overlay
- Primary stat, icon, and secondary stats all update based on selected metric

### OG Images (app/opengraph-image.js + app/portfolios/[slug]/opengraph-image.js)
- Built with `next/og` (`ImageResponse`) — no extra package needed
- Both routes use `fs.readFileSync` to load `public/fonts/Manrope-Bold.ttf` and `Manrope-ExtraBold.ttf` at build time
- Portfolio OG image fetches live data via `getPortfolio(slug)` and renders name, category badge, risk level, CAGR/Sharpe/Max Drawdown stat boxes
- All 70 portfolio OG images are pre-generated at build time (SSG) alongside the pages
- Twitter card is `summary_large_image` on homepage and portfolio detail pages — Next.js auto-wires the image URL

### Related Portfolios section (portfolios/[slug]/page.js)
- Rendered at the bottom of every portfolio detail page, below the charts section
- Data from `getRelatedPortfolios(slug)` — runs in parallel with other page fetches in `Promise.all`
- Shows 3 cards: portfolio name (linked), category badge, CAGR/Sharpe/Max Drawdown stats

---

## Redirects

Permanent redirects are configured in `next.config.ts`. These cover indexed WordPress URLs that don't map to any Next.js route.

| From | To | Reason |
|------|----|--------|
| `/portfolios` | `/database` | WordPress portfolio archive page |
| `/timeline-risk/:path*` | `/database` | WordPress taxonomy/category pages |

Trailing-slash redirects (e.g. `/portfolios/golden-butterfly-portfolio/` → without slash) are handled automatically by Next.js — no config needed.

All portfolio slugs from the old WordPress site exist in the Next.js DB, so no portfolio detail redirects are required.

---

## SEO Requirements

- All page routes must match current WordPress URL slugs exactly
- WordPress used `/portfolios/[slug]/` (trailing slash) — Next.js handles the redirect automatically, no config needed
- Every page must have `generateMetadata()` with title, description,
  canonical URL, Open Graph tags, and Twitter card tags
- Portfolio pages use `generateStaticParams()` for pre-rendering (SSG)
- Sitemap at /sitemap.xml includes all portfolio pages + static pages including /methodology
- robots.txt allows all crawlers, disallows /api/
- GA4 fires on production only (not localhost or Vercel preview URLs)
- JSON-LD structured data on all portfolio detail pages
- OG images auto-generated per portfolio via `app/portfolios/[slug]/opengraph-image.js`
- Set up Google Search Console on launch day — verify domain, submit /sitemap.xml

---

## Monthly Data Update Workflow

**Buy and Hold + Robo-Advisor portfolios** are updated automatically via the returns automation pipeline (see below). No manual inserts needed.

**Tactical portfolios** are updated manually each month — insert one row per portfolio into monthly_returns: `portfolio_slug | date (YYYY-MM-01) | monthly_return`. A separate automation script for tactical portfolios is planned for a future session.

The portfolio_stats view recalculates everything automatically after any insert. No redeploy needed.

---

## Monthly Returns Automation Pipeline (May 2026)

Automates monthly return calculations for all Buy and Hold and Robo-Advisor portfolios (41 total). Tactical portfolios are excluded and updated manually.

**Data provider:** EODHD (eodhd.com) — $19.99/month All World plan. Uses `adjusted_close` prices to account for dividends and splits.

**Scripts:** `scripts/auto-returns/`

| File | Purpose |
|------|---------|
| `requirements.txt` | Python deps: requests, supabase, python-dotenv |
| `utils.py` | Shared helpers: `get_supabase_client()`, `get_target_month()`, `month_display()`, `DOTENV_PATH` |
| `stage1_calculate.py` | Fetches prices → calculates blended returns → writes to staging → emails summary |
| `stage2_promote.py` | Promotes approved staging rows to live monthly_returns |

**Supabase tables added:**
- `monthly_returns_staging` — mirrors monthly_returns with extra columns: `status` (pending/approved/rejected), `flagged` (bool), `flag_reason` (text)
- `staging_review` view — shows pending rows sorted flagged-first, joined with portfolio names

**Monthly workflow:**
1. Stage 1 runs automatically on the 3rd of each month (via GitHub Actions — Phase 4, not yet set up as of May 2026)
2. You receive a summary email with all 41 portfolio returns and any flags
3. Review flagged rows in Supabase: `SELECT * FROM staging_review;`
4. Run Stage 2 manually to promote: `python3 stage2_promote.py --month YYYY-MM`
5. Stats update live immediately — no redeploy needed

**Running manually:**
```bash
cd scripts/auto-returns
python3 stage1_calculate.py              # defaults to last completed month
python3 stage1_calculate.py --month 2026-04   # override month
python3 stage2_promote.py --month 2026-04
```

**Flag thresholds:** portfolio return < -25% or > +25%, missing ticker price data, or weights not summing to ~1.0 (±0.01 tolerance).

**Stage 2 safety checks:** requires typed CONFIRM before promoting any flagged rows; aborts if rows already exist in monthly_returns for that month (prevents duplicate inserts).

**Key decisions:**
- Tactical portfolios excluded via `category != 'Tactical'` filter in both Stage 1 and Stage 2
- JKI ticker was delisted — updated to IMCV in allocations table (May 2026)
- GitHub Actions: `.github/workflows/returns-stage1.yml` (cron 3rd of month 10am UTC + manual dispatch) and `.github/workflows/returns-stage2.yml` (manual only). 6 secrets in GitHub repo settings: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EODHD_API_KEY`, `NOTIFY_EMAIL`, `SMTP_USER`, `SMTP_PASSWORD`
- Stage 2 detects `GITHUB_ACTIONS=true` env var and auto-aborts on flagged rows instead of prompting

---

## Tactical Portfolio Automation (In Progress — May 2026)

29 tactical portfolios require a separate automation pipeline because their allocations change monthly based on momentum/trend signals. 11 portfolios (Dual Momentum + GTAA families) are fully automated as of May 2026.

**Core difference from buy-and-hold:** Returns depend on what was *actually held* that month, determined by signals calculated at end of the prior month. The static `allocations` table is not used for return calculation.

**Data model — Supabase table `tactical_monthly_holdings`:**
```sql
tactical_monthly_holdings (
  portfolio_slug, date, ticker, weight
)
```
- `date` = first day of the month the holdings are IN EFFECT
- Signals calculated end of month M-1 → holdings stored for month M → return calculated end of month M
- Historical holdings not tracked — automation starts from current month forward

**Monthly workflow:**
1. **Last trading day of month** — run Stage 0 manually from GitHub Actions (calculates signals, stores next month's holdings in `tactical_monthly_holdings`)
2. **3rd of next month** — Stage 1 runs automatically (calculates B&H + tactical returns, emails summary)
3. **Within a day or two** — run Stage 2 manually to promote everything to live

**Stage 0 timing note:** Signals must be calculated on the last trading day of the month so the signal email to members goes out the same day. Cron cannot target "last trading day" reliably, so Stage 0 is manual-only. Stage 1 picks up the stored holdings automatically on the 3rd.

**Stage 0 always requires `--month YYYY-MM`** for the normal monthly workflow. The no-flag default returns the *last completed* calendar month, not next month — it is only useful for recalculating a past month. To store June holdings, run:
```bash
python3 stage0_signals.py --month 2026-06
```

**Run after market close.** EODHD is an end-of-day feed. If you run Stage 0 mid-day on the last trading day, EODHD will not yet have that day's closing prices and the script will silently fall back to the prior day's close. Run after ~5pm ET, or on the following morning (Saturday), to guarantee the correct prices.

**Signal registry** (`stage0_signals.py`): maps portfolio slugs to their signal functions. To add a new portfolio: add its signal function to the relevant module and one line to `SIGNAL_REGISTRY`. Nothing else changes.

**Stateful strategies (Stoken's ACA):** `stoken_aca()` accepts an optional third argument `prior_holdings` to resolve the "between channels" state. `stage0_signals.py` queries last month's `tactical_monthly_holdings` for any slug listed in `_PRIOR_HOLDINGS_SLUGS` and passes the result automatically. If no prior data exists (first run), all sleeves default to their defensive asset.

**Scripts:**
- `stage0_signals.py` — orchestrator: fetches prices, runs all signal functions, writes to `tactical_monthly_holdings`
- `tactical/__init__.py` — package marker
- `tactical/dual_momentum.py` — GEM, GEM+EM, Diversified GEM, Composite DM, Accelerating DM
- `tactical/gtaa.py` — Ivy Timing, Ivy Rotation, GTAA 5, GTAA 13, GTAA AGG 3, GTAA AGG 6; shared helpers `_above_sma()`, `_composite_score()`, `_sma_timing()`, `_momentum_rotation()`
- `tactical/rules_based.py` — Tactical Permanent, Three-Way Model, Paired Switching, Quint Switching Filtered, Trend Following Bonds, Stoken's ACA; shared helpers `_calc_sma()`, `_above_sma()`, `_channel_extreme()`
- `tactical/muscular_portfolios.py` — Mama Bear (top-3 of 9 by 5M momentum), Papa Bear (top-3 of 14 by avg 3/6/12M momentum)
- `tactical/alpha_architect.py` — RAA Aggressive, RAA Balanced; dual-signal (TMOM + 10M MA) graduated allocation (100%/50%/0%) per asset
- `tactical/keller.py` — PAA, VAA G4, VAA G12, DAA, GPM, KDA, AAA; shared helpers for 13612W momentum, SMA momentum, Easy Trading formula, min-variance optimization (scipy). requires numpy + scipy in requirements.txt.

**Keller et al. momentum formulas:**
- **13612W** (VAA/DAA/KDA/GPM canary): `12*R1 + 4*R3 + 2*R6 + R12` — fast, front-weighted
- **SMA(12)** (PAA): `p0 / avg(p1..p12) - 1` — current price vs. 12-month average of month-end prices
- **Simple avg** (GPM ri): `(R1 + R3 + R6 + R12) / 4` — equal-weight

**Keller universe reference:**
- PAA / GPM risky (N=12): SPY, QQQ, IWM, VGK, EWJ, EEM, IYR, GSG, GLD, TLT, HYG, LQD
- VAA G12 / DAA risky (N=12): SPY, IWM, QQQ, VGK, EWJ, EEM, VNQ, DBC, GLD, TLT, LQD, HYG
- VAA G4 risky (N=4): SPY, EFA, EEM, AGG
- KDA / AAA investment (N=10): SPY, VGK, EWJ, EEM, VNQ, RWX, IEF, TLT, DBC, GLD
- VAA/DAA/KDA cash (best of 3 by 13612W): BIL, IEF, LQD
- DAA/KDA canary: EEM, BND
- PAA/GPM cash: IEF only (PAA); IEF or BIL by highest zi score (GPM)

**Easy Trading (VAA/DAA):**
- `cash_slots = floor(b * T / B)`, `risky_slots = T - cash_slots`
- VAA G12: T=2, B=4 → b=0–1: 2 risky; b=2–3: 1 risky + 1 cash; b≥4: 100% cash
- DAA: T=6, B=2 → b_canary=0: 6 risky; b_canary=1: 3 risky + 3 cash; b_canary=2: 100% cash

**Strategy families and implementation order:**

| Family | Portfolios | Status |
|---|---|---|
| Dual Momentum (Antonacci) | GEM, GEM+EM, Diversified GEM, Composite DM, Accelerating DM | Complete |
| Meb Faber GTAA | GTAA 5, GTAA 13, AGG 3, AGG 6, Ivy Timing, Ivy Rotation | Complete |
| Simple rules-based | Tactical Permanent, Three-Way Model, Paired Switching, Quint Switching Filtered, Trend Following Bonds, Stoken's ACA | Complete |
| Muscular Portfolios (Livingston) | Mama Bear, Papa Bear | Complete |
| Alpha Architect RAA (Gray & Vogel) | Robust AA Aggressive, Robust AA Balanced | Complete |
| Keller et al. | PAA, VAA G4, VAA G12, DAA, GPM, KDA, AAA | Complete (May 2026) |
| Other | The Trend is Our Friend - Global | Planned |

---

## Email / MailerLite (May 2026)

- Email provider: **MailerLite** (migrated from Kit May 2026 — Kit lacks email sequences on free plans)
- Subscriber group: "General Email List" (ID: 187575433316795808)
- API key: `MAILERLITE_API_KEY` env var (Sensitive in Vercel); group ID: `MAILERLITE_GROUP_ID`
- Lead magnet: PDF report — "How Index Fund Portfolios Performed in the Two Worst Crashes of the Last 25 Years"
- Welcome sequence: 4 emails set up in MailerLite automation (trigger: joins General Email List)
  - Email 1 (immediate): PDF delivery
  - Email 2 (Day 3): What PortfolioDB is, data insight
  - Email 3 (Day 6): Why tactical signals differ from financial news (weather forecast analogy)
  - Email 4 (Day 10): Soft pitch to Ko-fi membership ($19/mo)
- Sequence went live: 2026-05-16

---

## Membership Page Notes (May 2026)
- "Brief market context" removed from 'What you get each month' list pending signal email automation (Fix #11)
- Mock email card in "What a signal looks like" section shows ticker/allocation pill badge format (not a generic table) — reflects actual signal email structure
- Monthly signal email format: portfolio name as heading, tickers as `TICKER — XX%` lines. Formatted via Claude prompt (see Fix #11 in TASKS.md)

## Membership CTA

Portfolio detail pages show a membership CTA on **every** portfolio page — two placements:
- **Hero section** (right column, below Back to Database button) — compact card
- **Sidebar** (right column of body, below At a Glance) — fuller card with 3 bullet points

`kofi_link` acts as a **copy switcher**, not an on/off toggle:
- **kofi_link IS NOT NULL** → "covered" variant: "Monthly signals available for this portfolio" / "One email, once a month. No research required." / "See membership options"
- **kofi_link IS NULL** → "not covered" variant: "Monthly signals for select portfolios" / "We cover a curated selection of portfolios in this database." / "See what's covered"

Sidebar bullet 1 also switches: "Signals for a curated set of portfolios" (covered) vs. "This portfolio is not currently in the signal set" (not covered).

All CTA buttons link to `/membership` (not directly to Ko-fi). The `/membership` page has the Ko-fi join button.

To add a portfolio to the signal set: set any non-null value in the `kofi_link` column. Portfolio detail pages are SSG, so a Vercel redeploy is required for changes to appear.

## Membership Page (`/membership`)

- Price: `$19/mo` — stored as `MEMBERSHIP_PRICE` constant at top of `app/membership/page.js`; update there when price changes
- Ko-fi URL: `KOFI_MEMBERSHIP_URL` constant at top of the same file — currently `https://ko-fi.com/portfoliodb`
- Fetches `getSignalPortfolioCount()` and `getSignalPortfolios()` server-side; H1 and callout banner on homepage both show live count
- "Portfolios currently in the signal set" section lists all covered portfolios alphabetically, each linking to their detail page
- Homepage has two membership touchpoints: a compact callout banner (between hero and Top Strategies) and the Premium section (below Top Strategies)

---

## Performance Notes

- `monthly_returns` has an index `idx_monthly_returns_slug_date` on `(portfolio_slug, date)` — speeds up `REFRESH MATERIALIZED VIEW portfolio_stats`.
- PageSpeed mobile score: ~63–75 (as of May 2026, varies by run — slow 4G throttling causes high variance). Hard ceiling is ~80–85 due to Recharts bundle size.
- Material Symbols font URL uses fixed axis values (`opsz=24,wght=400,FILL=0,GRAD=0`) — do NOT widen these ranges; it caused the font to balloon from ~50 KB to ~3,800 KB and FCP to spike to 21 s.
- `layout.tsx` includes `<link rel="preconnect">` for fonts.googleapis.com and fonts.gstatic.com.
- `package.json` has a `browserslist` config targeting modern browsers (Chrome 92+, Firefox 90+, Safari 15+, Edge 92+) to eliminate legacy polyfills.
- The Material Symbols `<link rel="stylesheet">` is currently render-blocking (~150ms penalty on FCP). Making it non-blocking is tracked in Fix #13 in TASKS.md. The legacy JS flag (14 KiB) in PageSpeed is from Recharts and cannot be reduced without replacing that library.

## Mobile Overflow Pattern

The `<body>` uses `flex flex-col`, making all page-level `<main>` elements flex items. Flex items expand to fit their content rather than the viewport unless explicitly constrained. Any `<main>` that contains a wide element (table, grid with large gaps, etc.) will expand past 375px and cause page-level horizontal scroll.

**Fix pattern:** Add `w-full` (constrains to viewport) and `overflow-x-hidden` (clips any remaining leak) to the `<main>` element. For the homepage grid specifically, use `gap-y-8 md:gap-8` instead of `gap-8` — on mobile, 12 column gaps × 32px = 352px which exceeds the content area and collapses all columns to 0px width.

Pages fixed (May 2026): `strategies/[slug]`, `membership`, homepage grid, EmailCapture, ChartsSection, ScreenerClient toolbar.
- WCAG AA contrast: use `text-[#27624a]` (not `text-[#71a38b]`) for any green text on white backgrounds.

## Portfolio Description Drafts

All 49 portfolio descriptions have been drafted, reviewed, and stored in `description-drafts/` at the project root. Each file is saved directly in `\n` format (the DB-ready format) — no separate code block, no human-readable section. The file content is what gets pasted into Supabase.

### Description format spec

Every description follows this structure:

- **Opening paragraph** (2-3 sentences, no heading) — who created it, where it came from, core idea. Bold the portfolio name on first mention.
- `## Investment Philosophy` — what problem it solves, what market conditions it was designed for
- `## Who It's For` — risk tolerance, time horizon, investor temperament
- `## Pros` — bullet list of specific advantages
- `## Cons` — bullet list of specific limitations
- `## Technical Notes` — optional; only if there is something meaningful about implementation or how the strategy works mechanically

**Rules:**
- 200-400 words total
- No specific performance numbers (CAGR, Sharpe, max drawdown, etc.) -- those are pulled live from the DB
- No specific ETF or fund names
- No em dashes (use -- instead)
- Do not mention how execution timing can affect results
- Link to the creator's site/paper where relevant: `[anchor text](url)`
- Link to related portfolios on the site using relative URLs: `[Portfolio Name](/portfolios/slug)`
- Use `##` headings only (no `#`)

**Line break format for DB storage:**
Descriptions are stored as a single text value. Use the two-character sequence `\n` (backslash + n) between paragraphs and after list items -- NOT real line breaks. Example: `"End of paragraph.\n\nStart of next.\n\n## Heading\nBody text.\n\n## Pros\n- Item one\n- Item two"`

### Valid internal portfolio links
When writing or editing descriptions, only link to slugs that exist in the DB. Confirmed valid slugs for internal links:
`permanent-portfolio`, `golden-butterfly-portfolio`, `ray-dalios-all-weather-portfolio`, `united-states-60-40-portfolio`, `coffeehouse-portfolio`, `andrew-tobias-portfolio`, `gone-fishin-portfolio`, `bogleheads-three-fund-portfolio`, `bogleheads-four-fund-portfolio`, `ivy-portfolio-faber`, `global-tactical-asset-allocation-13-gtaa-13-meb-faber`, `global-tactical-asset-allocation-5-gtaa-5-meb-faber`, `global-tactical-asset-allocation-agg-3-meb-faber`, `global-tactical-asset-allocation-agg-6-meb-faber`, `generalized-protective-momentum`, `desert-portfolio`, `vigilant-asset-allocation-g12`, `vigilant-asset-allocation-g4-aggressive`, `mama-bear-portfolio`, `papa-bear-portfolio`, `the-larry-portfolio-swedroe`, `lazy-portfolio-by-david-swensen`, `cowards-portfolio-bill-bernstein`, `no-brainer-portfolio-bill-bernstein`, `core-four-portfolio-by-rick-ferri`, `pinwheel-portfolio`, `sandwich-portfolio`, `rob-arnott-portfolio`, `tactical-permanent-portfolio`, `7twelve-portfolio`, `ultimate-buy-and-hold-portfolio-7-paul-merriman`, `ultimate-buy-and-hold-portfolio-8-paul-merriman`, `conservative-income-portfolio-schwab`, `conservative-income-tax-aware-portfolio-schwab`, `kipnis-defensive-adaptive-asset-allocation-kda`, `diversified-gem-dual-momentum`, `gem-dual-momentum`, `gem-emerging-markets-dual-momentum`, `composite-dual-momentum`, `accelerating-dual-momentum`, `adaptive-asset-allocation`, `protective-asset-allocation`, `defensive-asset-allocation`, `quint-switching-filtered`, `stokens-active-combined-asset`, `three-way-model-by-ned-davis`, `paired-switching-lewis-glenn`, `robust-asset-allocation-aggressive`, `robust-asset-allocation-balanced`, `robust-portfolio-alpha-architect`

Do NOT link to: `ivy-portfolio-timing`, `ivy-portfolio-rotation` — these slugs do not exist in the DB.

### Workflow for adding new descriptions to Supabase
**Bulk (preferred):** Edit or add files in `description-drafts/`, then run:
```bash
node scripts/update-descriptions.js
```
This pushes all 70 draft files to Supabase in one command using the service role key. Then trigger a Vercel redeploy (SSG pages must rebuild to show changes).

**Single update (manual fallback):** Run this SQL in the Supabase SQL Editor:
```sql
UPDATE portfolios SET description = '[paste contents of slug.md]' WHERE slug = '[slug]';
REFRESH MATERIALIZED VIEW portfolio_stats;
```
Then redeploy on Vercel.

## Reference Files

- TASKS.md — complete step-by-step build checklist with Claude prompts
- content-calendar.md — 25-post SEO content calendar; full outlines, keywords, portfolio slugs, and internal links for each post
- Playbook .docx — full migration playbook (stored outside project)
- description-drafts/ — 49 portfolio description drafts, DB-ready

---

## Owner Preferences

- Plain English explanations alongside all technical output
- Present a plan and wait for approval before making large changes
- Confirm visually in the built-in browser before marking tasks complete
- SQL changes go through Claude.ai Chat, then run manually in Supabase SQL Editor
- Code changes go through Claude Code Desktop

---

## Design System

The site uses a custom green-themed Material Design 3 design system, implemented
as Tailwind CSS v4 `@theme` tokens in `app/globals.css`. Do not use the old
WordPress blue/slate classes — use the token names below.

### Color Tokens (use these class names in Tailwind)

| Token                        | Hex       | Used For                                     |
|------------------------------|-----------|----------------------------------------------|
| `text-primary`               | #074a34   | Primary green — buttons, headings, key stats |
| `text-on-primary`            | #ffffff   | Text on green buttons                        |
| `text-on-surface`            | #1a1c1a   | Body headings, primary text                  |
| `text-on-surface-variant`    | #404943   | Secondary text, labels, captions             |
| `text-outline`               | #707973   | Borders, dividers (outline color)            |
| `text-outline-variant`       | #bfc9c2   | Subtle borders                               |
| `text-error`                 | #ba1a1a   | Max drawdown, negative stats                 |
| `bg-surface`                 | #f8faf8   | Page background                              |
| `bg-surface-container-lowest`| #ffffff   | Card backgrounds                             |
| `bg-surface-container-low`   | #f0f4f0   | Subtle section backgrounds                   |
| `bg-surface-container`       | #eaeeed   | Input fields, toggles                        |
| `bg-primary`                 | #074a34   | Green buttons                                |
| `border-outline-variant`     | #bfc9c2   | Card borders                                 |
| `border-surface-variant`     | #dde4dd   | Subtle inner borders                         |

### Typography

- `font-manrope` — headings, portfolio names, large numbers
- `font-inter` — all body copy, labels, captions, UI text
- Material Symbols Outlined for icons: `<span className="material-symbols-outlined">icon_name</span>`

### Allocation Bar Colors (FALLBACK_COLORS)

When an allocation has no color in the DB, use this array in order:
`['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8']`

This array is defined locally in components that need it (not imported from a shared file).
