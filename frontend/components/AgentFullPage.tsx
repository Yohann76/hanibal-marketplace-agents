'use client'

import { useState } from 'react'
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

type Tab = 'use' | 'config' | 'docs' | 'knowledge'

const TYPE_ICON: Record<string, string> = { chatbot: '🧑', analyse: '🤖' }

export default function AgentFullPage({ detail }: { detail: AgentDetail }) {
  const [tab, setTab] = useState<Tab>('use')
  const { config, system_prompt, docs, knowledge } = detail
  const hasKnowledge = knowledge && knowledge.length > 0

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-8 py-5 flex items-center gap-4">
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

      <nav className="border-b border-gray-800 px-8 flex gap-1">
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

      <main className="flex-1 px-8 py-8 max-w-4xl w-full mx-auto">
        {tab === 'use' && <UseTab config={config} />}
        {tab === 'config' && <ConfigTab config={config} systemPrompt={system_prompt} />}
        {tab === 'docs' && <DocsTab docs={docs} />}
        {tab === 'knowledge' && <KnowledgeTab knowledge={knowledge} />}
      </main>
    </div>
  )
}

function UseTab({ config }: { config: AgentConfig }) {
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [gmailSession, setGmailSession] = useState<string | null>(null)
  const [result, setResult] = useState<{ result: string; input_tokens: number; output_tokens: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (config.input.type === 'gmail') return gmailSession !== null
    if (config.input.type === 'url') return urlInput.trim() !== ''
    return textInput.trim() !== ''
  }

  const buildBody = () => {
    if (config.input.type === 'gmail') return { session: gmailSession }
    if (config.input.type === 'url') return { input: urlInput }
    return { input: textInput }
  }

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/agents/${config.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {config.input.type === 'text' && (
        <div>
          <label className="text-gray-400 text-sm mb-2 block">{config.input.label}</label>
          <textarea
            className="w-full bg-gray-900 text-white rounded-lg p-4 border border-gray-700 focus:border-blue-500 focus:outline-none min-h-[200px] text-sm resize-y"
            placeholder={config.input.placeholder}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
        </div>
      )}

      {config.input.type === 'url' && (
        <div>
          <label className="text-gray-400 text-sm mb-2 block">{config.input.label}</label>
          <input
            type="url"
            className="w-full bg-gray-900 text-white rounded-lg p-4 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            placeholder={config.input.placeholder}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
        </div>
      )}

      {config.input.type === 'gmail' && (
        <div className="space-y-3">
          {gmailSession ? (
            <div className="flex items-center gap-3 bg-green-950 border border-green-800 rounded-lg p-4">
              <span className="text-green-400 text-lg">✓</span>
              <div>
                <p className="text-green-400 text-sm font-medium">Gmail connecté</p>
                <p className="text-green-700 text-xs mt-0.5">L'agent peut accéder à vos emails du jour</p>
              </div>
              <button onClick={() => setGmailSession(null)} className="ml-auto text-xs text-green-800 hover:text-green-500">
                Déconnecter
              </button>
            </div>
          ) : (
            <button
              onClick={handleGmailConnect}
              className="flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors text-sm"
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
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2.5 px-8 rounded-lg transition-colors text-sm"
      >
        {loading ? 'Traitement en cours...' : "Lancer l'agent"}
      </button>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg p-4 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <MarkdownResult content={result.result} />
          <div className="flex gap-4 text-xs text-gray-600">
            <span>Entrée : {result.input_tokens} tokens</span>
            <span>Sortie : {result.output_tokens} tokens</span>
            <span>Total : {result.input_tokens + result.output_tokens} tokens</span>
          </div>
        </div>
      )}
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
