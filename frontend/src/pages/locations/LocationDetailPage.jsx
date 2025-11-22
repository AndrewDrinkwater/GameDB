// src/pages/locations/LocationDetailPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Trash2, MapPin, ChevronRight } from 'lucide-react'
import {
  fetchLocationById,
  deleteLocation,
  fetchLocationPath,
  fetchLocationEntities,
  updateLocation,
} from '../../api/locations.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import EntityPageLayout from '../../components/entities/EntityPageLayout.jsx'
import EntityHeader from '../../components/entities/EntityHeader.jsx'
import TabNav from '../../components/TabNav.jsx'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../components/RecordForm/FieldRenderer.jsx'
import { formatDateTime } from '../../utils/dateUtils.js'
import useLocationAccess from '../../hooks/useLocationAccess.js'
import useIsMobile from '../../hooks/useIsMobile.js'
import { fetchLocationTypes } from '../../api/locationTypes.js'
import AccessTab from './tabs/AccessTab.jsx'
import SystemTab from './tabs/SystemTab.jsx'

export default function LocationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const { activeWorldId } = useCampaignContext()
  const isMobile = useIsMobile()

  const [location, setLocation] = useState(null)
  const [entities, setEntities] = useState([])
  const [path, setPath] = useState([])
  const [locationTypes, setLocationTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [activeTab, setActiveTab] = useState('dossier')
  const [isEditing, setIsEditing] = useState(false)
  const [headerExpanded, setHeaderExpanded] = useState(false)

  const formRef = useRef(null)
  const [formState, setFormState] = useState({
    isDirty: false,
    isSubmitting: false,
  })

  const canEdit = useMemo(() => {
    if (!location || !user) return false
    if (user.role === 'system_admin') return true
    if (location.world?.created_by && location.world.created_by === user.id) return true
    if (location.created_by && location.created_by === user.id) return true
    return false
  }, [location, user])

  const {
    accessSettings,
    accessOptions,
    accessOptionsError,
    accessOptionsLoading,
    accessSaving,
    accessSaveError,
    accessSaveSuccess,
    isAccessDirty,
    handleAccessSettingChange,
    resetAccessSettings,
    handleAccessSave,
  } = useLocationAccess(location, token, canEdit)

  const worldId = useMemo(
    () => location?.world?.id || location?.world_id || activeWorldId || '',
    [location, activeWorldId],
  )

  const loadLocation = useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    setError('')
    try {
      const res = await fetchLocationById(id)
      setLocation(res?.data || res)
    } catch (err) {
      console.error('❌ Failed to load location:', err)
      setError(err.message || 'Failed to load location')
      setLocation(null)
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
    if (sessionReady && token) {
      loadLocation()
      loadEntities()
      loadPath()
      loadLocationTypes()
    }
  }, [sessionReady, token, loadLocation, loadEntities, loadPath, loadLocationTypes])

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

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Exit edit mode - reset access settings if dirty
      if (isAccessDirty) {
        resetAccessSettings()
      }
    }
    setIsEditing(!isEditing)
    setFormError('')
  }, [isEditing, isAccessDirty, resetAccessSettings])

  const handleUpdate = useCallback(async (data) => {
    if (!location?.id || !canEdit) return false

    setFormError('')
    setFormState((prev) => ({ ...prev, isSubmitting: true }))

    try {
      const payload = {
        name: data.name || location.name,
        description: data.description || location.description,
        location_type_id: location.location_type_id,
        parent_id: location.parent_id,
      }

      const response = await updateLocation(location.id, payload)
      const updated = response?.data || response

      if (updated) {
        setLocation((prev) => (prev ? { ...prev, ...updated } : updated))
        return true
      }

      return false
    } catch (err) {
      console.error('❌ Failed to update location:', err)
      setFormError(err.message || 'Failed to update location')
      return false
    } finally {
      setFormState((prev) => ({ ...prev, isSubmitting: false }))
    }
  }, [location, canEdit])

  const handleFormStateChange = useCallback((state) => {
    setFormState(state)
  }, [])

  const handleSaveAll = useCallback(async () => {
    if (!canEdit || !location?.id) return false

    let success = true

    // Save form changes if dirty
    if (formState.isDirty && formRef.current) {
      const formResult = await formRef.current.submit()
      if (!formResult) {
        success = false
      }
    }

    // Save access changes if dirty
    if (success && isAccessDirty) {
      const accessResult = await handleAccessSave()
      if (!accessResult) {
        success = false
      } else {
        // Reload location to sync access defaults
        try {
          const response = await fetchLocationById(location.id)
          setLocation(response?.data || response)
        } catch (err) {
          // Don't fail the save operation if reload fails
        }
      }
    }

    if (success) {
      setIsEditing(false)
    }

    return success
  }, [canEdit, location?.id, formState.isDirty, isAccessDirty, handleAccessSave])

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
  }, [])

  const tabItems = useMemo(() => {
    const items = [{ id: 'dossier', label: 'Dossier' }]

    if (canEdit && isEditing) {
      items.push({ id: 'access', label: 'Access' })
    }

    items.push({ id: 'system', label: 'System' })

    return items
  }, [canEdit, isEditing])

  useEffect(() => {
    const availableTabs = new Set(tabItems.map((tab) => tab.id))
    if (!availableTabs.has(activeTab)) {
      setActiveTab('dossier')
    }
  }, [tabItems, activeTab])

  const createdAtValue = location?.createdAt || location?.created_at
  const updatedAtValue = location?.updatedAt || location?.updated_at

  const viewData = useMemo(() => {
    if (!location) return null

    return {
      name: location.name || '—',
      description: location.description || '—',
      typeName: location.locationType?.name || '—',
      worldName: location.world?.name || '—',
      worldId,
      createdAt: formatDateTime(createdAtValue),
      updatedAt: formatDateTime(updatedAtValue),
      createdBy:
        location.creator?.username ||
        location.creator?.email ||
        location.created_by ||
        '—',
      updatedBy: location.updated_by || '—',
    }
  }, [location, worldId, createdAtValue, updatedAtValue])

  const editInitialData = useMemo(() => {
    if (!location) return null

    return {
      name: location.name || '',
      description: location.description || '',
      typeName: location.locationType?.name || '—',
      worldName: location.world?.name || '—',
      worldId,
      createdAt: formatDateTime(createdAtValue),
      updatedAt: formatDateTime(updatedAtValue),
    }
  }, [location, worldId, createdAtValue, updatedAtValue])

  const editSchema = useMemo(() => {
    return {
      title: 'Edit Location',
      sections: [
        {
          title: 'Edit Location',
          columns: 2,
          fields: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'typeName', label: 'Type', type: 'readonly' },
            {
              key: 'description',
              label: 'Description',
              type: 'textarea',
              rows: 4,
              span: 2,
            },
          ],
        },
      ],
    }
  }, [])

  const dossierSchema = useMemo(() => {
    return {
      title: 'Location Overview',
      sections: [
        {
          title: 'Summary',
          columns: 2,
          fields: [
            { key: 'name', label: 'Name', type: 'readonly' },
            { key: 'typeName', label: 'Type', type: 'readonly' },
          ],
        },
        {
          title: 'Description',
          columns: 1,
          fields: [
            {
              key: 'description',
              label: 'Description',
              type: 'textarea',
              rows: 4,
            },
          ],
        },
      ],
    }
  }, [])

  const systemSchema = useMemo(() => {
    return {
      sections: [
        {
          title: 'System',
          columns: 2,
          fields: [
            { key: 'worldName', label: 'World', type: 'readonly' },
            { key: 'createdAt', label: 'Created', type: 'readonly' },
            { key: 'updatedAt', label: 'Updated', type: 'readonly' },
            { key: 'createdBy', label: 'Created By', type: 'readonly' },
          ],
        },
      ],
    }
  }, [])

  const renderSchemaSections = useCallback((schema, data, prefix) => {
    if (!schema) return null
    const sections = Array.isArray(schema.sections) ? schema.sections : []

    return sections.map((section, index) => {
      const sectionKey = `${prefix || 'section'}-${section.title || index}`
      const columnCount = Number.isFinite(section.columns)
        ? Math.max(1, Number(section.columns))
        : 1
      const fields = Array.isArray(section.fields) ? section.fields : []

      return (
        <section key={sectionKey} className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
          {section.title ? <h2 className="entity-card-title">{section.title}</h2> : null}
          <div
            className={`entity-field-grid ${columnCount > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}`}
            style={{ '--entity-field-columns': columnCount }}
          >
            {fields.length > 0 ? (
              fields.map((field, fieldIndex) => {
                const fieldKey =
                  field?.key ||
                  field?.name ||
                  field?.field ||
                  `${sectionKey}-field-${fieldIndex}`

                return (
                  <FieldRenderer
                    key={fieldKey}
                    field={{ ...field }}
                    data={data}
                    mode={isEditing ? 'edit' : 'view'}
                  />
                )
              })
            ) : (
              <p className="entity-empty-state">No fields available.</p>
            )}
          </div>
        </section>
      )
    })
  }, [isEditing])

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
        <div className="alert error">{error || 'Location not found'}</div>
        <Link to="/locations" className="btn btn-secondary">
          ← Back to Locations
        </Link>
      </div>
    )
  }

  const pageClassName = `entity-detail-page${isMobile ? ' entity-detail-page--mobile' : ''}${isMobile && headerExpanded ? ' entity-detail-page--header-expanded' : ''}`

  return (
    <EntityPageLayout maxWidth={1280} className={pageClassName}>
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        <header className={`entity-page-header ${isMobile && !headerExpanded ? 'entity-page-header--collapsed' : ''}`}>
          <div className="entity-page-header__inner">
            {isMobile && (
              <button
                type="button"
                className="entity-page-header__drag-handle"
                onClick={() => setHeaderExpanded(!headerExpanded)}
                aria-label={headerExpanded ? 'Collapse header' : 'Expand header'}
                aria-expanded={headerExpanded}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={headerExpanded ? 'rotated' : ''}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Link to="/locations" className="btn btn-secondary">
                ←
              </Link>
              {canEdit && (
                <button className="btn btn-danger" onClick={handleDelete} title="Delete location">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <EntityHeader
              entityId={id}
              name={location.name}
              canEdit={canEdit}
              isEditing={isEditing}
              onToggleEdit={handleEditToggle}
              onSave={handleSaveAll}
              isSaving={formState.isSubmitting || accessSaving}
              isSaveDisabled={!formState.isDirty && !isAccessDirty}
              isMobile={isMobile}
            />
            <div className={`entity-page-header__tabs flex flex-wrap items-center justify-between gap-4 mt-4 ${isMobile && !headerExpanded ? 'entity-page-header__tabs--collapsed' : ''}`}>
              <TabNav
                tabs={tabItems}
                activeTab={activeTab}
                onChange={handleTabChange}
              />
            </div>
          </div>
        </header>

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
                  <Link to={`/locations/${item.id}`} className="btn btn-sm btn-link">
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* --- MAIN SHELL --- */}
        <div className="entity-detail-shell">
          <div className="entity-detail-body">
            {/* DOSSIER TAB */}
            <div
              className="entity-tab-panel"
              role="tabpanel"
              hidden={activeTab !== 'dossier'}
            >
              <div className="entity-tab-content">
                {formError && (
                  <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
                    <div className="alert error" role="alert">
                      {formError}
                    </div>
                  </section>
                )}

                {isEditing && canEdit ? (
                  <section className="entity-card entity-card--form entity-edit-form-wrapper bg-white rounded-lg border p-4 sm:p-6 w-full">
                    <div className="entity-edit-form-container">
                      <div className="entity-edit-form-content">
                        <FormRenderer
                          ref={formRef}
                          schema={editSchema}
                          initialData={editInitialData || {}}
                          onSubmit={handleUpdate}
                          onStateChange={handleFormStateChange}
                          hideActions
                          enableUnsavedPrompt={false}
                        />
                      </div>
                    </div>
                  </section>
                ) : (
                  renderSchemaSections(dossierSchema, viewData, 'dossier')
                )}

                {/* Additional location info */}
                <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
                  <h2 className="entity-card-title">Related Information</h2>
                  
                  {location.parent && (
                    <div className="form-group">
                      <label>Parent Location</label>
                      <div>
                        <Link to={`/locations/${location.parent.id}`}>
                          <MapPin size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                          {location.parent.name}
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Child Locations</label>
                    <div>{location.childCount || 0}</div>
                  </div>

                  {entities.length > 0 && (
                    <div className="form-group">
                      <label>Entities in this Location ({entities.length})</label>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {entities.map((entity) => (
                          <li key={entity.id} style={{ marginBottom: '0.5rem' }}>
                            <Link to={`/entities/${entity.id}`}>
                              {entity.name} ({entity.entityType?.name || 'Unknown Type'})
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* ACCESS TAB */}
            {activeTab === 'access' && isEditing && canEdit && (
              <AccessTab
                canEdit={canEdit}
                worldId={worldId}
                accessSettings={accessSettings}
                accessOptions={accessOptions}
                accessOptionsError={accessOptionsError}
                accessOptionsLoading={accessOptionsLoading}
                accessSaving={accessSaving}
                accessSaveError={accessSaveError}
                accessSaveSuccess={accessSaveSuccess}
                handleAccessSettingChange={handleAccessSettingChange}
              />
            )}

            {/* SYSTEM TAB */}
            {activeTab === 'system' && (
              <SystemTab
                renderSchemaSections={renderSchemaSections}
                systemSchema={systemSchema}
                viewData={viewData}
              />
            )}
          </div>
        </div>
      </div>
    </EntityPageLayout>
  )
}
