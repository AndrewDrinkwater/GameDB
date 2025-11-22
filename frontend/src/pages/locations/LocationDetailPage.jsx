// src/pages/locations/LocationDetailPage.jsx
import { useCallback, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, MapPin, ChevronRight } from 'lucide-react'
import {
  fetchLocationById,
  deleteLocation,
  fetchLocationPath,
  fetchLocationEntities,
} from '../../api/locations.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import LocationForm from './LocationForm.jsx'
import { fetchLocationTypes } from '../../api/locationTypes.js'

export default function LocationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeWorldId } = useCampaignContext()
  
  const [location, setLocation] = useState(null)
  const [entities, setEntities] = useState([])
  const [path, setPath] = useState([])
  const [locationTypes, setLocationTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const loadLocation = useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetchLocationById(id)
      setLocation(res?.data)
    } catch (err) {
      console.error('❌ Failed to load location:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadEntities = useCallback(async () => {
    if (!id) return
    
    try {
      const res = await fetchLocationEntities(id)
      setEntities(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load entities:', err)
    }
  }, [id])

  const loadPath = useCallback(async () => {
    if (!id) return
    
    try {
      const res = await fetchLocationPath(id)
      setPath(res?.data || [])
    } catch (err) {
      console.error('❌ Failed to load path:', err)
    }
  }, [id])

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
    loadLocation()
    loadEntities()
    loadPath()
    loadLocationTypes()
  }, [loadLocation, loadEntities, loadPath, loadLocationTypes])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this location?')) return
    
    try {
      await deleteLocation(id)
      navigate('/locations')
    } catch (err) {
      console.error('❌ Failed to delete location:', err)
      alert(err.message)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    loadLocation()
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Loading location...</p>
      </div>
    )
  }

  if (error || !location) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error || 'Location not found'}</div>
        <Link to="/locations" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Locations
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/locations" className="btn btn-secondary">
            <ArrowLeft size={16} />
          </Link>
          <h1>{location.name}</h1>
          <button className="btn btn-secondary" onClick={() => setShowForm(true)}>
            <Edit size={16} /> Edit
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {path.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/locations" className="btn btn-sm btn-secondary">
            Root
          </Link>
          {path.map((item, index) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ChevronRight size={16} />
              {index === path.length - 1 ? (
                <span style={{ fontWeight: 'bold' }}>{item.name}</span>
              ) : (
                <Link to={`/locations?parentId=${item.id}`} className="btn btn-sm btn-link">
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="detail-section">
        <h2>Details</h2>
        <dl>
          <dt>Type</dt>
          <dd>{location.locationType?.name || '—'}</dd>
          
          <dt>Description</dt>
          <dd>{location.description || '—'}</dd>
          
          {location.parent && (
            <>
              <dt>Parent</dt>
              <dd>
                <Link to={`/locations/${location.parent.id}`}>
                  {location.parent.name}
                </Link>
              </dd>
            </>
          )}
          
          <dt>Children</dt>
          <dd>{location.childCount || 0}</dd>
        </dl>
      </div>

      {location.children && location.children.length > 0 && (
        <div className="detail-section">
          <h2>Child Locations</h2>
          <ul>
            {location.children.map((child) => (
              <li key={child.id}>
                <Link to={`/locations/${child.id}`}>
                  <MapPin size={16} /> {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="detail-section">
        <h2>Entities in this Location ({entities.length})</h2>
        {entities.length === 0 ? (
          <p>No entities in this location.</p>
        ) : (
          <ul>
            {entities.map((entity) => (
              <li key={entity.id}>
                <Link to={`/entities/${entity.id}`}>
                  {entity.name} ({entity.entityType?.name || 'Unknown Type'})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <LocationForm
          location={location}
          locationTypes={locationTypes}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

