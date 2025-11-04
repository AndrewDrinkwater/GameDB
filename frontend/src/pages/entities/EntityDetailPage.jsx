import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../components/RecordForm/FieldRenderer.jsx'
import ListCollector from '../../components/ListCollector.jsx'
import TabNav from '../../components/TabNav.jsx'
import DrawerPanel from '../../components/DrawerPanel.jsx'
import EntityHeader from '../../components/entities/EntityHeader.jsx'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
import EntityRelationshipFilters, {
  createDefaultRelationshipFilters,
} from '../../components/entities/EntityRelationshipFilters.jsx'
import { getEntity, updateEntity } from '../../api/entities.js'
import { fetchCampaigns } from '../../api/campaigns.js'
import { fetchCharacters } from '../../api/characters.js'
import { getEntityRelationships } from '../../api/entityRelationships.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFeatureFlag } from '../../context/FeatureFlagContext.jsx'
import RelationshipBuilder from '../../modules/relationships3/RelationshipBuilder.jsx'
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt.js'


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

const ACCESS_MODES = ['global', 'selective', 'hidden']

const ACCESS_MODE_LABELS = {
  global: 'Global',
  selective: 'Selective',
  hidden: 'Hidden',
}

const ACCESS_MODE_OPTIONS = ACCESS_MODES.map((value) => ({
  value,
  label: ACCESS_MODE_LABELS[value],
}))

const ACCESS_MODE_SET = new Set(ACCESS_MODES)

const normaliseAccessMode = (value) => {
  if (typeof value !== 'string') return 'global'
  const key = value.toLowerCase()
  return ACCESS_MODE_SET.has(key) ? key : 'global'
}

const EDIT_MODE_PROMPT_MESSAGE =
  'You have unsaved changes. Do you want to save them before leaving this page?'

const normaliseIdArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry === undefined || entry === null) return ''
        return String(entry).trim()
      })
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

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
const getRelationshipLabel = (rel) => (
  rel.effectiveFromLabel || rel.typeFromName || rel.typeName
)


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
  const [relationshipFilters, setRelationshipFilters] = useState(() =>
    createDefaultRelationshipFilters(),
  )
  const [toast, setToast] = useState(null)
  const [accessSettings, setAccessSettings] = useState({
    readMode: 'global',
    readCampaigns: [],
    readUsers: [],
    writeMode: 'global',
    writeCampaigns: [],
    writeUsers: [],
  })
  const [accessOptions, setAccessOptions] = useState({ campaigns: [], users: [] })
  const [accessOptionsLoading, setAccessOptionsLoading] = useState(false)
  const [accessOptionsError, setAccessOptionsError] = useState('')
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessSaveError, setAccessSaveError] = useState('')
  const [accessSaveSuccess, setAccessSaveSuccess] = useState('')
  const formRef = useRef(null)
  const [formState, setFormState] = useState({ isDirty: false, isSubmitting: false })
  const relBuilderV2Enabled = useFeatureFlag('rel_builder_v2')
  const fromEntitiesSearch = location.state?.fromEntities?.search || ''

  const buildFilterKey = useCallback((id, name, fallbackLabel = '') => {
    if (id !== undefined && id !== null) {
      const trimmed = String(id).trim()
      if (trimmed) return trimmed
    }

    if (name !== undefined && name !== null) {
      const trimmed = String(name).trim()
      if (trimmed) {
        return `name:${trimmed.toLowerCase()}`
      }
    }

    if (fallbackLabel) {
      const trimmed = String(fallbackLabel).trim()
      if (trimmed) {
        const normalized = trimmed
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        return `label:${normalized || 'fallback'}`
      }
    }

    return ''
  }, [])

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


  useEffect(() => {
    setRelationshipFilters(createDefaultRelationshipFilters())
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

  const accessDefaults = useMemo(() => {
    if (!entity) {
      return {
        readMode: 'global',
        readCampaigns: [],
        readUsers: [],
        writeMode: 'global',
        writeCampaigns: [],
        writeUsers: [],
      }
    }

    return {
      readMode: normaliseAccessMode(entity.read_access || entity.readAccess),
      readCampaigns: normaliseIdArray(entity.read_campaign_ids || entity.readCampaignIds),
      readUsers: normaliseIdArray(entity.read_user_ids || entity.readUserIds),
      writeMode: normaliseAccessMode(entity.write_access || entity.writeAccess),
      writeCampaigns: normaliseIdArray(entity.write_campaign_ids || entity.writeCampaignIds),
      writeUsers: normaliseIdArray(entity.write_user_ids || entity.writeUserIds),
    }
  }, [entity])

  const handleEditToggle = useCallback(async () => {
    if (!canEdit) return
    setFormError('')

    if (!isEditing) {
      setAccessSaveError('')
      setAccessSaveSuccess('')
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
        setAccessSettings(() => ({ ...accessDefaults }))
        setAccessSaveError('')
        setAccessSaveSuccess('')
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
    accessDefaults,
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

  const worldId = useMemo(() => entity?.world?.id || entity?.world_id || '', [entity])

  useEffect(() => {
    setAccessSettings(accessDefaults)
  }, [accessDefaults])

  const loadAccessOptions = useCallback(async () => {
    if (!token) return

    if (!worldId) {
      setAccessOptions({ campaigns: [], users: [] })
      setAccessOptionsError('')
      setAccessOptionsLoading(false)
      return
    }

    setAccessOptionsLoading(true)
    setAccessOptionsError('')

    try {
      const [campaignResponse, characterResponse] = await Promise.all([
        fetchCampaigns({ world_id: worldId }),
        fetchCharacters({ world_id: worldId }),
      ])

      const campaignData = Array.isArray(campaignResponse?.data)
        ? campaignResponse.data
        : Array.isArray(campaignResponse)
          ? campaignResponse
          : []

      const campaigns = campaignData.map((item) => ({
        value: String(item.id),
        label: item.name || 'Untitled campaign',
      }))

      const characterData = Array.isArray(characterResponse?.data)
        ? characterResponse.data
        : Array.isArray(characterResponse)
          ? characterResponse
          : []

      const userMap = new Map()
      characterData.forEach((character) => {
        const userId = character?.user_id || character?.player?.id
        if (!userId) return
        const key = String(userId)
        if (userMap.has(key)) return

        const player = character?.player || {}
        const username = typeof player.username === 'string' ? player.username.trim() : ''
        const email = typeof player.email === 'string' ? player.email.trim() : ''

        let label = username || email || `User ${key.slice(0, 8)}`
        if (username && email && username !== email) {
          label = `${username} (${email})`
        }

        userMap.set(key, { value: key, label })
      })

      setAccessOptions({ campaigns, users: Array.from(userMap.values()) })
    } catch (err) {
      console.error('❌ Failed to load access options', err)
      setAccessOptions({ campaigns: [], users: [] })
      setAccessOptionsError(err.message || 'Failed to load access options')
    } finally {
      setAccessOptionsLoading(false)
    }
  }, [token, worldId])

  useEffect(() => {
    if (!sessionReady) return
    loadAccessOptions()
  }, [sessionReady, loadAccessOptions])

  const isAccessDirty = useMemo(() => {
    const keys = [
      'readMode',
      'readCampaigns',
      'readUsers',
      'writeMode',
      'writeCampaigns',
      'writeUsers',
    ]

    const normaliseArray = (value) => {
      if (!Array.isArray(value)) return []
      return value
        .map((entry) => {
          if (entry === null || entry === undefined) return null
          const text = String(entry).trim()
          return text || null
        })
        .filter(Boolean)
        .sort()
    }

    return keys.some((key) => {
      const currentValue = accessSettings?.[key]
      const defaultValue = accessDefaults?.[key]

      const currentIsArray = Array.isArray(currentValue)
      const defaultIsArray = Array.isArray(defaultValue)

      if (currentIsArray || defaultIsArray) {
        const currentArray = normaliseArray(currentValue)
        const defaultArray = normaliseArray(defaultValue)

        if (currentArray.length !== defaultArray.length) return true
        for (let index = 0; index < currentArray.length; index += 1) {
          if (currentArray[index] !== defaultArray[index]) {
            return true
          }
        }
        return false
      }

      return currentValue !== defaultValue
    })
  }, [accessSettings, accessDefaults])

  const hasUnsavedChanges = isEditing && (formState.isDirty || isAccessDirty)

  useUnsavedChangesPrompt(hasUnsavedChanges, EDIT_MODE_PROMPT_MESSAGE)

  const handleAccessSettingChange = useCallback(
    (key, value) => {
      if (!canEdit || accessSaving) return
      setAccessSaveError('')
      setAccessSaveSuccess('')

      setAccessSettings((prev) => {
        const next = { ...(prev || {}) }

        if (key === 'readMode' || key === 'writeMode') {
          const mode = normaliseAccessMode(value)
          next[key] = mode

          if (key === 'readMode' && mode !== 'selective') {
            next.readCampaigns = []
            next.readUsers = []
          }

          if (key === 'writeMode' && mode !== 'selective') {
            next.writeCampaigns = []
            next.writeUsers = []
          }

          return next
        }

        if (
          key === 'readCampaigns' ||
          key === 'readUsers' ||
          key === 'writeCampaigns' ||
          key === 'writeUsers'
        ) {
          const list = Array.isArray(value)
            ? value
                .map((entry) => {
                  if (entry === undefined || entry === null) return ''
                  return String(entry).trim()
                })
                .filter(Boolean)
            : []

          next[key] = list
          return next
        }

        next[key] = value
        return next
      })
    },
    [canEdit, accessSaving],
  )

  const entityId = entity?.id

  const handleAccessSave = useCallback(async () => {
    if (!canEdit || !entityId) return false
    if (!isAccessDirty) {
      return true
    }

    setAccessSaveError('')
    setAccessSaveSuccess('')
    setAccessSaving(true)

    try {
      const payload = {
        read_access: accessSettings.readMode,
        write_access: accessSettings.writeMode,
        read_campaign_ids:
          accessSettings.readMode === 'selective' ? accessSettings.readCampaigns : [],
        read_user_ids:
          accessSettings.readMode === 'selective' ? accessSettings.readUsers : [],
        write_campaign_ids:
          accessSettings.writeMode === 'selective' ? accessSettings.writeCampaigns : [],
        write_user_ids:
          accessSettings.writeMode === 'selective' ? accessSettings.writeUsers : [],
      }

      const response = await updateEntity(entityId, payload)
      const updated = response?.data || response

      if (!updated) {
        throw new Error('Failed to save access settings')
      }

      setEntity(updated)
      setAccessSaveSuccess('Access settings saved.')
      return true
    } catch (err) {
      console.error('❌ Failed to save access settings', err)
      setAccessSaveError(err.message || 'Failed to save access settings')
      return false
    } finally {
      setAccessSaving(false)
    }
  }, [canEdit, entityId, accessSettings, isAccessDirty])

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

    const normaliseRelationshipTypeId = (value) => {
      if (value === undefined || value === null) return ''
      if (typeof value === 'string' || typeof value === 'number') {
        const trimmed = String(value).trim()
        return trimmed
      }
      if (typeof value === 'object') {
        if (value.id !== undefined && value.id !== null) {
          return String(value.id)
        }
        if (value.relationship_type_id !== undefined && value.relationship_type_id !== null) {
          return String(value.relationship_type_id)
        }
        if (value.relationshipTypeId !== undefined && value.relationshipTypeId !== null) {
          return String(value.relationshipTypeId)
        }
      }
      return ''
    }

    const normaliseEntityTypeInfo = (entityValue, fallbackType, fallbackName, fallbackId) => {
      const candidates = []

      if (entityValue && typeof entityValue === 'object') {
        candidates.push(
          entityValue.entityType,
          entityValue.entity_type,
          entityValue.type,
          entityValue.entityTypeInfo,
        )
      }

      if (fallbackType && typeof fallbackType === 'object') {
        candidates.push(
          fallbackType.entityType,
          fallbackType.entity_type,
          fallbackType.type,
          fallbackType,
        )
      }

      let resolved = candidates.find((candidate) => candidate && typeof candidate === 'object') || null

      let id =
        resolved?.id ??
        resolved?.entity_type_id ??
        resolved?.entityTypeId ??
        resolved?.type_id ??
        resolved?.typeId ??
        null

      if (id === null || id === undefined || String(id).trim() === '') {
        const fallbackIdValue =
          fallbackId ??
          (typeof fallbackType === 'object'
            ? fallbackType?.id ??
              fallbackType?.entity_type_id ??
              fallbackType?.entityTypeId ??
              fallbackType?.type_id ??
              fallbackType?.typeId
            : null)

        if (fallbackIdValue !== null && fallbackIdValue !== undefined) {
          const trimmed = String(fallbackIdValue).trim()
          if (trimmed) {
            id = trimmed
          }
        }
      }

      let name =
        resolved?.name ??
        resolved?.label ??
        resolved?.title ??
        resolved?.display ??
        ''

      const fallbackNameValue =
        fallbackName ??
        (typeof fallbackType === 'object'
          ? fallbackType?.name ?? fallbackType?.label ?? fallbackType?.title ?? ''
          : '')

      if (!name && fallbackNameValue) {
        name = fallbackNameValue
      }

      if (!name) {
        const nestedType = candidates.find((candidate) => {
          if (!candidate || typeof candidate !== 'object') return false
          const nestedName =
            candidate.name ??
            candidate.label ??
            candidate.title ??
            candidate.display ??
            candidate.typeName ??
            candidate.type_name ??
            candidate.entityTypeName ??
            candidate.entity_type_name ??
            candidate.entityTypeLabel ??
            candidate.entity_type_label ??
            ''
          return Boolean(String(nestedName || '').trim())
        })

        if (nestedType) {
          name =
            nestedType.name ??
            nestedType.label ??
            nestedType.title ??
            nestedType.display ??
            nestedType.typeName ??
            nestedType.type_name ??
            nestedType.entityTypeName ??
            nestedType.entity_type_name ??
            nestedType.entityTypeLabel ??
            nestedType.entity_type_label ??
            ''
        }
      }

      if (!name && typeof fallbackType === 'string') {
        const trimmed = fallbackType.trim()
        if (trimmed) {
          name = trimmed
        }
      }

      if (
        !name &&
        entityValue &&
        typeof entityValue === 'object' &&
        (entityValue.entityTypeName || entityValue.entity_type_name)
      ) {
        name = entityValue.entityTypeName || entityValue.entity_type_name || ''
      }

      return {
        id:
          id !== undefined && id !== null && String(id).trim() !== ''
            ? String(id)
            : '',
        name: name ? String(name) : '',
      }
    }

    const getFirstString = (...candidates) => {
      for (const candidate of candidates) {
        if (candidate === undefined || candidate === null) continue
        if (typeof candidate === 'string' || typeof candidate === 'number') {
          const trimmed = String(candidate).trim()
          if (trimmed) return trimmed
          continue
        }

        if (typeof candidate === 'object') {
          const {
            name,
            label,
            title,
            display,
            typeName,
            type_name,
            entityTypeName,
            entity_type_name,
            entityTypeLabel,
            entity_type_label,
          } = candidate

          const valuesToCheck = [
            name,
            label,
            title,
            display,
            typeName,
            type_name,
            entityTypeName,
            entity_type_name,
            entityTypeLabel,
            entity_type_label,
          ]

          for (const value of valuesToCheck) {
            if (value === undefined || value === null) continue
            const trimmed = String(value).trim()
            if (trimmed) return trimmed
          }
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

      const typeId =
        normaliseRelationshipTypeId(
          relationship.relationship_type_id ??
            relationship.relationshipTypeId ??
            relationship.typeId,
        ) || normaliseRelationshipTypeId(type)

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

      const fromEntityTypeInfo = normaliseEntityTypeInfo(
        fromEntity,
        relationship.from_entity_type || relationship.fromEntityType,
        relationship.from_entity_type_name || relationship.fromEntityTypeName,
        relationship.from_entity_type_id ?? relationship.fromEntityTypeId,
      )

      const toEntityTypeInfo = normaliseEntityTypeInfo(
        toEntity,
        relationship.to_entity_type || relationship.toEntityType,
        relationship.to_entity_type_name || relationship.toEntityTypeName,
        relationship.to_entity_type_id ?? relationship.toEntityTypeId,
      )

      const fromEntityTypeId =
        fromEntityTypeInfo.id ||
        getFirstString(
          relationship.from_entity_type_id,
          relationship.fromEntityTypeId,
          relationship.from_entity_type?.id,
          relationship.from_entity_type?.entity_type_id,
          relationship.from_entity_type?.entityTypeId,
        ) ||
        ''

      const toEntityTypeId =
        toEntityTypeInfo.id ||
        getFirstString(
          relationship.to_entity_type_id,
          relationship.toEntityTypeId,
          relationship.to_entity_type?.id,
          relationship.to_entity_type?.entity_type_id,
          relationship.to_entity_type?.entityTypeId,
        ) ||
        ''

      const fromEntityTypeName =
        getFirstString(
          fromEntityTypeInfo.name,
          relationship.from_entity_type_name,
          relationship.fromEntityTypeName,
          relationship.from_entity_type_label,
          relationship.fromEntityTypeLabel,
          relationship.from_entity_type,
          relationship.fromEntityType,
          fromEntity?.entityType,
          fromEntity?.entity_type,
          fromEntity?.type,
          fromEntity?.entityTypeInfo,
          fromEntity?.entityTypeName,
          fromEntity?.entity_type_name,
        ) || ''

      const toEntityTypeName =
        getFirstString(
          toEntityTypeInfo.name,
          relationship.to_entity_type_name,
          relationship.toEntityTypeName,
          relationship.to_entity_type_label,
          relationship.toEntityTypeLabel,
          relationship.to_entity_type,
          relationship.toEntityType,
          toEntity?.entityType,
          toEntity?.entity_type,
          toEntity?.type,
          toEntity?.entityTypeInfo,
          toEntity?.entityTypeName,
          toEntity?.entity_type_name,
        ) || ''

      return {
        id: relationship.id,
        typeId,
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
        fromEntityTypeId,
        fromEntityTypeName,
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
        toEntityTypeId,
        toEntityTypeName,
        direction,
        bidirectional: Boolean(relationship.bidirectional),
      }
    })
  }, [relationships])

  const sortedRelationships = useMemo(() => {
    if (!Array.isArray(normalisedRelationships)) return []
    const entityIdString = entity?.id != null ? String(entity.id) : ''

    return normalisedRelationships
      .filter((relationship) => {
        if (!entityIdString) return true
        const fromId = relationship?.fromId != null ? String(relationship.fromId) : ''
        const toId = relationship?.toId != null ? String(relationship.toId) : ''
        return fromId === entityIdString || toId === entityIdString
      })
      .sort((a, b) => {
        const aIsSource = entityIdString && String(a?.fromId ?? '') === entityIdString
        const bIsSource = entityIdString && String(b?.fromId ?? '') === entityIdString
        const aRelatedName = aIsSource ? a?.toName || '' : a?.fromName || ''
        const bRelatedName = bIsSource ? b?.toName || '' : b?.fromName || ''
        return aRelatedName.localeCompare(bRelatedName, undefined, { sensitivity: 'base' })
      })
  }, [normalisedRelationships, entity?.id])

  const relationshipFilterOptions = useMemo(() => {
    const typeMap = new Map()
    const relatedTypeMap = new Map()
    const entityIdString = entity?.id != null ? String(entity.id) : ''

    const debugEntries = []

    sortedRelationships.forEach((relationship) => {
      const typeLabel =
        relationship.typeName && relationship.typeName !== '—'
          ? relationship.typeName
          : 'Unknown type'
      const typeKey = buildFilterKey(
        relationship.typeId,
        relationship.typeName,
        typeLabel,
      )
      if (typeKey && !typeMap.has(typeKey)) {
        typeMap.set(typeKey, typeLabel)
      }

      if (!entityIdString) return

      const isSource = String(relationship.fromId ?? '') === entityIdString
      const relatedTypeId = isSource
        ? relationship.toEntityTypeId
        : relationship.fromEntityTypeId
      const relatedTypeName = isSource
        ? relationship.toEntityTypeName
        : relationship.fromEntityTypeName
      const relatedLabel = relatedTypeName || 'Unknown entity type'
      const relatedKey = buildFilterKey(
        relatedTypeId,
        relatedTypeName,
        relatedLabel,
      )
      if (!relatedKey || relatedTypeMap.has(relatedKey)) return

      relatedTypeMap.set(relatedKey, relatedLabel)

      debugEntries.push({
        relationshipId: relationship.id,
        isSource,
        type: {
          id: relationship.typeId,
          key: typeKey,
          label: typeLabel,
        },
        related: {
          id: relatedTypeId,
          key: relatedKey,
          label: relatedLabel,
          name: relatedTypeName,
        },
      })
    })

    const relationshipTypes = Array.from(typeMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

    const relatedEntityTypes = Array.from(relatedTypeMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[EntityDetailPage] Derived relationship filter options', {
        entityId: entityIdString || null,
        relationshipCount: sortedRelationships.length,
        relationshipTypes,
        relatedEntityTypes,
        details: debugEntries,
      })
    }

    return { relationshipTypes, relatedEntityTypes }
  }, [sortedRelationships, entity?.id, buildFilterKey])

  useEffect(() => {
    setRelationshipFilters((prev) => {
      const defaultGroup = { mode: 'all', values: [] }
      const sanitizeGroup = (group, options) => {
        const base = group && typeof group === 'object' ? group : defaultGroup
        const allowedModes = new Set(['all', 'include', 'exclude'])
        const mode = allowedModes.has(base.mode) ? base.mode : 'all'
        if (!options || options.length === 0) {
          return { mode: 'all', values: [] }
        }
        const optionValues = new Set(options.map((option) => String(option.value)))
        const values =
          mode === 'all'
            ? []
            : (Array.isArray(base.values) ? base.values : []).filter((value) =>
                optionValues.has(String(value)),
              )
        return { mode, values }
      }

      const nextRelationshipTypes = sanitizeGroup(
        prev?.relationshipTypes,
        relationshipFilterOptions.relationshipTypes,
      )
      const nextRelatedEntityTypes = sanitizeGroup(
        prev?.relatedEntityTypes,
        relationshipFilterOptions.relatedEntityTypes,
      )

      const groupsEqual = (aInput, bInput) => {
        const a = aInput && typeof aInput === 'object' ? aInput : defaultGroup
        const b = bInput && typeof bInput === 'object' ? bInput : defaultGroup
        if (a.mode !== b.mode) return false
        if (a.values.length !== b.values.length) return false
        return a.values.every((value, index) => value === b.values[index])
      }

      if (
        groupsEqual(prev?.relationshipTypes, nextRelationshipTypes) &&
        groupsEqual(prev?.relatedEntityTypes, nextRelatedEntityTypes)
      ) {
        return prev
      }

      return {
        relationshipTypes: nextRelationshipTypes,
        relatedEntityTypes: nextRelatedEntityTypes,
      }
    })
  }, [relationshipFilterOptions])

  const filteredRelationships = useMemo(() => {
    const typeFilter = relationshipFilters?.relationshipTypes || { mode: 'all', values: [] }
    const relatedEntityTypeFilter =
      relationshipFilters?.relatedEntityTypes || { mode: 'all', values: [] }
    const entityIdString = entity?.id != null ? String(entity.id) : ''

    return sortedRelationships.filter((relationship) => {
      const typeLabel =
        relationship.typeName && relationship.typeName !== '—'
          ? relationship.typeName
          : 'Unknown type'
      const typeKey = buildFilterKey(
        relationship.typeId,
        relationship.typeName,
        typeLabel,
      )
      if (typeFilter.mode !== 'all' && typeFilter.values.length > 0) {
        const match = typeKey ? typeFilter.values.includes(typeKey) : false
        if (typeFilter.mode === 'include' && !match) return false
        if (typeFilter.mode === 'exclude' && match) return false
      }

      if (relatedEntityTypeFilter.mode !== 'all' && relatedEntityTypeFilter.values.length > 0) {
        if (!entityIdString) return false

        const isSource = String(relationship.fromId ?? '') === entityIdString
        const relatedTypeId = isSource
          ? relationship.toEntityTypeId
          : relationship.fromEntityTypeId
        const relatedTypeName = isSource
          ? relationship.toEntityTypeName
          : relationship.fromEntityTypeName
        const relatedLabel = relatedTypeName || 'Unknown entity type'
        const relatedKey = buildFilterKey(
          relatedTypeId,
          relatedTypeName,
          relatedLabel,
        )
        const match = relatedKey ? relatedEntityTypeFilter.values.includes(relatedKey) : false
        if (relatedEntityTypeFilter.mode === 'include' && !match) return false
        if (relatedEntityTypeFilter.mode === 'exclude' && match) return false
      }

      return true
    })
  }, [sortedRelationships, relationshipFilters, entity?.id, buildFilterKey])

  const filterButtonDisabled = relationshipsLoading

  const handleRelationshipFiltersChange = useCallback((nextFilters) => {
    if (!nextFilters || typeof nextFilters !== 'object') {
      setRelationshipFilters(createDefaultRelationshipFilters())
      return
    }

    const normalizeGroup = (group) => {
      if (!group || typeof group !== 'object') {
        return { mode: 'all', values: [] }
      }

      const allowedModes = new Set(['all', 'include', 'exclude'])
      const mode = allowedModes.has(group.mode) ? group.mode : 'all'
      if (mode === 'all') {
        return { mode: 'all', values: [] }
      }

      const values = Array.isArray(group.values)
        ? group.values.map((value) => String(value))
        : []

      return { mode, values }
    }

    setRelationshipFilters({
      relationshipTypes: normalizeGroup(nextFilters.relationshipTypes),
      relatedEntityTypes: normalizeGroup(nextFilters.relatedEntityTypes),
    })
  }, [])

  const handleRelationshipFiltersReset = useCallback(() => {
    setRelationshipFilters(createDefaultRelationshipFilters())
  }, [])

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

  const handleFormStateChange = useCallback((nextState) => {
    setFormState((prev) => {
      const next = {
        isDirty: Boolean(nextState?.isDirty),
        isSubmitting: Boolean(nextState?.isSubmitting),
      }

      if (prev.isDirty === next.isDirty && prev.isSubmitting === next.isSubmitting) {
        return prev
      }

      return next
    })
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
    <TabNav tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
  </div>
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
              ref={formRef}
              schema={editSchema}
              initialData={editInitialData || {}}
              onSubmit={handleUpdate}
              onStateChange={handleFormStateChange}
              hideActions
              enableUnsavedPrompt={false}
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
            No relationships match your filters. Try adjusting or clearing the filters above.
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
                  const isSource = String(relationship.fromId) === String(entity.id)
                  const relatedName = isSource ? relationship.toName : relationship.fromName
                  const relatedId = isSource ? relationship.toId : relationship.fromId

                  // Grab relationship type and directional labels
                  const typeName = relationship.typeName || '—'
                  const sourceLabel = relationship.sourceLabel || relationship.source_relationship_label || ''
                  const targetLabel = relationship.targetLabel || relationship.target_relationship_label || ''

                  // Build contextual phrase
                  const currentName = entity.name || 'Entity'
                  const phrase = isSource
                    ? `${currentName} ${sourceLabel || ''} ${relatedName || ''}`.trim()
                    : `${currentName} ${targetLabel || ''} ${relatedName || ''}`.trim()

                  return (
                    <tr key={relationship.id}>
                      <td>
                        <span className="relationship-phrase">
                          {isSource ? (
                            <>
                              <strong>{entity.name}</strong> {sourceLabel || '—'}{' '}
                              <span className="entity-link-with-preview">
                                <Link
                                  to={`/entities/${relatedId}`}
                                  className="entity-relationship-link"
                                >
                                  {relatedName || '—'}
                                </Link>
                                {relatedId ? (
                                  <EntityInfoPreview
                                    entityId={relatedId}
                                    entityName={relatedName || 'entity'}
                                  />
                                ) : null}
                              </span>
                            </>
                          ) : (
                            <>
                              <strong>{entity.name}</strong> {targetLabel || '—'}{' '}
                              <span className="entity-link-with-preview">
                                <Link
                                  to={`/entities/${relatedId}`}
                                  className="entity-relationship-link"
                                >
                                  {relatedName || '—'}
                                </Link>
                                {relatedId ? (
                                  <EntityInfoPreview
                                    entityId={relatedId}
                                    entityName={relatedName || 'entity'}
                                  />
                                ) : null}
                              </span>
                            </>
                          )}
                        </span>
                      </td>
                      <td>{typeName}</td>
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
)}

    {/* ACCESS TAB */}
    {activeTab === 'access' && isEditing && canEdit && (
      <div className="entity-tab-content">
        <section className="entity-card entity-access-card">
          <h2 className="entity-card-title">Access controls</h2>
          <p className="entity-access-note help-text">
            Configure who can view and edit this entity. Users with write access will
            automatically receive read access. Save your changes to update the access rules.
          </p>

          {accessOptionsError ? (
            <div className="alert error" role="alert">
              {accessOptionsError}
            </div>
          ) : null}

            {!worldId ? (
              <p className="entity-empty-state">
                Assign this entity to a world to configure access settings.
              </p>
            ) : (
              <>
                <div className="entity-access-columns">
                  <div className="entity-access-column">
                    <h3>Read access</h3>
                    <div className="form-group">
                      <label htmlFor="entity-access-read-mode">Visibility</label>
                      <select
                        id="entity-access-read-mode"
                        value={accessSettings.readMode}
                        onChange={(event) =>
                          handleAccessSettingChange('readMode', event.target.value)
                        }
                        disabled={!canEdit || accessSaving}
                      >
                        {ACCESS_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {accessSettings.readMode === 'selective' ? (
                      <>
                        <div className="form-group">
                          <label htmlFor="entity-access-read-campaigns">Campaigns</label>
                          <ListCollector
                            inputId="entity-access-read-campaigns"
                            selected={accessSettings.readCampaigns}
                            options={accessOptions.campaigns}
                            onChange={(selection) =>
                              handleAccessSettingChange('readCampaigns', selection)
                            }
                            placeholder="Select campaigns..."
                            noOptionsMessage={
                              accessOptionsLoading
                                ? 'Loading campaigns...'
                                : 'No campaigns available for this world.'
                            }
                            loading={accessOptionsLoading}
                            disabled={!canEdit || accessSaving}
                          />
                          <p className="help-text">
                            Members of selected campaigns can view this entity.
                          </p>
                        </div>

                        <div className="form-group">
                          <label htmlFor="entity-access-read-users">Users</label>
                          <ListCollector
                            inputId="entity-access-read-users"
                            selected={accessSettings.readUsers}
                            options={accessOptions.users}
                            onChange={(selection) =>
                              handleAccessSettingChange('readUsers', selection)
                            }
                            placeholder="Select users..."
                            noOptionsMessage={
                              accessOptionsLoading
                                ? 'Loading users...'
                                : 'No eligible users found for this world.'
                            }
                            loading={accessOptionsLoading}
                            disabled={!canEdit || accessSaving}
                          />
                          <p className="help-text">
                            Choose players who have characters in this world.
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="entity-access-column">
                    <h3>Write access</h3>
                    <div className="form-group">
                      <label htmlFor="entity-access-write-mode">Write</label>
                      <select
                        id="entity-access-write-mode"
                        value={accessSettings.writeMode}
                        onChange={(event) =>
                          handleAccessSettingChange('writeMode', event.target.value)
                        }
                        disabled={!canEdit || accessSaving}
                      >
                        {ACCESS_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {accessSettings.writeMode === 'selective' ? (
                      <>
                        <div className="form-group">
                          <label htmlFor="entity-access-write-campaigns">Campaigns</label>
                          <ListCollector
                            inputId="entity-access-write-campaigns"
                            selected={accessSettings.writeCampaigns}
                            options={accessOptions.campaigns}
                            onChange={(selection) =>
                              handleAccessSettingChange('writeCampaigns', selection)
                            }
                            placeholder="Select campaigns..."
                            noOptionsMessage={
                              accessOptionsLoading
                                ? 'Loading campaigns...'
                                : 'No campaigns available for this world.'
                            }
                            loading={accessOptionsLoading}
                            disabled={!canEdit || accessSaving}
                          />
                          <p className="help-text">
                            Dungeon Masters of these campaigns can edit this entity.
                          </p>
                        </div>

                        <div className="form-group">
                          <label htmlFor="entity-access-write-users">Users</label>
                          <ListCollector
                            inputId="entity-access-write-users"
                            selected={accessSettings.writeUsers}
                            options={accessOptions.users}
                            onChange={(selection) =>
                              handleAccessSettingChange('writeUsers', selection)
                            }
                            placeholder="Select users..."
                            noOptionsMessage={
                              accessOptionsLoading
                                ? 'Loading users...'
                                : 'No eligible users found for this world.'
                            }
                            loading={accessOptionsLoading}
                            disabled={!canEdit || accessSaving}
                          />
                          <p className="help-text">
                            Grant edit access to specific players with characters here.
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="entity-access-actions">
                  {accessSaveError ? (
                    <div className="alert error" role="alert">
                      {accessSaveError}
                    </div>
                  ) : null}
                  {accessSaveSuccess ? (
                    <div className="alert success" role="status">
                      {accessSaveSuccess}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="btn submit"
                    onClick={handleAccessSave}
                    disabled={!canEdit || accessSaving || !isAccessDirty}
                  >
                    {accessSaving ? 'Saving...' : 'Save access settings'}
                  </button>
                </div>
              </>
            )}
        </section>
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
