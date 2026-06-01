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
}

const TYPE_ICON: Record<string, string> = {
  chatbot: '🧑',
  analyse: '🤖',
}

const TYPE_LABEL: Record<string, string> = {
  chatbot: 'Chatbot',
  analyse: 'Analyse',
}

export default function AgentCard({ agent }: { agent: AgentConfig }) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="bg-gray-900 border border-gray-800 hover:border-blue-600 rounded-xl p-6 transition-all hover:bg-gray-800 group block"
    >
      <div className="text-3xl mb-4">{TYPE_ICON[agent.type] ?? '🤖'}</div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
          {agent.name}
        </h3>
        {agent.badge === 'bug' && (
          <span className="text-xs bg-red-950 border border-red-800 text-red-400 px-2 py-0.5 rounded-full font-medium">
            bug
          </span>
        )}
      </div>
      <p className="text-gray-500 text-sm leading-relaxed mb-4">{agent.description}</p>
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
          {agent.input.type}
        </span>
        <span className="text-xs bg-blue-950 border border-blue-900 text-blue-400 px-2 py-0.5 rounded-full">
          {TYPE_LABEL[agent.type] ?? agent.type}
        </span>
      </div>
    </Link>
  )
}
