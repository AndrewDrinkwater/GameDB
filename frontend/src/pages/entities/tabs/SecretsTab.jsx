import { useCallback, useEffect, useMemo, useState } from 'react'
import DrawerPanel from '../../../components/DrawerPanel.jsx'
import ListCollector from '../../../components/ListCollector.jsx'
import { createEntitySecret } from '../../../api/entities.js'
import { fetchCampaigns } from '../../../api/campaigns.js'
import { fetchCharacters } from '../../../api/characters.js'

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const buildUserLabel = (user) => {
  if (!user) return ''
  const username = user.username?.trim?.() || ''
  const email = user.email?.trim?.() || ''
  if (username && email && username !== email) {
    return `${username} (${email})`
  }
  return username || email || 'Unknown user'
}

const normaliseSecretList = (secrets) => {
  if (!Array.isArray(secrets)) return []
  return secrets
    .filter((secret) => secret && typeof secret === 'object')
    .map((secret) => ({ ...secret }))
}

const dedupeById = (items, key) => {
  const seen = new Set()
  const result = []
  items.forEach((item) => {
    if (!item) return
    let value = item[key]

    if (!value) {
      if (key === 'user_id') {
        value = item.user?.id
      } else if (key === 'campaign_id') {
        value = item.campaign?.id
      }
    }

    if (!value) return

    const str = String(value)
    if (seen.has(str)) return
    seen.add(str)
    result.push(item)
  })
  return result
}

export default function SecretsTab({
  entity,
  secrets,
  worldId,
  canManageSecrets,
  onSecretCreated,
}) {
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCampaigns, setSelectedCampaigns] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [options, setOptions] = useState({ campaigns: [], users: [] })
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [optionsFetched, setOptionsFetched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [secretFormOpen, setSecretFormOpen] = useState(false)

  const formId = useMemo(
    () => `entity-secret-create-${entity?.id || 'new'}`,
    [entity?.id],
  )

  const secretList = useMemo(() => normaliseSecretList(secrets), [secrets])

  const resetFormFields = useCallback(() => {
    setSummary('')
    setDescription('')
    setSelectedCampaigns([])
    setSelectedUsers([])
  }, [])

  const handleOpenForm = useCallback(() => {
    if (saving) return
    resetFormFields()
    setSaveError('')
    setSaveSuccess('')
    setSecretFormOpen(true)
  }, [resetFormFields, saving])

  const handleCloseForm = useCallback(() => {
    if (saving) return
    setSecretFormOpen(false)
    setSaveError('')
    resetFormFields()
  }, [resetFormFields, saving])

  const loadOptions = useCallback(async () => {
    if (!canManageSecrets || !worldId) {
      setOptions({ campaigns: [], users: [] })
      setOptionsError('')
      setOptionsLoading(false)
      setOptionsFetched(true)
      return
    }

    setOptionsLoading(true)
    setOptionsError('')

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

      const userEntries = []
      characterData.forEach((character) => {
        const player = character?.player || {}
        const userId = player.id || character?.user_id
        if (!userId) return
        userEntries.push({
          value: String(userId),
          label: buildUserLabel(player),
        })
      })

      const users = dedupeById(userEntries, 'value')

      setOptions({ campaigns, users })
      setOptionsFetched(true)
    } catch (err) {
      console.error('❌ Failed to load secret visibility options', err)
      setOptions({ campaigns: [], users: [] })
      setOptionsError(err.message || 'Failed to load share options')
      setOptionsFetched(true)
    } finally {
      setOptionsLoading(false)
    }
  }, [canManageSecrets, worldId])

  useEffect(() => {
    setOptionsFetched(false)
    setOptions({ campaigns: [], users: [] })
    setOptionsError('')
  }, [worldId, canManageSecrets])

  useEffect(() => {
    if (!secretFormOpen || optionsFetched) return
    loadOptions()
  }, [secretFormOpen, optionsFetched, loadOptions])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!entity?.id || saving) return

    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setSaveError('Description is required.')
      setSaveSuccess('')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const payload = {
        summary: summary.trim() || undefined,
        description: trimmedDescription,
        campaign_ids: selectedCampaigns,
        user_ids: selectedUsers,
      }

      const response = await createEntitySecret(entity.id, payload)
      const created = response?.data || response

      onSecretCreated?.(created)
      resetFormFields()
      setSecretFormOpen(false)
      setSaveSuccess('Secret created successfully.')
    } catch (err) {
      setSaveError(err.message || 'Failed to create secret')
    } finally {
      setSaving(false)
    }
  }

  const renderSharedWith = (secret) => {
    if (!canManageSecrets || !Array.isArray(secret?.permissions)) {
      return null
    }

    const permissions = secret.permissions
      .map((entry) => ({ ...entry }))
      .filter((entry) => entry)

    if (permissions.length === 0) {
      return <p className="entity-secret-shared">Not shared with any campaigns or users.</p>
    }

    const userPermissions = dedupeById(
      permissions.filter((entry) => entry.user_id || entry.user),
      'user_id'
    )
    const campaignPermissions = dedupeById(
      permissions.filter((entry) => entry.campaign_id || entry.campaign),
      'campaign_id'
    )

    return (
      <div className="entity-secret-shared">
        {userPermissions.length > 0 && (
          <div>
            <strong>Shared with players:</strong>
            <ul className="entity-secret-share-list">
              {userPermissions.map((entry) => {
                const label = entry.user
                  ? buildUserLabel(entry.user)
                  : `User ${String(entry.user_id).slice(0, 8)}`
                const key = entry.user_id || label
                return (
                  <li key={key} className="entity-secret-share-pill">
                    {label}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {campaignPermissions.length > 0 && (
          <div>
            <strong>Shared with campaigns:</strong>
            <ul className="entity-secret-share-list">
              {campaignPermissions.map((entry) => {
                const label = entry.campaign?.name || `Campaign ${String(entry.campaign_id).slice(0, 8)}`
                const key = entry.campaign_id || label
                return (
                  <li key={key} className="entity-secret-share-pill">
                    {label}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="entity-tab-content">
      {canManageSecrets && (
        <DrawerPanel
          isOpen={secretFormOpen}
          onClose={handleCloseForm}
          title="Create a secret"
          description="Secrets are hidden notes that are only visible to selected campaigns or players."
          footerActions={
            <>
              <button
                type="button"
                className="btn secondary"
                onClick={handleCloseForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn submit"
                form={formId}
                disabled={saving}
              >
                {saving ? 'Creating secret...' : 'Save secret'}
              </button>
            </>
          }
        >
          <form id={formId} className="entity-secret-form-body" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="entity-secret-summary">Summary</label>
              <input
                id="entity-secret-summary"
                type="text"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Short label for this secret (optional)"
                disabled={saving}
                data-autofocus="true"
              />
            </div>

            <div className="form-group">
              <label htmlFor="entity-secret-description">Description</label>
              <textarea
                id="entity-secret-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Detail the secret information..."
                disabled={saving}
                required
              />
            </div>

            <div className="entity-secret-share-grid">
              <div className="form-group">
                <label htmlFor="entity-secret-campaigns">Share with campaigns</label>
                <ListCollector
                  inputId="entity-secret-campaigns"
                  selected={selectedCampaigns}
                  options={options.campaigns}
                  onChange={setSelectedCampaigns}
                  placeholder="Select campaigns..."
                  disabled={saving || optionsLoading}
                  loading={optionsLoading}
                  noOptionsMessage={
                    optionsLoading
                      ? 'Loading campaigns...'
                      : 'No campaigns available in this world.'
                  }
                />
                <p className="help-text">
                  Dungeon Masters of selected campaigns will be able to read this secret.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="entity-secret-users">Share with players</label>
                <ListCollector
                  inputId="entity-secret-users"
                  selected={selectedUsers}
                  options={options.users}
                  onChange={setSelectedUsers}
                  placeholder="Select users..."
                  disabled={saving || optionsLoading}
                  loading={optionsLoading}
                  noOptionsMessage={
                    optionsLoading
                      ? 'Loading users...'
                      : 'No eligible players found for this world.'
                  }
                />
                <p className="help-text">
                  Choose specific players who should see this information.
                </p>
              </div>
            </div>

            {optionsError && (
              <div className="alert error" role="alert">
                {optionsError}
              </div>
            )}

            {saveError && (
              <div className="alert error" role="alert">
                {saveError}
              </div>
            )}
          </form>
        </DrawerPanel>
      )}

      <section className="entity-card entity-secret-list-card">
        <div className="entity-card-header entity-card-header--subtle">
          <h2 className="entity-card-title">Secrets for {entity?.name || 'this entity'}</h2>
          {canManageSecrets && (
            <div className="entity-card-actions">
              <button
                type="button"
                className="btn submit"
                onClick={handleOpenForm}
                disabled={saving}
              >
                New secret
              </button>
            </div>
          )}
        </div>

        {saveSuccess && (
          <div className="alert success" role="status">
            {saveSuccess}
          </div>
        )}

        {secretList.length === 0 ? (
          <p className="entity-empty-state">No secrets available for this entity yet.</p>
        ) : (
          <ul className="entity-secret-list">
            {secretList.map((secret) => {
              const createdAt = secret.createdAt || secret.created_at
              const updatedAt = secret.updatedAt || secret.updated_at
              const creatorLabel = buildUserLabel(secret.creator)

              return (
                <li key={secret.id || secret.createdAt} className="entity-secret-item">
                  <div className="entity-secret-header">
                    <h3>{secret.title || 'Untitled secret'}</h3>
                    <div className="entity-secret-meta">
                      {creatorLabel && <span>Created by {creatorLabel}</span>}
                      {createdAt && (
                        <span>Created {formatDate(createdAt)}</span>
                      )}
                      {updatedAt && updatedAt !== createdAt && (
                        <span>Updated {formatDate(updatedAt)}</span>
                      )}
                    </div>
                  </div>

                  {secret.content ? (
                    <p className="entity-secret-content">{secret.content}</p>
                  ) : null}

                  {renderSharedWith(secret)}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
