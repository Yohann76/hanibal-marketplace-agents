import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const res = await fetch(`${apiUrl}/api/gmail/auth`, { redirect: 'manual', cache: 'no-store' })

  // Le backend répond avec un redirect 307 vers Google OAuth
  const location = res.headers.get('location')
  if (location) {
    return NextResponse.redirect(location)
  }

  const text = await res.text()
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'text/html' } })
}
