import api from './client.js'

export const getEntityTypes = () => api.get('/entity-types')

export const createEntityType = (data) => api.post('/entity-types', data)

export const updateEntityType = (id, data) => api.patch(`/entity-types/${id}`, data)

export const deleteEntityType = (id) => api.delete(`/entity-types/${id}`)
