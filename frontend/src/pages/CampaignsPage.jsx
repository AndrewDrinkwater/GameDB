import { useCallback, useEffect, useMemo, useState } from 'react'
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

export default function CampaignsPage() {
  const { user, token, sessionReady } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [error, setError] = useState(null)

  const loadCampaigns = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCampaigns()
      const data = res?.data || res || []
      const normalised = data.map((item) => {
        const players = Array.isArray(item.members)
          ? item.members.filter((member) => member.role === 'player')
          : []

        return {
          ...item,
          ownerName: item.owner?.username || '—',
          worldName: item.world?.name || '—',
          player_ids: players.map((member) => member.user_id),
        }
      })
      setCampaigns(normalised)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (sessionReady && token) loadCampaigns()
  }, [sessionReady, token, loadCampaigns])

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

  const handleNew = () => setViewMode('new')
  const handleCancel = () => { setViewMode('list'); setSelectedCampaign(null) }

  const handleCreate = async (data) => {
    const res = await createCampaign(data)
    if (res.success) { await loadCampaigns(); setViewMode('list') }
  }

  const handleUpdate = async (data) => {
    if (!canManage(selectedCampaign)) {
      alert('You do not have permission to update this campaign.')
      return
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

    const res = await updateCampaign(selectedCampaign.id, payload)
    if (res.success) { await loadCampaigns(); setViewMode('list'); setSelectedCampaign(null) }
  }

  const handleDelete = async (data) => {
    const target = data || selectedCampaign
    const targetId = target?.id
    if (!targetId) return
    if (!canManage(target)) {
      alert('You do not have permission to delete this campaign.')
      return
    }
    if (!confirm('Delete this campaign?')) return
    try {
      const res = await removeCampaign(targetId)
      if (res.success) {
        await loadCampaigns()
        setViewMode('list')
        setSelectedCampaign(null)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const closeDetail = () => { setViewMode('list'); setSelectedCampaign(null) }

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

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading campaigns...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (viewMode === 'new')
    return <FormRenderer schema={newSchema} initialData={{}} onSubmit={handleCreate} onCancel={handleCancel} />

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

  if (viewMode === 'edit' && selectedCampaign && editInitialData)
    return (
      <div className="campaign-editor">
        <FormRenderer
          schema={editSchema}
          initialData={editInitialData}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
          onCancel={handleCancel}
        />
        <CampaignMembersManager
          campaignId={selectedCampaign.id}
          canManage={canManage(selectedCampaign)}
        />
      </div>
    )

  if (viewMode === 'view' && selectedCampaign)
    return (
      <RecordView
        schema={viewSchemaDefinition}
        data={viewData || {}}
        onClose={closeDetail}
        closeLabel="Back to campaigns"
        infoMessage="You can view this campaign but only the owner or a system admin can make changes."
      />
    )

  return (
    <ListViewer
      data={campaigns}
      columns={columns}
      title="Campaigns"
      extraActions={
        <button type="button" className="btn submit" onClick={handleNew}>
          + New
        </button>
      }
      onRowClick={(row) => {
        setSelectedCampaign(row)
        setViewMode(canManage(row) ? 'edit' : 'view')
      }}
    />
  )
}
