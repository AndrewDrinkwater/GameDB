// src/pages/locations/LocationList.jsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, MapPin, Plus, Trash2, Edit, ArrowUp, X } from 'lucide-react'
import {
  fetchLocations,
  deleteLocation,
  fetchLocationPath,
} from '../../api/locations.js'
import { fetchLocationTypes } from '../../api/locationTypes.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import LocationForm from './LocationForm.jsx'

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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) return
    
    try {
      await deleteLocation(id)
      loadLocations()
    } catch (err) {
      console.error('❌ Failed to delete location:', err)
      alert(err.message)
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

  if (!activeWorldId) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Locations</h1>
        </div>
        <p>Please select a world to view locations.</p>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1>
            {selectedLocationTypeId
              ? locationTypes.find((t) => t.id === selectedLocationTypeId)?.name || 'Locations'
              : 'Locations'}
          </h1>
          {selectedLocationTypeId && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setSearchParams({})}
              title="Clear location type filter"
            >
              <X size={14} /> Clear Filter
            </button>
          )}
          <button className="btn btn-primary" onClick={handleNew}>
            <Plus size={16} /> New Location
          </button>
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
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading locations...</p>
      ) : locations.length === 0 ? (
        <p>No locations found. Create your first location to get started.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Children</th>
                <th>Entities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={16} />
                      {location.childCount > 0 ? (
                        <button
                          className="btn btn-link"
                          onClick={() => handleNavigateToChild(location.id)}
                          style={{ textAlign: 'left', padding: 0 }}
                        >
                          {location.name}
                          <ChevronRight size={16} style={{ marginLeft: '0.25rem' }} />
                        </button>
                      ) : (
                        <Link to={`/locations/${location.id}`}>{location.name}</Link>
                      )}
                    </div>
                  </td>
                  <td>{location.locationType?.name || '—'}</td>
                  <td>{location.description || '—'}</td>
                  <td>{location.childCount || 0}</td>
                  <td>{location.entities?.length || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(location)}
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(location.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
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
    </div>
  )
}

