import { Link } from 'react-router-dom'
import { Bug, Sparkles, Clock } from 'lucide-react'
import RequestStatusBadge from './RequestStatusBadge.jsx'
import './RequestCard.css'

export default function RequestCard({ request }) {
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

  return (
    <Link to={`/requests/${request.id}`} className="request-card">
      <div className="request-card__header">
        <div className="request-card__type">
          {request.type === 'bug' ? (
            <Bug size={16} className="request-card__type-icon" />
          ) : (
            <Sparkles size={16} className="request-card__type-icon" />
          )}
          <span className="request-card__type-label">
            {request.type === 'bug' ? 'Bug' : 'Feature'}
          </span>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <h3 className="request-card__title">{request.title}</h3>
      <p className="request-card__description">
        {request.description.length > 150
          ? `${request.description.substring(0, 150)}...`
          : request.description}
      </p>
      <div className="request-card__footer">
        <div className="request-card__meta">
          <span className="request-card__creator">
            by {request.creator?.username || 'Unknown'}
          </span>
          {request.assignee && (
            <span className="request-card__assignee">
              → {request.assignee.username}
            </span>
          )}
        </div>
        <div className="request-card__time">
          <Clock size={14} />
          <span>{formatTimeAgo(request.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}

