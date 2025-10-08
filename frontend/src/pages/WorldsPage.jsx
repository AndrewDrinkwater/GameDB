import { useEffect, useState } from 'react'
import { fetchWorlds, createWorld, updateWorld } from '../api/worlds'
import ListViewer from '../components/ListViewer'
import FormRenderer from '../components/RecordForm/FormRenderer'
import newSchema from '../components/RecordForm/formSchemas/world.new.json'
import editSchema from '../components/RecordForm/formSchemas/world.edit.json'

export default function WorldsPage() {
  const [worlds, setWorlds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'new' | 'edit'
  const [selectedWorld, setSelectedWorld] = useState(null)

  // Load all worlds from API
  const loadWorlds = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetchWorlds()
      const list = Array.isArray(res.data) ? res.data : [] // ✅ fix for .map crash
      setWorlds(list)
    } catch (err) {
      console.error('❌ Failed to load worlds:', err)
      setError('Failed to load worlds. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorlds()
  }, [])

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'system', label: 'System' },
    { key: 'genre', label: 'Genre' },
    { key: 'description', label: 'Description' },
    { key: 'createdAt', label: 'Created' },
  ]

  const handleNew = () => setViewMode('new')

  const handleCancel = () => {
    setViewMode('list')
    setSelectedWorld(null)
  }

  const handleCreate = async (data) => {
    try {
      const res = await createWorld(data)
      if (res.success) {
        await loadWorlds()
        setViewMode('list')
      } else {
        alert(res.message || 'Failed to create world.')
      }
    } catch (err) {
      console.error('❌ Create world error:', err)
      alert('Error creating world.')
    }
  }

  const handleUpdate = async (data) => {
    try {
      const res = await updateWorld(selectedWorld.id, data)
      if (res.success) {
        await loadWorlds()
        setViewMode('list')
        setSelectedWorld(null)
      } else {
        alert(res.message || 'Failed to update world.')
      }
    } catch (err) {
      console.error('❌ Update world error:', err)
      alert('Error updating world.')
    }
  }

  if (loading) return <p>Loading worlds...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  if (viewMode === 'new')
    return (
      <FormRenderer
        schema={newSchema}
        onSubmit={handleCreate}
        onCancel={handleCancel}
      />
    )

  if (viewMode === 'edit')
    return (
      <FormRenderer
        schema={editSchema}
        initialData={selectedWorld}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
      />
    )

  return (
    <ListViewer
      data={worlds}
      columns={columns}
      title="Worlds"
      extraActions={
        <button className="new-btn" onClick={handleNew}>
          + New
        </button>
      }
      onRowClick={(row) => {
        setSelectedWorld(row)
        setViewMode('edit')
      }}
    />
  )
}
