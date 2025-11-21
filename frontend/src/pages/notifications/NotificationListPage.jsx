import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, CheckCheck, Filter } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { fetchNotifications, markAllNotificationsRead } from '../../api/notifications.js'
import CampaignContextSwitchDialog from '../../components/CampaignContextSwitchDialog.jsx'
import './NotificationListPage.css'

const NOTIFICATION_TYPES = [
  { value: '', label: 'All types' },
  { value: 'entity_comment', label: 'Entity comments' },
  { value: 'entity_mention_entity_note', label: 'Entity mentions (notes)' },
  { value: 'entity_mention_session_note', label: 'Entity mentions (sessions)' },
  { value: 'session_note_added', label: 'Session notes' },
  { value: 'session_note_updated', label: 'Session notes' },
  { value: 'request_note_added', label: 'Feature/Bug notes' },
  { value: 'request_status_changed', label: 'Feature/Bug status' },
  { value: 'request_assigned', label: 'Feature/Bug assignments' },
]

const getNotificationMessage = (notification) => {
  const { type, metadata = {} } = notification

  switch (type) {
    case 'entity_comment':
      return `${metadata.author_name || 'Someone'} commented on ${metadata.entity_name || 'an entity'}`
    case 'entity_mention_entity_note':
      return `${metadata.author_name || 'Someone'} mentioned ${metadata.related_entity_name || 'an entity'} in a note`
    case 'entity_mention_session_note':
      return `${metadata.author_name || 'Someone'} mentioned ${metadata.related_entity_name || 'an entity'} in a session note`
    case 'session_note_added':
      return `${metadata.author_name || 'Someone'} created a session note${metadata.campaign_name ? ` for ${metadata.campaign_name}` : ''}: ${metadata.session_title || 'Untitled'}`
    case 'session_note_updated':
      return `${metadata.author_name || 'Someone'} updated a session note${metadata.campaign_name ? ` for ${metadata.campaign_name}` : ''}: ${metadata.session_title || 'Untitled'}`
    case 'request_note_added':
      return `${metadata.author_name || 'Someone'} added a note to "${metadata.request_title || 'a feature/bug'}"`
    case 'request_status_changed':
      return `Status changed for "${metadata.request_title || 'a feature/bug'}"`
    case 'request_assigned':
      return `You were assigned to "${metadata.request_title || 'a feature/bug'}"`
    default:
      return 'New notification'
  }
}

const formatTimeAgo = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotificationListPage() {
  const { notifications: contextNotifications, markRead, markAllRead: markAllReadContext, refresh } = useNotifications()
  const { selectedCampaignId, campaigns, setSelectedCampaignId } = useCampaignContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [allNotifications, setAllNotifications] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [readFilter, setReadFilter] = useState('') // '' = all, 'unread', 'read'
  const [typeFilter, setTypeFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState(selectedCampaignId || '')
  const [contextSwitchDialog, setContextSwitchDialog] = useState({ open: false, notification: null })

  const loadNotifications = async (pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const params = {
        page: pageNum,
        limit: 50,
      }

      if (readFilter === 'unread') {
        params.read = 'false'
      } else if (readFilter === 'read') {
        params.read = 'true'
      }

      if (typeFilter) {
        params.type = typeFilter
      }

      if (campaignFilter) {
        params.campaignId = campaignFilter
      }

      const response = await fetchNotifications(params)
      const data = Array.isArray(response?.data) ? response.data : []
      const pagination = response?.pagination || {}

      if (append) {
        setAllNotifications((prev) => [...prev, ...data])
      } else {
        setAllNotifications(data)
      }

      setHasMore(pagination.page < pagination.pages)
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications(1, false)
  }, [readFilter, typeFilter, campaignFilter])

  const handleMarkRead = async (notification) => {
    try {
      await markRead(notification.id)
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
      )
    } catch (err) {
      console.error('Failed to mark notification read', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const filters = {}
      if (campaignFilter) filters.campaignId = campaignFilter
      if (typeFilter) filters.type = typeFilter

      await markAllReadContext(filters)
      refresh()
      loadNotifications(page, false)
    } catch (err) {
      console.error('Failed to mark all notifications read', err)
    }
  }

  const performNavigation = (notification) => {
    // Navigate to action URL if available
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    } else {
      // Fallback navigation based on type
      const { type, metadata = {} } = notification
      if (type === 'entity_comment' || type === 'entity_mention_entity_note') {
        const entityId = metadata.entity_id || metadata.related_entity_id
        const campaignId = notification.campaignId || notification.campaign?.id || campaignFilter
        if (entityId) {
          navigate(`/entities/${entityId}${campaignId ? `?campaignId=${campaignId}` : ''}#notes`)
        }
      } else if (type === 'session_note_added' || type === 'session_note_updated' || type === 'entity_mention_session_note') {
        const campaignId = notification.campaignId || notification.campaign?.id || metadata.target_id || campaignFilter
        navigate(`/notes/session${campaignId ? `?campaignId=${campaignId}` : ''}`)
      } else if (type === 'request_note_added' || type === 'request_status_changed' || type === 'request_assigned') {
        const requestId = metadata.request_id || metadata.requestId
        if (requestId) {
          navigate(`/requests/${requestId}`)
        } else {
          navigate('/requests')
        }
      }
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await handleMarkRead(notification)
    }

    // Check if notification is for a different campaign context
    const notificationCampaignId = notification.campaignId || notification.campaign?.id || ''
    const currentCampaignId = selectedCampaignId || ''
    
    // If notification has a campaign and it's different from current context, prompt to switch
    if (notificationCampaignId && notificationCampaignId !== currentCampaignId) {
      setContextSwitchDialog({ open: true, notification })
      return
    }

    // Otherwise, proceed with navigation
    performNavigation(notification)
  }

  const handleSwitchCampaignContext = () => {
    const { notification } = contextSwitchDialog
    if (!notification) return

    const notificationCampaignId = notification.campaignId || notification.campaign?.id || ''
    if (notificationCampaignId) {
      setSelectedCampaignId(notificationCampaignId)
    }
    
    setContextSwitchDialog({ open: false, notification: null })
    
    // Small delay to allow context to update, then navigate
    setTimeout(() => {
      performNavigation(notification)
    }, 100)
  }

  const handleCancelContextSwitch = () => {
    setContextSwitchDialog({ open: false, notification: null })
  }

  const unreadCount = allNotifications.filter((n) => !n.read).length

  const campaignOptions = useMemo(() => {
    return [
      { value: '', label: 'All campaigns' },
      ...(campaigns || []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ]
  }, [campaigns])

  return (
    <div className="notification-list-page">
      <div className="notification-list-header">
        <h1>Notifications</h1>
        <div className="notification-list-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="notification-list-mark-all-read"
              onClick={handleMarkAllRead}
              disabled={loading}
            >
              <CheckCheck size={18} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="notification-list-filters">
        <select
          className="notification-list-filter"
          value={readFilter}
          onChange={(e) => {
            setReadFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>

        <select
          className="notification-list-filter"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
        >
          {NOTIFICATION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          className="notification-list-filter"
          value={campaignFilter}
          onChange={(e) => {
            setCampaignFilter(e.target.value)
            setPage(1)
          }}
        >
          {campaignOptions.map((campaign) => (
            <option key={campaign.value} value={campaign.value}>
              {campaign.label}
            </option>
          ))}
        </select>
      </div>

      <div className="notification-list-content">
        {loading && allNotifications.length === 0 ? (
          <div className="notification-list-empty">Loading...</div>
        ) : allNotifications.length === 0 ? (
          <div className="notification-list-empty">
            <p>No notifications found.</p>
            <p className="notification-list-empty-hint">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="notification-list-items">
            {allNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-list-item ${notification.read ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-list-item-content">
                  <div className="notification-list-item-header">
                    <p className="notification-list-item-message">
                      {getNotificationMessage(notification)}
                    </p>
                    {!notification.read && <div className="notification-list-item-dot" />}
                  </div>
                  <div className="notification-list-item-meta">
                    <span className="notification-list-item-time">{formatTimeAgo(notification.createdAt)}</span>
                    {notification.campaign && (
                      <span className="notification-list-item-campaign">{notification.campaign.name}</span>
                    )}
                  </div>
                </div>
                {!notification.read && (
                  <button
                    type="button"
                    className="notification-list-item-mark-read"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkRead(notification)
                    }}
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="notification-list-load-more">
            <button
              type="button"
              onClick={() => {
                const nextPage = page + 1
                setPage(nextPage)
                loadNotifications(nextPage, true)
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      <CampaignContextSwitchDialog
        open={contextSwitchDialog.open}
        campaignName={contextSwitchDialog.notification?.campaign?.name || ''}
        onSwitch={handleSwitchCampaignContext}
        onCancel={handleCancelContextSwitch}
      />
    </div>
  )
}

