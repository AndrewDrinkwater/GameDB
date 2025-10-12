import api from './client.js'

export const getEntityTypes = () => api.get('/entity-types')

export const createEntityType = (data) => api.post('/entity-types', data)

export const getEntityType = (id) => api.get(`/entity-types/${id}`)

export const updateEntityType = (id, data) => api.patch(`/entity-types/${id}`, data)

export const deleteEntityType = (id) => api.delete(`/entity-types/${id}`)

export const getWorldEntityTypeUsage = (worldId) => api.get(`/worlds/${worldId}/entity-types`)

export const getEntityTypeListColumns = (id) => api.get(`/entity-types/${id}/list-columns`)

export const updateEntityTypeListColumns = (id, data) =>
  api.patch(`/entity-types/${id}/list-columns`, data)
