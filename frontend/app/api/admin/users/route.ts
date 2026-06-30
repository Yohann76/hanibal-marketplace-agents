import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  const res = await fetch(`${API_URL}/api/admin/users`, {
    headers: { Authorization: auth },
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
