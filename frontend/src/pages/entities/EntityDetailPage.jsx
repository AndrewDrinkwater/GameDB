import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RecordView from '../../components/RecordForm/RecordView.jsx'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import { getEntity, updateEntity } from '../../api/entities.js'
import { useAuth } from '../../context/AuthContext.jsx'

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
  const [formMessage, setFormMessage] = useState('')

  const loadEntity = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    setFormError('')
    setFormMessage('')
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

  const viewSchema = useMemo(() => {
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
          { key: 'typeName', label: 'Type', type: 'text' },
          { key: 'visibilityLabel', label: 'Visibility', type: 'text' },
          { key: 'worldName', label: 'World', type: 'text' },
          { key: 'createdAt', label: 'Created', type: 'text' },
          { key: 'updatedAt', label: 'Updated', type: 'text' },
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
      title: 'Entity Details',
      sections,
    }
  }, [entity, metadataFields])

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
      setFormMessage('')

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
        setFormMessage('Entity updated successfully.')
        return true
      } catch (err) {
        console.error('❌ Failed to update entity', err)
        setFormError(err.message || 'Failed to update entity')
        return false
      }
    },
    [entity?.id],
  )

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  if (loading) return <p>Loading entity...</p>
  if (error) return <div className="alert error">{error}</div>
  if (!entity || !viewData) return <p>Entity not found</p>

  if (!canEdit) {
    return (
      <RecordView
        schema={viewSchema}
        data={viewData}
        onClose={() => navigate('/entities')}
        closeLabel="Back to entities"
        infoMessage="Entity details are read-only here. Only the world owner or a system admin can make changes."
      />
    )
  }

  return (
    <div className="entity-detail-edit">
      {formMessage ? (
        <div className="alert info" role="status">
          {formMessage}
        </div>
      ) : null}
      {formError ? (
        <div className="alert error" role="alert">
          {formError}
        </div>
      ) : null}
      <FormRenderer
        schema={editSchema}
        initialData={editInitialData || {}}
        onSubmit={handleUpdate}
        onCancel={() => navigate('/entities')}
      />
    </div>
  )
}
