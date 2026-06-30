'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../components/AuthProvider'
import { apiRequest } from '../../lib/auth'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrgInfo { id: number; name: string; slug: string }

interface UserRow {
  id: number
  email: string
  name: string
  role: string
  organisation_id: number
  organisation_name: string | null
  created_at: string
  agent_permissions: Record<string, { can_access: boolean; tool_permissions: Record<string, boolean> }>
}

interface AgentInfo { id: string; name: string; tools: string[] }

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_CHIP: Record<string, string> = {
  admin:  'bg-red-950 border-red-800 text-red-400',
  owner:  'bg-violet-950 border-violet-800 text-violet-400',
  member: 'bg-gray-800 border-gray-700 text-gray-400',
}
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', owner: 'Owner', member: 'Membre' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full ${ROLE_CHIP[role] ?? ROLE_CHIP.member}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

// ── Permissions panel ─────────────────────────────────────────────────────────

function PermissionsPanel({
  target,
  agents,
  onClose,
  onUpdate,
  readOnly,
}: {
  target: UserRow
  agents: AgentInfo[]
  onClose: () => void
  onUpdate: (userId: number, agentId: string, canAccess: boolean, toolPerms: Record<string, boolean>) => Promise<void>
  readOnly: boolean
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const permsOf = (agentId: string) =>
    target.agent_permissions[agentId] ?? { can_access: true, tool_permissions: {} }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">{target.name}</p>
            <p className="text-[11px] text-gray-500">{target.email} · <RoleBadge role={target.role} /></p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {readOnly && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-gray-400">
              Lecture seule — les admins et owners ne peuvent pas se voir modifier leurs droits.
            </div>
          )}
          {agents.map(agent => {
            const perms = permsOf(agent.id)
            const isSav = saving === agent.id

            return (
              <div key={agent.id} className="border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800/30">
                  <span className="text-sm font-medium text-white">{agent.name}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] text-gray-500">Accès</span>
                    <button
                      onClick={async () => {
                        if (readOnly || isSav) return
                        setSaving(agent.id)
                        await onUpdate(target.id, agent.id, !perms.can_access, perms.tool_permissions)
                        setSaving(null)
                      }}
                      disabled={readOnly || isSav}
                      className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${perms.can_access ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${perms.can_access ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                </div>

                {agent.tools.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Outils</p>
                    {agent.tools.map(tool => {
                      const allowed = perms.tool_permissions[tool] !== false
                      return (
                        <label key={tool} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowed}
                            onChange={async e => {
                              if (readOnly || isSav) return
                              setSaving(agent.id)
                              await onUpdate(target.id, agent.id, perms.can_access, { ...perms.tool_permissions, [tool]: e.target.checked })
                              setSaving(null)
                            }}
                            disabled={readOnly || isSav || !perms.can_access}
                            className="accent-blue-500 w-3.5 h-3.5"
                          />
                          <span className={`text-xs ${perms.can_access && !readOnly ? 'text-gray-300' : 'text-gray-600'}`}>
                            {tool.replace(/_/g, ' ')}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Create user modal ─────────────────────────────────────────────────────────

function CreateUserModal({
  orgs,
  isAdmin,
  defaultOrgId,
  onClose,
  onCreated,
}: {
  orgs: OrgInfo[]
  isAdmin: boolean
  defaultOrgId: number
  onClose: () => void
  onCreated: (user: UserRow) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('member')
  const [orgId, setOrgId] = useState(String(defaultOrgId))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role, organisation_id: Number(orgId) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Erreur'); return }
      onCreated({ ...data, agent_permissions: {}, organisation_name: orgs.find(o => o.id === Number(orgId))?.name ?? null })
      onClose()
    } catch { setError('Erreur réseau') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">Créer un utilisateur</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nom</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          {isAdmin && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Rôle</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 outline-none">
                  <option value="member">Membre</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Organisation</label>
                <select value={orgId} onChange={e => setOrgId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 outline-none">
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            {loading ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Create org modal ──────────────────────────────────────────────────────────

function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: (org: OrgInfo) => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiRequest('/api/admin/organisations', {
        method: 'POST',
        body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/\s+/g, '-') }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Erreur'); return }
      onCreated(data)
      onClose()
    } catch { setError('Erreur réseau') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">Créer une organisation</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nom</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Slug (optionnel)</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-généré"
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            {loading ? 'Création...' : 'Créer l\'organisation'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoading, canManage, isAdmin } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<'users' | 'orgs'>('users')
  const [users, setUsers] = useState<UserRow[]>([])
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [search, setSearch] = useState('')
  const [savingRole, setSavingRole] = useState<number | null>(null)
  const [savingOrg, setSavingOrg] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || !canManage)) router.replace('/')
  }, [user, isLoading, canManage, router])

  useEffect(() => {
    if (!canManage) return
    const fetches: Promise<void>[] = [
      apiRequest('/api/admin/users').then(r => r.json()).then(setUsers),
      apiRequest('/api/agents').then(r => r.json()).then((a: { id: string; name: string; tools?: string[] }[]) =>
        setAgents(a.map(ag => ({ id: ag.id, name: ag.name, tools: ag.tools ?? [] })))),
    ]
    if (isAdmin) {
      fetches.push(apiRequest('/api/admin/organisations').then(r => r.json()).then(setOrgs))
    }
    Promise.all(fetches).finally(() => setLoadingData(false))
  }, [canManage, isAdmin])

  const updatePermission = async (userId: number, agentId: string, canAccess: boolean, toolPerms: Record<string, boolean>) => {
    await apiRequest(`/api/admin/users/${userId}/permissions/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify({ can_access: canAccess, tool_permissions: toolPerms }),
    })
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u
      return { ...u, agent_permissions: { ...u.agent_permissions, [agentId]: { can_access: canAccess, tool_permissions: toolPerms } } }
    }))
    if (selectedUser?.id === userId) {
      setSelectedUser(prev => prev ? {
        ...prev,
        agent_permissions: { ...prev.agent_permissions, [agentId]: { can_access: canAccess, tool_permissions: toolPerms } },
      } : prev)
    }
  }

  const updateRole = async (userId: number, role: string) => {
    setSavingRole(userId)
    const res = await apiRequest(`/api/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, role } : prev)
    }
    setSavingRole(null)
  }

  const updateOrg = async (userId: number, orgId: number) => {
    setSavingOrg(userId)
    const res = await apiRequest(`/api/admin/users/${userId}/org`, { method: 'PUT', body: JSON.stringify({ organisation_id: orgId }) })
    if (res.ok) {
      const orgName = orgs.find(o => o.id === orgId)?.name ?? null
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, organisation_id: orgId, organisation_name: orgName } : u))
    }
    setSavingOrg(null)
  }

  if (isLoading || !user || !canManage) return null

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const pageTitle = isAdmin ? 'Administration' : `Mon équipe — ${users[0]?.organisation_name ?? ''}`

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-sm font-semibold text-white">{pageTitle}</h1>
          <RoleBadge role={user.role} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Tabs (admin uniquement) */}
        {isAdmin && (
          <div className="flex gap-1 mb-6 border-b border-gray-800">
            {(['users', 'orgs'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  tab === t ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                {t === 'users' ? 'Utilisateurs' : 'Organisations'}
              </button>
            ))}
          </div>
        )}

        {/* ── Onglet Utilisateurs ── */}
        {(tab === 'users' || !isAdmin) && (
          <div>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <svg width="13" height="13" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 focus:border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white outline-none placeholder:text-gray-600"
                />
              </div>
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Ajouter
              </button>
            </div>

            {loadingData ? (
              <div className="text-xs text-gray-600 py-8 text-center">Chargement…</div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500">
                      <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
                      {isAdmin && <th className="text-left px-4 py-3 font-medium">Organisation</th>}
                      <th className="text-left px-4 py-3 font-medium">Rôle</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {filtered.map(u => (
                      <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{u.name}</p>
                          <p className="text-gray-500 text-[11px]">{u.email}</p>
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-3">
                            <select
                              value={u.organisation_id}
                              onChange={e => updateOrg(u.id, Number(e.target.value))}
                              disabled={savingOrg === u.id || u.role === 'admin'}
                              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 outline-none disabled:opacity-50"
                            >
                              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                          </td>
                        )}

                        <td className="px-4 py-3">
                          {isAdmin && u.role !== 'admin' ? (
                            <select
                              value={u.role}
                              onChange={e => updateRole(u.id, e.target.value)}
                              disabled={savingRole === u.id}
                              className="bg-gray-800 border border-gray-700 text-xs text-white rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="member">Membre</option>
                              <option value="owner">Owner</option>
                            </select>
                          ) : (
                            <RoleBadge role={u.role} />
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="text-[11px] text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-950/70 border border-blue-900/50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Droits agents
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600">Aucun utilisateur trouvé</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Organisations ── */}
        {tab === 'orgs' && isAdmin && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateOrg(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nouvelle organisation
              </button>
            </div>

            {loadingData ? (
              <div className="text-xs text-gray-600 py-8 text-center">Chargement…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {orgs.map(org => {
                  const members = users.filter(u => u.organisation_id === org.id)
                  const owner = members.find(u => u.role === 'owner')
                  return (
                    <div key={org.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{org.name}</p>
                          <p className="text-[11px] text-gray-600 font-mono">/{org.slug}</p>
                        </div>
                        <span className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">
                          {members.length} membre{members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {owner && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          Owner : <span className="text-gray-300">{owner.name}</span>
                        </div>
                      )}
                      {!owner && <p className="text-[11px] text-gray-600 italic">Aucun owner</p>}
                    </div>
                  )
                })}
                {orgs.length === 0 && <p className="text-xs text-gray-600 col-span-3">Aucune organisation.</p>}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {selectedUser && (
        <PermissionsPanel
          target={selectedUser}
          agents={agents}
          onClose={() => setSelectedUser(null)}
          onUpdate={updatePermission}
          readOnly={selectedUser.role === 'admin' || selectedUser.role === 'owner'}
        />
      )}

      {showCreateUser && (
        <CreateUserModal
          orgs={orgs.length ? orgs : [{ id: user.organisation_id, name: users[0]?.organisation_name ?? 'Mon org', slug: '' }]}
          isAdmin={isAdmin}
          defaultOrgId={isAdmin ? orgs[0]?.id ?? 1 : user.organisation_id}
          onClose={() => setShowCreateUser(false)}
          onCreated={u => setUsers(prev => [u, ...prev])}
        />
      )}

      {showCreateOrg && (
        <CreateOrgModal
          onClose={() => setShowCreateOrg(false)}
          onCreated={o => setOrgs(prev => [...prev, o])}
        />
      )}
    </div>
  )
}
