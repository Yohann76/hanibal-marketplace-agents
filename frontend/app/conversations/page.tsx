'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../components/AuthProvider'
import { getToken } from '../../lib/auth'
import ConversationList from '../../components/ConversationList'

export default function ConversationsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.replace('/login'); return }
    const token = getToken()
    fetch('/api/conversations', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    } as RequestInit)
      .then(r => r.ok ? r.json() : [])
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [user, isLoading, router])

  if (isLoading || (!user && !loading)) return null

  const isOwner = user?.role === 'owner' || user?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-8 py-6 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">← Marketplace</Link>
        <span className="text-gray-700">/</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Historique</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {isOwner ? 'Conversations de votre organisation' : 'Vos conversations'}
          </p>
        </div>
        <span className="ml-auto text-xs text-gray-600 border border-gray-800 px-2.5 py-1 rounded-full">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
      </header>
      <div className="px-8 py-8 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-600 text-sm gap-2">
            <span className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
            Chargement…
          </div>
        ) : (
          <ConversationList conversations={conversations as never[]} showUser={isOwner} />
        )}
      </div>
    </div>
  )
}
