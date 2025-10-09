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
import newSchema from '../components/RecordForm/formSchemas/campaign.new.json'
import editSchema from '../components/RecordForm/formSchemas/campaign.edit.json'

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

  const handleDelete = async () => {
    if (!selectedCampaign?.id) return
    if (!canManage(selectedCampaign)) {
      alert('You do not have permission to delete this campaign.')
      return
    }
    if (!confirm('Delete this campaign?')) return
    const res = await removeCampaign(selectedCampaign.id)
    if (res.success) { await loadCampaigns(); setViewMode('list'); setSelectedCampaign(null) }
  }

  const closeDetail = () => { setViewMode('list'); setSelectedCampaign(null) }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading campaigns...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (viewMode === 'new')
    return <FormRenderer schema={newSchema} initialData={{}} onSubmit={handleCreate} onCancel={handleCancel} />

  if (viewMode === 'edit')
    return (
      <FormRenderer
        schema={editSchema}
        initialData={selectedCampaign}
        onSubmit={handleUpdate}
        onDelete={handleDelete}
        onCancel={handleCancel}
      />
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
