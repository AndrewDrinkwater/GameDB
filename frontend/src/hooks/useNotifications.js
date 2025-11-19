import { useNotifications as useNotificationContext } from '../context/NotificationContext.jsx'

/**
 * Hook wrapper for NotificationContext
 * Returns: notifications, unreadCount, loading, refresh, markRead, markAllRead
 */
export function useNotifications() {
  return useNotificationContext()
}

