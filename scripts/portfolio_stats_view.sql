-- portfolio_stats materialized view
-- Source of truth for the view definition. To add a column:
--   1. Add the CTE (if needed) and the SELECT line here
--   2. Copy the full file into the Supabase SQL Editor and run it

DROP MATERIALIZED VIEW IF EXISTS portfolio_stats;

CREATE MATERIALIZED VIEW portfolio_stats AS
WITH running_values AS (
  SELECT
    monthly_returns.portfolio_slug,
    monthly_returns.date,
    monthly_returns.monthly_return,
    (exp(sum(ln(((1)::numeric + (monthly_returns.monthly_return / (100)::numeric))))
      OVER (PARTITION BY monthly_returns.portfolio_slug ORDER BY monthly_returns.date))
      * (10000)::numeric) AS running_value
  FROM monthly_returns

), current_value AS (
  SELECT DISTINCT ON (running_values.portfolio_slug)
    running_values.portfolio_slug,
    running_values.running_value AS current_value
  FROM running_values
  ORDER BY running_values.portfolio_slug, running_values.date DESC

), running_peak AS (
  SELECT
    running_values.portfolio_slug,
    running_values.date,
    running_values.running_value,
    max(running_values.running_value)
      OVER (PARTITION BY running_values.portfolio_slug ORDER BY running_values.date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS peak_value
  FROM running_values

), max_drawdown AS (
  SELECT
    running_peak.portfolio_slug,
    min((((running_peak.running_value - running_peak.peak_value)
      / NULLIF(running_peak.peak_value, (0)::numeric)) * (100)::numeric)) AS max_drawdown
  FROM running_peak
  GROUP BY running_peak.portfolio_slug

), ulcer_index AS (
  SELECT
    running_peak.portfolio_slug,
    sqrt(avg(power(
      LEAST((((running_peak.running_value - running_peak.peak_value)
        / NULLIF(running_peak.peak_value, (0)::numeric)) * (100)::numeric), (0)::numeric),
      (2)::numeric))) AS ulcer_index
  FROM running_peak
  GROUP BY running_peak.portfolio_slug

), calendar_years AS (
  SELECT
    monthly_returns.portfolio_slug,
    EXTRACT(year FROM monthly_returns.date) AS year,
    ((exp(sum(ln(((1)::numeric + (monthly_returns.monthly_return / (100)::numeric)))))
      - (1)::numeric) * (100)::numeric) AS annual_return
  FROM monthly_returns
  GROUP BY monthly_returns.portfolio_slug, (EXTRACT(year FROM monthly_returns.date))

), best_worst AS (
  SELECT
    calendar_years.portfolio_slug,
    max(calendar_years.annual_return) AS best_year,
    min(calendar_years.annual_return) AS worst_year
  FROM calendar_years
  GROUP BY calendar_years.portfolio_slug

), ytd_return AS (
  -- Compounds all monthly returns in the current calendar year.
  -- Returns NULL if no data exists yet for this year.
  SELECT
    monthly_returns.portfolio_slug,
    CASE
      WHEN count(*) FILTER (WHERE EXTRACT(year FROM monthly_returns.date) = EXTRACT(year FROM CURRENT_DATE)) > 0
      THEN ((exp(sum(ln(((1)::numeric + (monthly_returns.monthly_return / (100)::numeric))))
              FILTER (WHERE EXTRACT(year FROM monthly_returns.date) = EXTRACT(year FROM CURRENT_DATE)))
            - (1)::numeric) * (100)::numeric)
      ELSE NULL::numeric
    END AS ytd_return
  FROM monthly_returns
  GROUP BY monthly_returns.portfolio_slug

), drawdown_groups AS (
  SELECT
    portfolio_slug,
    date,
    running_value < peak_value AS is_underwater,
    SUM(CASE WHEN running_value >= peak_value THEN 1 ELSE 0 END)
      OVER (PARTITION BY portfolio_slug ORDER BY date) AS grp
  FROM running_peak

), longest_drawdown AS (
  SELECT
    t.portfolio_slug,
    COALESCE(MAX(t.streak), 0) AS longest_drawdown_months
  FROM (
    SELECT portfolio_slug, grp, COUNT(*) AS streak
    FROM drawdown_groups
    WHERE is_underwater
    GROUP BY portfolio_slug, grp
  ) t
  GROUP BY t.portfolio_slug

), core AS (
  SELECT
    monthly_returns.portfolio_slug,
    count(*) AS total_months,
    max(monthly_returns.date) AS last_updated,
    ((power(exp(sum(ln(((1)::numeric + (monthly_returns.monthly_return / (100)::numeric))))),
      (12.0 / (NULLIF(count(*), 0))::numeric)) - (1)::numeric) * (100)::numeric) AS cagr,
    ((((avg(monthly_returns.monthly_return) - 0.375)
      / NULLIF(stddev(monthly_returns.monthly_return), (0)::numeric)))::double precision
      * sqrt((12)::double precision)) AS sharpe_ratio,
    ((avg(monthly_returns.monthly_return) - 0.375)
      / NULLIF(sqrt((avg(
          CASE
            WHEN (monthly_returns.monthly_return < (0)::numeric)
            THEN (monthly_returns.monthly_return * monthly_returns.monthly_return)
            ELSE (0)::numeric
          END) * (12)::numeric)), (0)::numeric)) AS sortino_ratio,
    (stddev(monthly_returns.monthly_return) * sqrt((12)::numeric)) AS annualized_volatility,
    (COUNT(*) FILTER (WHERE monthly_returns.monthly_return > (0)::numeric) * (100.0)::numeric
      / NULLIF(COUNT(*), 0)) AS pct_profitable_months,
    max(monthly_returns.monthly_return) AS best_month,
    min(monthly_returns.monthly_return) AS worst_month
  FROM monthly_returns
  GROUP BY monthly_returns.portfolio_slug

), last_date AS (
  SELECT monthly_returns.portfolio_slug, max(monthly_returns.date) AS last_date
  FROM monthly_returns
  GROUP BY monthly_returns.portfolio_slug

), cagr_10yr AS (
  SELECT
    mr.portfolio_slug,
    CASE
      WHEN count(*) FILTER (WHERE mr.date >= (ld.last_date - '10 years'::interval)) >= 120
      THEN ((power(
        exp(sum(ln(((1)::numeric + (mr.monthly_return / (100)::numeric))))
          FILTER (WHERE mr.date >= (ld.last_date - '10 years'::interval))),
        (12.0 / (NULLIF(count(*) FILTER (WHERE mr.date >= (ld.last_date - '10 years'::interval)), 0))::numeric))
        - (1)::numeric) * (100)::numeric)
      ELSE NULL::numeric
    END AS cagr_10yr
  FROM monthly_returns mr
  JOIN last_date ld ON ld.portfolio_slug = mr.portfolio_slug
  GROUP BY mr.portfolio_slug, ld.last_date

), cagr_1yr AS (
  SELECT
    mr.portfolio_slug,
    CASE
      WHEN count(*) FILTER (WHERE mr.date >= (ld.last_date - '1 year'::interval)) >= 12
      THEN ((exp(sum(ln(((1)::numeric + (mr.monthly_return / (100)::numeric))))
          FILTER (WHERE mr.date >= (ld.last_date - '1 year'::interval)))
        - (1)::numeric) * (100)::numeric)
      ELSE NULL::numeric
    END AS cagr_1yr
  FROM monthly_returns mr
  JOIN last_date ld ON ld.portfolio_slug = mr.portfolio_slug
  GROUP BY mr.portfolio_slug, ld.last_date

), cagr_3yr AS (
  SELECT
    mr.portfolio_slug,
    CASE
      WHEN count(*) FILTER (WHERE mr.date >= (ld.last_date - '3 years'::interval)) >= 36
      THEN ((power(
        exp(sum(ln(((1)::numeric + (mr.monthly_return / (100)::numeric))))
          FILTER (WHERE mr.date >= (ld.last_date - '3 years'::interval))),
        (12.0 / (NULLIF(count(*) FILTER (WHERE mr.date >= (ld.last_date - '3 years'::interval)), 0))::numeric))
        - (1)::numeric) * (100)::numeric)
      ELSE NULL::numeric
    END AS cagr_3yr
  FROM monthly_returns mr
  JOIN last_date ld ON ld.portfolio_slug = mr.portfolio_slug
  GROUP BY mr.portfolio_slug, ld.last_date

), cagr_gfc AS (
  -- Global Financial Crisis: 2007–2009 (requires ≥24 months of data in window)
  SELECT
    monthly_returns.portfolio_slug,
    CASE
      WHEN count(*) FILTER (WHERE EXTRACT(year FROM monthly_returns.date) BETWEEN 2007 AND 2009) >= 24
      THEN ((power(
        exp(sum(ln(((1)::numeric + (monthly_returns.monthly_return / (100)::numeric))))
          FILTER (WHERE EXTRACT(year FROM monthly_returns.date) BETWEEN 2007 AND 2009)),
        (12.0 / (NULLIF(count(*) FILTER (WHERE EXTRACT(year FROM monthly_returns.date) BETWEEN 2007 AND 2009), 0))::numeric))
        - (1)::numeric) * (100)::numeric)
      ELSE NULL::numeric
    END AS cagr_gfc
  FROM monthly_returns
  GROUP BY monthly_returns.portfolio_slug

), cagr_dotcom AS (
  -- Dot-com crash: 2000–2002 (requires ≥24 months of data in window)
  SELECT
    monthly_returns.portfolio_slug,
    CASE
      WHEN count(*) FILTER (WHERE EXTRACT(year FROM monthly_returns.date) BETWEEN 2000 AND 2002) >= 24
      THEN ((power(
        exp(sum(ln(((1)::numeric + (monthly_returns.monthly_return / (100)::numeric))))
          FILTER (WHERE EXTRACT(year FROM monthly_returns.date) BETWEEN 2000 AND 2002)),
        (12.0 / (NULLIF(count(*) FILTER (WHERE EXTRACT(year FROM monthly_returns.date) BETWEEN 2000 AND 2002), 0))::numeric))
        - (1)::numeric) * (100)::numeric)
      ELSE NULL::numeric
    END AS cagr_dotcom
  FROM monthly_returns
  GROUP BY monthly_returns.portfolio_slug

), ulcer_performance_index AS (
  SELECT
    co_1.portfolio_slug,
    ((co_1.cagr - 4.5) / NULLIF(ui_1.ulcer_index, (0)::numeric)) AS upi
  FROM core co_1
  JOIN ulcer_index ui_1 ON ui_1.portfolio_slug = co_1.portfolio_slug

), numbered AS (
  SELECT
    monthly_returns.portfolio_slug,
    monthly_returns.date,
    monthly_returns.monthly_return,
    row_number() OVER (PARTITION BY monthly_returns.portfolio_slug ORDER BY monthly_returns.date) AS rn
  FROM monthly_returns

), rolling_1yr_stats AS (
  SELECT
    w.portfolio_slug,
    (min((exp(w.sum_ln) - (1)::numeric)) * (100)::numeric) AS rolling_1yr_low,
    (max((exp(w.sum_ln) - (1)::numeric)) * (100)::numeric) AS rolling_1yr_high,
    (avg((exp(w.sum_ln) - (1)::numeric)) * (100)::numeric) AS rolling_1yr_avg
  FROM (
    SELECT a.portfolio_slug, a.rn,
      sum(ln(((1)::numeric + (b.monthly_return / (100)::numeric)))) AS sum_ln
    FROM numbered a
    JOIN numbered b ON b.portfolio_slug = a.portfolio_slug AND b.rn BETWEEN a.rn - 11 AND a.rn
    WHERE a.rn >= 12
    GROUP BY a.portfolio_slug, a.rn
  ) w
  GROUP BY w.portfolio_slug

), rolling_3yr_stats AS (
  SELECT
    w.portfolio_slug,
    (min((power(exp(w.sum_ln), (12.0 / (36)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_3yr_low,
    (max((power(exp(w.sum_ln), (12.0 / (36)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_3yr_high,
    (avg((power(exp(w.sum_ln), (12.0 / (36)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_3yr_avg
  FROM (
    SELECT a.portfolio_slug, a.rn,
      sum(ln(((1)::numeric + (b.monthly_return / (100)::numeric)))) AS sum_ln
    FROM numbered a
    JOIN numbered b ON b.portfolio_slug = a.portfolio_slug AND b.rn BETWEEN a.rn - 35 AND a.rn
    WHERE a.rn >= 36
    GROUP BY a.portfolio_slug, a.rn
  ) w
  GROUP BY w.portfolio_slug

), rolling_5yr_stats AS (
  SELECT
    w.portfolio_slug,
    (min((power(exp(w.sum_ln), (12.0 / (60)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_5yr_low,
    (max((power(exp(w.sum_ln), (12.0 / (60)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_5yr_high,
    (avg((power(exp(w.sum_ln), (12.0 / (60)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_5yr_avg
  FROM (
    SELECT a.portfolio_slug, a.rn,
      sum(ln(((1)::numeric + (b.monthly_return / (100)::numeric)))) AS sum_ln
    FROM numbered a
    JOIN numbered b ON b.portfolio_slug = a.portfolio_slug AND b.rn BETWEEN a.rn - 59 AND a.rn
    WHERE a.rn >= 60
    GROUP BY a.portfolio_slug, a.rn
  ) w
  GROUP BY w.portfolio_slug

), rolling_10yr_stats AS (
  SELECT
    w.portfolio_slug,
    (min((power(exp(w.sum_ln), (12.0 / (120)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_10yr_low,
    (max((power(exp(w.sum_ln), (12.0 / (120)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_10yr_high,
    (avg((power(exp(w.sum_ln), (12.0 / (120)::numeric)) - (1)::numeric)) * (100)::numeric) AS rolling_10yr_avg
  FROM (
    SELECT a.portfolio_slug, a.rn,
      sum(ln(((1)::numeric + (b.monthly_return / (100)::numeric)))) AS sum_ln
    FROM numbered a
    JOIN numbered b ON b.portfolio_slug = a.portfolio_slug AND b.rn BETWEEN a.rn - 119 AND a.rn
    WHERE a.rn >= 120
    GROUP BY a.portfolio_slug, a.rn
  ) w
  GROUP BY w.portfolio_slug

)
SELECT
  p.slug,
  p.name,
  p.category,
  p.trade_frequency,
  p.min_timeline_years,
  p.risk_level,
  p.description,
  p.m1_link,
  p.kofi_link,
  round(co.cagr, 2)                    AS cagr,
  round(c1.cagr_1yr, 2)               AS cagr_1yr,
  round(c3.cagr_3yr, 2)               AS cagr_3yr,
  round(c10.cagr_10yr, 2)             AS cagr_10yr,
  round(gfc.cagr_gfc, 2)               AS cagr_gfc,
  round(dotcom.cagr_dotcom, 2)         AS cagr_dotcom,
  round(cv.current_value, 2)           AS current_value,
  round(md.max_drawdown, 2)            AS max_drawdown,
  round((co.sharpe_ratio)::numeric, 2) AS sharpe_ratio,
  round(co.sortino_ratio, 2)           AS sortino_ratio,
  round((co.annualized_volatility)::numeric, 2) AS annualized_volatility,
  round(co.pct_profitable_months, 1)   AS pct_profitable_months,
  round(co.best_month, 2)              AS best_month,
  round(co.worst_month, 2)             AS worst_month,
  ld.longest_drawdown_months,
  round(ui.ulcer_index, 2)             AS ulcer_index,
  round(upi.upi, 2)                    AS ulcer_performance_index,
  round(bw.best_year, 2)               AS best_year,
  round(bw.worst_year, 2)              AS worst_year,
  round(ytd.ytd_return, 2)             AS ytd_return,
  co.total_months,
  co.last_updated,
  round(r1.rolling_1yr_low, 2)         AS rolling_1yr_low,
  round(r1.rolling_1yr_high, 2)        AS rolling_1yr_high,
  round(r1.rolling_1yr_avg, 2)         AS rolling_1yr_avg,
  round(r3.rolling_3yr_low, 2)         AS rolling_3yr_low,
  round(r3.rolling_3yr_high, 2)        AS rolling_3yr_high,
  round(r3.rolling_3yr_avg, 2)         AS rolling_3yr_avg,
  round(r5.rolling_5yr_low, 2)         AS rolling_5yr_low,
  round(r5.rolling_5yr_high, 2)        AS rolling_5yr_high,
  round(r5.rolling_5yr_avg, 2)         AS rolling_5yr_avg,
  round(r10.rolling_10yr_low, 2)       AS rolling_10yr_low,
  round(r10.rolling_10yr_high, 2)      AS rolling_10yr_high,
  round(r10.rolling_10yr_avg, 2)       AS rolling_10yr_avg
FROM (((((((((((((((((portfolios p
  LEFT JOIN core co             ON co.portfolio_slug = p.slug)
  LEFT JOIN longest_drawdown ld ON ld.portfolio_slug = p.slug)
  LEFT JOIN cagr_1yr c1         ON c1.portfolio_slug = p.slug)
  LEFT JOIN cagr_3yr c3         ON c3.portfolio_slug = p.slug)
  LEFT JOIN cagr_10yr c10       ON c10.portfolio_slug = p.slug)
  LEFT JOIN cagr_gfc gfc        ON gfc.portfolio_slug = p.slug)
  LEFT JOIN cagr_dotcom dotcom  ON dotcom.portfolio_slug = p.slug)
  LEFT JOIN current_value cv    ON cv.portfolio_slug = p.slug)
  LEFT JOIN max_drawdown md     ON md.portfolio_slug = p.slug)
  LEFT JOIN ulcer_index ui      ON ui.portfolio_slug = p.slug)
  LEFT JOIN ulcer_performance_index upi ON upi.portfolio_slug = p.slug)
  LEFT JOIN best_worst bw       ON bw.portfolio_slug = p.slug)
  LEFT JOIN ytd_return ytd      ON ytd.portfolio_slug = p.slug)
  LEFT JOIN rolling_1yr_stats r1  ON r1.portfolio_slug = p.slug)
  LEFT JOIN rolling_3yr_stats r3  ON r3.portfolio_slug = p.slug)
  LEFT JOIN rolling_5yr_stats r5  ON r5.portfolio_slug = p.slug)
  LEFT JOIN rolling_10yr_stats r10 ON r10.portfolio_slug = p.slug);
