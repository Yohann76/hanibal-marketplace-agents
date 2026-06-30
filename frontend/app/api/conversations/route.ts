import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  const agentId = req.nextUrl.searchParams.get('agent_id')
  const url = agentId
    ? `${API_URL}/api/conversations?agent_id=${agentId}`
    : `${API_URL}/api/conversations`
  const res = await fetch(url, {
    headers: { Authorization: auth },
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json([], { status: res.status })
  return NextResponse.json(await res.json())
}
