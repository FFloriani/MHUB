import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Em um host `docs.seudominio.com` (ou `docslocalhost` em dev), reescreve a URL
 * para servir a área `/docs` como raiz do site, sem duplicar layout em outro projeto.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] ?? ''
  if (!host.startsWith('docs.')) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/docs')) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = pathname === '/' ? '/docs' : `/docs${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
