import { useParams, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchWorlds, updateWorld, removeWorld } from '../api/worlds'
import FormRenderer from '../components/RecordForm/FormRenderer'
import editSchema from '../components/RecordForm/formSchemas/world.edit.json'

export default function WorldDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, sessionReady } = useAuth()
  const [world, setWorld] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadWorld = useCallback(async () => {
    try {
      const res = await fetchWorlds()
      const found = (res?.data || res || []).find((w) => w.id === id)
      setWorld(found)
      if (!found) setError('World not found')
    } catch (err) {
      console.error('❌ Failed to load world:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (sessionReady && token) loadWorld()
  }, [sessionReady, token, loadWorld])

  const handleUpdate = async (data) => {
    try {
      const res = await updateWorld(id, data)
      if (res.success) navigate('/worlds')
    } catch (err) {
      alert(`Failed to update world: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this world?')) return
    try {
      const res = await removeWorld(id)
      if (res.success) navigate('/worlds')
    } catch (err) {
      alert(`Failed to delete world: ${err.message}`)
    }
  }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading world...</p>
  if (error) return <p className="error">Error: {error}</p>
  if (!world) return <p>World not found</p>

  return (
    <FormRenderer
      schema={editSchema}
      initialData={world}
      onSubmit={handleUpdate}
      onDelete={handleDelete}
      onCancel={() => navigate('/worlds')}
    />
  )
}
