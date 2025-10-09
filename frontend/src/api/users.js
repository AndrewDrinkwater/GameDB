// src/api/users.js
import { getAuthToken } from '../utils/authHelpers.js'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/users`
  : 'http://localhost:3000/api/users'

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
    const text = await res.text()
    throw new Error(`Failed to ${action}: ${text}`)
  }
  return res.json()
}

export async function fetchUsers() {
  const res = await fetch(API_BASE, { headers: authHeaders() })
  return handleResponse(res, 'fetch users')
}

export async function createUser(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'create user')
}

export async function updateUser(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update user')
}

export async function removeUser(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return handleResponse(res, 'delete user')
}
