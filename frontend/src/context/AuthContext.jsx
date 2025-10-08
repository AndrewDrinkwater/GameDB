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
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    // Handle network errors or non-JSON responses
    if (!res.ok) {
      console.error('Login request failed with status:', res.status)
      throw new Error(`Server responded with ${res.status}`)
    }

    // Try to parse response body
    const text = await res.text()
    console.log('Raw login response:', text)
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error('Invalid JSON response from server')
    }

    // Handle backend error
    if (!data.success) {
      console.warn('Login rejected by server:', data.message)
      throw new Error(data.message || 'Invalid credentials')
    }

    // Success — update context state
    setUser(data.user)
    setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('token', data.token)

    console.log('Login successful:', data.user)
    return true
  } catch (err) {
    console.error('Login error:', err.message)
    alert(`Login failed: ${err.message}`)
    return false
  }
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
