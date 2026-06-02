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
    <div className="max-w-7xl mx-auto px-8">

      {/* Hero */}
      <div className="relative flex flex-col items-center text-center py-16">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="w-[600px] h-[300px] bg-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute w-[300px] h-[200px] bg-violet-600/4 rounded-full blur-3xl translate-x-32" />
        </div>

        <div className="relative space-y-5">
          {/* Pill label */}
          <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400 font-medium">{agents.length} agents disponibles</span>
          </div>

          {/* Headline */}
          <div className="space-y-1">
            <p className="text-gray-600 text-base line-through decoration-red-500/60 decoration-2 select-none">
              Ressources humaines
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent leading-tight">
              Ressources agentiques
            </h2>
          </div>

          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
            Des agents IA spécialisés pour automatiser vos tâches métier — disponibles à la demande, sans limite d'échelle.
          </p>

          {/* Provider chips */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[11px] font-medium bg-orange-950/40 border border-orange-900/50 text-orange-400/80 px-3 py-1 rounded-full">
              Mistral
            </span>
            <span className="text-gray-700 text-xs">·</span>
            <span className="text-[11px] font-medium bg-violet-950/40 border border-violet-900/50 text-violet-400/80 px-3 py-1 rounded-full">
              Claude
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-center mb-10">
        <div className="relative w-full max-w-lg">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
            width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher un agent…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-900/80 border border-gray-800 focus:border-gray-600 focus:outline-none text-white placeholder-gray-600 rounded-xl pl-11 pr-10 py-3 text-sm transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      {query && (
        <p className="text-gray-600 text-xs uppercase tracking-widest mb-6 text-center">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} pour &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-700">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-sm">Aucun agent ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
