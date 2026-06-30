import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function GET(req: NextRequest, { params }: { params: { session_id: string } }) {
  const auth = req.headers.get('Authorization') ?? ''
  const res = await fetch(`${API_URL}/api/conversations/${params.session_id}/messages`, {
    headers: { Authorization: auth },
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
