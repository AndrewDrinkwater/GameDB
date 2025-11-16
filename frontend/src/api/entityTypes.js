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

  if (!worldId) {
    return Promise.reject(new Error('worldId is required to list entity types'))
  }

  searchParams.set('worldId', worldId)

  const queryString = searchParams.toString()
  const suffix = queryString ? `?${queryString}` : ''
  return api.get(`/entity-types${suffix}`)
}

export const createEntityType = (data) => api.post('/entity-types', data)

export const getEntityType = (id) => api.get(`/entity-types/${id}`)

export const updateEntityType = (id, data) => api.patch(`/entity-types/${id}`, data)

export const deleteEntityType = (id) => api.delete(`/entity-types/${id}`)

const ensureEntityTypeId = (id, actionDescription = 'perform this action') => {
  if (id === undefined || id === null || id === '') {
    return Promise.reject(new Error(`Entity type id is required to ${actionDescription}`))
  }
  return null
}

export const getEntityTypeFieldOrder = (id) => {
  const validationError = ensureEntityTypeId(id, 'load entity type field order')
  if (validationError) {
    return validationError
  }
  return api.get(`/entity-types/${id}/field-order`)
}

export const getEntityTypeFieldRules = (id) => {
  const validationError = ensureEntityTypeId(id, 'load entity type field rules')
  if (validationError) {
    return validationError
  }
  return api.get(`/entity-types/${id}/field-rules`)
}

export const getWorldEntityTypeUsage = (worldId, params = {}) => {
  if (!worldId) {
    return Promise.reject(new Error('worldId is required to load entity type usage'))
  }

  const searchParams = new URLSearchParams()

  const rawCharacterId =
    params.viewAsCharacterId ?? params.characterId ?? params.character_id ?? params.viewAs
  if (rawCharacterId !== undefined && rawCharacterId !== null) {
    const trimmed = String(rawCharacterId).trim()
    if (trimmed) {
      searchParams.set('viewAsCharacterId', trimmed)
    }
  }

  const queryString = searchParams.toString()
  const suffix = queryString ? `?${queryString}` : ''
  return api.get(`/worlds/${worldId}/entity-types${suffix}`)
}

export const getEntityTypeListColumns = (id) => api.get(`/entity-types/${id}/list-columns`)

export const updateEntityTypeListColumns = (id, data) =>
  api.patch(`/entity-types/${id}/list-columns`, data)
