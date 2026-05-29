import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.API_URL || 'http://localhost:8080'
  const res = await fetch(`${apiUrl}/api/config`, { cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data)
}
