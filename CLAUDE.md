# PortfolioDB.com — Project Context
# Claude reads this file at the start of every session.
# Do not delete or rename this file.

---

## What This Project Is

PortfolioDB.com is a portfolio database and screener site for finance/investing
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
| PDF Export  | @react-pdf/renderer v4 — Portfolio Builder PDF report |
| Database    | Supabase (PostgreSQL)                              |
| AI          | Anthropic API — claude-haiku-4-5 for screener      |
| Hosting     | Vercel (auto-deploy from GitHub)                   |
| Build tool  | Claude Code Desktop                                |

---

## Repository

- Project folder: `portfoliodb`
- GitHub repo: `portfoliodb`
- Vercel: connected to GitHub, auto-deploys on every push
- Git push: works directly from Claude Code. SSH key (`~/.ssh/id_ed25519`) is stored in the macOS Keychain with `~/.ssh/config` set to `UseKeychain yes` + `AddKeysToAgent yes`, so all subprocesses can push without an interactive terminal session.

---

## Cloudflare (June 2026)

Cloudflare is now the DNS provider and sits in front of Vercel as a proxy. All traffic hits Cloudflare first — bots are filtered there before reaching Vercel, which prevents them from burning Vercel function/ISR quotas.

- **Nameservers:** Cloudflare (changed from Vercel at Namecheap, June 2026)
- **DNS management:** All DNS records now live in Cloudflare dashboard, not Vercel. Vercel DNS panel is no longer used.
- **Proxied records:** `portfoliodb.com` (root CNAME flattened) and `www` — both orange cloud (Proxied). All email records are DNS Only (grey cloud).
- **SSL:** Cloudflare Universal SSL (Google Trust Services CA) handles browser-facing certificates. Vercel's backend cert handles the Cloudflare → Vercel leg.
- **Bot Fight Mode:** Off — was blocking Memberful webhook requests from reaching `/api/memberful`. The Singapore WAF rule provides sufficient bot protection without it.
- **WAF Custom Rule:** Country = Singapore OR China → Managed Challenge (blocks the high-volume low-engagement bot traffic identified June 2026)
- **WAF Skip Rule:** URI Path = `/api/memberful` → Skip all rules, placed First (added to allow Memberful webhooks through — note: only effective once Bot Fight Mode is off on free plan)
- **CAA records:** Deleted — Cloudflare manages SSL issuance now, CAA restrictions are no longer needed.
- **Resend API key:** Stored in `.env.local` as `RESEND_API_KEY` for reference. The actual key is used in Gmail send-as SMTP settings and Supabase Authentication SMTP settings — if rotated, update both places.
- **Cache Rule (June 2026):** One cache rule covers `/portfolios/`, `/leaderboard`, `/strategies/`, `/blog/` — all set to "Eligible for cache". This overrides Cloudflare's default behaviour of bypassing cache when session cookies are present, ensuring logged-in users are served from Cloudflare's edge rather than passing through to Vercel. Do NOT apply cache rules to `/api/*`, `/account`, `/builder`, or `/monte-carlo-simulation` — those have server-side auth or dynamic data and must never be cached.

---

## Supabase Database Schema

### Table: portfolios
Stores manual metadata only. No calculated stats.

| Column             | Type        | Notes                                           |
|--------------------|-------------|-------------------------------------------------|
| id                 | uuid        | Auto-generated — never manually entered         |
| slug               | text        | Unique. Must match WordPress URL slugs exactly  |
| name               | text        |                                                 |
| category           | text        | 'Buy and Hold' or 'Tactical'                    |
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

| Column         | Type | Notes                                         |
|----------------|------|-----------------------------------------------|
| asset_class    | text | Primary key                                   |
| default_color  | text | Hex color code                                |
| default_ticker | text | Default ETF ticker for this asset class       |
| description    | text |                                               |

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

### Table: user_subscriptions
One row per Memberful subscriber. `user_id` is nullable — Memberful fires the webhook before the user may have created a Supabase account. The user_id gets linked at first login by matching email in `app/auth/callback/route.js`.

| Column             | Type        | Notes                                                                       |
|--------------------|-------------|-----------------------------------------------------------------------------|
| id                 | uuid        | Auto-generated                                                              |
| user_id            | uuid        | FK → auth.users.id — nullable until first login                             |
| email              | text        | Memberful member email                                                      |
| memberful_member_id | text        | Memberful member ID string — unique constraint, used as upsert conflict key |
| plan               | text        | 'builder' or 'signals'                                                      |
| billing_period     | text        | 'monthly' or 'annual'                                                       |
| status             | text        | 'active', 'cancelled', or 'expired'                                         |
| current_period_end | timestamptz | When the current billing period ends (used to show renewal/access-until)    |
| updated_at         | timestamptz | Last updated                                                                |
| created_at         | timestamptz | Auto-generated                                                              |

RLS: users can read only their own row (matched by user_id). Webhook handler uses service role key and bypasses RLS.

### Table: user_portfolios
Saved custom mixes from the Portfolio Builder.

| Column      | Type        | Notes                                                                       |
|-------------|-------------|-----------------------------------------------------------------------------|
| id          | uuid        | Auto-generated                                                              |
| user_id     | uuid        | FK → auth.users.id                                                          |
| name        | text        | User-provided mix name (optional)                                           |
| selections  | jsonb       | Array of `{ slug, weight }` objects — e.g. `[{"slug":"golden-butterfly-portfolio","weight":"50"}]` |
| created_at  | timestamptz | Auto-generated                                                              |

RLS: users can read/insert/delete only their own rows. Builder tier enforces a max of 3 rows at the API layer (not DB constraint).

### Blog post writing workflow

1. Pick the next post from `content-calendar.md` (recommended order: Posts 1–3 first, then 11–12)
2. Pull fresh stats for the portfolios referenced in that post — never hardcode numbers (see options below)
3. Write the post in Claude (target ~1,200 words; follow style rules below)
4. Insert into `blog_posts` with `status = 'draft'`. **Note (confirmed June 2026): drafts do NOT render at `/blog/[slug]`** — `getBlogPost()` in `lib/db.js` filters `.eq('status', 'published')` and RLS only allows public reads of published rows, so the page 404s on a draft. Review the draft instead via the saved markdown file (e.g. `blog-drafts/[slug].md`) in any markdown viewer, or query Supabase directly. The only way to "preview live" is to temporarily flip `status` to `'published'`.
5. Nick edits the two `[ADD YOUR TAKE HERE]` slots, then flips to `status = 'published'` and sets `published_at` — goes live immediately
6. Mark the post as published in `content-calendar.md`

**Option A — temp Node script (preferred, no manual SQL needed):**
```js
// run with: node scripts/fetch-stats-temp.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('portfolio_stats')
  .select('slug,name,cagr,max_drawdown,sharpe_ratio,sortino_ratio,ulcer_index,ulcer_performance_index,best_year,worst_year,cagr_10yr,cagr_gfc,cagr_dotcom,rolling_1yr_low,rolling_1yr_avg,rolling_1yr_high,rolling_3yr_low,rolling_3yr_avg,rolling_3yr_high,rolling_10yr_low,rolling_10yr_avg,rolling_10yr_high')
  .in('slug', ['slug-1', 'slug-2', 'slug-3'])
  .then(({ data }) => data.forEach(p => console.log(JSON.stringify(p, null, 2))));
```
Delete the temp script after use. A similar temp script can be used to insert a draft — see Post 2 session (May 2026) for reference.

**Option B — SQL in Supabase SQL Editor:**
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

**Crisis period definitions (confirmed from view source):**
- `cagr_gfc` — annualized CAGR over 2007–2009 (Global Financial Crisis). Describe in posts as "during the 2007–2009 financial crisis."
- `cagr_dotcom` — annualized CAGR over 2000–2002 (dot-com crash). Describe as "dot-com crash (2000–2002)."
- Both require ≥24 months of data in the window to be non-null.

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
sharpe_ratio, sortino_ratio, best_year, worst_year, ytd_return, total_months, last_updated,
cagr_1yr, cagr_3yr, cagr_10yr, ulcer_index, ulcer_performance_index, cagr_gfc, cagr_dotcom,
annualized_volatility, pct_profitable_months, best_month, worst_month, longest_drawdown_months,
rolling_1yr_low, rolling_1yr_avg, rolling_1yr_high,
rolling_3yr_low, rolling_3yr_avg, rolling_3yr_high,
rolling_5yr_low, rolling_5yr_avg, rolling_5yr_high,
rolling_10yr_low, rolling_10yr_avg, rolling_10yr_high.

`cagr_1yr` — trailing 12-month total return (requires ≥12 months in window). `cagr_3yr` — trailing 3-year annualized return (requires ≥36 months). Both added June 2026 for the Strategy Leaderboard.

`annualized_volatility` — `stddev(monthly_return) * sqrt(12)`, in percentage points. `pct_profitable_months` — % of months with a positive return, rounded to 1 decimal. `best_month` / `worst_month` — single-month extremes in percentage points. `longest_drawdown_months` — integer count of the longest consecutive streak of months below the prior peak (computed via `drawdown_groups` + `longest_drawdown` CTEs on `running_peak`). All five added June 2026.

Source of truth for the view definition: `scripts/portfolio_stats_view.sql`.
To add a column: edit that file, then paste the full DROP + CREATE into the Supabase SQL Editor and run it.

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

- **Date-only columns (e.g. `date`, `published_at`) display one day early in US timezones** if formatted naively. `new Date('2026-06-01')` parses as UTC midnight, which is May 31 in EST/PST. Always pass `{ timeZone: 'UTC' }` to `toLocaleDateString()` when formatting date-only strings from Supabase: `new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })`.

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
      page.js                        # Glossary page (server) — 36 terms, A–V (+ H, P added June 2026), alphabet anchor nav, links to Methodology + related portfolios
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
    compare/
      page.js                        # Portfolio Comparison page (server, dynamic) — reads ?slugs= param, fetches up to 4 portfolios, passes to CompareClient
    login/
      page.js                        # Login page (server) — reads searchParams.next + searchParams.error; renders LoginForm
    account/
      page.js                        # Account page (server, force-dynamic) — fetches user + subscription + saved mixes; shows plan badge, renewal date, saved mix list; redirects to /login if unauthenticated
    auth/
      callback/
        route.js                     # Auth callback route — exchanges code for session, links Memberful subscription by email (sets user_id on matching null-user_id row), redirects to ?next= param
    builder/
      page.js                        # Portfolio Builder page (server, force-dynamic) — fetches auth user + active subscription (tier) + saved mix count + getPortfolioNames() + getAllAllocations() + getCurrentSignals() server-side; passes userId/tier/savedCount/allPortfolios/mixParam/allAllocations/allSignals to BuilderClient
    monte-carlo-simulation/
      page.js                        # Monte Carlo Simulation page (server, dynamic) — reads ?slug= param, pre-fetches monthly returns server-side, passes to MonteCarloClient
    api/
      monte-carlo-returns/
        route.js                     # GET — returns monthly_returns + portfolio stats for a given slug; used by MonteCarloClient when user changes portfolio
      builder-returns/
        route.js                     # GET — takes ?slugs=a,b,c (max 6), returns monthly_returns grouped by slug; used by BuilderClient when portfolios are added and by handleDownloadPDF to fetch benchmark returns (60/40 + US Market). Uses .range() pagination to bypass Supabase PostgREST's 1,000-row server cap — without this, benchmark data silently truncates around 2016-2017.
      builder-save/
        route.js                     # POST — verifies auth (401), active subscription (403), builder 3-mix limit (429); inserts to user_portfolios; returns { id }
      memberful/
        route.js                     # POST — Memberful webhook handler; HMAC-SHA256 signature verification (X-Memberful-Webhook-Signature header); handles subscription.activated/created/renewed/updated → 'active'; subscription.deactivated → 'cancelled'; subscription.deleted/member.deleted → 'expired'; upserts user_subscriptions; mapPlan() checks name contains 'signals'/'builder'; mapBillingPeriod() checks for 'annual'/'yearly'
      portfolios/
        [id]/
          route.js                   # DELETE — verifies auth, deletes user_portfolio row with .eq('id', id).eq('user_id', user.id) (RLS double-enforced)
    sitemap.js                       # Dynamic sitemap (portfolio slugs + static pages + strategy pages + blog posts)
    robots.js                        # robots.txt
    opengraph-image.js               # Static OG image for homepage and other pages (1200×630)
    portfolios/
      [slug]/
        opengraph-image.js           # Dynamic per-portfolio OG image — fetches live data, renders name/CAGR/Sharpe/MaxDD
  components/
    Navbar.jsx                       # Top navigation bar (server) — accepts portfolios prop, renders NavSearch + account_circle icon linking to /account; uses portfoliodb-icon.svg logo
    portfoliodb-icon.svg             # Site logo SVG (also copied to public/ for Next.js Image)
    NavSearch.jsx                    # Navbar search box (client) — search icon by default; click opens floating panel with input + results
    MobileMoreMenu.jsx               # Mobile "More ▾" dropdown (client) — toggles Compare, Builder, Monte Carlo, Membership, Account links; click-outside to close
    FilterBar.jsx                    # Home page filter bar (client) — navigates to /database
    AIRecommend.jsx                  # AI "find portfolios" search bar (client) — placeholder uses goal-based language (e.g. 'saving for retirement in 20 years')
    TopStrategies.jsx                # Homepage "Top Strategies by" section (client) — dropdown toggles Sharpe/CAGR/Min Drawdown; data pre-computed server-side
    DatabaseClient.jsx               # Database page UI with filters/sort/grid/list (client)
    ScreenerClient.jsx               # Screener page UI with sliders/table/export/column-picker (client)
    AllocationDonut.jsx              # SVG donut chart — server-renderable, no JS
    GrowthChart.jsx                  # Recharts area chart for Growth of $10K (client)
    DrawdownChart.jsx                # Recharts area chart for Historical Drawdown (client)
    RollingReturnChart.jsx           # Recharts line chart for Rolling Returns 1Y/3Y/5Y/10Y (client)
    ChartsSection.jsx                # Client wrapper owning benchmark, timeline, and log/linear scale toggle state
    StructuredData.jsx               # Two JSON-LD schema tags for portfolio pages: (1) FinancialProduct (name, description, CAGR, max drawdown, Sharpe, asset allocation); (2) BreadcrumbList (PortfolioDB → Database → [Portfolio Name])
    GoogleAnalytics.jsx              # GA4 script tag — fires only on www.portfoliodb.com (hostname check in inline script)
    EmailCapture.jsx                 # Email capture card (client) — compact horizontal layout, posts to /api/subscribe, success/error states
    Footer.jsx                       # Site-wide footer (server) — copyright, nav links (Membership, ToS, Privacy Policy, Methodology, Glossary, Support)
    StatTooltip.jsx                  # Stat info tooltip (client) — label + info icon + fixed-position hover/click tooltip card; re-exports STAT_DEFINITIONS from lib/statDefinitions.js
    SignalTeaser.jsx                 # Blurred placeholder signal rows + lock overlay + "See membership options" link — static, no data fetching; only rendered on covered portfolios (kofi_link IS NOT NULL)
    SignalTeaserWrapper.jsx          # Client component — wraps SignalTeaser; on mount checks auth + active Signals subscription via /api/current-holdings/[slug]; if Signals member shows real holdings with date label; otherwise renders SignalTeaser (locked). Keeps portfolio pages SSG — auth check is entirely client-side. Date display uses { timeZone: 'UTC' } — date-only strings from Supabase (e.g. 2026-06-01) parse as UTC midnight and roll back a day in US timezones without this.
    MaterialSymbolsActivator.jsx     # Client component — renders null; useEffect flips the Material Symbols <link media="print"> to media="all" after hydration, making the icon font load non-blocking (Fix #13, June 2026)
    HoldingPeriodHeatmap.jsx         # Client component — triangular CAGR heatmap (start year × holding period), color-coded 8-band scale, hover tooltip with reserved height. Rendered full-width on portfolio detail pages.
    PortfolioJumpNav.jsx             # Client component — sticky in-page jump nav on portfolio detail pages. Dynamically measures Navbar height on mount + resize (works for both mobile 86px and desktop 49px). 7 section pills with scroll-spy active highlighting; smooth scroll on click. navSections array computed server-side so conditional pills only appear when those sections render.
    WithdrawalRatesTable.jsx         # Client component (`'use client'` added June 2026) — SWR + PWR table across 20/25/30/40-year horizons, nominal and real (3% inflation). Shows "Passes the 4% Rule" badge when 30yr real SWR ≥ 4.0%. Data passed as prop from page.js (server) or computed client-side in BuilderClient. "Run Monte Carlo →" CTA in footer — conditional on `slug` prop being provided.
    ToolsMenu.jsx                    # Client component — desktop "Tools ▾" dropdown in Navbar; contains Leaderboard, Drawdown Analyzer, Compare, Builder, Monte Carlo with label + one-line description per item; click-outside to close
    PricingToggle.jsx                # Client component — Builder card shows "Free" + "Sign in free" CTA (→ /login?next=/builder, no Memberful URL); Signals card keeps monthly/annual billing toggle (defaults to annual) with "Save ~25%" badge and 2 Memberful checkout URLs (Signals Monthly 147941, Signals Annual 147942); "Most Popular" badge on Signals card; signalCount prop for dynamic feature bullet
    LoginForm.jsx                    # Client component — email magic link + Google OAuth; both pass next param through callback URL; "Check your email" sent-state after OTP
    SignOutButton.jsx                # Client component — calls supabase.auth.signOut(), router.push('/'), router.refresh()
    SavedMixList.jsx                 # Client component — displays saved mixes with inline delete confirmation (no window.confirm); buildLoadUrl() generates /builder?mix=slug:weight,... URLs; empty state + Builder tier (x/3) counter with upgrade link; shows blended holdings per mix card (Signals tier = real data; Builder tier = blurred with upgrade prompt); accepts allAllocations + allSignals props from account/page.js
    CurrentSignals.jsx               # Client component — two contexts: (1) 'builder': renders a single blended holdings list computed from the mix's weights × each portfolio's current holdings/allocations; tactical portions blurred for non-Signals members; (2) 'account': grid of all signal portfolios with current month holdings (blurred with lock overlay for non-Signals). Props: context, blendedHoldings (builder), signals (account), tier
    CompareClient.jsx                # Portfolio Comparison page UI (client) — portfolio search/add, pills, header cards, stats table, allocation donuts, growth chart
    CompareGrowthChart.jsx           # Multi-line Recharts LineChart for comparison (client) — one colored line per portfolio, connectNulls=false
    MonteCarloClient.jsx             # Monte Carlo simulation UI (client) — all inputs, 1,000-simulation engine, 5-line percentile chart (Recharts LineChart), stat cards, SWR binary search
    BuilderClient.jsx                # Portfolio Builder UI (client) — two-section layout: top 2-column area (selector + quick stats/Growth chart), full-width analysis below (Performance Snapshot alongside Blended Holdings, Drawdown+Rolling Returns 2-up, SWR/PWR table, Holding Period Heatmap). Save CTA lives inside the selector card. All analysis sections below the 2-col area are gated behind Builder/Signals tier. "Download PDF" button (tier only) dynamically imports @react-pdf/renderer + BuilderPDF on click. Does NOT receive allAllocations/allSignals as props — fetches them client-side via /api/builder-holdings when 2+ portfolios are selected. Growth chart has "Compare to" pill selector (None / US 60/40 / US Stocks / Global Stocks); benchmark data fetched on demand via /api/builder-returns and cached in benchmarkCache; same benchmark overlaid on Drawdown and Rolling Returns charts for tier members. Performance Snapshot (tier) shows "Portfolio / US 60/40" side-by-side on all 14 stats; US 60/40 data auto-fetched when isReady, filtered to the blended mix's date range for a fair comparison.
    BuilderPDF.jsx                   # react-pdf Document for Portfolio Builder PDF export (Builder/Signals tier only) — 3-page landscape A4: (1) mix composition + 12-stat grid + Growth of $10K chart; (2) annual returns table with US 60/40 + US Market benchmark columns + drawdown chart; (3) rolling 1/3/5yr return charts. All charts built from SVG primitives. Benchmark data fetched via /api/builder-returns on download click.
  app/
    leaderboard/
      page.js                        # Strategy Leaderboard (server, fully static SSG) — uses anon supabase client (NOT createServerSupabaseClient). No revalidate — page rebuilds with each Vercel deploy, which aligns with the monthly data update cycle. IMPORTANT: do NOT add revalidate or call cookies() here; either opts the page into ISR reads. Public data only — no auth needed. Fetches portfolio_stats selecting cagr_1yr/cagr_3yr/cagr_10yr/ytd_return/sharpe_ratio; passes to LeaderboardClient
      LeaderboardClient.jsx          # Client component — 5 tabs (YTD, 1-Year, 3-Year, 10-Year, Sharpe); sorts portfolios by active tab; medals for top 3; category badges; links to portfolio detail pages
    changelog/
      page.js                        # Changelog (static server component) — hardcoded CHANGELOG array of { month, entries: [{ type, text }] }; type = 'new' | 'improvement' | 'fix'; color-coded badges. Update this file each month before pushing.
    tools/
      drawdown-analyzer/
        page.js                      # Drawdown Analyzer page shell (server, static metadata)
        DrawdownAnalyzerClient.jsx   # Client component — 4 crash presets (dot-com, 2008, COVID, 2022) + custom month range inputs; fetches /api/drawdown-analysis?from=YYYY-MM&to=YYYY-MM; results table sorted by total return or max drawdown; vs US 60/40 delta on every row; medals for top 3
      portfolio-map/
        page.js                      # Portfolio Map page (server, SSG) — fetches lean columns from portfolio_stats (slug, name, category, cagr, annualized_volatility, sharpe_ratio, max_drawdown); static description explains all controls; passes data to PortfolioMapClient
        PortfolioMapClient.jsx       # Client component — Recharts ScatterChart plotting all portfolios by volatility or max drawdown (X) vs CAGR (Y). Controls: X-axis toggle (Volatility / Max Drawdown), period toggle (Full History / 20 Years / 10 Years), category filter pills (Buy and Hold / Tactical), search/highlight box. Period data fetched from /api/portfolio-map-stats with client-side cache. Logged-in users' saved mixes appear as orange overlay dots (fetched via /api/builder-returns + computeStats). DotShape and MixDotShape defined outside component for stable Recharts references. Click portfolio dot → /portfolios/[slug]; click mix dot → /builder?mix=...
      correlation/
        page.js                      # Correlation Matrix page shell (server, static metadata) — fetches getAllPortfolioStrategies() server-side and passes as allStrategies prop to CorrelationMatrixClient
        CorrelationMatrixClient.jsx  # Client component — fetches the full pairwise matrix from /api/correlation-matrix on mount; renders an HTML table heatmap with inline numeric correlation values in uniform cells. Category pills filter columns (x-axis) only — rows always show all portfolios. "Select strategies" picker filters columns to portfolios tagged with selected strategies. "Select portfolios" picker narrows columns to exact portfolio set. Priority stack: portfolio picker > strategy filter > category pills. "Clear all" button appears when any filter is active, resets all three. Fixed-height info panel above grid (h-[68px], truncated names) prevents layout shift. Cursor tooltip floats next to mouse with full pair names + correlation label + value; flips away from viewport edges. Click any off-diagonal cell → /compare?slugs=a,b. See "Correlation Matrix layout notes" for full implementation details.
    api/
      builder-holdings/
        route.js                     # GET ?slugs=a,b,c — returns allocations (with color fallback) + current tactical signals for the requested slugs only. Called client-side by BuilderClient when 2+ portfolios are selected. Replaces the server-side getAllAllocations()+getCurrentSignals() that used to load on every /builder page open.
      current-holdings/
        [slug]/
          route.js                   # GET — verifies auth + active Signals subscription; returns current month holdings from tactical_monthly_holdings for one portfolio slug; used by SignalTeaserWrapper
      drawdown-analysis/
        route.js                     # GET ?from=YYYY-MM&to=YYYY-MM — fetches all monthly_returns in date window, computes total return + max drawdown per portfolio, joins portfolio names/categories, returns sorted results array
      portfolio-map-stats/
        route.js                     # GET ?period=10yr|20yr — computes windowed risk/return stats for the Portfolio Map. Step 1: metadata from portfolio_stats. Step 2: row count with .gte('date', cutoff). Step 3: parallel pagination via Promise.all across all pages simultaneously (fast vs sequential). Step 4: groups by slug, runs computeStats() from lib/portfolioStats, skips portfolios with < 12 months in window. Returns [{ slug, name, category, cagr, annualized_volatility, sharpe_ratio, max_drawdown, total_months }].
      correlation-matrix/
        route.js                     # GET — computes the full pairwise Pearson correlation matrix across all portfolios. `export const revalidate = 86400` caches the response for 24h (monthly_returns only changes once a month). Step 1: metadata from portfolio_stats. Step 2–3: row count + parallel paginated fetch of all monthly_returns (same .range() pattern as portfolio-map-stats, but unfiltered — full history). Step 4: groups into Map<date, return> per slug for O(1) overlap lookup. Step 5: for each pair, intersects the two date-maps and runs pearsonCorrelation() — null if fewer than MIN_OVERLAP_MONTHS (24) overlapping months. Portfolios with < 24 months of total history are excluded entirely. Returns `{ portfolios: [{slug, name, category}], matrix: number[][] }` (matrix[i][j] = correlation or null, diagonal = 1).
  lib/
    supabase.js                      # Supabase client init — legacy createClient (for lib/db.js) + createBrowserSupabaseClient() + createServerSupabaseClient(cookieStore) via @supabase/ssr
    db.js                            # All database query functions (see below)
    statDefinitions.js               # Plain JS (no 'use client') — STAT_DEFINITIONS object with definitions for 19 stat keys; importable by both server and client components
    withdrawalRates.js               # Plain JS — `buildWithdrawalRates(monthlyReturns)` computes SWR + PWR for 4 durations × 2 inflation modes using Bengen rolling-window binary search (20 steps). Called server-side in portfolio detail page. Returns `{ 20: { swr_nominal, swr_real, pwr_nominal, pwr_real }, 25: ..., 30: ..., 40: ... }` or null per duration when data is insufficient.
    portfolioStats.js                # Plain JS — shared stat helpers used by BuilderClient and PortfolioMapClient. Exports: `RF_MONTHLY` (4.5% annual / 12), `buildBlendedReturns(portfolioReturns, selections)` (intersects date sets across portfolios, returns weighted blended monthly returns; handles single-portfolio case), `computeStats(blended)` (returns null if < 12 months; computes CAGR, maxDrawdown, sharpe, sortino, bestYear, worstYear, ulcerIndex, ulcerPerformanceIndex, ytdReturn, cagr10yr, gfcCagr, dotcomCagr, annualizedVolatility, pctProfitableMonths, bestMonth, worstMonth, longestDrawdownMonths, growthData, annualReturns, totalMonths, startDate, endDate). Mirrors the math in the portfolio_stats materialized view.
  public/
    fonts/
      Manrope-Bold.ttf               # Manrope 700 — used by OG image routes (next/og requires TTF)
      Manrope-ExtraBold.ttf          # Manrope 800 — used by OG image routes
  scripts/
    update-descriptions.js           # Node.js script — reads all description-drafts/*.md and pushes to Supabase via service role key. Run with: node scripts/update-descriptions.js
  proxy.js                           # Auth middleware (Next.js 16 — replaces deprecated middleware.js); exports proxy() + config; protects /account route; refreshes session cookies via supabase.auth.getUser()
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
| `getPortfolioNames()`  | name + slug + kofi_link from portfolios table, alphabetical — kofi_link used by BuilderClient to identify tactical/signal portfolios |
| `getCurrentSignals()`  | Current month's holdings for all signal-set portfolios (kofi_link IS NOT NULL) from tactical_monthly_holdings — uses a 2-step query: first fetches the single latest date (avoids Supabase's 1,000-row cap as history accumulates), then fetches all holdings for that date only. Weights stored as decimal fractions (0–1) in DB, multiplied by 100 before returning. Returns: [{ slug, name, date, holdings: [{ ticker, weight }] }] |
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
| SUPABASE_SERVICE_ROLE_KEY     | app/api/memberful/route.js + scripts — bypasses RLS for webhook upserts and bulk scripts; never expose client-side; mark as Sensitive in Vercel |
| ANTHROPIC_API_KEY             | app/api/screener/route.js    |
| NEXT_PUBLIC_SITE_URL          | generateMetadata() canonical URLs |
| NEXT_PUBLIC_GA_MEASUREMENT_ID | components/GoogleAnalytics.jsx — GA4 measurement ID (e.g. G-XXXXXXX) |
| MAILERLITE_API_KEY            | app/api/subscribe/route.js — MailerLite API token (server-side only, never expose client-side) |
| MAILERLITE_GROUP_ID           | app/api/subscribe/route.js — MailerLite group ID to add subscribers to |
| MEMBERFUL_WEBHOOK_SECRET      | app/api/memberful/route.js — HMAC-SHA256 secret for verifying Memberful webhook payloads (auto-generated in Memberful → Settings → Webhooks); mark as Sensitive in Vercel |
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
| Portfolio Comparison   | `/compare`               | Complete |
| Portfolio Builder      | `/builder`               | Complete |
| Monte Carlo Simulation | `/monte-carlo-simulation`| Complete |
| Login                  | `/login`                 | Complete |
| Account                | `/account`               | Complete |
| Strategy Leaderboard   | `/leaderboard`           | Complete |
| Drawdown Analyzer      | `/tools/drawdown-analyzer` | Complete |
| Portfolio Map          | `/tools/portfolio-map`   | Complete |
| Correlation Matrix     | `/tools/correlation`     | Complete |
| Changelog              | `/changelog`             | Complete |
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
- Placed on: homepage (above Top Strategies, directly below the hero), membership page (above price callout), portfolio detail pages (below Related Portfolios)
- Current copy: "Free Report" badge + `picture_as_pdf` icon; headline is the actual report title "How Index Fund Portfolios Performed in the Two Worst Crashes of the Last 25 Years"; subline "Download the free PDF — plus get monthly portfolio insights from PortfolioDB."
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
- Two-row layout: first row has logo + desktop nav links (`hidden md:flex`) + NavSearch icon + `account_circle` icon; second row (`flex md:hidden`) shows Database/Screener/Strategies + `<MobileMoreMenu />` on mobile only
- **Desktop nav links (June 2026):** Database · Screener · Strategies · **Tools ▾** · Membership. The Tools dropdown (`ToolsMenu.jsx`) replaced the individual Compare/Builder/Monte Carlo links and adds Leaderboard and Drawdown Analyzer.
- **`ToolsMenu.jsx`** (client) — dropdown containing: Leaderboard, Drawdown Analyzer, Portfolio Map, Compare, Builder, Monte Carlo. Each item has a label + one-line description. Click-outside to close.
- **`MobileMoreMenu.jsx`** (client) — "More ▾" dropdown on mobile; sections: Tools (Leaderboard, Drawdown Analyzer, Portfolio Map, Compare, Builder, Monte Carlo) with a divider then Membership and Account.
- **URL convention (decided June 2026):** Analytical chart tools (Drawdown Analyzer, Portfolio Map) live under `/tools/`. Workflow tools (Builder, Compare, Monte Carlo, Leaderboard, Screener) stay at the top level. Rationale: moving the already-indexed workflow tool URLs would cost SEO. Do not move existing `/tools/` routes to the top level or vice versa without a redirect plan.
- `account_circle` icon (22px) links to `/account` — no auth check needed here; middleware redirects unauthenticated users to `/login?next=/account` automatically
- Stays a server component — all interactivity is in NavSearch.jsx, ToolsMenu.jsx, and MobileMoreMenu.jsx (all client)
- JSDoc `@param` type annotation on props is required to avoid TypeScript `never[]` errors when called from layout.tsx
- Logo uses `<Image src="/portfoliodb-icon.svg">` (file lives in `public/`); the copy in `components/` is the original source

### FilterBar.jsx (home page)
- No longer uses assetClasses prop — categories are hardcoded (Buy and Hold, Tactical)
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
- Collapsed to a `search` icon (22px) by default; clicking opens a floating panel that drops below the icon without disturbing the navbar layout
- Panel contains an auto-focused input with a `x` clear button; results list appears below as user types
- Filters client-side as user types (case-insensitive, up to 8 results shown)
- Click a result or press Enter to navigate to `/portfolios/[slug]`; Escape or click-outside closes the panel and clears the query

### GrowthChart.jsx
- Client component using Recharts AreaChart
- Input: `data` array of `{ label: 'YYYY', value: number, benchmark?: number }`
- Accepts `logScale` boolean prop — passes `scale="log"` to Recharts YAxis when true
- Accepts `benchmarkLabel` string prop — shown in tooltip next to benchmark value (dynamic, not hardcoded)
- Renders optional grey dashed benchmark Area when any data point has `benchmark != null`
- Growth of $10K computed in portfolio detail page by compounding monthly_returns, downsampled to one point per year

### DrawdownChart.jsx
- Recharts AreaChart showing % decline from running peak (values always ≤ 0)
- Input: `data` array of `{ label: 'YYYY-MM', value: number, benchmark?: number }`
- Accepts `benchmarkLabel` string prop — shown in tooltip next to benchmark value
- Y-axis domain: `Math.floor(min/5)*5 - 5` to 0

### RollingReturnChart.jsx
- Recharts LineChart with 1Y/3Y/5Y/10Y tab buttons
- Input: `datasets` object keyed by window label, each value is same data shape
- Accepts `benchmarkLabel` string prop — shown in tooltip next to benchmark value
- Tabs hidden when that window's data is empty
- Optional grey dashed benchmark Line

### ChartsSection.jsx
- Client component — owns `selectedBenchmark`, `show10yr`, and `logScale` toggle state
- `logScale` defaults to `true` (log scale is the default view for Growth of $10K)
- Accepts `section` prop: `'all'` (default) renders all three charts; `'growth'` renders only the benchmark bar + Growth of $10K; `'charts'` renders only Historical Drawdown + Rolling Returns. Used on portfolio detail pages to split layout (Growth at 8-col width alongside sidebar, Drawdown/Rolling at full width).
- "Compare to" bar shows up to 3 benchmarks (None / US 60/40 / US Stocks / Global Stocks); each page's own slug is filtered out so a portfolio never compares to itself
- "Full / Last 10Y" toggle and "Log / Linear" toggle both appear under the Growth of $10K heading
- `mergeWithBenchmark()` merges benchmark data into chart data by label
- `alignGrowthToCommonStart()` re-indexes both portfolio and benchmark growth values to $10,000 at the first common year when a benchmark is selected — prevents mismatched starting values when portfolios have different history lengths
- All benchmark data computed in portfolios/[slug]/page.js and passed as a `benchmarks` object keyed by slug: `{ [slug]: { label, growthData, growthData10yr, drawdownData, rollingDatasets } }`
- Three benchmarks: `united-states-60-40-portfolio` (US 60/40), `us-stock-market` (US Stocks), `global-stock-market` (Global Stocks)

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

### PricingToggle.jsx (Membership Page — /membership)

- Client component embedded in `app/membership/page.js` (server component passes `signalCount` prop)
- Defaults to `isAnnual = true` (annual toggle active on load)
- "Save ~25%" badge shown on the Yearly toggle button
- Each plan card shows: tier name, monthly equivalent price, per-year price, feature list, CTA button
- CTA logic: `url === '#'` → disabled grey "Coming soon" button; real URL → live `<a>` tag to Memberful checkout
- "Most Popular" badge rendered on Signals card
- Memberful checkout URL format: `https://portfoliodb.memberful.com/checkout?plan=ID`

### LoginForm.jsx (Login Page — /login)

- Client component — props: `next = '/account'`, `authError = null`
- Two auth methods: email magic link (OTP) and Google OAuth
- Both pass `next` through the redirect URL to `/auth/callback?next=...`
- After submitting email: shows "Check your email" confirmation panel (replaces form)
- `authError` prop renders an inline error banner (set from `searchParams.error` in login/page.js)
- Uses `createBrowserSupabaseClient()` from `lib/supabase.js`

### SignOutButton.jsx

- Client component — single button; calls `supabase.auth.signOut()` then `router.push('/')` and `router.refresh()`
- Rendered in the top-right of `app/account/page.js`

### SavedMixList.jsx (Account Page — /account)

- Client component — props: `initialMixes` (array), `tier` ('builder' | 'signals'), `allAllocations` (array), `allSignals` (array from getCurrentSignals)
- `buildLoadUrl(selections)` builds `/builder?mix=${encodeURIComponent(slug:weight,slug:weight)}` URLs — clicking a mix opens it pre-loaded in the Builder
- Delete: shows inline "Delete? Yes / Cancel" confirmation per row (no `window.confirm`)
- Empty state: "No saved mixes yet" with "Go to Builder" CTA
- Builder tier: shows `{mixes.length}/3 mixes used` counter with upgrade link when 3 are saved
- Delete calls `DELETE /api/portfolios/[id]` and removes the mix from local state on success
- **Blended holdings** shown inside each mix card below the weight pills — same computation as BuilderClient's `blendedHoldings` useMemo (portfolio weight × holding weight, summed by ticker). Signals tier sees real ticker chips; Builder tier sees blurred chips + "Tactical holdings visible with Signals membership" inline prompt. `allocBySlug`, `signalBySlug`, and `tacticalSlugs` are pre-computed once via useMemo and shared across all mix cards.

### app/account/page.js (Account Page — /account)

- Server component with `export const dynamic = 'force-dynamic'` (no caching — always shows fresh data)
- Redirects unauthenticated users to `/login?next=/account`
- Fetches subscription + saved mixes + `getCurrentSignals()` + `getAllAllocations()` in parallel via `Promise.all`
- Subscription query: `status IN ('active', 'cancelled')`, ordered by `created_at DESC`, `limit(1)` — gets most recent active or cancelled plan
- **`tier` (June 2026):** computed as `subscription?.plan === 'signals' ? 'signals' : 'builder'` — every signed-in user gets at least `'builder'` for free; only an active Signals subscription elevates further. The Plan section's `subscription ? ... : ...` branch still reflects only *paid* Memberful subscriptions (for billing/cancellation display) — it is independent of feature access now.
- Plan card (only rendered when a paid `subscription` row exists) shows: tier badge (`Builder`/`Signals`), billing period, status (cancelled shows red "Cancelled" pill), "Access until [date]" for all statuses (not "Renews" — Memberful doesn't fire a webhook on self-cancellation so status can't be determined in real time), "Reactivate" link for cancelled / "Manage subscription" link for active → `https://portfoliodb.memberful.com/account`
- No paid subscription: "No paid plan" card — copy clarifies Builder features are already free with an account, and upsells Signals for trade signals
- **Page section order:** Plan → Saved Mixes → Current Signals
- Saved Mixes section: always renders `<SavedMixList>` (every signed-in user has at least Builder access — the old "locked, no tier" empty state was removed June 2026); shows `(x/3)` counter when `tier === 'builder'`; passes `allAllocations` + `allSignals` to `SavedMixList` for blended holdings display
- Current Signals section: `<CurrentSignals context="account" signals={signals} tier={tier} />` — shows all signal portfolios' current month holdings; blurred with lock overlay for non-Signals members

### proxy.js (Auth Middleware — Next.js 16)

- **Important:** `middleware.js` is deprecated in Next.js 16. The file is `proxy.js` and exports `proxy` (not `middleware`). Next.js picks this up automatically.
- Creates a `@supabase/ssr` server client on every request to refresh session cookies
- Calls `supabase.auth.getUser()` immediately after creating the client — do not add logic between these two calls
- `PROTECTED_ROUTES = ['/account']` — route check: `pathname === route || pathname.startsWith(route + '/')` (the `+ '/'` suffix prevents false matches like `/account-settings`)
- Unauthenticated requests to protected routes get redirected to `/login?next=${pathname}`
- `config.matcher` excludes `_next/static`, `_next/image`, `favicon.ico`, and image file extensions

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

### MonteCarloClient.jsx (Monte Carlo Simulation — /monte-carlo-simulation)

- `app/monte-carlo-simulation/page.js` is a server component (`force-dynamic`) — reads `?slug=` from URL, pre-fetches `getMonthlyReturns(slug)` and `getPortfolio(slug)` server-side. Also checks auth and fetches `user_portfolios` for logged-in users to populate saved mixes in the selector.
- When the user changes the portfolio dropdown client-side, `MonteCarloClient` fetches fresh data from `GET /api/monte-carlo-returns?slug=...` (returns `{ returns, portfolio }`). When a saved mix is selected (value starts with `mix:`), fetches blended returns via `GET /api/builder-returns?slugs=...` and blends them client-side using `buildBlendedReturns()`.
- **Portfolio selector:** shows a "Custom Mixes" `<optgroup>` at the top (logged-in users with saved mixes only), followed by "All Portfolios". Mix values are prefixed `mix:<uuid>` to distinguish from portfolio slugs.
- **Simulation inputs:** portfolio selector, initial value, monthly contribution (optional), contribution duration (optional, blank = full period), withdrawal amount, withdrawal frequency (monthly/quarterly/annually), delay withdrawals (optional, years before withdrawals begin), inflation adjustment (3%/yr, yes/no), simulation period (1–50 years), return method (historical/statistical), sequence of returns risk (None or Worst 1–10 years first)
- **Return methods:**
  - *Historical (bootstrap):* randomly resamples full calendar years from the portfolio's actual monthly return history; maintains return autocorrelation within a year
  - *Statistical:* draws random monthly returns from a normal distribution fitted to the portfolio's historical mean and std dev (Box-Muller transform)
- **Sequence of returns risk:** groups monthly returns by calendar year, sorts years worst-to-best by annual return, prepends the N worst calendar years to the front of every simulation's return sequence; remaining period is bootstrapped or statistical as selected. All 1,000 simulations share the same forced-bad prefix. The worst years remain in the bootstrap pool (not removed after being forced to the front), so the random remainder still carries full tail risk (June 2026 fix).
- **Contributions:** applied every month after withdrawals. `contributionEndYear = 0` means contribute for the full period; any positive integer stops contributions after that year.
- **Withdrawal delay:** `withdrawalDelay = 0` means withdrawals start immediately. `currentYear = Math.floor(m / 12) + 1`; withdrawals only apply when `currentYear > withdrawalDelay`. Inflation adjusts the withdrawal amount from month 0 (even during the delay), so the amount is already inflation-adjusted when withdrawals begin.
- **Output:** Safe Withdrawal Rate card (green highlight, computed via 12-step binary search using `N_SIMS_SWR = 300` sims per step — the rate at which 90% of simulations survive). Plus 5-line Recharts `LineChart` + 4 stat cards (success rate, median ending balance, 90th percentile, 10th percentile).
- **SWR binary search:** `computeSWR()` searches monthly withdrawal between $0 and 25% of initial portfolio annually. Uses `nSims` param in `runMonteCarlo` so the reduced sim count divides correctly — **do not use `N_SIMS` constant** in the success rate denominator; use `nSims` (the parameter). `computeSWR()` receives and forwards the full sim params including `withdrawalDelay` and `contributionEndYear` — these are respected in the SWR calculation (June 2026 fix).
- **Inflation:** adjusts the withdrawal amount by `(1.03)^(1/12) - 1` every month, regardless of withdrawal frequency. On a withdrawal month, the current (already-inflated) amount is subtracted.
- **"Monte Carlo Simulation" button** on every portfolio detail page hero links to `/monte-carlo-simulation?slug=${slug}`, pre-populating the portfolio.
- Navbar: "Monte Carlo" link added to desktop nav and mobile More dropdown.

### BuilderClient.jsx (Portfolio Builder — /builder)

- `app/builder/page.js` is a server component (static) — fetches `getPortfolioNames()` and passes to `BuilderClient`
- `app/api/builder-returns/route.js` — GET endpoint, accepts `?slugs=a,b,c` (max 6), queries `monthly_returns` in one Supabase call, returns `{ [slug]: [{date, monthly_return}] }`

**Page layout (June 2026):**
- **Top 2-column area** (`lg:grid-cols-[380px_1fr]`): selector card (left, sticky) + quick results (right: 3-stat card + Growth of $10K chart). This is the fast-feedback loop — stats update immediately as weights change.
- **Full-width analysis below** (only when `isReady && stats`): Performance Snapshot + Blended Holdings side-by-side (`lg:grid-cols-[2fr_1fr]`), then Drawdown + Rolling Returns 2-up (`md:grid-cols-2`), then Withdrawal Rates, then Holding Period Heatmap.
- **Save CTA** lives at the bottom of the selector card (compact version of the 4 states), not in the analysis section.
- All analysis sections below the 2-col area are **gated** — blurred + lock overlay for non-tier users. `LockOverlay` is a shared sub-component defined just above the main export.

**Portfolio selection:**
- Search box filters `allPortfolioNames` client-side; selecting adds the portfolio and redistributes weights equally; max 6 portfolios
- Weight inputs: `inputMode="decimal"`, "↑N%" fill-remaining shortcut, total indicator turns green at exactly 100%
- `equalWeights(n)` — floor(100/n) per slot, last slot absorbs rounding

**Computation pipeline** (all `useMemo`, fire when `isReady` becomes true):
- `blendedReturns` — intersection of date sets across all portfolios, weighted monthly return per common month
- `stats` — calls `computeStats(blendedReturns)`: CAGR, Max Drawdown, Sharpe, Sortino, Best/Worst Year, YTD, 10yr CAGR, Ulcer Index, UPI, GFC/Dotcom CAGR, Ann. Volatility, Best/Worst Month, % Profitable Months, Longest Drawdown, growth data, annual returns
- `drawdownData` — calls `buildDrawdownData(blendedReturns)`: `[{ label: 'YYYY-MM', value: drawdown% }]` for `DrawdownChart`
- `rollingDatasets` — calls `buildRollingDatasets(blendedReturns)`: `{ '1Y': [...], '3Y': [...], ... }` for `RollingReturnChart`
- `heatmapData` — calls `buildHeatmapData(blendedReturns)` (same algorithm as portfolio detail page); only computed when `tier !== null`
- `withdrawalRates` — computed in a `useEffect` (deferred via `setTimeout(10ms)`) calling `buildWithdrawalRates(blendedReturns)` from `lib/withdrawalRates.js`; only computed when `tier !== null`. `swrLoading` state shows a spinner until it resolves.
- `growthDataMerged`, `drawdownDataMerged`, `rollingDatasetsMerged` — versions of the above with benchmark data merged in (benchmark overlay); pass through unchanged when no benchmark is selected
- `bench6040Stats` — `computeStats()` run on US 60/40 returns filtered to the same date range as `blendedReturns`; used for the Performance Snapshot benchmark column

**Benchmark "Compare to" (Growth chart — free for all users):**
- `BENCHMARKS` constant: `[{ slug, label }]` for US 60/40, US Stocks, Global Stocks
- `selectedBenchmark` state (null = none); pill selector appears below "Growth of $10,000" heading
- Benchmark data fetched on demand via `/api/builder-returns` and cached in `benchmarkCache` (shared cache also holds US 60/40 for the Snapshot column)
- Selected benchmark is auto-deselected if the user adds it to their mix
- Benchmark overlay applies to all three charts: Growth (free), Drawdown and Rolling Returns (tier only)
- Merge helpers defined outside component: `alignAndMergeGrowth()` re-indexes both lines to a common start year; `mergeDrawdownBench()` and `mergeRollingBench()` merge by label

**Free stats:** 3-stat card (CAGR, Max Drawdown, Sharpe) always visible. Growth of $10K chart with Log/Linear toggle and Compare to benchmark selector always visible.

**Performance Snapshot (gated, 14 stats in 2 columns):**
- Left: Sortino, Best Year, YTD Return, Ulcer Index, GFC CAGR, Ann. Volatility, Best Month
- Right: Worst Year, 10-Year CAGR, Ulcer Perf. Index, Dot-com CAGR, Worst Month, Profitable Months, Longest Drawdown
- Blurred + lock overlay for non-tier; sits at 2/3 width alongside Blended Holdings (1/3)
- All 14 stats show "Portfolio / US 60/40" side-by-side when `bench6040Stats` is available. US 60/40 data is auto-fetched via `useEffect` when `isReady` becomes true (no user action needed). `bench6040Stats` is filtered to the blended mix's exact date range so the comparison is apples-to-apples. `SnapshotRow` accepts optional `benchmarkValue` prop — renders `value / benchmarkValue` with the benchmark in `text-on-surface-variant`. "Portfolio / US 60/40" legend appears in the section header when loaded.

**Blended Holdings:** `CurrentSignals context="builder"` at 1/3 width beside Performance Snapshot. Buy & Hold portfolios use static allocations; tactical use current month signals. Tactical portion blurred for non-Signals members.

**Auth props:** `userId`, `tier`, `savedCount` from `app/builder/page.js`. `tier` is 'builder'/'signals'/null.

- **`parseMixParam(mixParam, allPortfolios)`** — parses `?mix=slug:weight,slug:weight` URL param; triggers `useEffect` on mount to pre-load return data
- **`localSavedCount`** — local state from `savedCount` prop; incremented after each save so the 3/3 limit UI shows immediately
- **`tacticalSlugs`** — useMemo Set of slugs where `kofi_link` is non-null
- **PORTFOLIO_COLORS:** `['#074a34', '#1565c0', '#b71c1c', '#e67e22', '#7b1fa2', '#00796b']`
- **PDF download** (`tier !== null` only) — uses memoized `blendedReturns` directly (no redundant `buildBlendedReturns` call), dynamically imports `@react-pdf/renderer` + `BuilderPDF` on demand
- Navbar: "Builder" link added between Compare and Monte Carlo (desktop + mobile More dropdown). `/builder` added to sitemap.

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

### CompareClient.jsx + CompareGrowthChart.jsx (Portfolio Comparison — /compare)
- `app/compare/page.js` is a server component (dynamic, not SSG — reads `searchParams.slugs`)
- Reads `?slugs=a,b,c,d` from URL, deduplicates, caps at 4, fetches portfolio stats + allocations + monthly returns in parallel
- Growth data (`buildGrowthData`) computed server-side using the same compounding logic as portfolio detail pages
- `CompareClient` uses `useRouter` + `useTransition` to push new `?slugs=` URLs when portfolios are added/removed — each change is a full server re-render (no client-side data fetching)
- Portfolio selector: search box filters `allPortfolioNames` client-side, excludes already-selected slugs, caps at 4
- Comparisons are shareable via URL (e.g. `/compare?slugs=golden-butterfly-portfolio,permanent-portfolio`)
- "Compare This Portfolio" button on every portfolio detail page links to `/compare?slugs=${slug}`
- **Stats table color logic:** green (`text-primary`) = positive value, red (`text-error`) = negative value — same as the rest of the site. Winner (best value per stat) gets a subtle `bg-[#f0f7f3]` cell background + `emoji_events` trophy icon. No special color for the worst.
- `PORTFOLIO_COLORS` = `['#074a34', '#1565c0', '#b71c1c', '#e67e22']` — one per portfolio slot, used consistently across pills, header card borders, chart lines, and table column headers
- **Growth chart normalization:** `mergeGrowthData()` finds the latest start year across all selected portfolios (shortest lookback), re-indexes every portfolio's growth data to $10,000 at that year, then merges into a single array keyed by `{year, p0, p1, p2, p3}`. This ensures a fair visual comparison when portfolios have different history lengths.
- `CompareGrowthChart` uses Recharts `LineChart` (not `AreaChart`) with `connectNulls={false}` — portfolios with shorter histories simply start later on the chart
- **Stats table rows (June 2026):** includes `cagr_1yr` (1-Year CAGR) and `cagr_3yr` (3-Year CAGR) alongside the existing CAGR/MaxDD/Sharpe/etc rows. Shows `—` when null (short-history portfolios).

### HoldingPeriodHeatmap.jsx (June 2026)
- Client component — rendered on every portfolio detail page below the charts section, full width (`lg:col-span-12` inside the body grid)
- Input: `heatmapData` prop computed server-side by `buildHeatmapData(monthlyReturns)` in `portfolios/[slug]/page.js`
- **Data shape:** `{ startYears: number[], holdingPeriods: number[], data: (number|null)[][] }` — `data[i][j]` = annualised CAGR % for `startYears[i]` held `holdingPeriods[j]` years, or null for incomplete data. Max 30 columns.
- **`buildHeatmapData()`** uses a `Map` keyed by `"YYYY-MM"` for O(1) lookup. Returns null if monthlyReturns is empty.
- **Color scale:** 8 discrete bands from `<-10%` (dark red `#b71c1c`) to `≥20%` (darkest green `#0d3d26`).
- Rows render newest start year at top (reversed). Grid scrolls horizontally on mobile via `-mx-6 px-6 md:-mx-8 md:px-8` bleed pattern on the scroll container.
- Hover tooltip uses reserved `h-5` fixed-height div so the grid never shifts on hover/unhover.

### WithdrawalRatesTable.jsx + lib/withdrawalRates.js (June 2026)
- **`'use client'`** — marked as a client component (June 2026) so it can be imported by `BuilderClient.jsx`. No server-only APIs are used, so this is safe; the component is still server-rendered during SSG/SSR on portfolio detail pages.
- Props: `rates` (from `buildWithdrawalRates()`), `slug` (optional — for the "Run Monte Carlo →" CTA link; if null/undefined the link is not rendered).
- Two sub-sections: **Safe Withdrawal Rate** (portfolio value stays above $0) and **Perpetual Withdrawal Rate** (real purchasing power preserved at end of period). Each has Nominal and Real (3% inflation) columns across 4 durations.
- **4% Rule badge:** if `rates[30]?.swr_real >= 4.0`, renders a green "Passes the 4% Rule" pill next to the heading. If 30yr data exists but SWR is below 4.0%, renders a neutral "Below the 4% Rule at 30 yrs" pill. No badge if 30yr data is insufficient.
- **`buildWithdrawalRates(monthlyReturns)`** in `lib/withdrawalRates.js`: for each duration (20/25/30/40yr), collects all rolling windows of that length from the full history, then runs a 20-step binary search on the annual withdrawal rate (0–25% range). `simulateWindow()` operates directly on the original array with start index + length (no slice copies). Returns null per duration when `total - windowLength < 1`. Computation is server-side at SSG build time — adds ~100–300ms per portfolio at build time, negligible at runtime. Also called client-side in BuilderClient via `useEffect` for blended mix SWR.
- **PWR definition:** ending real value (nominal / cumulative inflation) ≥ starting value ($10,000). For nominal PWR, ending nominal value ≥ $10,000.
- Placed in the col-span-8 main column between Rolling Returns summary and the Description detail section on portfolio detail pages.

### PortfolioJumpNav.jsx (June 2026)
- Client component — sticky in-page jump nav placed between the hero and the body grid on portfolio detail pages
- Props: `sections` array of `{ id, label }` — computed server-side in `portfolios/[slug]/page.js` so conditional sections (Rolling Returns, Strategy) only appear when those sections actually render
- **Sticky offset:** uses a ref + `useEffect` to measure the main Navbar height (`nav[class*="z-50"]`) on mount and on resize, then sets `navRef.current.style.top` to that value. This handles both desktop (49px single-row) and mobile (86px two-row) navbars without hardcoding
- **Scroll spy:** `scroll` event listener finds the last section whose absolute `top` (via `getBoundingClientRect().top + window.scrollY`) is ≤ `window.scrollY + mainNavHeight + 70`. The `+70` buffer ensures a section becomes active as soon as its heading clears the sticky UI
- **Click handler:** scrolls to `el.getBoundingClientRect().top + window.scrollY - (mainNavHeight + 56)`, landing the section heading just below both sticky bars
- **Section IDs in page.js:** `id="allocation"`, `id="stats"`, `id="rolling-returns"` (conditional), `id="withdrawal-rates"` (wrapper div around WithdrawalRatesTable), `id="strategy"` (conditional), `id="charts"` (the col-span-12 div), `id="heatmap"` (the col-span-12 div)
- Horizontal scrollable pill row with `scrollbarWidth: none`. Active pill: `bg-primary text-on-primary`. Uses `-mx-8 md:-mx-12` negative margins to extend to container edges

### Portfolio Detail Page Layout (June 2026, updated June 2026)
- **Performance Snapshot benchmark column (June 2026):** Every stat in the Performance Snapshot section shows a "Portfolio / US 60/40" side-by-side value. The benchmark is fetched via `getPortfolio(BENCHMARKS[0].slug)` added to the page's `Promise.all`. Skipped (returns null) when the portfolio being viewed IS the 60/40 benchmark — `slug !== BENCHMARKS[0].slug ? getPortfolio(...) : Promise.resolve(null)`. The `StatRow` local function accepts an optional `benchmarkValue` prop; when present, renders `value / benchmarkValue` with the benchmark in `text-on-surface-variant`. A "Portfolio / US 60/40" legend appears top-right of the section header. Sharpe, Sortino, and UPI display precision reduced from `.toFixed(3)` to `.toFixed(2)` for visual consistency with the benchmark column.
- **Two-column grid** (`grid grid-cols-12`): col-span-8 (left) contains Allocation, Performance Snapshot, Rolling Returns summary, WithdrawalRatesTable, and the Description detail (Investment Philosophy / Who It's For / Pros/Cons); col-span-4 (right) is the sidebar (Implementation, At a Glance, Membership CTA).
- **Full-width rows** (`col-span-12`, inside the same grid — no gap): (1) ChartsSection (all three charts — Growth of $10K, Historical Drawdown, Rolling Returns — with `space-y-8` on the wrapper div); (2) HoldingPeriodHeatmap. Using `col-span-12` inside the same grid avoids the gap problem that occurs when the sidebar is taller than the left column.
- ChartsSection is called **without** a `section` prop (defaults to `'all'`) — it renders the "Compare to" benchmark bar plus all three charts in one block at full width.
- Description detail moved above ChartsSection (June 2026): Investment Philosophy / Who It's For / Pros/Cons sits in the col-span-8 main column between WithdrawalRatesTable and the full-width chart row. This improves SEO content placement and lets users read the strategy context before reaching the charts.
- `generateMetadata` includes "Includes safe withdrawal rate analysis." appended to all portfolio meta descriptions, targeting retirement-focused search queries.
- **Page title format (June 2026):** `[Name] — X.X% CAGR, Sharpe X.XX | PortfolioDB`. Falls back to CAGR-only (`[Name] — X.X% CAGR | PortfolioDB`) when the full title would exceed 70 chars. Falls back to `[Name] | PortfolioDB` if stats are unavailable. Stats in the title improve search result CTR.
- **Mobile hero nav buttons (June 2026):** Back to Database, Compare, and Monte Carlo buttons use `hidden lg:flex` — hidden on mobile to reduce scroll before the allocation chart, visible on desktop.
- **BreadcrumbList structured data (June 2026):** `StructuredData.jsx` now outputs two `<script type="application/ld+json">` tags — the existing FinancialProduct schema plus a BreadcrumbList (PortfolioDB → Database → [Portfolio Name]). Breadcrumbs appear as the URL line in Google search results and improve click-through rate.
- **FAQPage structured data — do not implement.** Google deprecated FAQPage rich results as of May 7, 2026 — the expandable Q&A snippets no longer appear in Google Search. Built and reverted June 2026.

### Correlation Matrix layout notes (`/tools/correlation`, redesigned June 2026)

Reworked from the original diverging-color heatmap (see Backlog/Completed entry for original build) after Nick found it "hard to understand and clunky" against a competitor reference showing inline numeric values in uniform cells.

- **Cells show inline numeric correlation values** (e.g. `0.87`) at `fontSize: 10px`, colored `#1a1c1a` for legibility against muted backgrounds (`MAX_MIX = 0.75` caps how saturated any cell gets).
- **Relative green→red color scale, NOT sign-based diverging:** `cellColor(r, minR, maxR)` maps the *dataset's actual* lowest correlation → green (`#0d3d26`) and highest → red (`#b71c1c`), white at the midpoint. A sign-based -1..+1 diverging scale was tried first and rendered **entirely red** — every pairwise correlation in this 75-portfolio dataset happens to be positive (range ~0.09–1.00), so a sign-based scale shows zero variation. `minR`/`maxR` are computed once across the *full* dataset (not the filtered view) so the legend and colors stay stable regardless of active filters.
- **CRITICAL — uniform cell sizing requires an explicit `<table>` width.** With `table-layout: fixed` and `width: auto`, browsers treat each `<th>`/`<td>`'s inline `width` as a *proportion* for distributing the table's container-constrained width — NOT a literal pixel value. With 76 columns wanting 48px each (3,840px total) inside a narrower scroll container, every cell silently shrank to ~23.6px regardless of the specified width, `<colgroup>` overrides, or `table-layout` mode (this cost significant debugging time — confirmed via `getComputedStyle` that no stylesheet rule was overriding it). **Fix:** set the table's own `width`/`minWidth` explicitly to `ROW_LABEL_WIDTH + colPortfolios.length * CELL_WIDTH`, forcing it past the container width so it overflows into the scrollable wrapper and every column renders at its true specified size. `CELL_WIDTH = 48`, `CELL_HEIGHT = 34`, `ROW_LABEL_WIDTH = 240`, `COL_LABEL_HEIGHT = 230`.
- **Fully-vertical column headers** via `writingMode: 'vertical-rl'` + `transform: 'rotate(180deg)'` (top-to-bottom reading) — chosen over angled labels specifically so every header cell renders at the same width, which was the other half of the "make all cells the same size" fix.
- **Matrix height:** scroll wrapper uses `maxHeight: '85vh'` (bumped up from an initial `70vh` per Nick's "make it significantly taller" request).
- **Category pills filter columns only (x-axis), not rows (June 2026):** Deselecting a category removes it from the column headers but keeps all those portfolios visible in the row labels, so you can still read their correlations against the remaining column set. `rowPortfolios` always uses `allIndices` (all portfolios); `colIndices` applies `activeCategories` filter. Category pills are dimmed when either the strategy picker or portfolio picker has an active selection.
- **"Select strategies" picker (June 2026):** Dropdown listing all unique strategy slugs (derived from `allStrategies` prop) with portfolio counts per strategy. `strategyToSlugs` Map (computed from prop) gives O(1) lookup of which portfolios belong to each strategy. `slugsForSelectedStrategies` useMemo unions all selected strategies' slug sets. Selecting strategies filters columns to portfolios tagged with any of the selected strategies (union, not intersection). Priority: portfolio picker wins over strategy filter when both are active. `ALL_STRATEGIES` sorted alphabetically; `strategyLabel()` formats slugs with special-case overrides (e.g. `factor-tilt` → `Factor Tilt`). `allStrategies` prop fetched server-side in `page.js` via `getAllPortfolioStrategies()`.
- **"Select portfolios" picker — asymmetric row/column display:** A dropdown button (`pickerOpen`/`selectedSlugs` state, `pickerRef` for click-outside-to-close) opens a searchable checkbox list of all portfolios. Selecting any narrows the **columns only** — `colPortfolios` — while **rows always show all portfolios** (`rowPortfolios`). This lets a user pin a small set across the top and scan every portfolio's correlation against just that set without losing the full list down the side. The `{ rowPortfolios, colPortfolios, matrix }` `useMemo` builds two independent index lists and a `matrix[i][j]` that maps `rowIndices[i]` × `colIndices[j]` back into `data.matrix`. Because rows and columns can be different lists, `isSelf` is determined by `p.slug === q.slug` (not `i === j`), and search-match highlighting uses a slug-keyed `matchSlugs` Set rather than index-based. Footnote shows `"{rowPortfolios.length} portfolios × {colPortfolios.length} selected"` when narrowed.
- **"Clear all" button (June 2026):** Appears in the controls row only when any filter is active (any category deselected, or strategy picker has selections, or portfolio picker has selections). Resets `activeCategories` to all categories, clears `selectedStrategies`, clears `selectedSlugs` in one click.
- **Fixed-height info panel + cursor tooltip (June 2026):** The info panel above the matrix is fixed at `h-[68px]` with `overflow-hidden` and `truncate` on the name line so long portfolio name pairs never cause layout shift. A `position: fixed` cursor tooltip (`pointerEvents: none`, `zIndex: 200`) renders next to the mouse while hovering any cell — shows the full pair names (not truncated), correlation label, and value. `mousePos` state is updated via `onMouseMove` on the scroll container. Smart edge detection: if the tooltip would overflow the right or bottom edge of the viewport, it flips to the left/above the cursor instead (`mousePos.x + OFFSET + TOOLTIP_W > window.innerWidth ? mousePos.x - TOOLTIP_W - OFFSET : mousePos.x + OFFSET`). `TOOLTIP_W = 280`, `TOOLTIP_H = 90`, `OFFSET = 14`.
- **`cellTextColor(r, minR, maxR)` (June 2026):** Companion to `cellColor` — uses the same relative `t` value (position in the dataset's min→max range) but maps to text-weight colors: `t=0` → dark green `#0d3d26`, `t=0.5` → neutral `#404943`, `t=1` → dark red `#b71c1c`. Used in both the info panel number and the cursor tooltip number so the displayed correlation value is colored to match its cell's green/neutral/red direction, rather than being hardcoded red for all positive values (which is every pair in this dataset).

---

## Changelog Guidelines

When updating `app/changelog/page.js`, only include entries that are meaningful to end users — new features, data additions, and UX improvements they will notice. Do NOT include internal fixes, mobile nav label corrections, scrolling fixes, or code refactors unless the user would directly notice or benefit from them.

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

## New Portfolio Checklist

Work through these phases in order whenever a new portfolio is added.

### Phase 1 — Supabase (must follow this insert order — foreign key constraints)

- [ ] **`portfolios`** — slug, name, category, trade_frequency, min_timeline_years, risk_level, description. Leave kofi_link null unless adding to signal set immediately. Never include id or created_at.
  - Slug must match WordPress URL slug exactly
- [ ] **`asset_classes`** — if any allocation uses an asset class not already in this table, insert it first (default_color + description)
- [ ] **`allocations`** — one row per holding: portfolio_slug, asset_class, ticker, percentage (0–100), color (hex). Percentages must sum to 100.
- [ ] **`portfolio_strategies`** — one row per tag. Valid slugs: momentum, factor-tilt, rules-based, global, income, tactical, simple, risk-parity, all-weather, bond-heavy, robo-advisor, target-date
- [ ] **`monthly_returns`** — historical return rows. Date = first of month (e.g. 2024-11-01). Return = percentage (1.8 = +1.8%).
- [ ] **Refresh view** — `REFRESH MATERIALIZED VIEW portfolio_stats;`

### Phase 2 — Automation

**Buy and Hold:** no code changes — Stage 1 reads allocations automatically.

**Tactical:**
- [ ] Write signal function in the appropriate module (rules_based.py, keller.py, etc.)
- [ ] Add any new tickers to that module's ALL_TICKERS list
- [ ] Add one line to SIGNAL_REGISTRY in stage0_signals.py
- [ ] Run Stage 0 for the current month to generate first holdings entry
- [ ] Commit and push

### Phase 3 — Description

- [ ] Write description draft (200–400 words, no performance numbers, no ETF names, `\n` line breaks) — see description format spec below
- [ ] Save to `description-drafts/[slug].md`
- [ ] Run `node scripts/update-descriptions.js`

### Phase 4 — Deploy

- [ ] Trigger a Vercel redeploy (portfolio detail page is SSG — won't exist until rebuild)
- [ ] Verify `/portfolios/[slug]` loads correctly
- [ ] Verify slug appears in `/sitemap.xml`

### Phase 5 — Optional

- [ ] **Signal set** — set kofi_link if portfolio should have trade signals (requires redeploy)
- [ ] **Blog** — add to content-calendar.md if it warrants a comparison post

**Easy things to miss:** forgetting REFRESH MATERIALIZED VIEW · inserting allocations before portfolios exists · forgetting Vercel redeploy · for tactical: forgetting new tickers in ALL_TICKERS before Stage 0 runs

---

## Monthly Data Update Workflow

**Buy and Hold portfolios** are updated automatically via the returns automation pipeline (see below). No manual inserts needed.

**Tactical portfolios** are fully automated via the Stage 0 → Stage 1 → Stage 2 pipeline (see Tactical Portfolio Automation section below). No manual inserts needed.

The portfolio_stats view recalculates everything automatically after any insert. No redeploy needed.

---

## Monthly Returns Automation Pipeline (May 2026)

Automates monthly return calculations for all Buy and Hold and Tactical portfolios. Buy and Hold returns are calculated from static allocations; tactical returns are calculated from holdings stored by Stage 0.

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

**New portfolios added May 2026:**
- `us-stock-market` — VTI (100%). Backfilled with VFINX (EODHD) for Jan 1980 – May 2001, then VTI for Jun 2001 – Apr 2026. Stage 1 handles VTI going forward.
- `global-stock-market` — VT (100%). Backfilled with MSCI ACWI Index daily prices for Jan 1999 – Jun 2008, then VT (EODHD) for Jul 2008 – Apr 2026. Stage 1 handles VT going forward.
- `ben-felix-model-portfolio` — SPY/VTI/EFA/IWN/EEM/AVDV. Backfilled Jul 1995 – Apr 2026 using a multi-proxy chain (VTSMX→VTI, DFSVX→IWN, PRITX→EFA, FEMKX→EEM, DISVX→DLS→AVDV). DISVX EODHD data floor (Jul 1995) is the binding constraint.
- Backfill scripts: `scripts/auto-returns/backfill_us_stock_market.py`, `backfill_global_stock_market.py`, `backfill_ben_felix_model_portfolio.py` (all idempotent, safe to re-run)

**New portfolios added June 2026:**
- `jl-collins-wealth-preservation-portfolio` — 50% VTI / 25% VNQ / 20% BND / 5% BIL. Backfilled May 1996 – May 2026 via `backfill_jl_collins_wealth_preservation.py`. Proxy chain: VTSMX→VTI (Jun 2001), VGSIX→VNQ (Oct 2004), VBMFX→BND (Apr 2007), constant 0.35%/mo→SHY (Jul 2002)→BIL (May 2007) for cash. VGSIX (Vanguard REIT Index Investor) is the data floor — launched May 1996. Stage 1 handles going forward.

**Backtest proxy chains (established May 2026):**
Use these when backfilling new B&H portfolios that hold these ETFs. See `reference_backtest_proxy_chains.md` in memory for full details.

| Live ETF | Proxy | Transition |
|---|---|---|
| VTI | VTSMX | Jun 2001 |
| VNQ | VGSIX | Oct 2004 |
| BND | VBMFX | Apr 2007 |
| BIL | SHY (Jul 2002), constant 0.35%/mo before | May 2007 |
| IWN | DFSVX | Aug 2000 |
| EFA | PRITX | Sep 2001 |
| EEM | FEMKX | May 2003 |
| AVDV | DLS (Jul 2006–Sep 2019), then DISVX (pre Jul 2006) | Oct 2019 |

`backfill_ben_felix_model_portfolio.py` is the reference implementation for multi-proxy backfills.
DISVX EODHD data starts Jul 1995 — practical floor for any portfolio with an AVDV/international small-cap value allocation.

**Key decisions:**
- Stage 1 calculates tactical returns separately in Step 5b using `tactical_monthly_holdings` (run Stage 0 first). Stage 2 promotes all pending rows regardless of category — tactical and B&H together.
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
  portfolio_slug, date, ticker, weight  -- weight is a decimal fraction 0–1 (e.g. 0.333 = 33.3%)
)
```
- `date` = first day of the month the holdings are IN EFFECT
- Signals calculated end of month M-1 → holdings stored for month M → return calculated end of month M
- Historical holdings not tracked — automation starts from current month forward

**Monthly workflow (example: end of May):**
1. **May 31 (last trading day)** — run Stage 0 → stores June holdings in `tactical_monthly_holdings` (dated June 1). Signal email goes out to members the same day.
2. *(June passes — portfolios hold those positions all month)*
3. **July 3** — Stage 1 runs automatically → reads June holdings, fetches June closing prices, calculates June returns for all portfolios (B&H + tactical), emails summary
4. **Shortly after July 3** — run Stage 2 manually → promotes June staging rows to live `monthly_returns`

Stage 0 and Stage 1 are always one full month apart. Stage 0 sets *next* month's holdings; Stage 1 scores *last* month's holdings. They never operate on the same month simultaneously.

**Stage 0 timing note:** Signals must be calculated on the last trading day of the month so the signal email to members goes out the same day. Cron cannot target "last trading day" reliably, so Stage 0 is manual-only. Stage 1 picks up the stored holdings automatically on the 3rd.

**Stage 0 always requires `--month YYYY-MM`** for the normal monthly workflow. The no-flag default returns the *last completed* calendar month, not next month — it is only useful for recalculating a past month. To store June holdings, run:
```bash
python3 stage0_signals.py --month 2026-06
```

**Run after market close.** EODHD is an end-of-day feed. If you run Stage 0 mid-day on the last trading day, EODHD will not yet have that day's closing prices and the script will silently fall back to the prior day's close. Run after ~5pm ET, or on the following morning (Saturday), to guarantee the correct prices.

**Stage 0 is overwrite-safe by default.** If you re-run Stage 0 for a month that already has holdings stored, it skips those portfolios rather than overwriting them. This protects the exact signals that were sent to members on the last trading day. To intentionally overwrite (e.g. to correct a bad signal after notifying members), use:
```bash
python3 stage0_signals.py --month 2026-06 --force
```

**Signal registry** (`stage0_signals.py`): maps portfolio slugs to their signal functions. To add a new portfolio: add its signal function to the relevant module and one line to `SIGNAL_REGISTRY`. Nothing else changes.

**Stateful strategies (Stoken's ACA):** `stoken_aca()` accepts an optional third argument `prior_holdings` to resolve the "between channels" state. `stage0_signals.py` queries last month's `tactical_monthly_holdings` for any slug listed in `_PRIOR_HOLDINGS_SLUGS` and passes the result automatically. If no prior data exists (first run), all sleeves default to their defensive asset.

**Scripts:**
- `stage0_signals.py` — orchestrator: fetches prices, runs all signal functions, writes to `tactical_monthly_holdings`
- `tactical/__init__.py` — package marker
- `tactical/dual_momentum.py` — GEM, GEM+EM, Diversified GEM, Composite DM, Accelerating DM
- `tactical/gtaa.py` — Ivy Timing, Ivy Rotation, GTAA 5, GTAA 13, GTAA AGG 3, GTAA AGG 6; shared helpers `_above_sma()`, `_composite_score()`, `_sma_timing()`, `_momentum_rotation()`
- `tactical/rules_based.py` — Tactical Permanent, Three-Way Model, Paired Switching, Quint Switching Filtered, Trend Following Bonds, Stoken's ACA, Trend is Our Friend Global; shared helpers `_calc_sma()`, `_above_sma()`, `_channel_extreme()`, `_above_200dma()`, `_daily_returns_n()`, `_portfolio_annualized_vol()`
- `tactical/muscular_portfolios.py` — Mama Bear (top-3 of 9 by 5M momentum), Papa Bear (top-3 of 14 by avg 3/6/12M momentum)
- `tactical/alpha_architect.py` — RAA Aggressive, RAA Balanced; dual-signal (TMOM + 10M MA) graduated allocation (100%/50%/0%) per asset
- `tactical/keller.py` — PAA, VAA G4, VAA G12, DAA, GPM, KDA, AAA; shared helpers for 13612W momentum, SMA momentum, Easy Trading formula, min-variance optimization (scipy). requires numpy + scipy in requirements.txt.

**Keller et al. momentum formulas:**
- **13612W** (VAA/DAA/KDA/GPM canary): `12*R1 + 4*R3 + 2*R6 + R12` — fast, front-weighted
- **SMA(12)** (PAA): `p0 / avg(p1..p12) - 1` — current price vs. 12-month average of month-end prices
- **Simple avg** (GPM ri): `(R1 + R3 + R6 + R12) / 4` — equal-weight

**Keller universe reference:**
- PAA / GPM risky (N=12): SPY, QQQ, IWM, VGK, EWJ, EEM, IYR, DBC, GLD, TLT, HYG, LQD
- VAA G12 / DAA risky (N=12): SPY, IWM, QQQ, VGK, EWJ, EEM, VNQ, DBC, GLD, TLT, LQD, HYG
- VAA G4 risky (N=4): SPY, EFA, EEM, AGG
- KDA / AAA investment (N=10): SPY, VGK, EWJ, EEM, VNQ, RWX, IEF, TLT, DBC, GLD
- VAA/DAA/KDA cash (best of 3 by 13612W): BIL, IEF, LQD
- DAA/KDA canary: EEM, BND
- PAA/GPM cash: IEF only (PAA); IEF or BIL by highest zi score (GPM)

**Easy Trading (VAA/DAA):**
- `cash_slots = floor(b * T / B)`, `risky_slots = T - cash_slots`
- VAA G12: T=5, B=4 → b=0–1: 5 risky (20% each); b=2: 4 risky+20% cash; b=3: 3 risky+40% cash; b≥4: 100% cash
- DAA: T=6, B=2 → b_canary=0: 6 risky; b_canary=1: 3 risky + 3 cash; b_canary=2: 100% cash

**Strategy families and implementation order:**

| Family | Portfolios | Status |
|---|---|---|
| Dual Momentum (Antonacci) | GEM, GEM+EM, Diversified GEM, Composite DM, Accelerating DM | Complete |
| Meb Faber GTAA | GTAA 5, GTAA 13, AGG 3, AGG 6, Ivy Timing, Ivy Rotation | Complete |
| Simple rules-based | Tactical Permanent, Three-Way Model, Paired Switching, Quint Switching Filtered, Trend Following Bonds, Stoken's ACA | Complete (rules corrected May 2026 — see note below) |
| Muscular Portfolios (Livingston) | Mama Bear, Papa Bear | Complete |
| Alpha Architect RAA (Gray & Vogel) | Robust AA Aggressive, Robust AA Balanced | Complete |
| Keller et al. | PAA, VAA G4, VAA G12, DAA, GPM, KDA, AAA | Complete (May 2026) |
| Other | The Trend is Our Friend - Global | Complete (May 2026) |

**GSG → DBC (May 2026):**
PAA and GPM previously used GSG (iShares S&P GSCI Commodity) as the commodities asset in their 12-asset risky universe. Updated to DBC (Invesco DB Commodity Index) to match the VAA/DAA family. Change made in `tactical/keller.py` (`ALL_TICKERS`, `_PAA_RISKY`, and comments). `allocations`, `asset_classes`, and `tactical_monthly_holdings` tables also need the same substitution via SQL UPDATE.

**Known backtest discrepancy sources vs. other platforms (May 2026):**
When comparing signal outputs against Portfolio Visualizer or similar tools, the most common causes of differences are:
- **Execution timing** — scripts signal on last calendar day of month M-1 and apply to month M. Some platforms use next-day open prices, shifting effective returns by one day.
- **Adjusted close** — EODHD `adjusted_close` accounts for dividends and splits. Different adjustment methods cause persistent drift over long backtests.
- **SMA month inclusion** — `_above_sma` includes the current month-end close in the N-month average. Some platforms use N prior months (excluding current), which can flip signals in borderline months.
- **Vol formula** — The Trend is Our Friend uses population std dev (`/ n`); Tactical Permanent uses sample variance (`/ n-1`). Minor on 12–21 observations but can produce different rank orders when assets have similar volatility.

**Tactical Permanent Portfolio rules (corrected May 2026):**
Original implementation used TLT (not IEF) and a 10-month SMA with equal 25% weights — incorrect.
Correct rules (GestaltU implementation):
- Universe: SPY, IEF, GLD (cash: BIL)
- Filter: assets above their 200-day MA (daily prices)
- Weights: 1/vol risk parity using 21-day annualized daily volatility
- Vol target: 7% portfolio annualized vol (60-day covariance). If below 7% → hold as-is (no leverage). If above 7% → scale down, put remainder in BIL.
- Three daily-price helpers in `rules_based.py`: `_above_200dma()`, `_daily_returns_n()`, `_portfolio_annualized_vol()`

---

## Email Infrastructure (May 2026)

### Custom Email Addresses

`support@portfoliodb.com` is set up for forwarding + Gmail send-as:

- **Forwarding:** ImprovMX (free) — MX records in Cloudflare DNS (`mx1.improvmx.com` priority 10, `mx2.improvmx.com` priority 20). Emails to `support@` forward to Nick's personal Gmail.
- **Send-as in Gmail:** Gmail → Settings → Accounts and Import → "Send mail as" → uses Resend SMTP (smtp.resend.com, port 465, user=resend, password=Resend API key). Set to "Treat as an alias." Resend API key also stored in `.env.local` as `RESEND_API_KEY` and in Supabase → Authentication → SMTP Settings.
- **DNS note:** Two separate SPF TXT records in Cloudflare DNS — `send` record (`v=spf1 include:amazonses.com ~all`) is for Resend's transactional subdomain; `@` record includes both ImprovMX (`include:spf.improvmx.com`) and MailerLite (`include:_spf.mlsend.com`). Do NOT merge the `send` and `@` records — they are on different names and serve different purposes.
- **MailerLite sender domain:** `portfoliodb.com` verified in MailerLite (June 2026). All automation emails send from `support@portfoliodb.com`.

### MailerLite

- Email provider: **MailerLite** (migrated from Kit May 2026 — Kit lacks email sequences on free plans)
- Subscriber group: "General Email List" (ID: 187575433316795808)
- API key: `MAILERLITE_API_KEY` env var (Sensitive in Vercel); group ID: `MAILERLITE_GROUP_ID`
- Lead magnet: PDF report — "How Index Fund Portfolios Performed in the Two Worst Crashes of the Last 25 Years"
- Welcome sequence: 4 emails set up in MailerLite automation (trigger: joins General Email List)
  - Email 1 (immediate): PDF delivery
  - Email 2 (Day 3): What PortfolioDB is, data insight
  - Email 3 (Day 6): Why tactical signals differ from financial news (weather forecast analogy)
  - Email 4 (Day 10): Membership pitch — explains Builder ($9/mo annual) and Signals ($19/mo annual) tiers, sample signal format, links to `https://www.portfoliodb.com/membership`. Updated May 2026 from Ko-fi to Memberful.
- Sequence went live: 2026-05-16

---

## Membership Page Notes (May 2026)
- "Brief market context" removed from 'What you get each month' list pending signal email automation (Fix #11)
- Mock email card in "What a signal looks like" section shows ticker/allocation pill badge format (not a generic table) — reflects actual signal email structure
- Monthly signal email format: portfolio name as heading, tickers as `TICKER — XX%` lines. Formatted via Claude prompt (see Fix #11 in TASKS.md)

## Tiers — Free Builder + Paid Signals (June 2026)

**Builder is now free for any signed-in user (changed June 2026 — was a $12/mo paid Memberful tier).** No subscription, no Memberful checkout — just sign in with a free Supabase account. Signals remains a paid tier billed via Memberful.

| Tier    | Price                  | Requirement          |
|---------|------------------------|----------------------|
| Builder | Free                   | Signed-in account    |
| Signals | $25/mo or $228/yr ($19/mo equiv, ~24% off) | Active Memberful subscription |

Memberful plan IDs (used in checkout URLs `https://portfoliodb.memberful.com/checkout?plan=ID`) — Signals only, Builder plan IDs (147939/147940) are retired and no longer referenced in code:
- Signals Monthly: 147941
- Signals Annual: 147942

**Effective tier computation (`app/builder/page.js`, `app/account/page.js`, `app/api/builder-save/route.js`):** `tier = subscription?.plan === 'signals' ? 'signals' : 'builder'` for any authenticated user — i.e. logged-in users always get at least `'builder'`; only an active **Signals** subscription elevates them further. `tier` is `null` only for logged-out visitors. The `user_subscriptions` table and Memberful webhook are unchanged — they still track paid Signals (and legacy Builder) subscriptions for billing/cancellation purposes, but a `'builder'`-plan row no longer changes what a user can access (everyone with an account already has it free).

**What each tier unlocks:**
- **Builder (free with account):** Save up to 3 custom mixes + full Performance Snapshot, charts, withdrawal rate analysis, and PDF export in the Builder (everything beyond the free CAGR/MaxDD/Sharpe + Growth chart)
- **Signals (paid):** All Builder features + unlimited saved mixes + monthly trade signals for all covered portfolios

**PricingToggle.jsx** is a client component embedded in `app/membership/page.js` (server). Builder card shows "Free" with a "Sign in free" CTA → `/login?next=/builder` (no Memberful URL). Signals card keeps the monthly/annual toggle (defaults to annual) with "Save ~25%" badge and the live Memberful checkout link. `signalCount` prop passed from the server for a dynamic feature bullet.

**Webhook URL:** `https://www.portfoliodb.com/api/memberful` — configure in Memberful → Settings → Webhooks. Webhook Secret auto-generated there; store as `MEMBERFUL_WEBHOOK_SECRET` in Vercel (Sensitive).

**Memberful webhook payload structure (confirmed May 2026):** The actual payload is `{ event, subscription: { id, member: { id, email, ... }, subscription_plan: { name, ... }, expires_at, active, ... } }`. Key differences from initial assumptions: (1) `member` is nested inside `subscription`, not top-level; (2) plan is at `subscription.subscription_plan`, not `subscription.plan`; (3) `expires_at` can be either a Unix timestamp (number) or ISO string depending on context — handler checks `typeof` before multiplying by 1000.

**Memberful cancellation behaviour (confirmed June 2026):** When a member self-cancels through the Memberful member portal, **no webhook fires** — not `subscription.updated`, not `subscription.deactivated`. `subscription.deactivated` only fires when the billing period actually expires. This means `user_subscriptions.status` cannot be updated in real time on self-cancellation. The account page shows "Access until [date]" for all statuses (not "Renews") to avoid showing incorrect renewal language during the grace period. `subscription.updated` is handled separately from activate/create/renew — it checks `changed.autorenew.new === false` to detect cancellation and `changed.autorenew.new === true` for reactivation, but never overwrites status to 'active' unconditionally. Account page shows "Reactivate" link text when `subscription.status === 'cancelled'`.

**Account management:** Members click "Manage subscription" → `https://portfoliodb.memberful.com/account` (Memberful-hosted portal).

**Auth flow:**
1. User visits `/login` (or gets redirected from a protected route with `?next=` param)
2. Email magic link or Google OAuth → Next.js `/auth/callback` route
3. Callback calls `supabase.auth.exchangeCodeForSession()`, then links subscription: updates `user_subscriptions` where `email = user.email AND user_id IS NULL` → sets `user_id`
4. Redirects to `next` param (default `/account`)

**Protecting routes:** `proxy.js` (Next.js 16, replaces deprecated `middleware.js`) wraps all routes except static assets. It creates a server Supabase client, calls `supabase.auth.getUser()`, and redirects unauthenticated users away from `PROTECTED_ROUTES = ['/account']`. The route check uses `pathname === route || pathname.startsWith(route + '/')` to avoid false matches (e.g. `/account-settings` would not have been caught by a bare `startsWith('/account')`).

## Membership CTA

Portfolio detail pages show membership touchpoints in the hero right column:
- **kofi_link IS NOT NULL** → `SignalTeaserWrapper` component (client, June 2026): on mount checks auth + active Signals subscription via `/api/current-holdings/[slug]`. Signals members see real current holdings with month label and "Manage subscription" link. All others see `SignalTeaser` (blurred placeholder + lock + "See membership options"). Portfolio pages remain SSG — auth check is fully client-side with a brief (~100–200ms) flash of blurred content before hydration.
- **kofi_link IS NULL** → compact neutral "not covered" info card explaining signals cover tactical portfolios only, with "See covered portfolios →" link to `/membership`.

The sidebar (right column of body) has a fuller green CTA card with 3 bullet points on covered portfolios, and a matching neutral card on uncovered portfolios.

All CTA buttons link to `/membership` (not directly to Ko-fi). The `/membership` page has the "Subscribe on Ko-fi" button.

To add a portfolio to the signal set: set any non-null value in the `kofi_link` column. Portfolio detail pages are SSG, so a Vercel redeploy is required for changes to appear.

## Membership Page (`/membership`)

- Pricing is now handled by `PricingToggle.jsx` (client component); `MEMBERSHIP_PRICE` and `KOFI_MEMBERSHIP_URL` constants have been removed
- Metadata descriptions updated June 2026: Builder is described as free (sign in to unlock), Signals "from $19/mo"
- Fetches `getSignalPortfolioCount()` and `getSignalPortfolios()` server-side; H1 and Premium section headline on homepage both show live count
- "Portfolios currently in the signal set" section lists all covered portfolios alphabetically, each linking to their detail page
- "What a signal looks like" mock email shows 3 hardcoded portfolios; "+ N more" count is dynamic: `{signalCount - 3}` — updates automatically as portfolios are added
- Builder card CTA links to `/login?next=/builder` (free, no Memberful); Signals CTA links directly to its Memberful checkout URL (see Tiers section above)
- Homepage has one membership touchpoint: the Premium section (below Top Strategies), with headline "Monthly Signals for {signalCount} Portfolios" (live count). The compact callout banner was removed May 2026.

---

## Supabase Auth Email (Resend)

Magic link sign-in emails are sent via **Resend** (not Supabase's built-in mailer). Configured in Supabase → Authentication → SMTP Settings:

| Field | Value |
|-------|-------|
| Sender name | PortfolioDB |
| Sender email | `noreply@portfoliodb.com` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API key (stored in Resend dashboard, not in Vercel env vars) |

**Why Resend instead of Supabase default:** Supabase's built-in mailer sends from a `@mail.supabase.io` address, has a 3 emails/hour rate limit on the free plan, and has poor deliverability. Resend sends from `noreply@portfoliodb.com` with no rate limit on the free tier (3,000 emails/month).

**Domain verification:** `portfoliodb.com` is verified in Resend with DNS records (TXT + CNAME for DKIM) added via Vercel's DNS management (the domain nameservers point to Vercel, not Namecheap — so DNS is managed in Vercel → Settings → Domains, not Namecheap Advanced DNS).

**Email template:** Customised in Supabase → Authentication → Email Templates → Magic Link:
- Subject: `Sign in to PortfolioDB`
- Body: branded HTML with primary green (#074a34) button, expiry note, plain-text link fallback
- Variable: `{{ .ConfirmationURL }}` — Supabase injects the actual magic link URL

---

## Local Testing as a Member

To test the paid-tier experience on `localhost:3000` before pushing to production:

**One-time setup (do once, leave in place):**
1. Supabase Dashboard → Authentication → URL Configuration → add `http://localhost:3000/**` to Redirect URLs (keep the production URL too)
2. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local` (change back before pushing)

**Per-session workflow:**
1. Sign in at `localhost:3000/login` — magic link will redirect back to localhost
2. Get your user ID: `SELECT id FROM auth.users WHERE email = 'your@email.com';`
3. Insert a test subscription (use `'signals'` for full access, `'builder'` to test the 3-mix limit):
```sql
INSERT INTO user_subscriptions (user_id, email, memberful_id, plan, billing_period, status, current_period_end)
VALUES ('your-user-id', 'your@email.com', 'test-member-001', 'signals', 'monthly', 'active', '2027-01-01T00:00:00Z');
```
4. Test `/account` (plan badge, saved mixes) and `/builder` (Performance Snapshot unlocked, save flow)
5. Clean up when done:
```sql
DELETE FROM user_subscriptions WHERE memberful_id = 'test-member-001';
DELETE FROM user_portfolios WHERE user_id = 'your-user-id';
```

**Remember:** revert `NEXT_PUBLIC_SITE_URL` back to the production URL in `.env.local` before pushing.

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

**Hero stat tiles** on portfolio detail pages use `grid grid-cols-2 lg:grid-cols-4` (not `flex flex-wrap`) so the 4 cards (CAGR, Max Drawdown, Sharpe, YTD Return) always stay in one row on desktop and max 2 rows on mobile. When YTD Return is null, an empty `hidden lg:block` div holds the 4th grid slot so the other 3 cards don't stretch.
- WCAG AA contrast: use `text-[#27624a]` (not `text-[#71a38b]`) for any green text on white backgrounds.

## Portfolio Description Drafts

All 72 portfolio descriptions have been drafted, reviewed, and stored in `description-drafts/` at the project root. Each file is saved directly in `\n` format (the DB-ready format) — no separate code block, no human-readable section. The file content is what gets pasted into Supabase.

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
`permanent-portfolio`, `golden-butterfly-portfolio`, `ray-dalios-all-weather-portfolio`, `united-states-60-40-portfolio`, `coffeehouse-portfolio`, `andrew-tobias-portfolio`, `gone-fishin-portfolio`, `bogleheads-three-fund-portfolio`, `bogleheads-four-fund-portfolio`, `ivy-portfolio-faber`, `global-tactical-asset-allocation-13-gtaa-13-meb-faber`, `global-tactical-asset-allocation-5-gtaa-5-meb-faber`, `global-tactical-asset-allocation-agg-3-meb-faber`, `global-tactical-asset-allocation-agg-6-meb-faber`, `generalized-protective-momentum`, `desert-portfolio`, `vigilant-asset-allocation-g12`, `vigilant-asset-allocation-g4-aggressive`, `mama-bear-portfolio`, `papa-bear-portfolio`, `the-larry-portfolio-swedroe`, `lazy-portfolio-by-david-swensen`, `cowards-portfolio-bill-bernstein`, `no-brainer-portfolio-bill-bernstein`, `core-four-portfolio-by-rick-ferri`, `pinwheel-portfolio`, `sandwich-portfolio`, `rob-arnott-portfolio`, `tactical-permanent-portfolio`, `7twelve-portfolio`, `ultimate-buy-and-hold-portfolio-7-paul-merriman`, `ultimate-buy-and-hold-portfolio-8-paul-merriman`, `conservative-income-portfolio-schwab`, `conservative-income-tax-aware-portfolio-schwab`, `kipnis-defensive-adaptive-asset-allocation-kda`, `diversified-gem-dual-momentum`, `gem-dual-momentum`, `gem-emerging-markets-dual-momentum`, `composite-dual-momentum`, `accelerating-dual-momentum`, `adaptive-asset-allocation`, `protective-asset-allocation`, `defensive-asset-allocation`, `quint-switching-filtered`, `stokens-active-combined-asset`, `three-way-model-by-ned-davis`, `paired-switching-lewis-glenn`, `robust-asset-allocation-aggressive`, `robust-asset-allocation-balanced`, `robust-portfolio-alpha-architect`, `ben-felix-model-portfolio`, `jl-collins-wealth-preservation-portfolio`

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
- description-drafts/ — 72 portfolio description drafts, DB-ready

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
