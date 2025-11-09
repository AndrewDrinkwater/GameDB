import api from './client.js'

const normaliseWorldId = (input) => {
  if (input === undefined || input === null) return ''
  const trimmed = String(input).trim()
  return trimmed
}

export const getEntityTypes = (criteria) => {
  let params = {}

  if (typeof criteria === 'string') {
    params = { worldId: criteria }
  } else if (criteria && typeof criteria === 'object' && !Array.isArray(criteria)) {
    params = { ...criteria }
  }

  const searchParams = new URLSearchParams()
  const worldId = normaliseWorldId(params.worldId ?? params.world_id)
  if (worldId) {
    searchParams.set('worldId', worldId)
  }

  const queryString = searchParams.toString()
  const suffix = queryString ? `?${queryString}` : ''
  return api.get(`/entity-types${suffix}`)
}

export const createEntityType = (data) => api.post('/entity-types', data)

export const getEntityType = (id) => api.get(`/entity-types/${id}`)

export const updateEntityType = (id, data) => api.patch(`/entity-types/${id}`, data)

export const deleteEntityType = (id) => api.delete(`/entity-types/${id}`)

export const getWorldEntityTypeUsage = (worldId) => api.get(`/worlds/${worldId}/entity-types`)

export const getEntityTypeListColumns = (id) => api.get(`/entity-types/${id}/list-columns`)

export const updateEntityTypeListColumns = (id, data) =>
  api.patch(`/entity-types/${id}/list-columns`, data)
