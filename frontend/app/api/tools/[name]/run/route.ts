import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const body = await req.json()
  const res = await fetch(`${apiUrl}/api/tools/${params.name}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
