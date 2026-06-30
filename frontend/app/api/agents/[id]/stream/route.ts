import { NextRequest } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = req.headers.get('Authorization') ?? ''
  const body = await req.json()

  const res = await fetch(`${API_URL}/api/agents/${params.id}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  })

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
