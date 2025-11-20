import api from './client.js'

export const followEntity = (entityId, campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/entities/${entityId}/follow?${queryString}` : `/entities/${entityId}/follow`
  return api.post(url)
}

export const unfollowEntity = (entityId, campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/entities/${entityId}/follow?${queryString}` : `/entities/${entityId}/follow`
  return api.delete(url)
}

export const getFollowedEntities = (campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/entities/followed?${queryString}` : '/entities/followed'
  return api.get(url)
}

export const checkFollowStatus = (entityId, campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/entities/${entityId}/follow-status?${queryString}` : `/entities/${entityId}/follow-status`
  return api.get(url)
}

