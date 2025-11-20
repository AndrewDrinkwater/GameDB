import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import { fetchNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../api/notifications.js'

const NotificationContext = createContext(null)

const POLL_INTERVAL = 30000 // 30 seconds
const INACTIVE_POLL_INTERVAL = 120000 // 2 minutes when tab is inactive

export function NotificationProvider({ children }) {
  const { user, sessionReady } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pollingIntervalRef = useRef(null)
  const lastPollTimeRef = useRef(null)
  const isActiveRef = useRef(true)

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden
      if (!document.hidden && lastPollTimeRef.current) {
        // If tab becomes active and it's been a while, poll immediately
        const timeSinceLastPoll = Date.now() - lastPollTimeRef.current
        if (timeSinceLastPoll > POLL_INTERVAL) {
          loadNotifications()
          loadUnreadCount()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    if (!user?.id || !sessionReady) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetchNotifications({ limit: 50 })
      const data = Array.isArray(response?.data) ? response.data : []
      setNotifications(data)
      lastPollTimeRef.current = Date.now()
    } catch (err) {
      console.error('❌ Failed to load notifications', err)
      setError(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user?.id, sessionReady])

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id || !sessionReady) {
      setUnreadCount(0)
      return
    }

    try {
      const response = await getUnreadCount()
      const count = response?.count ?? 0
      setUnreadCount(count)
    } catch (err) {
      console.error('❌ Failed to load unread count', err)
      // Don't set error state for unread count failures
    }
  }, [user?.id, sessionReady])

  const refresh = useCallback(() => {
    loadNotifications()
    loadUnreadCount()
  }, [loadNotifications, loadUnreadCount])

  const markRead = useCallback(async (notificationId) => {
    if (!notificationId) return

    try {
      await markNotificationRead(notificationId)
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n,
        ),
      )
      
      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('❌ Failed to mark notification read', err)
      throw err
    }
  }, [])

  const markAllRead = useCallback(async (filters = {}) => {
    try {
      await markAllNotificationsRead(filters)
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })),
      )
      
      // Reset unread count
      setUnreadCount(0)
    } catch (err) {
      console.error('❌ Failed to mark all notifications read', err)
      throw err
    }
  }, [])

  // Set up polling
  useEffect(() => {
    if (!user?.id || !sessionReady) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setNotifications([])
      setUnreadCount(0)
      return
    }

    // Initial load
    loadNotifications()
    loadUnreadCount()

    // Set up polling interval
    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      const interval = isActiveRef.current ? POLL_INTERVAL : INACTIVE_POLL_INTERVAL

      pollingIntervalRef.current = setInterval(() => {
        if (isActiveRef.current) {
          loadUnreadCount()
          // Only reload full notifications list occasionally to reduce load
          if (!lastPollTimeRef.current || Date.now() - lastPollTimeRef.current > POLL_INTERVAL * 2) {
            loadNotifications()
          }
        } else {
          loadUnreadCount()
        }
      }, interval)
    }

    startPolling()

    // Restart polling when tab becomes active/inactive
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden
      startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, sessionReady, loadNotifications, loadUnreadCount])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, error, refresh, markRead, markAllRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

