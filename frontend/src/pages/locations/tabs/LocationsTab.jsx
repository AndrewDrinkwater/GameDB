// src/pages/locations/tabs/LocationsTab.jsx
import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { fetchLocations, addChildLocation, removeChildLocation } from '../../../api/locations.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { useCampaignContext } from '../../../context/CampaignContext.jsx'
import LocationInfoPreview from '../../../components/locations/LocationInfoPreview.jsx'
import LocationSelect from '../../../components/LocationSelect.jsx'
import DrawerPanel from '../../../components/DrawerPanel.jsx'
import LocationForm from '../../locations/LocationForm.jsx'
import { fetchLocationTypes } from '../../../api/locationTypes.js'
import useIsMobile from '../../../hooks/useIsMobile.js'
import { getDirectChildTypeIds } from '../../../utils/locationTypeHierarchy.js'

export default function LocationsTab({ 
  location, 
  worldId, 
  path = [],
  onLocationsChange,
}) {
  const { user } = useAuth()
  const { activeWorldId } = useCampaignContext()
  const isMobile = useIsMobile()
  const [childLocations, setChildLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [locationTypes, setLocationTypes] = useState([])
  const [removingId, setRemovingId] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const locationFormIdRef = useRef(`location-form-${Math.random().toString(36).slice(2)}`)

  const canEdit = user?.role === 'system_admin' || true // TODO: Check location edit permissions

  const loadChildLocations = useCallback(async () => {
    if (!location?.id || !worldId) {
      setChildLocations([])
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetchLocations({
        worldId,
        parentId: location.id,
        includeEntities: 'false',
      })
      setChildLocations(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load child locations:', err)
      setError(err.message || 'Failed to load child locations')
    } finally {
      setLoading(false)
    }
  }, [location?.id, worldId])

  useEffect(() => {
    loadChildLocations()
  }, [loadChildLocations])

  const loadLocationTypes = useCallback(async () => {
    if (!activeWorldId) return
    try {
      const res = await fetchLocationTypes({ worldId: activeWorldId })
      setLocationTypes(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load location types:', err)
    }
  }, [activeWorldId])

  useEffect(() => {
    loadLocationTypes()
  }, [loadLocationTypes])

  const handleAddLocation = useCallback(async (childLocationId) => {
    if (!location?.id || !childLocationId) return

    setAddingId(childLocationId)
    try {
      await addChildLocation(location.id, childLocationId)
      await loadChildLocations()
      if (onLocationsChange) {
        onLocationsChange()
      }
      setDrawerOpen(false)
      setSelectedLocationId('')
      setShowCreateForm(false)
    } catch (err) {
      console.error('Failed to add child location:', err)
      const errorMessage = err.message || 'Failed to add child location'
      
      // Show user-friendly error message
      if (errorMessage.includes('ancestor')) {
        alert('Cannot add this location as a child because it is an ancestor of the current location. This would create a circular reference.')
      } else {
        alert(errorMessage)
      }
    } finally {
      setAddingId(null)
    }
  }, [location?.id, loadChildLocations, onLocationsChange])

  const handleLocationSelect = useCallback((locationId) => {
    if (!locationId) return
    handleAddLocation(locationId)
  }, [handleAddLocation])

  const handleCreateLocation = useCallback(() => {
    setShowCreateForm(true)
  }, [])

  const handleCreateSuccess = useCallback(async (newLocation) => {
    if (newLocation?.id) {
      // Automatically add the newly created location as a child
      await handleAddLocation(newLocation.id)
    } else {
      // If location data not provided, close drawer
      setDrawerOpen(false)
      setShowCreateForm(false)
    }
  }, [handleAddLocation])

  const handleCreateCancel = useCallback(() => {
    setShowCreateForm(false)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
    setSelectedLocationId('')
    setShowCreateForm(false)
  }, [])

  const [ancestorIds, setAncestorIds] = useState([])

  // Load ancestor IDs to exclude from selection
  useEffect(() => {
    if (!location?.id) {
      setAncestorIds([])
      return
    }

    const loadAncestors = async () => {
      try {
        const { fetchLocationPath } = await import('../../../api/locations.js')
        const res = await fetchLocationPath(location.id)
        const path = res?.data || []
        // Get all ancestor IDs from the path (excluding the current location itself)
        const ancestorIdsList = path
          .filter((p) => p.id !== location.id)
          .map((p) => p.id)
        setAncestorIds(ancestorIdsList)
      } catch (err) {
        console.error('Failed to load location path:', err)
        setAncestorIds([])
      }
    }

    loadAncestors()
  }, [location?.id])

  const excludeIds = useMemo(() => {
    return [
      location?.id,
      ...childLocations.map((l) => l.id),
      ...ancestorIds,
    ].filter(Boolean)
  }, [location?.id, childLocations, ancestorIds])

  // Get direct child type IDs for filtering child location selection
  // Only show types that are DIRECT children (not grandchildren, etc.)
  const allowedChildTypeIds = useMemo(() => {
    if (!location?.location_type_id || !locationTypes || locationTypes.length === 0) {
      return []
    }
    const currentTypeId = String(location.location_type_id)
    const currentType = locationTypes.find(t => String(t.id) === currentTypeId)
    
    // Get only DIRECT child types (not all descendants)
    const directChildTypeIds = getDirectChildTypeIds(currentTypeId, locationTypes)
    
    return directChildTypeIds
  }, [location?.location_type_id, locationTypes])

  const handleRemoveLocation = useCallback(async (childLocationId) => {
    if (!location?.id || !childLocationId) return
    if (!confirm('Are you sure you want to remove this location as a child?')) return

    setRemovingId(childLocationId)
    try {
      await removeChildLocation(location.id, childLocationId)
      await loadChildLocations()
      if (onLocationsChange) {
        onLocationsChange()
      }
    } catch (err) {
      console.error('Failed to remove child location:', err)
      alert(err.message || 'Failed to remove child location')
    } finally {
      setRemovingId(null)
    }
  }, [location?.id, loadChildLocations, onLocationsChange])

  if (loading) {
    return (
      <div className="entity-tab-content">
        <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
          <h2 className="entity-card-title">Locations</h2>
          <p>Loading locations...</p>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="entity-tab-content">
        <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
          <h2 className="entity-card-title">Locations</h2>
          <div className="alert error">{error}</div>
        </section>
      </div>
    )
  }

  return (
    <div className="entity-tab-content">
      {location?.parent && (
        <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full" style={{ marginBottom: '1rem' }}>
          <h2 className="entity-card-title">Parent Location</h2>
          <div style={{ marginTop: '0.5rem' }}>
            <Link 
              to={`/locations/${location.parent.id}`}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <MapPin size={16} />
              <span style={{ fontWeight: 500 }}>{location.parent.name}</span>
            </Link>
          </div>
        </section>
      )}

      <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="entity-card-title" style={{ margin: 0 }}>Child Locations</h2>
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setDrawerOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              <span>Add Location</span>
            </button>
          )}
        </div>
        
        {childLocations.length === 0 ? (
          <p className="entity-empty-state">This location has no child locations.</p>
        ) : (
          <div className="entity-list">
            {childLocations.map((childLocation) => (
              <div
                key={childLocation.id}
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
                  <span className="location-link-with-preview" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <Link 
                      to={`/locations/${childLocation.id}`}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        textDecoration: 'none',
                        color: 'inherit',
                        flex: 1,
                      }}
                    >
                      <MapPin size={16} />
                      <span style={{ fontWeight: 500 }}>{childLocation.name}</span>
                    </Link>
                    <LocationInfoPreview locationId={childLocation.id} locationName={childLocation.name} />
                  </span>
                  {childLocation.locationType && (
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      ({childLocation.locationType.name})
                    </span>
                  )}
                  {childLocation.childCount > 0 && (
                    <ChevronRight size={16} style={{ marginLeft: 'auto', color: '#6b7280' }} />
                  )}
                  {childLocation.description && (
                    <p style={{ marginTop: '0.25rem', marginLeft: '1.5rem', color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 1.5rem' }}>
                      {childLocation.description}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRemoveLocation(childLocation.id)}
                    disabled={removingId === childLocation.id}
                    style={{
                      marginLeft: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                    title="Remove child location"
                  >
                    {removingId === childLocation.id ? (
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

      <DrawerPanel
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        title={showCreateForm ? 'Create Location' : 'Add Child Location'}
        size="md"
      >
        {showCreateForm ? (
          <LocationForm
            location={null}
            parentId={location?.id}
            locationTypes={locationTypes}
            onClose={handleCreateCancel}
            onSuccess={handleCreateSuccess}
          />
        ) : (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="location-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Search and select a location
              </label>
              <LocationSelect
                worldId={activeWorldId}
                value={selectedLocationId}
                onChange={handleLocationSelect}
                placeholder="Type to search locations..."
                excludeIds={excludeIds}
                allowedTypeIds={allowedChildTypeIds}
                onLocationResolved={(loc) => {
                  if (loc) {
                    setSelectedLocationId(loc.id)
                  }
                }}
              />
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ marginBottom: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>
                Can't find the location you're looking for?
              </p>
              <button
                type="button"
                className="btn secondary"
                onClick={handleCreateLocation}
                style={{ width: '100%' }}
              >
                <Plus size={16} style={{ marginRight: '0.5rem' }} />
                Create New Location
              </button>
            </div>
          </div>
        )}
      </DrawerPanel>
    </div>
  )
}
