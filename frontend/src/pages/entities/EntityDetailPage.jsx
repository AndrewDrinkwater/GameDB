import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBeforeUnload, useLocation, useNavigate, useParams } from 'react-router-dom'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../components/RecordForm/FieldRenderer.jsx'
import ListCollector from '../../components/ListCollector.jsx'
import TabNav from '../../components/TabNav.jsx'
import DrawerPanel from '../../components/DrawerPanel.jsx'
import EntityHeader from '../../components/entities/EntityHeader.jsx'
import EntityPageLayout from '../../components/entities/EntityPageLayout.jsx'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
import EntityImageCard from '../../components/entities/EntityImageCard.jsx'
import UnsavedChangesDialog from '../../components/UnsavedChangesDialog.jsx'
import { createDefaultRelationshipFilters } from '../../components/entities/entityRelationshipFilterUtils.js'
import {
  getEntity,
  updateEntity,
  fetchEntityNotes,
  createEntityNote,
} from '../../api/entities.js'
import { getEntityRelationships } from '../../api/entityRelationships.js'
import { getEntityTypeFieldOrder, getEntityTypeFieldRules } from '../../api/entityTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import RelationshipBuilder from '../../modules/relationships3/RelationshipBuilder.jsx'
// hooks
import useEntityAccess from '../../hooks/useEntityAccess.js'
import useIsMobile from '../../hooks/useIsMobile.js'
import useNavigationBlocker from '../../hooks/useNavigationBlocker.js'
import useRecordHistory from '../../hooks/useRecordHistory.js'
import { resolveEntityResponse } from '../../utils/entityHelpers.js'
import {
  normaliseFieldRules,
  evaluateFieldRuleActions,
  isFieldHiddenByRules,
} from '../../utils/fieldRuleEngine.js'
import { sortFieldsByOrder } from '../../utils/fieldLayout.js'
import { extractListResponse } from '../../utils/apiUtils.js'
import {
  formatDateTimeValue as formatDateTime,
  buildMetadataDisplayMap,
  buildMetadataInitialMap,
  buildMetadataViewMap,
} from '../../utils/metadataFieldUtils.js'

// tabs
import DossierTab from './tabs/DossierTab.jsx'
import RelationshipsTab from './tabs/RelationshipsTab.jsx'
import AccessTab from './tabs/AccessTab.jsx'
import SystemTab from './tabs/SystemTab.jsx'
import SecretsTab from './tabs/SecretsTab.jsx'
import NotesTab from './tabs/NotesTab.jsx'

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
    dataType: field.dataType,
    visibleByDefault,
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
  const { selectedCampaign, selectedCampaignId, setSelectedCampaignId } = useCampaignContext()
  const isMobile = useIsMobile()

  const [entity, setEntity] = useState(null)
  
  const handleEntityPayloadUpdate = useCallback((nextEntity) => {
    const normalized = resolveEntityResponse(nextEntity)
    if (normalized) {
      // Preserve existing permissions if the update doesn't include them
      // This prevents canEdit from flipping to false after save
      setEntity((prevEntity) => {
        if (!prevEntity) return normalized
        
        // If the new entity doesn't have permissions but the old one did, preserve them
        if (!normalized.permissions && prevEntity.permissions) {
          return {
            ...normalized,
            permissions: prevEntity.permissions,
          }
        }
        
        // If the new entity has permissions, use them (they might be updated)
        if (normalized.permissions) {
          return normalized
        }
        
        // Otherwise, use the normalized entity as-is
        return normalized
      })
    }
  }, [])
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
  const pendingActionRef = useRef(null)
  const [unsavedDialogSaving, setUnsavedDialogSaving] = useState(false)
  const [relationships, setRelationships] = useState([])
  const [relationshipsError, setRelationshipsError] = useState('')
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [fieldOrder, setFieldOrder] = useState([])
  const [fieldRules, setFieldRules] = useState([])
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

  const parsePathToLocation = useCallback((pathString) => {
    if (!pathString || typeof pathString !== 'string') return null
    const hashIndex = pathString.indexOf('#')
    const searchIndex = pathString.indexOf('?')

    let pathnameEnd = pathString.length
    if (hashIndex >= 0) {
      pathnameEnd = hashIndex
    }
    if (searchIndex >= 0 && searchIndex < pathnameEnd) {
      pathnameEnd = searchIndex
    }

    const pathname = pathString.slice(0, pathnameEnd) || ''
    const search =
      searchIndex >= 0
        ? pathString.slice(searchIndex, hashIndex >= 0 ? hashIndex : undefined)
        : ''
    const hash = hashIndex >= 0 ? pathString.slice(hashIndex) : ''

    return { pathname, search, hash }
  }, [])

  const performNavigation = useCallback(
    (target) => {
      if (!target) return

      if (target.externalUrl) {
        if (typeof window !== 'undefined') {
          window.location.assign(target.externalUrl)
        }
        return
      }

      if (target.to !== undefined && target.to !== null) {
        const destination = target.to
        if (typeof destination === 'string') {
          allowedNavigationRef.current = destination
          navigate(destination, { replace: target.replace, state: target.state })
          return
        }

        const pathString = buildLocationPath(destination)
        if (pathString) {
          allowedNavigationRef.current = pathString
        }
        navigate(destination, { replace: target.replace, state: target.state })
      }
    },
    [buildLocationPath, navigate],
  )

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
          // Check if this is a 403 error with campaign context active
          const isForbidden = err.status === 403 || err.status === '403' || err.message === 'Forbidden'
          const hasCampaignContext = Boolean(selectedCampaignId)
          
          const errorMessage = isForbidden && hasCampaignContext
            ? 'CAMPAIGN_CONTEXT_ACCESS_DENIED'
            : err.message || 'Failed to load notes'
          
          setNotesState((previous) => ({
            ...previous,
            loading: false,
            error: errorMessage,
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

  const handleNoteUpdate = useCallback(
    async (updatedNote) => {
      if (!updatedNote?.id) {
        return
      }

      const timestamp =
        updatedNote?.updatedAt ??
        updatedNote?.updated_at ??
        updatedNote?.createdAt ??
        updatedNote?.created_at ??
        new Date().toISOString()
      const normalizedNote =
        updatedNote?.updatedAt && updatedNote?.updated_at
          ? updatedNote
          : {
              ...updatedNote,
              ...(updatedNote?.updatedAt ? {} : { updatedAt: timestamp }),
              ...(updatedNote?.updated_at ? {} : { updated_at: timestamp }),
            }

      setNotesState((previous) => {
        const currentItems = Array.isArray(previous?.items)
          ? previous.items.slice()
          : []
        const noteId = normalizedNote?.id
        if (!noteId) return previous

        const index = currentItems.findIndex((entry) => entry?.id === noteId)
        if (index >= 0) {
          const updated = [...currentItems]
          updated[index] = normalizedNote
          return {
            items: updated,
            loading: false,
            error: '',
          }
        }

        return {
          items: [normalizedNote, ...currentItems],
          loading: false,
          error: '',
        }
      })
    },
    [],
  )

  const handleNoteDelete = useCallback(
    async (noteId) => {
      if (!noteId) {
        return
      }

      setNotesState((previous) => {
        const currentItems = Array.isArray(previous?.items)
          ? previous.items.slice()
          : []
        const filtered = currentItems.filter((entry) => entry?.id !== noteId)

        return {
          items: filtered,
          loading: false,
          error: '',
        }
      })
    },
    [],
  )

  const canEdit = useMemo(() => {
    const result = (() => {
      // First check explicit permissions if they exist
      if (entity?.permissions && typeof entity.permissions.canEdit === 'boolean') {
        return entity.permissions.canEdit
      }
      
      // Fall back to other checks if permissions are not provided
      if (!entity || !user) return false
      if (user.role === 'system_admin') return true
      if (entity.world?.created_by && entity.world.created_by === user.id) return true
      if (entity.created_by && entity.created_by === user.id) return true
      
      // If we had permissions before but they're missing now, preserve the last known value
      // This prevents canEdit from flipping to false when save response doesn't include permissions
      return false
    })()
    
    return result
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

  const renderSchemaSections = useCallback((schema, data, prefix, ruleContext = null) => {
    if (!schema) return null
    const sections = Array.isArray(schema.sections) ? schema.sections : []
    const actionsByField = ruleContext?.actionsByField ?? {}
    const showRuleTargets = ruleContext?.showRuleTargets ?? new Set()
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

                const action = actionsByField[fieldKey]
                const defaultVisible =
                  field.visibleByDefault !== undefined
                    ? Boolean(field.visibleByDefault)
                    : field.visible_by_default !== undefined
                      ? Boolean(field.visible_by_default)
                      : true

                if (
                  isFieldHiddenByRules(
                    fieldKey,
                    action,
                    showRuleTargets,
                    defaultVisible,
                  )
                ) {
                  return null
                }

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
      const data = resolveEntityResponse(response)
      if (!data) {
        setEntity(null)
        setError('Entity not found')
        return
      }
      handleEntityPayloadUpdate(data)
    } catch (err) {
      // Check if this is a 403 error with campaign context active
      const isForbidden = err.status === 403 || err.status === '403' || err.message === 'Forbidden'
      const hasCampaignContext = Boolean(selectedCampaignId)
      
      if (isForbidden && hasCampaignContext) {
        setError('CAMPAIGN_CONTEXT_ACCESS_DENIED')
      } else {
        setError(err.message || 'Failed to load entity')
      }
      setEntity(null)
    } finally {
      setLoading(false)
    }
  }, [id, handleEntityPayloadUpdate, selectedCampaignId])

  const loadEntityFieldLayout = useCallback(async (entityTypeId) => {
    if (!entityTypeId) {
      setFieldOrder([])
      setFieldRules([])
      return
    }

    try {
      const [orderResponse, rulesResponse] = await Promise.all([
        getEntityTypeFieldOrder(entityTypeId).catch(() => null),
        getEntityTypeFieldRules(entityTypeId).catch(() => null),
      ])

      setFieldOrder(extractListResponse(orderResponse))
      setFieldRules(extractListResponse(rulesResponse))
    } catch (err) {
      setFieldOrder([])
      setFieldRules([])
    }
  }, [])

  useEffect(() => {
    if (sessionReady && token) {
      loadEntity()
    }
  }, [sessionReady, token, loadEntity])

  useEffect(() => {
    const entityTypeId =
      entity?.entity_type_id || entity?.entityType?.id || entity?.entity_type?.id || null
    if (!entityTypeId) {
      setFieldOrder([])
      setFieldRules([])
      return
    }
    loadEntityFieldLayout(entityTypeId)
  }, [entity?.entity_type_id, entity?.entityType?.id, entity?.entity_type?.id, loadEntityFieldLayout])

  const metadataFields = useMemo(() => {
    if (!Array.isArray(entity?.fields)) return []
    const sorted = sortFieldsByOrder(entity.fields, fieldOrder)
    return sorted.map((field) => mapFieldToSchemaField(field)).filter(Boolean)
  }, [entity?.fields, fieldOrder])

  const metadataViewValues = useMemo(() => {
    if (!entity?.fields || entity.fields.length === 0) {
      return { __placeholder: 'No metadata defined for this entity type.' }
    }

    return buildMetadataViewMap(entity.fields)
  }, [entity])

  const entityFields = entity?.fields

  const normalisedFieldRules = useMemo(
    () => normaliseFieldRules(fieldRules, entityFields),
    [fieldRules, entityFields],
  )

  const metadataDisplayValues = useMemo(() => {
    if (!entity?.fields || entity.fields.length === 0) {
      return {}
    }

    return buildMetadataDisplayMap(entity.fields)
  }, [entity])

  const metadataInitialValues = useMemo(() => {
    if (!entity?.fields || entity.fields.length === 0) {
      return {}
    }

    return buildMetadataInitialMap(entity.fields)
  }, [entity])

  const historyRecord = useMemo(() => {
    if (!entity?.id) return null
    const typeName =
      entity?.entityType?.name ||
      entity?.entity_type?.name ||
      entity?.entityTypeName ||
      'entity'
    return {
      id: entity.id,
      type: `entity:${typeName}`,
      title: entity.name || 'Untitled entity',
      worldId: entityWorldId,
      worldName: entity?.world?.name || entity?.world_name || '',
    }
  }, [
    entity?.id,
    entity?.name,
    entity?.entityType?.name,
    entity?.entity_type?.name,
    entity?.entityTypeName,
    entityWorldId,
    entity?.world?.name,
    entity?.world_name,
  ])

  useRecordHistory(historyRecord)

  // Track previous entity ID to detect navigation vs updates
  const prevEntityIdRef = useRef(null)
  // Track when we've just saved to reset form state
  const justSavedRef = useRef(false)
  // Track if we're currently saving to prevent exiting edit mode during save
  const isSavingRef = useRef(false)

  useEffect(() => {
    const currentId = entity?.id
    const prevId = prevEntityIdRef.current
    
    // Only exit edit mode if entity ID actually changed (navigation to different entity)
    // This prevents exiting edit mode when the same entity is updated after save
    // Also don't exit if we're currently saving (to prevent race conditions)
    if (currentId !== prevId && prevId !== null && !isSavingRef.current) {
      setIsEditing(false)
      justSavedRef.current = false
    }
    
    prevEntityIdRef.current = currentId
  }, [entity?.id, isEditing])

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

  const viewRuleContext = useMemo(
    () => evaluateFieldRuleActions(normalisedFieldRules, viewData || {}),
    [normalisedFieldRules, viewData],
  )

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

  // Reset form baseline after successful save when entity updates
  // This ensures hasUnsavedChanges becomes false by resetting the form's baseline state
  useEffect(() => {
    if (!isEditing || !entity || !editInitialData) return
    if (!formRef.current?.reset) return
    if (!justSavedRef.current) return

    // Reset form baseline to match the saved entity data
    // This updates the form's initialSignature to match currentSignature, clearing isDirty
    // Use a small delay to ensure entity state has fully updated and editInitialData is current
    const timeoutId = setTimeout(() => {
      if (formRef.current?.reset && editInitialData) {
        // Reset the form with the updated entity data
        // This sets the baseline state to match the current editor state
        formRef.current.reset(editInitialData)
      }
      justSavedRef.current = false
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [isEditing, entity, editInitialData])

  const entityImageDataUrl = useMemo(() => {
    if (!entity) return ''
    const mimeType = entity.imageMimeType || entity.image_mime_type || ''
    const data = entity.imageData || entity.image_data || ''
    if (!mimeType || !data) return ''
    return `data:${mimeType};base64,${data}`
  }, [entity])

  const entityImageSection = useMemo(() => {
    if (!entity || !canEdit) return null
    return (
      <EntityImageCard
        entity={entity}
        canEdit={canEdit}
        isEditing={isEditing}
        onEntityUpdate={handleEntityPayloadUpdate}
        variant={isEditing ? 'compact' : 'card'}
      />
    )
  }, [entity, canEdit, isEditing, handleEntityPayloadUpdate])

  const metadataSectionTitle = 'Information'

  const editSchema = useMemo(() => {
    const hasMetadataFields = metadataFields.length > 0

    const sections = [
      {
        title: 'Edit Entity',
        columns: 2,
        fields: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'entityTypeName', label: 'Type', type: 'readonly' },
          {
            key: 'description',
            label: 'Description',
            type: 'textarea',
            rows: 4,
            span: 2, // Make description span both columns
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
    if (!canEdit) {
      return false
    }

    isSavingRef.current = true
    let success = true
    let accessSaved = false

    try {
      // Save form changes if dirty
      if (formState.isDirty && formRef.current?.submit) {
        const result = await formRef.current.submit()
        if (result === false) {
          success = false
        }
        // Form save updates entity via handleUpdate, which sets justSavedRef.current = true
        // The form reset effect will then reset the baseline state
      }

      // Save access changes if dirty
      if (success && isAccessDirty) {
        const accessResult = await handleAccessSave()
        if (!accessResult) {
          success = false
        } else {
          accessSaved = true
        }
      }

      // After access save, reload entity to sync accessDefaults and clear isAccessDirty
      // This ensures the baseline state for access settings matches the saved state
      if (success && accessSaved && entity?.id) {
        try {
          const response = await getEntity(entity.id)
          const data = resolveEntityResponse(response)
          if (data) {
            handleEntityPayloadUpdate(data)
            // The entity reload will update accessDefaults in useEntityAccess hook
            // which will cause isAccessDirty to become false
          }
        } catch (err) {
          // Don't fail the save operation if reload fails
        }
      }

      // After successful save, the baseline state should be reset:
      // - Form baseline: reset via formRef.current.reset() in the useEffect (triggered by justSavedRef)
      // - Access baseline: updated via entity reload which updates accessDefaults
      // - hasUnsavedChanges will become false once both formState.isDirty and isAccessDirty are false

      return success
    } finally {
      // Use a small delay to ensure entity state has updated before clearing the flag
      setTimeout(() => {
        isSavingRef.current = false
      }, 200)
    }
  }, [canEdit, formState.isDirty, isAccessDirty, handleAccessSave, entity?.id, handleEntityPayloadUpdate, isEditing])

  const proceedPendingAction = useCallback(() => {
    const action = pendingActionRef.current
    setPendingAction(null)
    action?.proceed?.()
  }, [])

  const handleUnsavedSaveAndContinue = useCallback(async () => {
    setUnsavedDialogSaving(true)
    try {
      const saved = await handleSaveAll()
      if (saved) {
        setUnsavedDialogOpen(false)
        // Only proceed with the pending action if it's not an exit-edit action
        // For exit-edit actions, the proceed function already handles saving and exiting
        const action = pendingActionRef.current
        if (action?.type !== 'exit-edit') {
          proceedPendingAction()
        } else {
          // For exit-edit, the proceed function already saved, so just exit
          setPendingAction(null)
          action?.proceed?.()
        }
      }
    } finally {
      setUnsavedDialogSaving(false)
    }
  }, [handleSaveAll, proceedPendingAction])

  const resetPendingChanges = useCallback(() => {
    formRef.current?.reset?.(editInitialData || {})
    resetAccessSettings()
  }, [editInitialData, resetAccessSettings])

  // Compute hasUnsavedChanges by comparing current editor state to baseline state
  // This will automatically become false when:
  // - formState.isDirty becomes false (after form baseline reset via formRef.current.reset())
  // - isAccessDirty becomes false (after access baseline reset via entity reload updating accessDefaults)
  // Using useMemo ensures it recalculates when any dependency changes
  const hasUnsavedChanges = useMemo(() => {
    return isEditing && (formState.isDirty || isAccessDirty)
  }, [isEditing, formState.isDirty, isAccessDirty])

  // exitEditMode moved here after hasUnsavedChanges is defined
  const exitEditMode = useCallback(() => {
    setIsEditing(false)
    setActiveTab('dossier')
  }, [setActiveTab, entity?.id, canEdit, hasUnsavedChanges])

  const requestNavigation = useCallback(
    (target) => {
      if (!target) return

      const resolveLabel = () => {
        if (target.label) return target.label
        if (target.externalUrl) {
          return target.externalLabel || target.externalUrl
        }

        if (typeof target.to === 'string') {
          const locationShape = target.location || parsePathToLocation(target.to)
          return formatNavigationDestination(locationShape)
        }

        return formatNavigationDestination(target.location || target.to)
      }

      if (!hasUnsavedChanges) {
        performNavigation(target)
        return
      }

      setPendingAction({
        type: 'navigation',
        label: resolveLabel(),
        proceed: () => performNavigation(target),
        discard: () => performNavigation(target),
        stay: () => {},
      })
      setUnsavedDialogOpen(true)
    },
    [
      formatNavigationDestination,
      hasUnsavedChanges,
      parsePathToLocation,
      performNavigation,
      setPendingAction,
      setUnsavedDialogOpen,
    ],
  )

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (!hasUnsavedChanges) return undefined

    const handleAnchorClick = (event) => {
      if (!hasUnsavedChanges) return
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      const element =
        target instanceof Element
          ? target
          : target && 'parentElement' in target
            ? target.parentElement
            : null
      if (!element || typeof element.closest !== 'function') return

      const anchor = element.closest('a[href]')
      if (!anchor) return
      if (anchor.hasAttribute('data-ignore-unsaved-warning')) return

      const href = anchor.getAttribute('href')
      if (!href) return
      if (href.startsWith('#')) return
      if (href.startsWith('javascript:')) return

      const targetAttr = anchor.getAttribute('target')
      if (targetAttr && targetAttr.toLowerCase() !== '_self') {
        return
      }

      let parsedUrl
      try {
        parsedUrl = new URL(href, window.location.href)
      } catch {
        return
      }

      const labelText =
        anchor.getAttribute('data-navigation-label') ||
        anchor.getAttribute('aria-label') ||
        anchor.title ||
        anchor.textContent?.trim() ||
        ''

      const isExternal = parsedUrl.origin !== window.location.origin

      event.preventDefault()
      event.stopPropagation()

      if (isExternal) {
        requestNavigation({
          externalUrl: parsedUrl.href,
          label: labelText || parsedUrl.href,
        })
        return
      }

      const destinationPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (!destinationPath || destinationPath === currentPath) {
        return
      }

      requestNavigation({
        to: destinationPath,
        location: parsePathToLocation(destinationPath),
        label:
          labelText || formatNavigationDestination({
            pathname: parsedUrl.pathname,
            search: parsedUrl.search,
          }),
      })
    }

    document.addEventListener('click', handleAnchorClick, true)

    return () => {
      document.removeEventListener('click', handleAnchorClick, true)
    }
  }, [
    formatNavigationDestination,
    hasUnsavedChanges,
    parsePathToLocation,
    requestNavigation,
  ])

  const handleExplore = useCallback(() => {
    const destination = `/entities/${id}/relationship-viewer`
    requestNavigation({
      to: destination,
      location: parsePathToLocation(destination),
    })
  }, [id, parsePathToLocation, requestNavigation])

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
        proceed: async () => {
          // Save changes before exiting edit mode
          const saved = await handleSaveAll()
          if (saved) {
            exitEditMode()
          }
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
  }, [canEdit, exitEditMode, hasUnsavedChanges, isEditing, resetPendingChanges, handleSaveAll])

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
        const updated = resolveEntityResponse(response)
        if (!updated) {
          throw new Error('Failed to update entity')
        }

        // Update entity state first
        handleEntityPayloadUpdate(updated)
        
        // Mark that we've just saved so the form can be reset after entity updates
        // This ensures the baseline state is reset to match the saved data
        justSavedRef.current = true
        
        return { message: 'Entity updated successfully.' }
      } catch (err) {
        setFormError(err.message || 'Failed to update entity')
        justSavedRef.current = false
        return false
      }
    },
    [entity?.id, entity?.visibility, handleEntityPayloadUpdate, isEditing],
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
  }, [entity?.id, isEditing])

  const handleTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTab) return
      setActiveTab(nextTab)
    },
    [activeTab, setActiveTab],
  )

  const handleUnsavedContinue = useCallback(() => {
    setUnsavedDialogOpen(false)
    const action = pendingActionRef.current
    setPendingAction(null)
    action?.discard?.()
  }, [])

  const handleUnsavedStay = useCallback(() => {
    setUnsavedDialogOpen(false)
    const action = pendingActionRef.current
    setPendingAction(null)
    action?.stay?.()
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
    pendingActionRef.current = pendingAction
  }, [pendingAction])

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
  
  // Render campaign context access error with helpful message
  if (error === 'CAMPAIGN_CONTEXT_ACCESS_DENIED') {
    return (
      <div className="alert error" style={{ padding: '1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Access Restricted by Campaign Context</h2>
        <p style={{ marginBottom: '1rem' }}>
          You don't have access to this entity with your current campaign context selected. 
          This entity may belong to a different campaign or world, or your current campaign 
          context doesn't have permission to view it.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          To view this entity, please change your campaign context using the selector in the 
          header to a campaign that has access to this entity.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/entities')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Go to Entities
          </button>
        </div>
      </div>
    )
  }
  
  if (error) return <div className="alert error">{error}</div>
  if (!entity || !viewData) return <p>Entity not found</p>

  const pageClassName = `entity-detail-page${isMobile ? ' entity-detail-page--mobile' : ''}`

  return (
    <>
      <EntityPageLayout maxWidth={1280} className={pageClassName}>
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

        <header className="entity-page-header">
          <div className="entity-page-header__inner">
            <EntityHeader
              name={entity.name}
              canEdit={canEdit}
              isEditing={isEditing}
              onToggleEdit={handleEditToggle}
              onSave={handleSaveAll}
              isSaving={formState.isSubmitting || accessSaving}
              isSaveDisabled={!formState.isDirty && !isAccessDirty}
            />
            <div className="entity-page-header__tabs">
              <TabNav
                tabs={tabItems}
                activeTab={activeTab}
                onChange={handleTabChange}
              />
            </div>
          </div>
        </header>

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
                featuredImageSrc={entityImageDataUrl}
                renderSchemaSections={renderSchemaSections}
                imageSection={entityImageSection}
                fieldRules={normalisedFieldRules}
                viewRuleContext={viewRuleContext}
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
                onNoteUpdate={handleNoteUpdate}
                onNoteDelete={handleNoteDelete}
                creating={notesSaving}
                campaignMatchesEntityWorld={campaignMatchesEntityWorld}
              />
            )}

            {/* RELATIONSHIPS TAB */}
            {activeTab === 'relationships' && (
              <RelationshipsTab
                entity={entity}
                toast={toast}
                onExplore={handleExplore}
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
      </EntityPageLayout>

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
