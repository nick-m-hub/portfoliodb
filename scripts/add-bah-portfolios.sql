-- Add US Stock Market and Global Stock Market Buy and Hold portfolios
-- Run in Supabase SQL editor BEFORE running the backfill scripts.
-- Order matters: portfolios → allocations → monthly_returns (handled by backfill scripts)

-- ============================================================
-- 1. Portfolios
-- ============================================================

INSERT INTO portfolios (slug, name, category, trade_frequency, min_timeline_years, risk_level, description)
VALUES
  (
    'us-stock-market',
    'US Stock Market',
    'Buy and Hold',
    'Never',
    10,
    5,
    'A single-fund portfolio holding the entire US stock market. Uses VTI (Vanguard Total Stock Market ETF), with VFINX (Vanguard 500 Index Fund) as a historical proxy back to 1976. This is the simplest expression of US equity exposure — no bonds, no alternatives, maximum long-run growth potential with full market volatility.'
  ),
  (
    'global-stock-market',
    'Global Stock Market',
    'Buy and Hold',
    'Never',
    10,
    5,
    'A single-fund portfolio holding the entire global stock market across developed and emerging markets. Uses VT (Vanguard Total World Stock ETF), with the MSCI ACWI Index as a historical proxy back to 1999. Provides broad international diversification in one fund.'
  );

-- ============================================================
-- 2. New asset class
-- ============================================================

INSERT INTO asset_classes (asset_class, default_color, description)
VALUES (
  'Global Stocks',
  '#2E75B6',
  'Equity exposure across developed and emerging markets worldwide, including the US.'
);

-- ============================================================
-- 3. Allocations (drives Stage 1 automation going forward)
-- ============================================================

INSERT INTO allocations (portfolio_slug, asset_class, ticker, percentage, color)
VALUES
  ('us-stock-market',     'US Total Stock Market', 'VTI', 100, '#185FA5'),
  ('global-stock-market', 'Global Stocks',         'VT',  100, '#2E75B6');

-- ============================================================
-- 3. Portfolio strategies (optional — add tags as appropriate)
-- ============================================================
-- INSERT INTO portfolio_strategies (portfolio_slug, strategy_slug) VALUES
--   ('us-stock-market',     'simple'),
--   ('global-stock-market', 'simple'),
--   ('global-stock-market', 'global');
