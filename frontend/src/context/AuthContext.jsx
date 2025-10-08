import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  // Try to load saved session from localStorage on startup
  useEffect(() => {
    const stored = localStorage.getItem('gamedb_session')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUser(parsed.user)
      setToken(parsed.token)
    }
  }, [])

  // Persist to localStorage when token changes
  useEffect(() => {
    if (token && user) {
      localStorage.setItem('gamedb_session', JSON.stringify({ user, token }))
    } else {
      localStorage.removeItem('gamedb_session')
    }
  }, [token, user])

  // Login
  const login = async (username, password) => {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message || 'Login failed')

    setUser(data.user)
    setToken(data.token)
  }

  // Logout
  const logout = () => {
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
