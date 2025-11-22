// src/api/auth.js
import { getAuthToken } from '../utils/authHelpers.js'
import { API_BASE } from './config.js'

function authHeaders() {
  const token = getAuthToken()
  if (!token) throw new Error('Missing or invalid token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function handleResponse(res, action = 'request') {
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(data.message || `Failed to ${action}`)
  }
  return res.json()
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  return handleResponse(res, 'change password')
}
