import { useParams, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchWorlds, updateWorld, removeWorld } from '../api/worlds'
import FormRenderer from '../components/RecordForm/FormRenderer'
import RecordView from '../components/RecordForm/RecordView'
import editSchema from '../components/RecordForm/formSchemas/world.edit.json'
import viewSchema from '../components/RecordForm/formSchemas/world.view.json'

export default function WorldDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
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
      const payload = {
        name: data?.name,
        description: data?.description,
        system: data?.system,
        status: data?.status,
      }
      const res = await updateWorld(id, payload)
      if (res.success) {
        navigate('/worlds')
        return true
      }
      return false
    } catch (err) {
      alert(`Failed to update world: ${err.message}`)
      return false
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this world?')) return false
    try {
      const res = await removeWorld(id)
      if (res.success) {
        navigate('/worlds')
        return true
      }
      return false
    } catch (err) {
      alert(`Failed to delete world: ${err.message}`)
      return false
    }
  }

  const canEdit = useMemo(() => {
    if (!world || !user) return false
    if (user.role === 'system_admin') return true
    return world.created_by === user.id
  }, [user, world])

  const editInitialData = useMemo(() => {
    if (!world) return null
    return {
      ...world,
      created_by: world.creator || world.created_by,
    }
  }, [world])

  const viewData = useMemo(() => {
    if (!world) return null

    const formatDate = (value) => {
      if (!value) return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleString()
    }

    const status = world.status || ''
    const statusLabel =
      status.length > 0
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : '—'

    const ownerName =
      world.creator?.username ||
      world.creator?.name ||
      world.created_by ||
      '—'

    return {
      name: world.name || '—',
      system: world.system || '—',
      statusLabel,
      description: world.description || '—',
      ownerName,
      createdAt: formatDate(world.createdAt),
      updatedAt: formatDate(world.updatedAt),
    }
  }, [world])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading world...</p>
  if (error) return <p className="error">Error: {error}</p>
  if (!world) return <p>World not found</p>

  if (!canEdit)
    return (
      <RecordView
        schema={viewSchema}
        data={viewData || {}}
        onClose={() => navigate('/worlds')}
        closeLabel="Back to worlds"
        infoMessage="You can view this world but only the creator or a system admin can make changes."
      />
    )

  return (
    <FormRenderer
      schema={editSchema}
      initialData={editInitialData || world}
      onSubmit={handleUpdate}
      onDelete={handleDelete}
      onCancel={() => navigate('/worlds')}
    />
  )
}
