// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)

  // ✅ Default API base (so reloads always work)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

  // --- Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gamedb_session')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.user && parsed?.token) {
          setUser(parsed.user)
          setToken(parsed.token)
        } else {
          console.warn('⚠️ Incomplete session found, clearing...')
          localStorage.removeItem('gamedb_session')
        }
      }
    } catch (err) {
      console.warn('⚠️ Invalid stored session, clearing...', err)
      localStorage.removeItem('gamedb_session')
    } finally {
      setSessionReady(true)
    }
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
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      console.log('🔐 Raw login response:', data)

      if (!data.success || !data.token) {
        throw new Error(data.message || 'Invalid credentials')
      }

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

  // 🕐 Prevent blank page on reload: delay render until restored
  if (!sessionReady) {
    return <div className="loading-screen">Loading session...</div>
  }

  return (
    <AuthContext.Provider value={{ user, token, sessionReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
