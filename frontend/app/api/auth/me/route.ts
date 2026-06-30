import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: auth },
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? ''
  const body = await req.text()
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
