import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addHistoryEntry as addHistoryEntryHelper,
  clearHistory as clearHistoryHelper,
  loadHistory,
  HISTORY_STORAGE_KEY,
  HISTORY_EVENT_NAME,
} from '../utils/historyStorage.js'

const safeLoad = () => {
  if (typeof window === 'undefined') return []
  return loadHistory()
}

export default function useRecordHistory(recordInfo = null) {
  const [history, setHistory] = useState(() => safeLoad())

  const refreshHistory = useCallback(() => {
    const next = safeLoad()
    setHistory(next)
    return next
  }, [])

  const addEntry = useCallback((entry) => {
    if (!entry) return safeLoad()
    const next = addHistoryEntryHelper(entry)
    setHistory(next)
    return next
  }, [])

  const clearHistory = useCallback(() => {
    clearHistoryHelper()
    setHistory([])
  }, [])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  const recordMemo = useMemo(() => {
    if (!recordInfo) return null
    const { id, type, title, viewedAt } = recordInfo
    if (id === undefined || id === null || !type) return null

    const record = { id, type, title, viewedAt }

    const resolvedWorldId =
      recordInfo.worldId ??
      recordInfo.world_id ??
      recordInfo.world?.id ??
      recordInfo.world?.world_id ??
      null

    const resolvedWorldName =
      recordInfo.worldName ?? recordInfo.world_name ?? recordInfo.world?.name ?? null

    if (resolvedWorldId !== undefined && resolvedWorldId !== null) {
      record.worldId = resolvedWorldId
    }

    if (resolvedWorldName) {
      record.worldName = resolvedWorldName
    }

    return record
  }, [recordInfo])

  useEffect(() => {
    if (!recordMemo) return
    addEntry(recordMemo)
  }, [recordMemo, addEntry])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleStorage = (event) => {
      if (event.key && event.key !== HISTORY_STORAGE_KEY) return
      refreshHistory()
    }

    const handleHistoryEvent = () => {
      refreshHistory()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(HISTORY_EVENT_NAME, handleHistoryEvent)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(HISTORY_EVENT_NAME, handleHistoryEvent)
    }
  }, [refreshHistory])

  return { history, addEntry, refreshHistory, clearHistory }
}
