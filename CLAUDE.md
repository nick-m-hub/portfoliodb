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
| Icons       | Material Symbols Outlined (Google CDN)             |
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
| m1_link            | text        |                                                 |
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

### View: portfolio_stats
Calculates all performance stats automatically from monthly_returns.
This is what the Next.js site queries — never query monthly_returns directly
for display purposes.

Columns returned: slug, name, category, trade_frequency, min_timeline_years,
risk_level, description, m1_link, cagr, current_value, max_drawdown,
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
    page.tsx                         # Homepage (server component)
    layout.tsx                       # Root layout — fonts, GA4, Navbar
    globals.css                      # Tailwind v4 @theme design tokens
    database/
      page.js                        # Database page (server, wraps DatabaseClient in Suspense)
    portfolios/
      [slug]/
        page.js                      # Portfolio detail page (server, SSG)
    portfolio-screener/
      page.js                        # Screener page (server, wraps ScreenerClient)
    glossary-of-terms/
      page.js                        # Static glossary page
    api/
      screener/
        route.js                     # POST — AI portfolio recommendations (Haiku 4.5)
      test-db/
        route.js                     # GET — quick DB connectivity check
    sitemap.js                       # Dynamic sitemap (all portfolio slugs)
    robots.js                        # robots.txt
  components/
    Navbar.jsx                       # Top navigation bar (server) — accepts portfolios prop, renders NavSearch
    NavSearch.jsx                    # Navbar search box (client) — live portfolio search with dropdown
    FilterBar.jsx                    # Home page filter bar (client) — navigates to /database
    AIRecommend.jsx                  # AI "find portfolios" search bar (client)
    DatabaseClient.jsx               # Database page UI with filters/sort/grid/list (client)
    ScreenerClient.jsx               # Screener page UI with sliders/table/export (client)
    AllocationDonut.jsx              # SVG donut chart — server-renderable, no JS
    GrowthChart.jsx                  # Recharts area chart for Growth of $10K (client)
    DrawdownChart.jsx                # Recharts area chart for Historical Drawdown (client)
    RollingReturnChart.jsx           # Recharts line chart for Rolling Returns 1Y/3Y/5Y/10Y (client)
    ChartsSection.jsx                # Client wrapper owning benchmark, timeline, and log/linear scale toggle state
    StructuredData.jsx               # JSON-LD structured data for portfolio pages
    GoogleAnalytics.jsx              # GA4 script tag (production only)
  lib/
    supabase.js                      # Supabase client init
    db.js                            # All database query functions (see below)
  CLAUDE.md                          # This file
  TASKS.md                           # Migration task checklist
  .env.local                         # Secrets — not in git (see Environment Variables)
  next.config.js                     # Redirects config
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

All functions include error handling and return `null` or `[]` on failure.

Color fallback is applied inside `getAllocations()` and `getAllAllocations()`:
allocation.color → asset_classes.default_color → null (components use FALLBACK_COLORS array as last resort).

---

## Environment Variables

| Variable                      | Where used                   |
|-------------------------------|------------------------------|
| NEXT_PUBLIC_SUPABASE_URL      | lib/supabase.js              |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | lib/supabase.js              |
| ANTHROPIC_API_KEY             | app/api/screener/route.js    |
| NEXT_PUBLIC_SITE_URL          | generateMetadata() canonical URLs |

All must also be set in Vercel project settings for production.

---

## Pages Built So Far

| Page                   | Route                    | Status   |
|------------------------|--------------------------|----------|
| Homepage               | `/`                      | Complete |
| Database               | `/database`              | Complete |
| Portfolio Detail       | `/portfolios/[slug]`     | Complete |
| Portfolio Screener     | `/portfolio-screener`    | Complete |
| Glossary               | `/glossary-of-terms`     | Complete |
| Sitemap                | `/sitemap.xml`           | Complete |
| Robots                 | `/robots.txt`            | Complete |

---

## Key Component Notes

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

### app/api/screener/route.js (AI Screener)
- POST endpoint, accepts `{ goal }` in request body
- Fetches all portfolios from Supabase, sends to Anthropic API
- Uses claude-haiku-4-5 (no thinking parameter — Haiku doesn't support it)
- Returns `{ recommendations: [{ slug, name, reason }] }` (3 portfolios)
- Strips markdown code fences from response before JSON.parse

### stripMarkdown() in portfolios/[slug]/page.js
- Must handle literal `\n` (two chars) in addition to real newlines
- Pattern order matters: handle `\\n` first, then `/\n\n+/`, then `/\n/`

---

## SEO Requirements

- All page routes must match current WordPress URL slugs exactly
- Every page must have `generateMetadata()` with title, description,
  canonical URL, Open Graph tags, and Twitter card tags
- Portfolio pages use `generateStaticParams()` for pre-rendering (SSG)
- Sitemap at /sitemap.xml includes all portfolio pages dynamically
- robots.txt allows all crawlers, disallows /api/
- GA4 fires on production only (not localhost or Vercel preview URLs)
- JSON-LD structured data on all portfolio detail pages

---

## Monthly Data Update Workflow

Each month, insert one row per portfolio into monthly_returns:
  `portfolio_slug | date (YYYY-MM-01) | monthly_return`

That is all. The portfolio_stats view recalculates everything automatically.
No redeploy needed — data appears on the site immediately after insert.

---

## Reference Files

- TASKS.md — complete step-by-step build checklist with Claude prompts
- Playbook .docx — full migration playbook (stored outside project)

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
