import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  createField,
  deleteField,
  getFields,
  updateField,
} from '../../api/entityTypeFields.js'
import { getEntityType, getEntityTypes } from '../../api/entityTypes.js'
import EntityTypeFieldForm from './EntityTypeFieldForm.jsx'

const MANAGER_ROLES = new Set(['system_admin'])
const DATA_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  enum: 'Enum',
  reference: 'Reference',
}

export default function EntityTypeFields() {
  const { id: typeId } = useParams()
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const [entityType, setEntityType] = useState(null)
  const [referenceTypes, setReferenceTypes] = useState([])
  const [fields, setFields] = useState([])
  const [loadingType, setLoadingType] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [typeError, setTypeError] = useState('')
  const [fieldsError, setFieldsError] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  const entityTypeName = entityType?.name || 'Entity Type'

  const canManage = useMemo(() => {
    if (!entityType || !user) return false
    if (MANAGER_ROLES.has(user.role)) return true
    if (entityType.world_owner_id && entityType.world_owner_id === user.id) return true
    if (entityType.created_by && entityType.created_by === user.id) return true
    if (Array.isArray(entityType.managers)) {
      return entityType.managers.some((managerId) => managerId === user.id)
    }
    return false
  }, [entityType, user])

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

  const loadEntityType = useCallback(async () => {
    if (!typeId) return
    setLoadingType(true)
    setTypeError('')
    try {
      const response = await getEntityType(typeId)
      const data = normalizeResponse(response)
      setEntityType(data)
    } catch (err) {
      console.error('❌ Failed to load entity type details', err)
      setTypeError(err.message || 'Failed to load entity type')
    } finally {
      setLoadingType(false)
    }
  }, [typeId])

  const loadReferenceTypes = useCallback(async () => {
    try {
      const response = await getEntityTypes()
      const list = normalizeResponse(response)
      if (Array.isArray(list)) {
        setReferenceTypes(list)
      } else {
        setReferenceTypes([])
      }
    } catch (err) {
      console.error('❌ Failed to load reference types', err)
      setReferenceTypes([])
    }
  }, [])

  const loadFields = useCallback(async () => {
    if (!typeId) return
    setLoadingFields(true)
    setFieldsError('')
    try {
      const response = await getFields(typeId)
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
    loadEntityType()
    loadFields()
    loadReferenceTypes()
  }, [sessionReady, token, loadEntityType, loadFields, loadReferenceTypes])

  useEffect(() => {
    if (!sessionReady) return
    if (!token) {
      navigate('/login')
    }
  }, [sessionReady, token, navigate])

  const openCreate = () => {
    if (!canManage) return
    setEditingField(null)
    setFormError('')
    setPanelOpen(true)
  }

  const openEdit = (field) => {
    if (!canManage) return
    setEditingField(field)
    setFormError('')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingField(null)
    setFormError('')
  }

  const handleSave = async (values) => {
    if (!canManage) return false
    try {
      setSaving(true)
      setFormError('')
      if (editingField?.id) {
        await updateField(editingField.id, values)
        showToast('Field updated', 'success')
      } else {
        await createField(typeId, values)
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
      await deleteField(field.id)
      showToast('Field deleted', 'success')
      await loadFields()
    } catch (err) {
      console.error('❌ Failed to delete field', err)
      showToast(err.message || 'Failed to delete field', 'error')
    } finally {
      setDeletingId('')
    }
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const referenceTypeNameMap = useMemo(() => {
    const map = new Map()
    referenceTypes.forEach((type) => {
      if (type?.id) {
        map.set(type.id, type.name)
      }
    })
    return map
  }, [referenceTypes])

  const combinedError = typeError || fieldsError

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

  return (
    <section className="entity-type-fields-page">
      <div className="entity-type-fields-header">
        <div className="entity-type-fields-heading">
          <button
            type="button"
            className="link-button"
            onClick={() => navigate('/entity-types')}
          >
            <ArrowLeft size={16} /> Back to Entity Types
          </button>
          <h1>Fields for {entityTypeName}</h1>
          {entityType?.world_name && (
            <p className="entity-type-fields-subtitle">World: {entityType.world_name}</p>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            className="btn submit"
            onClick={openCreate}
            disabled={saving || deletingId}
          >
            <Plus size={18} /> Add Field
          </button>
        )}
      </div>

      {!canManage && (
        <div className="alert info" role="status">
          You can view these fields, but only the world owner or system administrators can
          make changes.
        </div>
      )}

      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}

      {combinedError && (
        <div className="alert error" role="alert">
          {combinedError}
        </div>
      )}

      <div className="entity-types-table-wrapper">
        {loadingType || loadingFields ? (
          <div className="empty-state">Loading fields...</div>
        ) : fields.length === 0 ? (
          <div className="empty-state">No custom fields defined yet.</div>
        ) : (
          <table className="entity-types-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Label</th>
                <th>Data Type</th>
                <th>Reference Type</th>
                <th>Required</th>
                <th>Created</th>
                {canManage && <th className="actions-column">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const createdAt = field.createdAt || field.created_at
                const referenceName =
                  field.reference_type_name || referenceTypeNameMap.get(field.reference_type_id)
                const dataTypeLabel = DATA_TYPE_LABELS[field.data_type] || field.data_type
                return (
                  <tr key={field.id}>
                    <td>{field.name}</td>
                    <td>{field.label || '—'}</td>
                    <td>{dataTypeLabel}</td>
                    <td>{referenceName || (field.data_type === 'reference' ? '—' : 'N/A')}</td>
                    <td>{field.required ? 'Yes' : 'No'}</td>
                    <td>{formatDate(createdAt)}</td>
                    {canManage && (
                      <td className="actions-column">
                        <div className="entity-type-actions">
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
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="entity-type-cards">
        {loadingType || loadingFields ? (
          <div className="card-placeholder">Loading fields...</div>
        ) : fields.length === 0 ? (
          <div className="card-placeholder">No custom fields defined yet.</div>
        ) : (
          fields.map((field) => {
            const createdAt = field.createdAt || field.created_at
            const referenceName =
              field.reference_type_name || referenceTypeNameMap.get(field.reference_type_id)
            const dataTypeLabel = DATA_TYPE_LABELS[field.data_type] || field.data_type
            return (
              <div className="entity-type-card" key={`field-card-${field.id}`}>
                <div className="card-header">
                  <h3>{field.label || field.name}</h3>
                  {canManage && (
                    <div className="entity-type-actions">
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
                    </div>
                  )}
                </div>
                <dl className="field-card-metadata">
                  <div>
                    <dt>Field Name</dt>
                    <dd>{field.name}</dd>
                  </div>
                  <div>
                    <dt>Data Type</dt>
                    <dd>{dataTypeLabel}</dd>
                  </div>
                  <div>
                    <dt>Required</dt>
                    <dd>{field.required ? 'Yes' : 'No'}</dd>
                  </div>
                  {field.data_type === 'enum' && (
                    <div>
                      <dt>Options</dt>
                      <dd>{field.options || '—'}</dd>
                    </div>
                  )}
                  {field.data_type === 'reference' && (
                    <div>
                      <dt>Reference Type</dt>
                      <dd>{referenceName || '—'}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(createdAt)}</dd>
                  </div>
                </dl>
              </div>
            )
          })
        )}
      </div>

      {panelOpen && (
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
              <EntityTypeFieldForm
                initialData={editingField}
                referenceTypes={referenceTypes.filter((type) => type.id !== entityType?.id)}
                onSubmit={handleSave}
                onCancel={closePanel}
                submitting={saving}
                errorMessage={formError}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
