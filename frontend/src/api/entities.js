import api from './client.js'

const buildCharacterContextQuery = (params = {}) => {
  const searchParams = new URLSearchParams()
  const rawCharacterId =
    params.viewAsCharacterId ?? params.characterId ?? params.character_id ?? params.viewAs
  if (rawCharacterId !== undefined && rawCharacterId !== null) {
    const trimmed = String(rawCharacterId).trim()
    if (trimmed) {
      searchParams.set('viewAsCharacterId', trimmed)
    }
  }

  return searchParams.toString()
}

export const getWorldEntities = (worldId, params = {}) => {
  if (!worldId) {
    return Promise.reject(new Error('worldId is required to load entities'))
  }

  const queryString = buildCharacterContextQuery(params)
  const suffix = queryString ? `?${queryString}` : ''
  return api.get(`/worlds/${worldId}/entities${suffix}`)
}
export const getUnassignedEntities = () => api.get('/entities/unassigned')

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

export const uploadEntityImage = (entityId, file) => {
  if (!entityId) {
    return Promise.reject(new Error('entityId is required'))
  }
  if (!file) {
    return Promise.reject(new Error('file is required'))
  }

  const formData = new FormData()
  formData.append('file', file)

  return api.post(`/entities/${entityId}/image`, formData)
}

export const deleteEntityImage = (entityId) => {
  if (!entityId) {
    return Promise.reject(new Error('entityId is required'))
  }
  return api.delete(`/entities/${entityId}/image`)
}

export const fetchEntitySecrets = (id) => api.get(`/entities/${id}/secrets`)

export const createEntitySecret = (id, data) => api.post(`/entities/${id}/secrets`, data)

export const updateEntitySecret = (entityId, secretId, data) =>
  api.patch(`/entities/${entityId}/secrets/${secretId}`, data)

export const fetchEntityNotes = (id, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.get(`/entities/${id}/notes${queryString ? `?${queryString}` : ''}`)
}

export const fetchEntityMentionNotes = (id, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.get(
    `/entities/${id}/mentions/entity-notes${queryString ? `?${queryString}` : ''}`,
  )
}

export const fetchEntityMentionSessionNotes = (id, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.get(
    `/entities/${id}/mentions/session-notes${queryString ? `?${queryString}` : ''}`,
  )
}

export const createEntityNote = (id, data) => api.post(`/entities/${id}/notes`, data)

export const updateEntityNote = (entityId, noteId, data) =>
  api.patch(`/entities/${entityId}/notes/${noteId}`, data)

export const deleteEntityNote = (entityId, noteId, params = {}) => {
  const query = new URLSearchParams()
  const campaignId = params.campaignId ?? params.campaign_id
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  return api.delete(
    `/entities/${entityId}/notes/${noteId}${queryString ? `?${queryString}` : ''}`,
  )
}

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
