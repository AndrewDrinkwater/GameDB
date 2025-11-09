import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Pencil, Plus, Trash2, X } from 'lucide-react'
import { deleteEntityType, getEntityTypes, updateEntityType } from '../../api/entityTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import EntityTypeForm from './EntityTypeForm.jsx'

const MANAGER_ROLES = new Set(['system_admin'])

export default function EntityTypeList() {
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign } = useCampaignContext()
  const [entityTypes, setEntityTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)
  const previousWorldIdRef = useRef(selectedCampaign?.world?.id ?? '')

  const worldId = selectedCampaign?.world?.id ?? ''
  const hasWorldContext = Boolean(worldId)

  const worldOptions = useMemo(() => {
    if (!selectedCampaign?.world?.id) return []
    const world = selectedCampaign.world
    return [
      {
        id: world.id,
        name: world.name || 'Untitled world',
      },
    ]
  }, [selectedCampaign])

  const canManage = useMemo(
    () => (user?.role ? MANAGER_ROLES.has(user.role) : false),
    [user?.role],
  )

  const selectedCampaignLabel = useMemo(() => {
    if (!selectedCampaign) return ''
    const campaignName = selectedCampaign.name || 'Selected campaign'
    const worldName = selectedCampaign.world?.name
    return worldName ? `${campaignName} · ${worldName}` : campaignName
  }, [selectedCampaign])

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const loadEntityTypes = useCallback(async () => {
    if (!token || !worldId) {
      setLoading(false)
      setEntityTypes([])
      return []
    }

    setLoading(true)
    setError('')

    try {
      const response = await getEntityTypes({ worldId })
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : []
      setEntityTypes(list)
      return list
    } catch (err) {
      console.error('❌ Failed to load entity types', err)
      setError(err.message || 'Failed to load entity types')
      setEntityTypes([])
      return []
    } finally {
      setLoading(false)
    }
  }, [token, worldId])

  useEffect(() => {
    if (!sessionReady || !token) return

    if (!worldId) {
      setEntityTypes([])
      setError('')
      setLoading(false)
      return
    }

    loadEntityTypes()
  }, [sessionReady, token, worldId, loadEntityTypes])

  useEffect(() => {
    if (previousWorldIdRef.current === worldId) return

    setPanelOpen(false)
    setEditingType(null)
    setFormError('')
    setToast(null)
    setEntityTypes([])
    setError('')
    setSaving(false)
    setDeletingId('')

    previousWorldIdRef.current = worldId
  }, [worldId])

  const openCreate = () => {
    if (!canManage || !hasWorldContext) return
    navigate('/entity-types/new')
  }

  const openEdit = (type) => {
    if (!canManage) return
    setEditingType(type)
    setFormError('')
    setPanelOpen(true)
  }

  const goToFields = (type) => {
    if (!type?.id) return
    navigate(`/entity-types/${type.id}/fields`)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingType(null)
    setFormError('')
  }

  const handleSave = async (values) => {
    if (!editingType?.id) {
      setFormError('No entity type selected for editing.')
      return false
    }
    try {
      setSaving(true)
      setFormError('')
      await updateEntityType(editingType.id, values)
      showToast('Entity type updated', 'success')
      closePanel()
      await loadEntityTypes()
    } catch (err) {
      console.error('❌ Failed to save entity type', err)
      const message = err.message || 'Failed to save entity type'
      setFormError(message)
      showToast(message, 'error')
      return false
    } finally {
      setSaving(false)
    }
    return true
  }

  const handleDelete = async (type) => {
    if (!canManage || !type?.id) return
    const confirmed = window.confirm(
      `Delete entity type "${type.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(type.id)
      await deleteEntityType(type.id)
      showToast('Entity type deleted', 'success')
      if (editingType?.id === type.id) {
        closePanel()
      }
      await loadEntityTypes()
    } catch (err) {
      console.error('❌ Failed to delete entity type', err)
      showToast(err.message || 'Failed to delete entity type', 'error')
    } finally {
      setDeletingId('')
    }
  }

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

  const createdCount = entityTypes.length

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

  return (
    <section className="entity-types-page">
      <div className="entity-types-header">
        <div>
          <h1>Entity Types</h1>
          {selectedCampaign ? (
            <>
              <p className="entity-types-subtitle">{selectedCampaignLabel}</p>
              <p className="entity-types-subtitle">{createdCount} types defined</p>
            </>
          ) : (
            <p className="entity-types-subtitle">
              Select a campaign from the header to choose a world context.
            </p>
          )}
        </div>

        <button
          type="button"
          className="btn submit"
          onClick={openCreate}
          disabled={!canManage || saving || deletingId || !hasWorldContext}
        >
          <Plus size={18} /> Add Entity Type
        </button>
      </div>

      {!canManage && (
        <div className="alert info" role="status">
          You can view the existing entity types, but only system administrators
          can make changes.
        </div>
      )}

      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <div className="entity-types-table-wrapper">
        {!hasWorldContext ? (
          <div className="empty-state">Select a campaign to view entity types.</div>
        ) : loading ? (
          <div className="empty-state">Loading entity types...</div>
        ) : entityTypes.length === 0 ? (
          <div className="empty-state">No entity types defined yet.</div>
        ) : (
          <table className="entity-types-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>World</th>
                <th>Created</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entityTypes.map((type) => {
                const createdAt = type.createdAt || type.created_at
                const worldName =
                  type?.world?.name || type?.world_name || type?.worldName || '—'
                return (
                  <tr key={type.id}>
                    <td>{type.name}</td>
                    <td className="description-cell">
                      {type.description ? type.description : '—'}
                    </td>
                    <td>{worldName}</td>
                    <td>{formatDate(createdAt)}</td>
                    <td className="actions-column">
                      <div className="entity-type-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Manage fields"
                          onClick={() => goToFields(type)}
                        >
                          <List size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Edit entity type"
                              onClick={() => openEdit(type)}
                              disabled={saving || deletingId === type.id}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Delete entity type"
                              onClick={() => handleDelete(type)}
                              disabled={deletingId === type.id || saving}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="entity-type-cards">
        {!hasWorldContext ? (
          <div className="card-placeholder">
            Select a campaign to view entity types.
          </div>
        ) : loading ? (
          <div className="card-placeholder">Loading entity types...</div>
        ) : entityTypes.length === 0 ? (
          <div className="card-placeholder">No entity types defined yet.</div>
        ) : (
          entityTypes.map((type) => {
            const createdAt = type.createdAt || type.created_at
            return (
              <div className="entity-type-card" key={`card-${type.id}`}>
                <div className="card-header">
                  <h3>{type.name}</h3>
                  <div className="entity-type-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Manage fields"
                      onClick={() => goToFields(type)}
                    >
                      <List size={16} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit entity type"
                          onClick={() => openEdit(type)}
                          disabled={saving || deletingId === type.id}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete entity type"
                          onClick={() => handleDelete(type)}
                          disabled={deletingId === type.id || saving}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="card-description">
                  {type.description ? type.description : 'No description'}
                </p>
                <p className="card-meta">
                  World: {type?.world?.name || type?.world_name || '—'}
                </p>
                <p className="card-meta">
                  Created {formatDate(createdAt)}
                </p>
              </div>
            )
          })
        )}
      </div>

      {panelOpen && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{editingType ? 'Edit Entity Type' : 'Add Entity Type'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={closePanel}
                title="Close form"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-content">
              <EntityTypeForm
                initialData={editingType}
                onSubmit={handleSave}
                onCancel={closePanel}
                submitting={saving}
                errorMessage={formError}
                worlds={worldOptions}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
