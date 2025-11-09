import api from './client.js'

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

export const fetchEntitySecrets = (id) => api.get(`/entities/${id}/secrets`)

export const createEntitySecret = (id, data) => api.post(`/entities/${id}/secrets`, data)

export const updateEntitySecret = (entityId, secretId, data) =>
  api.patch(`/entities/${entityId}/secrets/${secretId}`, data)

export const getEntityGraph = async (entityId, depth = 1) => {
  const params = new URLSearchParams()
  if (depth !== undefined && depth !== null) {
    const resolved = Number(depth)
    if (!Number.isNaN(resolved) && resolved > 0) {
      params.set('depth', String(resolved))
    }
  }

  const query = params.toString()

  const payload = await api.get(
    `/entities/${entityId}/graph${query ? `?${query}` : ''}`,
    {
      credentials: 'include',
    }
  )
  if (!payload?.success) {
    throw new Error(payload?.message || 'Failed to load graph')
  }

  return payload.data
}
