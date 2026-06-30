'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../components/AuthProvider'
import { apiRequest } from '../../lib/auth'

export default function AccountPage() {
  const { user, isLoading, refresh, logout, canManage } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<'mistral' | 'claude'>('mistral')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
    if (user) {
      setName(user.name)
      setProvider(user.preferred_provider)
    }
  }, [user, isLoading, router])

  if (isLoading || !user) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await apiRequest('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name, preferred_provider: provider }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.detail || 'Erreur')
        return
      }
      await refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <span className="text-gray-700 text-sm">/</span>
          <h1 className="text-sm font-semibold text-white">Mon compte</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profil */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Profil</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nom</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-gray-800/50 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Fournisseur LLM préféré</label>
              <div className="flex gap-3">
                {(['mistral', 'claude'] as const).map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value={p}
                      checked={provider === p}
                      onChange={() => setProvider(p)}
                      className="accent-blue-500"
                    />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      p === 'mistral'
                        ? 'bg-orange-950/60 border-orange-900/60 text-orange-400'
                        : 'bg-violet-950/60 border-violet-900/60 text-violet-400'
                    }`}>{p}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              {saved && <span className="text-emerald-400 text-xs flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                Sauvegardé
              </span>}
            </div>
          </form>
        </section>

        {/* Informations du compte */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Informations</h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-xs">
              <dt className="text-gray-500">Rôle</dt>
              <dd className="text-gray-300">
                {user.role === 'admin' ? 'Administrateur' : user.role === 'owner' ? 'Owner' : 'Membre'}
              </dd>
            </div>
            <div className="flex justify-between text-xs">
              <dt className="text-gray-500">Organisation</dt>
              <dd className="text-gray-300">#{user.organisation_id}</dd>
            </div>
          </dl>
        </section>

        {/* Déconnexion */}
        <section>
          <button
            onClick={() => { logout(); router.push('/') }}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 bg-gray-900 hover:bg-gray-800 border border-gray-800 px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Se déconnecter
          </button>
        </section>
      </main>
    </div>
  )
}
