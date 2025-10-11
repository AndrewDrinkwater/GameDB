import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getRelationshipType, updateRelationshipType } from '../../api/entityRelationshipTypes.js'
import { getEntityTypes } from '../../api/entityTypes.js'
import { fetchWorlds } from '../../api/worlds.js'
import { useAuth } from '../../context/AuthContext.jsx'
import RelationshipTypeForm from './RelationshipTypeForm.jsx'

export default function EditRelationshipType() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user, token, sessionReady } = useAuth()
  const [entityTypes, setEntityTypes] = useState([])
  const [worlds, setWorlds] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [formError, setFormError] = useState('')
  const [initialValues, setInitialValues] = useState(null)
  const [loadingRecord, setLoadingRecord] = useState(true)
  const [recordError, setRecordError] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = useMemo(() => user?.role === 'system_admin', [user?.role])

  const loadOptions = useCallback(async () => {
    if (!token) return
    setLoadingOptions(true)
    setOptionsError('')
    try {
      const [typesResponse, worldsResponse] = await Promise.all([
        getEntityTypes(),
        fetchWorlds(),
      ])

      const typeList = Array.isArray(typesResponse?.data)
        ? typesResponse.data
        : Array.isArray(typesResponse)
          ? typesResponse
          : []

      const worldList = Array.isArray(worldsResponse?.data)
        ? worldsResponse.data
        : Array.isArray(worldsResponse)
          ? worldsResponse
          : []

      setEntityTypes(typeList)
      setWorlds(worldList)
    } catch (err) {
      console.error('❌ Failed to load relationship type options', err)
      setEntityTypes([])
      setWorlds([])
      setOptionsError(err.message || 'Failed to load supporting data')
    } finally {
      setLoadingOptions(false)
    }
  }, [token])

  const loadRecord = useCallback(async () => {
    if (!token || !id) return
    setLoadingRecord(true)
    setRecordError('')
    try {
      const response = await getRelationshipType(id)
      const data = response?.data ?? response
      if (!data) {
        throw new Error('Relationship type not found')
      }
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
    loadOptions()
    loadRecord()
  }, [sessionReady, token, loadOptions, loadRecord])

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

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

  const handleCancel = () => {
    navigate('/relationship-types')
  }

  const handleSubmit = async (payload) => {
    if (saving || !id) {
      return false
    }

    setFormError('')
    setSaving(true)
    try {
      const response = await updateRelationshipType(id, payload)
      const updated = response?.data ?? response

      if (!updated || !updated.id) {
        throw new Error('Failed to update relationship type')
      }

      navigate('/relationship-types', {
        state: {
          toast: { message: 'Relationship type updated', tone: 'success' },
        },
      })
      return true
    } catch (err) {
      console.error('❌ Failed to update relationship type', err)
      const message = err.message || 'Failed to update relationship type'
      setFormError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  if (loadingRecord) {
    return (
      <section className="page relationship-type-form-page">
        <h1>Edit Relationship Type</h1>
        <div className="form-status" role="status">
          Loading relationship type...
        </div>
      </section>
    )
  }

  if (recordError || !initialValues) {
    return (
      <section className="page relationship-type-form-page">
        <h1>Edit Relationship Type</h1>
        <div className="alert error" role="alert">
          {recordError || 'Relationship type not found.'}
        </div>
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

      {optionsError && (
        <div className="alert error" role="alert">
          {optionsError}
        </div>
      )}

      <RelationshipTypeForm
        initialValues={initialValues}
        entityTypes={entityTypes}
        worlds={worlds}
        saving={saving}
        optionsLoading={loadingOptions}
        errorMessage={formError}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </section>
  )
}
