import api from './client.js'

export const fetchRequestNotes = (requestId) => {
  return api.get(`/requests/${requestId}/notes`)
}

export const createRequestNote = (requestId, data) => {
  return api.post(`/requests/${requestId}/notes`, data)
}

export const updateRequestNote = (requestId, noteId, data) => {
  return api.patch(`/requests/${requestId}/notes/${noteId}`, data)
}

export const deleteRequestNote = (requestId, noteId) => {
  return api.delete(`/requests/${requestId}/notes/${noteId}`)
}

