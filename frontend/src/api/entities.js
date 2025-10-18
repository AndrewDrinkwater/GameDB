// src/api/entities.js
import api from './client.js'

// ────────────────────────────────
// 🌍 Core Entity API
// ────────────────────────────────

export const getWorldEntities = (worldId) =>
  api.get(`/worlds/${worldId}/entities`)

export const getEntity = (id) => api.get(`/entities/${id}`)

export const searchEntities = ({
  worldId,
  query,
  typeIds = [],
  limit = 20,
  offset = 0,
}) => {
  if (!worldId) {
    return Promise.reject(new Error('worldId is required'))
  }

  const params = new URLSearchParams()
  params.set('worldId', worldId)

  if (query) params.set('q', query)

  const resolvedTypeIds = Array.isArray(typeIds) ? typeIds : [typeIds]
  resolvedTypeIds
    .map((value) =>
      value === undefined || value === null ? '' : String(value).trim()
    )
    .filter(Boolean)
    .forEach((value) => {
      params.append('typeIds[]', value)
    })

  if (limit !== undefined && limit !== null) params.set('limit', limit)
  if (offset !== undefined && offset !== null) params.set('offset', offset)

  const queryString = params.toString()
  return api.get(`/entities/search${queryString ? `?${queryString}` : ''}`)
}

export const createEntity = (data) => api.post('/entities', data)

export const updateEntity = (id, data) => api.patch(`/entities/${id}`, data)

export const deleteEntity = (id) => api.delete(`/entities/${id}`)

// ────────────────────────────────
// 🧠 Entity Explorer Graph API
// ────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Safely extract token from localStorage (handles JSON parsing)
function getSessionToken() {
  try {
    const raw = localStorage.getItem('gamedb_session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.token || null
  } catch (err) {
    console.warn('⚠️ Invalid gamedb_session format:', err)
    return null
  }
}

export async function getEntityGraph(worldId, entityId) {
  const token = getSessionToken()

  if (!token) {
    console.warn('⚠️ No valid session token found, cannot load graph')
    throw new Error('Missing session token')
  }

  const res = await fetch(
    `${API_BASE}/api/worlds/${worldId}/entities/${entityId}/explore`,
    {
      headers: {
        'Content-Type': 'application/json',
        gamedb_session: token, // ✅ backend expects this header
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('❌ Invalid response:', text)
    throw new Error(`Failed to load graph: ${res.status}`)
  }

  return res.json()
}
