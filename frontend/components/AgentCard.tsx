import Link from 'next/link'

export interface AgentConfig {
  id: string
  name: string
  description: string
  type: 'chatbot' | 'analyse'
  provider?: string
  badge?: string
  input: {
    type: string
    label: string
    placeholder: string
  }
  user_can_access?: boolean
  user_tool_permissions?: Record<string, boolean>
}

const THEMES = [
  {
    hover: 'hover:border-blue-500/40',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    accent: 'group-hover:text-blue-400',
    topLine: 'via-blue-500/60',
    chip: 'bg-blue-950/60 border-blue-900/60 text-blue-400',
    arrow: 'text-blue-500',
  },
  {
    hover: 'hover:border-violet-500/40',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    accent: 'group-hover:text-violet-400',
    topLine: 'via-violet-500/60',
    chip: 'bg-violet-950/60 border-violet-900/60 text-violet-400',
    arrow: 'text-violet-500',
  },
  {
    hover: 'hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    accent: 'group-hover:text-emerald-400',
    topLine: 'via-emerald-500/60',
    chip: 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400',
    arrow: 'text-emerald-500',
  },
  {
    hover: 'hover:border-amber-500/40',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    accent: 'group-hover:text-amber-400',
    topLine: 'via-amber-500/60',
    chip: 'bg-amber-950/60 border-amber-900/60 text-amber-400',
    arrow: 'text-amber-500',
  },
]

const PROVIDER_CHIP: Record<string, string> = {
  mistral: 'bg-orange-950/60 border-orange-900/60 text-orange-400',
  claude: 'bg-violet-950/60 border-violet-900/60 text-violet-400',
}

const INPUT_LABELS: Record<string, string> = {
  text: 'Texte',
  gmail: 'Gmail',
  gestion: 'Texte · Gmail',
  url: 'URL',
  seo: 'Texte · URL',
  prospection: 'Recherche',
}

function getTheme(id: string) {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return THEMES[sum % THEMES.length]
}

function AgentIcon({ inputType, className }: { inputType: string; className?: string }) {
  const cls = `w-5 h-5 ${className ?? ''}`
  const attrs = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: cls }

  switch (inputType) {
    case 'gmail':
      return (
        <svg {...attrs}>
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <polyline points="2,4 12,13 22,4"/>
        </svg>
      )
    case 'gestion':
      return (
        <svg {...attrs}>
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
          <line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
      )
    case 'url':
      return (
        <svg {...attrs}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
    case 'prospection':
      return (
        <svg {...attrs}>
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      )
    default:
      return (
        <svg {...attrs}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      )
  }
}

export default function AgentCard({ agent }: { agent: AgentConfig }) {
  const theme = getTheme(agent.id)
  const locked = agent.user_can_access === false

  return (
    <Link
      href={`/agents/${agent.id}`}
      className={`relative group flex flex-col bg-gray-900/60 border border-gray-800 ${locked ? '' : theme.hover} rounded-2xl p-5 transition-all duration-200 ${locked ? 'opacity-60' : 'hover:bg-gray-900 hover:shadow-xl'} overflow-hidden`}
    >
      {/* Top glow line */}
      {!locked && <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${theme.topLine} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />}

      {/* Lock badge */}
      {locked && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${theme.iconBg} border border-white/5 flex items-center justify-center mb-4 shrink-0`}>
        <AgentIcon inputType={agent.input.type} className={theme.iconColor} />
      </div>

      {/* Name */}
      <div className="flex items-start gap-2 mb-1.5">
        <h3 className={`text-white font-semibold text-sm leading-snug ${locked ? '' : theme.accent} transition-colors`}>
          {agent.name}
        </h3>
        {agent.badge === 'bug' && (
          <span className="shrink-0 text-[10px] bg-red-950 border border-red-800 text-red-400 px-1.5 py-0.5 rounded-full font-medium mt-0.5">
            bug
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-500 text-xs leading-relaxed flex-1 mb-5">
        {agent.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <span className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${theme.chip}`}>
            {INPUT_LABELS[agent.input.type] ?? agent.input.type}
          </span>
          {agent.provider && (
            <span className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${PROVIDER_CHIP[agent.provider] ?? 'bg-gray-800 border-gray-700 text-gray-400'}`}>
              {agent.provider}
            </span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 ${theme.arrow} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </Link>
  )
}
