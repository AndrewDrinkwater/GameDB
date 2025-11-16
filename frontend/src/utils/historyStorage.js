const HISTORY_STORAGE_KEY = 'app_history'
const HISTORY_LIMIT = 100
const HISTORY_EVENT_NAME = 'history:updated'

const getWindow = () => (typeof window !== 'undefined' ? window : null)

const canUseStorage = () => Boolean(getWindow()?.localStorage)

const broadcastHistoryChange = (entries) => {
  const win = getWindow()
  if (!win) return
  try {
    win.dispatchEvent(
      new CustomEvent(HISTORY_EVENT_NAME, {
        detail: Array.isArray(entries) ? entries : [],
      }),
    )
  } catch (err) {
    console.warn('⚠️ Failed to broadcast history change', err)
  }
}

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const normaliseEntry = (entry) => {
  if (!entry || entry.id === undefined || entry.id === null || !entry.type) {
    return null
  }

  const viewedAtDate = toDate(entry.viewedAt) || new Date()

  return {
    id: String(entry.id),
    type: String(entry.type),
    title: entry.title ? String(entry.title) : 'Untitled record',
    viewedAt: viewedAtDate.toISOString(),
  }
}

const sortHistory = (entries) =>
  entries
    .slice()
    .sort((a, b) => {
      const dateA = toDate(a?.viewedAt)
      const dateB = toDate(b?.viewedAt)
      const timeA = dateA ? dateA.getTime() : 0
      const timeB = dateB ? dateB.getTime() : 0
      return timeB - timeA
    })

export const loadHistory = () => {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const items = parsed.map(normaliseEntry).filter(Boolean)
    return sortHistory(items)
  } catch (err) {
    console.warn('⚠️ Failed to parse stored history', err)
    return []
  }
}

export const saveHistory = (entries) => {
  if (!canUseStorage()) return []
  if (!Array.isArray(entries)) return []

  const normalised = entries.map(normaliseEntry).filter(Boolean).slice(0, HISTORY_LIMIT)
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalised))
  broadcastHistoryChange(normalised)
  return normalised
}

export const addHistoryEntry = (entry) => {
  if (!canUseStorage()) return []
  const normalised = normaliseEntry(entry)
  if (!normalised) return loadHistory()

  const existing = loadHistory().filter(
    (item) => !(item.id === normalised.id && item.type === normalised.type),
  )

  const next = [normalised, ...existing].slice(0, HISTORY_LIMIT)
  saveHistory(next)
  return next
}

export const clearHistory = () => {
  if (!canUseStorage()) return
  window.localStorage.removeItem(HISTORY_STORAGE_KEY)
  broadcastHistoryChange([])
}

export { HISTORY_STORAGE_KEY, HISTORY_EVENT_NAME }
