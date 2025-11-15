import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCampaigns } from '../api/campaigns.js'
import { fetchWorlds } from '../api/worlds.js'
import { useAuth } from './AuthContext.jsx'

const CampaignContext = createContext(null)

const STORAGE_KEY = 'gamedb_campaign_context'
const ELIGIBLE_ROLES = new Set(['dm', 'player'])

const parseStoredContext = (raw) => {
  if (!raw || typeof raw !== 'string') return { type: '', id: '' }

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const type = parsed.type === 'world' ? 'world' : 'campaign'
      const id = parsed.id ? String(parsed.id) : ''
      if (id) {
        return { type, id }
      }
    }
  } catch (err) {
    // Legacy values were stored as plain campaign ids
    if (raw.trim()) {
      return { type: 'campaign', id: raw.trim() }
    }
  }

  if (raw.trim()) {
    return { type: 'campaign', id: raw.trim() }
  }

  return { type: '', id: '' }
}

const filterCampaignsForUser = (campaigns, user) => {
  if (!Array.isArray(campaigns)) return []
  if (!user) return []
  if (user.role === 'system_admin') {
    return campaigns
  }

  return campaigns.filter(
    (campaign) =>
      Array.isArray(campaign?.members) &&
      campaign.members.some(
        (member) => member?.user_id === user.id && ELIGIBLE_ROLES.has(member?.role),
      ),
  )
}

export function CampaignProvider({ children }) {
  const { user, sessionReady } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCampaignId, setSelectedCampaignIdState] = useState('')
  const [worlds, setWorlds] = useState([])
  const [worldLoading, setWorldLoading] = useState(false)
  const [worldError, setWorldError] = useState('')
  const [selectedWorldId, setSelectedWorldIdState] = useState('')

  // Restore persisted selection once the auth session is ready
  useEffect(() => {
    if (!sessionReady) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setSelectedCampaignIdState('')
        setSelectedWorldIdState('')
        return
      }

      const { type, id } = parseStoredContext(stored)
      if (type === 'world') {
        setSelectedWorldIdState(id)
        setSelectedCampaignIdState('')
      } else if (type === 'campaign') {
        setSelectedCampaignIdState(id)
        setSelectedWorldIdState('')
      } else {
        setSelectedCampaignIdState('')
        setSelectedWorldIdState('')
      }
    } catch (err) {
      console.warn('⚠️ Unable to restore campaign context', err)
      setSelectedCampaignIdState('')
      setSelectedWorldIdState('')
    }
  }, [sessionReady])

  // Persist the selected campaign id for the current session
  useEffect(() => {
    if (!sessionReady) return

    try {
      if (selectedCampaignId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'campaign', id: selectedCampaignId }))
      } else if (selectedWorldId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'world', id: selectedWorldId }))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (err) {
      console.warn('⚠️ Unable to persist campaign context', err)
    }
  }, [selectedCampaignId, selectedWorldId, sessionReady])

  const loadCampaigns = useCallback(async () => {
    if (!sessionReady || !user) {
      setCampaigns([])
      setError('')
      return []
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetchCampaigns()
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []

      const eligible = filterCampaignsForUser(list, user)

      setCampaigns(eligible)

      setSelectedCampaignIdState((previous) => {
        if (!previous) return ''
        const stillExists = eligible.some(
          (campaign) => String(campaign.id) === String(previous),
        )
        return stillExists ? previous : ''
      })

      return eligible
    } catch (err) {
      console.error('❌ Failed to load campaigns', err)
      setError(err.message || 'Failed to load campaigns')
      setCampaigns([])
      return []
    } finally {
      setLoading(false)
    }
  }, [sessionReady, user])

  const loadWorlds = useCallback(async () => {
    if (!sessionReady || !user) {
      setWorlds([])
      setWorldError('')
      return []
    }

    setWorldLoading(true)
    setWorldError('')

    try {
      const response = await fetchWorlds()
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []

      setWorlds(list)

      setSelectedWorldIdState((previous) => {
        if (!previous) return ''
        const stillExists = list.some((world) => String(world.id) === String(previous))
        return stillExists ? previous : ''
      })

      return list
    } catch (err) {
      console.error('❌ Failed to load worlds', err)
      setWorldError(err.message || 'Failed to load worlds')
      setWorlds([])
      return []
    } finally {
      setWorldLoading(false)
    }
  }, [sessionReady, user])

  useEffect(() => {
    if (!sessionReady) return

    if (!user) {
      setCampaigns([])
      setSelectedCampaignIdState('')
      setError('')
      setLoading(false)
      setWorlds([])
      setSelectedWorldIdState('')
      setWorldError('')
      setWorldLoading(false)
      return
    }

    loadCampaigns()
    loadWorlds()
  }, [sessionReady, user, loadCampaigns, loadWorlds])

  const setSelectedCampaignId = useCallback((value) => {
    const nextValue = value === undefined || value === null ? '' : String(value)
    setSelectedCampaignIdState(nextValue)
    if (nextValue) {
      setSelectedWorldIdState('')
    }
  }, [])

  const setSelectedWorldId = useCallback((value) => {
    const nextValue = value === undefined || value === null ? '' : String(value)
    setSelectedWorldIdState(nextValue)
    if (nextValue) {
      setSelectedCampaignIdState('')
    }
  }, [])

  const selectedCampaign = useMemo(() => {
    if (!selectedCampaignId) return null
    return campaigns.find((campaign) => String(campaign.id) === String(selectedCampaignId)) || null
  }, [campaigns, selectedCampaignId])

  const selectedWorld = useMemo(() => {
    if (!selectedWorldId) return null
    return worlds.find((world) => String(world.id) === String(selectedWorldId)) || null
  }, [worlds, selectedWorldId])

  const selectedContextType = useMemo(() => {
    if (selectedCampaignId) return 'campaign'
    if (selectedWorldId) return 'world'
    return ''
  }, [selectedCampaignId, selectedWorldId])

  const activeWorld = useMemo(() => {
    if (selectedContextType === 'world' && selectedWorld) {
      return selectedWorld
    }

    if (selectedCampaign?.world) {
      return selectedCampaign.world
    }

    return selectedWorld
  }, [selectedContextType, selectedWorld, selectedCampaign])

  const activeWorldId = useMemo(() => {
    if (!activeWorld?.id) return ''
    return String(activeWorld.id)
  }, [activeWorld])

  const contextKey = useMemo(() => {
    const contextId = selectedCampaignId || selectedWorldId || ''
    return `${selectedContextType || 'none'}:${contextId || 'none'}:${activeWorldId || 'none'}`
  }, [selectedCampaignId, selectedWorldId, selectedContextType, activeWorldId])

  const contextValue = useMemo(
    () => ({
      campaigns,
      selectedCampaign,
      selectedCampaignId,
      setSelectedCampaignId,
      worlds,
      worldLoading,
      worldError,
      selectedWorld,
      selectedWorldId,
      setSelectedWorldId,
      selectedContextType,
      activeWorld,
      activeWorldId,
      contextKey,
      loading,
      error,
      refreshCampaigns: loadCampaigns,
      refreshWorlds: loadWorlds,
    }),
    [
      campaigns,
      selectedCampaign,
      selectedCampaignId,
      setSelectedCampaignId,
      worlds,
      worldLoading,
      worldError,
      selectedWorld,
      selectedWorldId,
      setSelectedWorldId,
      selectedContextType,
      activeWorld,
      activeWorldId,
      contextKey,
      loading,
      error,
      loadCampaigns,
      loadWorlds,
    ],
  )

  return <CampaignContext.Provider value={contextValue}>{children}</CampaignContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCampaignContext() {
  const context = useContext(CampaignContext)
  if (!context) {
    throw new Error('useCampaignContext must be used within a CampaignProvider')
  }
  return context
}
