import Link from 'next/link'
import { AgentConfig } from '../components/AgentCard'
import AgentGrid from '../components/AgentGrid'
import UserMenu from '../components/UserMenu'

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
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-none">OC Agents</h1>
              <p className="text-gray-500 text-[10px] mt-0.5 leading-none">Marketplace agentique</p>
            </div>
          </div>

          <span className="text-[10px] font-semibold bg-blue-950 border border-blue-800/60 text-blue-400 px-2 py-0.5 rounded-full tracking-wide">
            BETA
          </span>

          <nav className="ml-auto flex items-center gap-2">
            <Link
              href="/conversations"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 px-3 py-2 rounded-lg transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Historique
            </Link>
            <UserMenu />
          </nav>
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
