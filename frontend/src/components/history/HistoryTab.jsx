import { Clock, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import DrawerPanel from '../DrawerPanel.jsx'
import useRecordHistory from '../../hooks/useRecordHistory.js'

const MS_IN_HOUR = 60 * 60 * 1000
const MS_IN_DAY = 24 * MS_IN_HOUR

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const isSameDay = (date, compareTo) =>
  date.getFullYear() === compareTo.getFullYear() &&
  date.getMonth() === compareTo.getMonth() &&
  date.getDate() === compareTo.getDate()

const getBucketKey = (date, now) => {
  if (!date) return 'older'
  const diff = now.getTime() - date.getTime()
  if (diff < MS_IN_HOUR) return 'lastHour'
  if (isSameDay(date, now)) return 'today'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'yesterday'

  if (diff < 7 * MS_IN_DAY) return 'lastSevenDays'
  return 'older'
}

const BUCKETS = [
  { key: 'lastHour', label: 'Last hour' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'lastSevenDays', label: 'Last seven days' },
  { key: 'older', label: 'Older' },
]

const formatTimestamp = (date, now) => {
  if (!date) return ''
  if (isSameDay(date, now)) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}.${minutes}`
  }
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString(undefined, { month: 'short' })
  return `${day} ${month}`
}

const formatType = (type) => {
  if (!type) return 'record'
  const clean = String(type)
  if (!clean.includes(':')) {
    return clean.replace(/_/g, ' ')
  }
  return clean
    .split(':')
    .pop()
    .replace(/[-_]+/g, ' ')
}

const getEntryPath = (entry) => {
  if (!entry?.type || !entry?.id) return null
  const type = String(entry.type).toLowerCase()
  if (type.startsWith('entity')) {
    return `/entities/${entry.id}`
  }
  return null
}

export default function HistoryTab({ isOpen, onClose }) {
  const { history, clearHistory } = useRecordHistory()
  const now = new Date()

  const grouped = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return []
    const nowDate = new Date()
    const buckets = BUCKETS.map((bucket) => ({ ...bucket, items: [] }))
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

    history.forEach((entry) => {
      const date = parseDate(entry?.viewedAt)
      const key = getBucketKey(date, nowDate)
      const bucket = bucketMap.get(key)
      if (!bucket) return
      bucket.items.push({ ...entry, parsedDate: date })
    })

    return buckets.filter((bucket) => bucket.items.length > 0)
  }, [history])

  const handleClear = () => {
    clearHistory()
  }

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title="History"
      description="Recently viewed records"
      size="sm"
    >
      <div className="history-tab">
        <div className="history-tab-header">
          <div className="history-tab-title">
            <Clock size={18} />
            <span>Recently viewed</span>
          </div>
          <button
            type="button"
            className="history-clear-btn"
            onClick={handleClear}
            disabled={!history.length}
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>

        {!history.length && (
          <p className="history-empty">No records viewed yet. Start exploring to build a history.</p>
        )}

        {grouped.map((group) => (
          <section key={group.key} className="history-group">
            <h3 className="history-group-title">{group.label}</h3>
            <ul className="history-entry-list">
              {group.items.map((entry) => {
                const entryPath = getEntryPath(entry)
                const content = (
                  <>
                    <div className="history-entry-title">{entry.title || 'Untitled record'}</div>
                    <div className="history-entry-meta">
                      <span className="history-entry-type">{formatType(entry.type)}</span>
                      <time className="history-entry-time">
                        {formatTimestamp(entry.parsedDate, now)}
                      </time>
                    </div>
                  </>
                )

                return (
                  <li key={`${entry.type}-${entry.id}`}>
                    {entryPath ? (
                      <Link
                        to={entryPath}
                        className="history-entry history-entry-link"
                        onClick={onClose}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="history-entry">{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </DrawerPanel>
  )
}
