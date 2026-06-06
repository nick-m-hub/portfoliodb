'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { buildBlendedReturns, computeStats } from '@/lib/portfolioStats';

const CATEGORY_CONFIG = {
  'Buy and Hold': { color: '#074a34' },
  'Tactical':     { color: '#1565c0' },
  'Robo-Advisor': { color: '#7b1fa2' },
};

const PERIODS = [
  { key: 'full', label: 'Full History' },
  { key: '20yr', label: '20 Years'     },
  { key: '10yr', label: '10 Years'     },
];

const X_AXES = [
  { key: 'vol',   label: 'Volatility',    axisLabel: 'Annualized Volatility →', tooltipLabel: 'Volatility' },
  { key: 'maxdd', label: 'Max Drawdown',  axisLabel: 'Max Drawdown →',          tooltipLabel: 'Max Drawdown' },
];
const ALL_CATEGORIES = ['Buy and Hold', 'Tactical', 'Robo-Advisor'];
const MIX_COLOR = '#e67e22'; // orange — distinct from all category colors

// ─── Dot shapes ───────────────────────────────────────────────────────────────

// Standard portfolio dot — reads all styling from payload
function DotShape({ cx, cy, payload }) {
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.highlighted ? 8 : 5}
      fill={payload.color}
      fillOpacity={payload.dimmed ? 0.15 : 0.8}
      stroke={payload.highlighted ? payload.color : 'white'}
      strokeWidth={payload.highlighted ? 2.5 : 0.5}
      strokeOpacity={payload.highlighted ? 0.5 : 0.3}
      style={{ cursor: 'pointer' }}
    />
  );
}

// Mix dot — larger, orange, white ring so it's always distinct
function MixDotShape({ cx, cy, payload }) {
  if (cx == null || cy == null || !payload) return null;
  const dimmed = payload.dimmed;
  return (
    <g style={{ cursor: 'pointer' }}>
      {/* White ring */}
      <circle cx={cx} cy={cy} r={11} fill="white" fillOpacity={dimmed ? 0.4 : 0.9} />
      {/* Filled orange dot */}
      <circle cx={cx} cy={cy} r={8} fill={MIX_COLOR} fillOpacity={dimmed ? 0.25 : 1} />
      {/* Person icon — a simple circle + arc to suggest "your portfolio" */}
      <circle cx={cx} cy={cy - 3} r={2.5} fill="white" fillOpacity={dimmed ? 0.5 : 1} />
      <path
        d={`M ${cx - 4} ${cy + 5} Q ${cx} ${cy + 1} ${cx + 4} ${cy + 5}`}
        fill="none"
        stroke="white"
        strokeWidth={1.5}
        strokeOpacity={dimmed ? 0.5 : 1}
        strokeLinecap="round"
      />
    </g>
  );
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

function PortfolioTooltip({ d, xAxisKey }) {
  return (
    <>
      <p className="font-manrope font-bold text-sm text-on-surface leading-tight mb-1">{d.name}</p>
      <p className="font-inter text-xs mb-2" style={{ color: d.color }}>{d.category}</p>
      <div className="flex flex-col gap-1 border-t border-outline-variant pt-2">
        <StatRow label="CAGR"         value={`${d.cagr?.toFixed(1)}%`}           valueClass="text-primary" />
        {xAxisKey === 'vol'
          ? <StatRow label="Volatility"   value={`${d.vol?.toFixed(1)}%`} />
          : <StatRow label="Max Drawdown" value={`${Math.abs(d.maxDD)?.toFixed(1)}%`} valueClass="text-error" />
        }
        <StatRow label="Sharpe"       value={d.sharpe?.toFixed(2)} />
        {xAxisKey === 'vol'
          ? <StatRow label="Max Drawdown" value={`${Math.abs(d.maxDD)?.toFixed(1)}%`} valueClass="text-error" />
          : <StatRow label="Volatility"   value={`${d.vol?.toFixed(1)}%`} />
        }
      </div>
      <p className="font-inter text-[10px] text-outline mt-2">Click to view →</p>
    </>
  );
}

function MixTooltip({ d, xAxisKey }) {
  // Build a compact weight summary e.g. "Golden Butterfly 50% · All-Weather 50%"
  const weightSummary = d.selections
    ?.map((s) => `${s.name ?? s.slug} ${s.weight}%`)
    .join(' · ');

  return (
    <>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MIX_COLOR }} />
        <p className="font-manrope font-bold text-sm text-on-surface leading-tight">
          {d.name || 'Custom Mix'}
        </p>
      </div>
      {weightSummary && (
        <p className="font-inter text-[10px] text-on-surface-variant mb-2 leading-snug">{weightSummary}</p>
      )}
      <div className="flex flex-col gap-1 border-t border-outline-variant pt-2">
        <StatRow label="CAGR"         value={`${d.cagr?.toFixed(1)}%`}           valueClass="text-primary" />
        {xAxisKey === 'vol'
          ? <StatRow label="Volatility"   value={`${d.vol?.toFixed(1)}%`} />
          : <StatRow label="Max Drawdown" value={`${Math.abs(d.maxDD)?.toFixed(1)}%`} valueClass="text-error" />
        }
        <StatRow label="Sharpe"       value={d.sharpe?.toFixed(2)} />
        {xAxisKey === 'vol'
          ? <StatRow label="Max Drawdown" value={`${Math.abs(d.maxDD)?.toFixed(1)}%`} valueClass="text-error" />
          : <StatRow label="Volatility"   value={`${d.vol?.toFixed(1)}%`} />
        }
      </div>
      <p className="font-inter text-[10px] text-outline mt-2">Click to open in Builder →</p>
    </>
  );
}

function StatRow({ label, value, valueClass = 'text-on-surface font-semibold' }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="font-inter text-xs text-on-surface-variant">{label}</span>
      <span className={`font-inter text-xs font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

// xAxisKey is passed via the `content` prop factory below
function CustomTooltip({ active, payload, xAxisKey }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-outline-variant rounded-xl shadow-lg p-3 w-[215px] pointer-events-none">
      {d.isMix ? <MixTooltip d={d} xAxisKey={xAxisKey} /> : <PortfolioTooltip d={d} xAxisKey={xAxisKey} />}
    </div>
  );
}

// ─── URL helper ───────────────────────────────────────────────────────────────

function buildBuilderUrl(selections) {
  const param = selections.map((s) => `${s.slug}:${s.weight}`).join(',');
  return `/builder?mix=${encodeURIComponent(param)}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PortfolioMapClient({ portfolios }) {
  const router = useRouter();
  const [activeCategories, setActiveCategories] = useState(new Set(ALL_CATEGORIES));
  const [search, setSearch] = useState('');

  // X-axis metric state
  const [xAxis, setXAxis] = useState('vol'); // 'vol' | 'maxdd'

  // Period filter state
  const [period, setPeriod] = useState('full');
  const [periodData, setPeriodData] = useState(null);   // null = use `portfolios` prop
  const [periodLoading, setPeriodLoading] = useState(false);
  const periodCache = useMemo(() => ({}), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mix overlay state
  const [mixPoints, setMixPoints] = useState([]);   // computed mix data points
  const [mixStatus, setMixStatus] = useState('idle'); // 'idle' | 'loading' | 'done'

  const searchTerm = search.toLowerCase().trim();
  const isSearching = searchTerm.length > 0;

  // ── Fetch windowed stats when period changes ────────────────────────────────
  useEffect(() => {
    if (period === 'full') {
      setPeriodData(null);
      return;
    }
    if (periodCache[period]) {
      setPeriodData(periodCache[period]);
      return;
    }
    setPeriodLoading(true);
    fetch(`/api/portfolio-map-stats?period=${period}`)
      .then((r) => r.json())
      .then((data) => {
        periodCache[period] = data;
        setPeriodData(data);
      })
      .catch(() => {
        // On error, fall back to full history silently
      })
      .finally(() => setPeriodLoading(false));
  }, [period, periodCache]);

  // ── Fetch and compute saved mixes on mount ──────────────────────────────────
  useEffect(() => {
    async function loadMixes() {
      setMixStatus('loading');
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setMixStatus('done'); return; }

        // Fetch saved mixes for this user
        const { data: mixes, error } = await supabase
          .from('user_portfolios')
          .select('id, name, selections')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error || !mixes?.length) { setMixStatus('done'); return; }

        // Collect all unique slugs across all mixes
        const allSlugs = [...new Set(mixes.flatMap((m) => m.selections.map((s) => s.slug)))];

        // Fetch monthly returns in one call
        const res = await fetch(`/api/builder-returns?slugs=${allSlugs.join(',')}`);
        if (!res.ok) { setMixStatus('done'); return; }
        const portfolioReturns = await res.json(); // { [slug]: [{date, monthly_return}] }

        // Build a name lookup from the portfolios prop for the tooltip weight summary
        const nameMap = Object.fromEntries(portfolios.map((p) => [p.slug, p.name]));

        // Compute stats for each mix
        const points = [];
        for (const mix of mixes) {
          const blended = buildBlendedReturns(portfolioReturns, mix.selections);
          const stats = computeStats(blended);
          if (!stats) continue; // not enough data

          points.push({
            x: stats.annualizedVolatility,
            y: stats.cagr,
            isMix: true,
            id: mix.id,
            name: mix.name || 'Custom Mix',
            selections: mix.selections.map((s) => ({
              ...s,
              name: nameMap[s.slug] ?? s.slug,
            })),
            cagr: stats.cagr,
            vol: stats.annualizedVolatility,
            sharpe: stats.sharpe,
            maxDD: stats.maxDrawdown,
            builderUrl: buildBuilderUrl(mix.selections),
            color: MIX_COLOR,
            highlighted: false,
            dimmed: false,
          });
        }

        setMixPoints(points);
      } catch (e) {
        // Silently swallow — mix overlay is best-effort
      } finally {
        setMixStatus('done');
      }
    }
    loadMixes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply search dimming + xAxis to mix points
  const visibleMixPoints = useMemo(() => {
    return mixPoints.map((p) => {
      const matches = !isSearching || p.name.toLowerCase().includes(searchTerm);
      const xVal = xAxis === 'vol' ? p.vol : Math.abs(p.maxDD);
      return {
        ...p,
        x: xVal,
        highlighted: isSearching && matches,
        dimmed: isSearching && !matches,
      };
    });
  }, [mixPoints, isSearching, searchTerm, xAxis]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  // Use windowed data when a period filter is active; fall back to server-fetched full history
  const activePortfolios = periodData ?? portfolios;

  const chartData = useMemo(() => {
    return activePortfolios
      .filter((p) =>
        activeCategories.has(p.category) &&
        p.annualized_volatility != null &&
        p.max_drawdown != null &&
        p.cagr != null
      )
      .map((p) => {
        const matches = !isSearching || p.name.toLowerCase().includes(searchTerm);
        // max_drawdown is stored as a negative number (e.g. -16.61); take abs for plotting
        const xVal = xAxis === 'vol' ? p.annualized_volatility : Math.abs(p.max_drawdown);
        return {
          x: xVal,
          y: p.cagr,
          slug: p.slug,
          name: p.name,
          category: p.category,
          cagr: p.cagr,
          vol: p.annualized_volatility,
          sharpe: p.sharpe_ratio,
          maxDD: p.max_drawdown,
          color: CATEGORY_CONFIG[p.category]?.color ?? '#074a34',
          highlighted: isSearching && matches,
          dimmed: isSearching && !matches,
        };
      });
  }, [activePortfolios, activeCategories, isSearching, searchTerm, xAxis]);

  function toggleCategory(cat) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  const totalVisible = chartData.length + visibleMixPoints.length;

  return (
    <div>
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">

        {/* Category filter pills — also serve as legend */}
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => {
            const active = activeCategories.has(cat);
            const { color } = CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-sm font-medium border transition-all"
                style={
                  active
                    ? { backgroundColor: color, borderColor: color, color: 'white' }
                    : { backgroundColor: 'transparent', borderColor: '#bfc9c2', color: '#404943' }
                }
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.6)' : color }}
                />
                {cat}
              </button>
            );
          })}

          {/* Mix legend chip — only shown when mixes are plotted */}
          {visibleMixPoints.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-sm font-medium border"
              style={{ backgroundColor: MIX_COLOR, borderColor: MIX_COLOR, color: 'white' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-white/60" />
              Your Mixes ({visibleMixPoints.length})
            </span>
          )}
        </div>

        {/* X-axis toggle + Period toggle + Name search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* X-axis toggle */}
          <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5">
            {X_AXES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setXAxis(key)}
                className={`font-inter text-xs font-medium px-3 py-1 rounded-full transition-all ${
                  xAxis === key
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period pills */}
          <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`font-inter text-xs font-medium px-3 py-1 rounded-full transition-all ${
                  period === key
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {periodLoading && key === period ? (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '11px' }}>progress_activity</span>
                    {label}
                  </span>
                ) : label}
              </button>
            ))}
          </div>

          {/* Name search */}
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
              style={{ fontSize: '15px' }}
            >
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Highlight a portfolio…"
              className="font-inter text-sm pl-8 pr-8 py-1.5 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:border-primary w-52"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 md:p-6">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '380px' }}>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart margin={{ top: 10, right: 24, bottom: 52, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dde4dd" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={X_AXES.find((a) => a.key === xAxis)?.tooltipLabel}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#707973' }}
                  label={{
                    value: X_AXES.find((a) => a.key === xAxis)?.axisLabel,
                    position: 'insideBottom',
                    offset: -20,
                    style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fill: '#404943' },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="CAGR"
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#707973' }}
                  label={{
                    value: '↑ CAGR',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 15,
                    style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fill: '#404943' },
                  }}
                />
                <Tooltip
                  content={<CustomTooltip xAxisKey={xAxis} />}
                  cursor={{ strokeDasharray: '3 3', stroke: '#bfc9c2' }}
                />
                {/* Break-even line */}
                <ReferenceLine y={0} stroke="#ba1a1a" strokeDasharray="4 4" strokeOpacity={0.35} />

                {/* All portfolio dots */}
                <Scatter
                  data={chartData}
                  shape={DotShape}
                  onClick={(data) => router.push(`/portfolios/${data.slug}`)}
                />

                {/* User mix dots — rendered on top so they're never hidden */}
                {visibleMixPoints.length > 0 && (
                  <Scatter
                    data={visibleMixPoints}
                    shape={MixDotShape}
                    onClick={(data) => router.push(data.builderUrl)}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="flex flex-wrap justify-between gap-2 mt-3">
        <p className="font-inter text-xs text-on-surface-variant">
          {totalVisible} portfolios
          {visibleMixPoints.length > 0 && (
            <span className="ml-1">
              (including {visibleMixPoints.length} saved {visibleMixPoints.length === 1 ? 'mix' : 'mixes'})
            </span>
          )}
          {period !== 'full' && (
            <span className="ml-1">
              · {PERIODS.find((p) => p.key === period)?.label} window
              {' '}(portfolios with insufficient history are hidden)
            </span>
          )}
          {' '}· Click any dot to open it
          {mixStatus === 'loading' && (
            <span className="ml-2 inline-flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '12px' }}>progress_activity</span>
              Loading your mixes…
            </span>
          )}
        </p>
        <p className="font-inter text-xs text-on-surface-variant text-right">
          {xAxis === 'vol'
            ? 'Volatility = annualized std dev of monthly returns · '
            : 'Max Drawdown = peak-to-trough decline · '}
          Backtested, past performance does not guarantee future results
        </p>
      </div>
    </div>
  );
}
