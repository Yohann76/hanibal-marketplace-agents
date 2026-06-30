'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../components/AuthProvider'
import { apiRequest } from '../../lib/auth'

interface UserWithPerms {
  id: number
  email: string
  name: string
  role: string
  organisation_id: number
  created_at: string
  agent_permissions: Record<string, { can_access: boolean; tool_permissions: Record<string, boolean> }>
}

interface AgentInfo {
  id: string
  name: string
  tools: string[]
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  org_admin: 'Admin org',
  super_admin: 'Super admin',
}

export default function AdminPage() {
  const { user, isLoading, isAdmin } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserWithPerms[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [selectedUser, setSelectedUser] = useState<UserWithPerms | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) router.replace('/')
  }, [user, isLoading, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    Promise.all([
      apiRequest('/api/admin/users').then(r => r.json()),
      apiRequest('/api/agents').then(r => r.json()),
    ]).then(([u, a]) => {
      setUsers(u)
      setAgents(a.map((ag: { id: string; name: string; tools?: string[] }) => ({ id: ag.id, name: ag.name, tools: ag.tools ?? [] })))
      setLoadingData(false)
    }).catch(() => setLoadingData(false))
  }, [isAdmin])

  const updateRole = async (userId: number, role: string) => {
    setSaving(`role-${userId}`)
    try {
      const res = await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
        if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, role } : prev)
      }
    } finally {
      setSaving(null)
    }
  }

  const updatePermission = async (
    userId: number,
    agentId: string,
    canAccess: boolean,
    toolPerms: Record<string, boolean>,
  ) => {
    setSaving(`${userId}-${agentId}`)
    try {
      await apiRequest(`/api/admin/users/${userId}/permissions/${agentId}`, {
        method: 'PUT',
        body: JSON.stringify({ can_access: canAccess, tool_permissions: toolPerms }),
      })
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        return {
          ...u,
          agent_permissions: {
            ...u.agent_permissions,
            [agentId]: { can_access: canAccess, tool_permissions: toolPerms },
          },
        }
      }))
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          agent_permissions: {
            ...prev.agent_permissions,
            [agentId]: { can_access: canAccess, tool_permissions: toolPerms },
          },
        } : prev)
      }
    } finally {
      setSaving(null)
    }
  }

  if (isLoading || !user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="text-gray-700 text-sm">/</span>
          <h1 className="text-sm font-semibold text-white">Administration</h1>
          <span className="text-[10px] bg-violet-950 border border-violet-800 text-violet-400 px-2 py-0.5 rounded-full">{user.role}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
        {/* Liste des utilisateurs */}
        <aside className="w-64 shrink-0">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Utilisateurs ({users.length})</h2>
          {loadingData ? (
            <div className="text-xs text-gray-600">Chargement...</div>
          ) : (
            <div className="space-y-1">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                    selectedUser?.id === u.id
                      ? 'bg-blue-950/60 border border-blue-800/60'
                      : 'bg-gray-900 border border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <p className="text-xs font-medium text-white truncate">{u.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                  <span className="text-[10px] text-gray-600">{ROLE_LABELS[u.role] ?? u.role}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Détail utilisateur */}
        <div className="flex-1 min-w-0">
          {!selectedUser ? (
            <div className="text-sm text-gray-600 mt-4">Sélectionnez un utilisateur</div>
          ) : (
            <div className="space-y-5">
              {/* Infos + rôle */}
              <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">{selectedUser.name}</h2>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                  <select
                    value={selectedUser.role}
                    onChange={e => updateRole(selectedUser.id, e.target.value)}
                    disabled={saving === `role-${selectedUser.id}`}
                    className="bg-gray-800 border border-gray-700 text-xs text-white rounded-lg px-2 py-1.5 outline-none"
                  >
                    <option value="user">Utilisateur</option>
                    <option value="org_admin">Admin org</option>
                    {user.role === 'super_admin' && <option value="super_admin">Super admin</option>}
                  </select>
                </div>
              </section>

              {/* Permissions par agent */}
              <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Droits par agent</h3>
                <div className="space-y-4">
                  {agents.map(agent => {
                    const perms = selectedUser.agent_permissions[agent.id] ?? { can_access: true, tool_permissions: {} }
                    const isSaving = saving === `${selectedUser.id}-${agent.id}`

                    return (
                      <div key={agent.id} className="border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-white">{agent.name}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-400">Accès</span>
                            <button
                              onClick={() => updatePermission(
                                selectedUser.id, agent.id,
                                !perms.can_access, perms.tool_permissions
                              )}
                              disabled={isSaving}
                              className={`relative w-9 h-5 rounded-full transition-colors ${
                                perms.can_access ? 'bg-blue-600' : 'bg-gray-700'
                              }`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                perms.can_access ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </label>
                        </div>

                        {agent.tools.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-gray-600 uppercase tracking-wider">Outils</p>
                            {agent.tools.map(tool => {
                              const allowed = perms.tool_permissions[tool] !== false
                              return (
                                <label key={tool} className="flex items-center gap-2.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={allowed}
                                    onChange={e => {
                                      const newPerms = { ...perms.tool_permissions, [tool]: e.target.checked }
                                      updatePermission(selectedUser.id, agent.id, perms.can_access, newPerms)
                                    }}
                                    disabled={isSaving || !perms.can_access}
                                    className="accent-blue-500 w-3.5 h-3.5"
                                  />
                                  <span className={`text-xs ${perms.can_access ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {tool.replace(/_/g, ' ')}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}

                        {isSaving && <p className="text-[11px] text-gray-600 mt-2">Enregistrement...</p>}
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
