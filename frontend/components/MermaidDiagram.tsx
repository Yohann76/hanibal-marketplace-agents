'use client'

import { useEffect, useRef, useState } from 'react'

let mermaidInitialized = false

async function getMermaid() {
  const mermaid = (await import('mermaid')).default
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0f172a',
        primaryColor: '#1e40af',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
      },
    })
    mermaidInitialized = true
  }
  return mermaid
}

function DiagramView({ code, containerClass }: { code: string; containerClass: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const render = async () => {
      if (!ref.current) return
      try {
        const mermaid = await getMermaid()
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, code.trim())
        if (ref.current) ref.current.innerHTML = svg
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    render()
  }, [code])

  if (error) {
    return (
      <div className="bg-red-950 border border-red-800 rounded-lg p-4 text-red-400 text-sm">
        Diagramme invalide — {error}
        <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">{code}</pre>
      </div>
    )
  }

  return <div ref={ref} className={containerClass} />
}

export default function MermaidDiagram({ code }: { code: string }) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="relative group bg-gray-900 border border-gray-700 rounded-lg p-6 overflow-x-auto min-h-[120px] flex justify-center items-center">
        <DiagramView
          code={code}
          containerClass="flex justify-center items-center w-full"
        />
        <button
          onClick={() => setFullscreen(true)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 px-2.5 py-1.5 rounded-lg"
          title="Plein écran (Échap pour fermer)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          Agrandir
        </button>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          onClick={(e) => e.target === e.currentTarget && setFullscreen(false)}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Diagramme — cliquez en dehors ou appuyez sur Échap pour fermer</span>
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 14 10 14 10 20"/>
                <polyline points="20 10 14 10 14 4"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
                <line x1="3" y1="21" x2="14" y2="10"/>
              </svg>
              Fermer
            </button>
          </div>
          <div className="flex-1 flex justify-center items-center overflow-auto p-8">
            <DiagramView
              code={code}
              containerClass="flex justify-center items-center w-full h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto"
            />
          </div>
        </div>
      )}
    </>
  )
}
