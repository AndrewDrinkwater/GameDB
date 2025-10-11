import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import SearchBar from '../../components/SearchBar.jsx'
import { getEntity } from '../../api/entities.js'
import {
  deleteRelationship,
  getRelationships,
} from '../../api/entityRelationships.js'
import { getRelationshipTypes } from '../../api/entityRelationshipTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import EntityRelationshipForm from './EntityRelationshipForm.jsx'

const MANAGER_ROLES = new Set(['system_admin'])

export default function EntityRelationshipList() {
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign } = useCampaignContext()

  const [relationships, setRelationships] = useState([])
  const [relationshipTypes, setRelationshipTypes] = useState([])
  const [entityLookup, setEntityLookup] = useState({})
  const entityLookupRef = useRef({})

  const [loadingRelationships, setLoadingRelationships] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [listError, setListError] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingRelationshipId, setEditingRelationshipId] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [toast, setToast] = useState(null)

  const [typeFilter, setTypeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const worldId = selectedCampaign?.world?.id ?? ''
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

  const ensureEntities = useCallback(async (entityIds) => {
    const unique = Array.from(
      new Set(
        entityIds
          .map((id) => (id === undefined || id === null ? '' : String(id)))
          .filter(Boolean),
      ),
    )
    if (unique.length === 0) return

    const currentLookup = entityLookupRef.current
    const missing = unique.filter((id) => !currentLookup[id])
    if (missing.length === 0) return

    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const response = await getEntity(id)
          const data = response?.data || response
          return { id, data }
        } catch (err) {
          console.error('❌ Failed to resolve entity', err)
          return { id, data: null }
        }
      }),
    )

    const additions = {}
    results.forEach(({ id, data }) => {
      if (data) {
        additions[id] = {
          id: data.id || id,
          name: data.name || `Entity ${id}`,
          typeName: data.entityType?.name || data.entity_type?.name || '',
        }
      } else {
        additions[id] = { id, name: `Entity #${id}`, typeName: '' }
      }
    })

    entityLookupRef.current = { ...entityLookupRef.current, ...additions }
    setEntityLookup((prev) => ({ ...prev, ...additions }))
  }, [])

  const loadRelationshipTypes = useCallback(
    async (targetWorldId) => {
      const params = targetWorldId ? { worldId: targetWorldId } : {}
      setLoadingTypes(true)
      try {
        const response = await getRelationshipTypes(params)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        setRelationshipTypes(list)
      } catch (err) {
        console.error('❌ Failed to load relationship types', err)
        showToast(err.message || 'Failed to load relationship types', 'error')
        setRelationshipTypes([])
      } finally {
        setLoadingTypes(false)
      }
    },
    [showToast],
  )

  useEffect(() => {
    if (!worldId) {
      setRelationshipTypes([])
      return
    }
    loadRelationshipTypes(worldId)
  }, [loadRelationshipTypes, worldId])

  const loadRelationships = useCallback(
    async (targetWorldId) => {
      const worldToFetch = targetWorldId ?? worldId
      if (!worldToFetch || !token) {
        setRelationships([])
        return []
      }

      setLoadingRelationships(true)
      setListError('')

      try {
        const response = await getRelationships(worldToFetch)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        setRelationships(list)

        const idsToResolve = []
        list.forEach((relationship) => {
          const fromId =
            relationship.from_entity_id ||
            relationship.fromEntityId ||
            relationship.from_entity?.id ||
            relationship.fromEntity?.id ||
            ''
          const toId =
            relationship.to_entity_id ||
            relationship.toEntityId ||
            relationship.to_entity?.id ||
            relationship.toEntity?.id ||
            ''
          if (fromId) idsToResolve.push(fromId)
          if (toId) idsToResolve.push(toId)
        })
        await ensureEntities(idsToResolve)
        return list
      } catch (err) {
        console.error('❌ Failed to load relationships', err)
        setRelationships([])
        setListError(err.message || 'Failed to load relationships')
        return []
      } finally {
        setLoadingRelationships(false)
      }
    },
    [worldId, token, ensureEntities],
  )

  useEffect(() => {
    if (!worldId || !token) {
      setRelationships([])
      entityLookupRef.current = {}
      setEntityLookup({})
      return
    }
    loadRelationships(worldId)
  }, [worldId, token, loadRelationships])

  useEffect(() => {
    if (previousWorldIdRef.current !== worldId) {
      if (panelOpen) {
        setPanelOpen(false)
        setEditingRelationshipId(null)
      }
      setToast(null)
      setTypeFilter('')
      setSearchTerm('')
      setListError('')
      entityLookupRef.current = {}
      setEntityLookup({})
      previousWorldIdRef.current = worldId
    }
  }, [worldId, panelOpen])

  const relationshipTypeMap = useMemo(() => {
    const map = new Map()
    relationshipTypes.forEach((type) => {
      if (!type?.id) return
      map.set(String(type.id), type)
    })
    return map
  }, [relationshipTypes])

  const normalisedRelationships = useMemo(
    () =>
      relationships.map((relationship) => {
        const fromEntityId =
          relationship.from_entity_id ||
          relationship.fromEntityId ||
          relationship.from_entity?.id ||
          relationship.fromEntity?.id ||
          ''
        const toEntityId =
          relationship.to_entity_id ||
          relationship.toEntityId ||
          relationship.to_entity?.id ||
          relationship.toEntity?.id ||
          ''
        const relationshipTypeId =
          relationship.entity_relationship_type_id ||
          relationship.relationship_type_id ||
          relationship.relationshipType?.id ||
          relationship.relationship_type?.id ||
          ''
        const typeName =
          relationship.relationshipType?.name ||
          relationship.relationship_type?.name ||
          relationship.relationshipTypeName ||
          relationshipTypeMap.get(String(relationshipTypeId))?.name ||
          ''
        const bidirectional = Boolean(
          relationship.bidirectional ??
            relationship.is_bidirectional ??
            relationship.two_way ??
            false,
        )

        return {
          ...relationship,
          fromEntityId: fromEntityId ? String(fromEntityId) : '',
          toEntityId: toEntityId ? String(toEntityId) : '',
          relationshipTypeId: relationshipTypeId ? String(relationshipTypeId) : '',
          typeName,
          bidirectional,
          fromEntityName:
            relationship.fromEntity?.name ||
            relationship.from_entity?.name ||
            relationship.fromEntityName ||
            '',
          toEntityName:
            relationship.toEntity?.name ||
            relationship.to_entity?.name ||
            relationship.toEntityName ||
            '',
          fromEntityTypeName:
            relationship.fromEntity?.entityType?.name ||
            relationship.from_entity?.entity_type?.name ||
            '',
          toEntityTypeName:
            relationship.toEntity?.entityType?.name ||
            relationship.to_entity?.entity_type?.name ||
            '',
        }
      }),
    [relationships, relationshipTypeMap],
  )

  const getEntityLabel = useCallback(
    (id, fallbackName = '', fallbackType = '') => {
      if (!id) return '—'
      const entry = entityLookup[id]
      const name = entry?.name || fallbackName || `Entity #${id}`
      const typeName = entry?.typeName || fallbackType
      return typeName ? `${name} (${typeName})` : name
    },
    [entityLookup],
  )

  const filteredRelationships = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return normalisedRelationships.filter((relationship) => {
      if (typeFilter && relationship.relationshipTypeId !== typeFilter) {
        return false
      }

      if (!term) return true

      const fromLabel = getEntityLabel(
        relationship.fromEntityId,
        relationship.fromEntityName,
        relationship.fromEntityTypeName,
      )
        .toLowerCase()
      const toLabel = getEntityLabel(
        relationship.toEntityId,
        relationship.toEntityName,
        relationship.toEntityTypeName,
      ).toLowerCase()

      return fromLabel.includes(term) || toLabel.includes(term)
    })
  }, [normalisedRelationships, typeFilter, searchTerm, getEntityLabel])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  const hasRelationships = filteredRelationships.length > 0

  const handleRefresh = () => {
    if (!worldId) return
    loadRelationships(worldId)
  }

  const openCreate = () => {
    if (!canManage || !worldId) return
    setEditingRelationshipId(null)
    setPanelOpen(true)
  }

  const openEdit = (relationship) => {
    if (!canManage) return
    setEditingRelationshipId(relationship.id)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingRelationshipId(null)
  }

  const handleFormSaved = async (mode) => {
    closePanel()
    if (!worldId) return
    await loadRelationships(worldId)
    showToast(mode === 'create' ? 'Relationship created' : 'Relationship updated', 'success')
  }

  const handleDelete = async (relationship) => {
    if (!canManage || !relationship?.id) return

    const fromLabel = getEntityLabel(
      relationship.fromEntityId,
      relationship.fromEntityName,
      relationship.fromEntityTypeName,
    )
    const toLabel = getEntityLabel(
      relationship.toEntityId,
      relationship.toEntityName,
      relationship.toEntityTypeName,
    )

    const confirmed = window.confirm(
      `Delete relationship "${fromLabel}" → "${toLabel}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(relationship.id)
      await deleteRelationship(relationship.id)
      showToast('Relationship deleted', 'success')
      if (worldId) {
        await loadRelationships(worldId)
      }
    } catch (err) {
      console.error('❌ Failed to delete relationship', err)
      showToast(err.message || 'Failed to delete relationship', 'error')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <section className="entities-page relationships-page">
      <div className="entities-header">
        <div>
          <h1>Entity Relationships</h1>
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
        </div>
        <div className="entities-controls">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            disabled={loadingTypes || relationshipTypes.length === 0}
            title="Filter by relationship type"
          >
            <option value="">All types</option>
            {relationshipTypes.map((type) => (
              <option key={type.id} value={String(type.id)}>
                {type.name}
              </option>
            ))}
          </select>
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
          <button
            type="button"
            className="icon-btn"
            title="Refresh relationships"
            onClick={handleRefresh}
            disabled={!worldId || loadingRelationships}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className="btn submit"
            onClick={openCreate}
            disabled={!canManage || !worldId || loadingRelationships}
          >
            <Plus size={16} /> Add Relationship
          </button>
        </div>
      </div>

      {selectedCampaign && !canManage && (
        <div className="alert info" role="status">
          You can view existing relationships, but only the world owner, a campaign DM, or a
          system administrator can create or edit them.
        </div>
      )}

      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}

      {listError && (
        <div className="alert error" role="alert">
          {listError}
        </div>
      )}

      {loadingRelationships ? (
        <div className="empty-state">Loading relationships...</div>
      ) : !worldId ? (
        <div className="empty-state">Select a campaign to view its relationships.</div>
      ) : hasRelationships ? (
        <div className="entities-table-wrapper">
          <table className="entities-table relationships-table">
            <thead>
              <tr>
                <th>From Entity</th>
                <th>Relationship Type</th>
                <th>To Entity</th>
                <th>Bidirectional</th>
                {canManage && <th className="actions-column">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRelationships.map((relationship) => {
                const fromLabel = getEntityLabel(
                  relationship.fromEntityId,
                  relationship.fromEntityName,
                  relationship.fromEntityTypeName,
                )
                const toLabel = getEntityLabel(
                  relationship.toEntityId,
                  relationship.toEntityName,
                  relationship.toEntityTypeName,
                )
                return (
                  <tr key={relationship.id}>
                    <td>{fromLabel}</td>
                    <td>{relationship.typeName || '—'}</td>
                    <td>{toLabel}</td>
                    <td>
                      <span
                        className={`visibility-badge ${
                          relationship.bidirectional ? 'badge-visible' : 'badge-hidden'
                        }`}
                      >
                        {relationship.bidirectional ? 'Yes' : 'No'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="actions-column">
                        <div className="entity-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(relationship)}
                            title="Edit relationship"
                            disabled={loadingRelationships}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleDelete(relationship)}
                            title="Delete relationship"
                            disabled={deletingId === relationship.id}
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
          {typeFilter || searchTerm ? (
            <>
              <p className="empty-title">No relationships match your filters.</p>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setTypeFilter('')
                  setSearchTerm('')
                }}
              >
                Clear filters
              </button>
            </>
          ) : canManage ? (
            <>
              <p className="empty-title">No relationships yet.</p>
              <button type="button" className="btn submit" onClick={openCreate} disabled={!worldId}>
                <Plus size={16} /> Add your first relationship
              </button>
            </>
          ) : (
            <p className="empty-title">No relationships to display.</p>
          )}
        </div>
      )}

      {panelOpen && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{editingRelationshipId ? 'Edit Relationship' : 'Add Relationship'}</h2>
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
              <EntityRelationshipForm
                worldId={worldId}
                relationshipId={editingRelationshipId}
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
