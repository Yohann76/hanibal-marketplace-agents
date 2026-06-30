'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

const ROLE_CHIP: Record<string, string> = {
  admin: 'bg-red-950 border-red-800 text-red-400',
  owner: 'bg-violet-950 border-violet-800 text-violet-400',
  member: 'bg-gray-800 border-gray-700 text-gray-400',
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  owner: 'Owner',
  member: 'Membre',
}

export default function UserMenu() {
  const { user, canManage, isAdmin, logout, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (isLoading) return null

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-xs text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 px-3 py-2 rounded-lg transition-all"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-all font-medium"
        >
          S'inscrire
        </Link>
      </div>
    )
  }

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const chipClass = ROLE_CHIP[user.role] ?? ROLE_CHIP.member
  const roleLabel = ROLE_LABEL[user.role] ?? user.role

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 px-2.5 py-1.5 rounded-lg transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {initials}
        </div>
        <span className="max-w-[120px] truncate">{user.name}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* En-tête utilisateur */}
          <div className="px-3 py-2.5 border-b border-gray-800">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-[11px] text-gray-500 truncate mb-1">{user.email}</p>
            <span className={`inline-block text-[10px] border px-1.5 py-0.5 rounded-full font-medium ${chipClass}`}>
              {roleLabel}
            </span>
          </div>

          {/* Navigation */}
          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Mon compte
            </Link>

            {canManage && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {isAdmin ? 'Administration' : 'Mon équipe'}
              </Link>
            )}
          </div>

          {/* Déconnexion */}
          <div className="border-t border-gray-800 py-1">
            <button
              onClick={() => { logout(); setOpen(false); router.push('/') }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
