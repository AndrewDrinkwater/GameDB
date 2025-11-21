import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bug, Sparkles } from 'lucide-react'
import { createRequest } from '../../api/requests.js'
import './CreateRequestPage.css'

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'bug',
    title: '',
    description: '',
    priority: '',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      const data = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority || null,
      }

      const response = await createRequest(data)
      if (response?.success && response?.data?.id) {
        navigate(`/requests/${response.data.id}`)
      } else {
        throw new Error('Failed to create request')
      }
    } catch (err) {
      console.error('Failed to create request', err)
      alert(err.message || 'Failed to create request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-request-page">
      <div className="create-request-page__header">
        <button onClick={() => navigate('/requests')} className="create-request-page__back">
          <ArrowLeft size={20} />
          Back to Requests
        </button>
        <h1>Create Request</h1>
      </div>

      <form onSubmit={handleSubmit} className="create-request-form">
        <div className="create-request-form__section">
          <label className="create-request-form__label">Type</label>
          <div className="create-request-form__type-options">
            <label className="create-request-form__type-option">
              <input
                type="radio"
                name="type"
                value="bug"
                checked={formData.type === 'bug'}
                onChange={handleChange}
              />
              <Bug size={20} />
              <span>Bug</span>
            </label>
            <label className="create-request-form__type-option">
              <input
                type="radio"
                name="type"
                value="feature"
                checked={formData.type === 'feature'}
                onChange={handleChange}
              />
              <Sparkles size={20} />
              <span>Feature</span>
            </label>
          </div>
        </div>

        <div className="create-request-form__section">
          <label htmlFor="title" className="create-request-form__label">
            Title <span className="create-request-form__required">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            className={`create-request-form__input ${errors.title ? 'create-request-form__input--error' : ''}`}
            placeholder="Brief description of the issue or feature"
            disabled={loading}
          />
          {errors.title && (
            <div className="create-request-form__error">{errors.title}</div>
          )}
        </div>

        <div className="create-request-form__section">
          <label htmlFor="description" className="create-request-form__label">
            Description <span className="create-request-form__required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={`create-request-form__textarea ${errors.description ? 'create-request-form__textarea--error' : ''}`}
            placeholder="Provide detailed information about the bug or feature request..."
            rows={8}
            disabled={loading}
          />
          {errors.description && (
            <div className="create-request-form__error">{errors.description}</div>
          )}
        </div>

        <div className="create-request-form__section">
          <label htmlFor="priority" className="create-request-form__label">
            Priority (optional)
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="create-request-form__select"
            disabled={loading}
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="create-request-form__actions">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="create-request-form__cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="create-request-form__submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </form>
    </div>
  )
}

