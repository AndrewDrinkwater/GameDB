import { useState, useEffect, useMemo, useCallback } from 'react'
import { updateEntity } from '../api/entities.js'
import { fetchCampaigns } from '../api/campaigns.js'
import { fetchCharacters } from '../api/characters.js'

/** --- helpers --- **/

const ACCESS_MODES = ['global', 'selective', 'hidden']
const ACCESS_MODE_SET = new Set(ACCESS_MODES)

const normaliseAccessMode = (value) => {
  if (typeof value !== 'string') return 'global'
  const key = value.toLowerCase()
  return ACCESS_MODE_SET.has(key) ? key : 'global'
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

/** --- main hook --- **/

export default function useEntityAccess(entity, token, canEdit) {
  const entityId = entity?.id
  const worldId = entity?.world?.id || entity?.world_id || ''

  const accessDefaults = useMemo(() => {
    if (!entity) {
      return {
        readMode: 'global',
        readCampaigns: [],
        readUsers: [],
        writeMode: 'global',
        writeCampaigns: [],
        writeUsers: [],
      }
    }

    return {
      readMode: normaliseAccessMode(entity.read_access || entity.readAccess),
      readCampaigns: normaliseIdArray(entity.read_campaign_ids || entity.readCampaignIds),
      readUsers: normaliseIdArray(entity.read_user_ids || entity.readUserIds),
      writeMode: normaliseAccessMode(entity.write_access || entity.writeAccess),
      writeCampaigns: normaliseIdArray(entity.write_campaign_ids || entity.writeCampaignIds),
      writeUsers: normaliseIdArray(entity.write_user_ids || entity.writeUserIds),
    }
  }, [entity])

  const [accessSettings, setAccessSettings] = useState(accessDefaults)
  const [accessOptions, setAccessOptions] = useState({ campaigns: [], users: [] })
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
      setAccessOptions({ campaigns: [], users: [] })
      setAccessOptionsError('')
      setAccessOptionsLoading(false)
      return
    }

    setAccessOptionsLoading(true)
    setAccessOptionsError('')

    try {
      const [campaignResponse, characterResponse] = await Promise.all([
        fetchCampaigns({ world_id: worldId }),
        fetchCharacters({ world_id: worldId }),
      ])

      const campaignData = Array.isArray(campaignResponse?.data)
        ? campaignResponse.data
        : Array.isArray(campaignResponse)
          ? campaignResponse
          : []

      const campaigns = campaignData.map((item) => ({
        value: String(item.id),
        label: item.name || 'Untitled campaign',
      }))

      const characterData = Array.isArray(characterResponse?.data)
        ? characterResponse.data
        : Array.isArray(characterResponse)
          ? characterResponse
          : []

      const userMap = new Map()
      characterData.forEach((character) => {
        const userId = character?.user_id || character?.player?.id
        if (!userId) return
        const key = String(userId)
        if (userMap.has(key)) return

        const player = character?.player || {}
        const username = player.username?.trim?.() || ''
        const email = player.email?.trim?.() || ''
        let label = username || email || `User ${key.slice(0, 8)}`
        if (username && email && username !== email) label = `${username} (${email})`
        userMap.set(key, { value: key, label })
      })

      setAccessOptions({ campaigns, users: Array.from(userMap.values()) })
    } catch (err) {
      console.error('❌ Failed to load access options', err)
      setAccessOptions({ campaigns: [], users: [] })
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
    const keys = ['readMode','readCampaigns','readUsers','writeMode','writeCampaigns','writeUsers']

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
        const mode = normaliseAccessMode(value)
        next[key] = mode
        if (key === 'readMode' && mode !== 'selective') {
          next.readCampaigns = []
          next.readUsers = []
        }
        if (key === 'writeMode' && mode !== 'selective') {
          next.writeCampaigns = []
          next.writeUsers = []
        }
        return next
      }

      if (['readCampaigns', 'readUsers', 'writeCampaigns', 'writeUsers'].includes(key)) {
        next[key] = Array.isArray(value)
          ? value.map((v) => String(v).trim()).filter(Boolean)
          : []
        return next
      }

      next[key] = value
      return next
    })
  }, [])

  /** --- save access --- **/
  const handleAccessSave = useCallback(async () => {
    if (!canEdit || !entityId) return false
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
        write_campaign_ids:
          accessSettings.writeMode === 'selective' ? accessSettings.writeCampaigns : [],
        write_user_ids:
          accessSettings.writeMode === 'selective' ? accessSettings.writeUsers : [],
      }

      const response = await updateEntity(entityId, payload)
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
  }, [canEdit, entityId, accessSettings, isAccessDirty])

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
    handleAccessSave,
  }
}
