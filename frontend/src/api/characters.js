// src/api/characters.js
import { getAuthToken } from '../utils/authHelpers.js'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/characters`
  : 'http://localhost:3000/api/characters'

async function waitForToken(retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    const token = getAuthToken()
    if (token) return token
    await new Promise((res) => setTimeout(res, delay))
  }
  return null
}

async function authHeaders() {
  const token = await waitForToken()
  if (!token) {
    if (import.meta.env.DEV) console.warn('⚠️ Missing auth token for character request')
    throw new Error('Missing or invalid token')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

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

export async function fetchCharacters() {
  const headers = await authHeaders()
  const res = await fetch(API_BASE, { headers })
  return handleResponse(res, 'fetch characters')
}

export async function createCharacter(payload) {
  const headers = await authHeaders()
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'create character')
}

export async function updateCharacter(id, payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update character')
}

export async function removeCharacter(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'delete character')
}
