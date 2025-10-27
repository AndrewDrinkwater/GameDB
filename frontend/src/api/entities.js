import axios from 'axios'
import api from './client.js'
import { getAuthToken } from '../utils/authHelpers.js'

export const getWorldEntities = (worldId) => api.get(`/worlds/${worldId}/entities`)

export const getEntity = (id) => api.get(`/entities/${id}`)

export const searchEntities = ({ worldId, query, typeIds = [], limit = 20, offset = 0 }) => {
  if (!worldId) {
    return Promise.reject(new Error('worldId is required'))
  }

  const params = new URLSearchParams()
  params.set('worldId', worldId)

  if (query) {
    params.set('q', query)
  }

  const resolvedTypeIds = Array.isArray(typeIds) ? typeIds : [typeIds]
  resolvedTypeIds
    .map((value) => (value === undefined || value === null ? '' : String(value).trim()))
    .filter(Boolean)
    .forEach((value) => {
      params.append('typeIds[]', value)
    })

  if (limit !== undefined && limit !== null) {
    params.set('limit', limit)
  }

  if (offset !== undefined && offset !== null) {
    params.set('offset', offset)
  }

  const queryString = params.toString()
  return api.get(`/entities/search${queryString ? `?${queryString}` : ''}`)
}

export const createEntity = (data) => api.post('/entities', data)

export const updateEntity = (id, data) => api.patch(`/entities/${id}`, data)

export const deleteEntity = (id) => api.delete(`/entities/${id}`)

export const getEntityGraph = async (entityId) => {
  const token = getAuthToken()
  const response = await axios.get(`/api/entities/${entityId}/graph`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    withCredentials: true,
  })

  const payload = response?.data
  if (!payload?.success) {
    throw new Error(payload?.message || 'Failed to load graph')
  }

  return payload.data
}
