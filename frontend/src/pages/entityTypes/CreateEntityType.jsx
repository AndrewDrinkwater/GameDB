import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEntityType } from '../../api/entityTypes.js'
import FormRenderer from '../../components/RecordForm/FormRenderer.jsx'
import newSchema from '../../components/RecordForm/formSchemas/entityType.new.json'
import { useAuth } from '../../context/AuthContext.jsx'

export default function CreateEntityType() {
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const canManage = user?.role === 'system_admin'

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

  if (!canManage) {
    return (
      <section className="page limited-access">
        <h1>Create Entity Type</h1>
        <p>Only system administrators can create entity types.</p>
        <button type="button" className="btn cancel" onClick={() => navigate('/entity-types')}>
          Back to Entity Types
        </button>
      </section>
    )
  }

  const handleCancel = () => {
    navigate('/entity-types')
  }

  const handleSubmit = async (formData) => {
    if (submitting) {
      return false
    }

    const name = typeof formData?.name === 'string' ? formData.name.trim() : ''
    const description =
      typeof formData?.description === 'string' ? formData.description.trim() : ''

    if (!name) {
      alert('Name is required')
      return false
    }

    setSubmitting(true)
    try {
      const response = await createEntityType({ name, description })
      const created = response?.data ?? response

      if (!created || !created.id) {
        alert('Failed to create entity type')
        return false
      }

      navigate(`/entity-types/${created.id}/fields`)
      return true
    } catch (err) {
      alert(`Failed to create entity type: ${err.message}`)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page create-entity-type">
      {submitting && (
        <div className="form-status" role="status" aria-live="polite">
          Saving entity type...
        </div>
      )}
      <FormRenderer
        schema={newSchema}
        initialData={{}}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        showUpdateAction={false}
      />
    </section>
  )
}
