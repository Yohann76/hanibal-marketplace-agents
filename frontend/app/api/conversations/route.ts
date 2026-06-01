import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const agentId = req.nextUrl.searchParams.get('agent_id')
  const url = agentId
    ? `${apiUrl}/api/conversations?agent_id=${agentId}`
    : `${apiUrl}/api/conversations`
  const res = await fetch(url, { cache: 'no-store' })
  return NextResponse.json(await res.json())
}
