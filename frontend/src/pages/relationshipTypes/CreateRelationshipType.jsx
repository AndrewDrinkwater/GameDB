import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRelationshipType } from '../../api/entityRelationshipTypes.js'
import { getEntityTypes } from '../../api/entityTypes.js'
import { fetchWorlds } from '../../api/worlds.js'
import { useAuth } from '../../context/AuthContext.jsx'
import RelationshipTypeForm from './RelationshipTypeForm.jsx'

export default function CreateRelationshipType() {
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const [entityTypes, setEntityTypes] = useState([])
  const [worlds, setWorlds] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const [formError, setFormError] = useState('')
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

  useEffect(() => {
    if (!sessionReady || !token) return
    loadOptions()
  }, [sessionReady, token, loadOptions])

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

  if (!canManage) {
    return (
      <section className="page relationship-type-form-page limited-access">
        <h1>Create Relationship Type</h1>
        <p>Only system administrators can create relationship types.</p>
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
    if (saving) {
      return false
    }

    setFormError('')
    setSaving(true)
    try {
      const response = await createRelationshipType(payload)
      const created = response?.data ?? response

      if (!created || !created.id) {
        throw new Error('Failed to create relationship type')
      }

      navigate('/relationship-types', {
        state: {
          toast: { message: 'Relationship type created', tone: 'success' },
        },
      })
      return true
    } catch (err) {
      console.error('❌ Failed to create relationship type', err)
      const message = err.message || 'Failed to create relationship type'
      setFormError(message)
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

      {optionsError && (
        <div className="alert error" role="alert">
          {optionsError}
        </div>
      )}

      <RelationshipTypeForm
        initialValues={{}}
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
