'use client'

import { useState, useRef } from 'react'
import { generateUUID } from '../lib/uuid'
import { readStream } from '../lib/stream'
import { AgentConfig } from './AgentCard'
import MarkdownResult from './MarkdownResult'

interface RunResult {
  result: string
  input_tokens: number
  output_tokens: number
}

export default function AgentModal({
  agent,
  onClose,
}: {
  agent: AgentConfig
  onClose: () => void
}) {
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [gmailSession, setGmailSession] = useState<string | null>(null)

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const sessionId = useRef(generateUUID())

  const handleGmailConnect = async () => {
    const res = await fetch('/api/config')
    const { gmail_auth_url } = await res.json()
    const popup = window.open(gmail_auth_url, 'gmail-oauth', 'width=500,height=650,left=400,top=100')
    const onMessage = (e: MessageEvent) => {
      if (e.data?.gmailSession) {
        setGmailSession(e.data.gmailSession)
        window.removeEventListener('message', onMessage)
        popup?.close()
      }
    }
    window.addEventListener('message', onMessage)
  }

  const isReady = () => {
    if (agent.input.type === 'gmail') return gmailSession !== null
    if (agent.input.type === 'url') return urlInput.trim() !== ''
    return textInput.trim() !== ''
  }

  const buildBody = () => {
    const base = { session_id: sessionId.current }
    if (agent.input.type === 'gmail') return { ...base, session: gmailSession }
    if (agent.input.type === 'url') return { ...base, input: urlInput }
    return { ...base, input: textInput }
  }

  const getDisplayInput = () => {
    if (agent.input.type === 'url') return urlInput
    if (agent.input.type === 'gmail') return '(Gmail connection)'
    return textInput
  }

  const handleRun = async () => {
    if (!isReady()) return
    const userMsg = getDisplayInput()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: '' }])
    if (agent.input.type === 'text' || agent.input.type === 'prospection') setTextInput('')
    setLoading(true)
    setError(null)
    setActiveTool(null)

    try {
      const res = await fetch(`/api/agents/${agent.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || data.error || 'Erreur inconnue')
      }
      for await (const event of readStream(res)) {
        if (event.type === 'token') {
          setMessages(prev => {
            const msgs = [...prev]
            msgs[msgs.length - 1] = { role: 'assistant', content: msgs[msgs.length - 1].content + event.content }
            return msgs
          })
        } else if (event.type === 'tool_start') {
          setActiveTool(event.tool)
        } else if (event.type === 'tool_end') {
          setActiveTool(null)
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setActiveTool(null)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-lg">{agent.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">

          {/* Input type: text or prospection */}
          {(agent.input.type === 'text' || agent.input.type === 'prospection') && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">{agent.input.label}</label>
              <textarea
                className="w-full bg-gray-950 text-white rounded-lg p-3 border border-gray-700 focus:border-blue-500 focus:outline-none min-h-[140px] text-sm resize-y"
                placeholder={agent.input.placeholder}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
            </div>
          )}

          {/* Input type: url */}
          {agent.input.type === 'url' && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">{agent.input.label}</label>
              <input
                type="url"
                className="w-full bg-gray-950 text-white rounded-lg p-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                placeholder={agent.input.placeholder}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
          )}

          {/* Input type: gmail */}
          {agent.input.type === 'gmail' && (
            <div className="space-y-3">
              {gmailSession ? (
                <div className="flex items-center gap-3 bg-green-950 border border-green-800 rounded-lg p-4">
                  <span className="text-green-400 text-lg">✓</span>
                  <div>
                    <p className="text-green-400 text-sm font-medium">Gmail connecté</p>
                    <p className="text-green-700 text-xs mt-0.5">L'agent peut accéder à vos emails du jour</p>
                  </div>
                  <button
                    onClick={() => setGmailSession(null)}
                    className="ml-auto text-xs text-green-800 hover:text-green-500"
                  >
                    Déconnecter
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGmailConnect}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-lg transition-colors text-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Se connecter avec Google
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={loading || !isReady()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Traitement en cours...' : "Lancer l'agent"}
          </button>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-blue-900 border border-blue-800 text-blue-100 text-sm px-4 py-2 rounded-xl max-w-[85%]">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <MarkdownResult content={msg.content} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
