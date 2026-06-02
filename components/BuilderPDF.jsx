import {
  Document, Page, Text, View, StyleSheet,
  Svg, Path, Rect, Line, G,
} from '@react-pdf/renderer';

// ─── Brand colours ───────────────────────────────────────────────────────────
const C = {
  green:   '#074a34',
  greenLt: '#f0f7f3',
  blue:    '#1565c0',
  orange:  '#e67e22',
  red:     '#ba1a1a',
  dark:    '#1a1c1a',
  mid:     '#404943',
  gray:    '#707973',
  border:  '#bfc9c2',
  bg:      '#f8faf8',
  white:   '#ffffff',
};

const PORTFOLIO_COLORS = ['#074a34','#1565c0','#b71c1c','#e67e22','#7b1fa2','#00796b'];

// Landscape A4 usable area
const PW = 841.89;
const PH = 595.28;
const PAD = 36;
const CW  = PW - PAD * 2;  // ≈ 770

// ─── Stylesheet ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    padding: PAD,
    paddingBottom: PAD + 14, // room for footer
    fontSize: 9,
    color: C.dark,
  },
  // Green header bar
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.green,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  barBrand:    { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.white },
  barTitle:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 2 },
  barSub:      { fontSize: 7.5, color: 'rgba(255,255,255,0.75)' },
  barRight:    { fontSize: 8, color: 'rgba(255,255,255,0.75)' },
  // Card
  card: {
    backgroundColor: C.white,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
  },
  cardTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 7 },
  // Mix row
  mixRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: C.bg, borderRadius: 3, marginBottom: 2,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  mixName:   { flex: 1, fontSize: 8.5, color: C.dark },
  mixWeight: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.green },
  // Stats 2-col grid inside left card
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  statBox: {
    width: '47%',
    backgroundColor: C.bg, borderRadius: 3,
    paddingVertical: 5, paddingHorizontal: 7, marginBottom: 4,
  },
  statLbl: { fontSize: 6.5, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  statVal: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  // Section heading (pages 2-3)
  heading: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 7 },
  // Table
  tHead: {
    flexDirection: 'row',
    backgroundColor: C.green,
    paddingVertical: 4, paddingHorizontal: 6,
    borderRadius: 3, marginBottom: 1,
  },
  tHCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.white },
  tRow:    { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tRowAlt: { backgroundColor: C.bg },
  tCell:   { fontSize: 8, color: C.dark },
  // Legend
  legend: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 14, height: 2.5, borderRadius: 1 },
  legendLbl:  { fontSize: 7, color: C.gray },
  // Disclaimer
  disc: {
    marginTop: 14, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: C.border,
    fontSize: 7, color: C.gray, lineHeight: 1.6,
  },
  // Footer (fixed, appears on every page)
  footer: {
    position: 'absolute', bottom: 14, left: PAD, right: PAD,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 7, color: C.gray,
  },
});

// ─── Data helpers ─────────────────────────────────────────────────────────────

function filterFrom(returns, startDate) {
  return returns.filter(r => r.date >= startDate);
}

/** Year-end portfolio values starting from $10,000 */
function growthByYear(returns) {
  let v = 10000;
  const byYear = {};
  for (const r of returns) {
    v *= 1 + r.monthly_return / 100;
    byYear[r.date.slice(0, 4)] = v;
  }
  return Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, value]) => ({ x: year, y: value }));
}

/** Monthly running drawdown as % from peak */
function drawdownMonthly(returns) {
  let v = 10000, peak = 10000;
  return returns.map(r => {
    v *= 1 + r.monthly_return / 100;
    if (v > peak) peak = v;
    return { x: r.date, y: ((v - peak) / peak) * 100 };
  });
}

/** Annual returns { year, r, full } */
function annualReturns(returns) {
  const yf = {}, yc = {};
  for (const r of returns) {
    const y = r.date.slice(0, 4);
    yf[y] = (yf[y] || 1) * (1 + r.monthly_return / 100);
    yc[y] = (yc[y] || 0) + 1;
  }
  return Object.entries(yf)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, f]) => ({ year, r: (f - 1) * 100, full: yc[year] === 12 }));
}

/** Rolling returns, annualised, last value per year (for chart clarity) */
function rollingByYear(returns, windowMonths) {
  if (returns.length < windowMonths) return [];
  const byYear = {};
  for (let i = windowMonths - 1; i < returns.length; i++) {
    const slice = returns.slice(i - windowMonths + 1, i + 1);
    const growth = slice.reduce((v, r) => v * (1 + r.monthly_return / 100), 1);
    const ann = (Math.pow(growth, 12 / windowMonths) - 1) * 100;
    const year = returns[i].date.slice(0, 4);
    byYear[year] = ann; // last month of each year wins
  }
  return Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({ x: year, y: v }));
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

const CP = { top: 12, right: 8, bottom: 22, left: 44 }; // chart padding

function niceLinearTicks(min, max, count = 5) {
  const range = max - min || 1;
  const rawStep = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / mag) * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.1; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

function niceLogTicks(min, max) {
  const safeMin = Math.max(min, 1);
  const safeMax = Math.max(max, 2);
  const lMin = Math.floor(Math.log10(safeMin));
  const lMax = Math.ceil(Math.log10(safeMax));
  const all = [];
  for (let l = lMin; l <= lMax; l++) {
    all.push(Math.pow(10, l));
    if (l < lMax) all.push(Math.pow(10, l) * 2);
    if (l < lMax) all.push(Math.pow(10, l) * 5);
  }
  return all.filter(t => t >= safeMin * 0.9 && t <= safeMax * 1.1);
}

/**
 * series: [{ points: [{x: string, y: number}], color, label, dashed?, strokeWidth? }]
 * x values can be "YYYY" or "YYYY-MM" — labels always show the year part
 */
function SvgLineChart({ series, width, height, logScale = false, yFormat, zeroLine = false }) {
  const cL = CP.left, cT = CP.top;
  const cW = width - CP.left - CP.right;
  const cH = height - CP.top - CP.bottom;

  // Union of all x-values, sorted
  const allX = [...new Set(series.flatMap(s => s.points.map(p => p.x)))].sort();
  if (allX.length < 2) return <Svg width={width} height={height} />;

  const allY = series.flatMap(s => s.points.map(p => p.y));
  const rawMin = Math.min(...allY);
  const rawMax = Math.max(...allY);
  const yRange = rawMax - rawMin || 1;
  const yMin = logScale ? rawMin * 0.95 : rawMin - yRange * 0.05;
  const yMax = logScale ? rawMax * 1.05 : rawMax + yRange * 0.05;

  const xOf = (x) => cL + (allX.indexOf(x) / (allX.length - 1)) * cW;

  const yOf = (v) => {
    if (logScale) {
      const lv = Math.log10(Math.max(v, 1));
      const lMin = Math.log10(Math.max(yMin, 1));
      const lMax = Math.log10(Math.max(yMax, 1));
      return cT + cH - ((lv - lMin) / Math.max(lMax - lMin, 0.001)) * cH;
    }
    return cT + cH - ((v - yMin) / Math.max(yMax - yMin, 0.001)) * cH;
  };

  const yTicks = logScale ? niceLogTicks(yMin, yMax) : niceLinearTicks(yMin, yMax);

  // X-axis labels — one per year (first occurrence), filtered to every N years
  const yearFirstIdx = {}; // year → first allX index
  allX.forEach((x, i) => {
    const yr = x.slice(0, 4);
    if (!(yr in yearFirstIdx)) yearFirstIdx[yr] = i;
  });
  const years = Object.keys(yearFirstIdx).sort();
  const numYears = years.length;
  const yrStep = numYears > 45 ? 10 : numYears > 25 ? 5 : numYears > 15 ? 4 : numYears > 8 ? 3 : 2;

  const makePath = (pts) => {
    const mapped = pts.filter(p => allX.includes(p.x)).map(p => [xOf(p.x), yOf(p.y)]);
    if (mapped.length < 2) return '';
    return mapped.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  };

  const zeroY = zeroLine ? yOf(0) : null;
  const showZero = zeroY !== null && zeroY >= cT && zeroY <= cT + cH;

  return (
    <Svg width={width} height={height}>
      {/* Background */}
      <Rect x={cL} y={cT} width={cW} height={cH} fill={C.bg} rx={2} />

      {/* Y grid lines + labels */}
      {yTicks.map((tick) => {
        const ty = yOf(tick);
        if (ty < cT - 1 || ty > cT + cH + 1) return null;
        return (
          <G key={String(tick)}>
            <Line x1={cL} y1={ty} x2={cL + cW} y2={ty}
              stroke={C.border} strokeWidth={0.5} strokeDasharray={tick === 0 ? '' : '2,3'} />
            <Text x={cL - 3} y={ty + 2.5}
              fontSize={6} fill={C.gray} textAnchor="end">
              {yFormat(tick)}
            </Text>
          </G>
        );
      })}

      {/* Zero line */}
      {showZero && (
        <Line x1={cL} y1={zeroY} x2={cL + cW} y2={zeroY}
          stroke={C.mid} strokeWidth={0.75} />
      )}

      {/* X-axis labels */}
      {years.map((yr, i) => {
        if (i % yrStep !== 0 && i !== years.length - 1) return null;
        const xi = yearFirstIdx[yr];
        const xPos = cL + (xi / (allX.length - 1)) * cW;
        return (
          <Text key={yr} x={xPos} y={cT + cH + 14}
            fontSize={6.5} fill={C.gray} textAnchor="middle">
            {yr}
          </Text>
        );
      })}

      {/* Series lines */}
      {series.map((ser) => {
        const d = makePath(ser.points);
        if (!d) return null;
        return (
          <Path key={ser.label} d={d}
            stroke={ser.color}
            strokeWidth={ser.strokeWidth ?? 1.5}
            fill="none"
            strokeDasharray={ser.dashed ? '4,3' : undefined}
          />
        );
      })}

      {/* Border */}
      <Rect x={cL} y={cT} width={cW} height={cH}
        fill="none" stroke={C.border} strokeWidth={0.5} rx={2} />
    </Svg>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function PageBar({ title, subtitle }) {
  return (
    <View style={s.bar}>
      <Text style={s.barBrand}>PortfolioDB</Text>
      <View>
        <Text style={s.barTitle}>{title}</Text>
        {subtitle ? <Text style={s.barSub}>{subtitle}</Text> : null}
      </View>
      <Text style={s.barRight}>portfoliodb.com</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text>PortfolioDB · Custom Portfolio Analysis</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function ChartLegend({ items }) {
  return (
    <View style={s.legend}>
      {items.map(it => (
        <View key={it.label} style={s.legendItem}>
          <View style={[s.legendLine, { backgroundColor: it.color, borderStyle: it.dashed ? 'dashed' : 'solid' }]} />
          <Text style={s.legendLbl}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtMonthYear = (d) => {
  if (!d) return '';
  const [yr, mo] = d.slice(0, 7).split('-');
  return `${MONTHS[parseInt(mo, 10) - 1]} ${yr}`;
};
const fmtPct = (v, plus = false) =>
  v == null ? '—' : `${plus && v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
const fmtDollar = (v) =>
  v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;

// ─── Main export ──────────────────────────────────────────────────────────────

export function BuilderPDFDocument({
  selections     = [],
  stats,
  mixName,
  blendedReturns = [],
  returns6040    = [],
  returnsUS      = [],
}) {
  const title    = mixName || 'Custom Portfolio Mix Analysis';
  const genDate  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateLine = `${fmtMonthYear(stats.startDate)} – ${fmtMonthYear(stats.endDate)} · ${stats.totalMonths} months`;

  // Filter benchmarks to same start as portfolio
  const startDate = blendedReturns[0]?.date ?? '1900-01-01';
  const r60 = filterFrom(returns6040, startDate);
  const rUS = filterFrom(returnsUS,   startDate);

  // ── Chart series ──
  const growthPort = growthByYear(blendedReturns);
  const growth60   = growthByYear(r60);
  const growthUS_  = growthByYear(rUS);

  const ddPort = drawdownMonthly(blendedReturns);
  const dd60   = drawdownMonthly(r60);
  const ddUS_  = drawdownMonthly(rUS);

  // Rolling (annual end-of-year points for clean lines)
  const r1Port = rollingByYear(blendedReturns, 12);
  const r3Port = rollingByYear(blendedReturns, 36);
  const r5Port = rollingByYear(blendedReturns, 60);
  const r1_60  = rollingByYear(r60, 12);
  const r3_60  = rollingByYear(r60, 36);
  const r5_60  = rollingByYear(r60, 60);
  const r1_US  = rollingByYear(rUS, 12);
  const r3_US  = rollingByYear(rUS, 36);
  const r5_US  = rollingByYear(rUS, 60);

  // ── Annual returns for table ──
  const annPort = annualReturns(blendedReturns);
  const ann60   = annualReturns(r60);
  const annUS_  = annualReturns(rUS);
  const map60   = Object.fromEntries(ann60.map(r => [r.year, r.r]));
  const mapUS   = Object.fromEntries(annUS_.map(r => [r.year, r.r]));

  // Split annual table into two columns (≤25 rows each) for long histories
  const ANN_COL_MAX = 25;
  const annRows = annPort.slice(-50); // cap at 50 years
  const midpoint = Math.ceil(annRows.length / 2);
  const annLeft  = annRows.slice(0, midpoint);
  const annRight = annRows.slice(midpoint);

  // ── Stats list ──
  const statsList = [
    { lbl: 'CAGR',          val: fmtPct(stats.cagr, true),                                  color: stats.cagr >= 0 ? C.green : C.red },
    { lbl: 'Max Drawdown',  val: `−${Math.abs(stats.maxDrawdown).toFixed(1)}%`,              color: C.red },
    { lbl: 'Sharpe Ratio',  val: stats.sharpe.toFixed(2),                                   color: stats.sharpe >= 0 ? C.green : C.red },
    { lbl: 'Sortino Ratio', val: stats.sortino.toFixed(2),                                  color: stats.sortino >= 0 ? C.green : C.red },
    { lbl: 'Best Year',     val: stats.bestYear  != null ? `+${stats.bestYear.toFixed(1)}%` : '—', color: C.green },
    { lbl: 'Worst Year',    val: stats.worstYear != null ? fmtPct(stats.worstYear, true) : '—',    color: stats.worstYear != null && stats.worstYear < 0 ? C.red : C.green },
    { lbl: 'Ulcer Index',   val: stats.ulcerIndex.toFixed(2),                               color: C.dark },
    { lbl: 'UPI',           val: stats.ulcerPerformanceIndex != null ? stats.ulcerPerformanceIndex.toFixed(2) : '—', color: stats.ulcerPerformanceIndex != null && stats.ulcerPerformanceIndex >= 0 ? C.green : C.red },
    { lbl: 'YTD Return',    val: stats.ytdReturn  != null ? fmtPct(stats.ytdReturn, true) : '—',   color: stats.ytdReturn  != null && stats.ytdReturn  >= 0 ? C.green : C.red },
    { lbl: '10-Year CAGR',  val: stats.cagr10yr   != null ? fmtPct(stats.cagr10yr, true)  : '—',   color: stats.cagr10yr   != null && stats.cagr10yr   >= 0 ? C.green : C.red },
    { lbl: 'GFC CAGR',      val: stats.gfcCagr    != null ? fmtPct(stats.gfcCagr, true)   : '—',   color: stats.gfcCagr    != null && stats.gfcCagr    >= 0 ? C.green : C.red },
    { lbl: 'Dot-com CAGR',  val: stats.dotcomCagr != null ? fmtPct(stats.dotcomCagr, true): '—',   color: stats.dotcomCagr != null && stats.dotcomCagr >= 0 ? C.green : C.red },
  ];

  // ── Chart dimensions ──
  const LEFT_COL_W  = 258;
  const RIGHT_COL_W = CW - LEFT_COL_W - 14; // gap 14
  const GROWTH_H    = 310;
  const DD_H        = 185;
  const ROLL_H      = 155;
  const HALF_W      = (CW - 14) / 2;

  // ── Benchmark legend items ──
  const legendItems = [
    { label: 'Portfolio Mix', color: C.green },
    ...(r60.length  > 0 ? [{ label: 'US 60/40',  color: C.blue,   dashed: true }] : []),
    ...(rUS.length  > 0 ? [{ label: 'US Market', color: C.orange, dashed: true }] : []),
  ];

  // helper: build benchmark series (only if data available)
  const benchSeries = (port, s60, sUS) => [
    port.length > 0  ? { points: port, color: C.green,  label: 'Portfolio', strokeWidth: 2 } : null,
    s60.length  > 0  ? { points: s60,  color: C.blue,   label: 'US 60/40',  dashed: true   } : null,
    sUS.length  > 0  ? { points: sUS,  color: C.orange, label: 'US Market', dashed: true   } : null,
  ].filter(Boolean);

  // helper: annual returns table column
  const AnnTableCol = ({ rows }) => (
    <View style={{ flex: 1 }}>
      <View style={s.tHead}>
        <Text style={[s.tHCell, { flex: 1 }]}>Year</Text>
        <Text style={[s.tHCell, { width: 54, textAlign: 'right' }]}>Portfolio</Text>
        <Text style={[s.tHCell, { width: 46, textAlign: 'right' }]}>60/40</Text>
        <Text style={[s.tHCell, { width: 50, textAlign: 'right' }]}>US Mkt</Text>
      </View>
      {rows.map((row, i) => {
        const v60 = map60[row.year];
        const vUS = mapUS[row.year];
        return (
          <View key={row.year} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
            <Text style={[s.tCell, { flex: 1 }]}>{row.year}{!row.full ? '*' : ''}</Text>
            <Text style={[s.tCell, { width: 54, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: row.r >= 0 ? C.green : C.red }]}>
              {fmtPct(row.r, true)}
            </Text>
            <Text style={[s.tCell, { width: 46, textAlign: 'right', color: v60 != null && v60 >= 0 ? C.green : C.red }]}>
              {fmtPct(v60, true)}
            </Text>
            <Text style={[s.tCell, { width: 50, textAlign: 'right', color: vUS != null && vUS >= 0 ? C.green : C.red }]}>
              {fmtPct(vUS, true)}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Document title={title}>

      {/* ══ PAGE 1: Mix + Stats + Growth chart ══════════════════════════════ */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <PageBar title={title} subtitle={`${dateLine} · Generated ${genDate}`} />

        <View style={{ flexDirection: 'row', gap: 14, flex: 1 }}>

          {/* Left: mix + stats */}
          <View style={{ width: LEFT_COL_W, gap: 10 }}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Portfolio Mix</Text>
              {selections.map((sel, i) => (
                <View key={sel.slug} style={s.mixRow}>
                  <View style={[s.dot, { backgroundColor: PORTFOLIO_COLORS[i] }]} />
                  <Text style={s.mixName}>{sel.name}</Text>
                  <Text style={s.mixWeight}>{sel.weight}%</Text>
                </View>
              ))}
            </View>

            <View style={[s.card, { flex: 1 }]}>
              <Text style={s.cardTitle}>Performance Stats</Text>
              <View style={s.statsGrid}>
                {statsList.map(sr => (
                  <View key={sr.lbl} style={s.statBox}>
                    <Text style={s.statLbl}>{sr.lbl}</Text>
                    <Text style={[s.statVal, { color: sr.color }]}>{sr.val}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Right: Growth chart */}
          <View style={{ flex: 1 }}>
            <View style={[s.card, { flex: 1 }]}>
              <Text style={s.cardTitle}>Growth of $10,000 — Log Scale</Text>
              <SvgLineChart
                series={benchSeries(growthPort, growth60, growthUS_)}
                width={RIGHT_COL_W - 20}
                height={GROWTH_H}
                logScale={true}
                yFormat={fmtDollar}
              />
              <ChartLegend items={legendItems} />
            </View>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ══ PAGE 2: Annual returns + Drawdown ═══════════════════════════════ */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <PageBar title={`${title} — Annual Returns & Drawdown`} />

        {/* Annual returns table — two columns */}
        <Text style={s.heading}>Annual Returns vs Benchmarks</Text>
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
          <AnnTableCol rows={annLeft} />
          {annRight.length > 0 && <AnnTableCol rows={annRight} />}
        </View>

        {annRows.some(r => !r.full) && (
          <Text style={{ fontSize: 7, color: C.gray, marginBottom: 8 }}>* Partial year (data starts or ends mid-year)</Text>
        )}

        {/* Drawdown chart */}
        <Text style={s.heading}>Historical Drawdown</Text>
        <View style={s.card}>
          <SvgLineChart
            series={benchSeries(ddPort, dd60, ddUS_)}
            width={CW - 20}
            height={DD_H}
            yFormat={(v) => `${v.toFixed(0)}%`}
            zeroLine={true}
          />
          <ChartLegend items={legendItems} />
        </View>

        <PageFooter />
      </Page>

      {/* ══ PAGE 3: Rolling Returns ══════════════════════════════════════════ */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <PageBar title={`${title} — Rolling Returns`} />

        {/* Row 1: 1yr + 3yr */}
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
          <View style={{ width: HALF_W }}>
            <Text style={s.heading}>Rolling 1-Year Returns</Text>
            <View style={s.card}>
              <SvgLineChart
                series={benchSeries(r1Port, r1_60, r1_US)}
                width={HALF_W - 20}
                height={ROLL_H}
                yFormat={(v) => `${v.toFixed(0)}%`}
                zeroLine={true}
              />
              <ChartLegend items={legendItems} />
            </View>
          </View>

          <View style={{ width: HALF_W }}>
            <Text style={s.heading}>Rolling 3-Year Returns (Annualised)</Text>
            <View style={s.card}>
              <SvgLineChart
                series={benchSeries(r3Port, r3_60, r3_US)}
                width={HALF_W - 20}
                height={ROLL_H}
                yFormat={(v) => `${v.toFixed(0)}%`}
                zeroLine={true}
              />
              <ChartLegend items={legendItems} />
            </View>
          </View>
        </View>

        {/* Row 2: 5yr + disclaimer */}
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ width: HALF_W }}>
            <Text style={s.heading}>Rolling 5-Year Returns (Annualised)</Text>
            <View style={s.card}>
              <SvgLineChart
                series={benchSeries(r5Port, r5_60, r5_US)}
                width={HALF_W - 20}
                height={ROLL_H}
                yFormat={(v) => `${v.toFixed(0)}%`}
                zeroLine={true}
              />
              <ChartLegend items={legendItems} />
            </View>
          </View>

          <View style={{ width: HALF_W, justifyContent: 'flex-end' }}>
            <Text style={s.disc}>
              Backtested results are hypothetical and do not reflect actual investment returns.
              Past performance does not guarantee future results. All returns assume monthly
              rebalancing to target weights. Only months where all selected portfolios share
              return data are included. Benchmarks shown are the US 60/40 Portfolio and US
              Stock Market as tracked in the PortfolioDB database. This report is for
              informational purposes only and does not constitute investment advice.{'\n\n'}
              Generated by PortfolioDB.com — {genDate}
            </Text>
          </View>
        </View>

        <PageFooter />
      </Page>

    </Document>
  );
}
