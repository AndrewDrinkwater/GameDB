// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { token, sessionReady } = useAuth()

  // Wait for session to finish restoring before deciding
  if (!sessionReady) return <p>Restoring session...</p>

  // If no token, redirect to login
  if (!token) return <Navigate to="/login" replace />

  // Otherwise, render the protected page
  return children
}
