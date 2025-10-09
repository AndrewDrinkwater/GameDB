// src/api/userCampaignRoles.js
import { getAuthToken } from '../utils/authHelpers.js'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/user-campaign-roles`
  : 'http://localhost:3000/api/user-campaign-roles'

async function waitForToken(retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    const token = getAuthToken()
    if (token) return token
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  return null
}

async function authHeaders() {
  const token = await waitForToken()
  if (!token) throw new Error('Missing or invalid token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function handleResponse(res, action = 'request') {
  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to ${action}: ${res.status} ${text}`)
  }

  return res.json()
}

export async function fetchAssignmentsByCampaign(campaignId) {
  if (!campaignId) throw new Error('campaignId is required')
  const headers = await authHeaders()
  const url = new URL(API_BASE)
  url.searchParams.set('campaign_id', campaignId)
  const res = await fetch(url.toString(), { headers })
  return handleResponse(res, 'load campaign members')
}

export async function addUserToCampaign(payload) {
  const headers = await authHeaders()
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'add user to campaign')
}

export async function updateCampaignAssignment(id, payload) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse(res, 'update campaign assignment')
}

export async function removeUserFromCampaign(id) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res, 'remove user from campaign')
}
