import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function PUT(req: NextRequest, { params }: { params: { user_id: string } }) {
  const auth = req.headers.get('Authorization') ?? ''
  const body = await req.text()
  const res = await fetch(`${API_URL}/api/admin/users/${params.user_id}/org`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
