import api from './client.js'

export const getFields = (typeId) => api.get(`/entity-types/${typeId}/fields`)

export const createField = (typeId, data) =>
  api.post(`/entity-types/${typeId}/fields`, data)

export const updateField = (id, data) => api.patch(`/entity-type-fields/${id}`, data)

export const deleteField = (id) => api.delete(`/entity-type-fields/${id}`)
