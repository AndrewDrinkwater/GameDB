import api from './client.js'

export const applyBulkAccessUpdate = (payload) => api.post('/access/bulk/apply', payload)

export const fetchBulkAccessRuns = ({ worldId }) => {
  if (!worldId) {
    return Promise.reject(new Error('worldId is required'))
  }
  const params = new URLSearchParams({ worldId })
  return api.get(`/access/bulk/runs?${params.toString()}`)
}

export const fetchBulkAccessRunDetail = (runId) => {
  if (!runId) {
    return Promise.reject(new Error('runId is required'))
  }
  return api.get(`/access/bulk/runs/${runId}`)
}

export const revertBulkAccessRun = (runId) => {
  if (!runId) {
    return Promise.reject(new Error('runId is required'))
  }
  return api.post(`/access/bulk/runs/${runId}/revert`)
}

export const fetchCollections = (worldId) => {
  if (!worldId) {
    return Promise.reject(new Error('worldId is required'))
  }
  const params = new URLSearchParams({ worldId })
  return api.get(`/access/collections?${params.toString()}`)
}

export const createCollection = (payload) => api.post('/access/collections', payload)

export const updateCollection = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error('Collection id is required'))
  }
  return api.put(`/access/collections/${id}`, payload)
}

export const deleteCollection = (id) => {
  if (!id) {
    return Promise.reject(new Error('Collection id is required'))
  }
  return api.delete(`/access/collections/${id}`)
}

export const resolveCollectionEntities = (id) => {
  if (!id) {
    return Promise.reject(new Error('Collection id is required'))
  }
  return api.get(`/access/collections/${id}/entities`)
}
