import { useState, useRef, useEffect } from 'react'
import { Bell, BellRing, Check, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import CampaignContextSwitchDialog from '../CampaignContextSwitchDialog.jsx'
import './NotificationWidget.css'

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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

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
      return `${metadata.author_name || 'Someone'} created a session note`
    case 'session_note_updated':
      return `${metadata.author_name || 'Someone'} updated a session note`
    default:
      return 'New notification'
  }
}

export default function NotificationWidget() {
  const { notifications, unreadCount, loading, markRead } = useNotifications()
  const { selectedCampaignId, setSelectedCampaignId } = useCampaignContext()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [contextSwitchDialog, setContextSwitchDialog] = useState({ open: false, notification: null })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [dropdownOpen])

  // Show recent unread notifications (up to 5)
  const recentNotifications = notifications
    .filter((n) => !n.read)
    .slice(0, 5)

  const performNavigation = (notification) => {
    setDropdownOpen(false)
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    } else {
      // Fallback navigation based on type
      const { type, metadata = {} } = notification
      if (type === 'entity_comment' || type === 'entity_mention_entity_note') {
        const entityId = metadata.entity_id || metadata.related_entity_id
        const campaignId = notification.campaignId || notification.campaign?.id || selectedCampaignId
        if (entityId) {
          navigate(`/entities/${entityId}${campaignId ? `?campaignId=${campaignId}` : ''}#notes`)
        }
      } else if (type === 'session_note_added' || type === 'session_note_updated' || type === 'entity_mention_session_note') {
        const campaignId = notification.campaignId || notification.campaign?.id || metadata.target_id || selectedCampaignId
        navigate(`/notes/session${campaignId ? `?campaignId=${campaignId}` : ''}`)
      } else {
        // Default: navigate to notifications page
        navigate('/notifications')
      }
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await markRead(notification.id)
      } catch (err) {
        console.error('Failed to mark notification read', err)
      }
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

  const hasNotifications = recentNotifications.length > 0

  return (
    <div className="notification-widget" ref={dropdownRef}>
      <button
        type="button"
        className="notification-widget-button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        title="Notifications"
      >
        {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {unreadCount > 0 && (
          <span className="notification-widget-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {dropdownOpen && (
        <div className="notification-widget-dropdown">
          <div className="notification-widget-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="notification-widget-count">{unreadCount} unread</span>
            )}
          </div>

          {loading ? (
            <div className="notification-widget-loading">Loading...</div>
          ) : hasNotifications ? (
            <div className="notification-widget-list">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-widget-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-widget-item-content">
                    <p className="notification-widget-item-message">
                      {getNotificationMessage(notification)}
                    </p>
                    <span className="notification-widget-item-time">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.read && <div className="notification-widget-item-dot" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="notification-widget-empty">No new notifications</div>
          )}

          <div className="notification-widget-footer">
            <Link
              to="/notifications"
              className="notification-widget-view-all"
              onClick={() => setDropdownOpen(false)}
            >
              View all notifications <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}

      <CampaignContextSwitchDialog
        open={contextSwitchDialog.open}
        campaignName={contextSwitchDialog.notification?.campaign?.name || ''}
        onSwitch={handleSwitchCampaignContext}
        onCancel={handleCancelContextSwitch}
      />
    </div>
  )
}

