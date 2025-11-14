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

const normaliseListResponse = (response) => {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

const toSelectOptions = (records, labelKey = 'name') =>
  records.map((record) => ({ id: record.id, label: record[labelKey] || record.name || record.email || record.id }))

const getMultiValue = (event) => Array.from(event.target.selectedOptions).map((option) => option.value)

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
  const [selectedEntityIds, setSelectedEntityIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState(null)
  const [formValues, setFormValues] = useState({
    readAccess: 'global',
    writeAccess: 'owner_only',
    readCampaignIds: [],
    readUserIds: [],
    readCharacterIds: [],
    writeCampaignIds: [],
    writeUserIds: [],
    description: '',
  })
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
              id: member.user_id,
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
    if (!entityFilter.trim()) return accessibleEntities
    const query = entityFilter.trim().toLowerCase()
    return accessibleEntities.filter((entity) => entity.name?.toLowerCase().includes(query))
  }, [accessibleEntities, entityFilter])

  useEffect(() => {
    if (!isCampaignScoped || !activeCampaign) return
    const allowedCampaignId = String(activeCampaign.id)
    const allowedUsers = new Set((users || []).map((userOption) => String(userOption.id)))
    const allowedCharacters = new Set((characters || []).map((character) => String(character.id)))

    setFormValues((prev) => {
      const readCampaignIds = allowedCampaignId ? [allowedCampaignId] : []
      const writeCampaignIds = prev.writeCampaignIds.filter((id) => id === allowedCampaignId)
      const filterList = (list, allowed) => list.filter((id) => allowed.has(String(id)))
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

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleMultiChange = (name) => (event) => {
    const value = getMultiValue(event)
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleWriteCampaignChange = (event) => {
    const value = getMultiValue(event)
    setFormValues((prev) => {
      const readCampaignSet = new Set(prev.readCampaignIds)
      value.forEach((id) => readCampaignSet.add(id))
      return { ...prev, writeCampaignIds: value, readCampaignIds: Array.from(readCampaignSet) }
    })
  }

  const handleWriteUserChange = (event) => {
    const value = getMultiValue(event)
    setFormValues((prev) => {
      const readUserSet = new Set(prev.readUserIds)
      value.forEach((id) => readUserSet.add(id))
      return { ...prev, writeUserIds: value, readUserIds: Array.from(readUserSet) }
    })
  }

  const hasReadTargets = useMemo(() => {
    const readCount =
      formValues.readCampaignIds.length +
      formValues.readUserIds.length +
      formValues.readCharacterIds.length
    return readCount > 0
  }, [formValues])

  const hasWriteTargets = useMemo(() => {
    const writeCount = formValues.writeCampaignIds.length + formValues.writeUserIds.length
    return writeCount > 0
  }, [formValues])

  const canSubmit = canUseTool && selectedEntityIds.length > 0 && !submitting

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
    if (formValues.readAccess === 'selective' && !hasReadTargets) {
      setFormError('Selective read access requires at least one audience.')
      return
    }
    if (formValues.writeAccess === 'selective' && !hasWriteTargets) {
      setFormError('Provide a campaign or user for selective write access.')
      return
    }

    const payload = {
      entityIds: selectedEntityIds,
      readAccess: formValues.readAccess,
      writeAccess: formValues.writeAccess,
      readCampaignIds: formValues.readCampaignIds,
      readUserIds: formValues.readUserIds,
      readCharacterIds: formValues.readCharacterIds,
      writeCampaignIds: formValues.writeCampaignIds,
      writeUserIds: formValues.writeUserIds,
      description: formValues.description,
    }

    setSubmitting(true)
    setFormError('')
    setResult(null)

    try {
      const response = await applyBulkAccessUpdate(payload)
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
      return [{ id: activeCampaign.id, label: activeCampaign.name }]
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
              <button
                type="button"
                className="ghost-button"
                onClick={handleSelectAllFiltered}
                disabled={selectionFull || selectionMode !== 'manual'}
              >
                Select filtered
              </button>
              <button type="button" className="ghost-button" onClick={handleClearSelection}>
                Clear selection
              </button>
            </div>
          </header>
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
                <input
                  type="text"
                  placeholder="Filter entities by name"
                  value={entityFilter}
                  onChange={(event) => setEntityFilter(event.target.value)}
                />
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
        </section>

        <section className="bulk-access-card">
          <header>
            <h2>Access configuration</h2>
          </header>
          <form className="bulk-access-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Read access mode
                <select name="readAccess" value={formValues.readAccess} onChange={handleInputChange}>
                  <option value="global">Global</option>
                  <option value="selective">Selective</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>

              <label>
                Write access mode
                <select name="writeAccess" value={formValues.writeAccess} onChange={handleInputChange}>
                  <option value="owner_only">Owner only</option>
                  <option value="selective">Selective</option>
                  <option value="hidden">Hidden</option>
                  <option value="global">Global</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                Read campaigns
                <select
                  multiple
                  value={formValues.readCampaignIds}
                  onChange={handleMultiChange('readCampaignIds')}
                  size={5}
                  disabled={isCampaignScoped}
                >
                  {campaignOptions.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Read users
                <select multiple value={formValues.readUserIds} onChange={handleMultiChange('readUserIds')} size={5}>
                  {userOptions.map((userOption) => (
                    <option key={userOption.id} value={userOption.id}>
                      {userOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Read characters
              <select
                multiple
                value={formValues.readCharacterIds}
                onChange={handleMultiChange('readCharacterIds')}
                size={4}
              >
                {characterOptions.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label>
                Write campaigns
                <select multiple value={formValues.writeCampaignIds} onChange={handleWriteCampaignChange} size={5}>
                  {campaignOptions.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Write users
                <select multiple value={formValues.writeUserIds} onChange={handleWriteUserChange} size={5}>
                  {userOptions.map((userOption) => (
                    <option key={userOption.id} value={userOption.id}>
                      {userOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Description (optional)
              <textarea
                name="description"
                value={formValues.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Explain why this access change was applied"
              />
            </label>

            <div className="bulk-access-summary">
              <p>
                <strong>Summary:</strong> {selectedCount} entities will be set to <strong>{formValues.readAccess}</strong> read and{' '}
                <strong>{formValues.writeAccess}</strong> write access.
              </p>
              {formValues.writeAccess === 'selective' && !hasWriteTargets && (
                <p className="bulk-access-helper warning">Add at least one campaign or user for selective write access.</p>
              )}
              {formValues.readAccess === 'selective' && !hasReadTargets && (
                <p className="bulk-access-helper warning">Add at least one read audience.</p>
              )}
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
          </form>
        </section>
      </div>
    </div>
  )
}
