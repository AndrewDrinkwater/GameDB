import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchCharacters,
  createCharacter,
  updateCharacter,
  removeCharacter,
} from '../api/characters'
import ListViewer from '../components/ListViewer'
import FormRenderer from '../components/RecordForm/FormRenderer'
import newSchema from '../components/RecordForm/formSchemas/character.new.json'
import editSchema from '../components/RecordForm/formSchemas/character.edit.json'

const mapToFormValues = (character = {}) => ({
  id: character.id,
  name: character.name || '',
  race: character.race || '',
  class: character.class || '',
  level: character.level ?? 1,
  alignment: character.alignment || '',
  notes: character.notes || '',
  is_active: character.is_active ?? true,
  campaign_id: character.campaign_id || '',
  user_id: character.user_id || '',
})

const toPayload = (formData = {}) => {
  const level = Number(formData.level)
  return {
    name: formData.name,
    race: formData.race || null,
    class: formData.class || null,
    level: Number.isNaN(level) ? 1 : level,
    alignment: formData.alignment || null,
    notes: formData.notes || null,
    is_active: !!formData.is_active,
    campaign_id: formData.campaign_id || null,
    user_id: formData.user_id || null,
  }
}

export default function CharactersPage() {
  const { token, sessionReady } = useAuth()
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const loadCharacters = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCharacters()
      const list = (res?.data || res || []).map((item) => ({
        ...item,
        playerName: item.player?.username || '',
        campaignName: item.campaign?.name || '',
        status: item.is_active ? 'Active' : 'Inactive',
        formValues: mapToFormValues(item),
      }))
      setCharacters(list)
    } catch (err) {
      console.error('❌ Failed to load characters:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (sessionReady && token) loadCharacters()
  }, [sessionReady, token, loadCharacters])

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'class', label: 'Class' },
    { key: 'level', label: 'Level' },
    { key: 'race', label: 'Race' },
    { key: 'alignment', label: 'Alignment' },
    { key: 'playerName', label: 'Player' },
    { key: 'campaignName', label: 'Campaign' },
    { key: 'status', label: 'Status' },
  ]

  const handleNew = () => {
    setViewMode('new')
    setSelectedCharacter(null)
    setEditingId(null)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedCharacter(null)
    setEditingId(null)
  }

  const handleCreate = async (formData) => {
    try {
      await createCharacter(toPayload(formData))
      setViewMode('list')
      setSelectedCharacter(null)
      await loadCharacters()
    } catch (err) {
      alert(`Error creating character: ${err.message}`)
    }
  }

  const handleUpdate = async (formData) => {
    if (!editingId) return
    try {
      await updateCharacter(editingId, toPayload(formData))
      setViewMode('list')
      setSelectedCharacter(null)
      setEditingId(null)
      await loadCharacters()
    } catch (err) {
      alert(`Error updating character: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    if (!confirm('Delete this character?')) return
    try {
      await removeCharacter(editingId)
      setViewMode('list')
      setSelectedCharacter(null)
      setEditingId(null)
      await loadCharacters()
    } catch (err) {
      alert(`Error deleting character: ${err.message}`)
    }
  }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading characters...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (viewMode === 'new') {
    return (
      <FormRenderer
        schema={newSchema}
        initialData={{ level: 1, is_active: true }}
        onSubmit={handleCreate}
        onCancel={handleCancel}
      />
    )
  }

  if (viewMode === 'edit') {
    return (
      <FormRenderer
        schema={editSchema}
        initialData={selectedCharacter || {}}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <ListViewer
      data={characters}
      columns={columns}
      title="Characters"
      extraActions={
        <button type="button" className="btn submit" onClick={handleNew}>
          + New
        </button>
      }
      onRowClick={(row) => {
        setSelectedCharacter(row.formValues || mapToFormValues(row))
        setEditingId(row.id)
        setViewMode('edit')
      }}
    />
  )
}
