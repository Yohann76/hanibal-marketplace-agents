import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const res = await fetch(`${apiUrl}/api/agents/${params.id}`, { cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
