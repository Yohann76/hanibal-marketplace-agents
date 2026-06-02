'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ConversationSession {
  session_id: string
  agent_id: string
  title: string
  message_count: number
  input_tokens: number
  output_tokens: number
  created_at: string
  updated_at: string
}

const AGENT_ICONS: Record<string, string> = {
  'assistant-gestion': '🤖',
  'seo-analysis': '🤖',
  'vulgarisateur': '🤖',
  'prospection': '🤖',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function ConversationList({ conversations }: { conversations: ConversationSession[] }) {
  const [filter, setFilter] = useState('')

  if (conversations.length === 0) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p className="text-4xl mb-4">💬</p>
        <p className="text-sm">Aucune conversation pour l'instant.</p>
        <p className="text-xs mt-2">Lancez un agent pour commencer.</p>
      </div>
    )
  }

  const filtered = conversations.filter(c =>
    c.title?.toLowerCase().includes(filter.toLowerCase()) ||
    c.agent_id.toLowerCase().includes(filter.toLowerCase())
  )

  const grouped = filtered.reduce<Record<string, ConversationSession[]>>((acc, c) => {
    if (!acc[c.agent_id]) acc[c.agent_id] = []
    acc[c.agent_id].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Filtrer les conversations..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 focus:outline-none text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 text-sm"
        />
      </div>

      {Object.entries(grouped).map(([agentId, sessions]) => (
        <div key={agentId}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{AGENT_ICONS[agentId] ?? '🤖'}</span>
            <h2 className="text-gray-400 text-xs uppercase tracking-widest font-medium">{agentId}</h2>
            <span className="text-xs text-gray-700">{sessions.length} conversation{sessions.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-2">
            {sessions.map(s => (
              <Link
                key={s.session_id}
                href={`/conversations/${s.session_id}`}
                className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
                    {s.title || 'Conversation sans titre'}
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5 font-mono truncate">{s.session_id}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {s.message_count}
                  </span>
                  <span>{(s.input_tokens + s.output_tokens).toLocaleString()} tokens</span>
                  <span>{timeAgo(s.updated_at)}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 group-hover:text-gray-400 transition-colors">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
