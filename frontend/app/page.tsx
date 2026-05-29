import { AgentConfig } from '../components/AgentCard'
import AgentGrid from '../components/AgentGrid'

async function getAgents(): Promise<AgentConfig[]> {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/agents`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function Home() {
  const agents = await getAgents()

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-800 px-8 py-6 flex items-center gap-3">
        <div className="text-2xl">⚡</div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">OC Agents</h1>
          <p className="text-gray-500 text-xs mt-0.5">Marketplace de ressources agentiques</p>
        </div>
      </header>

      {agents.length === 0 ? (
        <div className="px-8 py-10 text-gray-600 text-sm">
          Aucun agent disponible ou le backend est inaccessible.
        </div>
      ) : (
        <AgentGrid agents={agents} />
      )}
    </main>
  )
}
