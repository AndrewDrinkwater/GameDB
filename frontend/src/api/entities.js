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
