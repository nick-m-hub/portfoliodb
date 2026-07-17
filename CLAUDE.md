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
- **WAF Custom Rule:** Country = Singapore OR China OR Hong Kong → Managed Challenge (targets the high-volume low-engagement bot traffic identified June 2026; Hong Kong added June 2026 after Vercel Analytics continued showing near-100% bounce-rate traffic from HK — Cloudflare treats Hong Kong as a separate country code from China, so it wasn't covered by the original rule)
- **WAF Skip Rule:** URI Path = `/api/memberful` → Skip all rules, placed First (added to allow Memberful webhooks through — note: only effective once Bot Fight Mode is off on free plan)
- **CAA records:** Deleted — Cloudflare manages SSL issuance now, CAA restrictions are no longer needed.
- **Resend API key:** Stored in `.env.local` as `RESEND_API_KEY` for reference. The actual key is used in Gmail send-as SMTP settings and Supabase Authentication SMTP settings — if rotated, update both places.
- **Cache Rule (June 2026, expanded):** One cache rule covers all public, non-personalized pages — `/`, `/database`, `/portfolio-screener`, `/portfolios/`, `/leaderboard`, `/strategies/`, `/blog/`, `/tools/`, `/methodology`, `/glossary-of-terms`, `/membership`, `/changelog`, plus `/api/correlation-matrix` (the only non-personalized API route, returns identical data to every visitor) — all set to "Eligible for cache" via "Or" conditions in a single rule. This overrides Cloudflare's default behaviour of bypassing cache when session cookies are present, ensuring logged-in users are served from Cloudflare's edge rather than passing through to Vercel. Do NOT apply cache rules to other `/api/*` routes, `/account`, `/builder`, `/monte-carlo-simulation`, `/login`, or `/auth/*` — those have server-side auth, personalized data, or dynamic params and must never be cached.

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

**Important (confirmed June 2026):** Nick's edits in step 5 happen directly in Supabase (`content` column via SQL Editor, per his SQL workflow preference), not in the local `blog-drafts/[slug].md` file. The local file reflects only Claude's original draft and will drift out of sync once Nick edits and publishes. After any review/publish cycle, re-fetch the live `blog_posts` row (same pattern as Option A below, selecting `content,status,published_at`) and overwrite the local draft file to match before treating the local copy as current.

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

- **Paid data never leaves the server for a non-entitled request (CR-1, July 2026).**
  Signal holdings (`tactical_monthly_holdings`) are locked by RLS (no read
  policies; service-role only via `lib/supabaseAdmin.js`), and every route/page
  verifies an active Signals subscription before fetching them. Blur/lock
  overlays are styling on placeholder data only — NEVER render real paid data
  behind a CSS blur, since it remains readable in the DOM/page source.

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
    page.tsx                         # Homepage (server component) — H1: "75+ Portfolio Strategies, / Backtested Since 1970" ('Backtested Since 1970' in text-[#27624a] span). Fetches allPortfolios + allAllocations + signalCount. Stat strip below H1: portfolioCount (dynamic), yearsOfData (new Date().getFullYear()-1970), signalCount (dynamic), 'free to use' (static). Section order: Hero → TopStrategies → Tools Strip → EmailCapture → Premium. TOOLS constant defines 4 tool cards (Builder, Monte Carlo, Correlation Matrix, FI Calculator). Premium copy rewritten with 4 specific bullets (no AI reference). AIRecommend removed from homepage (June 2026) — consolidated to the database page where it can show results inline.
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
        route.js                     # POST — AI portfolio recommendations (Haiku 4.5). CR-5 (July 2026): goal input capped at 500 chars server-side; description field removed from the prompt (getPortfolios() never selected it). Cloudflare WAF rate-limit rule on this endpoint still pending (Nick, dashboard).
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
        route.js                     # GET — takes ?slugs=a,b,c (max 6), returns monthly_returns grouped by slug; used by BuilderClient when portfolios are added and by handleDownloadPDF to fetch benchmark returns (60/40 + US Market). Uses .range() pagination to bypass Supabase PostgREST's 1,000-row server cap — without this, benchmark data silently truncates around 2016-2017. Perf 4.4 (July 2026): requests where every slug is one of the 3 benchmark slugs get `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`; arbitrary user mixes stay uncached (unbounded key space).
      builder-save/
        route.js                     # POST — verifies auth (401), Signals entitlement via lib/entitlements.js (else builder 3-mix limit, 429); CR-9 (July 2026): validates every selection element (slug must exist in getPortfolioNames(), weight 0–100, weights sum ≈100 ±0.5) and inserts the cleaned {slug, weight} array only; returns { id }
      memberful/
        route.js                     # POST — Memberful webhook handler; HMAC-SHA256 signature verification (X-Memberful-Webhook-Signature header); handles subscription.activated/created/renewed → 'active'; subscription.updated → plain update() only (CR-11 — an upsert could insert a NULL-status row if webhooks arrive out of order), detects cancel/reactivate via changed.autorenew; subscription.deactivated → 'expired' (CR-2 — fires at period end, not on self-cancel); subscription.deleted/member.deleted → 'expired'; mapPlan() checks name contains 'signals'/'builder'; mapBillingPeriod() checks for 'annual'/'yearly'
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
    FilterBar.jsx                    # Home page filter bar (client) — navigates to /database; max drawdown is a 4-option dropdown (No limit / <10% / <20% / <30%), not a free-text input
    TopStrategies.jsx                # Homepage "Top Strategies by" section (client) — dropdown toggles Sharpe/CAGR/Min Drawdown; data pre-computed server-side; "Browse all portfolios in the database →" link below cards
    DatabaseClient.jsx               # Database page UI with filters/sort/grid/list (client)
    ScreenerClient.jsx               # Screener page UI with sliders/table/export/column-picker (client)
    AllocationDonut.jsx              # SVG donut chart — server-renderable, no JS
    ChartSkeleton.jsx                # Shared `animate-pulse` placeholder (client) — used as the `loading` fallback for next/dynamic-loaded Recharts components; accepts a `height` prop to match each chart's footprint (300/280/280/320px) and avoid layout shift
    GrowthChart.jsx                  # Recharts area chart for Growth of $10K (client) — lazy-loaded via next/dynamic (ssr: false) wherever used
    DrawdownChart.jsx                # Recharts area chart for Historical Drawdown (client) — lazy-loaded via next/dynamic (ssr: false) wherever used
    RollingReturnChart.jsx           # Recharts line chart for Rolling Returns 1Y/3Y/5Y/10Y (client) — lazy-loaded via next/dynamic (ssr: false) wherever used
    ChartsSection.jsx                # Client wrapper owning benchmark, timeline, and log/linear scale toggle state
    StructuredData.jsx               # Two JSON-LD schema tags for portfolio pages: (1) FinancialProduct (name, description, CAGR, max drawdown, Sharpe, asset allocation); (2) BreadcrumbList (PortfolioDB → Database → [Portfolio Name])
    GoogleAnalytics.jsx              # GA4 script tag — fires only on www.portfoliodb.com (hostname check in inline script)
    EmailCapture.jsx                 # Email capture card (client) — compact horizontal layout, posts to /api/subscribe, success/error states
    Footer.jsx                       # Site-wide footer (server) — copyright, nav links (Membership, ToS, Privacy Policy, Methodology, Glossary, Support)
    StatTooltip.jsx                  # Stat info tooltip (client) — label + info icon + fixed-position hover/click tooltip card; re-exports STAT_DEFINITIONS from lib/statDefinitions.js
    SignalTeaser.jsx                 # Blurred placeholder signal rows + lock overlay + "See membership options" link — static, no data fetching; only rendered on covered portfolios (kofi_link IS NOT NULL)
    SignalTeaserWrapper.jsx          # Client component — wraps SignalTeaser; on mount checks auth + active Signals subscription via /api/current-holdings/[slug]; if Signals member shows real holdings with date label; otherwise renders SignalTeaser (locked). Keeps portfolio pages SSG — auth check is entirely client-side. CR-22 (July 2026): caches the API response in sessionStorage keyed by slug + current calendar month (signals only change monthly), so navigating between covered portfolios de-blurs instantly with no fetch; fetch failures fall back to the locked teaser. Date display uses { timeZone: 'UTC' } — date-only strings from Supabase (e.g. 2026-06-01) parse as UTC midnight and roll back a day in US timezones without this.
    HoldingPeriodHeatmap.jsx         # Client component — triangular CAGR heatmap (start year × holding period), color-coded 8-band scale, cursor-following hover tooltip (position: fixed, edge-flip). Rendered full-width on portfolio detail pages.
    PortfolioJumpNav.jsx             # Client component — sticky in-page jump nav on portfolio detail pages. Dynamically measures Navbar height on mount + resize (works for both mobile 86px and desktop 49px). Up to 9 section pills with scroll-spy active highlighting; smooth scroll on click. navSections array computed server-side so conditional pills only appear when those sections render. CRITICAL: pill DOM order must match the physical page order — if a section's id appears inside a parent section that comes earlier in the DOM, the scroll spy will misfire (the child element's offsetTop will be lower than later sibling sections, causing it to "win" the active check prematurely). See Seasonality fix (June 2026).
    SeasonalityChart.jsx             # Recharts BarChart component — 12 bars (Jan–Dec), green for positive months, red for negative. Custom tooltip shows avg %, count, and positive/negative ratio. Used inside SeasonalitySection.jsx.
    SeasonalitySection.jsx           # Client component — wrapper that lazy-loads SeasonalityChart via next/dynamic (ssr: false) + ChartSkeleton fallback. Accepts `data` prop (from buildSeasonalityData() in page.js). Renders the bar chart plus a 12-cell monthly avg grid below. Exists as a separate wrapper so the server component page.js can import it directly without triggering the ssr:false constraint (client components handle their own dynamic imports). Rendered as a col-span-12 row after HoldingPeriodHeatmap on portfolio detail pages.
    StartDateSensitivityChart.jsx    # Recharts LineChart — two lines per start year: Prev 10 Yrs CAGR (red #b71c1c) and Next 10 Yrs CAGR (green #27624a). ReferenceDots (r=5, no labels) mark luckiest/unluckiest start on the Next line. Dashed ReferenceLine at cutoffYear (last year − 9) marks where Next data ends. Dynamic Y domain with 22% padding. Lazy-loaded via StartDateSensitivitySection.jsx.
    StartDateSensitivitySection.jsx  # Client component — wrapper that lazy-loads StartDateSensitivityChart via next/dynamic (ssr: false) + ChartSkeleton height={280} fallback. Accepts `data` prop (from buildStartDateSensitivityData() in page.js). Renders header stat tiles (Luckiest Start / Unluckiest Start / Spread in pp) + legend + chart. id="start-date-sensitivity" is on the inner <section>, not the wrapper div. Rendered as a col-span-12 row after SeasonalitySection on portfolio detail pages (requires ≥ 20yr history).
    WithdrawalRatesTable.jsx         # Client component (`'use client'` added June 2026) — SWR + PWR table across 20/25/30/40-year horizons, nominal and real (3% inflation). Shows "Passes the 4% Rule" badge when 30yr real SWR ≥ 4.0%. Data passed as prop from page.js (server) or computed client-side in BuilderClient. "Run Monte Carlo →" CTA in footer — conditional on `slug` prop being provided.
    ToolsMenu.jsx                    # Client component — desktop "Tools ▾" dropdown in Navbar; contains Leaderboard, Drawdown Analyzer, Compare, Builder, Monte Carlo with label + one-line description per item; click-outside to close
    AnalyzeMenu.jsx                  # Client component — "Analyze ▾" dropdown in the portfolio detail hero (visible on mobile + desktop); 4 entries: Compare This Portfolio, Monte Carlo Simulation, Lump Sum vs. DCA, FI Calculator — each with an icon + one-line description and slug-specific href; z-50 so it overlays the sticky PortfolioJumpNav; click-outside to close
    PricingToggle.jsx                # Client component — Builder card shows "Free" + "Sign in free" CTA (→ /login?next=/builder, no Memberful URL); Signals card keeps monthly/annual billing toggle (defaults to annual) with "Save ~25%" badge and 2 Memberful checkout URLs (Signals Monthly 147941, Signals Annual 147942); "Most Popular" badge on Signals card; signalCount prop for dynamic feature bullet
    LoginForm.jsx                    # Client component — email magic link + Google OAuth; both pass next param through callback URL; "Check your email" sent-state after OTP
    SignOutButton.jsx                # Client component — calls supabase.auth.signOut(), router.push('/'), router.refresh()
    SavedMixList.jsx                 # Client component — displays saved mixes with inline delete confirmation (no window.confirm); buildLoadUrl() generates /builder?mix=slug:weight,... URLs; empty state + Builder tier (x/3) counter with upgrade link; shows blended holdings per mix card (Signals tier = full blend incl. tactical; others = buy-and-hold portion only, unblurred, + "tactical holdings hidden" lock note — CR-1); accepts allAllocations + allSignals + tacticalSlugs props from account/page.js (tacticalSlugs derived from kofi_link since non-members receive allSignals=[])
    CurrentSignals.jsx               # Client component — two contexts: (1) 'builder': renders a single blended holdings list computed from the mix's weights × each portfolio's current holdings/allocations; tactical portions blurred for non-Signals members; (2) 'account': grid of all signal portfolios with current month holdings (blurred with lock overlay for non-Signals). Props: context, blendedHoldings (builder), signals (account), tier
    CompareClient.jsx                # Portfolio Comparison page UI (client) — portfolio search/add, pills, header cards, stats table, allocation donuts, growth chart
    CompareGrowthChart.jsx           # Multi-line Recharts LineChart for comparison (client) — one colored line per portfolio, connectNulls=false — lazy-loaded via next/dynamic (ssr: false) in CompareClient.jsx
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
        PortfolioMapClient.jsx       # Client component — Recharts ScatterChart plotting all portfolios by volatility or max drawdown (X) vs CAGR (Y). Controls: X-axis toggle (Volatility / Max Drawdown), period toggle (Full History / 20 Years / 10 Years), category filter pills (Buy and Hold / Tactical), Efficient Frontier toggle pill (default on), search/highlight box. Period data fetched from /api/portfolio-map-stats with client-side cache. Logged-in users' saved mixes appear as orange overlay dots (fetched via /api/builder-returns + computeStats). DotShape and MixDotShape defined outside component for stable Recharts references. Click portfolio dot → /portfolios/[slug]; click mix dot → /builder?mix=... **Efficient frontier (July 2026):** `frontierPoints` useMemo computes the Pareto-dominant set of the currently visible dots (sorted by x asc with y-desc tiebreak; keep each point whose CAGR beats the running max — no portfolio on the line is beaten on both risk and return by another visible dot). Deliberately NOT a Markowitz/covariance MVO frontier — that would plot hypothetical blends that don't correspond to any clickable dot and is only meaningful for the volatility axis, whereas the Pareto set recomputes from chartData so it works for both X-axis modes, all period windows, and the category filter. Rendered as a second Scatter placed BEFORE the dots Scatter (line under dots, dots stay hoverable/clickable) with `line={{...}}` + `lineJointType="monotoneX"` + `shape={() => null}` + `tooltipType="none"`. Mix dots are excluded from the frontier. Footnote shows the on-frontier count.
      correlation/
        page.js                      # Correlation Matrix page shell (server, static metadata) — fetches getAllPortfolioStrategies() server-side and passes as allStrategies prop to CorrelationMatrixClient
        CorrelationMatrixClient.jsx  # Client component — fetches the full pairwise matrix from /api/correlation-matrix on mount; renders an HTML table heatmap with inline numeric correlation values in uniform cells. Category pills filter columns (x-axis) only — rows always show all portfolios. "Select strategies" picker filters columns to portfolios tagged with selected strategies. "Select portfolios" picker narrows columns to exact portfolio set. Priority stack: portfolio picker > strategy filter > category pills. "Clear all" button appears when any filter or sort is active, resets all. Fixed-height info panel above grid (h-[68px], truncated names) prevents layout shift. Cursor tooltip floats next to mouse with full pair names + correlation label + value; flips away from viewport edges. Click any off-diagonal cell → /builder?mix=a:50,b:50 (opens both in Portfolio Builder at equal weights). Row labels are clickable to sort columns by correlation to that portfolio (click = ascending/most diversifying first; click again = descending; third click = reset). See "Correlation Matrix layout notes" for full implementation details.
      financial-independence/
        page.js                      # Financial Independence Calculator page shell (server, dynamic — reads ?slug=) — fetches getPortfolioNames() + getMonthlyReturns(initialSlug)/getPortfolio(initialSlug) server-side, passes to FinancialIndependenceClient. Default portfolio is united-states-60-40-portfolio (falls back to alphabetical-first if that slug is absent).
      lump-sum-vs-dca/
        page.js                      # Lump Sum vs. DCA Calculator page shell (server, force-dynamic — reads ?slug=) — fetches getPortfolioNames() + getMonthlyReturns(slug) + getPortfolio(slug) server-side; DEFAULT_SLUG = 'united-states-60-40-portfolio'; validates ?slug= param against allPortfolioNames, falls back to DEFAULT_SLUG; passes to LumpSumVsDCAClient
        LumpSumVsDCAClient.jsx       # Client component — portfolio selector, total amount input, DCA period pills (3/6/12mo), investment horizon pills (5/10/20/30yr). computeResults() loops each starting month: lsValue compounds full amount T months; dcaValue contributes monthlyContrib at start of each of first dcaMonths months then compounds remainder. stats useMemo: winRate, total, medAdvantage, medLs, medDca. LumpSumResultsChart loaded via next/dynamic (ssr: false). MIN_PERIODS = 24 guard. Fetches fresh data via /api/monte-carlo-returns?slug= on portfolio change.
        LumpSumResultsChart.jsx      # Client component — single % advantage LineChart (lsValue/dcaValue - 1) * 100 per starting period. Green ReferenceArea above y=0, red below. Dynamic Y domain with 8% padding rounded to nearest 5. Custom tooltip: "Lump sum +X% ahead" or "DCA +X% ahead". X axis shows year only (tickFormatter: v => v.slice(0,4)).
    api/
      builder-holdings/
        route.js                     # GET ?slugs=a,b,c — returns allocations (with color fallback, public) + current tactical signals for the requested slugs. Called client-side by BuilderClient when 2+ portfolios are selected. CR-1 (July 2026): the signals portion is only returned to authenticated users with an active Signals subscription — checked via isSignalsMember() (uses getUser(), so it stays safe if the middleware matcher is narrowed) in parallel with the public fetches; everyone else gets signals: []. Holdings read via the service-role client (RLS locked).
      current-holdings/
        [slug]/
          route.js                   # GET — Signals members only; returns current month holdings from tactical_monthly_holdings for one portfolio slug; used by SignalTeaserWrapper. CR-22 (July 2026): uses getSession() (proxy.js middleware already validated the request — this route MUST stay in the middleware matcher if it is ever narrowed) and runs the subscription check + holdings fetch in parallel (speculative fetch, discarded on 403) — one sequential DB step total. Holdings read via the service-role client (RLS locked).
      drawdown-analysis/
        route.js                     # GET ?from=YYYY-MM&to=YYYY-MM — fetches all monthly_returns in date window, computes total return + max drawdown per portfolio, joins portfolio names/categories, returns sorted results array. CR-4 (July 2026): cached via explicit `Cache-Control: public, s-maxage=86400, stale-while-revalidate` header (a `revalidate` export is a NO-OP on route handlers that read request.url — Vercel's CDN caches per full URL instead). from/to strictly validated as YYYY-MM (1970–2099) to bound the cache key space.
      portfolio-map-stats/
        route.js                     # GET ?period=10yr|20yr — computes windowed risk/return stats for the Portfolio Map. Step 1: metadata from portfolio_stats. Step 2: row count with .gte('date', cutoff). Step 3: parallel pagination via Promise.all across all pages simultaneously (fast vs sequential). Step 4: groups by slug, runs computeStats() from lib/portfolioStats, skips portfolios with < 12 months in window. Returns [{ slug, name, category, cagr, annualized_volatility, sharpe_ratio, max_drawdown, total_months }]. CR-4 (July 2026): cached via explicit `Cache-Control: public, s-maxage=86400, stale-while-revalidate` header (a `revalidate` export is a no-op here — the handler reads request.url). CR-6: any failed pagination page returns 500 instead of silently computing from partial data.
      correlation-matrix/
        route.js                     # GET — computes the full pairwise Pearson correlation matrix across all portfolios. `export const revalidate = 86400` caches the response for 24h (monthly_returns only changes once a month; the revalidate export genuinely works here — this handler takes no request/searchParams, unlike drawdown-analysis and portfolio-map-stats). CR-6: any failed pagination page returns 500 instead of silently computing from partial data. Step 1: metadata from portfolio_stats. Step 2–3: row count + parallel paginated fetch of all monthly_returns (same .range() pattern as portfolio-map-stats, but unfiltered — full history). Step 4: groups into Map<date, return> per slug for O(1) overlap lookup. Step 5: for each pair, intersects the two date-maps and runs pearsonCorrelation() — null if fewer than MIN_OVERLAP_MONTHS (24) overlapping months. Portfolios with < 24 months of total history are excluded entirely. Returns `{ portfolios: [{slug, name, category}], matrix: number[][] }` (matrix[i][j] = correlation or null, diagonal = 1).
  lib/
    supabase.js                      # Supabase client init — anon-key createClient (for lib/db.js) + createBrowserSupabaseClient() + createServerSupabaseClient(cookieStore) via @supabase/ssr
    supabaseAdmin.js                 # getAdminClient() — lazy service-role client (bypasses RLS). SERVER ONLY — never import from a client component. Used by lib/db.js getCurrentSignals(), builder-holdings, current-holdings, memberful webhook, builder-save fallback link, auth callback link
    entitlements.js                  # CR-2 (July 2026) — THE single source of truth for subscription entitlement: entitled = status IN ('active','cancelled') AND current_period_end > now ('cancelled' = paid through period end; 'expired' = period over). Exports isEntitled(), getEntitledSubscription(client, userId) (prefers Signals rows over most-recent when a user has multiple), tierFromSubscription(), isSignalsEntitled(). Used by account/page.js, builder/page.js, api/builder-save, api/current-holdings, api/builder-holdings. Any new tier/entitlement check MUST go through this module — do not hand-roll status queries. stage0_email.py mirrors the same rule in Python for the subscriber send list.
    db.js                            # All database query functions (see below)
    statDefinitions.js               # Plain JS (no 'use client') — STAT_DEFINITIONS object with definitions for 19 stat keys; importable by both server and client components
    withdrawalRates.js               # Plain JS — `buildWithdrawalRates(monthlyReturns)` computes SWR + PWR for 4 durations × 2 inflation modes using Bengen rolling-window binary search (20 steps). Called server-side in portfolio detail page. Returns `{ 20: { swr_nominal, swr_real, pwr_nominal, pwr_real }, 25: ..., 30: ..., 40: ... }` or null per duration when data is insufficient.
    fiCalculator.js                  # Plain JS — Financial Independence Calculator engine (self-contained, simplified copy of the Monte Carlo bootstrap approach, ADR 0001). Exports: `getDefaultWithdrawalRate(rates, mode)` / `getWithdrawalRateSource(rates, mode)` — `mode` is `'swr'|'pwr'` (default `'swr'`), cascades 30yr → 25yr → 20yr real SWR/PWR from `buildWithdrawalRates()`, else hardcoded 4%; `getFINumber(annualSpending, withdrawalRatePct)`; `runFISimulation({ currentSavings, annualContribution, fiNumber, monthlyReturns })` — 1,000-sim bootstrap resampling full calendar years, fixed 50-year cap, nominal terms only (v1). Returns `{ chartData, yearsToFI: { p10, p50, p90 } | null, alreadyFI }`. Chart-only `yVals` are clamped to a `Math.max(1, ...)` floor so the percentile chart's log-scale Y axis stays valid when `currentSavings = 0`; the unclamped value still drives the `crossedAt`/years-to-FI calc.
    portfolioStats.js                # Plain JS — shared stat helpers used by BuilderClient, PortfolioMapClient, MonteCarloClient, and SavedMixList. Exports: `RF_MONTHLY` (4.5% annual / 12), `buildBlendedReturns(portfolioReturns, selections)` (intersects date sets across portfolios, returns weighted blended monthly returns; handles single-portfolio case — CR-12: MonteCarloClient's slower local copy was deleted in favour of this), `blendHoldings(selections, { allocBySlug, signalBySlug, tacticalSlugs })` (CR-12 — blends current holdings by mix weights into `{ hasTactical, holdings: [{ticker, weight}] }`, 0–100 scale sorted desc; shared by BuilderClient's Blended Holdings card and SavedMixList's mix chips), `computeStats(blended)` (returns null if < 12 months; computes CAGR, maxDrawdown, sharpe, sortino, bestYear, worstYear, ulcerIndex, ulcerPerformanceIndex, ytdReturn, cagr10yr, gfcCagr, dotcomCagr, annualizedVolatility, pctProfitableMonths, bestMonth, worstMonth, longestDrawdownMonths, growthData, annualReturns, totalMonths, startDate, endDate). Mirrors the math in the portfolio_stats materialized view.
    chartData.js                     # Plain JS (server + client importable) — CR-12 (July 2026): single home for chart-data builders previously duplicated across portfolios/[slug]/page.js, compare/page.js, and BuilderClient.jsx. Exports: `buildGrowthData` (growth of $10K, one point per year), `buildDrawdownData` (% below running peak per month), `buildRollingReturnData(returns, windowMonths)` (annualised rolling return series), `buildRollingDatasets` (all 4 windows keyed 1Y/3Y/5Y/10Y — windows with no data are OMITTED; all consumers treat missing key and empty array identically), `buildHeatmapData` (holding-period CAGR grid, max 30 cols). Any change to chart math goes here — do NOT re-inline these in pages/components.
  public/
    fonts/
      Manrope-Bold.ttf               # Manrope 700 — used by OG image routes (next/og requires TTF)
      Manrope-ExtraBold.ttf          # Manrope 800 — used by OG image routes
  scripts/
    update-descriptions.js           # Node.js script — reads all description-drafts/*.md and pushes to Supabase via service role key. Run with: node scripts/update-descriptions.js
    auto-returns/
      PROXY_CHAINS.md                # Standing proxy chain reference for all ETFs used in backtests — confirmed chains, approved chains, data floors, open problems. Read this before writing any new backfill script.
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
| `getPortfolios()`      | Explicit 30-column list from portfolio_stats (not `select('*')`, June 2026 — must cover every column in ScreenerClient's `ALL_COLUMNS` picker, including off-by-default ones; add new screener columns/filters here too), ordered by sharpe_ratio desc |
| `getPortfolio(slug)`   | Single portfolio from portfolio_stats by slug                      |
| `getAllocations(slug)`  | Allocations for one portfolio, ordered by % desc, with color fallback |
| `getAllAllocations()`   | All allocations across all portfolios, with color fallback         |
| `getAssetClasses()`    | All asset classes with default_color and description               |
| `getMonthlyReturns(slug)` | Monthly return rows for one portfolio, ordered by date asc      |
| `getAllPortfolioStrategies()` | All rows from portfolio_strategies (portfolio_slug + strategy_slug) |
| `getAllSlugs()`         | Slug column only from portfolios table (for generateStaticParams)  |
| `getPortfolioNames()`  | name + slug + kofi_link from portfolios table, alphabetical — kofi_link used by BuilderClient to identify tactical/signal portfolios. Wrapped in `unstable_cache(fn, ['portfolio-names-v2'], { tags: ['portfolio-names'] })` (June 2026, key/tags added July 2026) since `app/layout.tsx` calls it on every request. **Corrected July 2026: a Vercel redeploy does NOT clear this** — Vercel's Data Cache persists across deployments regardless of code changes (unlike a self-hosted Next.js in-memory cache). A new portfolio was live on `/database` (uncached `getPortfolios()`) but missing from Navbar search/Builder/FI Calculator for multiple redeploys until the cache key was bumped. No on-demand `revalidateTag()` route exists yet, so a stale list today requires another key bump (e.g. `-v3`) — see New Portfolio Checklist. No `revalidate` option — passing one would silently turn every page rendering the root layout into ISR. |
| `getCurrentSignals()`  | Current month's holdings for all signal-set portfolios (kofi_link IS NOT NULL) from tactical_monthly_holdings. Fetches the signal portfolio list and the single latest stored date (avoids Supabase's 1,000-row cap as history accumulates) **in parallel** (June 2026 — Stage 0 writes all tactical portfolios for a month together, so an unfiltered latest-date query is equivalent to filtering by signal slugs), then fetches all holdings for that date only. Weights stored as decimal fractions (0–1) in DB, multiplied by 100 before returning. Returns: [{ slug, name, date, holdings: [{ ticker, weight }] }]. **CR-1 (July 2026): reads holdings via the service-role client (`lib/supabaseAdmin.js`) — RLS on tactical_monthly_holdings denies anon reads. Does NO entitlement check itself — callers MUST verify an active Signals subscription first.** CR-12: the group-by-slug + weight×100 step is the exported `groupTacticalHoldings(rows, nameBySlug)` helper, shared with `/api/builder-holdings`. |
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
| Financial Independence Calculator | `/tools/financial-independence` | Complete |
| Lump Sum vs. DCA Calculator | `/tools/lump-sum-vs-dca` | Complete |
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
- Placed on: homepage (below Tools Strip, above AI Recommend — June 2026 reorder), membership page (above price callout), portfolio detail pages (below Related Portfolios)
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
- **`ToolsMenu.jsx`** (client) — dropdown containing: Leaderboard, Drawdown Analyzer, Portfolio Map, Financial Independence, Correlation Matrix, Compare, Builder, Monte Carlo. Each item has a label + one-line description. Click-outside to close.
- **`MobileMoreMenu.jsx`** (client) — "More ▾" dropdown on mobile; sections: Tools (Leaderboard, Drawdown Analyzer, Portfolio Map, Financial Independence, Correlation Matrix, Compare, Builder, Monte Carlo) with a divider then Membership and Account.
- **URL convention (decided June 2026):** Analytical chart tools (Drawdown Analyzer, Portfolio Map) live under `/tools/`. Workflow tools (Builder, Compare, Monte Carlo, Leaderboard, Screener) stay at the top level. Rationale: moving the already-indexed workflow tool URLs would cost SEO. Do not move existing `/tools/` routes to the top level or vice versa without a redirect plan.
- `account_circle` icon (22px) links to `/account` — no auth check needed here; middleware redirects unauthenticated users to `/login?next=/account` automatically
- Stays a server component — all interactivity is in NavSearch.jsx, ToolsMenu.jsx, and MobileMoreMenu.jsx (all client)
- JSDoc `@param` type annotation on props is required to avoid TypeScript `never[]` errors when called from layout.tsx
- Logo uses `<Image src="/portfoliodb-icon.svg">` (file lives in `public/`); the copy in `components/` is the original source

### FilterBar.jsx (home page)
- No longer uses assetClasses prop — categories are hardcoded (Buy and Hold, Tactical)
- Category: native `<select>` dropdown (single select)
- Risk Tolerance: pill buttons 1–5 (single select)
- Max Drawdown: dropdown select with 4 options — No limit (value=""), Less than 10% (value="10"), Less than 20% (value="20"), Less than 30% (value="30")
- On submit: navigates to `/database?risk=N&max_drawdown=N&cat=Name`

### DatabaseClient.jsx
- Reads `risk`, `max_drawdown`, and `cat` URL params on first render to
  pre-fill filters (from the home page FilterBar)
- Wrapped in `<Suspense>` in database/page.js (required by useSearchParams)
- Risk levels 1–2 = Conservative, 3 = Moderate, 4–5 = Aggressive
- **AI input bar (June 2026):** Full-width bar sits between the page header and the sidebar+grid layout. Submits to `POST /api/screener` (same endpoint as the old homepage AIRecommend). State: `aiQuery`, `aiLoading`, `aiError`, `aiPicks`. Replaces previous picks on re-submit; "Clear AI picks" link appears inline in the bar when picks are showing and resets all AI state.
- **AI Picks section (June 2026):** When `aiPicks` is non-null, a distinct "AI Recommendations" section (header + `auto_awesome` icon + "Matched to your goal" badge) pins 3 `PortfolioCard` components above the regular grid, separated by a divider. AI Picks are looked up from the full `portfolios` prop by slug — they ignore active filters. Any pick whose slug is absent from `filteredSlugs` (the active filtered set) shows an "Outside your filters" tag in its card header. See ADR `docs/adr/0001-ai-picks-ignore-active-filters.md` for the rationale.
- `filteredSlugs` useMemo: `new Set(filtered.map(p => p.slug))` — used for O(1) outside-filters detection per AI pick.
- `PortfolioCard` accepts optional `aiReason` (string) and `outsideFilters` (bool) props — `aiReason` renders below the allocation bar; `outsideFilters` renders a tag in the top badge row; card border turns green (`border-[#71a38b]/60`) when `aiReason` is set.
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
  Sortino Ratio, Ulcer Index, Volatility Max, Profitable Months Min, Longest Drawdown Max),
  Rolling Returns (Min) sliders (1yr/3yr/5yr/10yr), Asset Exposure bucket buttons (EQ/FI/CMD/RE/ALT)
- Risk Profile filter was removed — risk column still shown in the results table
- All slider defaults are set at the permissive end so all 76 portfolios show on load. Slider min/max values are calibrated to actual portfolio data — no dead zones beyond the real data range. Key defaults: CAGR 0–16% (max 16), Sharpe -0.5–1.0 (max 1.0), Max Drawdown 5–60% (default 60), Worst Year -45–0% (default -45), 10yr CAGR -5–15% (default -5), Sortino -0.5–0.25 (default -0.5), Ulcer 0–14 (default 14 intentional — 2 outlier portfolios above 8), Rolling 1yr -50–0%, 3yr -20–5%, 5yr -10–5%, 10yr -5–8%, Volatility 2–20% (default 20), Profitable Months 0–70% (default 0), Longest Drawdown 20–75 months (default 75).
- Sortino max = 0.25 and Ulcer max = 14 (real portfolio ranges; Ulcer default intentionally at max to avoid filtering the 2 outlier portfolios by default — documented)
- `assetBadges()` and `BADGE_STYLES` map allocations → colored EQ/FI/CMD/RE/ALT badges
  shown in the Asset Mix column of the results table
- Receives `assetClasses` prop from portfolio-screener/page.js
- Mobile: `showFilters` defaults to `true` (filters open on load). A sticky "Show Results (N)" pill button (`fixed bottom-4 left-4 right-4 lg:hidden z-50`) appears when filters are open — clicking it collapses filters so the user can see results.
- Table min-width grows dynamically based on number of visible columns (base 420px + 90px per column)
- **Column picker:** "Columns" button next to Export CSV opens a dropdown with 30 toggleable
  columns — Performance Benchmarks (CAGR, Max DD, Sharpe on by default; Sortino, Worst Year,
  Best Year, 10yr CAGR, Ulcer Index, UPI, GFC CAGR, Dotcom CAGR, 1yr CAGR, 3yr CAGR,
  Ann. Volatility, Profitable Months, Best Month, Worst Month, Longest Drawdown off by default)
  and Rolling Returns (1yr/3yr/5yr/10yr Low/Avg/High, all off by default). +N badge shows extra
  active columns. "Reset to defaults" link appears when defaults are changed. All visible columns
  are sortable. CSV export reflects currently visible columns. `ALL_COLUMNS` array in the component
  is the single source of truth for available columns. If you add a new screener column or filter,
  also add the field to `getPortfolios()` in `lib/db.js` (its explicit column list must stay in sync).

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

- Client component — props: `initialMixes` (array), `tier` ('builder' | 'signals'), `allAllocations` (array), `allSignals` (array from getCurrentSignals — empty for non-Signals users since CR-1), `tacticalSlugs` (array of signal-covered slugs from kofi_link, public info), `portfolioNames` (array from getPortfolioNames — CR-10, July 2026: saved selections only store `{slug, weight}`, so mix pills look up names via a slug→name map at render time; self-heals on renames)
- `buildLoadUrl(selections)` builds `/builder?mix=${encodeURIComponent(slug:weight,slug:weight)}` URLs — clicking a mix opens it pre-loaded in the Builder
- Delete: shows inline "Delete? Yes / Cancel" confirmation per row (no `window.confirm`)
- Empty state: "No saved mixes yet" with "Go to Builder" CTA
- Builder tier: shows `{mixes.length}/3 mixes used` counter with upgrade link when 3 are saved
- Delete calls `DELETE /api/portfolios/[id]` and removes the mix from local state on success
- **Blended holdings** shown inside each mix card below the weight pills — same computation as BuilderClient's `blendedHoldings` useMemo (portfolio weight × holding weight, summed by ticker). **CR-1 (July 2026):** Signals tier sees the full blend (incl. tactical); non-Signals users only ever receive the buy-and-hold portion (public allocation data, shown unblurred) plus a "this mix includes tactical holdings" lock note — no real signal data reaches their DOM. `tacticalSlugs` comes from the server prop (kofi_link) rather than allSignals, since non-members receive `allSignals=[]`. `allocBySlug`, `signalBySlug`, and `tacticalSlugs` are pre-computed once via useMemo and shared across all mix cards.

### app/account/page.js (Account Page — /account)

- Server component with `export const dynamic = 'force-dynamic'` (no caching — always shows fresh data)
- Redirects unauthenticated users to `/login?next=/account`
- **Session check (June 2026):** uses `supabase.auth.getSession()`, not `getUser()` — `proxy.js` middleware already calls `auth.getUser()` for every request (including `/account`) and refreshes the session cookie, so the page can decode that already-verified cookie locally via `getSession()` without a second Auth-server round trip.
- Fetches subscription + saved mixes + `getAllAllocations()` (public) + `getPortfolioNames()` (cached; supplies kofi_link → tacticalSlugs) in parallel via `Promise.all`. **CR-1 (July 2026): `getCurrentSignals()` is only called AFTER the tier is known, and only when `tier === 'signals'`** — non-members get `signals = []` and never receive real signal data in the page payload. Side benefit: the account page skips the signals queries entirely for non-Signals users (smaller payload, fewer round trips).
- Subscription lookup (CR-2, July 2026): `getEntitledSubscription()` from `lib/entitlements.js` — entitled rows only (`status IN ('active','cancelled')` AND `current_period_end > now`), preferring Signals rows. An expired subscription shows the "No paid plan" card.
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
- **`config.matcher` narrowed (CR-8, July 2026):** the middleware now runs ONLY on `/account/:path*`, `/builder/:path*`, `/api/builder-save`, `/api/portfolios/:path*`, and `/api/current-holdings/:path*` — auth.getUser() is a network round trip per matched request, and no other route needs the session. Any new page/route that calls `getSession()` MUST be added to this matcher (getSession() trusts the cookie the middleware just refreshed); routes that call `auth.getUser()` directly (e.g. `/api/builder-holdings`, `/monte-carlo-simulation`) are safe outside it.

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
- "Browse all portfolios in the database →" centered link below the 3 cards (June 2026)

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
- **Auto-allocate dropdown** (visible when `selections.length >= 2 && allDataLoaded && !isLoading`): a compact native `<select>` labelled "Auto-allocate:" with three options — **Equal Weight**, **Risk Parity**, **Max Sharpe**. Applies weights immediately on selection and resets to "Choose…" placeholder (stateless). A single `StatTooltip` ⓘ icon describes all three modes using a JSX fragment with `<br/>` line breaks as the `definition` prop. `riskParityWeights()` — inverse-vol over common date window, rounds to 1 decimal, last slot absorbs remainder, null if < 12 common months. `maxSharpeWeights()` — analytical Markowitz tangency portfolio: tries all 2^n non-empty subsets of assets, solves Σw = μ_excess via Gauss-Jordan elimination for each subset, keeps feasible solutions (all weights ≥ 0), picks the subset with the highest Sharpe. Applies a 5% minimum weight floor post-solve (iterative clamp-and-redistribute) so no portfolio in the mix is zeroed out. Falls back silently if < 12 common months or no feasible solution.

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

### Drawdown History table + SeasonalitySection (June 2026)
- Both added to every portfolio detail page as `col-span-12` sections in the same grid as ChartsSection and HoldingPeriodHeatmap. Order: ChartsSection → Drawdown History → HoldingPeriodHeatmap → SeasonalitySection.
- **Drawdown History** — rendered as static server-side HTML table (no client component needed). Section `id="drawdown-events"`, conditional on `drawdownEvents.length > 0`. Data from `buildDrawdownEvents(monthlyReturns, minDepthPct=3)` in `portfolios/[slug]/page.js`: tracks running peak/value, emits an event per drawdown ≥ 3% with `{ startDate, troughDate, endDate, depth, lengthMonths, recoveryMonths }`. `endDate` is null for ongoing drawdowns (shown as amber "Ongoing"). Sorted by severity (worst depth first). `formatMY(yyyyMM)` helper converts `"2009-03"` → `"Mar 2009"` for display.
- **Seasonality** — `buildSeasonalityData(monthlyReturns)` groups returns by calendar month (0–11 index) and computes avg, count, and positive-month count for each. Returns 12-element array with `{ month, avg, count, positive }`. Rendered via `SeasonalitySection.jsx` (client wrapper, `ssr: false` dynamic import of `SeasonalityChart.jsx`). Section `id="seasonality"` is on the `<section>` inside `SeasonalitySection`, not on the wrapper div in page.js — the scroll spy finds it by `document.getElementById`.

### HoldingPeriodHeatmap.jsx (June 2026)
- Client component — rendered on every portfolio detail page below the charts section, full width (`lg:col-span-12` inside the body grid)
- Input: `heatmapData` prop computed server-side by `buildHeatmapData(monthlyReturns)` in `portfolios/[slug]/page.js`
- **Data shape:** `{ startYears: number[], holdingPeriods: number[], data: (number|null)[][] }` — `data[i][j]` = annualised CAGR % for `startYears[i]` held `holdingPeriods[j]` years, or null for incomplete data. Max 30 columns.
- **`buildHeatmapData()`** uses a `Map` keyed by `"YYYY-MM"` for O(1) lookup. Returns null if monthlyReturns is empty.
- **Color scale:** 8 discrete bands from `<-10%` (dark red `#b71c1c`) to `≥20%` (darkest green `#0d3d26`).
- Rows render newest start year at top (reversed). Grid scrolls horizontally on mobile via `-mx-6 px-6 md:-mx-8 md:px-8` bleed pattern on the scroll container.
- **Cursor-following tooltip (June 2026):** the old reserved `h-5` top bar was removed. Hovering a cell now shows a `position: fixed` pill (white bg, border, shadow, `pointerEvents: none`, `zIndex: 200`) next to the cursor — same pattern as the Correlation Matrix's cursor tooltip. `mousePos` state updates via `onMouseMove` on the `.overflow-x-auto` scroll container; `tooltip` state (`{startYear, years, cagr}`) set via per-cell `onMouseEnter`/`onMouseLeave`. Edge-flip math uses fixed estimate constants (`TOOLTIP_W = 300`, `TOOLTIP_H = 36`, `OFFSET = 14`) to keep the pill on-screen near viewport edges. Content/format unchanged: `Jan {startYear} · {years}-year hold ({startYear}–{endYear}) · {sign}{cagr}% CAGR`, CAGR colored `#27624a` (≥0) / `#b71c1c` (<0).

### StartDateSensitivitySection.jsx + StartDateSensitivityChart.jsx (June 2026)
- Full-width section on every portfolio detail page — rendered after SeasonalitySection as a `col-span-12` sibling div in the body grid. Requires ≥ 20yr history (returns null from `buildStartDateSensitivityData` otherwise).
- **`buildStartDateSensitivityData(monthlyReturns)`** in `portfolios/[slug]/page.js`: builds a `Map<"YYYY-MM", return>` for O(1) lookup; `cagr10yr(startYear)` compounds 120 monthly returns to annualized CAGR; iterates from `firstYear+10` to `lastYear` — each point has `{ year, prev: cagr10yr(year−10), next: cagr10yr(year) }` where `next` is null beyond `cutoffYear = lastYear − 9` (insufficient future data). Returns `{ points, cutoffYear, luckiest, unluckiest }` or null if < 2 points with non-null `next`.
- **`StartDateSensitivitySection.jsx`** (client `'use client'`) — lazy-loads `StartDateSensitivityChart` via `next/dynamic({ ssr: false, loading: () => <ChartSkeleton height={280} /> })`. Header stat row shows "Luckiest Start" (green), "Unluckiest Start" (red when negative, neutral otherwise), and "Spread" (in pp — percentage points). Legend shows line colors. The `id="start-date-sensitivity"` is on the inner `<section>`, not the wrapper div in page.js, so the scroll spy finds it via `document.getElementById`.
- **`StartDateSensitivityChart.jsx`** — `LineChart` with two `Line` elements: `dataKey="prev"` (Prev 10 Yrs CAGR, red `#b71c1c`) and `dataKey="next"` (Next 10 Yrs CAGR, green `#27624a`), both `dot={false}`, `connectNulls={false}`, `isAnimationActive={false}`. `ReferenceLine y={0}` (grey). Dashed `ReferenceLine x={cutoffYear}` marks where Next data ends. `ReferenceDot` (r=5, no `label` prop) highlights luckiest start (green fill) and unluckiest start (red fill) on the Next line — labels were removed because they overlapped the Prev line at those X positions; the values are already shown in the header stat tiles. Y domain: ±22% padded range, floored/ceiled to nearest 2%.
- **Timing Sensitivity scalar** (`timing_sensitivity`) — derived field computed in both `app/database/page.js` and `app/portfolio-screener/page.js` as `rolling_10yr_high − rolling_10yr_low` (rounded to 2dp); null when either column is null. Not a new DB column. Used as the "Timing Sensitivity" `StatRow` in the Performance Snapshot (with benchmark comparison), and as a sortable column in the Portfolio Screener (off by default, group: `performance`, unit: `pp`).
- `STAT_DEFINITIONS['Timing Sensitivity']` added to `lib/statDefinitions.js`.
- navSections entry: `{ id: 'start-date-sensitivity', label: 'Timing' }` — conditional on `startDateSensitivityData` being non-null, inserted between the Heatmap and Seasonality entries.

### WithdrawalRatesTable.jsx + lib/withdrawalRates.js (June 2026)
- **`'use client'`** — marked as a client component (June 2026) so it can be imported by `BuilderClient.jsx`. No server-only APIs are used, so this is safe; the component is still server-rendered during SSG/SSR on portfolio detail pages.
- Props: `rates` (from `buildWithdrawalRates()`), `slug` (optional — for the "Run Monte Carlo →" CTA link; if null/undefined the link is not rendered).
- Two sub-sections: **Safe Withdrawal Rate** (portfolio value stays above $0) and **Perpetual Withdrawal Rate** (real purchasing power preserved at end of period). Each has Nominal and Real (3% inflation) columns across 4 durations.
- **4% Rule badge:** if `rates[30]?.swr_real >= 4.0`, renders a green "Passes the 4% Rule" pill next to the heading. If 30yr data exists but SWR is below 4.0%, renders a neutral "Below the 4% Rule at 30 yrs" pill. No badge if 30yr data is insufficient.
- **`buildWithdrawalRates(monthlyReturns)`** in `lib/withdrawalRates.js`: for each duration (20/25/30/40yr), collects all rolling windows of that length from the full history, then runs a 20-step binary search on the annual withdrawal rate (0–25% range). `simulateWindow()` operates directly on the original array with start index + length (no slice copies). Returns null per duration when `total - windowLength < 1`. Computation is server-side at SSG build time — adds ~100–300ms per portfolio at build time, negligible at runtime. Also called client-side in BuilderClient via `useEffect` for blended mix SWR.
- **PWR definition:** ending real value (nominal / cumulative inflation) ≥ starting value ($10,000). For nominal PWR, ending nominal value ≥ $10,000.
- Placed in the col-span-8 main column between Rolling Returns summary and the Description detail section on portfolio detail pages.
- Footer CTAs (June 2026): "Run Monte Carlo →" (`/monte-carlo-simulation?slug=${slug}`) and "Calculate years to FI →" (`/tools/financial-independence?slug=${slug}`) — both conditional on the `slug` prop being provided.

### FinancialIndependenceClient.jsx + lib/fiCalculator.js (Financial Independence Calculator — `/tools/financial-independence`, June 2026)
- `app/tools/financial-independence/page.js` is a server component (dynamic — reads `?slug=`) — fetches `getPortfolioNames()` plus `getMonthlyReturns(initialSlug)`/`getPortfolio(initialSlug)` for the initial portfolio (defaults to `united-states-60-40-portfolio`, falls back to alphabetical-first if that slug is absent; falls back to first portfolio from `getPortfolioNames()` if the slug param is absent), passes all to `FinancialIndependenceClient`.
- **Inputs panel** (sticky left column): Portfolio selector, Annual Income, Savings Rate (%), Current Savings, Annual Spending in Retirement, Withdrawal Rate (computed/overridable), and a read-only "Your FI Number" card (`annualSpending / (withdrawalRate / 100)`).
- Changing the portfolio re-fetches via `/api/monte-carlo-returns?slug=...` (same endpoint Monte Carlo uses) and resets `wrOverride`/`editingWR`/triggers a fresh `buildWithdrawalRates()` call.
- **Withdrawal Rate — SWR/PWR toggle (June 2026):** pill toggle (SWR/PWR, default SWR) above the rate display. `getDefaultWithdrawalRate(rates, mode)` / `getWithdrawalRateSource(rates, mode)` in `lib/fiCalculator.js` take a `mode` param and read `swr_real` vs `pwr_real` from the same 30→25→20yr cascade (else hardcoded 4%). Toggling resets any custom override (`handleWrModeChange`) and updates the source label ("...safe withdrawal rate (real)..." vs "...perpetual withdrawal rate (real)..."). A one-line note explains PWR is always lower than SWR (preserves principal vs. drawing down to zero) — toggling noticeably raises the FI Number and years-to-FI.
- User can override the computed rate via an inline "Edit" affordance (shows "Reset to default" once overridden).
- **Simulation (`runFISimulation` in `lib/fiCalculator.js`):** 1,000-sim bootstrap resampling of full calendar years from the portfolio's `monthly_returns` (same approach as Monte Carlo's historical mode, ADR 0001), fixed 50-year cap, nominal terms only (v1 — no inflation modeling on contributions or the FI Number). Debounced (250ms) `useEffect` re-runs on any input change. Returns `{ chartData, yearsToFI: {p10,p50,p90}, alreadyFI }`. "Already FI" state shown instead of a simulation when Current Savings already meets/exceeds the FI Number.
- **Results panel:** headline "Years to Financial Independence (Median)" card, 3 stat cards (10th/50th/90th percentile years), and a Recharts `LineChart` ("Projected Portfolio Value Over Time") with p10/p25/p50/p75/p90 lines plus a red dashed `ReferenceLine` at the FI Number.
- **Log-scale Y-axis (June 2026):** `<YAxis scale="log" domain={['auto','auto']} allowDataOverflow ...>`, matching `GrowthChart.jsx`'s pattern — without it, the FI Number line and early-year crossing points were unreadable against 50-year ending values. `lib/fiCalculator.js` clamps chart-only `yVals` to a `Math.max(1, Math.round(value))` floor so the log axis stays valid when Current Savings = 0; the unclamped `value` still drives the `crossedAt`/years-to-FI calc.
- "Years to FI" reported as whole years (rounded up to the crossing year, e.g. crossing in month 13–24 of year 2 → "2 years").
- See `CONTEXT.md` for FI Number / Withdrawal Rate / Savings Rate / Annual Income / Years to FI definitions.

### LumpSumVsDCAClient.jsx + LumpSumResultsChart.jsx (Lump Sum vs. DCA — `/tools/lump-sum-vs-dca`, June 2026)
- `app/tools/lump-sum-vs-dca/page.js` is a server component (`force-dynamic`) — reads `?slug=`, validates against `allPortfolioNames`, falls back to `DEFAULT_SLUG = 'united-states-60-40-portfolio'`. Fetches `getMonthlyReturns(slug)` + `getPortfolio(slug)` in parallel server-side.
- **Framing (ADR 0002 — same-total-window):** Both strategies run from the same start date to the same end date. The DCA period is contained *within* the investment horizon, not added on top of it. A 12-month DCA over a 10-year horizon means: contribute monthly for months 1–12, then hold the accumulated balance for months 13–120.
- **Computation (`computeResults`):** For each starting month `i` from 0 to `returns.length - T`, compute `lsValue` (full amount invested at month `i`, compounded T months) and `dcaValue` (monthly contribution at the start of each of the first `dcaMonths` months, then compounded for the remaining months). `advantage = (lsValue / dcaValue - 1) * 100`. Returns null when `amount ≤ 0` or fewer than T+1 months of data.
- **Stats:** `winRate` (% of periods where LS won), `total` (starting periods), `medAdvantage` (median % advantage), `medLs`/`medDca` (median ending values). `MIN_PERIODS = 24` guard — no results shown below this threshold.
- **Headline card:** green tinted (`bg-[#f0f7f3]`) when `winRate >= 50`. Shows medAdvantage phrased as "lump sum ended +X% ahead" or "DCA ended +X% ahead".
- **Chart (`LumpSumResultsChart`):** Single `LineChart` with `advantage` on Y axis. `ReferenceArea` fills green above `y=0`, red below. Y domain padded 8% of range, rounded to nearest 5. `ReferenceLine y={0}` draws the zero line. X axis shows year only (`v.slice(0,4)`). Custom tooltip colors the value green/red. `ifOverflow="extendDomain"` on both ReferenceAreas so the colored bands always fill to the chart edge.
- **Portfolio change:** fetches `/api/monte-carlo-returns?slug=` (same endpoint as Monte Carlo), reuses existing API with no new route needed.
- **DCA options:** `[3, 6, 12]` months. **Horizon options:** `[5, 10, 20, 30]` years. Defaults: 12mo / 10yr.

### PortfolioJumpNav.jsx (June 2026)
- Client component — sticky in-page jump nav placed between the hero and the body grid on portfolio detail pages
- Props: `sections` array of `{ id, label }` — computed server-side in `portfolios/[slug]/page.js` so conditional sections (Rolling Returns, Strategy) only appear when those sections actually render
- **Sticky offset:** uses a ref + `useEffect` to measure the main Navbar height (`nav[class*="z-50"]`) on mount and on resize, then sets `navRef.current.style.top` to that value. This handles both desktop (49px single-row) and mobile (86px two-row) navbars without hardcoding
- **Scroll spy:** `scroll` event listener finds the last section whose absolute `top` (via `getBoundingClientRect().top + window.scrollY`) is ≤ `window.scrollY + mainNavHeight + 70`. The `+70` buffer ensures a section becomes active as soon as its heading clears the sticky UI
- **Click handler:** scrolls to `el.getBoundingClientRect().top + window.scrollY - (mainNavHeight + 56)`, landing the section heading just below both sticky bars
- **Section IDs in page.js:** `id="allocation"`, `id="stats"`, `id="rolling-returns"` (conditional), `id="withdrawal-rates"` (wrapper div around WithdrawalRatesTable), `id="strategy"` (conditional), `id="charts"` (the col-span-12 ChartsSection wrapper), `id="drawdown-events"` (col-span-12 Drawdown History table, conditional on drawdownEvents.length > 0), `id="heatmap"` (col-span-12 HoldingPeriodHeatmap), `id="seasonality"` (inside SeasonalitySection, conditional on seasonalityData.length > 0 — rendered as a separate col-span-12 row AFTER heatmap, not inside ChartsSection), `id="start-date-sensitivity"` (inside StartDateSensitivitySection, conditional on startDateSensitivityData non-null — rendered as a col-span-12 row AFTER seasonality)
- Horizontal scrollable pill row with `scrollbarWidth: none`. Active pill: `bg-primary text-on-primary`. Uses `-mx-8 md:-mx-12` negative margins to extend to container edges

### Portfolio Detail Page Layout (June 2026, updated June 2026)
- **Performance Snapshot benchmark column (June 2026):** Every stat in the Performance Snapshot section shows a "Portfolio / US 60/40" side-by-side value. The benchmark is fetched via `getPortfolio(BENCHMARKS[0].slug)` added to the page's `Promise.all`. Skipped (returns null) when the portfolio being viewed IS the 60/40 benchmark — `slug !== BENCHMARKS[0].slug ? getPortfolio(...) : Promise.resolve(null)`. The `StatRow` local function accepts an optional `benchmarkValue` prop; when present, renders `value / benchmarkValue` with the benchmark in `text-on-surface-variant`. A "Portfolio / US 60/40" legend appears top-right of the section header. Sharpe, Sortino, and UPI display precision reduced from `.toFixed(3)` to `.toFixed(2)` for visual consistency with the benchmark column.
- **Two-column grid** (`grid grid-cols-12`): col-span-8 (left) contains Allocation, Performance Snapshot, Rolling Returns summary, WithdrawalRatesTable, and the Description detail (Investment Philosophy / Who It's For / Pros/Cons); col-span-4 (right) is the sidebar (Implementation, At a Glance, Membership CTA).
- **Full-width rows** (`col-span-12`, inside the same grid — no gap): (1) ChartsSection (Growth of $10K, Historical Drawdown, Rolling Returns); (2) Drawdown History table (`id="drawdown-events"`); (3) HoldingPeriodHeatmap; (4) SeasonalitySection (`id="seasonality"`); (5) StartDateSensitivitySection (`id="start-date-sensitivity"`, conditional on ≥ 20yr history). Using `col-span-12` inside the same grid avoids the gap problem that occurs when the sidebar is taller than the left column. **DOM order must match navSections order** — the scroll-spy active-pill logic uses each section element's absolute page offset, so a section rendered inside an earlier parent (e.g. inside the `id="charts"` div) will have a lower offset than later siblings, causing the wrong pill to highlight. All five full-width sections are rendered as sibling divs at the same grid level.
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
- **"Clear all" button (June 2026):** Appears in the controls row only when any filter or sort is active (any category deselected, strategy picker has selections, portfolio picker has selections, or a sort is active). Resets `activeCategories` to all categories, clears `selectedStrategies`, clears `selectedSlugs`, and resets sort state in one click.
- **Fixed-height info panel + cursor tooltip (June 2026):** The info panel above the matrix is fixed at `h-[68px]` with `overflow-hidden` and `truncate` on the name line so long portfolio name pairs never cause layout shift. A `position: fixed` cursor tooltip (`pointerEvents: none`, `zIndex: 200`) renders next to the mouse while hovering any cell — shows the full pair names (not truncated), correlation label, and value. `mousePos` state is updated via `onMouseMove` on the scroll container. Smart edge detection: if the tooltip would overflow the right or bottom edge of the viewport, it flips to the left/above the cursor instead (`mousePos.x + OFFSET + TOOLTIP_W > window.innerWidth ? mousePos.x - TOOLTIP_W - OFFSET : mousePos.x + OFFSET`). `TOOLTIP_W = 280`, `TOOLTIP_H = 90`, `OFFSET = 14`.
- **`cellTextColor(r, minR, maxR)` (June 2026):** Companion to `cellColor` — uses the same relative `t` value (position in the dataset's min→max range) but maps to text-weight colors: `t=0` → dark green `#0d3d26`, `t=0.5` → neutral `#404943`, `t=1` → dark red `#b71c1c`. Used in both the info panel number and the cursor tooltip number so the displayed correlation value is colored to match its cell's green/neutral/red direction, rather than being hardcoded red for all positive values (which is every pair in this dataset).
- **Cell click → Portfolio Builder (June 2026):** Clicking any off-diagonal cell navigates to `/builder?mix=a:50,b:50` — opens both portfolios pre-loaded in the Builder at equal 50/50 weights. Rationale: a user looking at the correlation matrix is trying to find combinations that improve risk-adjusted returns, not just compare stats side by side. Previously navigated to `/compare?slugs=a,b`; that destination is still accessible from the info panel on individual portfolio detail pages. Info panel hover button changed from "Compare these two →" to "Build blend →".
- **Sort columns by row label click (June 2026):** `sortBySlug` (null) and `sortAsc` (true) state. Clicking a row label sets it as the sort key and sorts `colIndices` ascending (lowest correlation first = most diversifying). Clicking the same label again flips `sortAsc` to false (descending = most similar first). Clicking a third time resets `sortBySlug` to null. The active sort row label is rendered bold green with a `arrow_upward`/`arrow_downward` Material Symbol (12px) to the right of the name text, inside a flex div that preserves text truncation. Row labels use `hover:bg-surface-container-low` and `cursor: pointer`. The sort is applied inside the `{ rowPortfolios, colPortfolios, matrix }` useMemo after filtering, using `[...colIndices].sort()` with a null-safe comparator (`nullFallback = sortAsc ? Infinity : -Infinity`). `sortBySlug` and `sortAsc` added to useMemo deps.

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
- [ ] **Bump the `getPortfolioNames()` cache key in `lib/db.js`** (e.g. `'portfolio-names-v2'` → `'-v3'`) — a redeploy alone does NOT refresh this list (see `lib/db.js` comment above `getPortfolioNames`). Skipping this means the new portfolio stays invisible in Navbar search, Builder, Financial Independence Calculator, Lump Sum vs. DCA, and the Compare/Monte Carlo pickers even though it's live everywhere else.

### Phase 5 — Optional

- [ ] **Signal set** — set kofi_link if portfolio should have trade signals (requires redeploy)
- [ ] **Blog** — add to content-calendar.md if it warrants a comparison post

**Easy things to miss:** forgetting REFRESH MATERIALIZED VIEW · inserting allocations before portfolios exists · forgetting Vercel redeploy · forgetting the `getPortfolioNames()` cache key bump (new portfolio silently missing from Builder/FI Calculator/Navbar search) · for tactical: forgetting new tickers in ALL_TICKERS before Stage 0 runs

---

## Monthly Data Update Workflow

**Buy and Hold portfolios** are updated automatically via the returns automation pipeline (see below). No manual inserts needed.

**Tactical portfolios** are fully automated via the Stage 0 → Stage 1 → Stage 2 pipeline (see Tactical Portfolio Automation section below). No manual inserts needed.

**After promoting a month, two manual steps are required for the new stats to reach the site** (both easy to forget):
1. **Refresh the matview** — `portfolio_stats` is a *materialized* view (see `scripts/portfolio_stats_view.sql`), so it does NOT recalculate on insert. Run `REFRESH MATERIALIZED VIEW portfolio_stats;` in the Supabase SQL Editor.
2. **Redeploy Vercel** — the homepage, `/database`, screener, strategies, and portfolio detail pages are SSG (no `revalidate`), so they serve build-time HTML until a redeploy rebuilds them from the refreshed matview. (Blog posts, `/account`, `/builder`, `/compare`, and the `/tools/*` calculators read live and don't need this.)

> **Known gap (CR-7, open):** these two steps are currently manual and undocumented in the GitHub Actions flow. A future improvement is to automate them as the final steps of the Stage 2 workflow (matview refresh via a Supabase RPC + a Vercel Deploy Hook). Until then, do both by hand after every Stage 2 promotion.

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
5. Refresh the materialized view: `REFRESH MATERIALIZED VIEW portfolio_stats;` in the Supabase SQL Editor (the matview does NOT auto-update on insert)
6. Redeploy Vercel so the SSG pages rebuild from the refreshed stats (see the two-manual-steps note under Monthly Data Update Workflow above)

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
- `paul-merriman-4-fund-portfolio-united-states` — 25% SPY / 25% IWD / 25% IWM / 25% IWN. Backfilled Apr 1993 – May 2026 via `backfill_paul_merriman_4fund_us.py`. Proxy chain: VFINX→SPY (Feb 1993), VWNDX→IWD (Jun 2000), NAESX→IWM (Jun 2000), DFSVX→IWN (Aug 2000). DFSVX (Apr 1993) is the data floor. First confirmed use of VWNDX and NAESX proxies. Stage 1 handles going forward.
- `ben-felix-model-portfolio-timing` — Tactical version of `ben-felix-model-portfolio`: same SPY/VTI/EFA/IWN/EEM/AVDV weights (30/30/16/10/8/6), 10-month SMA timing overlay per sleeve (below SMA → BIL). Backfilled Jan 1996 – May 2026 (365 months) by parsing the "Model Trades" table from a Portfolio Visualizer Moving Average Model backtest PDF — monthly returns taken directly from the report rather than recomputed. `allocations` table holds the time-weighted average allocation across the backtest (incl. ~26.7% average Cash/BIL), not the static target weights. Signal function `gtaa.ben_felix_timing()` registered in `SIGNAL_REGISTRY`. Added to the Signals set (`kofi_link` set, 30 signal portfolios total). All-in-one setup script: `scripts/add-ben-felix-timing-portfolio.sql`.

**Backtest proxy chains (expanded June 2026):**
Full reference: `scripts/auto-returns/PROXY_CHAINS.md` (authoritative — includes notes, data floors, implementation pointers, and open problems).
Summary also in `reference_backtest_proxy_chains.md` in Claude memory.

Status legend: CONFIRMED = used in an existing script. APPROVED = approved by Nick, verify EODHD on first use.

| Live ETF | Proxy | Transition | Status | Data Floor |
|---|---|---|---|---|
| SPY | VFINX | Feb 1993 | CONFIRMED | Dec 1991 |
| VTI | VTSMX | Jun 2001 | CONFIRMED | Jun 2001 |
| IWN | DFSVX | Aug 2000 | CONFIRMED | Aug 2000 |
| EFA | PRITX | Sep 2001 | CONFIRMED | Sep 2001 |
| EEM | FEMKX | May 2003 | CONFIRMED | May 2003 |
| AVDV | DISVX → DLS → AVDV | Oct 2019 / Jul 2006 | CONFIRMED | **Jul 1995** |
| VNQ | VGSIX | Oct 2004 | CONFIRMED | May 1996 |
| BND | VBMFX | Apr 2007 | CONFIRMED | Jun 1986 |
| BIL | SHY (Jul 2002) → constant 0.35%/mo | May 2007 | CONFIRMED | any |
| GLD | XAUUSD.FOREX (EODHD forex feed) | Dec 2004 | APPROVED | Dec 1979 |
| QQQ | NDX.INDX (EODHD index feed) | Apr 1999 | APPROVED | Oct 1985 |
| IWD | VWNDX (Vanguard Windsor) | Jun 2000 | CONFIRMED | Jan 1980 |
| IWM | NAESX (Vanguard Small Cap Index) | Jun 2000 | CONFIRMED | Jul 1980 |
| IWF | VWUSX (Vanguard US Growth) | Jun 2000 | APPROVED | Nov 1985 |
| IWO | VEXPX (Vanguard Explorer) | Aug 2000 | APPROVED | Jun 1986 |
| AGG | VBMFX (same as BND) | Oct 2003 | APPROVED | Jun 1986 |
| IEF | VFITX (Vanguard Intermediate-Term Treasury) | Aug 2002 | APPROVED | Oct 1991 |
| TLT | VUSTX (Vanguard Long-Term Treasury) | Aug 2002 | APPROVED | May 1986 |
| HYG | VWEHX (Vanguard High-Yield Corporate) | May 2007 | APPROVED | Dec 1978 |
| LQD | VWESX (Vanguard Long-Term Investment Grade) | Aug 2002 | APPROVED | Jul 1973 |
| VGK | VEURX (Vanguard European Stock Index) | Apr 2005 | APPROVED | Jun 1990 |
| VT | MSCI ACWI Index daily data | Jul 2008 | CONFIRMED | Jan 1999 |

**Key notes:**
- AVDV/DISVX at Jul 1995 is the shortest floor among resolved proxies — binding constraint for any portfolio with international small-cap value
- GLD/XAUUSD.FOREX and QQQ/NDX.INDX use non-.US exchange suffixes — fetch with a raw URL, not `fetch_ticker_prices()` which appends .US
- LQD/VWESX: VWESX is longer-duration than LQD; returns diverge in rate-change environments
- USERX (gold miners fund) is NOT a suitable GLD proxy — tracks mining stocks, not bullion
- DBC has no proxy — floor-only at Mar 2006
- `backfill_ben_felix_model_portfolio.py` is the reference implementation for multi-proxy backfills

**Key decisions:**
- Stage 1 calculates tactical returns separately in Step 5b using `tactical_monthly_holdings` (run Stage 0 first). Stage 2 promotes all pending rows regardless of category — tactical and B&H together.
- JKI ticker was delisted — updated to IMCV in allocations table (May 2026)
- GitHub Actions: `.github/workflows/returns-stage1.yml` (cron 3rd of month 10am UTC + manual dispatch) and `.github/workflows/returns-stage2.yml` (manual only). 6 secrets in GitHub repo settings: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EODHD_API_KEY`, `NOTIFY_EMAIL`, `SMTP_USER`, `SMTP_PASSWORD`
- Stage 2 detects `GITHUB_ACTIONS=true` env var and auto-aborts on flagged rows instead of prompting

---

## Tactical Portfolio Automation (In Progress — May 2026)

31 tactical portfolios require a separate automation pipeline because their allocations change monthly based on momentum/trend signals. 11 portfolios (Dual Momentum + GTAA families) are fully automated as of May 2026.

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
- **RLS (CR-1, July 2026): this table is the paid Signals product — RLS is enabled with NO read policies, so anon/authenticated clients get nothing.** Only the service-role key can read it: site code goes through `lib/supabaseAdmin.js` (after verifying Signals entitlement), and the Python Stage 0/1 scripts already use the service key. Never add a public SELECT policy back, and never query this table with the anon client.

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
- `tactical/gtaa.py` — Ivy Timing, Ivy Rotation, GTAA 5, GTAA 13, GTAA AGG 3, GTAA AGG 6, Ben Felix Model Portfolio - Timing; shared helpers `_above_sma()`, `_composite_score()`, `_sma_timing()`, `_momentum_rotation()`
- `tactical/rules_based.py` — Tactical Permanent, Three-Way Model, Paired Switching, Quint Switching Filtered, Trend Following Bonds, Stoken's ACA, Trend is Our Friend Global; shared helpers `_calc_sma()`, `_above_sma()`, `_channel_extreme()`, `_above_200dma()`, `_daily_returns_n()`, `_portfolio_annualized_vol()`
- `tactical/muscular_portfolios.py` — Mama Bear (top-3 of 9 by 5M momentum), Papa Bear (top-3 of 14 by avg 3/6/12M momentum)
- `tactical/alpha_architect.py` — RAA Aggressive, RAA Balanced; dual-signal (TMOM + 10M MA) graduated allocation (100%/50%/0%) per asset
- `tactical/keller.py` — PAA, VAA G4, VAA G12, DAA, GPM, KDA, AAA; shared helpers for 13612W momentum, SMA momentum, Easy Trading formula, min-variance optimization (scipy). requires numpy + scipy in requirements.txt.
- `tactical/adaptive_momentum.py` — Adaptive Momentum family. `volatility_weighted_global_momentum()` (Volatility-Weighted Global Momentum Portfolio): 8-asset global universe (SPY, QQQ, EFA, EEM, XLE, GLD, TLT, IEF); selects the top 3 by **weighted average of rank orders** (each of the 1/3/6/12-month windows ranks the universe by return, ranks combined 20/40/30/10%, lowest wins) — matches Portfolio Visualizer's Adaptive Allocation Model. No cash/SMA filter (always holds top 3; defensive assets enter on their own momentum). Weights the 3 by inverse volatility over the trailing 4 calendar months of daily returns. Shared helpers `_weighted_rank_selection()` (selection) and `_inverse_vol_weights()` (weighting) are split so planned siblings that differ only in weighting (equal-weight, min-variance, ...) can reuse the selection. Validated against the PV report to within 0.1pp on the 3 most recent months. Added July 2026.

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
| Adaptive Momentum (rank-based top-3) | Volatility-Weighted Global Momentum | Complete (July 2026) |
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

## Signal Email Automation (June 2026)

`scripts/auto-returns/stage0_email.py` generates and sends the monthly Signals trading email. It runs in two stages, both manual `workflow_dispatch` GitHub Actions — no terminal needed.

**Stage 0 — Signals + Email Preview** (`.github/workflows/returns-stage0.yml`): trigger with `month` set (e.g. `2026-06`, required). Runs `stage0_signals.py` to calculate and store that month's tactical holdings, then runs `stage0_email.py --month 2026-06` (draft mode), which generates the email, saves it as a draft (`signal_emails.html_body`), and sends a preview to `NOTIFY_EMAIL`.

**Review** the preview email.

**Stage 0.5 — Send** (`.github/workflows/signal-email-send.yml`): trigger with the same `month`. Runs `stage0_email.py --month 2026-06 --send`, which loads the saved draft (unchanged) and delivers it to every active Signals subscriber, logging `sent_at` + `recipient_count`.

Stage 0.5's `force` checkbox resends a month already sent. To regenerate a draft (e.g. fix a mistake before sending), re-run `stage0_email.py --month YYYY-MM --force` locally — Stage 0 doesn't expose this since it always runs immediately after fresh signals.

Equivalent local commands:
```bash
python3 stage0_email.py --month 2026-06            # draft + preview
python3 stage0_email.py --month 2026-06 --send     # send saved draft to subscribers
python3 stage0_email.py --month 2026-06 --force    # regenerate draft / resend
```

**What it does (draft run):**
1. Fetches `tactical_monthly_holdings` for the target month and the prior month for every portfolio where `kofi_link IS NOT NULL`
2. Diffs each portfolio's holdings (entered/exited/changed tickers). **If a portfolio has no prior-month row at all** (newly added to tracking, e.g. `ben-felix-model-portfolio-timing` or `the-trend-is-our-friend-global` in their first tracked month), it's treated as "no change" rather than a fabricated rotation — there's nothing to diff against.
3. Sends all rebalanced portfolios' diff data (tickers + percentages only, no external data) to `claude-haiku-4-5` in one call, asking for: (a) a 2-4 sentence "market context" paragraph identifying the overall theme(s) across this month's changes, and (b) a one-line summary per rebalanced portfolio. Claude is instructed to use only the data provided — it does not invent news or causes.
4. Builds a branded HTML email (table-based layout for email client compatibility): green header bar, market context paragraph, **"Rebalanced this month"** section (each portfolio's one-line summary + full `TICKER — XX%` holdings), compact **"No change this month"** section (portfolio names only — no need to repeat unchanged holdings), footer with manage-subscription + support links.
5. Saves the HTML as a draft in `signal_emails` (`sent_at = NULL`) and sends a preview to `NOTIFY_EMAIL` via Resend.

**What it does (send run, `--send`):**
6. Loads the saved draft HTML, sends it individually to every email in `user_subscriptions` where `plan = 'signals' AND status = 'active'`, then updates the `signal_emails` row with `sent_at` and `recipient_count`. Idempotent — re-running a month already sent without `--force` exits early.

**Sender:** `PortfolioDB <support@portfoliodb.com>` via Resend (`RESEND_API_KEY`, already in `.env.local` and verified domain — see Email Infrastructure below). Individual sends (not BCC) since recipient count is well under Resend's free-tier limits (<100 members as of June 2026).

**Table: signal_emails**

| Column           | Type        | Notes                                  |
|------------------|-------------|------------------------------------------|
| id               | uuid        | Auto-generated                         |
| month            | date        | First of month, unique — upsert conflict key |
| market_context   | text        | The Claude-generated paragraph for that month |
| html_body        | text        | Full generated email HTML — saved as a draft on the first run, sent as-is on `--send` |
| sent_at          | timestamptz | NULL until the send run completes      |
| recipient_count  | integer     | How many subscribers were successfully sent to |
| created_at       | timestamptz | Auto-generated                         |

**GitHub Actions secrets required** (in addition to the existing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` used by Stage 0–2): `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `NOTIFY_EMAIL`.

**Membership page:** "Brief market context" is back in the "What the Signals plan delivers each month" list in `app/membership/page.js`, and the "What a signal looks like" mock includes a sample market-context paragraph above the portfolio holdings.

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

## Membership Page Notes (updated June 2026)
- "Brief market context" restored to 'What you get each month' list (Fix #11, June 2026)
- Mock email card in "What a signal looks like" section mirrors the real `stage0_email.py` HTML structure: green "PORTFOLIODB SIGNALS" header bar, market context paragraph, "Rebalanced this month (N)" section (portfolio name + italic one-line summary + `TICKER — XX%` text lines, not pill badges), "No change this month (N)" section (portfolio names only)
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

**Effective tier computation (CR-2, July 2026 — `lib/entitlements.js`):** all tier/entitlement checks go through the shared helpers: `getEntitledSubscription(client, userId)` returns the user's best row where `status IN ('active','cancelled') AND current_period_end > now` (preferring Signals rows when a user has multiple), and `tierFromSubscription(sub)` returns `'signals'` for an entitled Signals row, else `'builder'`. Logged-in users always get at least `'builder'`; `tier` is `null` only for logged-out visitors. The paid-through rule means a member who cancels (autorenew off → status `'cancelled'`) keeps Signals access until `current_period_end`, and an `'expired'` row (set by `subscription.deactivated`/`.deleted` webhooks at period end) grants nothing. Used by `app/builder/page.js`, `app/account/page.js`, `app/api/builder-save`, `app/api/current-holdings`, `app/api/builder-holdings`; `stage0_email.py` mirrors the same rule for the subscriber send list. Do NOT hand-roll `status = 'active'` queries — that was the CR-2 bug (instant access loss on cancel + eternal access after expiry).

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

**Protecting routes:** `proxy.js` (Next.js 16, replaces deprecated `middleware.js`) runs only on the routes in its narrowed `config.matcher` (CR-8, July 2026 — see the proxy.js section above for the list and the getSession() dependency rule). It creates a server Supabase client, calls `supabase.auth.getUser()`, and redirects unauthenticated users away from `PROTECTED_ROUTES = ['/account']`. The route check uses `pathname === route || pathname.startsWith(route + '/')` to avoid false matches (e.g. `/account-settings` would not have been caught by a bare `startsWith('/account')`).

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
- Homepage has one membership touchpoint: the Premium section (last section, below AI Recommend), with headline "Monthly Signals for {signalCount} Portfolios" (live count) and 4 specific bullets. The compact callout banner was removed May 2026. Homepage section order (June 2026): Hero → Top Strategies → Tools Strip → Email Capture → AI Recommend → Premium.

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
- The legacy JS flag (14 KiB) in PageSpeed is from Recharts and cannot be reduced without replacing that library.
- **`/account` page load (June 2026):** Nick reported the Account page taking "more than a couple seconds" to load. Root cause: as a `force-dynamic` (uncached) page, every visit chained ~6 sequential Supabase round trips — `proxy.js` middleware's `auth.getUser()`, a redundant page-level `auth.getUser()`, then `getCurrentSignals()`'s 3 sequential queries, then a conditional `getAllAllocations()` afterward. Fixed by switching the page to `getSession()` (see app/account/page.js notes above), parallelizing `getCurrentSignals()`'s first two queries, and always running `getAllAllocations()` inside the main `Promise.all`. Brings the chain down to ~2 sequential round trips. Confirmed improvement, though still "a tad slower" than desired — remaining latency is likely `force-dynamic` SSR + possible Vercel cold starts, not further query-level wins. Caching `getCurrentSignals()` was considered but rejected for now — see Backlog "Current Signals page" entry for the staleness tradeoff.
- **FOUC fix (June 2026):** Fix #13's media="print" + `MaterialSymbolsActivator.jsx` trick (which made the Material Symbols stylesheet non-blocking) was reverted after a site-wide audit found it traded the ~150ms FCP penalty for a visible flash — icon spans rendered as raw text (e.g. "search", "account_circle" in the navbar) until JS hydrated and the font downloaded. The Material Symbols `<link rel="stylesheet">` in `app/layout.tsx` is now a plain blocking link again, and `MaterialSymbolsActivator.jsx` was deleted. Since the font is constrained to single-axis values (~50KB), the render-blocking cost is small. A self-hosted subsetted woff2 via `next/font/local` was considered but ruled out as overkill (large/ambiguous icon inventory, ligature-based subsetting complexity, no fonttools toolchain, ongoing maintenance burden).
- **Recharts lazy-loading (June 2026, Performance Audit Fix 1.1):** All 7 components importing from `recharts` are code-split via `next/dynamic`. `GrowthChart`, `DrawdownChart`, `RollingReturnChart`, and `CompareGrowthChart` use `next/dynamic(..., { ssr: false, loading: () => <ChartSkeleton/> })` wherever imported (ChartsSection.jsx, BuilderClient.jsx, CompareClient.jsx). `MonteCarloClient` and `PortfolioMapClient` (whole-page client components with their own `<h1>`/SEO content) use plain `next/dynamic()` without `ssr: false` in their `page.js` files, so SSR is preserved while Recharts itself loads as a separate chunk. Goal: chip away at the ~80–85 PageSpeed ceiling noted above by deferring Recharts off the initial bundle for pages/sections that don't need it on first paint.
- **Nav/footer prefetch disabled to curb ISR Reads + Fast Origin Transfer (July 2026):** Vercel Usage showed ISR Reads over quota (1.4M/1M) and Fast Origin Transfer over quota (12.4GB/10GB) on the Hobby plan. Root cause diagnosed via Vercel Observability → ISR/Fast Data Transfer: the top consumers were Next.js App Router RSC prefetch requests (the `*.segments/*` paths in the dashboard). These requests carry `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch` — and because `Next-Router-State-Tree` encodes the *originating* route, Cloudflare (spec-correctly) treats every value as a distinct cache entry, fragmenting the cache into near-infinite variants that each MISS/EXPIRE straight through to Vercel (confirmed via `curl -H "RSC: 1" -H "Next-Router-Prefetch: 1"` → `cf-cache-status: EXPIRED`). The site's Cloudflare Cache Rule can't collapse these — Custom Cache Key (ignore-headers) is a Business/Enterprise-plan feature, unavailable on Free. Fix: added `prefetch={false}` to the high-volume/low-UX-value chrome links so Next stops firing these background RSC fetches on every pageview — `Navbar.jsx` (logo, Database, Screener, Strategies, Membership, Account, + 3 mobile-row links), `ToolsMenu.jsx` (all 9 tool routes — prefetched the instant the dropdown mounts), `MobileMoreMenu.jsx` (all 11 routes), `Footer.jsx` (all 9 links — renders on every page). Deliberately NOT applied to in-content links (portfolio cards on `/database`, Related Portfolios, etc.) where instant navigation genuinely helps a browsing user. Tradeoff: nav clicks now fetch at click-time (still edge-cache-fast, ~100–300ms) instead of feeling instant — acceptable for a content/data site. **Verify by watching ISR Reads + Fast Origin Transfer in Vercel over several days post-deploy.** Separate suspected driver not addressed here: `/login` and `/portfolios/permanent-portfolio` showed anomalously high request counts (possible non-geo bot traffic outside the Singapore/China/HK WAF rule) — check Cloudflare Security Events if the numbers don't drop enough.

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
`permanent-portfolio`, `golden-butterfly-portfolio`, `ray-dalios-all-weather-portfolio`, `united-states-60-40-portfolio`, `coffeehouse-portfolio`, `andrew-tobias-portfolio`, `gone-fishin-portfolio`, `bogleheads-three-fund-portfolio`, `bogleheads-four-fund-portfolio`, `ivy-portfolio-faber`, `global-tactical-asset-allocation-13-gtaa-13-meb-faber`, `global-tactical-asset-allocation-5-gtaa-5-meb-faber`, `global-tactical-asset-allocation-agg-3-meb-faber`, `global-tactical-asset-allocation-agg-6-meb-faber`, `generalized-protective-momentum`, `desert-portfolio`, `vigilant-asset-allocation-g12`, `vigilant-asset-allocation-g4-aggressive`, `mama-bear-portfolio`, `papa-bear-portfolio`, `the-larry-portfolio-swedroe`, `lazy-portfolio-by-david-swensen`, `cowards-portfolio-bill-bernstein`, `no-brainer-portfolio-bill-bernstein`, `core-four-portfolio-by-rick-ferri`, `pinwheel-portfolio`, `sandwich-portfolio`, `rob-arnott-portfolio`, `tactical-permanent-portfolio`, `7twelve-portfolio`, `ultimate-buy-and-hold-portfolio-7-paul-merriman`, `ultimate-buy-and-hold-portfolio-8-paul-merriman`, `conservative-income-portfolio-schwab`, `conservative-income-tax-aware-portfolio-schwab`, `kipnis-defensive-adaptive-asset-allocation-kda`, `diversified-gem-dual-momentum`, `gem-dual-momentum`, `gem-emerging-markets-dual-momentum`, `composite-dual-momentum`, `accelerating-dual-momentum`, `adaptive-asset-allocation`, `protective-asset-allocation`, `defensive-asset-allocation`, `quint-switching-filtered`, `stokens-active-combined-asset`, `three-way-model-by-ned-davis`, `paired-switching-lewis-glenn`, `robust-asset-allocation-aggressive`, `robust-asset-allocation-balanced`, `robust-portfolio-alpha-architect`, `ben-felix-model-portfolio`, `jl-collins-wealth-preservation-portfolio`, `paul-merriman-4-fund-portfolio-united-states`, `ben-felix-model-portfolio-timing`, `volatility-weighted-global-momentum-portfolio`

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

### Description drift incident (June 2026)

A batch description update introduced regressions in 10 portfolios: 3 had an entirely wrong strategy description (`mama-bear-portfolio`, `papa-bear-portfolio`, `diversified-gem-dual-momentum`), 4 had duplicated "Copy-ready for Supabase" boilerplate text appended (`conservative-income-portfolio-schwab`, `the-trend-is-our-friend-global`, `trend-following-bonds-by-paul-novell`, `vigilant-asset-allocation-g4-aggressive`), and 3 had minor unintended diffs from the live version (`sandwich-portfolio`, `stokens-active-combined-asset`, `vigilant-asset-allocation-g12`). All 10 were restored from a backup of the `portfolio_stats` view taken before the regression, saved at `description-drafts/_view-backup-2026-06-15/`. Both `portfolios.description` (Supabase) and the corresponding `description-drafts/*.md` files were overwritten with the restored content. **`REFRESH MATERIALIZED VIEW portfolio_stats;` + a Vercel redeploy are still needed** for the restored descriptions to appear on the live SSG pages.

**Exception -- `bogleheads-four-fund-portfolio`:** deliberately NOT restored from the backup. The backup's version described the fourth fund as a dedicated REIT sleeve, but the actual `allocations` table for this portfolio holds VTI/EFA/AGG/TIP -- the fourth fund is TIPS, not REITs. The REIT-based description was factually wrong about the underlying holdings, independent of the June 2026 regression. The current `portfolios.description` correctly describes the fourth fund as TIPS-based inflation protection. If this portfolio's description needs future edits, do not pull from `description-drafts/_view-backup-2026-06-15/` -- that copy has the incorrect REIT version.

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
