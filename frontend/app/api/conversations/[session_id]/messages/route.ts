import { NextRequest, NextResponse } from 'next/server'

/** Proxy for local dev (prod: Nginx routes /api/* to backend directly). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { session_id: string } }
) {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const res = await fetch(
    `${apiUrl}/api/conversations/${params.session_id}/messages`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
