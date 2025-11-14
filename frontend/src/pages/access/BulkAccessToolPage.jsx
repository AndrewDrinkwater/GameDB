import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ShieldPlus } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { getWorldEntities } from '../../api/entities.js'
import { fetchWorlds } from '../../api/worlds.js'
import { fetchCampaigns } from '../../api/campaigns.js'
import { fetchCharacters } from '../../api/characters.js'
import { fetchUsers } from '../../api/users.js'
import { applyBulkAccessUpdate } from '../../api/access.js'
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
  const { worldId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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

  const isOwner = useMemo(() => {
    if (!world || !user) return false
    return String(world.created_by) === String(user.id)
  }, [world, user])

  useEffect(() => {
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
  }, [worldId])

  const loadWorldData = useCallback(async () => {
    if (!worldId || !isOwner) return
    setLoadingData(true)
    setDataError('')
    try {
      const [entityRes, campaignRes, characterRes, userRes] = await Promise.all([
        getWorldEntities(worldId),
        fetchCampaigns({ world_id: worldId }),
        fetchCharacters({ world_id: worldId }),
        fetchUsers(),
      ])

      const resolvedEntities = normaliseListResponse(entityRes)
      setEntities(resolvedEntities)
      setCampaigns(normaliseListResponse(campaignRes))
      setCharacters(normaliseListResponse(characterRes))
      setUsers(normaliseListResponse(userRes))
    } catch (error) {
      console.error('Failed to load bulk access data', error)
      setDataError(error.message || 'Unable to load world data')
    } finally {
      setLoadingData(false)
    }
  }, [isOwner, worldId])

  useEffect(() => {
    loadWorldData()
  }, [loadWorldData])

  const filteredEntities = useMemo(() => {
    if (!entityFilter.trim()) return entities
    const query = entityFilter.trim().toLowerCase()
    return entities.filter((entity) => entity.name?.toLowerCase().includes(query))
  }, [entities, entityFilter])

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

  const canSubmit = isOwner && selectedEntityIds.length > 0 && !submitting

  const handleSubmit = async (event) => {
    event.preventDefault()
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

  const campaignOptions = useMemo(() => toSelectOptions(campaigns), [campaigns])
  const userOptions = useMemo(() => toSelectOptions(users, 'username'), [users])
  const characterOptions = useMemo(() => toSelectOptions(characters), [characters])

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

  if (!isOwner) {
    return (
      <div className="bulk-access-page">
        <div className="bulk-access-alert warning">
          <AlertTriangle size={16} /> Only the world owner can access this tool.
        </div>
      </div>
    )
  }

  return (
    <div className="bulk-access-page">
      <div className="bulk-access-header">
        <div>
          <p className="bulk-access-eyebrow">World Admin · Manual Access</p>
          <h1>Bulk Access Editor · {world?.name}</h1>
        </div>
        <div className="bulk-access-header-actions">
          <Link to={`/worlds/${worldId}/access/audit`} className="ghost-button">
            View audit log
          </Link>
        </div>
      </div>

      {dataError && (
        <div className="bulk-access-alert warning">
          <AlertTriangle size={16} /> {dataError}
        </div>
      )}

      {result && (
        <div className="bulk-access-alert success">
          <CheckCircle2 size={16} /> Applied access updates to {result.count} entities · Run {result.runId}
          <Link to={`/worlds/${worldId}/access/audit`} className="inline-link">
            Review run
          </Link>
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
              <button type="button" className="ghost-button" onClick={handleSelectAllFiltered} disabled={selectionFull}>
                Select filtered
              </button>
              <button type="button" className="ghost-button" onClick={handleClearSelection}>
                Clear selection
              </button>
            </div>
          </header>
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
              <p className="bulk-access-helper">No entities match the current filter.</p>
            )}
            {!loadingData &&
              filteredEntities.map((entity) => (
                <label key={entity.id} className="entity-row">
                  <input
                    type="checkbox"
                    checked={selectedEntityIds.includes(entity.id)}
                    onChange={() => handleEntityToggle(entity.id)}
                  />
                  <span className="entity-name">{entity.name}</span>
                  {entity.entityType?.name && <span className="entity-type">{entity.entityType.name}</span>}
                </label>
              ))}
          </div>
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
                <select multiple value={formValues.readCampaignIds} onChange={handleMultiChange('readCampaignIds')} size={5}>
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
