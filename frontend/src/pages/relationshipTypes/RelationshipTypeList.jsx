import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { deleteRelationshipType, getRelationshipTypes } from '../../api/entityRelationshipTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'

const MANAGER_ROLES = new Set(['system_admin'])

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const buildTypeNames = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return '—'
  return list.map((entry) => entry?.name || entry?.label || 'Unknown').filter(Boolean).join(', ')
}

const buildDirectionSummary = (type) => {
  if (!type) return '—'
  const from = type.from_name || type.fromName || type.name || '—'
  const to = type.to_name || type.toName || type.name || '—'
  return `${from} → ${to}`
}

export default function RelationshipTypeList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token, sessionReady } = useAuth()
  const [relationshipTypes, setRelationshipTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [deletingId, setDeletingId] = useState('')

  const canManage = useMemo(() => (user?.role ? MANAGER_ROLES.has(user.role) : false), [user?.role])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  const clearLocationToast = useCallback(() => {
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, navigate])

  useEffect(() => {
    if (location.state?.toast) {
      const { message, tone } = location.state.toast
      showToast(message, tone)
      clearLocationToast()
    }
  }, [location.state, showToast, clearLocationToast])

  const loadRelationshipTypes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await getRelationshipTypes()
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : []
      setRelationshipTypes(list)
    } catch (err) {
      console.error('❌ Failed to load relationship types', err)
      setRelationshipTypes([])
      setError(err.message || 'Failed to load relationship types')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!sessionReady || !token) return
    loadRelationshipTypes()
  }, [sessionReady, token, loadRelationshipTypes])

  const handleRefresh = () => {
    if (!token || loading) return
    loadRelationshipTypes()
  }

  const openCreate = () => {
    if (!canManage) return
    navigate('/relationship-types/new')
  }

  const openEdit = (type) => {
    if (!canManage || !type?.id) return
    navigate(`/relationship-types/${type.id}/edit`)
  }

  const handleDelete = async (type) => {
    if (!canManage || !type?.id) return
    const confirmed = window.confirm(`Delete relationship type "${type.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      setDeletingId(type.id)
      await deleteRelationshipType(type.id)
      showToast('Relationship type deleted', 'success')
      await loadRelationshipTypes()
    } catch (err) {
      console.error('❌ Failed to delete relationship type', err)
      showToast(err.message || 'Failed to delete relationship type', 'error')
    } finally {
      setDeletingId('')
    }
  }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  if (!canManage) {
    return (
      <section className="entity-types-page relationship-types-page">
        <div className="entity-types-header">
          <h1>Relationship Types</h1>
        </div>
        <div className="alert info">Only system administrators can manage relationship types.</div>
      </section>
    )
  }

  return (
    <section className="entity-types-page relationship-types-page">
      <div className="entity-types-header">
        <div>
          <h1>Relationship Types</h1>
          <p className="entity-types-subtitle">{relationshipTypes.length} types defined</p>
        </div>

        <div className="entity-types-actions">
          <button type="button" className="icon-btn" title="Refresh" onClick={handleRefresh} disabled={loading}>
            <RotateCcw size={16} />
          </button>
          <button type="button" className="btn submit" onClick={openCreate} disabled={loading}>
            <Plus size={18} /> Add Relationship Type
          </button>
        </div>
      </div>

      {toast && <div className={`toast-banner ${toast.tone}`}>{toast.message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="entity-types-table-wrapper">
        {loading ? (
          <div className="empty-state">Loading relationship types...</div>
        ) : relationshipTypes.length === 0 ? (
          <div className="empty-state">No relationship types defined yet.</div>
        ) : (
          <table className="entity-types-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Directional Labels</th>
                <th>World</th>
                <th>Allowed Sources</th>
                <th>Allowed Targets</th>
                <th>Created</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {relationshipTypes.map((type) => {
                const createdAt = type.createdAt || type.created_at
                return (
                  <tr key={type.id}>
                    <td>{type.name}</td>
                    <td>{buildDirectionSummary(type)}</td>
                    <td>{type.world?.name || '—'}</td>
                    <td>{buildTypeNames(type.from_entity_types)}</td>
                    <td>{buildTypeNames(type.to_entity_types)}</td>
                    <td>{formatDate(createdAt)}</td>
                    <td className="actions-column">
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => openEdit(type)}
                        disabled={loading || deletingId === type.id}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Delete"
                        onClick={() => handleDelete(type)}
                        disabled={deletingId === type.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
