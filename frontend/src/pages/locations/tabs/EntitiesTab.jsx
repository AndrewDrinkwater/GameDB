// src/pages/locations/tabs/EntitiesTab.jsx
import { Link } from 'react-router-dom'

export default function EntitiesTab({ entities = [], loading = false, error = '' }) {
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
        <h2 className="entity-card-title">Entities in this Location</h2>
        
        {entities.length === 0 ? (
          <p className="entity-empty-state">No entities are located here.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {entities.map((entity) => (
              <li key={entity.id} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                <Link 
                  to={`/entities/${entity.id}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{entity.name}</span>
                  {entity.entityType && (
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      ({entity.entityType.name})
                    </span>
                  )}
                </Link>
                {entity.description && (
                  <p style={{ marginTop: '0.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
                    {entity.description}
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

