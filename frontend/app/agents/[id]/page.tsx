import { notFound } from 'next/navigation'
import AgentFullPage from '../../../components/AgentFullPage'
import { AgentDetail } from '../../../components/AgentFullPage'

async function getAgentDetail(id: string): Promise<AgentDetail | null> {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/agents/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function AgentPage({ params }: { params: { id: string } }) {
  const detail = await getAgentDetail(params.id)
  if (!detail) notFound()
  return <AgentFullPage detail={detail} />
}
