import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  getLocationTypeFields,
  createLocationTypeField,
  updateLocationTypeField,
  deleteLocationTypeField,
} from '../../api/locationTypeFields.js'
import { fetchLocationTypeById, fetchLocationTypes } from '../../api/locationTypes.js'
import { getEntityTypes } from '../../api/entityTypes.js'
import LocationTypeFieldForm from './LocationTypeFieldForm.jsx'

const MANAGER_ROLES = new Set(['system_admin'])

const DATA_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  enum: 'Enum',
  entity_reference: 'Entity Reference',
  location_reference: 'Location Reference',
}

export default function LocationTypeFields() {
  const { id: typeId } = useParams()
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const [locationType, setLocationType] = useState(null)
  const [entityReferenceTypes, setEntityReferenceTypes] = useState([])
  const [locationReferenceTypes, setLocationReferenceTypes] = useState([])
  const [fields, setFields] = useState([])
  const [loadingType, setLoadingType] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [typeError, setTypeError] = useState('')
  const [fieldsError, setFieldsError] = useState('')
  const [fieldPanelOpen, setFieldPanelOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  const locationTypeName = locationType?.name || 'Location Type'

  const canManage = useMemo(() => {
    if (!locationType || !user) return false
    if (MANAGER_ROLES.has(user.role)) return true
    // Check if user is the world owner
    const worldOwnerId =
      locationType.world_owner_id ||
      locationType.world?.created_by ||
      ''
    return worldOwnerId && String(worldOwnerId) === String(user.id)
  }, [locationType, user])

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const normalizeResponse = (response) => {
    if (!response) return null
    if (Array.isArray(response)) return response
    if (response?.data) return response.data
    return response
  }

  const loadLocationType = useCallback(async () => {
    if (!typeId) return
    setLoadingType(true)
    setTypeError('')
    try {
      const response = await fetchLocationTypeById(typeId)
      const data = normalizeResponse(response)
      setLocationType(data)
    } catch (err) {
      console.error('❌ Failed to load location type details', err)
      setTypeError(err.message || 'Failed to load location type')
    } finally {
      setLoadingType(false)
    }
  }, [typeId])

  const loadReferenceTypes = useCallback(async (worldId) => {
    const trimmedWorldId = typeof worldId === 'string' ? worldId.trim() : worldId || ''
    if (!trimmedWorldId) {
      setEntityReferenceTypes([])
      setLocationReferenceTypes([])
      return
    }

    try {
      const [entityResponse, locationResponse] = await Promise.all([
        getEntityTypes({ worldId: trimmedWorldId }).catch((err) => {
          console.error('❌ Failed to load entity types', err)
          return null
        }),
        fetchLocationTypes({ worldId: trimmedWorldId }).catch((err) => {
          console.error('❌ Failed to load location types', err)
          return null
        }),
      ])

      const entityList = entityResponse ? normalizeResponse(entityResponse) : []
      const locationList = locationResponse ? normalizeResponse(locationResponse) : []

      setEntityReferenceTypes(Array.isArray(entityList) ? entityList : [])
      setLocationReferenceTypes(Array.isArray(locationList) ? locationList : [])
    } catch (err) {
      console.error('❌ Failed to load reference types', err)
      setEntityReferenceTypes([])
      setLocationReferenceTypes([])
    }
  }, [])

  const loadFields = useCallback(async () => {
    if (!typeId) return
    setLoadingFields(true)
    setFieldsError('')
    try {
      const response = await getLocationTypeFields(typeId)
      const list = normalizeResponse(response)
      setFields(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('❌ Failed to load fields', err)
      setFieldsError(err.message || 'Failed to load fields')
      setFields([])
    } finally {
      setLoadingFields(false)
    }
  }, [typeId])

  useEffect(() => {
    if (!sessionReady || !token) return
    loadLocationType()
    loadFields()
  }, [sessionReady, token, loadLocationType, loadFields])

  useEffect(() => {
    if (!locationType) {
      setEntityReferenceTypes([])
      setLocationReferenceTypes([])
      return
    }
    const worldId =
      locationType?.world_id || locationType?.worldId || locationType?.world?.id || ''
    loadReferenceTypes(worldId)
  }, [locationType, locationType?.world_id, locationType?.worldId, locationType?.world?.id, loadReferenceTypes])

  const openCreate = () => {
    if (!canManage) return
    setEditingField(null)
    setFormError('')
    setFieldPanelOpen(true)
  }

  const openEdit = (field) => {
    if (!canManage) return
    setEditingField(field)
    setFormError('')
    setFieldPanelOpen(true)
  }

  const closePanel = () => {
    setFieldPanelOpen(false)
    setEditingField(null)
    setFormError('')
  }

  const handleSave = async (values) => {
    if (!canManage) return false
    try {
      setSaving(true)
      setFormError('')
      if (editingField?.id) {
        await updateLocationTypeField(editingField.id, values)
        showToast('Field updated', 'success')
      } else {
        await createLocationTypeField(typeId, values)
        showToast('Field created', 'success')
      }
      closePanel()
      await loadFields()
    } catch (err) {
      console.error('❌ Failed to save field', err)
      const message = err.message || 'Failed to save field'
      setFormError(message)
      showToast(message, 'error')
      return false
    } finally {
      setSaving(false)
    }
    return true
  }

  const handleDelete = async (field) => {
    if (!canManage || !field?.id) return
    const confirmed = window.confirm(
      `Delete field "${field.label || field.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(field.id)
      await deleteLocationTypeField(field.id)
      showToast('Field deleted', 'success')
      await loadFields()
    } catch (err) {
      console.error('❌ Failed to delete field', err)
      showToast(err.message || 'Failed to delete field', 'error')
    } finally {
      setDeletingId('')
    }
  }

  const formatEnumOptions = (field) => {
    if (!field) return '—'
    const { options } = field
    if (!options) return '—'
    if (Array.isArray(options.choices) && options.choices.length > 0) {
      return options.choices.join(', ')
    }
    return '—'
  }

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

  if (loadingType) {
    return <p>Loading location type...</p>
  }

  if (typeError || !locationType) {
    return (
      <div className="page-container">
        <div className="alert error">{typeError || 'Location type not found'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/location-types')}>
          <ArrowLeft size={16} /> Back to Location Types
        </button>
      </div>
    )
  }

  return (
    <section className="entity-types-page">
      <div className="entity-types-header">
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/location-types')}
            style={{ marginBottom: '1rem' }}
          >
            <ArrowLeft size={16} /> Back to Location Types
          </button>
          <h1>Fields: {locationTypeName}</h1>
          <p className="entity-types-subtitle">
            Define custom metadata fields for locations of this type
          </p>
        </div>

        <button
          type="button"
          className="btn submit"
          onClick={openCreate}
          disabled={!canManage || saving || deletingId}
        >
          <Plus size={18} /> Add Field
        </button>
      </div>

      {!canManage && (
        <div className="alert info" role="status">
          You can view the existing fields, but only system administrators or the world owner can
          make changes.
        </div>
      )}

      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}

      {fieldsError && (
        <div className="alert error" role="alert">
          {fieldsError}
        </div>
      )}

      <div className="entity-types-table-wrapper">
        {loadingFields ? (
          <div className="empty-state">Loading fields...</div>
        ) : fields.length === 0 ? (
          <div className="empty-state">No fields defined yet. Add your first field to get started.</div>
        ) : (
          <table className="entity-types-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Label</th>
                <th>Data Type</th>
                <th>Required</th>
                <th>Visible by Default</th>
                <th>Options</th>
                <th>Reference Type</th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id}>
                  <td>{field.name}</td>
                  <td>{field.label || field.name}</td>
                  <td>{DATA_TYPE_LABELS[field.data_type] || field.data_type}</td>
                  <td>{field.required ? 'Yes' : 'No'}</td>
                  <td>{field.visible_by_default !== false ? 'Yes' : 'No'}</td>
                  <td>{formatEnumOptions(field)}</td>
                  <td>{field.referenceType?.name || '—'}</td>
                  <td className="actions-column">
                    <div className="entity-type-actions">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit field"
                            onClick={() => openEdit(field)}
                            disabled={saving || deletingId === field.id}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Delete field"
                            onClick={() => handleDelete(field)}
                            disabled={deletingId === field.id || saving}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {fieldPanelOpen && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{editingField ? 'Edit Field' : 'Add Field'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={closePanel}
                title="Close form"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-content">
              <LocationTypeFieldForm
                initialData={editingField}
                onSubmit={handleSave}
                onCancel={closePanel}
                submitting={saving}
                errorMessage={formError}
                entityReferenceTypes={entityReferenceTypes}
                locationReferenceTypes={locationReferenceTypes}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

