import { useState } from 'react'
import { AlertCircle, Info, Minus, X } from 'lucide-react'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { updateLocationImportance } from '../../api/locations.js'
import './LocationImportanceSelector.css'

const IMPORTANCE_OPTIONS = [
  { value: 'critical', label: 'Critical', icon: AlertCircle, color: '#dc2626' },
  { value: 'important', label: 'Important', icon: Info, color: '#ea580c' },
  { value: 'medium', label: 'Medium', icon: Minus, color: '#6b7280' },
  { value: null, label: 'None', icon: X, color: '#9ca3af' },
]

export default function LocationImportanceSelector({ locationId, importance, onUpdate }) {
  const { selectedCampaignId } = useCampaignContext()
  const [loading, setLoading] = useState(false)

  if (!selectedCampaignId) {
    // Don't show selector if no campaign context
    return null
  }

  const handleSelect = async (newImportance) => {
    if (loading || newImportance === importance) return

    setLoading(true)
    try {
      await updateLocationImportance(locationId, newImportance)
      onUpdate?.(newImportance)
    } catch (err) {
      console.error('Failed to update location importance', err)
      // Could show a toast/error message here
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="location-importance-selector">
      <span className="location-importance-label">Importance:</span>
      <div className="location-importance-buttons">
        {IMPORTANCE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = importance === option.value
          return (
            <button
              key={option.value || 'none'}
              type="button"
              className={`location-importance-button ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
              disabled={loading}
              title={option.label}
              style={
                isSelected
                  ? {
                      '--importance-color': option.color,
                    }
                  : {}
              }
            >
              <Icon size={16} />
              <span className="location-importance-button-label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

