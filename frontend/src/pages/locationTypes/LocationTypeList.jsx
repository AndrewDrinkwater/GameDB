import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  fetchLocationTypes,
  createLocationType,
  updateLocationType,
  deleteLocationType,
} from '../../api/locationTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import LocationTypeForm from './LocationTypeForm.jsx'

const MANAGER_ROLES = new Set(['system_admin'])

export default function LocationTypeList() {
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign, activeWorld, activeWorldId, contextKey } = useCampaignContext()
  const [locationTypes, setLocationTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  const worldId = activeWorldId || selectedCampaign?.world?.id || ''
  const previousWorldIdRef = useRef(`${worldId}:${contextKey}`)
  const hasWorldContext = Boolean(worldId)

  const worldOptions = useMemo(() => {
    if (!worldId) return []
    return [
      {
        id: worldId,
        name: activeWorld?.name || selectedCampaign?.world?.name || 'Untitled world',
      },
    ]
  }, [worldId, activeWorld?.name, selectedCampaign?.world?.name])

  const selectedWorldOwnerId = useMemo(() => {
    const worldSource = selectedCampaign?.world || activeWorld
    if (!worldSource) return ''
    return (
      worldSource.created_by ||
      worldSource.creator?.id ||
      worldSource.owner_id ||
      worldSource.owner?.id ||
      ''
    )
  }, [selectedCampaign, activeWorld])

  const isWorldOwner = Boolean(user?.id && selectedWorldOwnerId === user.id)

  const canManage = useMemo(() => {
    if (!user) return false
    if (user.role && MANAGER_ROLES.has(user.role)) return true
    return isWorldOwner
  }, [user, isWorldOwner])

  const selectedCampaignLabel = useMemo(() => {
    if (selectedCampaign) {
      const campaignName = selectedCampaign.name || 'Selected campaign'
      const worldName = selectedCampaign.world?.name || activeWorld?.name
      return worldName ? `${campaignName} · ${worldName}` : campaignName
    }
    if (activeWorld) {
      return activeWorld.name || 'Selected world'
    }
    return ''
  }, [selectedCampaign, activeWorld])

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const loadLocationTypes = useCallback(async () => {
    if (!token || !worldId) {
      setLoading(false)
      setLocationTypes([])
      return []
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetchLocationTypes({ worldId })
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : []
      setLocationTypes(list)
      return list
    } catch (err) {
      console.error('❌ Failed to load location types', err)
      setError(err.message || 'Failed to load location types')
      setLocationTypes([])
      return []
    } finally {
      setLoading(false)
    }
  }, [token, worldId])

  useEffect(() => {
    if (!sessionReady || !token) return

    if (!worldId) {
      setLocationTypes([])
      setError('')
      setLoading(false)
      return
    }

    loadLocationTypes()
  }, [sessionReady, token, worldId, loadLocationTypes, contextKey])

  useEffect(() => {
    const nextKey = `${worldId}:${contextKey}`
    if (previousWorldIdRef.current === nextKey) return

    setPanelOpen(false)
    setEditingType(null)
    setFormError('')
    setToast(null)
    setLocationTypes([])
    setError('')
    setSaving(false)
    setDeletingId('')

    previousWorldIdRef.current = nextKey
  }, [worldId, contextKey])

  const openCreate = () => {
    if (!canManage || !hasWorldContext) return
    setEditingType(null)
    setFormError('')
    setPanelOpen(true)
  }

  const openEdit = (type) => {
    if (!canManage) return
    setEditingType(type)
    setFormError('')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingType(null)
    setFormError('')
  }

  const handleSave = async (values) => {
    if (editingType?.id) {
      // Update existing
      try {
        setSaving(true)
        setFormError('')
        await updateLocationType(editingType.id, values)
        showToast('Location type updated', 'success')
        closePanel()
        await loadLocationTypes()
      } catch (err) {
        console.error('❌ Failed to save location type', err)
        const message = err.message || 'Failed to save location type'
        setFormError(message)
        showToast(message, 'error')
        return false
      } finally {
        setSaving(false)
      }
    } else {
      // Create new
      try {
        setSaving(true)
        setFormError('')
        await createLocationType(values)
        showToast('Location type created', 'success')
        closePanel()
        await loadLocationTypes()
      } catch (err) {
        console.error('❌ Failed to create location type', err)
        const message = err.message || 'Failed to create location type'
        setFormError(message)
        showToast(message, 'error')
        return false
      } finally {
        setSaving(false)
      }
    }
    return true
  }

  const handleDelete = async (type) => {
    if (!canManage || !type?.id) return
    const confirmed = window.confirm(
      `Delete location type "${type.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(type.id)
      await deleteLocationType(type.id)
      showToast('Location type deleted', 'success')
      if (editingType?.id === type.id) {
        closePanel()
      }
      await loadLocationTypes()
    } catch (err) {
      console.error('❌ Failed to delete location type', err)
      showToast(err.message || 'Failed to delete location type', 'error')
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

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedLocationTypes = useMemo(() => {
    if (!sortColumn) return locationTypes

    return [...locationTypes].sort((a, b) => {
      let aValue, bValue

      switch (sortColumn) {
        case 'name':
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
          break
        case 'description':
          aValue = (a.description || '').toLowerCase()
          bValue = (b.description || '').toLowerCase()
          break
        case 'parentType':
          aValue = (a.parentType?.name || '').toLowerCase()
          bValue = (b.parentType?.name || '').toLowerCase()
          break
        case 'childTypeCount':
          aValue = a.childTypeCount || 0
          bValue = b.childTypeCount || 0
          break
        case 'world':
          aValue = (a?.world?.name || a?.world_name || a?.worldName || '').toLowerCase()
          bValue = (b?.world?.name || b?.world_name || b?.worldName || '').toLowerCase()
          break
        case 'created':
          aValue = new Date(a.createdAt || a.created_at || 0).getTime()
          bValue = new Date(b.createdAt || b.created_at || 0).getTime()
          break
        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      } else {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      }
    })
  }, [locationTypes, sortColumn, sortDirection])

  const createdCount = locationTypes.length

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
          <h1>Location Types</h1>
          {selectedCampaign ? (
            <>
              <p className="entity-types-subtitle">{selectedCampaignLabel}</p>
              <p className="entity-types-subtitle">{createdCount} types defined</p>
            </>
          ) : (
            <p className="entity-types-subtitle">
              Select a campaign or world you own to choose a world context.
            </p>
          )}
        </div>

        <button
          type="button"
          className="btn submit"
          onClick={openCreate}
          disabled={!canManage || saving || deletingId || !hasWorldContext}
        >
          <Plus size={18} /> Add Location Type
        </button>
      </div>

      {!canManage && (
        <div className="alert info" role="status">
          You can view the existing location types, but only system administrators
          or the world owner can make changes.
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
          <div className="empty-state">Select a campaign or world you own to view location types.</div>
        ) : loading ? (
          <div className="empty-state">Loading location types...</div>
        ) : locationTypes.length === 0 ? (
          <div className="empty-state">No location types defined yet.</div>
        ) : (
          <table className="entity-types-table">
            <thead>
              <tr>
                <th
                  className="sortable-header"
                  onClick={() => handleSort('name')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort('name')
                    }
                  }}
                >
                  <span className="header-label">
                    Name
                    {sortColumn === 'name' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort('description')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort('description')
                    }
                  }}
                >
                  <span className="header-label">
                    Description
                    {sortColumn === 'description' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort('parentType')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort('parentType')
                    }
                  }}
                >
                  <span className="header-label">
                    Parent Type
                    {sortColumn === 'parentType' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort('childTypeCount')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort('childTypeCount')
                    }
                  }}
                >
                  <span className="header-label">
                    Child Types
                    {sortColumn === 'childTypeCount' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort('world')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort('world')
                    }
                  }}
                >
                  <span className="header-label">
                    World
                    {sortColumn === 'world' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort('created')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort('created')
                    }
                  }}
                >
                  <span className="header-label">
                    Created
                    {sortColumn === 'created' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLocationTypes.map((type) => {
                const createdAt = type.createdAt || type.created_at
                const worldName =
                  type?.world?.name || type?.world_name || type?.worldName || '—'
                return (
                  <tr key={type.id}>
                    <td>{type.name}</td>
                    <td className="description-cell">
                      {type.description ? type.description : '—'}
                    </td>
                    <td>{type.parentType?.name || '—'}</td>
                    <td>{type.childTypeCount || 0}</td>
                    <td>{worldName}</td>
                    <td>{formatDate(createdAt)}</td>
                    <td className="actions-column">
                      <div className="entity-type-actions">
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Edit location type"
                              onClick={() => openEdit(type)}
                              disabled={saving || deletingId === type.id}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Delete location type"
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
            Select a campaign or world you own to view location types.
          </div>
        ) : loading ? (
          <div className="card-placeholder">Loading location types...</div>
        ) : locationTypes.length === 0 ? (
          <div className="card-placeholder">No location types defined yet.</div>
        ) : (
          sortedLocationTypes.map((type) => {
            const createdAt = type.createdAt || type.created_at
            return (
              <div className="entity-type-card" key={`card-${type.id}`}>
                <div className="card-header">
                  <h3>{type.name}</h3>
                  <div className="entity-type-actions">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit location type"
                          onClick={() => openEdit(type)}
                          disabled={saving || deletingId === type.id}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete location type"
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
                  Parent: {type.parentType?.name || 'None'}
                </p>
                <p className="card-meta">
                  Child Types: {type.childTypeCount || 0}
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
              <h2>{editingType ? 'Edit Location Type' : 'Add Location Type'}</h2>
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
              <LocationTypeForm
                initialData={editingType}
                onSubmit={handleSave}
                onCancel={closePanel}
                submitting={saving}
                errorMessage={formError}
                worlds={worldOptions}
                locationTypes={locationTypes}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

