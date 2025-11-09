import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRelationshipType } from '../../api/entityRelationshipTypes.js'
import { getEntityTypes } from '../../api/entityTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import RelationshipTypeForm from './RelationshipTypeForm.jsx'

export default function CreateRelationshipType() {
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign } = useCampaignContext()
  const [entityTypes, setEntityTypes] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = useMemo(() => user?.role === 'system_admin', [user?.role])
  const worldId = selectedCampaign?.world?.id ?? ''
  const worldOptions = useMemo(() => {
    if (!selectedCampaign?.world?.id) return []
    const world = selectedCampaign.world
    return [
      {
        id: world.id,
        name: world.name || 'Untitled world',
      },
    ]
  }, [selectedCampaign])

  const loadOptions = useCallback(async () => {
    if (!token || !worldId) {
      setEntityTypes([])
      setOptionsError('Select a campaign to choose a world context before creating relationship types.')
      return
    }
    setLoadingOptions(true)
    setOptionsError('')
    try {
      const typesResponse = await getEntityTypes({ worldId })

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
  }, [token, worldId])

  useEffect(() => {
    if (!sessionReady || !token) return
    loadOptions()
  }, [sessionReady, token, loadOptions])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  if (!canManage) {
    return (
      <section className="page relationship-type-form-page limited-access">
        <h1>Create Relationship Type</h1>
        <p>Only system administrators can create relationship types.</p>
        <button
          type="button"
          className="btn cancel"
          onClick={() => navigate('/relationship-types')}
        >
          Back to Relationship Types
        </button>
      </section>
    )
  }

  if (!worldId) {
    return (
      <section className="page relationship-type-form-page">
        <h1>Create Relationship Type</h1>
        <p>Select a campaign from the header to choose a world context before creating relationship types.</p>
        <button
          type="button"
          className="btn cancel"
          onClick={() => navigate('/relationship-types')}
        >
          Back to Relationship Types
        </button>
      </section>
    )
  }

  const handleCancel = () => navigate('/relationship-types')

  const handleSubmit = async (payload) => {
    if (saving) return false
    setFormError('')
    setSaving(true)

    try {
      // ✅ Build clean, backend-ready payload
      const finalPayload = {
        ...payload,
        world_id: payload.world_id ?? payload.worldId ?? payload.world?.id ?? worldId,
      }

      if (!finalPayload.world_id) {
        throw new Error('A world must be selected before creating a relationship type')
      }

      console.log('🧩 Final payload being sent:', finalPayload)

      const response = await createRelationshipType(finalPayload)
      const created = response?.data ?? response

      if (!created || !created.id) {
        throw new Error('Failed to create relationship type')
      }

      navigate('/relationship-types', {
        state: { toast: { message: 'Relationship type created', tone: 'success' } },
      })
      return true
    } catch (err) {
      console.error('❌ Failed to create relationship type', err)
      setFormError(err.message || 'Failed to create relationship type')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page relationship-type-form-page">
      <h1>Create Relationship Type</h1>
      <p className="page-subtitle">
        Define the directional names and allowed entity types for this relationship.
      </p>

      {optionsError && <div className="alert error">{optionsError}</div>}

      <RelationshipTypeForm
        initialValues={{ world_id: worldId }}
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
