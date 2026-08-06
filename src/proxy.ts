import { type NextRequest, NextResponse } from 'next/server'

const protectedPrefixes = [
  '/dashboard',
  '/pos',
  '/pedidos',
  '/reportes',
  '/caja',
  '/cocina',
  '/inventario',
  '/sucursales',
  '/delivery',
  '/reservaciones',
  '/facturacion',
  '/promociones',
  '/puntos',
]

const publicRoutes = ['/login', '/register']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  const isPublic = publicRoutes.includes(pathname)

  if (!hasSession && (isProtected || pathname === '/onboarding')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pos',
    '/pedidos',
    '/reportes',
    '/caja',
    '/cocina',
    '/inventario',
    '/sucursales',
    '/delivery',
    '/reservaciones',
    '/facturacion',
    '/promociones',
    '/puntos',
    '/onboarding',
    '/login',
    '/register',
  ],
}
