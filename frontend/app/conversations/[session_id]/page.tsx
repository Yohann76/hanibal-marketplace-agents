'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../components/AuthProvider'
import { getToken } from '../../../lib/auth'
import MarkdownResult from '../../../components/MarkdownResult'

interface Message { role: string; content: string }

export default function ConversationDetailPage({ params }: { params: { session_id: string } }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<{ messages: Message[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.replace('/login'); return }
    const token = getToken()
    fetch(`/api/conversations/${params.session_id}/messages`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    } as RequestInit)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user, isLoading, params.session_id, router])

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-3">Conversation introuvable.</p>
          <Link href="/conversations" className="text-xs text-blue-400 hover:text-blue-300">← Retour à l'historique</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-8 py-5 flex items-center gap-4">
        <Link href="/conversations" className="text-gray-500 hover:text-white text-sm transition-colors">← Historique</Link>
        <span className="text-gray-700">/</span>
        <div>
          <h1 className="font-semibold">Conversation</h1>
          <p className="text-gray-600 text-xs font-mono mt-0.5">{params.session_id}</p>
        </div>
        <span className="ml-auto text-xs text-gray-600">
          {data.messages.length} message{data.messages.length !== 1 ? 's' : ''}
        </span>
      </header>

      <div className="px-8 py-8 max-w-3xl mx-auto space-y-6">
        {data.messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-blue-900 border border-blue-800 text-blue-100 text-sm px-4 py-3 rounded-xl max-w-[85%] leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 text-xs mb-2 uppercase tracking-wide">Agent</p>
                <MarkdownResult content={msg.content} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
