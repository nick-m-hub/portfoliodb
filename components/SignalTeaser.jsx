import Link from 'next/link'

const PLACEHOLDER_HOLDINGS = [
  { ticker: 'VTI', weight: 45 },
  { ticker: 'BND', weight: 30 },
  { ticker: 'GLD', weight: 15 },
  { ticker: 'BNDX', weight: 10 },
]

export default function SignalTeaser() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 mt-4">
      <h2 className="font-manrope text-base font-bold text-on-surface mb-1">
        Current Asset Allocation
      </h2>
      <p className="font-inter text-xs text-on-surface-variant mb-3">
        Updated monthly
      </p>

      <div className="relative">
        <div
          className="flex flex-col gap-2"
          style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {PLACEHOLDER_HOLDINGS.map((h) => (
            <div
              key={h.ticker}
              className="flex items-center justify-between bg-surface-container rounded-lg px-3 py-2"
            >
              <span className="font-manrope text-sm font-bold text-on-surface">
                {h.ticker}
              </span>
              <span className="font-inter text-sm text-on-surface-variant">
                {h.weight}%
              </span>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">
            lock
          </span>
          <p className="font-inter text-xs font-medium text-on-surface text-center">
            Members only
          </p>
          <Link
            href="/membership"
            className="font-inter text-xs font-medium text-on-primary bg-primary rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
          >
            See membership options
          </Link>
        </div>
      </div>
    </div>
  )
}
