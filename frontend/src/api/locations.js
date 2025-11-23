// src/api/locations.js
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

// === Location API methods ===

export async function fetchLocations(params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.worldId) queryParams.append('worldId', params.worldId)
  if (params.parentId !== undefined && params.parentId !== null) {
    queryParams.append('parentId', params.parentId)
  }
  if (params.locationTypeId) queryParams.append('locationTypeId', params.locationTypeId)
  if (params.includeEntities) queryParams.append('includeEntities', params.includeEntities)
  if (params.all) queryParams.append('all', params.all)
  
  const queryString = queryParams.toString()
  const url = `/locations${queryString ? `?${queryString}` : ''}`
  
  return api.get(url)
}

export async function searchLocations(params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.worldId) queryParams.append('worldId', params.worldId)
  if (params.query) queryParams.append('q', params.query)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.offset) queryParams.append('offset', params.offset)
  if (params.locationTypeIds) {
    const typeIds = Array.isArray(params.locationTypeIds)
      ? params.locationTypeIds.join(',')
      : params.locationTypeIds
    queryParams.append('locationTypeIds', typeIds)
  }
  
  const queryString = queryParams.toString()
  const url = `/locations/search${queryString ? `?${queryString}` : ''}`
  
  return api.get(url)
}

export async function fetchLocationById(id) {
  return api.get(`/locations/${id}`)
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
  return api.post('/locations', payload)
}

export async function updateLocation(id, payload) {
  return api.patch(`/locations/${id}`, payload)
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

export async function addEntityToLocation(locationId, entityId) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${locationId}/entities`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ entity_id: entityId }),
  })
  return handleResponse(res, 'add entity to location')
}

export async function removeEntityFromLocation(locationId, entityId) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${locationId}/entities/${entityId}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'remove entity from location')
}

export async function addChildLocation(parentLocationId, childLocationId) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${parentLocationId}/children`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ child_location_id: childLocationId }),
  })
  return handleResponse(res, 'add child location')
}

export async function removeChildLocation(parentLocationId, childLocationId) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/locations/${parentLocationId}/children/${childLocationId}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'remove child location')
}

export async function updateLocationImportance(locationId, importance) {
  return api.put(`/locations/${locationId}/importance`, { importance })
}

// Location notes
export const fetchLocationNotes = (id, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.get(`/locations/${id}/notes${queryString ? `?${queryString}` : ''}`)
}

export const fetchLocationMentionNotes = (id, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.get(`/locations/${id}/mention-notes${queryString ? `?${queryString}` : ''}`)
}

export const fetchLocationMentionSessionNotes = (id, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.get(
    `/locations/${id}/mentions/session-notes${queryString ? `?${queryString}` : ''}`,
  )
}

export const createLocationNote = (id, data) => api.post(`/locations/${id}/notes`, data)

export const updateLocationNote = (locationId, noteId, data) =>
  api.put(`/locations/${locationId}/notes/${noteId}`, data)

export const deleteLocationNote = (locationId, noteId, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.delete(`/locations/${locationId}/notes/${noteId}${queryString ? `?${queryString}` : ''}`)
}

