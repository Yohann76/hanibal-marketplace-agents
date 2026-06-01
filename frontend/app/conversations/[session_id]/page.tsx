import Link from 'next/link'
import { notFound } from 'next/navigation'
import MarkdownResult from '../../../components/MarkdownResult'

async function getMessages(sessionId: string) {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/conversations/${sessionId}/messages`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function ConversationDetailPage({ params }: { params: { session_id: string } }) {
  const data = await getMessages(params.session_id)
  if (!data) notFound()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-8 py-5 flex items-center gap-4">
        <Link href="/conversations" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Historique
        </Link>
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
        {data.messages.map((msg: { role: string; content: string }, i: number) => (
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
