import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  removeCampaign,
} from '../api/campaigns'
import ListViewer from '../components/ListViewer'
import FormRenderer from '../components/RecordForm/FormRenderer'
import RecordView from '../components/RecordForm/RecordView'
import CampaignMembersManager from '../components/CampaignMembersManager'
import newSchema from '../components/RecordForm/formSchemas/campaign.new.json'
import baseEditSchema from '../components/RecordForm/formSchemas/campaign.edit.json'
import viewSchemaDefinition from '../components/RecordForm/formSchemas/campaign.view.json'

export default function CampaignsPage({ scope = 'all' }) {
  const navigate = useNavigate()
  const { id: routeId } = useParams()
  const { user, token, sessionReady } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const basePath = useMemo(() => `/campaigns/${scope}`, [scope])

  const normaliseCampaign = useCallback((item) => {
    if (!item) return item

    const players = Array.isArray(item.members)
      ? item.members.filter((member) => member.role === 'player')
      : []

    return {
      ...item,
      ownerName: item.owner?.username || '—',
      worldName: item.world?.name || '—',
      player_ids: players.map((member) => member.user_id),
    }
  }, [])

  const loadCampaigns = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCampaigns()
      const data = res?.data || res || []
      const normalised = data.map((item) => normaliseCampaign(item))
      setCampaigns(normalised)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, normaliseCampaign])

  useEffect(() => {
    if (sessionReady && token) loadCampaigns()
  }, [sessionReady, token, loadCampaigns])

  useEffect(() => {
    setViewMode('list')
    setSelectedCampaign(null)
    setActiveTab('details')
  }, [scope])

  useEffect(() => {
    if (!routeId) {
      if (viewMode !== 'new') setViewMode('list')
      setSelectedCampaign(null)
      return
    }

    const found = campaigns.find((campaign) => String(campaign.id) === routeId)
    if (!found) {
      if (!loading) navigate(basePath, { replace: true })
      return
    }

    const manageable =
      !!user && (user.role === 'system_admin' || found.created_by === user.id)
    setSelectedCampaign(found)
    setViewMode(manageable ? 'edit' : 'view')
  }, [routeId, campaigns, navigate, basePath, loading, viewMode, user])

  useEffect(() => {
    setActiveTab('details')
  }, [selectedCampaign?.id])

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      { key: 'worldName', label: 'World' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Description' },
      { key: 'createdAt', label: 'Created' },
    ],
    []
  )

  const canManage = (campaign) => {
    if (!campaign || !user) return false
    return user.role === 'system_admin' || campaign.created_by === user.id
  }

  const editSchema = useMemo(() => {
    if (user?.role !== 'system_admin') return baseEditSchema

    const schema = JSON.parse(JSON.stringify(baseEditSchema))
    const ownerField = {
      name: 'created_by',
      label: 'Owner',
      type: 'select',
      optionsSource: 'users',
      optionLabelKey: 'username',
      optionValueKey: 'id',
    }

    if (Array.isArray(schema.fields)) {
      const existingIndex = schema.fields.findIndex((field) => field?.name === 'created_by')
      if (existingIndex >= 0) {
        schema.fields[existingIndex] = { ...schema.fields[existingIndex], ...ownerField }
      } else {
        const insertAt = Math.min(2, schema.fields.length)
        schema.fields.splice(insertAt, 0, ownerField)
      }
    }

    return schema
  }, [user])

  const handleNew = () => {
    navigate(basePath)
    setViewMode('new')
    setSelectedCampaign(null)
  }
  const handleCancel = () => {
    setViewMode('list')
    setSelectedCampaign(null)
    navigate(basePath)
  }

  const handleCreate = async (data) => {
    try {
      const res = await createCampaign(data)
      if (res.success) {
        await loadCampaigns()
        navigate(basePath)
        setViewMode('list')
        setSelectedCampaign(null)
        return true
      }
      return false
    } catch (err) {
      alert(`Failed to create campaign: ${err.message}`)
      return false
    }
  }

  const handleUpdate = async (data, options = {}) => {
    const { stayOnPage = false } = options
    if (!canManage(selectedCampaign)) {
      alert('You do not have permission to update this campaign.')
      return false
    }
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(data, 'player_ids')) {
      if (Array.isArray(data.player_ids)) {
        payload.player_ids = data.player_ids.filter((value) => value !== null && value !== undefined && value !== '')
      } else if (typeof data.player_ids === 'string' && data.player_ids !== '') {
        payload.player_ids = [data.player_ids]
      } else {
        payload.player_ids = []
      }
    }

    try {
      const res = await updateCampaign(selectedCampaign.id, payload)
      if (res.success) {
        const updated = normaliseCampaign(res.data)

        setCampaigns((prev) =>
          prev.map((campaign) => (campaign.id === updated.id ? updated : campaign)),
        )

        setSelectedCampaign((prev) => {
          if (!prev || prev.id !== updated.id) return prev
          return updated
        })

        if (stayOnPage) {
          return { message: 'Campaign updated successfully.' }
        }

        setViewMode('list')
        setSelectedCampaign(null)
        navigate(basePath)
        return true
      }
      return false
    } catch (err) {
      alert(`Failed to update campaign: ${err.message}`)
      return false
    }
  }

  const handleMembersChanged = useCallback((campaignId, nextMembers) => {
    const normaliseMembers = (membersList) => {
      if (!Array.isArray(membersList)) return { members: [], playerIds: [] }

      const players = membersList.filter((member) => member.role === 'player')
      return {
        members: membersList,
        playerIds: players.map((member) => member.user_id),
      }
    }

    setCampaigns((prev) =>
      prev.map((campaign) => {
        if (campaign.id !== campaignId) return campaign

        const { members, playerIds } = normaliseMembers(nextMembers)
        return {
          ...campaign,
          members,
          player_ids: playerIds,
        }
      }),
    )

    setSelectedCampaign((prev) => {
      if (!prev || prev.id !== campaignId) return prev

      const { members, playerIds } = normaliseMembers(nextMembers)
      return {
        ...prev,
        members,
        player_ids: playerIds,
      }
    })
  }, [])

  const handleDelete = async (data) => {
    const target = data || selectedCampaign
    const targetId = target?.id
    if (!targetId) return false
    if (!canManage(target)) {
      alert('You do not have permission to delete this campaign.')
      return false
    }
    if (!confirm('Delete this campaign?')) return false
    try {
      const res = await removeCampaign(targetId)
      if (res.success) {
        await loadCampaigns()
        setViewMode('list')
        setSelectedCampaign(null)
        navigate(basePath)
        return true
      }
      return false
    } catch (err) {
      alert(err.message)
      return false
    }
  }

  const closeDetail = () => {
    setViewMode('list')
    setSelectedCampaign(null)
    navigate(basePath)
  }

  const editInitialData = useMemo(() => {
    if (!selectedCampaign) return null

    const createdBy =
      selectedCampaign.created_by ?? selectedCampaign.owner?.id ?? ''

    const players = Array.isArray(selectedCampaign.members)
      ? selectedCampaign.members.filter((member) => member.role === 'player')
      : []

    return {
      ...selectedCampaign,
      created_by: createdBy,
      player_ids: players.map((member) => member.user_id),
    }
  }, [selectedCampaign])

  const detailsSchema = useMemo(() => {
    const schema = JSON.parse(JSON.stringify(editSchema))

    if (Array.isArray(schema.fields)) {
      schema.fields = schema.fields.filter((field) => field?.name !== 'player_ids')
    } else if (Array.isArray(schema.sections)) {
      schema.sections = schema.sections
        .map((section) => ({
          ...section,
          fields: (section.fields || []).filter((field) => field?.name !== 'player_ids'),
        }))
        .filter((section) => section.fields && section.fields.length > 0)
    }

    schema.title = 'Campaign Details'
    return schema
  }, [editSchema])

  const membershipSelectedOptions = useMemo(() => {
    if (!selectedCampaign || !Array.isArray(selectedCampaign.members)) return []
    const seen = new Set()
    return selectedCampaign.members
      .map((member) => {
        const memberId = member?.user_id ?? member?.user?.id
        if (!memberId) return null
        const value = String(memberId)
        if (seen.has(value)) return null
        seen.add(value)
        const label =
          member?.user?.username ||
          member?.user?.displayName ||
          member?.user?.display_name ||
          member?.user?.name ||
          member?.user?.email ||
          member?.display_name ||
          value
        return { value, label }
      })
      .filter(Boolean)
  }, [selectedCampaign])

  const membershipSchema = useMemo(() => {
    const schema = { title: 'Campaign Membership', fields: [] }

    const extractPlayersField = (source) => {
      if (!source) return null
      if (Array.isArray(source.fields)) {
        for (const field of source.fields) {
          if (field?.name === 'player_ids') return field
        }
      }
      return null
    }

    let playersField = null

    if (Array.isArray(editSchema.fields)) {
      playersField = extractPlayersField(editSchema)
    } else if (Array.isArray(editSchema.sections)) {
      for (const section of editSchema.sections) {
        playersField = extractPlayersField(section)
        if (playersField) break
      }
    }

    if (playersField) {
      const fieldCopy = JSON.parse(JSON.stringify(playersField))
      if (membershipSelectedOptions.length > 0) {
        fieldCopy.selectedOptions = membershipSelectedOptions
      }
      schema.fields = [fieldCopy]
    }

    return schema
  }, [editSchema, membershipSelectedOptions])

  const membershipInitialData = useMemo(() => {
    if (!editInitialData) return null
    return { player_ids: editInitialData.player_ids ?? [] }
  }, [editInitialData])

  const viewData = useMemo(() => {
    if (!selectedCampaign) return null
    const status = selectedCampaign.status || ''
    const statusLabel = status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : '—'
    return {
      ...selectedCampaign,
      statusLabel,
    }
  }, [selectedCampaign])

  const filteredCampaigns = useMemo(() => {
    if (scope === 'my') {
      if (!user?.id) return []
      return campaigns.filter((campaign) => campaign.created_by === user.id)
    }

    return campaigns
  }, [campaigns, scope, user])

  const title = scope === 'my' ? 'My Campaigns' : 'All Campaigns'
  const closeLabel = scope === 'my' ? 'Back to my campaigns' : 'Back to all campaigns'

  const isDmForSelectedCampaign = useMemo(() => {
    if (!selectedCampaign || !Array.isArray(selectedCampaign.members)) return false
    if (!user?.id) return false
    return selectedCampaign.members.some(
      (member) => member?.user_id === user.id && member?.role === 'dm',
    )
  }, [selectedCampaign, user])

  const campaignAccessLink = selectedCampaign ? `/campaigns/${selectedCampaign.id}/access/bulk` : ''
  const canUseCampaignAccess = Boolean(selectedCampaign && isDmForSelectedCampaign)
  const campaignAccessCta =
    scope !== 'my' && canUseCampaignAccess && campaignAccessLink ? (
      <div className="campaign-access-cta">
        <div>
          <p className="campaign-access-eyebrow">Campaign Tools</p>
          <h3>Manage entity access for {selectedCampaign.name}</h3>
          <p className="campaign-access-copy">
            The Campaign Access Editor keeps changes scoped to this campaign’s members.
          </p>
        </div>
        <div className="campaign-access-actions">
          <Link to={campaignAccessLink} className="btn outline">
            Open Access Editor
          </Link>
        </div>
      </div>
    ) : null

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading campaigns...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (viewMode === 'new')
    return (
      <FormRenderer
        schema={newSchema}
        initialData={{}}
        onSubmit={handleCreate}
        onCancel={handleCancel}
        showUpdateAction={false}
      />
    )

  if (viewMode === 'edit' && selectedCampaign && editInitialData)
    return (
      <div className="campaign-editor">
        {campaignAccessCta}
        <div className="campaign-tabs" role="tablist" aria-label="Campaign editor tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'details'}
            className={`campaign-tab${activeTab === 'details' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'membership'}
            className={`campaign-tab${activeTab === 'membership' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('membership')}
          >
            Membership
          </button>
        </div>

        <div className="campaign-tab-panel" role="tabpanel">
          {activeTab === 'details' ? (
            <FormRenderer
              schema={detailsSchema}
              initialData={editInitialData}
              onSubmit={handleUpdate}
              onDelete={handleDelete}
              onCancel={handleCancel}
            />
          ) : (
            <div className="campaign-membership">
              <FormRenderer
                schema={membershipSchema}
                initialData={membershipInitialData}
                onSubmit={handleUpdate}
                onCancel={handleCancel}
              />
              <CampaignMembersManager
                campaignId={selectedCampaign.id}
                canManage={canManage(selectedCampaign)}
                onMembersChanged={(members) => handleMembersChanged(selectedCampaign.id, members)}
              />
            </div>
          )}
        </div>
      </div>
    )

  if (viewMode === 'view' && selectedCampaign)
    return (
      <div className="campaign-view-wrapper">
        {campaignAccessCta}
        <RecordView
          schema={viewSchemaDefinition}
          data={viewData || {}}
          onClose={closeDetail}
          closeLabel={closeLabel}
          infoMessage="You can view this campaign but only the owner or a system admin can make changes."
        />
      </div>
    )

  return (
    <ListViewer
      data={filteredCampaigns}
      columns={columns}
      title={title}
      extraActions={
        <button type="button" className="btn submit" onClick={handleNew}>
          + New
        </button>
      }
      onRowClick={(row) => {
        setSelectedCampaign(row)
        setViewMode(canManage(row) ? 'edit' : 'view')
        navigate(`${basePath}/${row.id}`)
      }}
    />
  )
}
