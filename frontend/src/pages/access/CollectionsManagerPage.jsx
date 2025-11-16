import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchWorlds } from '../../api/worlds.js'
import { getWorldEntities } from '../../api/entities.js'
import {
  createCollection,
  deleteCollection as deleteCollectionApi,
  fetchCollections,
  updateCollection,
} from '../../api/access.js'
import UnsavedChangesDialog from '../../components/UnsavedChangesDialog.jsx'
import './CollectionsManagerPage.css'

const MAX_COLLECTION_ENTITIES = 1000

const toList = (response) => {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

const defaultFormState = {
  name: '',
  description: '',
  shared: false,
  entityIds: [],
}

export default function CollectionsManagerPage() {
  const { worldId } = useParams()
  const navigate = useNavigate()
  const { user, sessionReady } = useAuth()
  const [world, setWorld] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [collections, setCollections] = useState([])
  const [entities, setEntities] = useState([])
  const [entityFilter, setEntityFilter] = useState('')
  const [mode, setMode] = useState('view')
  const [selectedId, setSelectedId] = useState('')
  const [formValues, setFormValues] = useState(defaultFormState)
  const [isDirty, setIsDirty] = useState(false)
  const [formError, setFormError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [unsavedDialogSaving, setUnsavedDialogSaving] = useState(false)

  const isOwner = useMemo(() => {
    if (!world || !user) return false
    const ownerId =
      world.created_by || world.creator?.id || world.owner?.id || world.owner_id || null
    return ownerId && user.id && String(ownerId) === String(user.id)
  }, [world, user])

  const loadCollections = useCallback(async () => {
    if (!worldId) return
    try {
      const response = await fetchCollections(worldId)
      const list = toList(response)
      setCollections(list)
    } catch (err) {
      console.error('Failed to load collections', err)
      setError(err.message || 'Failed to load collections')
    }
  }, [worldId])

  const loadEntities = useCallback(async () => {
    if (!worldId) return
    try {
      const response = await getWorldEntities(worldId)
      const list = toList(response)
      setEntities(list)
    } catch (err) {
      console.error('Failed to load entities for world', err)
      setError(err.message || 'Failed to load entities for this world')
    }
  }, [worldId])

  useEffect(() => {
    if (!sessionReady || !worldId) return

    const load = async () => {
      setLoading(true)
      setError('')
      setAccessDenied(false)
      setWorld(null)

      try {
        const worldResponse = await fetchWorlds()
        const worldList = toList(worldResponse)
        const found = worldList.find((entry) => String(entry.id) === String(worldId))
        if (!found) {
          setError('World not found or unavailable')
          return
        }
        setWorld(found)

        const ownerId =
          found.created_by || found.creator?.id || found.owner?.id || found.owner_id || null
        if (!user || !ownerId || String(ownerId) !== String(user.id)) {
          setAccessDenied(true)
          return
        }

        await Promise.all([loadCollections(), loadEntities()])
      } catch (err) {
        console.error('Failed to load collections manager', err)
        setError(err.message || 'Failed to load collections manager')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadCollections, loadEntities, sessionReady, user, worldId])

  const handleFormChange = (field) => (event) => {
    const value = field === 'shared' ? event.target.checked : event.target.value
    setFormValues((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
    setFormError('')
    setStatusMessage('')
  }

  const handleEntityToggle = (entityId) => {
    setFormError('')
    setStatusMessage('')
    setFormValues((prev) => {
      const next = new Set(prev.entityIds || [])
      if (next.has(entityId)) {
        next.delete(entityId)
      } else {
        if (next.size >= MAX_COLLECTION_ENTITIES) {
          setFormError(`Collections can include up to ${MAX_COLLECTION_ENTITIES} entities.`)
          return prev
        }
        next.add(entityId)
      }
      setIsDirty(true)
      return { ...prev, entityIds: Array.from(next) }
    })
  }

  const filteredEntities = useMemo(() => {
    if (!entityFilter) return entities
    const query = entityFilter.toLowerCase()
    return entities.filter((entity) => (entity.name || '').toLowerCase().includes(query))
  }, [entities, entityFilter])

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      if (a.shared && !b.shared) return -1
      if (b.shared && !a.shared) return 1
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    })
  }, [collections])

  const resetForm = useCallback(() => {
    setSelectedId('')
    setFormValues(defaultFormState)
    setMode('view')
    setIsDirty(false)
    setFormError('')
    setStatusMessage('')
  }, [])

  const applySelection = useCallback((collection) => {
    if (!collection) return
    setSelectedId(collection.id)
    setFormValues({
      name: collection.name || '',
      description: collection.description || '',
      shared: Boolean(collection.shared),
      entityIds: Array.isArray(collection.entityIds) ? collection.entityIds : [],
    })
    setMode('edit')
    setIsDirty(false)
    setFormError('')
    setStatusMessage('')
  }, [])

  const requestAction = (action) => {
    if (isDirty) {
      setPendingAction(action)
      setUnsavedDialogOpen(true)
      return
    }
    executeAction(action)
  }

  const executeAction = (action) => {
    setUnsavedDialogOpen(false)
    setPendingAction(null)
    if (!action) return
    if (action.type === 'select') {
      applySelection(action.payload)
    } else if (action.type === 'create') {
      setMode('create')
      setSelectedId('')
      setFormValues(defaultFormState)
      setIsDirty(false)
      setFormError('')
      setStatusMessage('')
    } else if (action.type === 'close') {
      resetForm()
    }
  }

  const handleSelectCollection = (collection) => {
    requestAction({ type: 'select', payload: collection, label: collection.name })
  }

  const handleCreateNew = () => {
    requestAction({ type: 'create', label: 'start a new collection' })
  }

  const handleCancelEdit = () => {
    requestAction({ type: 'close', label: 'leave this editor' })
  }

  const handleUnsavedStay = () => {
    setUnsavedDialogOpen(false)
    setPendingAction(null)
  }

  const handleUnsavedContinue = () => {
    executeAction(pendingAction)
  }

  const saveCollection = useCallback(async () => {
    if (!worldId) {
      setFormError('A world id is required to save this collection.')
      return false
    }
    if (!formValues.name.trim()) {
      setFormError('Name is required.')
      return false
    }
    if (formValues.entityIds.length > MAX_COLLECTION_ENTITIES) {
      setFormError(`Collections can include up to ${MAX_COLLECTION_ENTITIES} entities.`)
      return false
    }

    const payload = {
      worldId,
      name: formValues.name.trim(),
      description: formValues.description,
      shared: formValues.shared,
      entityIds: formValues.entityIds,
    }

    setSaving(true)
    setFormError('')
    setStatusMessage('')

    try {
      let response
      if (mode === 'edit' && selectedId) {
        response = await updateCollection(selectedId, payload)
      } else {
        response = await createCollection(payload)
      }

      const updated = response?.data || response
      if (updated) {
        setCollections((prev) => {
          const existingIndex = prev.findIndex((entry) => entry.id === updated.id)
          if (existingIndex >= 0) {
            const next = [...prev]
            next[existingIndex] = updated
            return next
          }
          return [...prev, updated]
        })
        applySelection(updated)
        setMode('edit')
        setStatusMessage('Collection saved successfully.')
        setIsDirty(false)
      } else {
        await loadCollections()
      }
      return true
    } catch (err) {
      console.error('Failed to save collection', err)
      setFormError(err.message || 'Failed to save collection')
      return false
    } finally {
      setSaving(false)
    }
  }, [applySelection, formValues, loadCollections, mode, selectedId, worldId])

  const handleFormSubmit = async (event) => {
    event.preventDefault()
    await saveCollection()
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm('Delete this collection? This cannot be undone.')) return

    setDeleting(true)
    setFormError('')
    setStatusMessage('')

    try {
      await deleteCollectionApi(selectedId)
      setCollections((prev) => prev.filter((collection) => collection.id !== selectedId))
      resetForm()
      setStatusMessage('Collection deleted.')
    } catch (err) {
      console.error('Failed to delete collection', err)
      setFormError(err.message || 'Failed to delete collection')
    } finally {
      setDeleting(false)
    }
  }

  const handleUnsavedSaveAndContinue = async () => {
    setUnsavedDialogSaving(true)
    const success = await saveCollection()
    setUnsavedDialogSaving(false)
    if (success) {
      executeAction(pendingAction)
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  if (!sessionReady) return <p className="collections-helper">Restoring session…</p>
  if (!worldId) return <p className="collections-helper">World id is required.</p>

  if (loading) {
    return (
      <div className="collections-page">
        <p className="collections-helper">
          <Loader2 size={16} className="spin" /> Loading collections…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="collections-page">
        <div className="collections-alert error">
          <AlertTriangle size={16} /> {error}
        </div>
        <button type="button" className="link-button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    )
  }

  if (accessDenied || !isOwner) {
    return (
      <div className="collections-page">
        <div className="collections-alert warning">
          <AlertTriangle size={16} /> Only the world owner can manage collections.
        </div>
      </div>
    )
  }

  const headerTitle = world?.name || '—'
  const selectedCount = formValues.entityIds.length

  return (
    <div className="collections-page">
      <div className="collections-header">
        <div>
          <p className="collections-eyebrow">World Admin · Collections</p>
          <h1>{headerTitle}</h1>
        </div>
        <div className="collections-header-actions">
          <button type="button" className="primary-button" onClick={handleCreateNew}>
            New collection
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="collections-alert success">
          <CheckCircle2 size={16} /> {statusMessage}
        </div>
      )}

      {formError && (
        <div className="collections-alert error">
          <AlertTriangle size={16} /> {formError}
        </div>
      )}

      <div className="collections-grid">
        <section className="collections-card">
          <header>
            <h2>Collections</h2>
            <p className="collections-helper">
              {collections.length} saved · Shared sets are available to campaign DMs
            </p>
          </header>
          <div className="collections-table-wrapper">
            {sortedCollections.length === 0 ? (
              <p className="collections-helper">No collections yet. Create one to get started.</p>
            ) : (
              <table className="collections-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Shared</th>
                    <th>Entities</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCollections.map((collection) => {
                    const isActive = selectedId === collection.id
                    return (
                      <tr
                        key={collection.id}
                        className={isActive ? 'active' : ''}
                        onClick={() => handleSelectCollection(collection)}
                      >
                        <td>
                          <span className="collection-name">{collection.name}</span>
                          {collection.description && (
                            <span className="collection-description">{collection.description}</span>
                          )}
                        </td>
                        <td>
                          {collection.shared ? (
                            <span className="shared-chip">
                              <Users size={14} /> Shared
                            </span>
                          ) : (
                            <span className="shared-chip private">Owner only</span>
                          )}
                        </td>
                        <td>{collection.entityCount ?? collection.entity_ids?.length ?? 0}</td>
                        <td>
                          {collection.updatedAt
                            ? new Date(collection.updatedAt).toLocaleString()
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="collections-card">
          {mode === 'view' && !selectedId ? (
            <div className="collections-placeholder">
              <p>Select a collection to edit or create a new one.</p>
            </div>
          ) : (
            <form className="collections-form" onSubmit={handleFormSubmit}>
              <header>
                <h2>{mode === 'edit' ? 'Edit collection' : 'New collection'}</h2>
                <p className="collections-helper">
                  {selectedCount}/{MAX_COLLECTION_ENTITIES} entities selected
                </p>
              </header>

              <label>
                Name
                <input
                  type="text"
                  value={formValues.name}
                  onChange={handleFormChange('name')}
                  required
                />
              </label>

              <label>
                Description (optional)
                <textarea
                  value={formValues.description}
                  onChange={handleFormChange('description')}
                  rows={3}
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formValues.shared}
                  onChange={handleFormChange('shared')}
                />
                Share with DMs in this world
              </label>

              <div className="collections-entity-picker">
                <div className="collections-entity-toolbar">
                  <span>Entities</span>
                  <input
                    type="text"
                    placeholder="Filter by name"
                    value={entityFilter}
                    onChange={(event) => setEntityFilter(event.target.value)}
                  />
                </div>
                <div className="collections-entity-list">
                  {filteredEntities.length === 0 ? (
                    <p className="collections-helper">No entities match this filter.</p>
                  ) : (
                    <ul>
                      {filteredEntities.map((entity) => {
                        const isChecked = formValues.entityIds.includes(entity.id)
                        return (
                          <li key={entity.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleEntityToggle(entity.id)}
                              />
                              <span className="entity-name">{entity.name}</span>
                              <span className="entity-type">{entity.entityType?.name || ''}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="collections-form-actions">
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Saving…' : 'Save collection'}
                </button>
                {mode === 'edit' && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
                <button type="button" className="ghost-button" onClick={handleCancelEdit}>
                  Close
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        destinationLabel={pendingAction?.label || ''}
        saving={unsavedDialogSaving}
        onSaveAndContinue={handleUnsavedSaveAndContinue}
        onContinueWithoutSaving={handleUnsavedContinue}
        onStay={handleUnsavedStay}
      />
    </div>
  )
}
