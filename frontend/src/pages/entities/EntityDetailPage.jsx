import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../components/RecordForm/FieldRenderer.jsx'
import ListCollector from '../../components/ListCollector.jsx'
import TabNav from '../../components/TabNav.jsx'
import DrawerPanel from '../../components/DrawerPanel.jsx'
import EntityHeader from '../../components/entities/EntityHeader.jsx'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
// NOTE: relationship filters now handled in hook, but keeping import if you still use it elsewhere
// import EntityRelationshipFilters, {
//   createDefaultRelationshipFilters,
// } from '../../components/entities/EntityRelationshipFilters.jsx'
import { getEntity, updateEntity } from '../../api/entities.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFeatureFlag } from '../../context/FeatureFlagContext.jsx'
import RelationshipBuilder from '../../modules/relationships3/RelationshipBuilder.jsx'
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt.js'

// hooks
import useEntityAccess from '../../hooks/useEntityAccess.js'
import useEntityRelationships from '../../hooks/useEntityRelationships.js'

// tabs
import DossierTab from './tabs/DossierTab.jsx'
import RelationshipsTab from './tabs/RelationshipsTab.jsx'
import AccessTab from './tabs/AccessTab.jsx'
import SystemTab from './tabs/SystemTab.jsx'

const VISIBILITY_LABELS = {
  hidden: 'Hidden',
  partial: 'Partial',
  visible: 'Visible',
}

const VISIBILITY_OPTIONS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'partial', label: 'Partial' },
  { value: 'visible', label: 'Visible' },
]

const EDIT_MODE_PROMPT_MESSAGE =
  'You have unsaved changes. Do you want to save them before leaving this page?'

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : String(value)
  }
  return date.toLocaleString()
}

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
  const base = {
    key,
    name: key,
    label: field.label || field.name,
    metadataField: field.name,
    dataType: field.dataType,
  }

  switch (field.dataType) {
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
    default:
      return { ...base, type: 'text' }
  }
}

const normaliseMetadataValue = (field) => {
  const value = field?.value
  if (value === null || value === undefined) return ''

  switch (field?.dataType) {
    case 'boolean':
      return Boolean(value)
    case 'number': {
      const num = Number(value)
      return Number.isNaN(num) ? value : num
    }
    case 'enum':
      if (typeof value === 'object' && value !== null) {
        return (
          value.value ??
          value.id ??
          value.key ??
          value.slug ??
          value.name ??
          ''
        )
      }
      return value
    case 'date':
      return formatDateTime(value)
    case 'text':
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value, null, 2)
        } catch (err) {
          console.warn('⚠️ Failed to serialise text metadata field', err)
          return String(value)
        }
      }
      return value
    default:
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value, null, 2)
        } catch (err) {
          console.warn('⚠️ Failed to serialise metadata field', err)
          return String(value)
        }
      }
      return value
  }
}

const initialMetadataValue = (field) => {
  const value = field?.value
  if (value === null || value === undefined) {
    if (field?.dataType === 'boolean') return false
    return ''
  }

  if (field?.dataType === 'boolean') {
    return Boolean(value)
  }

  return value
}

// Helper to choose the correct directional label based on perspective
const getRelationshipLabel = (rel) =>
  rel.effectiveFromLabel || rel.typeFromName || rel.typeName

export default function EntityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token, sessionReady } = useAuth()

  const [entity, setEntity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [activeTab, setActiveTab] = useState('dossier')
  const [isEditing, setIsEditing] = useState(false)

  const [showRelationshipForm, setShowRelationshipForm] = useState(false)
  const [toast, setToast] = useState(null)

  const formRef = useRef(null)
  const [formState, setFormState] = useState({
    isDirty: false,
    isSubmitting: false,
  })

  const relBuilderV2Enabled = useFeatureFlag('rel_builder_v2')
  const fromEntitiesSearch = location.state?.fromEntities?.search || ''

  const backUrl = useMemo(() => {
    if (!fromEntitiesSearch) return '/entities'
    return fromEntitiesSearch.startsWith('?')
      ? `/entities${fromEntitiesSearch}`
      : `/entities?${fromEntitiesSearch}`
  }, [fromEntitiesSearch])

  const handleBack = useCallback(() => {
    navigate(backUrl)
  }, [navigate, backUrl])

  const handleExplore = useCallback(() => {
    navigate(`/entities/${id}/relationship-viewer`)
  }, [navigate, id])

  const canEdit = useMemo(() => {
    if (entity?.permissions && typeof entity.permissions.canEdit === 'boolean') {
      return entity.permissions.canEdit
    }
    if (!entity || !user) return false
    if (user.role === 'system_admin') return true
    if (entity.world?.created_by && entity.world.created_by === user.id) return true
    if (entity.created_by && entity.created_by === user.id) return true
    return false
  }, [entity, user])

  const tabItems = useMemo(() => {
    const items = [
      { id: 'dossier', label: 'Dossier' },
      { id: 'relationships', label: 'Relationships' },
      { id: 'system', label: 'System' },
    ]

    if (canEdit && isEditing) {
      items.splice(2, 0, { id: 'access', label: 'Access' })
    }

    return items
  }, [canEdit, isEditing])

  useEffect(() => {
    const availableTabs = new Set(tabItems.map((tab) => tab.id))
    if (!availableTabs.has(activeTab)) {
      setActiveTab('dossier')
    }
  }, [tabItems, activeTab])

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
        <section key={sectionKey} className="entity-card">
          {section.title ? (
            <h2 className="entity-card-title">{section.title}</h2>
          ) : null}
          <div
            className="entity-field-grid"
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
                    mode="view"
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
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const loadEntity = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    setFormError('')
    try {
      const response = await getEntity(id)
      const data = response?.data || response
      if (!data) {
        setEntity(null)
        setError('Entity not found')
        return
      }
      setEntity(data)
    } catch (err) {
      console.error('❌ Failed to load entity', err)
      setError(err.message || 'Failed to load entity')
      setEntity(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (sessionReady && token) {
      loadEntity()
    }
  }, [sessionReady, token, loadEntity])

  const metadataFields = useMemo(() => {
    if (!entity?.fields) return []
    return entity.fields.map((field) => mapFieldToSchemaField(field)).filter(Boolean)
  }, [entity])

  const metadataViewValues = useMemo(() => {
    if (!entity?.fields || entity.fields.length === 0) {
      return { __placeholder: 'No metadata defined for this entity type.' }
    }

    return entity.fields.reduce((acc, field) => {
      if (!field?.name) return acc
      acc[field.name] = normaliseMetadataValue(field)
      return acc
    }, {})
  }, [entity])

  const metadataInitialValues = useMemo(() => {
    if (!entity?.fields || entity.fields.length === 0) {
      return {}
    }

    return entity.fields.reduce((acc, field) => {
      if (!field?.name) return acc
      acc[field.name] = initialMetadataValue(field)
      return acc
    }, {})
  }, [entity])

  useEffect(() => {
    setIsEditing(false)
  }, [entity?.id])

  const visibilityLabel = useMemo(() => {
    const key = (entity?.visibility || '').toLowerCase()
    return VISIBILITY_LABELS[key] || 'Hidden'
  }, [entity])

  const createdAtValue = entity?.createdAt || entity?.created_at
  const updatedAtValue = entity?.updatedAt || entity?.updated_at

  const viewData = useMemo(() => {
    if (!entity) return null

    return {
      name: entity.name || '—',
      description: entity.description || '',
      typeName: entity.entityType?.name || entity.entity_type?.name || '—',
      visibilityLabel,
      worldName: entity.world?.name || entity.world_name || '—',
      createdAt: formatDateTime(createdAtValue),
      updatedAt: formatDateTime(updatedAtValue),
      metadata: metadataViewValues,
      createdBy:
        entity.creator?.username ||
        entity.creator?.email ||
        entity.created_by ||
        '—',
      updatedBy: entity.updated_by || '—',
    }
  }, [entity, visibilityLabel, metadataViewValues, createdAtValue, updatedAtValue])

  const editInitialData = useMemo(() => {
    if (!entity) return null

    return {
      name: entity.name || '',
      description: entity.description || '',
      visibility: entity.visibility || 'hidden',
      entityTypeName: entity.entityType?.name || entity.entity_type?.name || '—',
      worldName: entity.world?.name || entity.world_name || '—',
      createdAt: formatDateTime(createdAtValue),
      updatedAt: formatDateTime(updatedAtValue),
      metadata: metadataInitialValues,
    }
  }, [entity, createdAtValue, updatedAtValue, metadataInitialValues])

  const metadataSectionTitle = 'Information'

  const editSchema = useMemo(() => {
    const hasMetadataFields = metadataFields.length > 0

    const sections = [
      {
        title: 'Details',
        columns: 2,
        fields: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'entityTypeName', label: 'Type', type: 'readonly' },
          {
            key: 'visibility',
            label: 'Visibility',
            type: 'select',
            options: VISIBILITY_OPTIONS,
          },
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
        columns: hasMetadataFields ? 2 : 1,
        fields: hasMetadataFields
          ? metadataFields
          : [
              {
                key: 'metadata.__placeholder',
                name: 'metadata.__placeholder',
                label: 'Information',
                type: 'readonly',
              },
            ],
      },
    ]

    return {
      title: 'Edit Entity',
      sections,
    }
  }, [metadataFields, metadataSectionTitle])

  const dossierSchema = useMemo(() => {
    const metadataSectionFields =
      metadataFields.length > 0
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
      title: 'Entity Overview',
      sections: [
        {
          title: 'Summary',
          columns: 2,
          fields: [
            { key: 'name', label: 'Name', type: 'readonly' },
            { key: 'typeName', label: 'Type', type: 'readonly' },
            { key: 'visibilityLabel', label: 'Visibility', type: 'readonly' },
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

  const systemSchema = useMemo(
    () => ({
      sections: [
        {
          title: 'System',
          columns: 2,
          fields: [
            { key: 'worldName', label: 'World', type: 'readonly' },
            { key: 'createdAt', label: 'Created', type: 'readonly' },
            { key: 'createdBy', label: 'Created by', type: 'readonly' },
            { key: 'updatedAt', label: 'Updated', type: 'readonly' },
            { key: 'updatedBy', label: 'Updated by', type: 'readonly' },
          ],
        },
      ],
    }),
    [],
  )

  // --- access hook ---
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
    handleAccessSave,
  } = useEntityAccess(entity, token, canEdit)

  const worldId = useMemo(
    () => entity?.world?.id || entity?.world_id || '',
    [entity],
  )

  // --- relationships hook ---
  const {
    relationships,
    relationshipsLoading,
    relationshipsError,
    filteredRelationships,
    relationshipFilterOptions,
    filters: relationshipFilters,
    handleFiltersChange: handleRelationshipFiltersChange,
    handleFiltersReset: handleRelationshipFiltersReset,
    reloadRelationships,
  } = useEntityRelationships(entity, token)

  const filterButtonDisabled = relationshipsLoading

  const relationshipsEmptyMessage = useMemo(() => {
    const name = entity?.name || 'this entity'
    return `No relationships found for ${name}.`
  }, [entity?.name])

  const handleSaveAll = useCallback(async () => {
    if (!canEdit) return false

    let success = true

    if (formState.isDirty && formRef.current?.submit) {
      const result = await formRef.current.submit()
      if (result === false) {
        success = false
      }
    }

    if (success && isAccessDirty) {
      const accessResult = await handleAccessSave()
      if (!accessResult) {
        success = false
      }
    }

    return success
  }, [canEdit, formState.isDirty, isAccessDirty, handleAccessSave])

  const handleEditToggle = useCallback(async () => {
    if (!canEdit) return
    setFormError('')

    // entering edit mode
    if (!isEditing) {
      setIsEditing(true)
      return
    }

    const hasFormChanges = formState.isDirty
    const hasAccessChanges = isAccessDirty

    if (hasFormChanges || hasAccessChanges) {
      const shouldSave = window.confirm(
        'You have unsaved changes. Would you like to save them before leaving edit mode?',
      )

      if (shouldSave) {
        const saved = await handleSaveAll()
        if (!saved) {
          return
        }
      } else {
        formRef.current?.reset?.(editInitialData || {})
        // access hook keeps its own internal default handling
      }
    }

    setIsEditing(false)
    setActiveTab('dossier')
  }, [
    canEdit,
    isEditing,
    formState.isDirty,
    isAccessDirty,
    handleSaveAll,
    editInitialData,
  ])

  const handleUpdate = useCallback(
    async (values) => {
      if (!entity?.id) return false

      setFormError('')

      try {
        const payload = {
          name: values?.name,
          description: values?.description,
          visibility: values?.visibility,
          metadata: values?.metadata || {},
        }

        const response = await updateEntity(entity.id, payload)
        const updated = response?.data || response
        if (!updated) {
          throw new Error('Failed to update entity')
        }

        setEntity(updated)
        return { message: 'Entity updated successfully.' }
      } catch (err) {
        console.error('❌ Failed to update entity', err)
        setFormError(err.message || 'Failed to update entity')
        return false
      }
    },
    [entity?.id],
  )

  const handleFormStateChange = useCallback((nextState) => {
    setFormState((prev) => {
      const next = {
        isDirty: Boolean(nextState?.isDirty),
        isSubmitting: Boolean(nextState?.isSubmitting),
      }

      if (
        prev.isDirty === next.isDirty &&
        prev.isSubmitting === next.isSubmitting
      ) {
        return prev
      }

      return next
    })
  }, [])

  const hasUnsavedChanges = isEditing && (formState.isDirty || isAccessDirty)

  useUnsavedChangesPrompt(hasUnsavedChanges, EDIT_MODE_PROMPT_MESSAGE)

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  if (loading) return <p>Loading entity...</p>
  if (error) return <div className="alert error">{error}</div>
  if (!entity || !viewData) return <p>Entity not found</p>

  return (
    <div className="entity-detail-page">
      <DrawerPanel
        isOpen={showRelationshipForm}
        onClose={() => setShowRelationshipForm(false)}
        title="Add relationship"
        description="Link this entity to others without leaving the page."
        size="lg"
      >
        <RelationshipBuilder
          worldId={worldId}
          fromEntity={entity}
          onCreated={() => {
            setShowRelationshipForm(false)
            reloadRelationships()
          }}
          onCancel={() => setShowRelationshipForm(false)}
        />
      </DrawerPanel>

      {/* --- ENTITY DETAIL TOP BAR --- */}
      <div className="entity-detail-topbar">
        <div className="entity-detail-topbar-inner">
          <EntityHeader
            name={entity.name}
            onBack={handleBack}
            onExplore={handleExplore}
            canEdit={canEdit}
            isEditing={isEditing}
            onToggleEdit={handleEditToggle}
            onSave={handleSaveAll}
            isSaving={formState.isSubmitting || accessSaving}
            isSaveDisabled={!formState.isDirty && !isAccessDirty}
          />
          <TabNav
            tabs={tabItems}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      {/* --- MAIN SHELL --- */}
      <div className="entity-detail-shell">
        <div className="entity-detail-body" role="tabpanel">
          {/* DOSSIER TAB */}
          {activeTab === 'dossier' && (
            <DossierTab
              isEditing={isEditing}
              canEdit={canEdit}
              formError={formError}
              formRef={formRef}
              editSchema={editSchema}
              editInitialData={editInitialData}
              handleUpdate={handleUpdate}
              handleFormStateChange={handleFormStateChange}
              dossierSchema={dossierSchema}
              viewData={viewData}
              renderSchemaSections={renderSchemaSections}
            />
          )}

          {/* RELATIONSHIPS TAB */}
          {activeTab === 'relationships' && (
            <RelationshipsTab
              entity={entity}
              toast={toast}
              canEdit={canEdit}
              relationshipsLoading={relationshipsLoading}
              relationshipsError={relationshipsError}
              // in the hook we already sort & filter → just pass filtered + raw
              sortedRelationships={relationships}
              filteredRelationships={filteredRelationships}
              relationshipsEmptyMessage={relationshipsEmptyMessage}
              relationshipFilters={relationshipFilters}
              relationshipFilterOptions={relationshipFilterOptions}
              filterButtonDisabled={filterButtonDisabled}
              handleRelationshipFiltersChange={handleRelationshipFiltersChange}
              handleRelationshipFiltersReset={handleRelationshipFiltersReset}
              setShowRelationshipForm={setShowRelationshipForm}
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
              isAccessDirty={isAccessDirty}
              handleAccessSettingChange={handleAccessSettingChange}
              handleAccessSave={handleAccessSave}
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
  )
}
