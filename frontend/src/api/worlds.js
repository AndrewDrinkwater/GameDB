import { getAuthToken } from '../utils/authHelpers.js'

const API_BASE = `${import.meta.env.VITE_API_BASE}/worlds`

export async function fetchWorlds() {
  const token = getAuthToken()
  if (!token) throw new Error('Missing or invalid token')

  const res = await fetch(API_BASE, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error(`Failed to fetch worlds: ${res.status}`)
  return res.json()
}

export async function createWorld(payload) {
  const token = getAuthToken()
  if (!token) throw new Error('Missing or invalid token')

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`Failed to create world: ${res.status}`)
  return res.json()
}

export async function updateWorld(id, payload) {
  const token = getAuthToken()
  if (!token) throw new Error('Missing or invalid token')

  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`Failed to update world: ${res.status}`)
  return res.json()
}
