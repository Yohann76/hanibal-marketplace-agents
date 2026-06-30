'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getToken, setToken, clearToken, fetchCurrentUser, User } from '../lib/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAdmin: boolean    // rôle 'admin' uniquement — gestion de l'application
  isOwner: boolean    // rôle 'owner' — gestion de son organisation
  canManage: boolean  // isAdmin || isOwner
  login: (token: string, user: User) => void
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isAdmin: false,
  isOwner: false,
  canManage: false,
  login: () => {},
  logout: () => {},
  refresh: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const t = getToken()
    if (!t) { setIsLoading(false); return }
    const u = await fetchCurrentUser(t)
    if (u) {
      setUser(u)
      setTokenState(t)
    } else {
      clearToken()
      setUser(null)
      setTokenState(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = useCallback((t: string, u: User) => {
    setToken(t)
    setTokenState(t)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setTokenState(null)
  }, [])

  const isAdmin = user?.role === 'admin'
  const isOwner = user?.role === 'owner'
  const canManage = isAdmin || isOwner

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAdmin, isOwner, canManage, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}
