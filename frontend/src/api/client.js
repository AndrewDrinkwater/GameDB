import { getAuthToken } from '../utils/authHelpers.js'

const apiEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
const apiBase = apiEnv?.VITE_API_URL || apiEnv?.VITE_API_BASE

function normalizeApiBase(base) {
  if (!base) return null

  const trimmed = base.replace(/\/+$/, '')
  if (trimmed.endsWith('/api')) {
    return trimmed
  }

  return `${trimmed}/api`
}

const API_BASE = normalizeApiBase(apiBase) || 'http://localhost:3000/api'

const CAMPAIGN_CONTEXT_STORAGE_KEY = 'gamedb_campaign_context'
const CAMPAIGN_CONTEXT_HEADER = 'X-Campaign-Context-Id'

async function request(method, url, data, config = {}) {
  const { headers: extraHeaders, ...restConfig } = config || {}

  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...extraHeaders,
  }

  const token = getAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const storedContextId = localStorage.getItem(CAMPAIGN_CONTEXT_STORAGE_KEY)
    if (storedContextId) {
      headers[CAMPAIGN_CONTEXT_HEADER] = storedContextId
    }
  } catch (err) {
    console.warn('⚠️ Unable to include campaign context header', err)
  }

  const body = (() => {
    if (data === undefined) return undefined
    if (isFormData) return data
    return JSON.stringify(data)
  })()

  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body,
    ...restConfig,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('gamedb_session')
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }, 150)
    }

    const message =
      (isJson && payload?.message) ||
      (typeof payload === 'string' ? payload : 'Request failed')

    throw new Error(message)
  }

  return payload
}

const api = {
  get: (url, config) => request('GET', url, undefined, config),
  post: (url, data, config) => request('POST', url, data, config),
  patch: (url, data, config) => request('PATCH', url, data, config),
  delete: (url, config) => request('DELETE', url, undefined, config),
}

export default api
