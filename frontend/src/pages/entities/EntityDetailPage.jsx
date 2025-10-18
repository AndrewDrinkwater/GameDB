import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Network } from 'lucide-react'

import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../components/RecordForm/FieldRenderer.jsx'
import TabNav from '../../components/TabNav.jsx'
import DrawerPanel from '../../components/DrawerPanel.jsx'
import EntityHeader from '../../components/entities/EntityHeader.jsx'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'

import { getEntity, updateEntity } from '../../api/entities.js'
import { getEntityRelationships } from '../../api/entityRelationships.js'

import { useAuth } from '../../context/AuthContext.jsx'
import { useFeatureFlag } from '../../context/FeatureFlagContext.jsx'

import RelationshipBuilder from '../../modules/relationships3/RelationshipBuilder.jsx'


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
  const [relationships, setRelationships] = useState([])
  const [relationshipsError, setRelationshipsError] = useState('')
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [showRelationshipForm, setShowRelationshipForm] = useState(false)
  const [expandedRelationshipGroupId, setExpandedRelationshipGroupId] = useState('')
  const [toast, setToast] = useState(null)
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

  const tabItems = useMemo(
    () => [
      { id: 'dossier', label: 'Dossier' },
      { id: 'relationships', label: 'Relationships' },
      { id: 'access', label: 'Access' },
      { id: 'system', label: 'System' },
    ],
    [],
  )

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
          {section.title ? <h2 className="entity-card-title">{section.title}</h2> : null}
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
    return entity.fields
      .map((field) => mapFieldToSchemaField(field))
      .filter(Boolean)
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

  const loadRelationships = useCallback(async () => {
    if (!entity?.id) return
    setRelationshipsLoading(true)
    setRelationshipsError('')
    try {
      const response = await getEntityRelationships(entity.id)
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : []
      setRelationships(list)
    } catch (err) {
      console.error('❌ Failed to load relationships', err)
      setRelationships([])
      setRelationshipsError(err.message || 'Failed to load relationships')
    } finally {
      setRelationshipsLoading(false)
    }
  }, [entity?.id])

  useEffect(() => {
    if (!entity?.id) return
    loadRelationships()
  }, [entity?.id, loadRelationships])

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
  }, [
    entity,
    visibilityLabel,
    metadataViewValues,
    createdAtValue,
    updatedAtValue,
  ])

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
  }, [
    entity,
    createdAtValue,
    updatedAtValue,
    metadataInitialValues,
  ])

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
          { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
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
            { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
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

  const accessSchema = useMemo(
    () => ({
      sections: [
        {
          title: 'Access',
          columns: 1,
          fields: [{ key: 'visibilityLabel', label: 'Visibility', type: 'readonly' }],
        },
      ],
    }),
    [],
  )

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

  const handleEditToggle = useCallback(() => {
    if (!canEdit) return
    setFormError('')
    setIsEditing((prev) => !prev)
  }, [canEdit])

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
        setIsEditing(false)
        return { message: 'Entity updated successfully.' }
      } catch (err) {
        console.error('❌ Failed to update entity', err)
        setFormError(err.message || 'Failed to update entity')
        return false
      }
    },
    [entity?.id],
  )

  const worldId = useMemo(() => entity?.world?.id || entity?.world_id || '', [entity])

  const normalisedRelationships = useMemo(() => {
    if (!Array.isArray(relationships)) return []
    const normaliseRelationshipEntityId = (value) => {
      if (value === undefined || value === null) return ''
      if (typeof value === 'string' || typeof value === 'number') {
        const trimmed = String(value).trim()
        return trimmed
      }
      if (typeof value === 'object') {
        if (value.id !== undefined && value.id !== null) {
          return String(value.id)
        }
        if (value.entity_id !== undefined && value.entity_id !== null) {
          return String(value.entity_id)
        }
        if (value.entityId !== undefined && value.entityId !== null) {
          return String(value.entityId)
        }
      }
      return ''
    }
    return relationships.map((relationship) => {
      const type =
        relationship.relationshipType ||
        relationship.relationship_type ||
        relationship.type ||
        {}

      const fromEntity =
        relationship.fromEntity ||
        relationship.from ||
        relationship.from_entity ||
        {}

      const toEntity =
        relationship.toEntity ||
        relationship.to ||
        relationship.to_entity ||
        {}

      const context =
        (relationship.context && typeof relationship.context === 'object'
          ? relationship.context
          : {}) || {}

      const direction = context.__direction === 'reverse' ? 'reverse' : 'forward'
      const baseTypeName = type?.name || '—'

      // Directional labels from relationship type
      const typeFromName = type?.from_name || type?.fromName || baseTypeName
      const typeToName = type?.to_name || type?.toName || baseTypeName
      const sourceLabel =
        type?.source_relationship_label ||
        type?.sourceLabel ||
        typeFromName
      const targetLabel =
        type?.target_relationship_label ||
        type?.targetLabel ||
        typeToName

      // Resolve which label applies based on context direction
      const effectiveFromLabel = direction === 'reverse' ? targetLabel : sourceLabel
      const effectiveToLabel = direction === 'reverse' ? sourceLabel : targetLabel

      return {
        id: relationship.id,
        typeName: baseTypeName,
        typeFromName,
        typeToName,
        sourceLabel,
        targetLabel,
        effectiveFromLabel,
        effectiveToLabel,
        fromId:
          normaliseRelationshipEntityId(
            relationship.from_entity_id ??
              relationship.fromEntityId ??
              relationship.from_id ??
              relationship.from_entity ??
              relationship.fromEntity,
          ) ||
          normaliseRelationshipEntityId(fromEntity) ||
          null,
        fromName: fromEntity?.name || '—',
        toId:
          normaliseRelationshipEntityId(
            relationship.to_entity_id ??
              relationship.toEntityId ??
              relationship.to_id ??
              relationship.to_entity ??
              relationship.toEntity,
          ) ||
          normaliseRelationshipEntityId(toEntity) ||
          null,
        toName: toEntity?.name || '—',
        direction,
        bidirectional: Boolean(relationship.bidirectional),
      }
    })
  }, [relationships])

  const groupedRelationships = useMemo(() => {
    if (!entity?.id || !Array.isArray(normalisedRelationships)) {
      return []
    }

    const entityId = entity?.id ? String(entity.id) : ''
    const groups = new Map()

    normalisedRelationships.forEach((relationship) => {
      const fromId = relationship.fromId ? String(relationship.fromId) : ''
      const toId = relationship.toId ? String(relationship.toId) : ''
      const isSource = fromId && entityId && fromId === entityId
      const isTarget = toId && entityId && toId === entityId

      if (!isSource && !isTarget) return

      const roles = []

      if (isSource) {
        roles.push({
          direction: 'Outgoing',
          relatedId: relationship.toId,
          relatedName: relationship.toName,
          label:
            relationship.effectiveFromLabel ||
            relationship.sourceLabel ||
            relationship.typeFromName ||
            relationship.typeName ||
            '—',
        })
      }

      if (isTarget) {
        roles.push({
          direction: 'Incoming',
          relatedId: relationship.fromId,
          relatedName: relationship.fromName,
          label:
            relationship.effectiveToLabel ||
            relationship.targetLabel ||
            relationship.typeToName ||
            relationship.typeName ||
            '—',
        })
      }

      roles.forEach(({ direction, relatedId, relatedName, label }) => {
        const key = `${direction}-${relatedId || relationship.id}`

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            direction,
            relatedId,
            relatedName,
            relationships: [],
          })
        }

        groups.get(key).relationships.push({
          id: relationship.id,
          label: label || '—',
          typeName: relationship.typeName || '—',
        })
      })
    })

    return Array.from(groups.values())
  }, [entity?.id, normalisedRelationships])

  const toggleRelationshipGroup = useCallback((groupId) => {
    setExpandedRelationshipGroupId((current) => (current === groupId ? '' : groupId))
  }, [])

  useEffect(() => {
    setExpandedRelationshipGroupId('')
  }, [entity?.id, groupedRelationships.length])

  const relationshipsEmptyMessage = useMemo(() => {
    const name = entity?.name || 'this entity'
    return `No relationships found for ${name}.`
  }, [entity?.name])

  const handleRelationshipCreated = useCallback(
    (mode, relationship) => {
      setShowRelationshipForm(false)
      loadRelationships()

      if (!mode) return

      if (mode === 'create' && relationship) {
        const fromName =
          relationship?.from_entity?.name ||
          relationship?.from?.name ||
          relationship?.fromName ||
          'Source'
        const toName =
          relationship?.to_entity?.name ||
          relationship?.to?.name ||
          relationship?.toName ||
          'Target'
        const typeName =
          relationship?.relationshipType?.name ||
          relationship?.typeName ||
          'relationship'

        setToast({
          message: `Added ${fromName} → ${toName} (${typeName}).`,
          tone: 'success',
          link: { to: '/entity-relationships', label: 'View relationship' },
        })
      } else if (mode === 'edit') {
        setToast({ message: 'Relationship updated.', tone: 'success' })
      }
    },
    [loadRelationships],
  )

  const handleRelationshipToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

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
  fromEntity={entity} // ← crucial line
  onCreated={() => {
    setShowRelationshipForm(false)
    loadRelationships()
  }}
  onCancel={() => setShowRelationshipForm(false)}
/>

</DrawerPanel>

{/* --- ENTITY DETAIL TOP BAR --- */}
<div className="entity-detail-topbar">
  <div className="entity-detail-topbar-inner flex items-center justify-between">
    <EntityHeader
      name={entity.name}
      onBack={handleBack}
      canEdit={canEdit}
      isEditing={isEditing}
      onToggleEdit={handleEditToggle}
    />

    {/* Explore Button */}
    <Link
      to={`/worlds/${worldId}/entities/${entity.id}/explore`}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
    >
      <Network size={16} /> Explore
    </Link>
  </div>

  <TabNav tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
</div>


{/* --- MAIN SHELL --- */}
<div className="entity-detail-shell">
  <div className="entity-detail-body" role="tabpanel">
    {/* DOSSIER TAB */}
    {activeTab === 'dossier' && (
      <div className="entity-tab-content">
        {formError && (
          <section className="entity-card">
            <div className="alert error" role="alert">
              {formError}
            </div>
          </section>
        )}

        {isEditing && canEdit ? (
          <section className="entity-card entity-card--form">
            <FormRenderer
              schema={editSchema}
              initialData={editInitialData || {}}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
            />
          </section>
        ) : (
          renderSchemaSections(dossierSchema, viewData, 'dossier')
        )}
      </div>
    )}

    {/* RELATIONSHIPS TAB */}
{activeTab === 'relationships' && (
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

      <div className="entity-card-body">
        {relationshipsLoading ? (
          <p>Loading relationships...</p>
        ) : relationshipsError ? (
          <div className="alert error" role="alert">
            {relationshipsError}
          </div>
        ) : groupedRelationships.length === 0 ? (
          <p className="entity-empty-state">
            {relationshipsEmptyMessage}
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
                {groupedRelationships.map((group) => {
                  const { key, direction, relatedId, relatedName, relationships: relationshipList } = group
                  const hasMultiple = relationshipList.length > 1
                  const firstRelationship = relationshipList[0]
                  const uniqueTypeNames = Array.from(
                    new Set(
                      relationshipList
                        .map((item) => item.typeName)
                        .filter((name) => name && name !== '—'),
                    ),
                  )
                  const typeDisplay = hasMultiple
                    ? uniqueTypeNames.length > 0
                      ? uniqueTypeNames.join(', ')
                      : 'Multiple'
                    : firstRelationship?.typeName || '—'

                  const relatedEntityContent = relatedId ? (
                    <Link to={`/entities/${relatedId}`} className="entity-relationship-link">
                      {relatedName || '—'}
                    </Link>
                  ) : (
                    <span>{relatedName || '—'}</span>
                  )

                  return (
                    <Fragment key={key}>
                      <tr>
                        <td>
                          <span className="relationship-phrase">
                            {hasMultiple ? (
                              <>
                                <button
                                  type="button"
                                  className="relationship-count-button"
                                  onClick={() => toggleRelationshipGroup(key)}
                                  aria-expanded={expandedRelationshipGroupId === key}
                                  aria-controls={`${key}-details`}
                                >
                                  {relationshipList.length} Relationships
                                </button>{' '}
                                {relatedEntityContent}
                              </>
                            ) : (
                              <>
                                <strong>{firstRelationship?.label || '—'}</strong>{' '}
                                {relatedEntityContent}
                              </>
                            )}
                          </span>
                        </td>
                        <td>{typeDisplay || '—'}</td>
                        <td>{direction}</td>
                      </tr>
                      {hasMultiple && expandedRelationshipGroupId === key && (
                        <tr className="relationship-group-details">
                          <td colSpan={3}>
                            <ul
                              id={`${key}-details`}
                              className="relationship-details-list"
                            >
                              {relationshipList.map((relationship) => (
                                <li key={relationship.id}>
                                  <span className="relationship-detail-label">
                                    {relationship.label || '—'}
                                  </span>
                                  <span className="relationship-detail-type">
                                    {relationship.typeName || '—'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  </div>
)}

    {/* ACCESS TAB */}
    {activeTab === 'access' && (
      <div className="entity-tab-content">
        {renderSchemaSections(accessSchema, viewData, 'access')}
      </div>
    )}

    {/* SYSTEM TAB */}
    {activeTab === 'system' && (
      <div className="entity-tab-content">
        {renderSchemaSections(systemSchema, viewData, 'system')}
      </div>
    )}
  </div>
</div>
</div>
)
}
