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
import CampaignMembersManager from '../components/CampaignMembersManager'
import newSchema from '../components/RecordForm/formSchemas/campaign.new.json'
import baseEditSchema from '../components/RecordForm/formSchemas/campaign.edit.json'

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
      const normalised = data.map((item) => ({
        ...item,
        ownerName: item.owner?.username || '—',
        worldName: item.world?.name || '—',
      }))
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
    const res = await updateCampaign(selectedCampaign.id, data)
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

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading campaigns...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (viewMode === 'new')
    return <FormRenderer schema={newSchema} initialData={{}} onSubmit={handleCreate} onCancel={handleCancel} />

  if (viewMode === 'edit' && selectedCampaign)
    return (
      <div className="campaign-editor">
        <FormRenderer
          schema={editSchema}
          initialData={{
            ...selectedCampaign,
            created_by:
              selectedCampaign.created_by ??
              selectedCampaign.owner?.id ??
              '',
          }}
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
      <div className="record-detail">
        <h2>{selectedCampaign.name}</h2>
        <p><strong>World:</strong> {selectedCampaign.worldName}</p>
        <p><strong>Owner:</strong> {selectedCampaign.ownerName}</p>
        <p><strong>Status:</strong> {selectedCampaign.status}</p>
        <p><strong>Description:</strong> {selectedCampaign.description || '—'}</p>
        <p><strong>Created:</strong> {selectedCampaign.createdAt}</p>
        <p><strong>Updated:</strong> {selectedCampaign.updatedAt}</p>
        <p className="info">You can view this campaign but only the owner or a system admin can make changes.</p>
        <button type="button" className="btn" onClick={closeDetail}>
          Back to campaigns
        </button>
      </div>
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
