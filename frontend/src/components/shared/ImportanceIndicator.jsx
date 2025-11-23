import { useCampaignContext } from '../../context/CampaignContext.jsx'

const IMPORTANCE_ICONS = {
  critical: '🔴',
  important: '🟠',
  medium: '⚪',
}

/**
 * Reusable component to display importance indicator icon next to entity/location names
 * Only shows when campaign context is active and importance is set
 */
export default function ImportanceIndicator({ importance, className = 'entity-importance-indicator' }) {
  const { selectedCampaignId } = useCampaignContext()

  if (!selectedCampaignId || !importance) {
    return null
  }

  const icon = IMPORTANCE_ICONS[importance] || '•'
  const importanceLabel = importance.charAt(0).toUpperCase() + importance.slice(1)

  return (
    <span
      className={className}
      title={`Importance: ${importanceLabel}`}
    >
      {icon}
    </span>
  )
}

