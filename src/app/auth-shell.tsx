export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_60%)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-3xl font-bold tracking-tight text-white">
            POST<span className="text-emerald-400">IA</span>
          </p>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h1 className="mb-6 text-center text-2xl font-bold text-white">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}
