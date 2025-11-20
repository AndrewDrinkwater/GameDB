import api from './client.js'

export const fetchNotifications = (params = {}) => {
  const query = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const queryString = query.toString()
  const url = queryString ? `/notifications?${queryString}` : '/notifications'
  return api.get(url)
}

export const markNotificationRead = (notificationId) => {
  return api.patch(`/notifications/${notificationId}/read`)
}

export const markAllNotificationsRead = (params = {}) => {
  const query = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const queryString = query.toString()
  const url = queryString ? `/notifications/read-all?${queryString}` : '/notifications/read-all'
  return api.patch(url)
}

export const getUnreadCount = (params = {}) => {
  const query = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const queryString = query.toString()
  const url = queryString ? `/notifications/unread-count?${queryString}` : '/notifications/unread-count'
  return api.get(url)
}

