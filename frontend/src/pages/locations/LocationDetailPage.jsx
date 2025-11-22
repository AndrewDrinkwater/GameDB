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
import { getLocationTypeFields } from '../../api/locationTypeFields.js'
import AccessTab from './tabs/AccessTab.jsx'
import SystemTab from './tabs/SystemTab.jsx'
import EntitiesTab from './tabs/EntitiesTab.jsx'
import LocationsTab from './tabs/LocationsTab.jsx'
import {
  buildMetadataDisplayMap,
  buildMetadataInitialMap,
  buildMetadataViewMap,
} from '../../utils/metadataFieldUtils.js'
import { getEntity } from '../../api/entities.js'

const buildEnumOptions = (field) => {
  const choices = field?.options?.choices
  if (!Array.isArray(choices) || choices.length === 0) return []

  return choices
    .map((choice, index) => {
      if (choice === null || choice === undefined) return null
      if (typeof choice === 'object') {
        const value =
          choice.value ??
          choice.id ??
          choice.key ??
          choice.slug ??
          `choice-${index}`
        const label =
          choice.label ??
          choice.name ??
          choice.title ??
          choice.display ??
          value
        if (value === null || value === undefined) return null
        return { value, label: String(label ?? value) }
      }
      const text = String(choice)
      return { value: text, label: text }
    })
    .filter(Boolean)
}

const mapFieldToSchemaField = (field) => {
  if (!field?.name) return null
  const key = `metadata.${field.name}`
  const visibleByDefault =
    field.visibleByDefault !== undefined
      ? Boolean(field.visibleByDefault)
      : field.visible_by_default !== undefined
        ? Boolean(field.visible_by_default)
        : true
  const base = {
    key,
    name: key,
    label: field.label || field.name,
    metadataField: field.name,
    dataType: field.dataType || field.data_type,
    visibleByDefault,
  }

  switch (field.dataType || field.data_type) {
    case 'text':
      return { ...base, type: 'textarea', rows: 3 }
    case 'boolean':
      return { ...base, type: 'boolean' }
    case 'enum':
      return { ...base, type: 'select', options: buildEnumOptions(field) }
    case 'number':
      return { ...base, type: 'text', inputType: 'number' }
    case 'date':
      return { ...base, type: 'text' }
    case 'entity_reference':
    case 'location_reference':
    case 'reference': {
      const referenceTypeId =
        field.referenceTypeId ??
        field.reference_type_id ??
        field.referenceType?.id ??
        null
      const referenceTypeName =
        field.referenceTypeName ??
        field.reference_type_name ??
        field.referenceType?.name ??
        ''
      const referenceFilter =
        field.referenceFilter ??
        field.reference_filter ??
        field.referenceFilterJson ??
        {}
      const selectedLabel = (() => {
        if (field.displayValue) return String(field.displayValue)
        if (field.display) return String(field.display)
        if (field.selectedLabel) return String(field.selectedLabel)

        const value = field.value
        if (!value || typeof value !== 'object') return ''

        const label =
          value.label ??
          value.name ??
          value.title ??
          value.display ??
          value.displayName ??
          value.text ??
          value.value
        return label !== undefined && label !== null ? String(label) : ''
      })()

      return {
        ...base,
        type: 'reference',
        referenceTypeId,
        referenceTypeName,
        referenceFilter,
        displayKey: `metadataDisplay.${field.name}`,
        selectedLabel,
      }
    }
    default:
      return { ...base, type: 'text' }
  }
}

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
  const [locationFields, setLocationFields] = useState([])
  const [resolvedReferences, setResolvedReferences] = useState({})
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

  const loadLocationFields = useCallback(async () => {
    if (!location?.location_type_id) {
      setLocationFields([])
      return
    }

    try {
      const res = await getLocationTypeFields(location.location_type_id)
      const fields = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setLocationFields(fields)
    } catch (err) {
      console.error('❌ Failed to load location type fields:', err)
      setLocationFields([])
    }
  }, [location?.location_type_id])

  useEffect(() => {
    if (sessionReady && token) {
      loadLocation()
      loadEntities()
      loadPath()
      loadLocationTypes()
    }
  }, [sessionReady, token, loadLocation, loadEntities, loadPath, loadLocationTypes])

  useEffect(() => {
    if (location?.location_type_id) {
      loadLocationFields()
    }
  }, [location?.location_type_id, loadLocationFields])

  // Resolve entity and location reference IDs to names
  useEffect(() => {
    if (!location?.metadata || !locationFields || locationFields.length === 0) {
      setResolvedReferences({})
      return
    }

    let cancelled = false
    const referenceFields = locationFields.filter(
      (field) =>
        (field.data_type === 'entity_reference' || field.data_type === 'location_reference') &&
        location.metadata?.[field.name]
    )

    if (referenceFields.length === 0) {
      setResolvedReferences({})
      return
    }

    const resolveReferences = async () => {
      const resolved = { ...resolvedReferences }

      for (const field of referenceFields) {
        const fieldName = field.name
        const metadataValue = location.metadata[fieldName]

        // Extract ID from metadata value (could be UUID string or object with id)
        let referenceId = null
        if (typeof metadataValue === 'string' && metadataValue.trim()) {
          referenceId = metadataValue.trim()
        } else if (typeof metadataValue === 'object' && metadataValue !== null) {
          referenceId = metadataValue.id || metadataValue.value || metadataValue.entity_id || null
          // If object already has displayValue/name, use it
          if (metadataValue.displayValue || metadataValue.name || metadataValue.label) {
            resolved[fieldName] =
              metadataValue.displayValue || metadataValue.name || metadataValue.label
            continue
          }
        }

        if (!referenceId || resolved[fieldName]) continue

        try {
          if (field.data_type === 'entity_reference') {
            const entityRes = await getEntity(referenceId)
            const entity = entityRes?.data || entityRes
            if (entity?.name) {
              resolved[fieldName] = entity.name
            }
          } else if (field.data_type === 'location_reference') {
            const locationRes = await fetchLocationById(referenceId)
            const loc = locationRes?.data || locationRes
            if (loc?.name) {
              resolved[fieldName] = loc.name
            }
          }
        } catch (err) {
          console.warn(`Failed to resolve reference for field ${fieldName}:`, err)
        }
      }

      if (!cancelled) {
        setResolvedReferences(resolved)
      }
    }

    resolveReferences()

    return () => {
      cancelled = true
    }
  }, [location?.metadata, locationFields])

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
        metadata: data.metadata || location.metadata || {},
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
    
    items.push({ id: 'entities', label: 'Entities' })
    items.push({ id: 'locations', label: 'Locations' })

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

  // Build metadata fields from location type fields
  const metadataFields = useMemo(() => {
    if (!Array.isArray(locationFields) || locationFields.length === 0) return []
    
    // Map location fields with metadata values
    const fieldsWithMetadata = locationFields.map((field) => {
      const metadataValue = location?.metadata?.[field.name]
      const resolvedName = resolvedReferences[field.name]
      
      // For reference fields, include resolved display name
      let value = metadataValue
      let displayValue = resolvedName
      let selectedLabel = resolvedName
      
      if (
        (field.data_type === 'entity_reference' || field.data_type === 'location_reference') &&
        metadataValue
      ) {
        if (typeof metadataValue === 'object' && metadataValue !== null) {
          // Value is already an object, use it but override displayValue if we have a resolved name
          value = resolvedName
            ? { ...metadataValue, displayValue: resolvedName }
            : metadataValue
          displayValue = metadataValue.displayValue || metadataValue.name || metadataValue.label || resolvedName || null
          selectedLabel = displayValue || resolvedName
        } else if (typeof metadataValue === 'string' && resolvedName) {
          // Value is just an ID string, create an object with displayValue
          value = { id: metadataValue, displayValue: resolvedName }
          displayValue = resolvedName
          selectedLabel = resolvedName
        }
      }
      
      return {
        ...field,
        value,
        displayValue,
        selectedLabel,
        dataType: field.data_type || field.dataType,
        visibleByDefault: field.visible_by_default !== undefined ? field.visible_by_default : field.visibleByDefault !== undefined ? field.visibleByDefault : true,
      }
    })
    
    return fieldsWithMetadata.map((field) => mapFieldToSchemaField(field)).filter(Boolean)
  }, [locationFields, location?.metadata, resolvedReferences])

  const metadataViewValues = useMemo(() => {
    if (!locationFields || locationFields.length === 0) {
      return { __placeholder: 'No custom fields defined for this location type.' }
    }

    const fieldsWithMetadata = locationFields.map((field) => ({
      ...field,
      value: location?.metadata?.[field.name],
    }))
    
    return buildMetadataViewMap(fieldsWithMetadata)
  }, [locationFields, location?.metadata])

  const metadataDisplayValues = useMemo(() => {
    if (!locationFields || locationFields.length === 0) {
      return {}
    }

    const fieldsWithMetadata = locationFields.map((field) => {
      const metadataValue = location?.metadata?.[field.name]
      const resolvedName = resolvedReferences[field.name]
      
      // For reference fields, use resolved name if available, otherwise try to extract from value
      if (
        (field.data_type === 'entity_reference' || field.data_type === 'location_reference') &&
        metadataValue
      ) {
        // If we have a resolved name, use it
        if (resolvedName) {
          return {
            ...field,
            value: typeof metadataValue === 'object' && metadataValue !== null
              ? { ...metadataValue, displayValue: resolvedName }
              : { id: metadataValue, displayValue: resolvedName },
          }
        }
        
        // If value is already an object with display properties, use as-is
        if (typeof metadataValue === 'object' && metadataValue !== null) {
          return { ...field, value: metadataValue }
        }
        
        // If value is just an ID string, wrap it in an object (buildMetadataDisplayMap will handle it)
        return { ...field, value: { id: metadataValue } }
      }
      
      return { ...field, value: metadataValue }
    })
    
    const displayMap = buildMetadataDisplayMap(fieldsWithMetadata)
    
    // Override with resolved names where available
    Object.keys(resolvedReferences).forEach((fieldName) => {
      if (resolvedReferences[fieldName]) {
        displayMap[fieldName] = resolvedReferences[fieldName]
      }
    })
    
    return displayMap
  }, [locationFields, location?.metadata, resolvedReferences])

  const metadataInitialValues = useMemo(() => {
    if (!locationFields || locationFields.length === 0) {
      return {}
    }

    const fieldsWithMetadata = locationFields.map((field) => ({
      ...field,
      value: location?.metadata?.[field.name],
    }))
    
    return buildMetadataInitialMap(fieldsWithMetadata)
  }, [locationFields, location?.metadata])

  const metadataSectionTitle = 'Information'

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
      metadata: metadataViewValues,
      metadataDisplay: metadataDisplayValues,
      createdBy:
        location.creator?.username ||
        location.creator?.email ||
        location.created_by ||
        '—',
      updatedBy: location.updated_by || '—',
    }
  }, [location, worldId, createdAtValue, updatedAtValue, metadataViewValues, metadataDisplayValues])

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
      metadata: metadataInitialValues,
    }
  }, [location, worldId, createdAtValue, updatedAtValue, metadataInitialValues])

  const editSchema = useMemo(() => {
    const metadataSectionFields = metadataFields.length > 0
      ? metadataFields
      : [
          {
            key: 'metadata.__placeholder',
            name: 'metadata.__placeholder',
            label: 'Information',
            type: 'readonly',
          },
        ]

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
        {
          title: metadataSectionTitle,
          columns: metadataFields.length > 0 ? 2 : 1,
          fields: metadataSectionFields,
        },
      ],
    }
  }, [metadataFields, metadataSectionTitle])

  const dossierSchema = useMemo(() => {
    const metadataSectionFields = metadataFields.length > 0
      ? metadataFields
      : [
          {
            key: 'metadata.__placeholder',
            name: 'metadata.__placeholder',
            label: 'Information',
            type: 'readonly',
          },
        ]

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
        {
          title: metadataSectionTitle,
          columns: metadataFields.length > 0 ? 2 : 1,
          fields: metadataSectionFields,
        },
      ],
    }
  }, [metadataFields, metadataSectionTitle])

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
              </div>
            </div>

            {/* ENTITIES TAB */}
            {activeTab === 'entities' && (
              <EntitiesTab
                entities={entities}
                loading={loading}
                error={error}
              />
            )}

            {/* LOCATIONS TAB */}
            {activeTab === 'locations' && (
              <LocationsTab
                location={location}
                worldId={worldId}
                path={path}
              />
            )}

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
