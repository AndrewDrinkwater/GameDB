// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)

  // --- Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('gamedb_session')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed.user)
        setToken(parsed.token)
      } catch (err) {
        console.warn('Invalid stored session, clearing...')
        localStorage.removeItem('gamedb_session')
      }
    }
    setSessionReady(true) // ✅ Always mark complete after attempt
  }, [])

  // --- Persist session to localStorage
  useEffect(() => {
    if (token && user) {
      localStorage.setItem('gamedb_session', JSON.stringify({ user, token }))
    } else {
      localStorage.removeItem('gamedb_session')
    }
  }, [token, user])

  // --- Login
  const login = async (username, password) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      console.log('🔐 Raw login response:', data)

      if (!data.success) throw new Error(data.message || 'Invalid credentials')

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem(
        'gamedb_session',
        JSON.stringify({ user: data.user, token: data.token })
      )

      console.log('✅ Login successful:', data.user)
      return true
    } catch (err) {
      console.error('❌ Login error:', err.message)
      alert(`Login failed: ${err.message}`)
      return false
    }
  }

  // --- Logout
  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('gamedb_session')
  }

  return (
    <AuthContext.Provider value={{ user, token, sessionReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
