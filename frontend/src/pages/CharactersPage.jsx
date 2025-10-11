import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCampaignContext } from '../context/CampaignContext.jsx'
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

export default function CharactersPage({ scope = 'my' }) {
  const navigate = useNavigate()
  const { id: routeId } = useParams()
  const { token, sessionReady, user } = useAuth()
  const { selectedCampaign, selectedCampaignId } = useCampaignContext()
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const basePath = useMemo(() => `/characters/${scope}`, [scope])

  const isPlayerInSelectedCampaign = useMemo(() => {
    if (!selectedCampaign || !Array.isArray(selectedCampaign.members)) return false
    if (!user?.id) return false

    return selectedCampaign.members.some(
      (member) => member?.user_id === user.id && member?.role === 'player',
    )
  }, [selectedCampaign, user])

  const title = useMemo(() => {
    switch (scope) {
      case 'my':
        return 'My Characters'
      case 'others':
        return 'All Characters'
      case 'all':
        return 'All Characters'
      case 'companions':
        return selectedCampaign?.name
          ? `My Companions – ${selectedCampaign.name}`
          : 'My Companions'
      default:
        return 'Characters'
    }
  }, [scope, selectedCampaign])

  const canCreate = scope === 'my' || user?.role === 'system_admin'

  useEffect(() => {
    if (scope === 'all' && user && user.role !== 'system_admin') {
      navigate('/characters/my', { replace: true })
    }
  }, [scope, user, navigate])

  useEffect(() => {
    setViewMode('list')
    setSelectedCharacter(null)
    setEditingId(null)
  }, [scope])

  useEffect(() => {
    if (!routeId) {
      if (viewMode !== 'new') setViewMode('list')
      setSelectedCharacter(null)
      setEditingId(null)
      return
    }

    const found = characters.find((character) => String(character.id) === routeId)
    if (!found) {
      if (!loading) navigate(basePath, { replace: true })
      return
    }

    const canEdit = found.isOwned || user?.role === 'system_admin'
    if (!canEdit) {
      navigate(basePath, { replace: true })
      return
    }

    setSelectedCharacter(found.formValues || mapToFormValues(found))
    setEditingId(found.id)
    setViewMode('edit')
  }, [routeId, characters, user, navigate, basePath, loading, viewMode])

  const loadCharacters = useCallback(async () => {
    if (!token) return
    if (scope === 'all' && user && user.role !== 'system_admin') return

    if (scope === 'companions') {
      if (!selectedCampaignId) {
        setCharacters([])
        setError('Select a campaign to view your companions.')
        return
      }

      if (!isPlayerInSelectedCampaign) {
        setCharacters([])
        setError('You must be a player in the selected campaign to view companions.')
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const params = { scope }

      if (scope === 'companions') {
        params.campaign_id = selectedCampaignId
      }

      const res = await fetchCharacters(params)
      const list = (res?.data || res || []).map((item) => ({
        ...item,
        playerName: item.player?.username || '',
        campaignName: item.campaign?.name || '',
        status: item.is_active ? 'Active' : 'Inactive',
        formValues: mapToFormValues(item),
        isOwned: item.user_id === user?.id,
      }))
      setCharacters(list)
    } catch (err) {
      console.error('❌ Failed to load characters:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [
    token,
    scope,
    user,
    selectedCampaignId,
    isPlayerInSelectedCampaign,
  ])

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
    if (!canCreate) return
    navigate(basePath)
    setViewMode('new')
    setSelectedCharacter(null)
    setEditingId(null)
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedCharacter(null)
    setEditingId(null)
    navigate(basePath)
  }

  const handleCreate = async (formData) => {
    try {
      await createCharacter(toPayload(formData))
      setViewMode('list')
      setSelectedCharacter(null)
      navigate(basePath)
      await loadCharacters()
      return true
    } catch (err) {
      alert(`Error creating character: ${err.message}`)
      return false
    }
  }

  const handleUpdate = async (formData, options = {}) => {
    const { stayOnPage = false } = options
    if (!editingId) return false
    try {
      const response = await updateCharacter(editingId, toPayload(formData))
      const updatedRecord = response?.data || response || { id: editingId }

      await loadCharacters()

      if (stayOnPage) {
        const nextValues =
          updatedRecord && typeof updatedRecord === 'object'
            ? mapToFormValues(updatedRecord)
            : mapToFormValues({ ...formData, id: editingId })
        setSelectedCharacter(nextValues)
        return { message: 'Character updated successfully.' }
      }

      setViewMode('list')
      setSelectedCharacter(null)
      setEditingId(null)
      navigate(basePath)
      return true
    } catch (err) {
      alert(`Error updating character: ${err.message}`)
      return false
    }
  }

  const handleDelete = async () => {
    if (!editingId) return false
    if (!confirm('Delete this character?')) return false
    try {
      await removeCharacter(editingId)
      setViewMode('list')
      setSelectedCharacter(null)
      setEditingId(null)
      navigate(basePath)
      await loadCharacters()
      return true
    } catch (err) {
      alert(`Error deleting character: ${err.message}`)
      return false
    }
  }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (loading) return <p>Loading characters...</p>
  if (error) return <p className="error">{error}</p>

  if (viewMode === 'new') {
    return (
      <FormRenderer
        schema={newSchema}
        initialData={{
          level: 1,
          is_active: true,
          user_id:
            user?.role === 'system_admin' ? '' : user?.id || '',
        }}
        onSubmit={handleCreate}
        onCancel={handleCancel}
        showUpdateAction={false}
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
      title={title}
      extraActions={
        canCreate ? (
          <button type="button" className="btn submit" onClick={handleNew}>
            + New
          </button>
        ) : null
      }
      onRowClick={(row) => {
        const isOwner = row.isOwned || user?.role === 'system_admin'
        if (!isOwner) return
        navigate(`${basePath}/${row.id}`)
        setSelectedCharacter(row.formValues || mapToFormValues(row))
        setEditingId(row.id)
        setViewMode('edit')
      }}
    />
  )
}
