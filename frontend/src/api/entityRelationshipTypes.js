import api from './client.js'

const normaliseWorldId = (input) => {
  if (input === undefined || input === null) return ''
  return String(input).trim()
}

export const getRelationshipTypes = (criteria) => {
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

  return api.get(`/entity-relationship-types${suffix}`)
}

export const getRelationshipType = (id) => api.get(`/entity-relationship-types/${id}`)
export const createRelationshipType = (data) => api.post('/entity-relationship-types', data)
export const updateRelationshipType = (id, data) => api.patch(`/entity-relationship-types/${id}`, data)
export const deleteRelationshipType = (id) => api.delete(`/entity-relationship-types/${id}`)
