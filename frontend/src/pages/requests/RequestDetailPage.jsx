import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Bug, Sparkles, Trash2, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getRequest, updateRequest, deleteRequest } from '../../api/requests.js'
import { fetchRequestNotes } from '../../api/requestNotes.js'
import RequestStatusBadge from '../../components/requests/RequestStatusBadge.jsx'
import RequestNotes from '../../components/requests/RequestNotes.jsx'
import './RequestDetailPage.css'

export default function RequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'system_admin'
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAdminControls, setShowAdminControls] = useState(false)
  const [adminForm, setAdminForm] = useState({
    status: '',
    assignedTo: '',
    priority: '',
    isInBacklog: false,
  })

  const loadRequest = async () => {
    setLoading(true)
    try {
      const response = await getRequest(id)
      if (response?.success && response?.data) {
        const data = response.data
        setRequest(data)
        setAdminForm({
          status: data.status || '',
          assignedTo: data.assignedTo || '',
          priority: data.priority || '',
          isInBacklog: data.isInBacklog || false,
        })
      } else {
        throw new Error('Request not found')
      }
    } catch (err) {
      console.error('Failed to load request', err)
      alert(err.message || 'Failed to load request')
      navigate('/requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadRequest()
    }
  }, [id])

  const handleAdminUpdate = async () => {
    setSaving(true)
    try {
      const updateData = {}
      if (adminForm.status && adminForm.status !== request.status) {
        updateData.status = adminForm.status
      }
      if (adminForm.assignedTo !== request.assignedTo) {
        updateData.assignedTo = adminForm.assignedTo || null
      }
      if (adminForm.priority !== request.priority) {
        updateData.priority = adminForm.priority || null
      }
      if (adminForm.isInBacklog !== request.isInBacklog) {
        updateData.isInBacklog = adminForm.isInBacklog
      }

      if (Object.keys(updateData).length === 0) {
        setShowAdminControls(false)
        return
      }

      await updateRequest(id, updateData)
      await loadRequest()
      setShowAdminControls(false)
    } catch (err) {
      console.error('Failed to update request', err)
      alert('Failed to update request')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return
    }

    try {
      await deleteRequest(id)
      navigate('/requests')
    } catch (err) {
      console.error('Failed to delete request', err)
      alert('Failed to delete request')
    }
  }

  const canAddNote = request && (isAdmin || String(request.createdBy) === String(user?.id))

  if (loading) {
    return <div className="request-detail-page__loading">Loading request...</div>
  }

  if (!request) {
    return null
  }

  return (
    <div className="request-detail-page">
      <div className="request-detail-page__header">
        <Link to="/requests" className="request-detail-page__back">
          <ArrowLeft size={20} />
          Back to Requests
        </Link>
        <div className="request-detail-page__title-section">
          <div className="request-detail-page__type-badge">
            {request.type === 'bug' ? (
              <Bug size={20} className="request-detail-page__type-icon" />
            ) : (
              <Sparkles size={20} className="request-detail-page__type-icon" />
            )}
            <span>{request.type === 'bug' ? 'Bug' : 'Feature'}</span>
          </div>
          <h1>{request.title}</h1>
          <div className="request-detail-page__meta">
            <RequestStatusBadge status={request.status} />
            {request.priority && (
              <span className="request-detail-page__priority">
                Priority: {request.priority}
              </span>
            )}
            {request.isInBacklog && (
              <span className="request-detail-page__backlog-badge">In Backlog</span>
            )}
          </div>
        </div>
      </div>

      <div className="request-detail-page__content">
        <div className="request-detail-page__main">
          <div className="request-detail-page__section">
            <h2>Description</h2>
            <div className="request-detail-page__description">
              {request.description.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          <div className="request-detail-page__section">
            <h2>Details</h2>
            <dl className="request-detail-page__details">
              <div className="request-detail-page__detail-row">
                <dt>Created by:</dt>
                <dd>{request.creator?.username || 'Unknown'}</dd>
              </div>
              <div className="request-detail-page__detail-row">
                <dt>Created:</dt>
                <dd>{new Date(request.createdAt).toLocaleString()}</dd>
              </div>
              {request.assignee && (
                <div className="request-detail-page__detail-row">
                  <dt>Assigned to:</dt>
                  <dd>{request.assignee.username}</dd>
                </div>
              )}
              {request.updatedAt !== request.createdAt && (
                <div className="request-detail-page__detail-row">
                  <dt>Last updated:</dt>
                  <dd>{new Date(request.updatedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {isAdmin && (
            <div className="request-detail-page__section">
              <div className="request-detail-page__admin-header">
                <h2>Admin Controls</h2>
                <button
                  onClick={() => setShowAdminControls(!showAdminControls)}
                  className="request-detail-page__admin-toggle"
                >
                  {showAdminControls ? 'Hide' : 'Show'} Controls
                </button>
              </div>

              {showAdminControls && (
                <div className="request-detail-page__admin-form">
                  <div className="request-detail-page__admin-field">
                    <label>Status:</label>
                    <select
                      value={adminForm.status}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="request-detail-page__admin-select"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="backlog">Backlog</option>
                    </select>
                  </div>

                  <div className="request-detail-page__admin-field">
                    <label>Priority:</label>
                    <select
                      value={adminForm.priority}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="request-detail-page__admin-select"
                    >
                      <option value="">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="request-detail-page__admin-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={adminForm.isInBacklog}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, isInBacklog: e.target.checked }))}
                      />
                      In Backlog
                    </label>
                  </div>

                  <div className="request-detail-page__admin-actions">
                    <button
                      onClick={handleAdminUpdate}
                      disabled={saving}
                      className="request-detail-page__admin-save"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="request-detail-page__admin-delete"
                    >
                      <Trash2 size={16} />
                      Delete Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <RequestNotes requestId={id} canAddNote={canAddNote} />
        </div>
      </div>
    </div>
  )
}

