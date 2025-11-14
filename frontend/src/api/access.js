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
