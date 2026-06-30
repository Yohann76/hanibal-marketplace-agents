const TOKEN_KEY = 'oc_auth_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  document.cookie = `authToken=${token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  document.cookie = 'authToken=; path=/; max-age=0'
}

export interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'org_admin' | 'super_admin'
  organisation_id: number
  preferred_provider: 'mistral' | 'claude'
  features: Record<string, unknown>
}

export async function fetchCurrentUser(token: string): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(path, { ...options, headers })
}
