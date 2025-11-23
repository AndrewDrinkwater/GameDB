import api from './client.js'

export const followLocation = (locationId, campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/locations/${locationId}/follow?${queryString}` : `/locations/${locationId}/follow`
  return api.post(url)
}

export const unfollowLocation = (locationId, campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/locations/${locationId}/follow?${queryString}` : `/locations/${locationId}/follow`
  return api.delete(url)
}

export const getFollowedLocations = (campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/locations/followed?${queryString}` : '/locations/followed'
  return api.get(url)
}

export const checkLocationFollowStatus = (locationId, campaignId) => {
  const query = new URLSearchParams()
  if (campaignId) {
    query.set('campaignId', campaignId)
  }

  const queryString = query.toString()
  const url = queryString ? `/locations/${locationId}/follow-status?${queryString}` : `/locations/${locationId}/follow-status`
  return api.get(url)
}

