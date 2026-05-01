// Server-renderable SVG donut chart for portfolio allocations
const FALLBACK_COLORS = ['#074a34', '#27624a', '#4a8a68', '#97d3b5', '#b2f0d1', '#d1e4d8'];

const SIZE = 200;
const STROKE = 28;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const CX = SIZE / 2;
const CY = SIZE / 2;

export default function AllocationDonut({ allocations }) {
  if (!allocations || allocations.length === 0) return null;

  // Build arc segments
  let offset = 0; // starts at top (we'll rotate via transform)
  const segments = allocations.map((a, i) => {
    const pct = (a.percentage ?? 0) / 100;
    const dash = pct * CIRCUMFERENCE;
    const gap = CIRCUMFERENCE - dash;
    const seg = { ...a, dash, gap, offset, color: a.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] };
    offset += dash;
    return seg;
  });

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-48 h-48 md:w-56 md:h-56"
    >
      {/* Background ring */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="transparent"
        stroke="#e4e2df"
        strokeWidth={STROKE}
      />
      {/* Coloured segments — rotated so first starts at top */}
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="transparent"
            stroke={seg.color}
            strokeWidth={STROKE}
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={-seg.offset}
          />
        ))}
      </g>
    </svg>
  );
}
