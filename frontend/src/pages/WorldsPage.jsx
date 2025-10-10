import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchWorlds, createWorld } from '../api/worlds'
import ListViewer from '../components/ListViewer'
import FormRenderer from '../components/RecordForm/FormRenderer'
import newSchema from '../components/RecordForm/formSchemas/world.new.json'

export default function WorldsPage() {
  const navigate = useNavigate()
  const { token, sessionReady } = useAuth()
  const [worlds, setWorlds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  // --- Load Worlds (only when token/session ready)
  const loadWorlds = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWorlds()
      setWorlds(res?.data || res || [])
    } catch (err) {
      console.error('❌ Failed to load worlds:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (sessionReady && token) loadWorlds()
  }, [sessionReady, token, loadWorlds])

  // --- Table Columns
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'system', label: 'System' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' },
    { key: 'createdAt', label: 'Created' },
  ]

  // --- Handlers
  const handleNew = () => setCreating(true)
  const handleCancel = () => setCreating(false)

  const handleCreate = async (data) => {
    try {
      const res = await createWorld(data)
      if (res.success) {
        await loadWorlds()
        setCreating(false)
        return true
      }
      return false
    } catch (err) {
      alert(`Failed to create world: ${err.message}`)
      return false
    }
  }

  // --- UI States
  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading worlds...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (creating) {
    return (
      <FormRenderer
        schema={newSchema}
        initialData={{}}
        onSubmit={handleCreate}
        onCancel={handleCancel}
      />
    )
  }

  // --- Main list view
  return (
    <ListViewer
      data={worlds}
      columns={columns}
      title="Worlds"
      extraActions={
        <button type="button" className="btn submit" onClick={handleNew}>
          + New
        </button>
      }
      onRowClick={(row) => navigate(`/worlds/${row.id}`)} // ← Go to detail page
    />
  )
}
