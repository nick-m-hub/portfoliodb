export default function ChartSkeleton({ height = 280 }) {
  return (
    <div
      className="w-full rounded-lg bg-surface-container animate-pulse"
      style={{ height }}
    />
  );
}
