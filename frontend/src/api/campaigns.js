// src/api/campaigns.js
import { getAuthToken } from '../utils/authHelpers.js'

// ✅ Base URL with local fallback
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/campaigns`
  : 'http://localhost:3000/api/campaigns'

// 🔐 Wait for token if not immediately available (useful after reload)
async function waitForToken(retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    const token = getAuthToken()
    if (token) return token
    await new Promise(res => setTimeout(res, delay))
  }
  return null
}

// Build headers safely
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

// Standard response handler
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

export async function fetchCampaigns(params = {}) {
  const headers = await authHeaders()
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const queryString = query.toString()
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE
  const res = await fetch(url, { headers })
  return handleResponse(res, 'fetch campaigns')
}

export async function createCampaign(payload) {
  const headers = await authHeaders()
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'create campaign')
}

export async function updateCampaign(id, payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update campaign')
}

export async function removeCampaign(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'delete campaign')
}

export async function fetchCampaignEntityNotes(campaignId, params = {}) {
  if (!campaignId) {
    throw new Error('campaignId is required to fetch notes')
  }

  const headers = await authHeaders()
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    if (Array.isArray(value)) {
      value
        .map((entry) => (entry === undefined || entry === null ? '' : String(entry)))
        .filter((entry) => entry.trim() !== '')
        .forEach((entry) => {
          query.append(`${key}[]`, entry)
        })
      return
    }

    query.set(key, value)
  })

  const queryString = query.toString()
  const url = `${API_BASE}/${campaignId}/entity-notes${
    queryString ? `?${queryString}` : ''
  }`

  const res = await fetch(url, { headers })
  return handleResponse(res, 'fetch campaign entity notes')
}
