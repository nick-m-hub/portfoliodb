// Shown instantly on navigation to /account while the server renders the real
// page (subscription + saved mixes + signals). This gives immediate feedback on
// click instead of the browser appearing to hang on the previous page during
// the dynamic render / cold start. Middleware redirects logged-out users to
// /login before this renders, so it only ever shows to signed-in members.
//
// Mirrors the layout of app/account/page.js so the swap to real content is
// visually stable (no jump). Purely presentational — no data, no auth.

function Bar({ className = '' }) {
  return <div className={`bg-surface-container rounded animate-pulse ${className}`} />;
}

export default function AccountLoading() {
  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-8 py-12 font-inter text-on-surface">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-10">
        <div className="w-full">
          <Bar className="h-4 w-20 mb-3" />
          <Bar className="h-9 w-56 mb-2" />
          <Bar className="h-4 w-44" />
        </div>
        <Bar className="h-9 w-24 shrink-0" />
      </div>

      {/* ── Plan ── */}
      <section className="mb-10">
        <Bar className="h-5 w-16 mb-3" />
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Bar className="h-6 w-24 rounded-full" />
              <Bar className="h-4 w-16" />
            </div>
            <Bar className="h-4 w-32" />
          </div>
          <Bar className="h-3 w-40 mt-4" />
        </div>
      </section>

      {/* ── Saved Mixes ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Bar className="h-5 w-32" />
          <Bar className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5"
            >
              <Bar className="h-4 w-40 mb-3" />
              <div className="flex flex-wrap gap-2">
                <Bar className="h-6 w-28 rounded-full" />
                <Bar className="h-6 w-24 rounded-full" />
                <Bar className="h-6 w-32 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Current Signals ── */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <Bar className="h-5 w-36" />
          <Bar className="h-3 w-24" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5"
            >
              <Bar className="h-4 w-36 mb-3" />
              <Bar className="h-3 w-full mb-2" />
              <Bar className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
