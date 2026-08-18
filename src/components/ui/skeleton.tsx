export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 h-5 w-32 rounded bg-slate-800" />
      <div className="mb-2 h-4 w-48 rounded bg-slate-800/70" />
      <div className="h-4 w-24 rounded bg-slate-800/70" />
    </div>
  )
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="h-10 w-10 rounded-full bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-slate-800" />
            <div className="h-3 w-32 rounded bg-slate-800/70" />
          </div>
          <div className="h-8 w-20 rounded bg-slate-800/70" />
        </div>
      ))}
    </div>
  )
}
