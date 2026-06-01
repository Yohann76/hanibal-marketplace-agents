'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { generateUUID } from '../lib/uuid'
import { readStream } from '../lib/stream'
import Link from 'next/link'
import { AgentConfig } from './AgentCard'
import MarkdownResult from './MarkdownResult'

export interface KnowledgeFile {
  name: string
  content: string
}

export interface AgentDetail {
  config: AgentConfig
  system_prompt: string
  docs: string
  knowledge: KnowledgeFile[]
}

interface ConversationSession {
  session_id: string
  agent_id: string
  title: string
  message_count: number
  updated_at: string
}

type Tab = 'use' | 'config' | 'docs' | 'knowledge'

const TYPE_ICON: Record<string, string> = { chatbot: '🧑', analyse: '🤖' }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}j`
}

export default function AgentFullPage({ detail }: { detail: AgentDetail }) {
  const [tab, setTab] = useState<Tab>('use')
  const { config, system_prompt, docs, knowledge } = detail
  const hasKnowledge = knowledge && knowledge.length > 0

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <header className="border-b border-gray-800 px-8 py-5 flex items-center gap-4 shrink-0">
        <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Marketplace
        </Link>
        <span className="text-gray-700">/</span>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TYPE_ICON[config.type] ?? '🤖'}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg leading-none">{config.name}</h1>
              {config.badge === 'bug' && (
                <span className="text-xs bg-red-950 border border-red-800 text-red-400 px-2 py-0.5 rounded-full font-medium">bug</span>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-1">{config.description}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs bg-blue-950 border border-blue-900 text-blue-400 px-2 py-0.5 rounded-full">
            {config.provider ?? 'mistral'}
          </span>
          <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
            {config.type}
          </span>
        </div>
      </header>

      <nav className="border-b border-gray-800 px-8 flex gap-1 shrink-0">
        {(['use', 'config', 'docs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'use' ? 'Utiliser' : t === 'config' ? 'Configuration' : 'Documentation'}
          </button>
        ))}
        {hasKnowledge && (
          <button
            onClick={() => setTab('knowledge')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 ${
              tab === 'knowledge'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Connaissances
            <span className="text-xs bg-amber-950 border border-amber-800 text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
              {knowledge.length}
            </span>
          </button>
        )}
      </nav>

      {tab === 'use' ? (
        <UseTab config={config} />
      ) : (
        <main className="flex-1 px-8 py-8 max-w-4xl w-full mx-auto overflow-y-auto">
          {tab === 'config' && <ConfigTab config={config} systemPrompt={system_prompt} />}
          {tab === 'docs' && <DocsTab docs={docs} />}
          {tab === 'knowledge' && <KnowledgeTab knowledge={knowledge} />}
        </main>
      )}
    </div>
  )
}

function GmailButton({ onConnect, session }: { onConnect: (s: string) => void; session: string | null }) {
  const connect = async () => {
    const res = await fetch('/api/config')
    const { gmail_auth_url } = await res.json()
    const popup = window.open(gmail_auth_url, 'gmail-oauth', 'width=500,height=650,left=400,top=100')
    const onMsg = (e: MessageEvent) => {
      if (e.data?.gmailSession) { onConnect(e.data.gmailSession); window.removeEventListener('message', onMsg); popup?.close() }
    }
    window.addEventListener('message', onMsg)
  }
  if (session) return (
    <div className="flex items-center gap-3 bg-green-950 border border-green-800 rounded-lg p-3">
      <span className="text-green-400">✓</span>
      <p className="text-green-400 text-sm font-medium flex-1">Gmail connecté</p>
      <button onClick={() => onConnect('')} className="text-xs text-green-800 hover:text-green-500">Déconnecter</button>
    </div>
  )
  return (
    <button onClick={connect} className="flex items-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2.5 px-5 rounded-lg text-sm transition-colors">
      <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Se connecter avec Google
    </button>
  )
}

function UseTab({ config }: { config: AgentConfig }) {
  const [activeSessionId, setActiveSessionId] = useState<string>(() => generateUUID())
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [gmailSession, setGmailSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?agent_id=${config.id}`)
      if (res.ok) setSessions(await res.json())
    } catch {}
  }, [config.id])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const loadSession = async (sessionId: string) => {
    if (sessionId === activeSessionId && messages.length > 0) return
    setActiveSessionId(sessionId)
    setMessages([])
    setError(null)
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/conversations/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
    } catch {}
    finally { setLoadingHistory(false) }
  }

  const startNewSession = () => {
    setActiveSessionId(generateUUID())
    setMessages([])
    setError(null)
  }

  const isText = config.input.type === 'text' || config.input.type === 'prospection'

  const isReady = () => {
    if (config.input.type === 'gmail') return !!gmailSession
    if (config.input.type === 'url') return urlInput.trim() !== ''
    return textInput.trim() !== ''
  }

  const getDisplayInput = () => {
    if (config.input.type === 'url') return urlInput
    if (config.input.type === 'gmail') return '(Gmail — emails du jour)'
    return textInput
  }

  const buildBody = () => {
    const base = { session_id: activeSessionId }
    if (config.input.type === 'gmail') return { ...base, session: gmailSession }
    if (config.input.type === 'url') return { ...base, input: urlInput }
    return { ...base, input: textInput }
  }

  const handleRun = async () => {
    if (!isReady()) return
    const userMsg = getDisplayInput()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: '' }])
    if (isText) setTextInput('')
    setLoading(true)
    setError(null)
    setActiveTool(null)

    try {
      const res = await fetch(`/api/agents/${config.id}/stream`, {
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
      fetchSessions()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun()
  }

  const isNewSession = !sessions.some(s => s.session_id === activeSessionId)

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* ── Sidebar sessions ── */}
      <aside className="w-60 border-r border-gray-800 flex flex-col shrink-0 bg-gray-900/50">
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={startNewSession}
            className="w-full flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-2 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isNewSession && (
            <div className="border-b border-gray-800/60 bg-gray-800/40 px-4 py-3">
              <p className="text-xs text-blue-400 font-medium truncate">Nouvelle conversation</p>
              <p className="text-xs text-gray-600 mt-0.5">en cours…</p>
            </div>
          )}

          {sessions.length === 0 && !isNewSession && (
            <p className="text-xs text-gray-600 text-center mt-6 px-4">Aucune session sauvegardée.</p>
          )}

          {sessions.map(s => (
            <button
              key={s.session_id}
              onClick={() => loadSession(s.session_id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-800/60 transition-colors ${
                s.session_id === activeSessionId && !isNewSession
                  ? 'bg-gray-800 border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-800/60'
              }`}
            >
              <p className="text-sm text-gray-200 truncate leading-snug">
                {s.title || 'Conversation'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {timeAgo(s.updated_at)} · {s.message_count} msg
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
          {loadingHistory ? (
            <div className="flex justify-center items-center h-32 text-gray-600 text-sm gap-2">
              <span className="animate-spin">⟳</span> Chargement de la conversation…
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-gray-700">
              <p className="text-3xl mb-3">💬</p>
              <p className="text-sm">Démarrez la conversation avec cet agent.</p>
              <p className="text-xs mt-1 text-gray-600">La mémoire est active — il se souviendra du contexte.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-blue-900 border border-blue-800 text-blue-100 text-sm px-4 py-2.5 rounded-xl max-w-[80%] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 text-xs mb-1.5 uppercase tracking-wide">Agent</p>
                    <MarkdownResult content={msg.content} />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              {activeTool ? (
                <>
                  <span className="animate-spin text-amber-400">⚙</span>
                  <span className="text-amber-400 text-xs">Utilisation de <strong>{activeTool}</strong>…</span>
                </>
              ) : (
                <>
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-75">●</span>
                  <span className="animate-pulse delay-150">●</span>
                </>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-8 mb-3 bg-red-950 border border-red-800 text-red-400 rounded-lg p-3 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 px-8 pb-6 pt-3 border-t border-gray-800">
          <div className="border border-gray-800 rounded-xl bg-gray-900 p-3 space-y-3">
            {config.input.type === 'gmail' && (
              <GmailButton session={gmailSession} onConnect={s => setGmailSession(s || null)} />
            )}
            {config.input.type === 'url' && (
              <input
                type="url"
                className="w-full bg-gray-950 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                placeholder={config.input.placeholder}
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
              />
            )}
            {isText && (
              <textarea
                className="w-full bg-gray-950 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm resize-none"
                placeholder={messages.length > 0 ? 'Continuez la conversation…' : config.input.placeholder}
                value={textInput}
                rows={3}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            )}
            <div className="flex items-center justify-between">
              <p className="text-gray-700 text-xs">⌘ + Entrée pour envoyer</p>
              <button
                onClick={handleRun}
                disabled={loading || !isReady()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors"
              >
                {loading ? 'En cours…' : 'Envoyer'}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfigTab({ config, systemPrompt }: { config: AgentConfig; systemPrompt: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">config.json</h2>
        <pre className="bg-gray-900 border border-gray-800 rounded-lg p-5 text-sm text-green-300 overflow-x-auto leading-relaxed">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">system_prompt.txt</h2>
        <pre className="bg-gray-900 border border-gray-800 rounded-lg p-5 text-sm text-blue-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {systemPrompt}
        </pre>
      </div>
    </div>
  )
}

function DocsTab({ docs }: { docs: string }) {
  if (!docs) return <p className="text-gray-500">Aucune documentation disponible.</p>
  return <MarkdownResult content={docs} />
}

function KnowledgeTab({ knowledge }: { knowledge: KnowledgeFile[] }) {
  const [open, setOpen] = useState<string | null>(knowledge[0]?.name ?? null)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-amber-950/30 border border-amber-900/50 rounded-lg px-4 py-3 mb-6">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 shrink-0">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <p className="text-amber-300 text-sm">
          Ces documents sont injectés automatiquement dans le contexte de l'agent à chaque exécution.
        </p>
      </div>

      {knowledge.map((file) => (
        <div key={file.name} className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpen(open === file.name ? null : file.name)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="text-sm text-gray-200 font-medium">{file.name}</span>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-gray-500 transition-transform ${open === file.name ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {open === file.name && (
            <div className="border-t border-gray-800">
              <MarkdownResult content={file.content} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
