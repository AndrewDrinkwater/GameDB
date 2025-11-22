// src/api/worlds.js
import { getAuthToken } from '../utils/authHelpers.js'
import { API_BASE } from './config.js'

// 🔐 Safe token getter that waits for localStorage if necessary
async function waitForToken(retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    const token = getAuthToken()
    if (token) return token
    await new Promise(res => setTimeout(res, delay))
  }
  return null
}

// Build request headers with auth, safely
async function authHeaders() {
  const token = await waitForToken()

  if (!token) {
    if (import.meta.env.DEV) console.warn('⚠️ Missing or invalid auth token after wait')
    throw new Error('Missing or invalid token')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// Handle API responses consistently
async function handleResponse(res, action = 'request') {
  if (res.status === 401) {
    console.warn(`🔒 Unauthorized during ${action}, clearing session`)
    localStorage.removeItem('gamedb_session')
    window.location.reload()
    throw new Error('Session expired or unauthorized')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to ${action}: ${res.status} ${text}`)
  }

  return res.json()
}

// === API methods ===

export async function fetchWorlds() {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/worlds`, { headers })
  return handleResponse(res, 'fetch worlds')
}

export async function createWorld(payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/worlds`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'create world')
}

export async function updateWorld(id, payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/worlds/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update world')
}

export async function removeWorld(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/worlds/${id}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'delete world')
}
