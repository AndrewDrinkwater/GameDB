import { useState, useEffect, useMemo, useCallback } from 'react'
import { updateLocation } from '../api/locations.js'
import { fetchAccessOptionsForWorld } from '../utils/entityAccessOptions.js'

/** --- helpers --- **/

const READ_ACCESS_MODES = ['global', 'selective', 'hidden']
const WRITE_ACCESS_MODES = [...READ_ACCESS_MODES, 'owner_only']
const READ_ACCESS_MODE_SET = new Set(READ_ACCESS_MODES)
const WRITE_ACCESS_MODE_SET = new Set(WRITE_ACCESS_MODES)

const normaliseAccessMode = (value, allowedSet) => {
  if (typeof value !== 'string') return 'global'
  const key = value.toLowerCase()
  return allowedSet.has(key) ? key : 'global'
}

const normaliseIdArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry == null ? '' : String(entry).trim()))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

const createEmptyAccessOptions = () => ({ campaigns: [], users: [], characters: [] })

/** --- main hook --- **/

export default function useLocationAccess(location, token, canEdit) {
  const locationId = location?.id
  const worldId = location?.world?.id || location?.world_id || ''

  const accessDefaults = useMemo(() => {
    if (!location) {
      return {
        readMode: 'global',
        readCampaigns: [],
        readUsers: [],
        readCharacters: [],
        writeMode: 'global',
        writeCampaigns: [],
        writeUsers: [],
      }
    }

    return {
      readMode: normaliseAccessMode(
        location.read_access || location.readAccess,
        READ_ACCESS_MODE_SET,
      ),
      readCampaigns: normaliseIdArray(location.read_campaign_ids || location.readCampaignIds),
      readUsers: normaliseIdArray(location.read_user_ids || location.readUserIds),
      readCharacters: normaliseIdArray(
        location.read_character_ids || location.readCharacterIds,
      ),
      writeMode: normaliseAccessMode(
        location.write_access || location.writeAccess,
        WRITE_ACCESS_MODE_SET,
      ),
      writeCampaigns: normaliseIdArray(location.write_campaign_ids || location.writeCampaignIds),
      writeUsers: normaliseIdArray(location.write_user_ids || location.writeUserIds),
    }
  }, [location])

  const [accessSettings, setAccessSettings] = useState(accessDefaults)
  const [accessOptions, setAccessOptions] = useState(() => createEmptyAccessOptions())
  const [accessOptionsLoading, setAccessOptionsLoading] = useState(false)
  const [accessOptionsError, setAccessOptionsError] = useState('')
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessSaveError, setAccessSaveError] = useState('')
  const [accessSaveSuccess, setAccessSaveSuccess] = useState('')

  useEffect(() => {
    setAccessSettings(accessDefaults)
  }, [accessDefaults])

  /** --- load campaign + user options --- **/
  const loadAccessOptions = useCallback(async () => {
    if (!token) return
    if (!worldId) {
      setAccessOptions(createEmptyAccessOptions())
      setAccessOptionsError('')
      setAccessOptionsLoading(false)
      return
    }

    setAccessOptionsLoading(true)
    setAccessOptionsError('')

    try {
      const options = await fetchAccessOptionsForWorld(worldId)
      setAccessOptions({
        campaigns: options.campaigns ?? [],
        users: options.users ?? [],
        characters: options.characters ?? [],
      })
    } catch (err) {
      console.error('❌ Failed to load access options', err)
      setAccessOptions(createEmptyAccessOptions())
      setAccessOptionsError(err.message || 'Failed to load access options')
    } finally {
      setAccessOptionsLoading(false)
    }
  }, [token, worldId])

  useEffect(() => {
    loadAccessOptions()
  }, [loadAccessOptions])

  /** --- track unsaved state --- **/
  const isAccessDirty = useMemo(() => {
    const keys = [
      'readMode',
      'readCampaigns',
      'readUsers',
      'readCharacters',
      'writeMode',
      'writeCampaigns',
      'writeUsers',
    ]

    const normalizeArray = (value) =>
      Array.isArray(value)
        ? value.map((v) => String(v).trim()).filter(Boolean).sort()
        : []

    return keys.some((key) => {
      const current = accessSettings[key]
      const base = accessDefaults[key]
      if (Array.isArray(current) || Array.isArray(base)) {
        const a = normalizeArray(current)
        const b = normalizeArray(base)
        if (a.length !== b.length) return true
        return a.some((val, i) => val !== b[i])
      }
      return current !== base
    })
  }, [accessSettings, accessDefaults])

  /** --- handle field changes --- **/
  const handleAccessSettingChange = useCallback((key, value) => {
    setAccessSaveError('')
    setAccessSaveSuccess('')

    setAccessSettings((prev) => {
      const next = { ...prev }

      if (key === 'readMode' || key === 'writeMode') {
        const allowedSet = key === 'readMode' ? READ_ACCESS_MODE_SET : WRITE_ACCESS_MODE_SET
        const mode = normaliseAccessMode(value, allowedSet)
        next[key] = mode
        if (key === 'readMode' && mode !== 'selective') {
          next.readCampaigns = []
          next.readUsers = []
          next.readCharacters = []
        }
        if (key === 'writeMode' && mode !== 'selective') {
          next.writeCampaigns = []
          next.writeUsers = []
        }
        return next
      }

      if (
        [
          'readCampaigns',
          'readUsers',
          'readCharacters',
          'writeCampaigns',
          'writeUsers',
        ].includes(key)
      ) {
        next[key] = Array.isArray(value)
          ? value.map((v) => String(v).trim()).filter(Boolean)
          : []
        return next
      }

      next[key] = value
      return next
    })
  }, [])

  const resetAccessSettings = useCallback(() => {
    setAccessSettings(accessDefaults)
    setAccessSaveError('')
    setAccessSaveSuccess('')
  }, [accessDefaults])

  /** --- save access --- **/
  const handleAccessSave = useCallback(async () => {
    if (!canEdit || !locationId) return false
    if (!isAccessDirty) return true

    setAccessSaveError('')
    setAccessSaveSuccess('')
    setAccessSaving(true)

    try {
      const payload = {
        read_access: accessSettings.readMode,
        write_access: accessSettings.writeMode,
        read_campaign_ids:
          accessSettings.readMode === 'selective' ? accessSettings.readCampaigns : [],
        read_user_ids:
          accessSettings.readMode === 'selective' ? accessSettings.readUsers : [],
        read_character_ids:
          accessSettings.readMode === 'selective' ? accessSettings.readCharacters : [],
        write_campaign_ids:
          accessSettings.writeMode === 'selective' ? accessSettings.writeCampaigns : [],
        write_user_ids:
          accessSettings.writeMode === 'selective' ? accessSettings.writeUsers : [],
      }

      const response = await updateLocation(locationId, payload)
      const updated = response?.data || response
      if (!updated) throw new Error('Failed to save access settings')

      setAccessSaveSuccess('Access settings saved.')
      return true
    } catch (err) {
      console.error('❌ Failed to save access settings', err)
      setAccessSaveError(err.message || 'Failed to save access settings')
      return false
    } finally {
      setAccessSaving(false)
    }
  }, [canEdit, locationId, accessSettings, isAccessDirty])

  return {
    accessSettings,
    accessOptions,
    accessOptionsError,
    accessOptionsLoading,
    accessSaving,
    accessSaveError,
    accessSaveSuccess,
    isAccessDirty,
    handleAccessSettingChange,
    resetAccessSettings,
    handleAccessSave,
  }
}

