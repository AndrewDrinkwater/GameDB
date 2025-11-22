// src/api/locations.js
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

// === Location API methods ===

export async function fetchLocations(params = {}) {
  const headers = await authHeaders()
  const queryParams = new URLSearchParams()
  
  if (params.worldId) queryParams.append('worldId', params.worldId)
  if (params.parentId !== undefined) queryParams.append('parentId', params.parentId)
  if (params.locationTypeId) queryParams.append('locationTypeId', params.locationTypeId)
  if (params.includeEntities) queryParams.append('includeEntities', params.includeEntities)
  
  const queryString = queryParams.toString()
  const url = `${API_BASE}/locations${queryString ? `?${queryString}` : ''}`
  
  const res = await fetch(url, { headers })
  return handleResponse(res, 'fetch locations')
}

export async function fetchLocationById(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${id}`, { headers })
  return handleResponse(res, 'fetch location')
}

export async function fetchLocationPath(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${id}/path`, { headers })
  return handleResponse(res, 'fetch location path')
}

export async function fetchLocationEntities(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${id}/entities`, { headers })
  return handleResponse(res, 'fetch location entities')
}

export async function createLocation(payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'create location')
}

export async function updateLocation(id, payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update location')
}

export async function deleteLocation(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${id}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'delete location')
}

export async function moveEntityToLocation(entityId, locationId) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/entities/${entityId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ location_id: locationId }),
  })
  return handleResponse(res, 'move entity to location')
}

