// src/api/locationTypes.js
import { getAuthToken } from '../utils/authHelpers.js'
import { API_BASE } from './config.js'
import api from './client.js'

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

// === Location Type API methods ===

export async function fetchLocationTypes(params = {}) {
  const headers = await authHeaders()
  const queryParams = new URLSearchParams()
  
  if (params.worldId) queryParams.append('worldId', params.worldId)
  if (params.includeFields) queryParams.append('includeFields', params.includeFields)
  
  const queryString = queryParams.toString()
  const url = `${API_BASE}/location-types${queryString ? `?${queryString}` : ''}`
  
  const res = await fetch(url, { headers })
  return handleResponse(res, 'fetch location types')
}

export async function fetchLocationTypeById(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/location-types/${id}`, { headers })
  return handleResponse(res, 'fetch location type')
}

export async function createLocationType(payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/location-types`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'create location type')
}

export async function updateLocationType(id, payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/location-types/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update location type')
}

export async function deleteLocationType(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/location-types/${id}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'delete location type')
}

export async function getWorldLocationTypeUsage(worldId, params = {}) {
  if (!worldId) {
    return Promise.reject(new Error('worldId is required to load location type usage'))
  }

  const searchParams = new URLSearchParams()

  const rawCharacterId =
    params.viewAsCharacterId ?? params.characterId ?? params.character_id ?? params.viewAs
  if (rawCharacterId !== undefined && rawCharacterId !== null) {
    const trimmed = String(rawCharacterId).trim()
    if (trimmed) {
      searchParams.set('viewAsCharacterId', trimmed)
    }
  }

  const queryString = searchParams.toString()
  const suffix = queryString ? `?${queryString}` : ''
  return api.get(`/worlds/${worldId}/location-types${suffix}`)
}

