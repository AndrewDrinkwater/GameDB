import { useCallback, useEffect, useMemo, useState } from 'react'
import { List, Pencil, Plus, Trash2, X } from 'lucide-react'
import { getRelationshipTypes, createRelationshipType, updateRelationshipType, deleteRelationshipType } from '../../api/entityRelationshipTypes.js'
import { getEntityTypes } from '../../api/entityTypes.js'
import { fetchWorlds } from '../../api/worlds.js'
import { useAuth } from '../../context/AuthContext.jsx'
import RelationshipTypeForm from './RelationshipTypeForm.jsx'

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
  return list
    .map((entry) => entry?.name || entry?.label || 'Unknown')
    .filter(Boolean)
    .join(', ')
}

export default function RelationshipTypeList() {
  const { user, token, sessionReady } = useAuth()
  const [relationshipTypes, setRelationshipTypes] = useState([])
  const [entityTypes, setEntityTypes] = useState([])
  const [worlds, setWorlds] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState('create')
  const [editingType, setEditingType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [formError, setFormError] = useState('')

  const canManage = useMemo(
    () => (user?.role ? MANAGER_ROLES.has(user.role) : false),
    [user?.role],
  )

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true)
    try {
      const [typesResponse, worldsResponse] = await Promise.all([
        getEntityTypes(),
        fetchWorlds(),
      ])

      const typeList = Array.isArray(typesResponse?.data)
        ? typesResponse.data
        : Array.isArray(typesResponse)
          ? typesResponse
          : []

      const worldList = Array.isArray(worldsResponse?.data)
        ? worldsResponse.data
        : Array.isArray(worldsResponse)
          ? worldsResponse
          : []

      setEntityTypes(typeList)
      setWorlds(worldList)
    } catch (err) {
      console.error('❌ Failed to load relationship type options', err)
      setEntityTypes([])
      setWorlds([])
      showToast(err.message || 'Failed to load supporting data', 'error')
    } finally {
      setLoadingOptions(false)
    }
  }, [showToast])

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
    loadOptions()
    loadRelationshipTypes()
  }, [sessionReady, token, loadOptions, loadRelationshipTypes])

  const openCreate = () => {
    if (!canManage) return
    setPanelMode('create')
    setEditingType(null)
    setFormError('')
    setPanelOpen(true)
  }

  const openEdit = (type) => {
    if (!canManage) return
    setPanelMode('edit')
    setEditingType(type)
    setFormError('')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingType(null)
    setFormError('')
  }

  const handleSubmit = async (payload) => {
    if (!canManage) return false

    try {
      setSaving(true)
      setFormError('')

      if (panelMode === 'edit' && editingType?.id) {
        await updateRelationshipType(editingType.id, payload)
        showToast('Relationship type updated', 'success')
      } else {
        await createRelationshipType(payload)
        showToast('Relationship type created', 'success')
      }

      closePanel()
      await loadRelationshipTypes()
    } catch (err) {
      console.error('❌ Failed to save relationship type', err)
      const message = err.message || 'Failed to save relationship type'
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
      `Delete relationship type "${type.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(type.id)
      await deleteRelationshipType(type.id)
      showToast('Relationship type deleted', 'success')
      if (editingType?.id === type.id) {
        closePanel()
      }
      await loadRelationshipTypes()
    } catch (err) {
      console.error('❌ Failed to delete relationship type', err)
      showToast(err.message || 'Failed to delete relationship type', 'error')
    } finally {
      setDeletingId('')
    }
  }

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

  if (!canManage) {
    return (
      <section className="entity-types-page">
        <div className="entity-types-header">
          <h1>Relationship Types</h1>
        </div>
        <div className="alert info" role="status">
          Only system administrators can manage relationship types.
        </div>
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

        <button
          type="button"
          className="btn submit"
          onClick={openCreate}
          disabled={saving || deletingId || loadingOptions}
        >
          <Plus size={18} /> Add Relationship Type
        </button>
      </div>

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

      {loadingOptions && (
        <div className="alert info" role="status">
          Loading worlds and entity types…
        </div>
      )}

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
                    <td>{type.world?.name || '—'}</td>
                    <td>{buildTypeNames(type.from_entity_types)}</td>
                    <td>{buildTypeNames(type.to_entity_types)}</td>
                    <td>{formatDate(createdAt)}</td>
                    <td className="actions-column">
                      <div className="entity-type-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit relationship type"
                          onClick={() => openEdit(type)}
                          disabled={saving || deletingId === type.id}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete relationship type"
                          onClick={() => handleDelete(type)}
                          disabled={deletingId === type.id || saving}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className={`entity-type-panel ${panelOpen ? 'open' : ''}`}>
        <div className="entity-type-panel-header">
          <div className="panel-heading">
            <List size={18} />
            <h2>{panelMode === 'edit' ? 'Edit Relationship Type' : 'New Relationship Type'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={closePanel}>
            <X size={18} />
          </button>
        </div>

        <div className="entity-type-panel-body">
          <RelationshipTypeForm
            initialValues={panelMode === 'edit' ? editingType : {}}
            entityTypes={entityTypes}
            worlds={worlds}
            saving={saving}
            errorMessage={formError}
            onSubmit={handleSubmit}
            onCancel={closePanel}
          />
        </div>
      </div>
    </section>
  )
}
