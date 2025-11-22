// src/pages/locations/LocationForm.jsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createLocation, updateLocation } from '../../api/locations.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'

export default function LocationForm({ location, parentId, locationTypes, onClose, onSuccess }) {
  const { activeWorldId } = useCampaignContext()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location_type_id: '',
    parent_id: parentId || null,
    metadata: {},
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        location_type_id: location.location_type_id || '',
        parent_id: location.parent_id || parentId || null,
        metadata: location.metadata || {},
      })
    } else {
      setFormData({
        name: '',
        description: '',
        location_type_id: '',
        parent_id: parentId || null,
        metadata: {},
      })
    }
  }, [location, parentId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        world_id: activeWorldId,
        name: formData.name,
        description: formData.description,
        location_type_id: formData.location_type_id || null,
        parent_id: formData.parent_id || null,
        metadata: formData.metadata,
      }

      if (location) {
        await updateLocation(location.id, payload)
      } else {
        await createLocation(payload)
      }

      onSuccess()
    } catch (err) {
      console.error('❌ Failed to save location:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{location ? 'Edit Location' : 'New Location'}</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location_type_id">Location Type *</label>
            <select
              id="location_type_id"
              value={formData.location_type_id}
              onChange={(e) => setFormData({ ...formData, location_type_id: e.target.value })}
              required
            >
              <option value="">Select a type...</option>
              {locationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : location ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

