import { getAuthToken } from '../utils/authHelpers.js'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3000/api'

async function request(method, url, data, config = {}) {
  const { headers: extraHeaders, ...restConfig } = config || {}

  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  const token = getAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
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
