import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ShieldPlus } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { getWorldEntities } from '../../api/entities.js'
import { fetchWorlds } from '../../api/worlds.js'
import { fetchCampaigns } from '../../api/campaigns.js'
import { fetchCharacters } from '../../api/characters.js'
import { fetchUsers } from '../../api/users.js'
import {
  applyBulkAccessUpdate,
  fetchCollections,
  resolveCollectionEntities,
} from '../../api/access.js'
import './BulkAccessToolPage.css'

const MAX_ENTITIES = 1000

const ENTITY_SEARCH_SCOPE = {
  NAME: 'name',
  NAME_DESCRIPTION: 'nameDescription',
  ALL_DATA: 'allData',
  ALL_DATA_RELATIONSHIPS: 'allDataRelationships',
}

const ENTITY_SEARCH_SCOPE_OPTIONS = [
  {
    value: ENTITY_SEARCH_SCOPE.NAME,
    label: 'Name only',
    description: 'Matches entity names only.',
  },
  {
    value: ENTITY_SEARCH_SCOPE.NAME_DESCRIPTION,
    label: 'Name & description',
    description: 'Matches entity names and their descriptions.',
  },
  {
    value: ENTITY_SEARCH_SCOPE.ALL_DATA,
    label: 'All data',
    description: 'Matches names, descriptions, and visible data fields.',
  },
  {
    value: ENTITY_SEARCH_SCOPE.ALL_DATA_RELATIONSHIPS,
    label: 'All data & relationships',
    description: 'Matches every field plus reference values, ideal for relationship lookups.',
  },
]

const ENTITY_SEARCH_PLACEHOLDERS = {
  [ENTITY_SEARCH_SCOPE.NAME]: 'Filter entities by name',
  [ENTITY_SEARCH_SCOPE.NAME_DESCRIPTION]: 'Search names or descriptions',
  [ENTITY_SEARCH_SCOPE.ALL_DATA]: 'Search names, descriptions, and data fields',
  [ENTITY_SEARCH_SCOPE.ALL_DATA_RELATIONSHIPS]: 'Search across data and related entities',
}

const addTermToCollection = (collection, value) => {
  if (value === null || value === undefined) return
  if (typeof value === 'number' && !Number.isFinite(value)) return
  const resolvedValue = value instanceof Date ? value.toISOString() : String(value)
  const trimmed = resolvedValue.trim().toLowerCase()
  if (!trimmed) return
  collection.add(trimmed)
}

const collectMetadataStrings = (value, includeObjects, collection) => {
  if (value === null || value === undefined) return

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    addTermToCollection(collection, value)
    return
  }

  if (value instanceof Date) {
    addTermToCollection(collection, value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectMetadataStrings(entry, includeObjects, collection))
    return
  }

  if (includeObjects && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectMetadataStrings(entry, includeObjects, collection))
  }
}

const buildEntitySearchTerms = (entity, scope) => {
  if (!entity) return []
  const resolvedScope =
    scope && ENTITY_SEARCH_SCOPE_OPTIONS.some((option) => option.value === scope)
      ? scope
      : ENTITY_SEARCH_SCOPE.NAME
  const terms = new Set()

  addTermToCollection(terms, entity.name)

  if (resolvedScope !== ENTITY_SEARCH_SCOPE.NAME) {
    addTermToCollection(terms, entity.description)
  }

  if (resolvedScope === ENTITY_SEARCH_SCOPE.ALL_DATA || resolvedScope === ENTITY_SEARCH_SCOPE.ALL_DATA_RELATIONSHIPS) {
    addTermToCollection(terms, entity.entityType?.name)
    if (entity.metadata && typeof entity.metadata === 'object') {
      collectMetadataStrings(
        entity.metadata,
        resolvedScope === ENTITY_SEARCH_SCOPE.ALL_DATA_RELATIONSHIPS,
        terms,
      )
    }
  }

  return Array.from(terms)
}

const parseDateFilterValue = (value, boundary = 'start') => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (boundary === 'end') {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return date.getTime()
}

const TokenSelector = ({
  label,
  count,
  options = [],
  selectedValues = [],
  onToggle,
  disabled,
}) => {
  const handleToggle = (optionId) => {
    if (disabled) return
    onToggle(String(optionId))
  }

  return (
    <div className="token-selector">
      <div className="token-selector__label-row">
        <span>{label}</span>
        <span className="token-selector__count">({count})</span>
      </div>
      <div className="token-selector__chips" role="listbox" aria-multiselectable>
        {options.length === 0 ? (
          <p className="token-selector__empty">No options available.</p>
        ) : (
          options.map((option) => {
            const value = String(option.id)
            const isSelected = selectedValues.includes(value)
            return (
              <button
                type="button"
                key={value}
                className={`token-selector__chip ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggle(value)}
                aria-pressed={isSelected}
                disabled={disabled}
              >
                {option.label}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

const normaliseListResponse = (response) => {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

const toSelectOptions = (records, labelKey = 'name') =>
  records.map((record) => ({
    id: String(record.id ?? record.value ?? record),
    label: record[labelKey] || record.name || record.email || record.id,
  }))

const formatCountList = (items) => {
  const filtered = items
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} ${item.label}${item.count === 1 ? '' : 's'}`)
  if (filtered.length === 0) return ''
  if (filtered.length === 1) return filtered[0]
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`
  return `${filtered.slice(0, -1).join(', ')}, and ${filtered[filtered.length - 1]}`
}

export default function BulkAccessToolPage() {
  const { worldId, campaignId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    selectedCampaign,
    selectedCampaignId,
    setSelectedCampaignId,
    loading: campaignContextLoading,
  } = useCampaignContext()
  const [world, setWorld] = useState(null)
  const [worldError, setWorldError] = useState('')
  const [loadingWorld, setLoadingWorld] = useState(true)
  const [entities, setEntities] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [characters, setCharacters] = useState([])
  const [users, setUsers] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [entitySearchScope, setEntitySearchScope] = useState(ENTITY_SEARCH_SCOPE.NAME)
  const [createdAfter, setCreatedAfter] = useState('')
  const [createdBefore, setCreatedBefore] = useState('')
  const [selectedEntityIds, setSelectedEntityIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState(null)
  const [formValues, setFormValues] = useState({
    readCampaignIds: [],
    readUserIds: [],
    readCharacterIds: [],
    writeCampaignIds: [],
    writeUserIds: [],
    description: '',
  })
  const [readMode, setReadMode] = useState('unchanged')
  const [writeMode, setWriteMode] = useState('unchanged')
  const [entityPanelCollapsed, setEntityPanelCollapsed] = useState(false)
  const [selectionMode, setSelectionMode] = useState('manual')
  const [collections, setCollections] = useState([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsError, setCollectionsError] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [collectionPreview, setCollectionPreview] = useState(null)
  const [resolvingCollection, setResolvingCollection] = useState(false)

  const isCampaignScoped = Boolean(campaignId)
  const normalisedCampaignId = campaignId ? String(campaignId) : ''
  const selectedCampaignMatchesRoute = useMemo(() => {
    if (!isCampaignScoped || !normalisedCampaignId) return false
    if (!selectedCampaignId) return false
    return String(selectedCampaignId) === normalisedCampaignId
  }, [isCampaignScoped, normalisedCampaignId, selectedCampaignId])
  const activeCampaign = isCampaignScoped && selectedCampaignMatchesRoute ? selectedCampaign : null
  const resolvedWorldId = worldId || activeCampaign?.world?.id || ''

  useEffect(() => {
    if (!isCampaignScoped || !normalisedCampaignId) return
    if (String(selectedCampaignId || '') === normalisedCampaignId) return
    setSelectedCampaignId(normalisedCampaignId)
  }, [isCampaignScoped, normalisedCampaignId, selectedCampaignId, setSelectedCampaignId])

  const isOwner = useMemo(() => {
    if (isCampaignScoped) return false
    if (!world || !user) return false
    return String(world.created_by) === String(user.id)
  }, [isCampaignScoped, world, user])

  const isCampaignDM = useMemo(() => {
    if (!isCampaignScoped || !activeCampaign || !user?.id) return false
    if (!Array.isArray(activeCampaign.members)) return false
    return activeCampaign.members.some(
      (member) => member?.user_id === user.id && member?.role === 'dm',
    )
  }, [activeCampaign, isCampaignScoped, user])

  const canUseCampaignTool = Boolean(isCampaignScoped && activeCampaign && isCampaignDM)
  const canUseTool = isOwner || canUseCampaignTool

  useEffect(() => {
    if (!resolvedWorldId || !canUseTool) {
      setCollections([])
      setCollectionsError('')
      setSelectedCollectionId('')
      setCollectionPreview(null)
      return
    }

    let cancelled = false
    const loadCollectionsList = async () => {
      setCollectionsLoading(true)
      setCollectionsError('')

      try {
        const response = await fetchCollections(resolvedWorldId)
        const list = normaliseListResponse(response)
        if (!cancelled) {
          setCollections(list)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load collections', err)
          setCollections([])
          setCollectionsError(err.message || 'Failed to load collections')
        }
      } finally {
        if (!cancelled) {
          setCollectionsLoading(false)
        }
      }
    }

    loadCollectionsList()
    return () => {
      cancelled = true
    }
  }, [resolvedWorldId, canUseTool])

  useEffect(() => {
    if (isCampaignScoped) {
      if (!normalisedCampaignId) {
        setWorldError('Campaign id is required to use this tool.')
        setLoadingWorld(false)
        return
      }

      if (!activeCampaign) {
        if (campaignContextLoading) {
          setLoadingWorld(true)
          return
        }
        setWorldError('Campaign not found or unavailable for your account.')
        setLoadingWorld(false)
        return
      }

      setWorld(activeCampaign.world || null)
      setWorldError('')
      setLoadingWorld(false)
      return
    }

    if (!worldId) {
      setWorldError('A world id is required to use the bulk access tool.')
      setLoadingWorld(false)
      return
    }

    const loadWorld = async () => {
      setLoadingWorld(true)
      setWorldError('')
      try {
        const response = await fetchWorlds()
        const worlds = normaliseListResponse(response)
        const found = worlds.find((entry) => String(entry.id) === String(worldId))
        if (!found) {
          setWorldError('World not found or unavailable.')
          setWorld(null)
          return
        }
        setWorld(found)
      } catch (error) {
        console.error('Failed to load worlds', error)
        setWorldError(error.message || 'Failed to load world data')
        setWorld(null)
      } finally {
        setLoadingWorld(false)
      }
    }

    loadWorld()
  }, [activeCampaign, campaignContextLoading, isCampaignScoped, normalisedCampaignId, worldId])

  const loadWorldData = useCallback(async () => {
    if (!resolvedWorldId || !canUseTool) return
    setLoadingData(true)
    setDataError('')
    try {
      if (isCampaignScoped && activeCampaign) {
        const [entityRes, campaignCharacters] = await Promise.all([
          getWorldEntities(resolvedWorldId),
          fetchCharacters({ campaign_id: activeCampaign.id }),
        ])

        setEntities(normaliseListResponse(entityRes))
        setCampaigns([activeCampaign])
        setCharacters(normaliseListResponse(campaignCharacters))

        const memberOptions = Array.isArray(activeCampaign.members)
          ? activeCampaign.members.map((member) => ({
              id: String(member.user_id),
              username: member.user?.username || member.user?.email || member.user_id,
            }))
          : []
        setUsers(memberOptions)
      } else {
        const [entityRes, campaignRes, characterRes, userRes] = await Promise.all([
          getWorldEntities(resolvedWorldId),
          fetchCampaigns({ world_id: resolvedWorldId }),
          fetchCharacters({ world_id: resolvedWorldId }),
          fetchUsers(),
        ])

        setEntities(normaliseListResponse(entityRes))
        setCampaigns(normaliseListResponse(campaignRes))
        setCharacters(normaliseListResponse(characterRes))
        setUsers(normaliseListResponse(userRes))
      }
    } catch (error) {
      console.error('Failed to load bulk access data', error)
      setDataError(error.message || 'Unable to load world data')
    } finally {
      setLoadingData(false)
    }
  }, [activeCampaign, canUseTool, isCampaignScoped, resolvedWorldId])

  useEffect(() => {
    loadWorldData()
  }, [loadWorldData])

  const campaignCharacterIdSet = useMemo(() => {
    if (!isCampaignScoped) return new Set()
    return new Set((characters || []).map((character) => String(character.id)))
  }, [characters, isCampaignScoped])

  const accessibleEntities = useMemo(() => {
    if (!isCampaignScoped) return entities
    if (!activeCampaign) return []
    const campaignIdString = String(activeCampaign.id)
    return entities.filter((entity) => {
      const readAccess = entity.read_access ?? 'global'
      if (readAccess === 'global') return true
      const readCampaignIds = Array.isArray(entity.read_campaign_ids)
        ? entity.read_campaign_ids.map((id) => String(id))
        : []
      if (readCampaignIds.includes(campaignIdString)) return true
      const readCharacterIds = Array.isArray(entity.read_character_ids)
        ? entity.read_character_ids.map((id) => String(id))
        : []
      return readCharacterIds.some((id) => campaignCharacterIdSet.has(id))
    })
  }, [activeCampaign, campaignCharacterIdSet, entities, isCampaignScoped])

  useEffect(() => {
    const allowedIds = new Set(accessibleEntities.map((entity) => entity.id))
    setSelectedEntityIds((prev) => {
      const next = prev.filter((id) => allowedIds.has(id))
      if (next.length === prev.length) return prev
      return next
    })
  }, [accessibleEntities])

  const filteredEntities = useMemo(() => {
    const trimmedQuery = entityFilter.trim().toLowerCase()
    const afterTimestamp = parseDateFilterValue(createdAfter, 'start')
    const beforeTimestamp = parseDateFilterValue(createdBefore, 'end')

    return accessibleEntities.filter((entity) => {
      const createdAtValue = entity.createdAt ?? entity.created_at ?? null
      if (afterTimestamp !== null || beforeTimestamp !== null) {
        if (!createdAtValue) {
          return false
        }
        const createdTime = new Date(createdAtValue).getTime()
        if (Number.isNaN(createdTime)) {
          return false
        }
        if (afterTimestamp !== null && createdTime < afterTimestamp) {
          return false
        }
        if (beforeTimestamp !== null && createdTime > beforeTimestamp) {
          return false
        }
      }

      if (!trimmedQuery) {
        return true
      }

      const terms = buildEntitySearchTerms(entity, entitySearchScope)
      if (!terms.length) return false
      return terms.some((term) => term.includes(trimmedQuery))
    })
  }, [accessibleEntities, entityFilter, entitySearchScope, createdAfter, createdBefore])

  const selectedSearchScope = useMemo(
    () => ENTITY_SEARCH_SCOPE_OPTIONS.find((option) => option.value === entitySearchScope),
    [entitySearchScope],
  )

  const entityFilterPlaceholder =
    ENTITY_SEARCH_PLACEHOLDERS[entitySearchScope] || ENTITY_SEARCH_PLACEHOLDERS[ENTITY_SEARCH_SCOPE.NAME]

  const handleSearchScopeChange = (event) => {
    const value = event.target.value
    const isValidScope = ENTITY_SEARCH_SCOPE_OPTIONS.some((option) => option.value === value)
    setEntitySearchScope(isValidScope ? value : ENTITY_SEARCH_SCOPE.NAME)
  }

  const clearCreatedDateFilters = () => {
    setCreatedAfter('')
    setCreatedBefore('')
  }

  useEffect(() => {
    if (!isCampaignScoped || !activeCampaign) return
    const allowedCampaignId = String(activeCampaign.id)
    const allowedCampaigns = new Set([allowedCampaignId])
    const allowedUsers = new Set((users || []).map((userOption) => String(userOption.id)))
    const allowedCharacters = new Set((characters || []).map((character) => String(character.id)))

    setFormValues((prev) => {
      const filterList = (list, allowed) => list.filter((id) => allowed.has(String(id)))
      const readCampaignIds = filterList(prev.readCampaignIds, allowedCampaigns)
      const writeCampaignIds = filterList(prev.writeCampaignIds, allowedCampaigns)
      const readUserIds = filterList(prev.readUserIds, allowedUsers)
      const writeUserIds = filterList(prev.writeUserIds, allowedUsers)
      const readCharacterIds = filterList(prev.readCharacterIds, allowedCharacters)

      if (
        readCampaignIds.length === prev.readCampaignIds.length &&
        writeCampaignIds.length === prev.writeCampaignIds.length &&
        readUserIds.length === prev.readUserIds.length &&
        writeUserIds.length === prev.writeUserIds.length &&
        readCharacterIds.length === prev.readCharacterIds.length
      ) {
        return prev
      }

      return {
        ...prev,
        readCampaignIds,
        writeCampaignIds,
        readUserIds,
        writeUserIds,
        readCharacterIds,
      }
    })
  }, [activeCampaign, characters, isCampaignScoped, users])

  const selectedCount = selectedEntityIds.length
  const selectionFull = selectedCount >= MAX_ENTITIES
  const canCollapseEntities = selectedCount > 0

  useEffect(() => {
    if (selectedCount === 0) {
      setEntityPanelCollapsed(false)
    }
  }, [selectedCount])

  const handleEntityToggle = (entityId) => {
    setFormError('')
    setSelectedEntityIds((prev) => {
      if (prev.includes(entityId)) {
        return prev.filter((id) => id !== entityId)
      }
      if (prev.length >= MAX_ENTITIES) {
        setFormError(`You can only select ${MAX_ENTITIES} entities at a time.`)
        return prev
      }
      return [...prev, entityId]
    })
  }

  const handleSelectAllFiltered = () => {
    setFormError('')
    setSelectedEntityIds((prev) => {
      const next = new Set(prev)
      for (const entity of filteredEntities) {
        if (next.size >= MAX_ENTITIES) break
        next.add(entity.id)
      }
      if (next.size > MAX_ENTITIES) {
        setFormError(`Selection capped at ${MAX_ENTITIES} entities.`)
      }
      return Array.from(next)
    })
  }

  const handleClearSelection = () => {
    setSelectedEntityIds([])
    setFormError('')
    if (selectionMode === 'collection') {
      setSelectedCollectionId('')
      setCollectionPreview(null)
    }
  }

  const handleSelectionModeChange = (event) => {
    const nextMode = event.target.value
    setSelectionMode(nextMode)
    setFormError('')
    if (nextMode === 'manual') {
      setSelectedCollectionId('')
      setCollectionPreview(null)
    } else {
      setSelectedEntityIds([])
    }
  }

  const handleCollectionSelect = async (event) => {
    const collectionId = event.target.value
    setSelectedCollectionId(collectionId)
    setCollectionPreview(null)
    setFormError('')

    if (!collectionId) {
      setSelectedEntityIds([])
      return
    }

    setResolvingCollection(true)
    try {
      const response = await resolveCollectionEntities(collectionId)
      const data = response?.data || response
      const ids = Array.isArray(data?.entityIds) ? data.entityIds : []
      setSelectedEntityIds(ids)
      setCollectionPreview({
        entityIds: ids,
        entityCount: data?.entityCount ?? ids.length,
        totalCount: data?.totalCount ?? ids.length,
        truncated: Boolean(data?.truncated),
      })
      if (data?.truncated) {
        setFormError(`Only the first ${MAX_ENTITIES} entities were loaded from this collection.`)
      }
    } catch (err) {
      console.error('Failed to resolve collection entities', err)
      setFormError(err.message || 'Failed to load collection entities')
      setSelectedEntityIds([])
      setCollectionPreview(null)
    } finally {
      setResolvingCollection(false)
    }
  }

  const handleDescriptionChange = (event) => {
    const { value } = event.target
    setFormValues((prev) => ({ ...prev, description: value }))
  }

  const handleAccessModeChange = (section) => (event) => {
    const nextValue = event.target.value
    if (section === 'read') {
      setReadMode(nextValue)
      if (nextValue === 'unchanged') {
        setFormValues((prev) => ({
          ...prev,
          readCampaignIds: [],
          readUserIds: [],
          readCharacterIds: [],
        }))
      }
    } else {
      setWriteMode(nextValue)
      if (nextValue === 'unchanged') {
        setFormValues((prev) => ({
          ...prev,
          writeCampaignIds: [],
          writeUserIds: [],
        }))
      }
    }
  }

  const toggleTokenValue = (key) => (optionId) => {
    const value = String(optionId)
    setFormValues((prev) => {
      const current = prev[key] || []
      const exists = current.includes(value)
      const next = exists ? current.filter((id) => id !== value) : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  const readActivated = readMode === 'activated'
  const writeActivated = writeMode === 'activated'

  const hasReadTargets = useMemo(() => {
    if (!readActivated) return false
    const readCount =
      formValues.readCampaignIds.length +
      formValues.readUserIds.length +
      formValues.readCharacterIds.length
    return readCount > 0
  }, [formValues, readActivated])

  const hasWriteTargets = useMemo(() => {
    if (!writeActivated) return false
    const writeCount = formValues.writeCampaignIds.length + formValues.writeUserIds.length
    return writeCount > 0
  }, [formValues, writeActivated])

  const hasActiveSection = readActivated || writeActivated
  const readSummaryText = useMemo(() => {
    if (!readActivated) return ''
    const summary = formatCountList([
      { label: 'campaign', count: formValues.readCampaignIds.length },
      { label: 'user', count: formValues.readUserIds.length },
      { label: 'character', count: formValues.readCharacterIds.length },
    ])
    if (!summary) return ''
    return `You will add read access for ${summary}.`
  }, [formValues, readActivated])

  const writeSummaryText = useMemo(() => {
    if (!writeActivated) return ''
    const summary = formatCountList([
      { label: 'campaign', count: formValues.writeCampaignIds.length },
      { label: 'user', count: formValues.writeUserIds.length },
    ])
    if (!summary) return ''
    return `You will add write access for ${summary}.`
  }, [formValues, writeActivated])
  const canSubmit = canUseTool && selectedEntityIds.length > 0 && hasActiveSection && !submitting

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canUseTool) {
      setFormError('You do not have permission to apply bulk access updates.')
      return
    }
    if (!selectedEntityIds.length) {
      setFormError('Select at least one entity to continue.')
      return
    }
    if (!hasActiveSection) {
      setFormError('Select at least one access type to update.')
      return
    }
    if (readActivated && !hasReadTargets) {
      setFormError('Add at least one read campaign, character, or user.')
      return
    }
    if (writeActivated && !hasWriteTargets) {
      setFormError('Add at least one campaign or user to grant write access.')
      return
    }

    const payload = {
      entityIds: selectedEntityIds,
      readAccess: readActivated ? 'selective' : 'unchanged',
      writeAccess: writeActivated ? 'selective' : 'unchanged',
      readCampaignIds: readActivated ? formValues.readCampaignIds : [],
      readUserIds: readActivated ? formValues.readUserIds : [],
      readCharacterIds: readActivated ? formValues.readCharacterIds : [],
      writeCampaignIds: writeActivated ? formValues.writeCampaignIds : [],
      writeUserIds: writeActivated ? formValues.writeUserIds : [],
      description: formValues.description,
    }

    setSubmitting(true)
    setFormError('')
    setResult(null)

    try {
      const response = await applyBulkAccessUpdate(payload, {
        includeCampaignContext: Boolean(isCampaignScoped && activeCampaign),
      })
      const data = response?.data || response
      setResult({ runId: data.runId, count: data.count })
    } catch (error) {
      console.error('Failed to apply bulk access', error)
      setFormError(error.message || 'Unable to apply bulk access update')
    } finally {
      setSubmitting(false)
    }
  }

  const campaignOptions = useMemo(() => {
    if (isCampaignScoped && activeCampaign) {
      return [{ id: String(activeCampaign.id), label: activeCampaign.name }]
    }
    return toSelectOptions(campaigns)
  }, [activeCampaign, campaigns, isCampaignScoped])
  const userOptions = useMemo(() => toSelectOptions(users, 'username'), [users])
  const characterOptions = useMemo(() => toSelectOptions(characters), [characters])
  const entityLookup = useMemo(() => {
    const map = new Map()
    entities.forEach((entity) => {
      map.set(entity.id, entity)
    })
    return map
  }, [entities])
  const collectionPreviewNames = useMemo(() => {
    if (!collectionPreview || !Array.isArray(collectionPreview.entityIds)) return []
    return collectionPreview.entityIds.slice(0, 10).map((id) => entityLookup.get(id)?.name || id)
  }, [collectionPreview, entityLookup])

  if (loadingWorld) {
    return (
      <div className="bulk-access-page">
        <p className="bulk-access-helper">
          <Loader2 className="spin" size={16} /> Loading world context…
        </p>
      </div>
    )
  }

  if (worldError) {
    return (
      <div className="bulk-access-page">
        <div className="bulk-access-alert error">
          <AlertTriangle size={16} /> {worldError}
        </div>
        <button type="button" className="link-button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    )
  }

  if (!canUseTool) {
    const message = isCampaignScoped
      ? 'Only a DM for this campaign can access this tool.'
      : 'Only the world owner can access this tool.'
    return (
      <div className="bulk-access-page">
        <div className="bulk-access-alert warning">
          <AlertTriangle size={16} /> {message}
        </div>
      </div>
    )
  }

  const headerEyebrow = isCampaignScoped ? 'Campaign Admin · Access' : 'World Admin · Manual Access'
  const headerTitle = isCampaignScoped ? activeCampaign?.name : world?.name

  return (
    <div className="bulk-access-page">
      <div className="bulk-access-header">
        <div>
          <p className="bulk-access-eyebrow">{headerEyebrow}</p>
          <h1>Bulk Access Editor · {headerTitle || '—'}</h1>
        </div>
        {isOwner && (
          <div className="bulk-access-header-actions">
            <Link to={`/worlds/${worldId}/access/audit`} className="ghost-button">
              View audit log
            </Link>
          </div>
        )}
      </div>

      <p className="bulk-access-helper bulk-access-topline">
        This tool adds access to selected entities. It does not remove current access.
      </p>

      {canUseCampaignTool && activeCampaign && (
        <div className="bulk-access-context-banner">
          You are updating access in Campaign: <strong>{activeCampaign.name}</strong>
        </div>
      )}

      {dataError && (
        <div className="bulk-access-alert warning">
          <AlertTriangle size={16} /> {dataError}
        </div>
      )}

      {result && (
        <div className="bulk-access-alert success">
          <CheckCircle2 size={16} /> Applied access updates to {result.count} entities · Run {result.runId}
          {isOwner && (
            <Link to={`/worlds/${worldId}/access/audit`} className="inline-link">
              Review run
            </Link>
          )}
        </div>
      )}

      {formError && (
        <div className="bulk-access-alert error">
          <AlertTriangle size={16} /> {formError}
        </div>
      )}

      <div className="bulk-access-grid">
        <section className="bulk-access-card">
          <header>
            <h2>
              <ShieldPlus size={18} /> Choose entities ({selectedCount}/{MAX_ENTITIES})
            </h2>
            <div className="bulk-access-entity-actions">
              {!entityPanelCollapsed && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleSelectAllFiltered}
                  disabled={selectionFull || selectionMode !== 'manual'}
                >
                  Select filtered
                </button>
              )}
              <button type="button" className="ghost-button" onClick={handleClearSelection}>
                Clear selection
              </button>
              {canCollapseEntities && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setEntityPanelCollapsed((prev) => !prev)}
                >
                  {entityPanelCollapsed ? 'Expand' : 'Collapse'}
                </button>
              )}
            </div>
          </header>
          {entityPanelCollapsed ? (
            <div className="bulk-access-entity-collapsed-summary">
              <p>
                <strong>{selectedCount}</strong> {selectedCount === 1 ? 'entity' : 'entities'} selected.
              </p>
            </div>
          ) : (
            <>
              <div className="bulk-access-selection-mode">
                <label>
                  <input
                    type="radio"
                    value="manual"
                    checked={selectionMode === 'manual'}
                    onChange={handleSelectionModeChange}
                  />
                  Select manually
                </label>
                <label>
                  <input
                    type="radio"
                    value="collection"
                    checked={selectionMode === 'collection'}
                    onChange={handleSelectionModeChange}
                  />
                  Use collection
                </label>
              </div>

              {selectionMode === 'collection' ? (
                <div className="bulk-access-collection-panel">
                  {collectionsLoading && (
                    <p className="bulk-access-helper">
                      <Loader2 className="spin" size={16} /> Loading collections…
                    </p>
                  )}
                  {!collectionsLoading && collectionsError && (
                    <p className="bulk-access-helper warning">{collectionsError}</p>
                  )}
                  {!collectionsLoading && !collectionsError && collections.length === 0 && (
                    <p className="bulk-access-helper">
                      No collections available.
                      {isOwner && !isCampaignScoped && worldId && (
                        <>
                          {' '}
                          <Link to={`/worlds/${worldId}/collections`} className="inline-link">
                            Create one in the collections manager
                          </Link>
                          .
                        </>
                      )}
                    </p>
                  )}
                  {collections.length > 0 && (
                    <select value={selectedCollectionId} onChange={handleCollectionSelect}>
                      <option value="">Select a collection</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name} · {collection.entityCount ?? collection.entity_ids?.length ?? 0} entities
                        </option>
                      ))}
                    </select>
                  )}
                  {resolvingCollection && (
                    <p className="bulk-access-helper">
                      <Loader2 className="spin" size={16} /> Resolving collection…
                    </p>
                  )}
                  {collectionPreview && (
                    <div className="bulk-access-collection-preview">
                      <p>
                        <strong>{collectionPreview.entityCount}</strong> entities selected from this collection.
                      </p>
                      {collectionPreview.truncated && (
                        <p className="bulk-access-helper warning">
                          Only the first {MAX_ENTITIES} entities can be updated at a time.
                        </p>
                      )}
                      {collectionPreviewNames.length > 0 && (
                        <ul>
                          {collectionPreviewNames.map((name, index) => (
                            <li key={`${name}-${index}`}>{name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {selectionMode === 'collection' && isOwner && !isCampaignScoped && worldId && (
                    <Link to={`/worlds/${worldId}/collections`} className="inline-link">
                      Manage collections
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="entity-filter">
                    <div className="entity-filter__row">
                      <div className="entity-filter__input">
                        <label htmlFor="bulk-access-entity-search">Search</label>
                        <input
                          id="bulk-access-entity-search"
                          type="text"
                          placeholder={entityFilterPlaceholder}
                          value={entityFilter}
                          onChange={(event) => setEntityFilter(event.target.value)}
                        />
                      </div>
                      <div className="entity-filter__scope">
                        <label htmlFor="bulk-access-entity-scope">Search scope</label>
                        <select
                          id="bulk-access-entity-scope"
                          value={entitySearchScope}
                          onChange={handleSearchScopeChange}
                        >
                          {ENTITY_SEARCH_SCOPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="entity-filter__row entity-filter__dates">
                      <div className="entity-filter__date-field">
                        <label htmlFor="bulk-access-created-after">Created after</label>
                        <input
                          id="bulk-access-created-after"
                          type="date"
                          value={createdAfter}
                          onChange={(event) => setCreatedAfter(event.target.value)}
                        />
                      </div>
                      <div className="entity-filter__date-field">
                        <label htmlFor="bulk-access-created-before">Created before</label>
                        <input
                          id="bulk-access-created-before"
                          type="date"
                          value={createdBefore}
                          onChange={(event) => setCreatedBefore(event.target.value)}
                        />
                      </div>
                      {(createdAfter || createdBefore) && (
                        <button
                          type="button"
                          className="ghost-button entity-filter__clear-dates"
                          onClick={clearCreatedDateFilters}
                        >
                          Clear dates
                        </button>
                      )}
                    </div>
                    {selectedSearchScope?.description && (
                      <p className="bulk-access-helper">{selectedSearchScope.description}</p>
                    )}
                  </div>
                  <div className="entity-selector-list">
                    {loadingData && (
                      <p className="bulk-access-helper">
                        <Loader2 className="spin" size={16} /> Loading entities…
                      </p>
                    )}
                    {!loadingData && filteredEntities.length === 0 && (
                      <p className="bulk-access-helper">
                        {isCampaignScoped
                          ? 'No entities are visible within this campaign context.'
                          : 'No entities match the current filter.'}
                      </p>
                    )}
                    {!loadingData &&
                      filteredEntities.map((entity) => (
                        <label key={entity.id} className="entity-row">
                          <input
                            type="checkbox"
                            checked={selectedEntityIds.includes(entity.id)}
                            onChange={() => handleEntityToggle(entity.id)}
                            disabled={selectionFull && !selectedEntityIds.includes(entity.id)}
                          />
                          <span className="entity-name">{entity.name}</span>
                          {entity.entityType?.name && (
                            <span className="entity-type">{entity.entityType.name}</span>
                          )}
                        </label>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className="bulk-access-card bulk-access-card--form">
          <header>
            <h2>Access configuration</h2>
          </header>
          <form className="bulk-access-form" onSubmit={handleSubmit}>
            <div className="access-section">
              <div className="access-section__header">
                <div>
                  <p className="access-section__eyebrow">Step 1</p>
                  <h3>Read access</h3>
                </div>
                <label className="access-mode-select">
                  <span>Mode</span>
                  <select value={readMode} onChange={handleAccessModeChange('read')}>
                    <option value="unchanged">Unchanged</option>
                    <option value="activated">Activated</option>
                  </select>
                </label>
              </div>
              <p className="bulk-access-helper access-helper-text">
                This adds new access. It does not remove current access.
              </p>
              {readActivated && (
                <div className="access-section__content">
                  <div className="access-section__grid">
                    <TokenSelector
                      label="Read campaigns"
                      count={formValues.readCampaignIds.length}
                      options={campaignOptions}
                      selectedValues={formValues.readCampaignIds}
                      onToggle={toggleTokenValue('readCampaignIds')}
                    />
                    <TokenSelector
                      label="Read users"
                      count={formValues.readUserIds.length}
                      options={userOptions}
                      selectedValues={formValues.readUserIds}
                      onToggle={toggleTokenValue('readUserIds')}
                    />
                  </div>
                  <TokenSelector
                    label="Read characters"
                    count={formValues.readCharacterIds.length}
                    options={characterOptions}
                    selectedValues={formValues.readCharacterIds}
                    onToggle={toggleTokenValue('readCharacterIds')}
                  />
                </div>
              )}
            </div>

            <div className="access-section">
              <div className="access-section__header">
                <div>
                  <p className="access-section__eyebrow">Step 2</p>
                  <h3>Write access</h3>
                </div>
                <label className="access-mode-select">
                  <span>Mode</span>
                  <select value={writeMode} onChange={handleAccessModeChange('write')}>
                    <option value="unchanged">Unchanged</option>
                    <option value="activated">Activated</option>
                  </select>
                </label>
              </div>
              <p className="bulk-access-helper access-helper-text">
                This adds new access. It does not remove current access.
              </p>
              {writeActivated && (
                <div className="access-section__content">
                  <div className="access-section__grid">
                    <TokenSelector
                      label="Write campaigns"
                      count={formValues.writeCampaignIds.length}
                      options={campaignOptions}
                      selectedValues={formValues.writeCampaignIds}
                      onToggle={toggleTokenValue('writeCampaignIds')}
                    />
                    <TokenSelector
                      label="Write users"
                      count={formValues.writeUserIds.length}
                      options={userOptions}
                      selectedValues={formValues.writeUserIds}
                      onToggle={toggleTokenValue('writeUserIds')}
                    />
                  </div>
                </div>
              )}
            </div>

            <label className="bulk-access-description">
              Description (optional)
              <textarea
                name="description"
                value={formValues.description}
                onChange={handleDescriptionChange}
                rows={1}
                placeholder="Explain why this access change was applied"
              />
            </label>

            <div className="bulk-access-summary">
              {readSummaryText && <p>{readSummaryText}</p>}
              {writeSummaryText && <p>{writeSummaryText}</p>}
              {!readSummaryText && !writeSummaryText && (
                <p className="bulk-access-helper">No access changes selected yet.</p>
              )}
              {!hasActiveSection && (
                <p className="bulk-access-helper warning">Select at least one access type to update.</p>
              )}
              {readActivated && !hasReadTargets && (
                <p className="bulk-access-helper warning">Add at least one read audience.</p>
              )}
              {writeActivated && !hasWriteTargets && (
                <p className="bulk-access-helper warning">Add at least one write audience.</p>
              )}
            </div>

            <div className="bulk-access-footer">
              <div className="bulk-access-footer__selection-info">
                <strong>{selectedCount}</strong> {selectedCount === 1 ? 'entity' : 'entities'} selected
              </div>
              <button type="submit" className="primary-button" disabled={!canSubmit || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="spin" size={16} /> Applying…
                  </>
                ) : (
                  'Confirm and Apply'
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
