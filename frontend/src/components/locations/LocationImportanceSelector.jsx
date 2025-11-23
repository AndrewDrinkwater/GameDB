import { useState } from 'react'
import { AlertCircle, Info, Minus, X } from 'lucide-react'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { updateLocationImportance } from '../../api/locations.js'
import '../entities/EntityImportanceSelector.css'

const IMPORTANCE_OPTIONS = [
  { value: 'critical', label: 'Critical', icon: AlertCircle, color: '#dc2626' },
  { value: 'important', label: 'Important', icon: Info, color: '#ea580c' },
  { value: 'medium', label: 'Medium', icon: Minus, color: '#6b7280' },
  { value: null, label: 'None', icon: X, color: '#9ca3af' },
]

// Reuses EntityImportanceSelector styles and structure, but uses location API
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
    <div className="entity-importance-selector">
      <span className="entity-importance-label">Importance:</span>
      <div className="entity-importance-buttons">
        {IMPORTANCE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = importance === option.value
          return (
            <button
              key={option.value || 'none'}
              type="button"
              className={`entity-importance-button ${isSelected ? 'selected' : ''}`}
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
              <span className="entity-importance-button-label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

