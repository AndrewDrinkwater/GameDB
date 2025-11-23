// src/pages/locations/tabs/EntitiesTab.jsx
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, X } from 'lucide-react'
import { useCampaignContext } from '../../../context/CampaignContext.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { addEntityToLocation, removeEntityFromLocation } from '../../../api/locations.js'
import { searchEntities } from '../../../api/entities.js'
import EntityInfoPreview from '../../../components/entities/EntityInfoPreview.jsx'
import useIsMobile from '../../../hooks/useIsMobile.js'

export default function EntitiesTab({ 
  entities = [], 
  loading = false, 
  error = '',
  locationId,
  worldId,
  onEntitiesChange,
}) {
  const { user } = useAuth()
  const { activeWorldId } = useCampaignContext()
  const isMobile = useIsMobile()
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const [addingId, setAddingId] = useState(null)

  const canEdit = user?.role === 'system_admin' || true // TODO: Check location edit permissions

  const handleSearch = useCallback(async (query) => {
    if (!query || !query.trim() || !worldId) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    setSearchError('')
    try {
      const response = await searchEntities({
        worldId,
        query: query.trim(),
        limit: 20,
      })
      const data = Array.isArray(response?.data) ? response.data : []
      // Filter out entities already in this location
      const existingIds = new Set(entities.map(e => e.id))
      const filtered = data.filter(entity => !existingIds.has(entity.id))
      setSearchResults(filtered)
    } catch (err) {
      console.error('Failed to search entities:', err)
      setSearchError(err.message || 'Failed to search entities')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [worldId, entities])

  const handleAddEntity = useCallback(async (entityId) => {
    if (!locationId || !entityId) return

    setAddingId(entityId)
    try {
      await addEntityToLocation(locationId, entityId)
      if (onEntitiesChange) {
        onEntitiesChange()
      }
      setShowAddModal(false)
      setSearchQuery('')
      setSearchResults([])
    } catch (err) {
      console.error('Failed to add entity:', err)
      alert(err.message || 'Failed to add entity to location')
    } finally {
      setAddingId(null)
    }
  }, [locationId, onEntitiesChange])

  const handleRemoveEntity = useCallback(async (entityId) => {
    if (!locationId || !entityId) return
    if (!confirm('Are you sure you want to remove this entity from this location?')) return

    setRemovingId(entityId)
    try {
      await removeEntityFromLocation(locationId, entityId)
      if (onEntitiesChange) {
        onEntitiesChange()
      }
    } catch (err) {
      console.error('Failed to remove entity:', err)
      alert(err.message || 'Failed to remove entity from location')
    } finally {
      setRemovingId(null)
    }
  }, [locationId, onEntitiesChange])

  if (loading) {
    return (
      <div className="entity-tab-content">
        <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
          <h2 className="entity-card-title">Entities</h2>
          <p>Loading entities...</p>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="entity-tab-content">
        <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
          <h2 className="entity-card-title">Entities</h2>
          <div className="alert error">{error}</div>
        </section>
      </div>
    )
  }

  return (
    <div className="entity-tab-content">
      <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="entity-card-title" style={{ margin: 0 }}>Entities in this Location</h2>
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              <span>Add Entity</span>
            </button>
          )}
        </div>
        
        {entities.length === 0 ? (
          <p className="entity-empty-state">No entities are located here.</p>
        ) : (
          <div className="entity-list">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="entity-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="entity-link-with-preview" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link
                        to={`/entities/${entity.id}`}
                        style={{
                          fontWeight: 500,
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        {entity.name}
                      </Link>
                      <EntityInfoPreview entityId={entity.id} entityName={entity.name} />
                    </span>
                    {entity.entityType && (
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        ({entity.entityType.name})
                      </span>
                    )}
                  </div>
                  {entity.description && (
                    <p style={{ marginTop: '0.25rem', color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                      {entity.description}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRemoveEntity(entity.id)}
                    disabled={removingId === entity.id}
                    style={{
                      marginLeft: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                    title="Remove entity from location"
                  >
                    {removingId === entity.id ? (
                      <span>Removing...</span>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false)
              setSearchQuery('')
              setSearchResults([])
            }
          }}
        >
          <div
            className="entity-card bg-white rounded-lg border"
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Add Entity to Location</h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setShowAddModal(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="entity-search" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Search for entity
              </label>
              <input
                id="entity-search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const query = e.target.value
                  setSearchQuery(query)
                  handleSearch(query)
                }}
                placeholder="Type to search..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                }}
              />
            </div>

            {searchError && (
              <div className="alert error" style={{ marginBottom: '1rem' }}>
                {searchError}
              </div>
            )}

            {searchLoading && (
              <p style={{ textAlign: 'center', color: '#6b7280' }}>Searching...</p>
            )}

            {!searchLoading && searchQuery && searchResults.length === 0 && !searchError && (
              <p style={{ textAlign: 'center', color: '#6b7280' }}>No entities found</p>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {searchResults.map((entity) => (
                  <div
                    key={entity.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{entity.name}</div>
                      {entity.typeName && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{entity.typeName}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAddEntity(entity.id)}
                      disabled={addingId === entity.id}
                    >
                      {addingId === entity.id ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
