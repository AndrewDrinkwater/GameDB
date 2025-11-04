import { Link } from 'react-router-dom'
import EntityRelationshipFilters from '../../../components/entities/EntityRelationshipFilters.jsx'
import EntityInfoPreview from '../../../components/entities/EntityInfoPreview.jsx'

export default function RelationshipsTab({
  entity,
  toast,
  canEdit,
  relationshipsLoading,
  relationshipsError,
  filteredRelationships,
  sortedRelationships,
  relationshipsEmptyMessage,
  relationshipFilters,
  relationshipFilterOptions,
  filterButtonDisabled,
  handleRelationshipFiltersChange,
  handleRelationshipFiltersReset,
  setShowRelationshipForm,
}) {
  return (
    <div className="entity-tab-content">
      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          <span>{toast.message}</span>
          {toast.link ? (
            <Link to={toast.link.to} className="toast-banner-link">
              {toast.link.label}
            </Link>
          ) : null}
        </div>
      )}

      <section className="entity-card">
        <div className="entity-card-header">
          <h2 className="entity-card-title">Relationships</h2>
          <div className="entity-card-actions">
            <EntityRelationshipFilters
              options={relationshipFilterOptions}
              value={relationshipFilters}
              onChange={handleRelationshipFiltersChange}
              onReset={handleRelationshipFiltersReset}
              disabled={filterButtonDisabled}
            />
            {canEdit && (
              <button
                type="button"
                className="btn"
                onClick={() => setShowRelationshipForm(true)}
              >
                Add relationship
              </button>
            )}
          </div>
        </div>

        <div className="entity-card-body">
          {relationshipsLoading ? (
            <p>Loading relationships...</p>
          ) : relationshipsError ? (
            <div className="alert error" role="alert">
              {relationshipsError}
            </div>
          ) : sortedRelationships.length === 0 ? (
            <p className="entity-empty-state">{relationshipsEmptyMessage}</p>
          ) : filteredRelationships.length === 0 ? (
            <p className="entity-empty-state">
              No relationships match your filters.
            </p>
          ) : (
            <div className="entity-relationships-table-wrapper">
              <table className="entity-relationships-table">
                <thead>
                  <tr>
                    <th>Relationship</th>
                    <th>Type</th>
                    <th>Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRelationships.map((relationship) => {
                    const isSource =
                      String(relationship.fromId) === String(entity.id)
                    const relatedName = isSource
                      ? relationship.toName
                      : relationship.fromName
                    const relatedId = isSource
                      ? relationship.toId
                      : relationship.fromId

                    const sourceLabel =
                      relationship.sourceLabel ||
                      relationship.source_relationship_label ||
                      ''
                    const targetLabel =
                      relationship.targetLabel ||
                      relationship.target_relationship_label ||
                      ''

                    return (
                      <tr key={relationship.id}>
                        <td>
                          <strong>{entity.name}</strong>{' '}
                          {isSource ? sourceLabel : targetLabel}{' '}
                          <Link to={`/entities/${relatedId}`}>
                            {relatedName || '—'}
                          </Link>
                          {relatedId ? (
                            <EntityInfoPreview
                              entityId={relatedId}
                              entityName={relatedName}
                            />
                          ) : null}
                        </td>
                        <td>{relationship.typeName || '—'}</td>
                        <td>{isSource ? 'Outgoing' : 'Incoming'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
