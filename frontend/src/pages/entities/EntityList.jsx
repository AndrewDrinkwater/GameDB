import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { deleteEntity, getWorldEntities } from '../../api/entities.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import EntityForm from './EntityForm.jsx'

const VISIBILITY_BADGES = {
  visible: 'badge-visible',
  partial: 'badge-partial',
  hidden: 'badge-hidden',
}

const MANAGER_ROLES = new Set(['system_admin'])
const FILTER_PARAM = 'entityType'

export default function EntityList() {
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign } = useCampaignContext()
  const [searchParams, setSearchParams] = useSearchParams()

  const [entities, setEntities] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [entitiesError, setEntitiesError] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingEntityId, setEditingEntityId] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [toast, setToast] = useState(null)

  const worldId = selectedCampaign?.world?.id ?? ''
  const selectedFilter = searchParams.get(FILTER_PARAM) ?? ''

  const previousWorldIdRef = useRef(worldId)

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const membershipRole = useMemo(() => {
    if (!selectedCampaign || !user) return ''
    const member = selectedCampaign.members?.find((entry) => entry.user_id === user.id)
    return member?.role || ''
  }, [selectedCampaign, user])

  const isWorldOwner = useMemo(() => {
    if (!selectedCampaign || !user) return false
    const ownerId = selectedCampaign.world?.created_by
    return ownerId ? ownerId === user.id : false
  }, [selectedCampaign, user])

  const canManage = useMemo(() => {
    if (!selectedCampaign || !user) return false
    if (MANAGER_ROLES.has(user.role)) return true
    if (membershipRole === 'dm') return true
    if (isWorldOwner) return true
    return false
  }, [selectedCampaign, user, membershipRole, isWorldOwner])

  const loadEntities = useCallback(
    async (targetWorldId) => {
      const worldToFetch = targetWorldId ?? worldId
      if (!worldToFetch || !token) {
        setEntities([])
        return []
      }

      setLoadingEntities(true)
      setEntitiesError('')

      try {
        const response = await getWorldEntities(worldToFetch)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        setEntities(list)
        return list
      } catch (err) {
        console.error('❌ Failed to load entities', err)
        setEntitiesError(err.message || 'Failed to load entities')
        setEntities([])
        return []
      } finally {
        setLoadingEntities(false)
      }
    },
    [token, worldId],
  )

  useEffect(() => {
    if (!worldId || !token) {
      setEntities([])
      return
    }
    loadEntities(worldId)
  }, [worldId, token, loadEntities])

  useEffect(() => {
    if (previousWorldIdRef.current !== worldId) {
      if (panelOpen) {
        setPanelOpen(false)
        setEditingEntityId(null)
      }
      setEntitiesError('')
      setToast(null)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete(FILTER_PARAM)
        return next
      })
      previousWorldIdRef.current = worldId
    }
  }, [worldId, panelOpen, setSearchParams])

  const filteredEntities = useMemo(() => {
    if (!selectedFilter) return entities
    return entities.filter((entity) => {
      const typeId =
        entity.entity_type_id || entity.entityType?.id || entity.entity_type?.id || ''
      return typeId === selectedFilter
    })
  }, [entities, selectedFilter])

  const activeTypeName = useMemo(() => {
    if (!selectedFilter) return ''
    const match = entities.find((entity) => {
      const typeId =
        entity.entity_type_id || entity.entityType?.id || entity.entity_type?.id || ''
      return typeId === selectedFilter
    })
    return match?.entityType?.name || match?.entity_type?.name || ''
  }, [entities, selectedFilter])

  const closePanel = () => {
    setPanelOpen(false)
    setEditingEntityId(null)
  }

  const handleFormSaved = async (mode) => {
    closePanel()
    if (!worldId) return
    await loadEntities(worldId)
    showToast(mode === 'create' ? 'Entity created' : 'Entity updated', 'success')
  }

  const handleDelete = async (entity) => {
    if (!canManage || !entity?.id) return
    const confirmed = window.confirm(
      `Delete entity "${entity.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(entity.id)
      await deleteEntity(entity.id)
      showToast('Entity deleted', 'success')
      if (worldId) {
        await loadEntities(worldId)
      }
    } catch (err) {
      console.error('❌ Failed to delete entity', err)
      showToast(err.message || 'Failed to delete entity', 'error')
    } finally {
      setDeletingId('')
    }
  }

  const handleRefresh = () => {
    if (!worldId) return
    loadEntities(worldId)
  }

  const openCreate = () => {
    if (!canManage || !worldId) return
    setEditingEntityId(null)
    setPanelOpen(true)
  }

  const openEdit = (entity) => {
    if (!canManage) return
    setEditingEntityId(entity.id)
    setPanelOpen(true)
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

  const clearFilter = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(FILTER_PARAM)
      return next
    })
  }, [setSearchParams])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  const hasEntities = filteredEntities.length > 0
  const filterActive = Boolean(selectedFilter)

  return (
    <section className="entities-page">
      <div className="entities-header">
        <div>
          <h1>Entities</h1>
          {selectedCampaign ? (
            <p className="entities-subtitle">
              {selectedCampaign.name}
              {selectedCampaign.world?.name ? ` · ${selectedCampaign.world.name}` : ''}
            </p>
          ) : (
            <p className="entities-subtitle">
              Select a campaign from the header to choose a world context.
            </p>
          )}
          {filterActive && (
            <div className="entities-filter-chip">
              <span>
                Showing {activeTypeName || 'selected type'}
              </span>
              <button type="button" className="link-btn" onClick={clearFilter}>
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="entities-controls">
          <button
            type="button"
            className="icon-btn"
            title="Refresh entities"
            onClick={handleRefresh}
            disabled={!worldId || loadingEntities}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className="btn submit"
            onClick={openCreate}
            disabled={!canManage || !worldId || loadingEntities}
          >
            <Plus size={18} /> Add Entity
          </button>
        </div>
      </div>

      {selectedCampaign && !canManage && (
        <div className="alert info" role="status">
          You can view the entities that are shared with you, but only the world owner,
          a campaign DM, or a system administrator can create or edit them.
        </div>
      )}

      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}

      {entitiesError && (
        <div className="alert error" role="alert">
          {entitiesError}
        </div>
      )}

      {loadingEntities ? (
        <div className="empty-state">Loading entities...</div>
      ) : !worldId ? (
        <div className="empty-state">Select a campaign to view its entities.</div>
      ) : hasEntities ? (
        <div className="entities-table-wrapper">
          <table className="entities-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Visibility</th>
                <th>Created</th>
                {canManage && <th className="actions-column">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((entity) => {
                const createdAt = entity.createdAt || entity.created_at
                const typeName = entity.entityType?.name || entity.entity_type?.name || '—'
                const visibility = entity.visibility || 'hidden'
                const badgeClass = VISIBILITY_BADGES[visibility] || 'badge-hidden'
                return (
                  <tr key={entity.id}>
                    <td>
                      <Link to={`/entities/${entity.id}`} className="entity-name-link">
                        {entity.name}
                      </Link>
                    </td>
                    <td>{typeName}</td>
                    <td>
                      <span className={`visibility-badge ${badgeClass}`}>
                        {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
                      </span>
                    </td>
                    <td>{formatDate(createdAt)}</td>
                    {canManage && (
                      <td className="actions-column">
                        <div className="entity-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(entity)}
                            title="Edit entity"
                            disabled={loadingEntities}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleDelete(entity)}
                            title="Delete entity"
                            disabled={deletingId === entity.id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          {filterActive ? (
            <>
              <p className="empty-title">No entities of this type yet.</p>
              <button type="button" className="btn secondary" onClick={clearFilter}>
                View all entities
              </button>
            </>
          ) : canManage ? (
            <>
              <p className="empty-title">No entities yet.</p>
              <p>
                Click <strong>Add Entity</strong> to create your first entity.
              </p>
            </>
          ) : (
            <p>Nothing to show right now.</p>
          )}
        </div>
      )}

      {panelOpen && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{editingEntityId ? 'Edit Entity' : 'Add Entity'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={closePanel}
                title="Close form"
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-content">
              <EntityForm
                worldId={worldId}
                entityId={editingEntityId}
                onCancel={closePanel}
                onSaved={handleFormSaved}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
