'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { generateUUID } from '../lib/uuid'
import { readStream } from '../lib/stream'
import Link from 'next/link'
import { AgentConfig } from './AgentCard'
import MarkdownResult from './MarkdownResult'
import MermaidDiagram from './MermaidDiagram'

export interface KnowledgeFile {
  name: string
  content: string
}

export interface ToolInfo {
  name: string
  label: string
  icon: string
  description: string
  input_label: string
  input_example: string
  source: string
}

export interface AgentDetail {
  config: AgentConfig
  system_prompt: string
  docs: string
  knowledge: KnowledgeFile[]
  tools_info: ToolInfo[]
  mermaid_flow?: string
  user_can_access?: boolean
  user_tool_permissions?: Record<string, boolean>
}

interface ToolCallRecord {
  tool: string
  status: 'running' | 'done'
  result?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tool_calls?: ToolCallRecord[]
  trace_id?: string
}

interface ConversationSession {
  session_id: string
  agent_id: string
  title: string
  message_count: number
  input_tokens: number
  output_tokens: number
  updated_at: string
}

type Tab = 'use' | 'config' | 'docs' | 'knowledge' | 'tools'

const PROVIDER_CHIP: Record<string, string> = {
  mistral: 'bg-orange-950/60 border-orange-900/60 text-orange-400',
  claude:  'bg-violet-950/60 border-violet-900/60 text-violet-400',
}

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
  const { config, system_prompt, docs, knowledge, tools_info = [], mermaid_flow, user_can_access } = detail
  const hasKnowledge = knowledge && knowledge.length > 0
  const hasTools = tools_info.length > 0
  const isLocked = user_can_access === false

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md shrink-0">
        <div className="px-6 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
          </Link>

          <span className="text-gray-700 text-sm">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-white text-sm truncate">{config.name}</h1>
            {config.badge === 'bug' && (
              <span className="shrink-0 text-[10px] bg-red-950 border border-red-800 text-red-400 px-1.5 py-0.5 rounded-full font-medium">bug</span>
            )}
          </div>

          <p className="hidden sm:block text-gray-600 text-xs truncate max-w-xs ml-1">— {config.description}</p>

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${PROVIDER_CHIP[config.provider ?? 'mistral'] ?? 'bg-gray-800 border-gray-700 text-gray-400'}`}>
              {config.provider ?? 'mistral'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="border-b border-gray-800 px-6 flex gap-0.5 shrink-0 bg-gray-950">
        {(['use', 'config', 'docs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'use' ? 'Utiliser' : t === 'config' ? 'Configuration' : 'Documentation'}
          </button>
        ))}
        {hasTools && (
          <button
            onClick={() => setTab('tools')}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              tab === 'tools' ? 'border-violet-400 text-violet-300' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            Outils
            <span className="text-[10px] bg-violet-950 border border-violet-800 text-violet-400 px-1.5 py-0.5 rounded-full leading-none">{tools_info.length}</span>
          </button>
        )}
        {hasKnowledge && (
          <button
            onClick={() => setTab('knowledge')}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              tab === 'knowledge' ? 'border-amber-400 text-amber-300' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Connaissances
            <span className="text-[10px] bg-amber-950 border border-amber-800 text-amber-400 px-1.5 py-0.5 rounded-full leading-none">{knowledge.length}</span>
          </button>
        )}
      </nav>

      {tab === 'use' ? (
        isLocked ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Accès restreint</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Vous n'avez pas accès à cet agent. Contactez un administrateur pour demander l'accès.</p>
            </div>
          </div>
        ) : (
          <UseTab config={config} toolsInfo={tools_info} />
        )
      ) : (
        <main className="flex-1 px-8 py-8 max-w-4xl w-full mx-auto overflow-y-auto">
          {tab === 'config' && <ConfigTab config={config} systemPrompt={system_prompt} />}
          {tab === 'docs' && <DocsTab docs={docs} mermaidFlow={mermaid_flow} />}
          {tab === 'tools' && <ToolsTab toolsInfo={tools_info} />}
          {tab === 'knowledge' && <KnowledgeTab knowledge={knowledge} />}
        </main>
      )}
    </div>
  )
}

/* ─── Tool icons ─── */

const TOOL_ICONS: Record<string, React.ReactNode> = {
  search: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  globe: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  code: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  building: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/>
    </svg>
  ),
  contact: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
}

/* ─── FeedbackButtons ─── */

function FeedbackButtons({ traceId }: { traceId: string }) {
  const [score, setScore] = useState<1 | -1 | null>(null)
  const [sending, setSending] = useState(false)

  const send = async (value: 1 | -1) => {
    if (score !== null || sending) return
    setSending(true)
    try {
      await fetch(`/api/traces/${traceId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, name: 'user-feedback' }),
      })
      setScore(value)
    } catch {}
    finally { setSending(false) }
  }

  return (
    <div className="flex items-center gap-1 mt-2.5 pl-0.5">
      <button
        onClick={() => send(1)}
        disabled={score !== null || sending}
        title="Bonne réponse"
        className={`p-1.5 rounded-lg transition-all disabled:cursor-default ${
          score === 1
            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/50'
            : 'text-gray-700 hover:text-gray-400 hover:bg-gray-800/60 border border-transparent'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={score === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      </button>
      <button
        onClick={() => send(-1)}
        disabled={score !== null || sending}
        title="Mauvaise réponse"
        className={`p-1.5 rounded-lg transition-all disabled:cursor-default ${
          score === -1
            ? 'text-red-400 bg-red-950/40 border border-red-900/50'
            : 'text-gray-700 hover:text-gray-400 hover:bg-gray-800/60 border border-transparent'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={score === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
      </button>
      {score !== null && (
        <span className="text-[11px] text-gray-600 ml-1 flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-600"><polyline points="20 6 9 17 4 12"/></svg>
          Envoyé
        </span>
      )}
      {sending && (
        <span className="w-3 h-3 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin ml-1" />
      )}
    </div>
  )
}

/* ─── ToolCallResult ─── */

function ToolCallResult({ tc, toolsInfo }: { tc: ToolCallRecord; toolsInfo: ToolInfo[] }) {
  const [open, setOpen] = useState(false)
  const info = toolsInfo.find(t => t.name === tc.tool)
  const label = info?.label ?? tc.tool.replace(/_/g, ' ')
  const icon = info ? TOOL_ICONS[info.icon] : null
  const isDone = tc.status === 'done'
  const lineCount = tc.result ? tc.result.split('\n').length : 0

  return (
    <div className={`rounded-xl overflow-hidden border transition-colors ${isDone ? 'border-violet-900/50 bg-violet-950/10' : 'border-gray-800 bg-gray-900/40'}`}>

      {/* Header */}
      <button
        onClick={() => isDone && setOpen(o => !o)}
        disabled={!isDone}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${isDone ? 'cursor-pointer hover:bg-violet-950/20' : 'cursor-default'}`}
      >
        {/* Status icon */}
        <div className="shrink-0 w-4 h-4 flex items-center justify-center">
          {isDone ? (
            <div className="w-4 h-4 rounded-full bg-violet-900/60 border border-violet-700/60 flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-violet-400"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          ) : (
            <span className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Tool icon + label */}
        <span className={`shrink-0 ${isDone ? 'text-violet-400' : 'text-gray-500'}`}>{icon}</span>
        <span className={`text-xs font-medium ${isDone ? 'text-violet-200' : 'text-gray-400'}`}>{label}</span>

        {/* Running indicator */}
        {!isDone && (
          <span className="text-xs text-violet-500 animate-pulse ml-1">en cours…</span>
        )}

        {/* Done: meta + toggle */}
        {isDone && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {lineCount > 0 && (
              <span className="text-[11px] text-gray-600">{lineCount}L</span>
            )}
            <span className={`text-[11px] text-violet-500 font-medium flex items-center gap-0.5 ml-0.5`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
              {open ? 'Réduire' : 'Voir'}
            </span>
          </div>
        )}
      </button>

      {/* Expanded result */}
      {open && tc.result && (
        <div className="border-t border-violet-900/30">
          <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-72 font-mono p-4 text-[11px] bg-gray-950/60">
            {tc.result}
          </pre>
          <div className="flex justify-end px-3 py-2 border-t border-violet-900/20">
            <button onClick={() => setOpen(false)} className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
              Réduire
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ToolCallIndicator (loading) ─── */

function ToolCallIndicator({ toolName, toolsInfo }: { toolName: string; toolsInfo: ToolInfo[] }) {
  const info = toolsInfo.find(t => t.name === toolName)
  const label = info?.label ?? toolName.replace(/_/g, ' ')
  const icon = info ? TOOL_ICONS[info.icon] : null

  return (
    <div>
      <p className="text-gray-600 text-[11px] mb-2 uppercase tracking-widest">Agent</p>
      <div className="flex items-center gap-3 bg-gray-900 border border-violet-900/50 rounded-xl px-4 py-3 w-fit max-w-xs">
        <div className="w-7 h-7 bg-violet-950 border border-violet-800/60 rounded-lg flex items-center justify-center shrink-0">
          <span className="w-2 h-2 bg-violet-400 rounded-full animate-ping" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500 leading-none mb-1">Outil en cours</p>
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-violet-400 shrink-0">{icon}</span>}
            <span className="text-sm text-violet-200 font-medium truncate">{label}</span>
          </div>
        </div>
        <div className="flex gap-1 ml-1 shrink-0">
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

/* ─── UseTab ─── */

function sessionStorageKey(agentId: string) {
  return `oc-active-session-${agentId}`
}

function UseTab({ config, toolsInfo }: { config: AgentConfig; toolsInfo: ToolInfo[] }) {
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(sessionStorageKey(config.id))
      if (saved) return saved
    }
    return generateUUID()
  })
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const hasGmail = toolsInfo.some(t => t.name === 'gmail_read')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)


  useEffect(() => {
    if (!hasGmail) return
    const check = () => fetch('/api/gmail/status').then(r => r.json()).then(d => setGmailConnected(d.connected)).catch(() => setGmailConnected(false))
    check()
  }, [hasGmail])

  useEffect(() => {
    if (!shouldAutoScroll.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?agent_id=${config.id}`)
      if (res.ok) setSessions(await res.json())
    } catch {}
  }, [config.id])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  useEffect(() => {
    sessionStorage.setItem(sessionStorageKey(config.id), activeSessionId)
  }, [activeSessionId, config.id])

  const historyRestoredRef = useRef(false)

  const loadSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId)
    setMessages([])
    setError(null)
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/conversations/${sessionId}/messages`)
      if (res.ok) {
        const data = await res.json()
        const msgs: ChatMessage[] = (data.messages ?? []).map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          tool_calls: m.tool_calls?.map((tc: any) => ({
            tool: tc.tool,
            status: 'done' as const,
            result: tc.result,
          })),
        }))
        setMessages(msgs)
      }
    } catch {}
    finally { setLoadingHistory(false) }
  }, [])

  useEffect(() => {
    if (historyRestoredRef.current || sessions.length === 0) return
    const saved = sessionStorage.getItem(sessionStorageKey(config.id))
    const toLoad =
      saved && sessions.some(s => s.session_id === saved)
        ? saved
        : sessions[0]?.session_id
    if (!toLoad) return
    historyRestoredRef.current = true
    loadSession(toLoad)
  }, [sessions, config.id, loadSession])

  const startNewSession = () => {
    shouldAutoScroll.current = true
    const id = generateUUID()
    setActiveSessionId(id)
    sessionStorage.setItem(sessionStorageKey(config.id), id)
    setMessages([])
    setError(null)
  }

  const openSession = (sessionId: string) => {
    if (sessionId === activeSessionId && messages.length > 0) return
    loadSession(sessionId)
  }

  const isText = true

  const isReady = () => textInput.trim() !== ''

  const getDisplayInput = () => textInput

  const buildBody = () => ({ session_id: activeSessionId, input: textInput })

  const handleRun = async () => {
    if (!isReady()) return
    shouldAutoScroll.current = true
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
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + event.content }
            return msgs
          })
        } else if (event.type === 'tool_start') {
          setActiveTool(event.tool)
          setMessages(prev => {
            const msgs = [...prev]
            const last = msgs[msgs.length - 1]
            msgs[msgs.length - 1] = {
              ...last,
              tool_calls: [...(last.tool_calls ?? []), { tool: event.tool, status: 'running' }],
            }
            return msgs
          })
        } else if (event.type === 'tool_end') {
          setActiveTool(null)
          setMessages(prev => {
            const msgs = [...prev]
            const last = msgs[msgs.length - 1]
            const tcs = (last.tool_calls ?? []).map(tc =>
              tc.tool === event.tool && tc.status === 'running'
                ? { ...tc, status: 'done' as const, result: event.result }
                : tc
            )
            msgs[msgs.length - 1] = { ...last, tool_calls: tcs }
            return msgs
          })
        } else if (event.type === 'done' && event.trace_id) {
          setMessages(prev => {
            const msgs = [...prev]
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], trace_id: event.trace_id }
            return msgs
          })
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

      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-gray-800/80 flex flex-col shrink-0 bg-gray-900/30">

        {/* New conversation button */}
        <div className="p-3 border-b border-gray-800/80">
          <button
            onClick={startNewSession}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl px-3 py-2.5 transition-all shadow-lg shadow-blue-900/30 active:scale-95"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle conversation
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto py-1">

          {/* Current new session indicator */}
          {isNewSession && (
            <div className="mx-2 mb-1 flex items-center gap-2 bg-blue-950/40 border border-blue-900/40 rounded-lg px-3 py-2.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-blue-300 font-medium leading-none">Nouvelle conversation</p>
                <p className="text-[11px] text-blue-700 mt-0.5">en cours…</p>
              </div>
            </div>
          )}

          {sessions.length === 0 && !isNewSession && (
            <div className="text-center py-10 px-4">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-xs text-gray-600">Aucune conversation</p>
            </div>
          )}

          {sessions.map(s => {
            const isActive = s.session_id === activeSessionId && !isNewSession

            return (
              <button
                key={s.session_id}
                onClick={() => openSession(s.session_id)}
                className={`w-full text-left px-3 py-2.5 mx-0 transition-all rounded-none border-b border-gray-800/40 ${
                  isActive
                    ? 'bg-gray-800/60 border-l-2 border-l-blue-500 pl-2.5'
                    : 'hover:bg-gray-800/30'
                }`}
              >
                {/* Title */}
                <p className={`text-xs font-medium truncate leading-snug mb-1.5 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {s.title || 'Conversation'}
                </p>

                {/* Time + messages */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-1">
                  <span>{timeAgo(s.updated_at)}</span>
                  <span className="text-gray-700">·</span>
                  <span>{s.message_count} msg</span>
                </div>

              </button>
            )
          })}
        </div>

        {/* Active tools list */}
        {hasGmail && (
          <div className="border-t border-gray-800/80 p-3 shrink-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 px-1 font-semibold">Gmail</p>
            {gmailConnected === null ? (
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-800/40 border border-gray-700/40">
                <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse shrink-0" />
                <span className="text-[11px] text-gray-500">Vérification…</span>
              </div>
            ) : gmailConnected ? (
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-green-950/40 border border-green-900/50">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-[11px] text-green-400 font-medium">Connecté</span>
              </div>
            ) : (
              <a
                href="/api/gmail/auth"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-950/40 border border-red-900/50 hover:bg-red-950/70 transition-colors w-full"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-[11px] text-red-400 font-medium">Non connecté</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-red-600 shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            )}
          </div>
        )}

        {toolsInfo.length > 0 && (
          <div className="border-t border-gray-800/80 p-3 shrink-0">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 px-1 font-semibold">Outils actifs</p>
            <div className="space-y-1">
              {toolsInfo.map(t => (
                <div key={t.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-violet-950/20 border border-violet-900/30">
                  <span className="text-violet-400 shrink-0">{TOOL_ICONS[t.icon]}</span>
                  <span className="text-[11px] text-violet-300 truncate">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {loadingHistory ? (
            <div className="flex justify-center items-center h-32 text-gray-600 text-sm gap-2">
              <span className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
              Chargement…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-1">Démarrez la conversation</p>
              <p className="text-xs text-gray-600 max-w-xs leading-relaxed">La mémoire est active — l'agent se souviendra du contexte entre les sessions.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-blue-600/20 border border-blue-500/30 text-blue-50 text-sm px-4 py-3 rounded-2xl rounded-tr-sm max-w-[78%] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-600 text-[11px] uppercase tracking-widest font-medium">Agent</p>
                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                      <div className="space-y-1.5">
                        {msg.tool_calls.map((tc, j) => (
                          <ToolCallResult key={j} tc={tc} toolsInfo={toolsInfo} />
                        ))}
                      </div>
                    )}
                    {msg.content && <MarkdownResult content={msg.content} isStreaming={loading && i === messages.length - 1} />}
                    {msg.trace_id && !(loading && i === messages.length - 1) && (
                      <FeedbackButtons traceId={msg.trace_id} />
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-2">
              <p className="text-gray-600 text-[11px] uppercase tracking-widest font-medium">Agent</p>
              {activeTool ? (
                <ToolCallIndicator toolName={activeTool} toolsInfo={toolsInfo} />
              ) : (
                <div className="flex items-center gap-1.5 px-1 py-2">
                  <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-3 bg-red-950/60 border border-red-800/60 text-red-400 rounded-xl p-3 text-sm shrink-0 flex items-start gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 px-6 pb-5 pt-3 border-t border-gray-800/80">
          <div className="border border-gray-800 hover:border-gray-700 focus-within:border-gray-600 rounded-2xl bg-gray-900/60 p-3 space-y-3 transition-colors">
            {(
              <textarea
                className="w-full bg-transparent text-white placeholder-gray-600 text-sm resize-none focus:outline-none leading-relaxed"
                placeholder={messages.length > 0 ? 'Continuez la conversation…' : config.input.placeholder}
                value={textInput}
                rows={3}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            )}
            <div className="flex items-center justify-between">
              <p className="text-gray-700 text-[11px]">⌘ Entrée pour envoyer</p>
              <button
                onClick={handleRun}
                disabled={loading || !isReady()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-blue-900/20"
              >
                {loading ? 'En cours…' : 'Envoyer'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

/* ─── ToolCard (onglet Outils) ─── */

function ToolCard({ tool }: { tool: ToolInfo }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTool = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch(`/api/tools/${tool.name}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erreur inconnue')
      setResult(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gray-900/60 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-violet-950/60 border border-violet-900/50 flex items-center justify-center shrink-0">
          <span className="text-violet-400">{TOOL_ICONS[tool.icon]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-0.5">
            <h3 className="text-white font-semibold text-sm">{tool.label}</h3>
            <span className="text-[11px] font-mono text-gray-600 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-md">
              {tool.name}
            </span>
          </div>
          <p className="text-[11px] text-gray-600">Source : {tool.source}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 bg-gray-900/30">
        {/* Description */}
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-semibold">Description</p>
          <p className="text-sm text-gray-300 leading-relaxed">{tool.description}</p>
        </div>

        {/* Param + example */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-semibold">Paramètre</p>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <span className="text-violet-400 text-xs font-mono">{tool.input_label}</span>
              <span className="text-gray-600 text-[11px]">string</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-semibold">Exemple</p>
            <button
              onClick={() => setInput(tool.input_example)}
              className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-2 transition-colors"
            >
              <span className="text-emerald-400 text-[11px] font-mono truncate block">&ldquo;{tool.input_example}&rdquo;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test zone */}
      <div className="px-5 py-4 border-t border-gray-800 bg-gray-950/40 space-y-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Tester manuellement</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runTool()}
            placeholder={tool.input_example}
            className="flex-1 bg-gray-900 border border-gray-700 focus:border-violet-500 focus:outline-none text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 transition-colors"
          />
          <button
            onClick={runTool}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 bg-violet-700 hover:bg-violet-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 shrink-0"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
            {loading ? 'En cours…' : 'Exécuter'}
          </button>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800/60 text-red-400 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {result !== null && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Résultat</p>
            <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-72 overflow-y-auto font-mono">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Tab contents ─── */

function ToolsTab({ toolsInfo }: { toolsInfo: ToolInfo[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-violet-950/20 border border-violet-900/40 rounded-xl px-4 py-3 mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400 shrink-0">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <p className="text-violet-300 text-sm">Ces outils sont invoqués automatiquement par l'agent. Vous pouvez aussi les tester directement ci-dessous.</p>
      </div>
      {toolsInfo.map(tool => <ToolCard key={tool.name} tool={tool} />)}
    </div>
  )
}

function ConfigTab({ config, systemPrompt }: { config: AgentConfig; systemPrompt: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">config.json</h2>
        <pre className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-emerald-300 overflow-x-auto leading-relaxed font-mono">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
      <div>
        <h2 className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">system_prompt.txt</h2>
        <pre className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-blue-200 overflow-x-auto leading-relaxed whitespace-pre-wrap font-mono">
          {systemPrompt}
        </pre>
      </div>
    </div>
  )
}

function DocsTab({ docs, mermaidFlow }: { docs: string; mermaidFlow?: string }) {
  return (
    <div className="space-y-8">
      {mermaidFlow && (
        <div>
          <h2 className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">Flux fonctionnel</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <MermaidDiagram code={mermaidFlow} />
          </div>
        </div>
      )}
      {docs ? (
        <MarkdownResult content={docs} />
      ) : (
        <p className="text-gray-500 text-sm">Aucune documentation disponible.</p>
      )}
    </div>
  )
}

function KnowledgeTab({ knowledge }: { knowledge: KnowledgeFile[] }) {
  const [open, setOpen] = useState<string | null>(knowledge[0]?.name ?? null)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-3 mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <p className="text-amber-300 text-sm">Ces documents sont injectés automatiquement dans le contexte de l'agent à chaque exécution.</p>
      </div>

      {knowledge.map((file) => (
        <div key={file.name} className="border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === file.name ? null : file.name)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900/60 hover:bg-gray-900 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="text-sm text-gray-200 font-medium">{file.name}</span>
            </div>
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-gray-500 transition-transform shrink-0 ${open === file.name ? 'rotate-180' : ''}`}
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
