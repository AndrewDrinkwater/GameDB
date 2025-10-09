import { useEffect, useState } from 'react'
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
  const { token, sessionReady } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [error, setError] = useState(null)

  const loadCampaigns = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCampaigns()
      setCampaigns(res?.data || res || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionReady && token) loadCampaigns()
  }, [sessionReady, token])

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' },
    { key: 'createdAt', label: 'Created' },
  ]

  const handleNew = () => setViewMode('new')
  const handleCancel = () => { setViewMode('list'); setSelectedCampaign(null) }

  const handleCreate = async (data) => {
    const res = await createCampaign(data)
    if (res.success) { await loadCampaigns(); setViewMode('list') }
  }

  const handleUpdate = async (data) => {
    const res = await updateCampaign(selectedCampaign.id, data)
    if (res.success) { await loadCampaigns(); setViewMode('list'); setSelectedCampaign(null) }
  }

  const handleDelete = async () => {
    if (!selectedCampaign?.id) return
    if (!confirm('Delete this campaign?')) return
    const res = await removeCampaign(selectedCampaign.id)
    if (res.success) { await loadCampaigns(); setViewMode('list'); setSelectedCampaign(null) }
  }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading campaigns...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (viewMode === 'new')
    return <FormRenderer schema={newSchema} initialData={{}} onSubmit={handleCreate} onCancel={handleCancel} />

  if (viewMode === 'edit')
    return <FormRenderer schema={editSchema} initialData={selectedCampaign} onSubmit={handleUpdate} onDelete={handleDelete} onCancel={handleCancel} />

  return (
    <ListViewer
      data={campaigns}
      columns={columns}
      title="Campaigns"
      extraActions={<button className="new-btn" onClick={handleNew}>+ New</button>}
      onRowClick={(row) => { setSelectedCampaign(row); setViewMode('edit') }}
    />
  )
}
