import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBeforeUnload, useLocation, useNavigate, useParams } from 'react-router-dom'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../components/RecordForm/FieldRenderer.jsx'
import ListCollector from '../../components/ListCollector.jsx'
import TabNav from '../../components/TabNav.jsx'
import DrawerPanel from '../../components/DrawerPanel.jsx'
import EntityHeader from '../../components/entities/EntityHeader.jsx'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
import UnsavedChangesDialog from '../../components/UnsavedChangesDialog.jsx'
import { createDefaultRelationshipFilters } from '../../components/entities/EntityRelationshipFilters.jsx'
import {
  getEntity,
  updateEntity,
  fetchEntityNotes,
  createEntityNote,
} from '../../api/entities.js'
import { getEntityRelationships } from '../../api/entityRelationships.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import RelationshipBuilder from '../../modules/relationships3/RelationshipBuilder.jsx'
// hooks
import useEntityAccess from '../../hooks/useEntityAccess.js'
import useIsMobile from '../../hooks/useIsMobile.js'
import useNavigationBlocker from '../../hooks/useNavigationBlocker.js'

// tabs
import DossierTab from './tabs/DossierTab.jsx'
import RelationshipsTab from './tabs/RelationshipsTab.jsx'
import AccessTab from './tabs/AccessTab.jsx'
import SystemTab from './tabs/SystemTab.jsx'
import SecretsTab from './tabs/SecretsTab.jsx'
import NotesTab from './tabs/NotesTab.jsx'

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
    case 'reference':
      if (typeof value === 'object' && value !== null) {
        const label =
          value.label ??
          value.name ??
          value.title ??
          value.display ??
          value.displayName ??
          value.text ??
          value.value ??
          value.id
        if (label === null || label === undefined) {
          try {
            return JSON.stringify(value, null, 2)
          } catch (err) {
            console.warn('⚠️ Failed to serialise reference metadata field', err)
            return String(value)
          }
        }
        return String(label)
      }
      return value
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

  if (field?.dataType === 'reference') {
    if (typeof value === 'object' && value !== null) {
      return (
        value.value ??
        value.id ??
        value.key ??
        value.slug ??
        value.uuid ??
        ''
      )
    }
  }

  return value
}

const buildRelationshipFilterKey = (idValue, name, fallbackLabel = '') => {
  if (idValue !== undefined && idValue !== null) {
    const trimmed = String(idValue).trim()
    if (trimmed) return trimmed
  }

  if (name !== undefined && name !== null) {
    const trimmed = String(name).trim()
    if (trimmed) return `name:${trimmed.toLowerCase()}`
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
}

export default function EntityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign, selectedCampaignId } = useCampaignContext()
  const isMobile = useIsMobile()

  const [entity, setEntity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [activeTab, setActiveTab] = useState('dossier')
  const [isEditing, setIsEditing] = useState(false)

  const [showRelationshipForm, setShowRelationshipForm] = useState(false)
  const [toast, setToast] = useState(null)

  const [notesState, setNotesState] = useState({
    items: [],
    loading: false,
    error: '',
  })
  const [notesSaving, setNotesSaving] = useState(false)

  const formRef = useRef(null)
  const [formState, setFormState] = useState({
    isDirty: false,
    isSubmitting: false,
  })
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [unsavedDialogSaving, setUnsavedDialogSaving] = useState(false)
  const [relationships, setRelationships] = useState([])
  const [relationshipsError, setRelationshipsError] = useState('')
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [relationshipFilters, setRelationshipFilters] = useState(() =>
    createDefaultRelationshipFilters(),
  )
  const prevLocationRef = useRef(location)
  const allowedNavigationRef = useRef(null)

  const campaignMembership = useMemo(() => {
    if (!selectedCampaign || !user?.id) return null
    const members = Array.isArray(selectedCampaign.members)
      ? selectedCampaign.members
      : []
    const match = members.find((member) => {
      if (!member) return false
      const memberUserId =
        member.user_id ?? member.userId ?? member.user?.id ?? member.id ?? null
      if (!memberUserId) return false
      return String(memberUserId) === String(user.id)
    })
    return match || null
  }, [selectedCampaign, user?.id])

  const membershipRole = campaignMembership?.role ?? null

  const isCampaignDm = useMemo(() => {
    if (user?.role === 'system_admin') return true
    return membershipRole === 'dm'
  }, [membershipRole, user?.role])

  const isCampaignPlayer = useMemo(
    () => membershipRole === 'player',
    [membershipRole],
  )

  const canCreateNotes = useMemo(
    () => Boolean(isCampaignDm || isCampaignPlayer),
    [isCampaignDm, isCampaignPlayer],
  )

  const entityWorldId = useMemo(() => {
    if (!entity) return ''
    if (entity.world?.id) return String(entity.world.id)
    if (entity.world_id) return String(entity.world_id)
    if (entity.worldId) return String(entity.worldId)
    return ''
  }, [entity])

  const selectedCampaignWorldId = useMemo(() => {
    if (!selectedCampaign) return ''
    if (selectedCampaign.world?.id) return String(selectedCampaign.world.id)
    if (selectedCampaign.world_id) return String(selectedCampaign.world_id)
    return ''
  }, [selectedCampaign])

  const campaignMatchesEntityWorld = useMemo(() => {
    if (!selectedCampaignId) return true
    if (!entityWorldId || !selectedCampaignWorldId) return true
    return String(entityWorldId) === String(selectedCampaignWorldId)
  }, [selectedCampaignId, entityWorldId, selectedCampaignWorldId])

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

  const formatNavigationDestination = useCallback(
    (location) => {
      if (!location) return 'the next page'
      const pathname = location.pathname || ''
      const search = location.search || ''
      const destination = `${pathname}${search}`
      if (!destination) return 'the next page'
      if (destination === backUrl) return 'the previous page'
      return destination
    },
    [backUrl],
  )

  const buildLocationPath = useCallback((loc) => {
    if (!loc) return ''
    const pathname = loc.pathname || ''
    const search = loc.search || ''
    const hash = loc.hash || ''
    return `${pathname}${search}${hash}`
  }, [])

  const handleExplore = useCallback(() => {
    navigate(`/entities/${id}/relationship-viewer`)
  }, [navigate, id])

  const handleSecretUpsert = useCallback((secret) => {
    if (!secret) return

    setEntity((previous) => {
      if (!previous) return previous

      const existingSecrets = Array.isArray(previous.secrets)
        ? previous.secrets
        : []

      const findIndex = existingSecrets.findIndex((entry) => {
        if (!entry || !secret) return false
        if (!entry.id || !secret.id) return false
        return String(entry.id) === String(secret.id)
      })

      const nextSecrets =
        findIndex >= 0
          ? existingSecrets.map((entry, index) =>
              index === findIndex ? secret : entry
            )
          : [...existingSecrets, secret]

      const parseTimestamp = (value) => {
        if (!value) return 0
        const resolved = new Date(value).getTime()
        return Number.isNaN(resolved) ? 0 : resolved
      }

      const sortedSecrets = nextSecrets
        .slice()
        .sort((a, b) =>
          parseTimestamp(a?.created_at || a?.createdAt) -
          parseTimestamp(b?.created_at || b?.createdAt)
        )

      return { ...previous, secrets: sortedSecrets }
    })
  }, [])

  const fetchNotes = useCallback(async () => {
    const response = await fetchEntityNotes(id, {
      campaignId: selectedCampaignId,
    })
    const data = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : []
    return data
  }, [id, selectedCampaignId])

  useEffect(() => {
    let cancelled = false

    if (!id || !selectedCampaignId || !campaignMatchesEntityWorld) {
      setNotesState({ items: [], loading: false, error: '' })
      return () => {
        cancelled = true
      }
    }

    setNotesState((previous) => ({ ...previous, loading: true, error: '' }))

    const loadNotes = async () => {
      try {
        const list = await fetchNotes()
        if (!cancelled) {
          setNotesState({ items: list, loading: false, error: '' })
        }
      } catch (err) {
        if (!cancelled) {
          setNotesState((previous) => ({
            ...previous,
            loading: false,
            error: err.message || 'Failed to load notes',
          }))
        }
      }
    }

    loadNotes()

    return () => {
      cancelled = true
    }
  }, [id, selectedCampaignId, campaignMatchesEntityWorld, fetchNotes])

  const handleNotesReload = useCallback(async () => {
    if (!id || !selectedCampaignId || !campaignMatchesEntityWorld) {
      setNotesState({ items: [], loading: false, error: '' })
      return
    }

    setNotesState((previous) => ({ ...previous, loading: true, error: '' }))

    try {
      const list = await fetchNotes()
      setNotesState({ items: list, loading: false, error: '' })
    } catch (err) {
      setNotesState((previous) => ({
        ...previous,
        loading: false,
        error: err.message || 'Failed to load notes',
      }))
    }
  }, [id, selectedCampaignId, campaignMatchesEntityWorld, fetchNotes])

  const handleNoteCreate = useCallback(
    async (payload) => {
      if (!id) {
        return { success: false, message: 'Entity not found' }
      }
      if (!selectedCampaignId) {
        return { success: false, message: 'Select a campaign first' }
      }

      setNotesSaving(true)

      try {
        const requestPayload = {
          ...payload,
          campaignId: payload?.campaignId ?? selectedCampaignId,
        }

        const response = await createEntityNote(id, requestPayload)
        const note = response?.data || response

        if (!note) {
          throw new Error('Note could not be created')
        }

        const timestamp =
          note?.createdAt ?? note?.created_at ?? new Date().toISOString()
        const normalizedNote =
          note?.createdAt && note?.created_at
            ? note
            : {
                ...note,
                ...(note?.createdAt ? {} : { createdAt: timestamp }),
                ...(note?.created_at ? {} : { created_at: timestamp }),
              }

        setNotesState((previous) => {
          const currentItems = Array.isArray(previous?.items)
            ? previous.items.slice()
            : []
          const noteId = note?.id
          const filtered = noteId
            ? currentItems.filter((entry) => entry?.id !== noteId)
            : currentItems

          return {
            items: [normalizedNote, ...filtered],
            loading: false,
            error: '',
          }
        })

        return { success: true, note: normalizedNote }
      } catch (err) {
        console.error('❌ Failed to create note', err)
        return {
          success: false,
          message: err.message || 'Failed to create note',
        }
      } finally {
        setNotesSaving(false)
      }
    },
    [id, selectedCampaignId],
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

  const secrets = useMemo(
    () => (Array.isArray(entity?.secrets) ? entity.secrets : []),
    [entity?.secrets]
  )

  const canManageSecrets = useMemo(
    () => Boolean(entity?.permissions?.canManageSecrets),
    [entity?.permissions?.canManageSecrets]
  )

  const showSecretsTab = canManageSecrets || secrets.length > 0

  const tabItems = useMemo(() => {
    const items = [
      { id: 'dossier', label: 'Dossier' },
      { id: 'notes', label: 'Notes' },
      { id: 'relationships', label: 'Relationships' },
    ]

    if (showSecretsTab) {
      items.push({ id: 'secrets', label: 'Secrets' })
    }

    if (canEdit && isEditing) {
      items.push({ id: 'access', label: 'Access' })
    }

    items.push({ id: 'system', label: 'System' })

    return items
  }, [showSecretsTab, canEdit, isEditing])

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

  const metadataDisplayValues = useMemo(() => {
    if (!entity?.fields || entity.fields.length === 0) {
      return {}
    }

    return entity.fields.reduce((acc, field) => {
      if (!field?.name) return acc
      if (field.dataType !== 'reference') return acc

      const label = (() => {
        if (field.displayValue) return field.displayValue
        if (field.display) return field.display
        if (field.selectedLabel) return field.selectedLabel

        const value = field.value
        if (!value || typeof value !== 'object') return null

        return (
          value.label ??
          value.name ??
          value.title ??
          value.display ??
          value.displayName ??
          value.text ??
          value.value ??
          value.id ??
          null
        )
      })()

      if (label === undefined || label === null) return acc
      acc[field.name] = String(label)
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

  const createdAtValue = entity?.createdAt || entity?.created_at
  const updatedAtValue = entity?.updatedAt || entity?.updated_at

  const viewData = useMemo(() => {
    if (!entity) return null

    return {
      name: entity.name || '—',
      description: entity.description || '',
      typeName: entity.entityType?.name || entity.entity_type?.name || '—',
      worldName: entity.world?.name || entity.world_name || '—',
      worldId: entityWorldId,
      createdAt: formatDateTime(createdAtValue),
      updatedAt: formatDateTime(updatedAtValue),
      metadata: metadataViewValues,
      metadataDisplay: metadataDisplayValues,
      createdBy:
        entity.creator?.username ||
        entity.creator?.email ||
        entity.created_by ||
        '—',
      updatedBy: entity.updated_by || '—',
    }
  }, [
    entity,
    metadataViewValues,
    metadataDisplayValues,
    entityWorldId,
    createdAtValue,
    updatedAtValue,
  ])

  const editInitialData = useMemo(() => {
    if (!entity) return null

    return {
      name: entity.name || '',
      description: entity.description || '',
      visibility: entity.visibility || 'visible',
      entityTypeName: entity.entityType?.name || entity.entity_type?.name || '—',
      worldName: entity.world?.name || entity.world_name || '—',
      worldId: entityWorldId,
      createdAt: formatDateTime(createdAtValue),
      updatedAt: formatDateTime(updatedAtValue),
      metadata: metadataInitialValues,
    }
  }, [entity, entityWorldId, createdAtValue, updatedAtValue, metadataInitialValues])

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
    resetAccessSettings,
    handleAccessSave,
  } = useEntityAccess(entity, token, canEdit)

  const worldId = useMemo(
    () => entity?.world?.id || entity?.world_id || '',
    [entity],
  )

  const entityIdString = entity?.id ? String(entity.id) : ''

  const loadRelationships = useCallback(async () => {
    if (!entityIdString || !token) {
      setRelationships([])
      setRelationshipsError('')
      setRelationshipsLoading(false)
      return
    }

    setRelationshipsLoading(true)
    setRelationshipsError('')

    try {
      const response = await getEntityRelationships(entityIdString)
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
  }, [entityIdString, token])

  useEffect(() => {
    loadRelationships()
  }, [loadRelationships])

  const normalisedRelationships = useMemo(() => {
    if (!Array.isArray(relationships)) return []

    const normaliseId = (value) => {
      if (!value) return ''
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value).trim()
      }
      if (typeof value === 'object') {
        return String(value.id || value.entity_id || value.entityId || '').trim()
      }
      return ''
    }

    return relationships.map((r) => {
      const typeDetails =
        r.relationshipType ||
        r.relationship_type ||
        r.type ||
        r.relationshipTypeId ||
        {}

      const sourceLabel =
        typeDetails?.from_name ||
        typeDetails?.fromName ||
        r.source_relationship_label ||
        r.sourceLabel ||
        ''

      const targetLabel =
        typeDetails?.to_name ||
        typeDetails?.toName ||
        r.target_relationship_label ||
        r.targetLabel ||
        ''

      return {
        id: r.id,
        typeId: normaliseId(
          r.relationship_type_id || r.relationshipTypeId || r.typeId || r.type,
        ),
        typeName: r.relationshipType?.name || r.type?.name || '—',
        fromId: normaliseId(r.from_entity_id || r.fromEntityId || r.from),
        toId: normaliseId(r.to_entity_id || r.toEntityId || r.to),
        fromName: r.from_entity?.name || r.from?.name || '—',
        toName: r.to_entity?.name || r.to?.name || '—',
        fromEntityTypeName:
          r.from_entity_type?.name || r.fromEntityTypeName || '',
        toEntityTypeName: r.to_entity_type?.name || r.toEntityTypeName || '',
        direction: r.context?.__direction === 'reverse' ? 'reverse' : 'forward',
        sourceLabel: sourceLabel || '—',
        targetLabel: targetLabel || '—',
      }
    })
  }, [relationships])

  const sortedRelationships = useMemo(() => {
    return normalisedRelationships
      .filter(
        (r) => r.fromId === entityIdString || r.toId === entityIdString,
      )
      .sort((a, b) => {
        const aRelated = a.fromId === entityIdString ? a.toName : a.fromName
        const bRelated = b.fromId === entityIdString ? b.toName : b.fromName
        return aRelated.localeCompare(bRelated, undefined, {
          sensitivity: 'base',
        })
      })
  }, [normalisedRelationships, entityIdString])

  const relationshipFilterOptions = useMemo(() => {
    const typeMap = new Map()
    const relatedTypeMap = new Map()

    sortedRelationships.forEach((r) => {
      const typeLabel = r.typeName || 'Unknown type'
      const typeKey = buildRelationshipFilterKey(
        r.typeId,
        r.typeName,
        typeLabel,
      )
      if (typeKey && !typeMap.has(typeKey)) typeMap.set(typeKey, typeLabel)

      const isSource = r.fromId === entityIdString
      const relatedLabel = isSource ? r.toEntityTypeName : r.fromEntityTypeName
      const relatedKey = buildRelationshipFilterKey(
        null,
        relatedLabel,
        relatedLabel,
      )
      if (relatedKey && !relatedTypeMap.has(relatedKey)) {
        relatedTypeMap.set(relatedKey, relatedLabel)
      }
    })

    const relationshipTypes = Array.from(typeMap.entries()).map(
      ([value, label]) => ({ value, label }),
    )
    const relatedEntityTypes = Array.from(relatedTypeMap.entries()).map(
      ([value, label]) => ({ value, label }),
    )

    return { relationshipTypes, relatedEntityTypes }
  }, [sortedRelationships, entityIdString])

  const filteredRelationships = useMemo(() => {
    const typeFilter = relationshipFilters.relationshipTypes || {
      mode: 'all',
      values: [],
    }
    const relatedFilter = relationshipFilters.relatedEntityTypes || {
      mode: 'all',
      values: [],
    }

    return sortedRelationships.filter((r) => {
      const typeKey = buildRelationshipFilterKey(
        r.typeId,
        r.typeName,
        r.typeName,
      )
      if (typeFilter.mode !== 'all' && typeFilter.values.length) {
        const match = typeKey && typeFilter.values.includes(typeKey)
        if (typeFilter.mode === 'include' && !match) return false
        if (typeFilter.mode === 'exclude' && match) return false
      }

      if (relatedFilter.mode !== 'all' && relatedFilter.values.length) {
        const isSource = r.fromId === entityIdString
        const relatedLabel = isSource
          ? r.toEntityTypeName
          : r.fromEntityTypeName
        const relatedKey = buildRelationshipFilterKey(
          null,
          relatedLabel,
          relatedLabel,
        )
        const match = relatedKey && relatedFilter.values.includes(relatedKey)
        if (relatedFilter.mode === 'include' && !match) return false
        if (relatedFilter.mode === 'exclude' && match) return false
      }

      return true
    })
  }, [sortedRelationships, relationshipFilters, entityIdString])

  const handleRelationshipFiltersChange = useCallback((nextFilters) => {
    if (!nextFilters || typeof nextFilters !== 'object') {
      setRelationshipFilters(createDefaultRelationshipFilters())
    } else {
      setRelationshipFilters(nextFilters)
    }
  }, [])

  const handleRelationshipFiltersReset = useCallback(() => {
    setRelationshipFilters(createDefaultRelationshipFilters())
  }, [])

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

  const proceedPendingAction = useCallback(() => {
    setPendingAction((action) => {
      action?.proceed?.()
      return null
    })
  }, [])

  const handleUnsavedSaveAndContinue = useCallback(async () => {
    setUnsavedDialogSaving(true)
    try {
      const saved = await handleSaveAll()
      if (saved) {
        setUnsavedDialogOpen(false)
        proceedPendingAction()
      }
    } finally {
      setUnsavedDialogSaving(false)
    }
  }, [handleSaveAll, proceedPendingAction, setUnsavedDialogOpen, setUnsavedDialogSaving])

  const exitEditMode = useCallback(() => {
    setIsEditing(false)
    setActiveTab('dossier')
  }, [setActiveTab])

  const resetPendingChanges = useCallback(() => {
    formRef.current?.reset?.(editInitialData || {})
    resetAccessSettings()
  }, [editInitialData, resetAccessSettings])

  const hasUnsavedChanges = isEditing && (formState.isDirty || isAccessDirty)

  const handleEditToggle = useCallback(() => {
    if (!canEdit) return
    setFormError('')

    if (!isEditing) {
      setIsEditing(true)
      return
    }

    if (hasUnsavedChanges) {
      setPendingAction({
        type: 'exit-edit',
        label: 'view mode',
        proceed: () => {
          exitEditMode()
        },
        discard: () => {
          resetPendingChanges()
          exitEditMode()
        },
      })
      setUnsavedDialogOpen(true)
      return
    }

    exitEditMode()
  }, [canEdit, exitEditMode, hasUnsavedChanges, isEditing, resetPendingChanges])

  const handleUpdate = useCallback(
    async (values) => {
      if (!entity?.id) return false

      setFormError('')

      try {
        const payload = {
          name: values?.name,
          description: values?.description,
          metadata: values?.metadata || {},
        }

        if (entity?.visibility) {
          payload.visibility = entity.visibility
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
    [entity?.id, entity?.visibility],
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

  const handleTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTab) return
      setActiveTab(nextTab)
    },
    [activeTab, setActiveTab],
  )

  const handleUnsavedContinue = useCallback(() => {
    setUnsavedDialogOpen(false)
    setPendingAction((action) => {
      action?.discard?.()
      return null
    })
  }, [])

  const handleUnsavedStay = useCallback(() => {
    setUnsavedDialogOpen(false)
    setPendingAction((action) => {
      action?.stay?.()
      return null
    })
  }, [])

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasUnsavedChanges) return
        event.preventDefault()
        event.returnValue = ''
      },
      [hasUnsavedChanges],
    ),
    { capture: true },
  )

  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) => {
      if (!hasUnsavedChanges) return false
      if (!nextLocation) return false

      const isSameDestination =
        currentLocation.pathname === nextLocation.pathname &&
        currentLocation.search === nextLocation.search &&
        currentLocation.hash === nextLocation.hash

      return !isSameDestination
    },
    [hasUnsavedChanges],
  )

  const navigationBlocker = useNavigationBlocker(shouldBlockNavigation)

  useEffect(() => {
    if (navigationBlocker.state !== 'blocked') return
    if (!hasUnsavedChanges) {
      navigationBlocker.reset?.()
      return
    }

    if (pendingAction) {
      if (pendingAction.type === 'navigation') {
        return
      }
      navigationBlocker.reset?.()
      return
    }

    setPendingAction({
      type: 'navigation',
      label: formatNavigationDestination(navigationBlocker.location),
      proceed: () => navigationBlocker.proceed?.(),
      discard: () => navigationBlocker.proceed?.(),
      stay: () => navigationBlocker.reset?.(),
    })
    setUnsavedDialogOpen(true)
  }, [
    navigationBlocker,
    hasUnsavedChanges,
    pendingAction,
    formatNavigationDestination,
  ])

  useEffect(() => {
    const previousLocation = prevLocationRef.current
    const previousPath = buildLocationPath(previousLocation)
    const currentPath = buildLocationPath(location)

    if (previousPath === currentPath) {
      prevLocationRef.current = location
      return
    }

    if (!hasUnsavedChanges) {
      prevLocationRef.current = location
      allowedNavigationRef.current = null
      return
    }

    if (
      allowedNavigationRef.current &&
      allowedNavigationRef.current === currentPath
    ) {
      allowedNavigationRef.current = null
      prevLocationRef.current = location
      return
    }

    if (!previousLocation || pendingAction) {
      prevLocationRef.current = previousLocation || location
      return
    }

    const targetPath = currentPath || '/'
    const stayPath = previousPath || '/'

    const navigateToTarget = () => {
      allowedNavigationRef.current = targetPath
      navigate(targetPath)
    }

    const navigateToStay = () => {
      allowedNavigationRef.current = stayPath
      navigate(stayPath)
    }

    setPendingAction({
      type: 'navigation',
      label: formatNavigationDestination(location),
      proceed: navigateToTarget,
      discard: navigateToTarget,
      stay: navigateToStay,
    })
    setUnsavedDialogOpen(true)

    allowedNavigationRef.current = stayPath
    navigate(stayPath, { replace: true })
  }, [
    buildLocationPath,
    formatNavigationDestination,
    hasUnsavedChanges,
    location,
    navigate,
    pendingAction,
  ])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  if (loading) return <p>Loading entity...</p>
  if (error) return <div className="alert error">{error}</div>
  if (!entity || !viewData) return <p>Entity not found</p>

  const pageClassName = `entity-detail-page${isMobile ? ' entity-detail-page--mobile' : ''}`

  return (
    <>
      <div className={pageClassName}>
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
              onExplore={isMobile ? undefined : handleExplore}
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
              onChange={handleTabChange}
            />
          </div>
        </div>

        {/* --- MAIN SHELL --- */}
        <div className="entity-detail-shell">
          <div className="entity-detail-body">
            {/* DOSSIER TAB */}
            <div
              className="entity-tab-panel"
              role="tabpanel"
              hidden={activeTab !== 'dossier'}
            >
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
            </div>

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <NotesTab
                entity={entity}
                worldId={entityWorldId}
                selectedCampaign={selectedCampaign}
                selectedCampaignId={selectedCampaignId}
                isCampaignDm={isCampaignDm}
                isCampaignPlayer={isCampaignPlayer}
                canCreateNote={canCreateNotes}
                notes={notesState.items}
                loading={notesState.loading}
                error={notesState.error}
                onReload={handleNotesReload}
                onCreateNote={handleNoteCreate}
                creating={notesSaving}
                campaignMatchesEntityWorld={campaignMatchesEntityWorld}
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
                sortedRelationships={sortedRelationships}
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

            {/* SECRETS TAB */}
            {activeTab === 'secrets' && showSecretsTab && (
              <SecretsTab
                entity={entity}
                secrets={secrets}
                worldId={worldId}
                canManageSecrets={canManageSecrets}
                onSecretCreated={handleSecretUpsert}
                onSecretUpdated={handleSecretUpsert}
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

      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        destinationLabel={pendingAction?.label || ''}
        saving={unsavedDialogSaving}
        onSaveAndContinue={handleUnsavedSaveAndContinue}
        onContinueWithoutSaving={handleUnsavedContinue}
        onStay={handleUnsavedStay}
      />
    </>
  )
}
