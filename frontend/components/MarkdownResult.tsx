'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MermaidDiagram from './MermaidDiagram'

export default function MarkdownResult({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
        <span className="text-gray-500 text-xs uppercase tracking-wide">Résultat</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded transition-all"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copié
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copier
            </>
          )}
        </button>
      </div>

      <div className="p-5">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-0 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold text-white mt-6 mb-2 border-b border-gray-800 pb-1.5">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-200 mt-4 mb-1.5">{children}</h3>,
            p: ({ children }) => <p className="text-gray-200 text-sm leading-relaxed mb-3">{children}</p>,
            ul: ({ children }) => <ul className="mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="mb-3 space-y-1 list-decimal list-inside">{children}</ol>,
            li: ({ children }) => <li className="text-gray-200 text-sm flex gap-2"><span className="text-gray-500 mt-0.5">•</span><span>{children}</span></li>,
            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
            code: ({ node, children, className, ...props }) => {
              const lang = className?.replace('language-', '') ?? ''
              const code = String(children).trim()
              if (lang === 'mermaid') return <MermaidDiagram code={code} />
              if (className?.includes('language-')) {
                return (
                  <code className="block bg-gray-900 border border-gray-700 rounded p-3 text-xs text-yellow-300 overflow-x-auto mb-3 whitespace-pre">
                    {children}
                  </code>
                )
              }
              return <code className="bg-gray-800 text-yellow-300 px-1.5 py-0.5 rounded text-xs" {...props}>{children}</code>
            },
            blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-500 pl-4 text-gray-400 italic my-3">{children}</blockquote>,
            hr: () => <hr className="border-gray-800 my-4" />,
            table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
            thead: ({ children }) => <thead className="border-b border-gray-700">{children}</thead>,
            th: ({ children }) => <th className="text-left px-3 py-2 text-gray-400 font-medium text-xs uppercase tracking-wide">{children}</th>,
            td: ({ children }) => <td className="px-3 py-2 text-gray-300 border-b border-gray-800 text-sm">{children}</td>,
            a: ({ children, href }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
