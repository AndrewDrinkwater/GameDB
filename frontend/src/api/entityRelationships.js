import api from './client.js'

export const getRelationships = (worldId) =>
  api.get(`/entity-relationships?worldId=${worldId}`)

export const getRelationship = (id) => api.get(`/entity-relationships/${id}`)

export const createRelationship = (data) => api.post('/entity-relationships', data)

export const updateRelationship = (id, data) =>
  api.patch(`/entity-relationships/${id}`, data)

export const deleteRelationship = (id) =>
  api.delete(`/entity-relationships/${id}`)
