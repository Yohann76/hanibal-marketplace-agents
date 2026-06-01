import Link from 'next/link'
import ConversationList from '../../components/ConversationList'

async function getConversations() {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/conversations`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function ConversationsPage() {
  const conversations = await getConversations()
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-8 py-6 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Marketplace
        </Link>
        <span className="text-gray-700">/</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Historique</h1>
          <p className="text-gray-500 text-xs mt-0.5">Toutes les conversations avec vos agents</p>
        </div>
        <span className="ml-auto text-xs text-gray-600 border border-gray-800 px-2.5 py-1 rounded-full">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
      </header>
      <div className="px-8 py-8 max-w-4xl mx-auto">
        <ConversationList conversations={conversations} />
      </div>
    </div>
  )
}
