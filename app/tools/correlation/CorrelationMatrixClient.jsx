'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORY_CONFIG = {
  'Buy and Hold': { color: '#074a34' },
  'Tactical':     { color: '#1565c0' },
  'Robo-Advisor': { color: '#7b1fa2' },
};
const ALL_CATEGORIES = ['Buy and Hold', 'Tactical', 'Robo-Advisor'];

const CELL_WIDTH = 48; // px — uniform square-ish cells; values shown at a small font size
const CELL_HEIGHT = 34;
const ROW_LABEL_WIDTH = 240;
const COL_LABEL_HEIGHT = 230; // tall enough for fully-vertical portfolio name labels

// ─── Color scale ──────────────────────────────────────────────────────────────
// Relative scale across the dataset's actual min→max correlation: lowest
// correlation in the matrix → green (most diversifying), highest → red (most
// redundant), white at the midpoint. A sign-based diverging scale would render
// this dataset entirely in shades of red, since every pair here happens to be
// positively correlated — a relative scale is what actually shows variation.
// Capped at ~75% mix so the number inside each cell stays legible.

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function mix(hex1, hex2, t) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

const MAX_MIX = 0.75;

function cellColor(r, minR, maxR) {
  if (r == null) return '#eaeeed'; // bg-surface-container — insufficient overlapping data
  if (maxR === minR) return '#ffffff';
  const t = (r - minR) / (maxR - minR); // 0 = lowest correlation in dataset, 1 = highest
  if (t <= 0.5) return mix('#ffffff', '#0d3d26', (0.5 - t) / 0.5 * MAX_MIX);
  return mix('#ffffff', '#b71c1c', (t - 0.5) / 0.5 * MAX_MIX);
}

// Same relative scale as cellColor but maps to text-weight colors so the number
// in the tooltip (and elsewhere) matches the green/neutral/red direction of the cell.
function cellTextColor(r, minR, maxR) {
  if (r == null) return '#404943';
  if (maxR === minR) return '#1a1c1a';
  const t = (r - minR) / (maxR - minR);
  if (t <= 0.5) return mix('#404943', '#0d3d26', (0.5 - t) / 0.5);
  return mix('#404943', '#b71c1c', (t - 0.5) / 0.5);
}

function correlationLabel(r) {
  if (r == null) return 'Not enough overlapping history';
  const abs = Math.abs(r);
  if (abs >= 0.8) return r > 0 ? 'Highly correlated — largely redundant together' : 'Strongly inversely correlated';
  if (abs >= 0.5) return r > 0 ? 'Moderately correlated' : 'Moderately inversely correlated — diversifying';
  if (abs >= 0.2) return r > 0 ? 'Weakly correlated — diversifying' : 'Weakly inversely correlated — diversifying';
  return 'Essentially uncorrelated — strong diversifier';
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CorrelationMatrixClient() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategories, setActiveCategories] = useState(new Set(ALL_CATEGORIES));
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState(null); // { i, j } indices into the filtered list
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedSlugs, setSelectedSlugs] = useState(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/correlation-matrix')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? 'Failed to load correlation data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const searchTerm = search.toLowerCase().trim();
  const isSearching = searchTerm.length > 0;

  // Rows always show ALL portfolios. Columns are controlled by the category
  // pills — deselecting a category removes it from the x-axis only, so you can
  // still see how those portfolios correlate against the column set. The picker
  // overrides the category filter when a specific portfolio selection is active.
  const { rowPortfolios, colPortfolios, matrix } = useMemo(() => {
    if (!data) return { rowPortfolios: [], colPortfolios: [], matrix: [] };
    const allIndices = data.portfolios.map((p, idx) => ({ p, idx }));
    const categoryFilteredForCols = allIndices.filter(({ p }) => activeCategories.has(p.category));
    const colIndices = selectedSlugs.size > 0
      ? allIndices.filter(({ p }) => selectedSlugs.has(p.slug))
      : categoryFilteredForCols;

    const rowPortfolios = allIndices.map(({ p }) => p);
    const colPortfolios = colIndices.map(({ p }) => p);
    const matrix = allIndices.map(({ idx: i }) =>
      colIndices.map(({ idx: j }) => data.matrix[i][j])
    );
    return { rowPortfolios, colPortfolios, matrix };
  }, [data, activeCategories, selectedSlugs]);

  function togglePortfolioSelection(slug) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const pickerSearchTerm = pickerSearch.toLowerCase().trim();
  const pickerList = useMemo(() => {
    if (!data) return [];
    if (!pickerSearchTerm) return data.portfolios;
    return data.portfolios.filter((p) => p.name.toLowerCase().includes(pickerSearchTerm));
  }, [data, pickerSearchTerm]);

  // Min/max correlation across the full dataset (off-diagonal, non-null) — the
  // color scale is anchored to these so it stays consistent regardless of the
  // active category filter, and so it actually shows variation (this dataset
  // has no negative correlations, so a -1..+1 scale would render entirely red).
  const { minR, maxR } = useMemo(() => {
    if (!data) return { minR: -1, maxR: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < data.matrix.length; i++) {
      for (let j = 0; j < data.matrix.length; j++) {
        if (i === j) continue;
        const v = data.matrix[i][j];
        if (v == null) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    return isFinite(lo) && isFinite(hi) ? { minR: lo, maxR: hi } : { minR: -1, maxR: 1 };
  }, [data]);

  // Slugs matching the current search — keyed by slug (not index) since rows
  // and columns can now be different lists.
  const matchSlugs = useMemo(() => {
    if (!isSearching || !data) return null;
    const set = new Set();
    data.portfolios.forEach((p) => {
      if (p.name.toLowerCase().includes(searchTerm)) set.add(p.slug);
    });
    return set;
  }, [data, isSearching, searchTerm]);

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

  const hoveredPair = hovered
    ? { row: rowPortfolios[hovered.i], col: colPortfolios[hovered.j], r: matrix[hovered.i]?.[hovered.j] }
    : null;

  if (loading) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: '28px' }}>progress_activity</span>
        <p className="font-inter text-sm text-on-surface-variant">Computing pairwise correlations across all portfolios…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center">
        <p className="font-inter text-sm text-error">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Category filter pills + portfolio picker */}
        <div className="flex flex-wrap items-center gap-2">
        <div
          className={`flex flex-wrap gap-2 transition-opacity ${selectedSlugs.size > 0 ? 'opacity-40 pointer-events-none' : ''}`}
          title={selectedSlugs.size > 0 ? 'Clear your portfolio selection to filter by category' : undefined}
        >
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
        </div>

          {/* Portfolio picker — narrow the matrix to an exact set of portfolios */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-sm font-medium border transition-all ${
                selectedSlugs.size > 0
                  ? 'bg-primary border-primary text-on-primary'
                  : 'bg-transparent border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>checklist</span>
              {selectedSlugs.size > 0 ? `${selectedSlugs.size} selected` : 'Select portfolios'}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {pickerOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {pickerOpen && (
              <div className="absolute left-0 top-full mt-2 bg-white border border-outline-variant rounded-xl shadow-lg z-50 w-72 flex flex-col">
                <div className="p-3 border-b border-outline-variant">
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
                      style={{ fontSize: '15px' }}
                    >
                      search
                    </span>
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Filter portfolios…"
                      className="font-inter text-sm pl-8 pr-3 py-1.5 border border-outline-variant rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:border-primary w-full"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                  {pickerList.length === 0 ? (
                    <p className="font-inter text-xs text-on-surface-variant text-center py-6">No matches</p>
                  ) : (
                    pickerList.map((p) => {
                      const checked = selectedSlugs.has(p.slug);
                      return (
                        <label
                          key={p.slug}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-container-low cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePortfolioSelection(p.slug)}
                            className="accent-[#074a34] w-4 h-4 flex-shrink-0"
                          />
                          <span className="font-inter text-sm text-on-surface truncate">{p.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-outline-variant">
                  <span className="font-inter text-xs text-on-surface-variant">{selectedSlugs.size} selected</span>
                  <button
                    onClick={() => setSelectedSlugs(new Set())}
                    disabled={selectedSlugs.size === 0}
                    className="font-inter text-xs font-medium text-primary hover:underline disabled:text-outline disabled:no-underline disabled:cursor-default"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Hover/info panel — fixed height so long names never cause layout shift */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl px-4 mb-4 h-[68px] flex items-center overflow-hidden">
        {hoveredPair ? (
          <div className="flex items-center justify-between gap-3 w-full min-w-0">
            <div className="min-w-0 flex-1">
              <p className="font-manrope font-semibold text-sm text-on-surface truncate">
                {hoveredPair.row.name} <span className="text-on-surface-variant font-inter font-normal">vs.</span> {hoveredPair.col.name}
              </p>
              <p className="font-inter text-xs text-on-surface-variant mt-0.5 truncate">
                {hoveredPair.row.slug === hoveredPair.col.slug
                  ? 'Same portfolio — correlation is always 1.00'
                  : correlationLabel(hoveredPair.r)}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="font-manrope font-bold text-lg" style={{ color: cellTextColor(hoveredPair.r, minR, maxR) }}>
                {hoveredPair.r == null ? '—' : hoveredPair.r.toFixed(2)}
              </span>
              {hoveredPair.row.slug !== hoveredPair.col.slug && (
                <button
                  onClick={() => router.push(`/compare?slugs=${hoveredPair.row.slug},${hoveredPair.col.slug}`)}
                  className="font-inter text-xs font-medium text-primary hover:underline whitespace-nowrap"
                >
                  Compare these two →
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="font-inter text-xs text-on-surface-variant">
            Hover any cell to see the correlation between two portfolios. Click a cell to compare them side by side.
          </p>
        )}
      </div>

      {/* Matrix */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 md:p-6">
        {rowPortfolios.length === 0 || colPortfolios.length === 0 ? (
          <p className="font-inter text-sm text-on-surface-variant text-center py-12">
            No portfolios match the selected filters.
          </p>
        ) : (
          <div
            className="overflow-auto rounded-lg"
            style={{ maxHeight: '85vh' }}
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
          >
            <table
              style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                tableLayout: 'fixed',
                width: ROW_LABEL_WIDTH + colPortfolios.length * CELL_WIDTH,
                minWidth: ROW_LABEL_WIDTH + colPortfolios.length * CELL_WIDTH,
              }}
            >
              <thead>
                <tr>
                  <th
                    className="bg-surface-container-lowest"
                    style={{ position: 'sticky', top: 0, left: 0, zIndex: 30, width: ROW_LABEL_WIDTH, height: COL_LABEL_HEIGHT }}
                  />
                  {colPortfolios.map((p, j) => {
                    const dimmed = isSearching && !matchSlugs.has(p.slug);
                    const highlighted = isSearching && matchSlugs.has(p.slug);
                    return (
                      <th
                        key={p.slug}
                        className="bg-surface-container-lowest align-bottom"
                        style={{ position: 'sticky', top: 0, zIndex: 20, width: CELL_WIDTH, height: COL_LABEL_HEIGHT, padding: 0 }}
                      >
                        <div
                          className="font-inter mx-auto"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            fontSize: '10px',
                            lineHeight: 1.1,
                            color: highlighted ? '#074a34' : '#404943',
                            fontWeight: highlighted ? 700 : 400,
                            opacity: dimmed ? 0.3 : 1,
                            height: COL_LABEL_HEIGHT - 12,
                            maxHeight: COL_LABEL_HEIGHT - 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            paddingBottom: 8,
                          }}
                          title={p.name}
                        >
                          {p.name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rowPortfolios.map((p, i) => {
                  const rowDimmed = isSearching && !matchSlugs.has(p.slug);
                  const rowHighlighted = isSearching && matchSlugs.has(p.slug);
                  return (
                    <tr key={p.slug}>
                      <th
                        className="bg-surface-container-lowest text-left font-inter font-normal whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                          width: ROW_LABEL_WIDTH,
                          maxWidth: ROW_LABEL_WIDTH,
                          height: CELL_HEIGHT,
                          fontSize: '11px',
                          color: rowHighlighted ? '#074a34' : '#404943',
                          fontWeight: rowHighlighted ? 700 : 400,
                          opacity: rowDimmed ? 0.3 : 1,
                          paddingRight: 10,
                          textAlign: 'right',
                        }}
                        title={p.name}
                      >
                        {p.name}
                      </th>
                      {colPortfolios.map((q, j) => {
                        const r = matrix[i][j];
                        const isSelf = p.slug === q.slug;
                        const dimmed = isSearching && !(matchSlugs.has(p.slug) || matchSlugs.has(q.slug));
                        const isHovered = hovered && hovered.i === i && hovered.j === j;
                        return (
                          <td
                            key={q.slug}
                            onMouseEnter={() => setHovered({ i, j })}
                            onMouseLeave={() => setHovered((h) => (h && h.i === i && h.j === j ? null : h))}
                            onClick={() => !isSelf && router.push(`/compare?slugs=${p.slug},${q.slug}`)}
                            className="font-inter text-center"
                            style={{
                              width: CELL_WIDTH,
                              height: CELL_HEIGHT,
                              fontSize: '10px',
                              color: '#1a1c1a',
                              backgroundColor: isSelf ? '#ffffff' : cellColor(r, minR, maxR),
                              opacity: dimmed ? 0.25 : 1,
                              cursor: isSelf ? 'default' : 'pointer',
                              border: '1px solid #f8faf8',
                              outline: isHovered ? '2px solid #074a34' : 'none',
                              outlineOffset: -2,
                            }}
                          >
                            {!isSelf && r != null ? r.toFixed(2) : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cursor tooltip — floats next to the mouse over the matrix */}
      {hoveredPair && (() => {
        const TOOLTIP_W = 280;
        const TOOLTIP_H = 90;
        const OFFSET = 14;
        const left = mousePos.x + OFFSET + TOOLTIP_W > window.innerWidth
          ? mousePos.x - TOOLTIP_W - OFFSET
          : mousePos.x + OFFSET;
        const top = mousePos.y + OFFSET + TOOLTIP_H > window.innerHeight
          ? mousePos.y - TOOLTIP_H - OFFSET
          : mousePos.y + OFFSET;
        return (
          <div
            className="bg-white border border-outline-variant rounded-xl shadow-lg px-3 py-2.5"
            style={{ position: 'fixed', left, top, zIndex: 200, pointerEvents: 'none', width: TOOLTIP_W }}
          >
            <p className="font-manrope font-semibold text-sm text-on-surface leading-snug">
              {hoveredPair.row.name}
              <span className="text-on-surface-variant font-inter font-normal"> vs. </span>
              {hoveredPair.col.name}
            </p>
            <p className="font-inter text-xs text-on-surface-variant mt-1 leading-snug">
              {hoveredPair.row.slug === hoveredPair.col.slug
                ? 'Same portfolio — correlation is always 1.00'
                : correlationLabel(hoveredPair.r)}
            </p>
            <p className="font-manrope font-bold text-base mt-1" style={{ color: cellTextColor(hoveredPair.r, minR, maxR) }}>
              {hoveredPair.r == null ? '—' : hoveredPair.r.toFixed(2)}
            </p>
          </div>
        );
      })()}

      {/* Legend + footnote */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-2">
          <span className="font-inter text-xs text-on-surface-variant">{minR.toFixed(2)} — most diversifying in this set</span>
          <div
            className="h-3 w-40 rounded-full"
            style={{ background: 'linear-gradient(to right, #0d3d26, #ffffff, #b71c1c)' }}
          />
          <span className="font-inter text-xs text-on-surface-variant">{maxR.toFixed(2)} — most redundant in this set</span>
        </div>
        <p className="font-inter text-xs text-on-surface-variant text-right">
          {colPortfolios.length < rowPortfolios.length
            ? `${rowPortfolios.length} portfolios × ${colPortfolios.length} selected`
            : `${rowPortfolios.length} portfolios`}{' '}
          · correlation computed on each pair&apos;s overlapping monthly returns (min. 24 months) · Backtested, past performance does not guarantee future results
        </p>
      </div>
    </div>
  );
}
