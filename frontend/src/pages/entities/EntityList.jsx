import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { fetchWorlds } from '../../api/worlds.js'
import {
  deleteEntity,
  getWorldEntities,
} from '../../api/entities.js'
import { useAuth } from '../../context/AuthContext.jsx'
import EntityForm from './EntityForm.jsx'

const WORLD_STORAGE_KEY = 'gamedb_active_world'

const VISIBILITY_BADGES = {
  visible: 'badge-visible',
  partial: 'badge-partial',
  hidden: 'badge-hidden',
}

const MANAGER_ROLES = new Set(['system_admin'])

export default function EntityList() {
  const { user, token, sessionReady } = useAuth()
  const [worlds, setWorlds] = useState([])
  const [selectedWorldId, setSelectedWorldId] = useState('')
  const [loadingWorlds, setLoadingWorlds] = useState(false)
  const [worldError, setWorldError] = useState('')

  const [entities, setEntities] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [entitiesError, setEntitiesError] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingEntityId, setEditingEntityId] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!sessionReady) return
    try {
      const stored = localStorage.getItem(WORLD_STORAGE_KEY)
      if (stored) {
        setSelectedWorldId(stored)
      }
    } catch (err) {
      console.warn('⚠️ Unable to read stored world selection', err)
    }
  }, [sessionReady])

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const loadWorlds = useCallback(async () => {
    if (!token) return
    setLoadingWorlds(true)
    setWorldError('')
    try {
      const response = await fetchWorlds()
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : []
      setWorlds(list)
    } catch (err) {
      console.error('❌ Failed to load worlds', err)
      setWorldError(err.message || 'Failed to load worlds')
      setWorlds([])
    } finally {
      setLoadingWorlds(false)
    }
  }, [token])

  useEffect(() => {
    if (sessionReady && token) {
      loadWorlds()
    }
  }, [sessionReady, token, loadWorlds])

  useEffect(() => {
    try {
      if (!selectedWorldId) {
        localStorage.removeItem(WORLD_STORAGE_KEY)
        return
      }
      localStorage.setItem(WORLD_STORAGE_KEY, selectedWorldId)
    } catch (err) {
      console.warn('⚠️ Unable to persist selected world', err)
    }
  }, [selectedWorldId])

  useEffect(() => {
    if (worlds.length === 0) {
      setEntities([])
      if (selectedWorldId) {
        setSelectedWorldId('')
      }
      return
    }

    if (!selectedWorldId) {
      setSelectedWorldId(worlds[0].id)
      return
    }

    const exists = worlds.some((world) => world.id === selectedWorldId)
    if (!exists) {
      setSelectedWorldId(worlds[0].id)
    }
  }, [worlds, selectedWorldId])

  const loadEntities = useCallback(
    async (worldId) => {
      if (!worldId || !token) return
      setLoadingEntities(true)
      setEntitiesError('')
      try {
        const response = await getWorldEntities(worldId)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        setEntities(list)
      } catch (err) {
        console.error('❌ Failed to load entities', err)
        setEntitiesError(err.message || 'Failed to load entities')
        setEntities([])
      } finally {
        setLoadingEntities(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!selectedWorldId || !token) {
      setEntities([])
      return
    }
    loadEntities(selectedWorldId)
  }, [selectedWorldId, token, loadEntities])

  const previousWorldIdRef = useRef(selectedWorldId)

  useEffect(() => {
    if (previousWorldIdRef.current !== selectedWorldId) {
      if (panelOpen) {
        setPanelOpen(false)
        setEditingEntityId(null)
      }
      previousWorldIdRef.current = selectedWorldId
    }
  }, [selectedWorldId, panelOpen])

  const selectedWorld = useMemo(
    () => worlds.find((world) => world.id === selectedWorldId) || null,
    [worlds, selectedWorldId],
  )

  const canManage = useMemo(() => {
    if (!selectedWorld || !user) return false
    if (MANAGER_ROLES.has(user.role)) return true
    return selectedWorld.created_by === user.id
  }, [selectedWorld, user])

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

  const handleWorldChange = (event) => {
    setSelectedWorldId(event.target.value)
  }

  const openCreate = () => {
    if (!canManage || !selectedWorldId) return
    setEditingEntityId(null)
    setPanelOpen(true)
  }

  const openEdit = (entity) => {
    if (!canManage) return
    setEditingEntityId(entity.id)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingEntityId(null)
  }

  const handleFormSaved = async (mode) => {
    closePanel()
    await loadEntities(selectedWorldId)
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
      await loadEntities(selectedWorldId)
    } catch (err) {
      console.error('❌ Failed to delete entity', err)
      showToast(err.message || 'Failed to delete entity', 'error')
    } finally {
      setDeletingId('')
    }
  }

  const handleRefresh = () => {
    if (!selectedWorldId) return
    loadEntities(selectedWorldId)
  }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  const hasWorlds = worlds.length > 0
  const hasEntities = entities.length > 0

  return (
    <section className="entities-page">
      <div className="entities-header">
        <div>
          <h1>Entities</h1>
          <p className="entities-subtitle">All entities in this world</p>
        </div>
        <div className="entities-controls">
          <div className="world-select">
            <label htmlFor="world-picker" className="sr-only">
              Select world
            </label>
            <select
              id="world-picker"
              value={selectedWorldId}
              onChange={handleWorldChange}
              disabled={loadingWorlds || !hasWorlds}
            >
              {!hasWorlds && <option value="">No accessible worlds</option>}
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="icon-btn"
            title="Refresh entities"
            onClick={handleRefresh}
            disabled={!selectedWorldId || loadingEntities}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className="btn submit"
            onClick={openCreate}
            disabled={!canManage || !selectedWorldId || loadingEntities}
          >
            <Plus size={18} /> Add Entity
          </button>
        </div>
      </div>

      {worldError && (
        <div className="alert error" role="alert">
          {worldError}
        </div>
      )}

      {loadingWorlds && !hasWorlds && (
        <div className="empty-state">Loading worlds...</div>
      )}

      {!loadingWorlds && !hasWorlds && (
        <div className="empty-state">
          You do not have access to any worlds yet.
        </div>
      )}

      {selectedWorld && !canManage && (
        <div className="alert info" role="status">
          You can view the entities that are shared with you, but only the world owner
          or a system administrator can create or edit them.
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
      ) : !selectedWorldId ? (
        <div className="empty-state">Select a world to view its entities.</div>
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
              {entities.map((entity) => {
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
          <p className="empty-title">No entities yet.</p>
          {canManage ? (
            <p>
              Click <strong>Add Entity</strong> to create your first entity.
            </p>
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
                worldId={selectedWorldId}
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
