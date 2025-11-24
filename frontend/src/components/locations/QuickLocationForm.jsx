import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createLocation } from '../../api/locations.js'
import { fetchLocationTypes } from '../../api/locationTypes.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import './QuickLocationForm.css'

export default function QuickLocationForm({
  parentId = null,
  onClose,
  onSuccess,
  locationTypes = [],
}) {
  const { activeWorldId } = useCampaignContext()
  const [formData, setFormData] = useState({
    name: '',
    location_type_id: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [availableTypes, setAvailableTypes] = useState(locationTypes)

  useEffect(() => {
    if (locationTypes.length > 0) {
      setAvailableTypes(locationTypes)
    } else if (activeWorldId) {
      // Load location types if not provided
      fetchLocationTypes({ worldId: activeWorldId })
        .then((res) => {
          setAvailableTypes(res?.data || [])
        })
        .catch((err) => {
          console.error('Failed to load location types:', err)
        })
    }
  }, [activeWorldId, locationTypes])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        world_id: activeWorldId,
        name: formData.name.trim(),
        location_type_id: formData.location_type_id || null,
        parent_id: parentId || null,
        description: formData.description?.trim() || null,
      }

      if (!payload.name) {
        throw new Error('Name is required')
      }

      if (!payload.location_type_id) {
        throw new Error('Location type is required')
      }

      const result = await createLocation(payload)
      const locationData = result?.data || result

      if (onSuccess) {
        onSuccess(locationData)
      }

      // Reset form
      setFormData({
        name: '',
        location_type_id: '',
        description: '',
      })
    } catch (err) {
      console.error('Failed to create location:', err)
      setError(err.message || 'Failed to create location')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="quick-location-form">
      <div className="quick-location-form__header">
        <h3>{parentId ? 'Add Child Location' : 'Add Location'}</h3>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close form"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="quick-location-form__body">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="quick-name">Name *</label>
          <input
            type="text"
            id="quick-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
            placeholder="Enter location name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="quick-type">Type *</label>
          <select
            id="quick-type"
            value={formData.location_type_id}
            onChange={(e) =>
              setFormData({ ...formData, location_type_id: e.target.value })
            }
            required
          >
            <option value="">Select a type...</option>
            {availableTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="quick-description">Description</label>
          <textarea
            id="quick-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            placeholder="Optional description"
          />
        </div>

        <div className="quick-location-form__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

