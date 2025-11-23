// src/pages/locations/LocationForm.jsx
import { useState, useEffect, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  createLocation,
  updateLocation,
  fetchLocations,
  fetchLocationEntities,
} from '../../api/locations.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { getAncestorTypeIds } from '../../utils/locationTypeHierarchy.js'

export default function LocationForm({ location, parentId, locationTypes, onClose, onSuccess }) {
  const { activeWorldId } = useCampaignContext()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location_type_id: '',
    parent_id: parentId || null,
    metadata: {},
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [availableParents, setAvailableParents] = useState([])
  const [entities, setEntities] = useState([])
  const [childLocations, setChildLocations] = useState([])
  const [loadingRelated, setLoadingRelated] = useState(false)

  const loadAvailableParents = useCallback(async (selectedTypeId = null) => {
    if (!activeWorldId) return
    try {
      const res = await fetchLocations({
        worldId: activeWorldId,
        all: 'true', // Get all locations, not just root ones
      })
      const allLocations = res?.data || []
      
      // Filter out the current location and its ancestors to prevent circular references
      let filtered = allLocations
      
      if (location?.id) {
        const currentLocationIdStr = String(location.id)
        
        // First, exclude the current location itself
        filtered = filtered.filter((loc) => {
          const locIdStr = String(loc.id)
          return locIdStr !== currentLocationIdStr
        })
        
        // Then, exclude all ancestors (the path from root to current location)
        // The path includes the current location, so we exclude all items in the path
        try {
          const { fetchLocationPath } = await import('../../api/locations.js')
          const pathRes = await fetchLocationPath(location.id)
          const path = pathRes?.data || []
          
          // Create a set of all IDs in the path (including current location)
          const pathIds = new Set(
            path.map((p) => String(p.id))
          )
          
          // Filter out any location that's in the path (ancestors + current)
          filtered = filtered.filter((loc) => {
            const locIdStr = String(loc.id)
            return !pathIds.has(locIdStr)
          })
        } catch (err) {
          console.error('❌ [Parent Selection] Failed to load location path for ancestor exclusion:', err)
          // If we can't load the path, at least exclude the current location
        }
      }

      // Filter by location type hierarchy: only show locations with types that are ancestors
      // (parent, grandparent, etc.) of the current location's type
      // Use the passed selectedTypeId, or fall back to location's type
      const typeIdToUse = selectedTypeId || location?.location_type_id
      
      if (typeIdToUse && locationTypes && locationTypes.length > 0) {
        const currentTypeId = String(typeIdToUse)
        const currentType = locationTypes.find(t => String(t.id) === currentTypeId)
        
        const ancestorTypeIds = getAncestorTypeIds(currentTypeId, locationTypes)
        
        // Explicitly exclude the current type itself (to avoid showing peers)
        const currentTypeIdStr = String(currentTypeId)
        
        if (ancestorTypeIds.length > 0) {
          const ancestorTypeIdSet = new Set(ancestorTypeIds.map(id => String(id)))
          
          filtered = filtered.filter((loc) => {
            const locTypeId = loc.location_type_id || loc.locationType?.id
            const locTypeIdStr = locTypeId ? String(locTypeId) : ''
            const isAncestorType = ancestorTypeIdSet.has(locTypeIdStr)
            const isNotCurrentType = locTypeIdStr !== currentTypeIdStr
            const matches = locTypeIdStr && isAncestorType && isNotCurrentType
            
            // Only include locations with ancestor types (excludes same type and descendant types)
            // Also explicitly exclude the current type to avoid showing peers
            return matches
          })
        } else {
          // If no ancestor types found, show no parents (current type has no parent types)
          filtered = []
        }
      } else {
        // When creating a new location, if we can't filter by type, show all locations
        // (user hasn't selected a type yet, so we can't enforce hierarchy)
        // When editing, if we can't filter, show nothing to prevent invalid selections
        if (!location) {
          // Creating new location - show all locations until type is selected
          // filtered already contains all locations (minus circular refs)
        } else {
          // Editing existing location - don't show any if we can't filter safely
          filtered = []
        }
      }
      
      setAvailableParents(filtered)
    } catch (err) {
      console.error('❌ [Parent Selection] Failed to load available parents:', err)
      setAvailableParents([])
    }
  }, [activeWorldId, location, locationTypes])

  const loadEntities = useCallback(async () => {
    if (!location?.id) {
      setEntities([])
      return
    }
    setLoadingRelated(true)
    try {
      const res = await fetchLocationEntities(location.id)
      setEntities(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load entities:', err)
      setEntities([])
    } finally {
      setLoadingRelated(false)
    }
  }, [location?.id])

  const loadChildLocations = useCallback(async () => {
    if (!location?.id) {
      setChildLocations([])
      return
    }
    setLoadingRelated(true)
    try {
      const res = await fetchLocations({
        worldId: activeWorldId,
        parentId: location.id,
      })
      setChildLocations(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load child locations:', err)
      setChildLocations([])
    } finally {
      setLoadingRelated(false)
    }
  }, [location?.id, activeWorldId])

  // Initialize form data when location or parentId changes
  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        location_type_id: location.location_type_id || '',
        parent_id: location.parent_id || parentId || null,
        metadata: location.metadata || {},
      })
      loadEntities()
      loadChildLocations()
    } else {
      setFormData({
        name: '',
        description: '',
        location_type_id: '',
        parent_id: parentId || null,
        metadata: {},
      })
      setEntities([])
      setChildLocations([])
    }
    // Load available parents with the location's type (if editing) or empty (if creating)
    loadAvailableParents(location?.location_type_id || null)
  }, [location, parentId, loadEntities, loadChildLocations])

  // Reload available parents when location type changes in the form
  useEffect(() => {
    if (formData.location_type_id) {
      loadAvailableParents(formData.location_type_id)
    } else if (!location) {
      // If creating a new location and no type selected, show all locations (no type filter)
      loadAvailableParents(null)
    }
  }, [formData.location_type_id, loadAvailableParents, location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        world_id: activeWorldId,
        name: formData.name,
        description: formData.description,
        location_type_id: formData.location_type_id || null,
        parent_id: formData.parent_id || null,
        metadata: formData.metadata,
      }

      let result
      if (location) {
        result = await updateLocation(location.id, payload)
      } else {
        result = await createLocation(payload)
      }

      // Pass the created/updated location to onSuccess if it accepts a parameter
      const locationData = result?.data || result
      if (onSuccess.length > 0) {
        onSuccess(locationData)
      } else {
        onSuccess()
      }
    } catch (err) {
      console.error('❌ Failed to save location:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="entity-type-form">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="parent_id">Parent</label>
            <select
              id="parent_id"
              value={formData.parent_id || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parent_id: e.target.value ? e.target.value : null,
                })
              }
            >
              <option value="">None (Root Location)</option>
              {availableParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location_type_id">Type *</label>
            <select
              id="location_type_id"
              value={formData.location_type_id}
              onChange={(e) => setFormData({ ...formData, location_type_id: e.target.value })}
              required
            >
              <option value="">Select a type...</option>
              {locationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          {location && (
            <>
              <div
                className="form-group"
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1rem',
                  marginTop: '1rem',
                }}
              >
                <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
                  Entities Located Here ({entities.length})
                </label>
                {loadingRelated ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading entities...</p>
                ) : entities.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    No entities in this location.
                  </p>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {entities.map((entity) => (
                      <li
                        key={entity.id}
                        style={{
                          padding: '0.5rem',
                          marginBottom: '0.25rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '4px',
                        }}
                      >
                        <Link
                          to={`/entities/${entity.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none',
                            color: '#1e293b',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                          <span>
                            {entity.name}
                            {entity.entityType && (
                              <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                ({entity.entityType.name})
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                className="form-group"
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1rem',
                  marginTop: '1rem',
                }}
              >
                <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>
                  Child Locations ({childLocations.length})
                </label>
                {loadingRelated ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading child locations...</p>
                ) : childLocations.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    No child locations.
                  </p>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {childLocations.map((child) => (
                      <li
                        key={child.id}
                        style={{
                          padding: '0.5rem',
                          marginBottom: '0.25rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '4px',
                        }}
                      >
                        <Link
                          to={`/locations/${child.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none',
                            color: '#1e293b',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                          <span>{child.name}</span>
                          {child.locationType && (
                            <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                              ({child.locationType.name})
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : location ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
  )
}

