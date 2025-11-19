import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import EntityInfoPreview from '../../../components/entities/EntityInfoPreview.jsx'
import DrawerPanel from '../../../components/DrawerPanel.jsx'
import RelationshipBuilder from '../../../modules/relationships3/RelationshipBuilder.jsx'

export default function RelationshipsTab({
  entity,
  toast,
  onExplore,
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
  showRelationshipForm,
  setShowRelationshipForm,
  worldId,
  loadRelationships,
}) {
  const [showForm, setShowForm] = useState(false)
  const drawerOpen = showRelationshipForm !== undefined ? showRelationshipForm : showForm
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  useEffect(() => {
    if (!filterOpen) return

    const handlePointerDown = (event) => {
      if (!filterRef.current) return
      if (!filterRef.current.contains(event.target)) {
        setFilterOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [filterOpen])

  const relationshipTypesOptions = Array.isArray(
    relationshipFilterOptions?.relationshipTypes,
  )
    ? relationshipFilterOptions.relationshipTypes
    : []

  const relatedEntityTypesOptions = Array.isArray(
    relationshipFilterOptions?.relatedEntityTypes,
  )
    ? relationshipFilterOptions.relatedEntityTypes
    : []

  const relationshipTypesFilter =
    relationshipFilters?.relationshipTypes?.values || []
  const relatedEntityTypesFilter =
    relationshipFilters?.relatedEntityTypes?.values || []

  const handleRelationshipTypesChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (opt) => opt.value)
    if (!handleRelationshipFiltersChange) return

    handleRelationshipFiltersChange({
      relationshipTypes: {
        mode: values.length > 0 ? 'include' : 'all',
        values,
      },
      relatedEntityTypes: relationshipFilters?.relatedEntityTypes || {
        mode: 'all',
        values: [],
      },
    })
  }

  const handleRelatedEntityTypesChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (opt) => opt.value)
    if (!handleRelationshipFiltersChange) return

    handleRelationshipFiltersChange({
      relationshipTypes: relationshipFilters?.relationshipTypes || {
        mode: 'all',
        values: [],
      },
      relatedEntityTypes: {
        mode: values.length > 0 ? 'include' : 'all',
        values,
      },
    })
  }

  const handleClearFilters = () => {
    if (handleRelationshipFiltersReset) {
      handleRelationshipFiltersReset()
    }
    setFilterOpen(false)
  }

  const handleFilterDone = () => {
    setFilterOpen(false)
  }

  const isFilterActive =
    (relationshipTypesFilter.length > 0 || relatedEntityTypesFilter.length > 0)

  return (
    <>
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

      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6 mb-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Relationships</h2>

            <div className="flex items-center gap-2">
              {typeof onExplore === 'function' ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onExplore}
                >
                  Explore
                </button>
              ) : null}
              <div className="relative" ref={filterRef}>
                <button
                  id="filterButton"
                  type="button"
                  className={`btn-secondary${isFilterActive ? ' is-active' : ''}`}
                  onClick={() => setFilterOpen((prev) => !prev)}
                  disabled={filterButtonDisabled}
                >
                  Filter
                </button>

                {filterOpen && !filterButtonDisabled ? (
                  <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-4 w-[260px] absolute top-full mt-2 right-0 z-10">
                    <div className="mb-4">
                      <label className="text-sm font-medium text-neutral-700 mb-1 block">
                        Relationship Types
                      </label>
                      <select
                        className="w-full border border-neutral-300 rounded-md px-3 py-1 text-sm"
                        multiple
                        size={5}
                        value={relationshipTypesFilter}
                        onChange={handleRelationshipTypesChange}
                      >
                        {relationshipTypesOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="text-sm font-medium text-neutral-700 mb-1 block">
                        Related Entity Types
                      </label>
                      <select
                        className="w-full border border-neutral-300 rounded-md px-3 py-1 text-sm"
                        multiple
                        size={5}
                        value={relatedEntityTypesFilter}
                        onChange={handleRelatedEntityTypesChange}
                      >
                        {relatedEntityTypesOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <button
                        type="button"
                        className="text-sm text-neutral-600 hover:text-neutral-900"
                        onClick={handleClearFilters}
                      >
                        Clear filters
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-sm"
                        onClick={handleFilterDone}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (setShowRelationshipForm) {
                      setShowRelationshipForm(true)
                    }
                    if (showRelationshipForm === undefined) {
                      setShowForm(true)
                    }
                  }}
                >
                  Add relationship
                </button>
              )}
            </div>
          </div>

          {relationshipsLoading ? (
            <p>Loading relationships...</p>
          ) : relationshipsError ? (
            <div className="alert error" role="alert">
              {relationshipsError}
            </div>
          ) : sortedRelationships.length === 0 ? (
            <p className="text-sm text-neutral-500">{relationshipsEmptyMessage}</p>
          ) : filteredRelationships.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No relationships match your filters.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-600 border-b border-neutral-200">
                  <th className="py-2 font-medium">Relationship</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Direction</th>
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
                    <tr
                      key={relationship.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="py-3">
                        <strong>{entity.name}</strong> {isSource ? sourceLabel : targetLabel}{' '}
                        <Link
                          to={`/entities/${relatedId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {relatedName || '—'}
                        </Link>
                        {relatedId ? (
                          <EntityInfoPreview
                            entityId={relatedId}
                            entityName={relatedName}
                          />
                        ) : null}
                      </td>
                      <td className="py-3">{relationship.typeName || '—'}</td>
                      <td className="py-3">{isSource ? 'Outgoing' : 'Incoming'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {worldId && entity ? (
        <DrawerPanel
          isOpen={drawerOpen}
          onClose={() => {
            if (setShowRelationshipForm) {
              setShowRelationshipForm(false)
            } else {
              setShowForm(false)
            }
          }}
          title="Add relationship"
          description="Link this entity to others without leaving the page."
          size="md"
        >
          <RelationshipBuilder
            worldId={worldId}
            fromEntity={entity}
            onCreated={() => {
              if (setShowRelationshipForm) {
                setShowRelationshipForm(false)
              } else {
                setShowForm(false)
              }
              if (loadRelationships) {
                loadRelationships()
              }
            }}
            onCancel={() => {
              if (setShowRelationshipForm) {
                setShowRelationshipForm(false)
              } else {
                setShowForm(false)
              }
            }}
          />
        </DrawerPanel>
      ) : null}
    </>
  )
}
