import api from './client.js'

export const getRelationshipTypes = () => api.get('/entity-relationship-types')

export const getRelationshipType = (id) => api.get(`/entity-relationship-types/${id}`)
export const createRelationshipType = (data) => api.post('/entity-relationship-types', data)
export const updateRelationshipType = (id, data) => api.patch(`/entity-relationship-types/${id}`, data)
export const deleteRelationshipType = (id) => api.delete(`/entity-relationship-types/${id}`)
