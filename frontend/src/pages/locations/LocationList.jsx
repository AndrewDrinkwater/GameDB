// src/pages/locations/LocationList.jsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Plus, Trash2, Pencil, ArrowUp, X, RotateCcw } from 'lucide-react'
import {
  fetchLocations,
  deleteLocation,
  fetchLocationPath,
} from '../../api/locations.js'
import { fetchLocationTypes } from '../../api/locationTypes.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import LocationForm from './LocationForm.jsx'
import LocationInfoPreview from '../../components/locations/LocationInfoPreview.jsx'

export default function LocationList() {
  const { activeWorldId } = useCampaignContext()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [locations, setLocations] = useState([])
  const [locationTypes, setLocationTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedParentId, setSelectedParentId] = useState(
    searchParams.get('parentId') || null
  )
  const selectedLocationTypeId = searchParams.get('locationType') || null
  const [path, setPath] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  
  // Check if user can manage locations
  const canManage = Boolean(user?.role === 'system_admin' || user?.id)

  const loadLocations = useCallback(async () => {
    if (!activeWorldId) return
    
    setLoading(true)
    setError(null)
    try {
      const params = {
        worldId: activeWorldId,
        includeEntities: 'true',
      }
      
      // Only include parentId if it's actually set (not null)
      // When parentId is not provided, backend defaults to root locations
      if (selectedParentId) {
        params.parentId = selectedParentId
      }
      
      // Filter by location type if provided
      if (selectedLocationTypeId) {
        params.locationTypeId = selectedLocationTypeId
      }
      
      const res = await fetchLocations(params)
      setLocations(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load locations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeWorldId, selectedParentId, selectedLocationTypeId])

  const loadLocationTypes = useCallback(async () => {
    if (!activeWorldId) return
    
    try {
      const res = await fetchLocationTypes({ worldId: activeWorldId })
      setLocationTypes(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load location types:', err)
    }
  }, [activeWorldId])

  const loadPath = useCallback(async () => {
    if (!selectedParentId) {
      setPath([])
      return
    }
    
    try {
      const res = await fetchLocationPath(selectedParentId)
      setPath(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load path:', err)
      setPath([])
    }
  }, [selectedParentId])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  useEffect(() => {
    loadLocationTypes()
  }, [loadLocationTypes])

  useEffect(() => {
    loadPath()
  }, [loadPath])

  useEffect(() => {
    const params = {}
    if (selectedParentId) {
      params.parentId = selectedParentId
    }
    if (selectedLocationTypeId) {
      params.locationType = selectedLocationTypeId
    }
    setSearchParams(params)
  }, [selectedParentId, selectedLocationTypeId, setSearchParams])

  const handleDelete = async (location) => {
    if (!canManage || !location?.id) return
    const confirmed = window.confirm(
      `Delete location "${location.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(location.id)
      await deleteLocation(location.id)
      loadLocations()
    } catch (err) {
      console.error('❌ Failed to delete location', err)
      setError(err.message || 'Failed to delete location')
    } finally {
      setDeletingId('')
    }
  }

  const handleNavigateToParent = () => {
    if (path.length > 1) {
      const parentId = path[path.length - 2].id
      setSelectedParentId(parentId)
    } else {
      setSelectedParentId(null)
    }
  }

  const handleNavigateToChild = (locationId) => {
    setSelectedParentId(locationId)
  }

  const handleNew = () => {
    setEditingLocation(null)
    setPanelOpen(true)
  }

  const handleEdit = (location) => {
    setEditingLocation(location)
    setPanelOpen(true)
  }

  const handleFormClose = () => {
    setPanelOpen(false)
    setEditingLocation(null)
  }

  const handleFormSuccess = () => {
    setPanelOpen(false)
    setEditingLocation(null)
    loadLocations()
  }

  const { selectedCampaign, activeWorld } = useCampaignContext()
  const activeTypeName = selectedLocationTypeId
    ? locationTypes.find((t) => t.id === selectedLocationTypeId)?.name || ''
    : ''

  if (!activeWorldId) {
    return (
      <section className="entities-page">
        <div className="entities-header">
          <div className="entities-header-top">
            <div className="entities-header-left">
              <h1>Locations</h1>
              <p className="entities-subtitle">
                Select a campaign or world you own to choose a world context.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const locationSubtitle = selectedCampaign
    ? `${selectedCampaign.name}${activeWorld?.name ? ` · ${activeWorld.name}` : ''}`
    : activeWorld?.name
      ? `World · ${activeWorld.name}`
      : ''

  return (
    <section className="entities-page">
      <div className="entities-header">
        <div className="entities-header-top">
          <div className="entities-header-left">
            <h1>
              {selectedLocationTypeId && activeTypeName ? activeTypeName : 'Locations'}
            </h1>
            {locationSubtitle && <p className="entities-subtitle">{locationSubtitle}</p>}
            {selectedLocationTypeId && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  className="btn secondary compact"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams)
                    params.delete('locationType')
                    setSearchParams(params)
                  }}
                  title="Clear location type filter"
                >
                  <X size={14} /> Clear Filter
                </button>
              </div>
            )}
          </div>
          <div className="entities-header-right">
            <button
              type="button"
              className="icon-btn"
              title="Refresh locations"
              onClick={loadLocations}
              disabled={loading || !activeWorldId}
            >
              <RotateCcw size={16} />
            </button>
            <button className="btn submit" onClick={handleNew} disabled={!activeWorldId || loading}>
              <Plus size={18} /> Add Location
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb navigation */}
      {path.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setSelectedParentId(null)}
          >
            Root
          </button>
          {path.map((item, index) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ChevronRight size={16} />
              {index === path.length - 1 ? (
                <span style={{ fontWeight: 'bold' }}>{item.name}</span>
              ) : (
                <button
                  className="btn btn-sm btn-link"
                  onClick={() => setSelectedParentId(item.id)}
                >
                  {item.name}
                </button>
              )}
            </div>
          ))}
          {path.length > 1 && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleNavigateToParent}
              style={{ marginLeft: 'auto' }}
            >
              <ArrowUp size={16} /> Up
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="alert error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading locations...</p>
      ) : locations.length === 0 ? (
        <p>No locations found. Create your first location to get started.</p>
      ) : (
        <div className="entities-table-wrapper">
          <table className="entities-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Children</th>
                <th>Entities</th>
                {canManage && <th className="actions-column">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <td>
                    {location.childCount > 0 ? (
                      <>
                        <button
                          onClick={() => handleNavigateToChild(location.id)}
                          style={{ 
                            textAlign: 'left', 
                            padding: 0, 
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#1d4ed8',
                            textDecoration: 'none',
                            fontFamily: 'inherit',
                            fontSize: 'inherit'
                          }}
                          className="entity-name-link"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none'
                          }}
                        >
                          {location.name}
                        </button>
                        {'\u00A0'}
                        <ChevronRight size={16} style={{ marginLeft: '0.25rem', display: 'inline-block', verticalAlign: 'middle', color: '#6b7280' }} />
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/locations/${location.id}`}
                          className="entity-name-link"
                        >
                          {location.name}
                        </Link>
                        {location.id ? (
                          <>
                            {'\u00A0'}
                            <LocationInfoPreview locationId={location.id} locationName={location.name || 'location'} />
                          </>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td>{location.locationType?.name || '—'}</td>
                  <td>{location.description || '—'}</td>
                  <td>{location.childCount || 0}</td>
                  <td>{location.entities?.length || 0}</td>
                  {canManage && (
                    <td className="actions-column">
                      <div className="entity-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleEdit(location)}
                          title="Edit location"
                          disabled={loading}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => handleDelete(location)}
                          title="Delete location"
                          disabled={deletingId === location.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panelOpen && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{editingLocation ? 'Edit Location' : 'New Location'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={handleFormClose}
                title="Close form"
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-content">
              <LocationForm
                location={editingLocation}
                parentId={selectedParentId}
                locationTypes={locationTypes}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

