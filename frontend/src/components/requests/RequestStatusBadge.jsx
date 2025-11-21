import './RequestStatusBadge.css'

const STATUS_COLORS = {
  open: 'blue',
  in_progress: 'orange',
  resolved: 'green',
  closed: 'gray',
  backlog: 'purple',
}

export default function RequestStatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'gray'
  const label = status
    ? status
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Unknown'

  return <span className={`request-status-badge request-status-badge--${color}`}>{label}</span>
}

