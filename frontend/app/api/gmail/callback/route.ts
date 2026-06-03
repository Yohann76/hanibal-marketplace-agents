import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const search = req.nextUrl.search  // transmet ?code=...&state=...
  const res = await fetch(`${apiUrl}/api/gmail/callback${search}`, { cache: 'no-store' })
  const html = await res.text()
  return new NextResponse(html, { status: res.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
