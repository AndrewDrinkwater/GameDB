import api from './client.js'

export const fetchRequests = (params = {}) => {
  const query = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const queryString = query.toString()
  const url = queryString ? `/requests?${queryString}` : '/requests'
  return api.get(url)
}

export const getRequest = (requestId) => {
  return api.get(`/requests/${requestId}`)
}

export const createRequest = (data) => {
  return api.post('/requests', data)
}

export const updateRequest = (requestId, data) => {
  return api.patch(`/requests/${requestId}`, data)
}

export const deleteRequest = (requestId) => {
  return api.delete(`/requests/${requestId}`)
}

