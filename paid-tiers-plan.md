# PortfolioDB — Paid Tiers & Portfolio Mixer Plan

## Product Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | Full database, screener, comparison tool, Monte Carlo simulator, unlimited session-based portfolio mixing (no saves) |
| Mixer | $9/mo | Everything above + 3 permanently saved custom mixes + professional PDF export of any saved mix |
| Signals | $19/mo | Everything above + unlimited saved mixes + monthly trade signals |

---

## Monte Carlo Simulator (Free)

- Public page, no auth required
- Pre-loaded with all 70 portfolios — this is the differentiator vs. Portfolio Visualizer
- Primary purpose: top-of-funnel SEO and email capture
- Leads people to discover portfolios naturally before they've paid anything

---

## Portfolio Mixer ($9/mo)

### What it does
- Users select 2+ portfolios from the database and assign weights (must sum to 100%)
- App computes a blended backtest using weighted monthly returns
- Results display in the same stat format as existing portfolio pages (CAGR, Sharpe, Max Drawdown, etc.)

### Save limits by tier
- **Free:** Unlimited session-based mixing, 0 permanent saves — full tool experience, just nothing persists
- **$9/mo:** Unlimited session-based mixing, 3 permanently saved mixes, PDF export of any saved mix
- **$19/mo signals:** Unlimited permanently saved mixes, PDF export
- Rationale: free users experience the full value of the tool before being asked to pay anything; the "I want to keep this" moment is a natural, unforced upgrade trigger that converts better than a paywalled tool

### PDF export contents
Each exported PDF includes:
- Custom mix name and portfolio weights (e.g. 60% Golden Butterfly / 40% GEM Dual Momentum)
- Full stat table: CAGR, Sharpe, Max Drawdown, Worst Year, Best Year, Sortino, etc.
- Growth of $10K chart
- Drawdown chart
- Rolling returns
- Date range covered by the backtest
- PortfolioDB branding — looks like a professional financial document, not a browser print

Note: browser printing cannot be technically prevented, but the PDF export's value is in its clean branded presentation, not the raw data. Free users who screenshot instead were never going to pay $9 anyway.

### Core calculation logic (for when development starts)
- For each calendar month, compute the weighted average of each selected portfolio's `monthly_return`
- Example: 60% Golden Butterfly + 40% GEM = `(0.6 * gbf_return) + (0.4 * gem_return)` for each month
- Run the resulting blended return series through the same compounding math as `portfolio_stats`
- Only months where ALL selected portfolios have return data can be included (use the latest common start date)
- Asset class mixing is NOT in scope — portfolio-level mixing only

### Database additions needed
```sql
-- Stores saved custom mixes for paying users
user_portfolios (
  id uuid,
  user_id uuid, -- references Supabase Auth user
  name text, -- user-defined name for the mix
  mix jsonb, -- array of { portfolio_slug, weight } objects
  created_at timestamptz
)
```

### Save limit enforcement
- On save action, check count of existing rows for `user_id`
- $9 tier: allow save only if count < 3
- $19 tier: no limit
- This is a single validation check — changing limits requires only one line of code

---

## Build Order

The key principle: build everything that has no platform dependency first, then migrate to Memberful at the exact moment the save feature is ready to deploy. This avoids disrupting existing Ko-fi subscribers prematurely and creates a clean, simultaneous launch moment.

### Phase 1 — No platform dependencies (build now)

#### 1. Monte Carlo Page
- New page: `app/monte-carlo/page.js`
- No auth required, fully public
- Pre-populated portfolio selector using existing portfolio data
- Standard Monte Carlo inputs: time horizon, initial investment, withdrawal rate
- Add to sitemap and free nav
- Completely independent — can be built and deployed at any time

#### 2. Portfolio Mixer (session-only)
- New page: `app/mixer/page.js`
- Portfolio selector + weight inputs (validate sum = 100%)
- Blended stats display reusing existing stat components
- No database changes needed — purely computational
- Save button present but shows "create an account to save" prompt — sets expectation without requiring infrastructure
- Deploy freely once built — Ko-fi and existing subscribers are completely unaffected

### Phase 2 — Platform migration (when mixer is built and ready)

Migrate at the exact moment the save feature is ready to go live. The gap between "mixer is done" and "Memberful is live" should be days, not weeks.

#### 3. Migrate to Memberful
- Replace Ko-fi as the payment and subscription platform
- Memberful supports proper webhook events (subscribe, upgrade, cancel)
- Note: 4.9% transaction fee on top of Stripe fees — acceptable at current scale
- Migrate existing Ko-fi signal subscribers to Memberful before flipping anything live

#### 4. Supabase Auth
- Use Supabase Auth (already on Supabase — natural fit)
- Support email login + Google OAuth
- Session management via Next.js middleware
- Memberful authenticates via OAuth — middleware checks:
  1. Is this person logged in? (Supabase Auth)
  2. What tier are they on? (Memberful subscription status)

#### 5. Memberful Webhook Handler
- New API route: `app/api/memberful/route.js`
- Listens for subscribe, upgrade, cancel events
- Maintains a `user_subscriptions` table in Supabase:
```sql
user_subscriptions (
  user_id uuid, -- references Supabase Auth user
  memberful_id text,
  tier text, -- 'mixer' or 'signals'
  status text, -- 'active', 'cancelled'
  updated_at timestamptz
)
```

#### 6. Wire up save functionality
- Add `user_portfolios` table to Supabase
- Connect save button to auth + tier check
- Deploy everything together as a single coordinated launch

### Launch moment
"PortfolioDB now has accounts, a portfolio mixer, and two membership tiers" — announce to email list and existing Ko-fi subscribers simultaneously.

---

## Upgrade Motivation Flow

```
Free user runs Monte Carlo on Golden Butterfly
  → discovers the tactical overlay question
  → tries the mixer freely (session-based, no login needed)
  → builds a mix they love, hits save → prompted to sign up for $9
  → pays $9, saves up to 3 mixes, exports professional PDFs
  → hits 3-save limit → prompted to upgrade to $19 signals
  → now a signals subscriber
```

---

## Open Questions (decide before building)

- Which portfolios are eligible for mixing? All 70, or only the ones they can "understand" without signals context?
- Should the mixer show tactical portfolios with a disclaimer that their historical returns assume perfect signal execution?
- What do we call the $9 tier publicly? ("Mixer", "Builder", "Pro"?)
- Early access / beta pricing for existing Ko-fi subscribers during migration?
