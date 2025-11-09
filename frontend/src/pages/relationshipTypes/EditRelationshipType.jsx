import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRelationshipType, updateRelationshipType } from '../../api/entityRelationshipTypes.js'
import { getEntityTypes } from '../../api/entityTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import RelationshipTypeForm from './RelationshipTypeForm.jsx'

export default function EditRelationshipType() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign } = useCampaignContext()
  const [entityTypes, setEntityTypes] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [formError, setFormError] = useState('')
  const [initialValues, setInitialValues] = useState(null)
  const [loadingRecord, setLoadingRecord] = useState(true)
  const [recordError, setRecordError] = useState('')
  const [saving, setSaving] = useState(false)

  const isSystemAdmin = user?.role === 'system_admin'
  const isSelectedWorldOwner = useMemo(() => {
    if (!selectedCampaign || !user) return false
    const worldOwnerId =
      selectedCampaign.world?.created_by ??
      selectedCampaign.world?.creator?.id ??
      selectedCampaign.world?.owner_id ??
      selectedCampaign.world?.owner?.id ??
      ''
    if (!worldOwnerId) return false
    return worldOwnerId === user.id
  }, [selectedCampaign, user])

  const canManage = useMemo(
    () => Boolean(isSystemAdmin || isSelectedWorldOwner),
    [isSystemAdmin, isSelectedWorldOwner],
  )
  const selectedWorldId = selectedCampaign?.world?.id ?? ''
  const selectedWorldName = selectedCampaign?.world?.name ?? ''

  const recordWorld = useMemo(() => {
    if (!initialValues) return null
    const id =
      initialValues?.world?.id ||
      initialValues?.world_id ||
      initialValues?.worldId ||
      ''
    if (!id) return null
    const name =
      initialValues?.world?.name ||
      initialValues?.world_name ||
      initialValues?.worldName ||
      ''
    return {
      id,
      name: name || 'Untitled world',
    }
  }, [initialValues])

  const [worldOptions, setWorldOptions] = useState([])

  useEffect(() => {
    const options = []
    if (selectedWorldId) {
      options.push({ id: selectedWorldId, name: selectedWorldName || 'Untitled world' })
    }
    if (recordWorld && !options.some((option) => option.id === recordWorld.id)) {
      options.push(recordWorld)
    }
    setWorldOptions(options)
  }, [selectedWorldId, selectedWorldName, recordWorld])

  const loadOptions = useCallback(async () => {
    if (!token) return
    setLoadingOptions(true)
    setOptionsError('')
    try {
      const worldToUse =
        selectedWorldId ||
        recordWorld?.id ||
        initialValues?.world?.id ||
        initialValues?.world_id ||
        ''

      if (!worldToUse) {
        setEntityTypes([])
        setOptionsError(
          'Select a campaign to choose a world context before editing relationship types.',
        )
        return
      }

      const typesResponse = await getEntityTypes({ worldId: worldToUse })

      const typeList = Array.isArray(typesResponse?.data)
        ? typesResponse.data
        : Array.isArray(typesResponse)
          ? typesResponse
          : []

      setEntityTypes(typeList)
    } catch (err) {
      console.error('❌ Failed to load relationship type options', err)
      setEntityTypes([])
      setOptionsError(err.message || 'Failed to load supporting data')
    } finally {
      setLoadingOptions(false)
    }
  }, [token, selectedWorldId, recordWorld, initialValues])

  const loadRecord = useCallback(async () => {
    if (!token || !id) return
    setLoadingRecord(true)
    setRecordError('')
    try {
      const response = await getRelationshipType(id)
      const data = response?.data ?? response
      if (!data) throw new Error('Relationship type not found')
      setInitialValues(data)
    } catch (err) {
      console.error('❌ Failed to load relationship type', err)
      setRecordError(err.message || 'Failed to load relationship type')
      setInitialValues(null)
    } finally {
      setLoadingRecord(false)
    }
  }, [id, token])

  useEffect(() => {
    if (!sessionReady || !token) return
    loadRecord()
  }, [sessionReady, token, loadRecord])

  useEffect(() => {
    if (!sessionReady || !token) return
    if (loadingRecord) return
    loadOptions()
  }, [sessionReady, token, loadingRecord, loadOptions])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  if (!canManage) {
    return (
      <section className="page relationship-type-form-page limited-access">
        <h1>Edit Relationship Type</h1>
        <p>Only system administrators can edit relationship types.</p>
        <button type="button" className="btn cancel" onClick={() => navigate('/relationship-types')}>
          Back to Relationship Types
        </button>
      </section>
    )
  }

  const handleCancel = () => navigate('/relationship-types')

  const handleSubmit = async (payload) => {
    if (saving || !id) return false

    setFormError('')
    setSaving(true)

    try {
      // ✅ Ensure world_id is always present
      const finalPayload = {
        ...payload,
        world_id:
          payload.world_id ||
          payload.worldId ||
          payload.selectedWorldId ||
          payload.world?.id ||
          selectedWorldId ||
          initialValues?.world_id,
      }

      if (!finalPayload.world_id) {
        throw new Error('A world must be selected before saving changes')
      }

      const response = await updateRelationshipType(id, finalPayload)
      const updated = response?.data ?? response

      if (!updated || !updated.id) {
        throw new Error('Failed to update relationship type')
      }

      navigate('/relationship-types', {
        state: { toast: { message: 'Relationship type updated', tone: 'success' } },
      })
      return true
    } catch (err) {
      console.error('❌ Failed to update relationship type', err)
      setFormError(err.message || 'Failed to update relationship type')
      return false
    } finally {
      setSaving(false)
    }
  }

  if (loadingRecord) {
    return (
      <section className="page relationship-type-form-page">
        <h1>Edit Relationship Type</h1>
        <div className="form-status">Loading relationship type...</div>
      </section>
    )
  }

  if (recordError || !initialValues) {
    return (
      <section className="page relationship-type-form-page">
        <h1>Edit Relationship Type</h1>
        <div className="alert error">{recordError || 'Relationship type not found.'}</div>
        <button type="button" className="btn cancel" onClick={() => navigate('/relationship-types')}>
          Back to Relationship Types
        </button>
      </section>
    )
  }

  return (
    <section className="page relationship-type-form-page">
      <h1>Edit Relationship Type</h1>
      <p className="page-subtitle">
        Update the directional labels or allowed entity types for this relationship.
      </p>

      {optionsError && <div className="alert error">{optionsError}</div>}

      <RelationshipTypeForm
        initialValues={initialValues}
        entityTypes={entityTypes}
        worlds={worldOptions}
        saving={saving}
        optionsLoading={loadingOptions}
        errorMessage={formError}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </section>
  )
}
