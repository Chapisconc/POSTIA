'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface ShellModule {
  key: string
  label: string
}

const MODULE_ROUTES: Record<string, string> = {
  pos: '/pos',
  productos: '/dashboard/productos',
  caja: '/caja',
  reportes: '/reportes',
  inventario: '/inventario',
  cocina: '/cocina',
  delivery: '/delivery',
  reservaciones: '/reservaciones',
  facturacion: '/facturacion',
  clientes: '/dashboard/clientes',
  promociones: '/promociones',
  puntos: '/puntos',
  sucursales: '/sucursales',
}

const EXTRA_LINKS: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/pedidos', label: 'Pedidos' },
]

function NavList({ modules, pathname }: { modules: ShellModule[]; pathname: string }) {
  const links = EXTRA_LINKS.map((link) => ({
    href: link.href,
    label: link.label,
  }))
  for (const mod of modules) {
    const href = MODULE_ROUTES[mod.key]
    if (href) links.push({ href, label: mod.label })
  }

  return (
    <nav className="mt-6 space-y-1 px-3">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                active ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({
  modules,
  orgName,
  children,
}: {
  modules: ShellModule[]
  orgName: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-slate-800 bg-slate-900/90 backdrop-blur transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <p className="text-lg font-bold tracking-tight">
              POST<span className="text-emerald-400">IA</span>
            </p>
            <p className="truncate text-xs text-slate-500">{orgName}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-500 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavList modules={modules} pathname={pathname} />
        </div>

        <div className="border-t border-slate-800 p-4">
          <form action="/api/auth/logout" method="POST">
            <button className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {open && (
        <button
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          aria-label="Cerrar menú"
        />
      )}

      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white lg:hidden"
        aria-label="Abrir menú"
      >
        ☰
      </button>

      <main className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  )
}
