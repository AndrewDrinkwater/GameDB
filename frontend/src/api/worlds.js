// src/api/worlds.js
import { getAuthToken } from '../utils/authHelpers.js'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/worlds`
  : 'http://localhost:3000/api/worlds'

// Build request headers with auth
function authHeaders() {
  const token = getAuthToken()

  if (!token) {
    if (import.meta.env.DEV) console.warn('⚠️ Missing or invalid auth token')
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
  const res = await fetch(API_BASE, { headers: authHeaders() })
  return handleResponse(res, 'fetch worlds')
}

export async function createWorld(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'create world')
}

export async function updateWorld(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update world')
}

export async function removeWorld(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleResponse(res, 'delete world')
}
