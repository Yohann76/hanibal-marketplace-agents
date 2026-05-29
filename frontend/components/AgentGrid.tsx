'use client'

import { useState, useMemo } from 'react'
import AgentCard from './AgentCard'
import { AgentConfig } from './AgentCard'

export default function AgentGrid({ agents }: { agents: AgentConfig[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return agents
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    )
  }, [query, agents])

  return (
    <div className="px-8 py-10">

      <div className="flex flex-col items-center text-center mb-12 pt-4">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <span className="text-gray-600 text-2xl font-light line-through decoration-red-700 decoration-2 select-none">
            Ressources humaines
          </span>
          <span className="text-gray-600 text-xl select-none">→</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Ressources agentiques
          </span>
        </div>
        <p className="text-gray-600 text-sm mt-3 max-w-md">
          Des agents IA prêts à l'emploi pour automatiser vos tâches — disponibles à la demande, sans limite d'échelle.
        </p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="relative w-full max-w-xl">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher un agent..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 text-sm transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <p className="text-gray-600 text-xs uppercase tracking-widest mb-6">
        {query
          ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''} pour "${query}"`
          : `Agents disponibles — ${agents.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-sm">Aucun agent ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
