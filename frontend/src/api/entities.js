import api from './client.js'

export const getWorldEntities = (worldId) => api.get(`/worlds/${worldId}/entities`)

export const getEntity = (id) => api.get(`/entities/${id}`)

export const createEntity = (data) => api.post('/entities', data)

export const updateEntity = (id, data) => api.patch(`/entities/${id}`, data)

export const deleteEntity = (id) => api.delete(`/entities/${id}`)
