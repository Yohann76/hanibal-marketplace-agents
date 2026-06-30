import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/account', '/admin', '/conversations']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PROTECTED.some(p => pathname.startsWith(p))) {
    const token = request.cookies.get('authToken')?.value
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/conversations/:path*'],
}
