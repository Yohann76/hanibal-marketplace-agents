'use client'

import { useState } from 'react'
import AgentModal from './AgentModal'

export interface AgentConfig {
  id: string
  name: string
  description: string
  type: 'chatbot' | 'analyse'
  provider?: string
  badge?: string
  input: {
    type: string
    label: string
    placeholder: string
  }
}

const TYPE_ICON: Record<string, string> = {
  chatbot: '🧑',
  analyse: '🤖',
}

const TYPE_LABEL: Record<string, string> = {
  chatbot: 'Chatbot',
  analyse: 'Analyse',
}

export default function AgentCard({ agent }: { agent: AgentConfig }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 hover:border-blue-600 rounded-xl p-6 transition-all hover:bg-gray-800 group relative">
        <a
          href={`/agents/${agent.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 px-2.5 py-1.5 rounded-lg transition-all"
          title="Ouvrir dans un nouvel onglet"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Ouvrir
        </a>

        <div
          onClick={() => setOpen(true)}
          className="cursor-pointer"
        >
          <div className="text-3xl mb-4">{TYPE_ICON[agent.type] ?? '🤖'}</div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
              {agent.name}
            </h3>
            {agent.badge === 'bug' && (
              <span className="text-xs bg-red-950 border border-red-800 text-red-400 px-2 py-0.5 rounded-full font-medium">
                bug
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">{agent.description}</p>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
              {agent.input.type}
            </span>
            <span className="text-xs bg-blue-950 border border-blue-900 text-blue-400 px-2 py-0.5 rounded-full">
              {TYPE_LABEL[agent.type] ?? agent.type}
            </span>
          </div>
        </div>
      </div>

      {open && <AgentModal agent={agent} onClose={() => setOpen(false)} />}
    </>
  )
}
