// src/pages/locations/tabs/LocationsTab.jsx
import { Link } from 'react-router-dom'
import { MapPin, ChevronRight } from 'lucide-react'
import { fetchLocations } from '../../../api/locations.js'
import { useCallback, useEffect, useState } from 'react'

export default function LocationsTab({ location, worldId, path = [] }) {
  const [childLocations, setChildLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
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
        <h2 className="entity-card-title">Child Locations</h2>
        
        {childLocations.length === 0 ? (
          <p className="entity-empty-state">This location has no child locations.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {childLocations.map((childLocation) => (
              <li 
                key={childLocation.id} 
                style={{ 
                  marginBottom: '0.75rem', 
                  paddingBottom: '0.75rem', 
                  borderBottom: childLocations.indexOf(childLocation) < childLocations.length - 1 ? '1px solid #e5e7eb' : 'none'
                }}
              >
                <Link 
                  to={`/locations/${childLocation.id}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <MapPin size={16} />
                  <span style={{ fontWeight: 500 }}>{childLocation.name}</span>
                  {childLocation.locationType && (
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      ({childLocation.locationType.name})
                    </span>
                  )}
                  {childLocation.childCount > 0 && (
                    <ChevronRight size={16} style={{ marginLeft: 'auto', color: '#6b7280' }} />
                  )}
                </Link>
                {childLocation.description && (
                  <p style={{ marginTop: '0.25rem', marginLeft: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                    {childLocation.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

