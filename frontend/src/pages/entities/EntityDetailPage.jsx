import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import { getEntity, updateEntity } from '../../api/entities.js'
import { getEntityRelationships } from '../../api/entityRelationships.js'
import { useAuth } from '../../context/AuthContext.jsx'
import EntityRelationshipForm from '../relationships/EntityRelationshipForm.jsx'

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

  const editSchema = useMemo(() => {
    const metadataSectionTitle = entity?.entityType?.name
      ? `${entity.entityType.name} Metadata`
      : 'Metadata'
    const hasMetadataFields = metadataFields.length > 0

    const sections = [
      {
        title: 'Core Details',
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
          { key: 'worldName', label: 'World', type: 'readonly' },
          { key: 'createdAt', label: 'Created', type: 'readonly' },
          { key: 'updatedAt', label: 'Updated', type: 'readonly' },
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
                label: 'Metadata',
                type: 'readonly',
              },
            ],
      },
    ]

    return {
      title: 'Edit Entity',
      sections,
    }
  }, [entity, metadataFields])

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
    return relationships.map((relationship) => {
      const type =
        relationship.relationshipType ||
        relationship.relationship_type ||
        relationship.type ||
        {}
      const fromEntity =
        relationship.from_entity || relationship.fromEntity || relationship.from || {}
      const toEntity =
        relationship.to_entity || relationship.toEntity || relationship.to || {}
      const context =
        (relationship.context && typeof relationship.context === 'object'
          ? relationship.context
          : {}) || {}

      return {
        id: relationship.id,
        typeName: type?.name || '—',
        fromName: fromEntity?.name || '—',
        toName: toEntity?.name || '—',
        direction: context.__direction === 'reverse' ? 'reverse' : 'forward',
        bidirectional: Boolean(relationship.bidirectional),
      }
    })
  }, [relationships])

  const handleRelationshipCreated = useCallback(() => {
    setShowRelationshipForm(false)
    loadRelationships()
  }, [loadRelationships])

  const formatMetadataValue = useCallback((field, value) => {
    if (value === null || value === undefined || value === '') return '—'
    if (field?.type === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }, [])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  if (loading) return <p>Loading entity...</p>
  if (error) return <div className="alert error">{error}</div>
  if (!entity || !viewData) return <p>Entity not found</p>

  return (
    <div className="entity-detail-page">
      <div className="entity-detail-header">
        <button className="btn secondary" type="button" onClick={() => navigate('/entities')}>
          Back to entities
        </button>
        <div className="entity-detail-title">
          <h1>{entity.name}</h1>
          {canEdit && !isEditing && (
            <button className="btn" type="button" onClick={() => setIsEditing(true)}>
              Edit entity
            </button>
          )}
        </div>
      </div>

      <div className="entity-tabs">
        <div className="entity-tab-list" role="tablist">
          <button
            type="button"
            className={`entity-tab ${activeTab === 'dossier' ? 'active' : ''}`}
            onClick={() => setActiveTab('dossier')}
            role="tab"
            aria-selected={activeTab === 'dossier'}
          >
            Dossier
          </button>
          <button
            type="button"
            className={`entity-tab ${activeTab === 'relationships' ? 'active' : ''}`}
            onClick={() => setActiveTab('relationships')}
            role="tab"
            aria-selected={activeTab === 'relationships'}
          >
            Relationships
          </button>
          <button
            type="button"
            className={`entity-tab ${activeTab === 'access' ? 'active' : ''}`}
            onClick={() => setActiveTab('access')}
            role="tab"
            aria-selected={activeTab === 'access'}
          >
            Access
          </button>
          <button
            type="button"
            className={`entity-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
            role="tab"
            aria-selected={activeTab === 'system'}
          >
            System
          </button>
        </div>

        <div className="entity-tab-panel" role="tabpanel">
          {activeTab === 'dossier' && (
            <div className="entity-tab-content">
              {formError ? (
                <div className="alert error" role="alert">
                  {formError}
                </div>
              ) : null}

              {isEditing && canEdit ? (
                <FormRenderer
                  schema={editSchema}
                  initialData={editInitialData || {}}
                  onSubmit={handleUpdate}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  <section className="entity-section">
                    <div className="entity-section-header">
                      <h2>Summary</h2>
                      {canEdit && !isEditing && (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setIsEditing(true)}
                        >
                          Edit entity
                        </button>
                      )}
                    </div>
                    <div className="entity-summary-grid">
                      <div className="entity-field">
                        <span className="entity-field-label">Name</span>
                        <span className="entity-field-value">{viewData.name}</span>
                      </div>
                      <div className="entity-field">
                        <span className="entity-field-label">Type</span>
                        <span className="entity-field-value">{viewData.typeName}</span>
                      </div>
                      <div className="entity-field entity-description">
                        <span className="entity-field-label">Description</span>
                        <span className="entity-field-value">
                          {viewData.description ? viewData.description : '—'}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="entity-section">
                    <div className="entity-section-header">
                      <h2>Details</h2>
                    </div>
                    {metadataFields.length === 0 ? (
                      <p className="entity-empty-state">
                        No metadata defined for this entity type.
                      </p>
                    ) : (
                      <div className="entity-metadata-grid">
                        {metadataFields.map((field) => {
                          const key = field.metadataField || field.name
                          const value =
                            key && metadataViewValues
                              ? metadataViewValues[key] ?? metadataViewValues[field.name]
                              : undefined
                          return (
                            <div key={field.key} className="entity-field">
                              <span className="entity-field-label">{field.label}</span>
                              <span className="entity-field-value">
                                {formatMetadataValue(field, value)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="entity-tab-content">
              <div className="entity-section-header">
                <h2>Relationships</h2>
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
              {relationshipsLoading ? (
                <p>Loading relationships...</p>
              ) : relationshipsError ? (
                <div className="alert error" role="alert">
                  {relationshipsError}
                </div>
              ) : normalisedRelationships.length === 0 ? (
                <p className="entity-empty-state">No relationships found for this entity.</p>
              ) : (
                <div className="entity-relationships-table-wrapper">
                  <table className="entity-relationships-table">
                    <thead>
                      <tr>
                        <th>Relationship Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Direction</th>
                        <th>Bidirectional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalisedRelationships.map((relationship) => (
                        <tr key={relationship.id}>
                          <td>{relationship.typeName}</td>
                          <td>{relationship.fromName}</td>
                          <td>{relationship.toName}</td>
                          <td className="entity-relationships-direction">
                            {relationship.direction === 'reverse' ? 'Reverse' : 'Forward'}
                          </td>
                          <td>{relationship.bidirectional ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showRelationshipForm && canEdit && (
                <div className="entity-relationship-form-panel">
                  <EntityRelationshipForm
                    worldId={worldId}
                    onCancel={() => setShowRelationshipForm(false)}
                    onSaved={handleRelationshipCreated}
                    defaultFromEntityId={entity.id}
                    lockFromEntity
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'access' && (
            <div className="entity-tab-content">
              <section className="entity-section">
                <div className="entity-section-header">
                  <h2>Access</h2>
                </div>
                <div className="entity-summary-grid">
                  <div className="entity-field">
                    <span className="entity-field-label">Visibility</span>
                    <span className="entity-field-value">{viewData.visibilityLabel}</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="entity-tab-content">
              <section className="entity-section">
                <div className="entity-section-header">
                  <h2>System</h2>
                </div>
                <div className="entity-summary-grid">
                  <div className="entity-field">
                    <span className="entity-field-label">World</span>
                    <span className="entity-field-value">{viewData.worldName}</span>
                  </div>
                  <div className="entity-field">
                    <span className="entity-field-label">Created</span>
                    <span className="entity-field-value">{viewData.createdAt}</span>
                  </div>
                  <div className="entity-field">
                    <span className="entity-field-label">Created by</span>
                    <span className="entity-field-value">{viewData.createdBy}</span>
                  </div>
                  <div className="entity-field">
                    <span className="entity-field-label">Updated</span>
                    <span className="entity-field-value">{viewData.updatedAt}</span>
                  </div>
                  <div className="entity-field">
                    <span className="entity-field-label">Updated by</span>
                    <span className="entity-field-value">{viewData.updatedBy || '—'}</span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
