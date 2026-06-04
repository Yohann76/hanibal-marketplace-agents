import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function POST(
  req: NextRequest,
  { params }: { params: { trace_id: string } }
) {
  try {
    const body = await req.json()
    const res = await fetch(`${API_URL}/api/traces/${params.trace_id}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
