import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCampaigns } from '../api/campaigns.js'
import { useAuth } from './AuthContext.jsx'

const CampaignContext = createContext(null)

const STORAGE_KEY = 'gamedb_campaign_context'
const ELIGIBLE_ROLES = new Set(['dm', 'player'])

export function CampaignProvider({ children }) {
  const { user, sessionReady } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCampaignId, setSelectedCampaignIdState] = useState('')

  // Restore persisted selection once the auth session is ready
  useEffect(() => {
    if (!sessionReady) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSelectedCampaignIdState(stored)
      }
    } catch (err) {
      console.warn('⚠️ Unable to restore campaign context', err)
      setSelectedCampaignIdState('')
    }
  }, [sessionReady])

  // Persist the selected campaign id for the current session
  useEffect(() => {
    if (!sessionReady) return

    try {
      if (selectedCampaignId) {
        localStorage.setItem(STORAGE_KEY, selectedCampaignId)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (err) {
      console.warn('⚠️ Unable to persist campaign context', err)
    }
  }, [selectedCampaignId, sessionReady])

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

      const eligible = list.filter((campaign) =>
        Array.isArray(campaign?.members) &&
        campaign.members.some(
          (member) => member?.user_id === user.id && ELIGIBLE_ROLES.has(member?.role),
        ),
      )

      setCampaigns(eligible)

      setSelectedCampaignIdState((previous) => {
        if (!previous) return ''
        const stillExists = eligible.some((campaign) => campaign.id === previous)
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

  useEffect(() => {
    if (!sessionReady) return

    if (!user) {
      setCampaigns([])
      setSelectedCampaignIdState('')
      setError('')
      setLoading(false)
      return
    }

    loadCampaigns()
  }, [sessionReady, user, loadCampaigns])

  const setSelectedCampaignId = useCallback((value) => {
    setSelectedCampaignIdState(value ?? '')
  }, [])

  const selectedCampaign = useMemo(() => {
    if (!selectedCampaignId) return null
    return campaigns.find((campaign) => campaign.id === selectedCampaignId) || null
  }, [campaigns, selectedCampaignId])

  const contextValue = useMemo(
    () => ({
      campaigns,
      selectedCampaign,
      selectedCampaignId,
      setSelectedCampaignId,
      loading,
      error,
      refreshCampaigns: loadCampaigns,
    }),
    [campaigns, selectedCampaign, selectedCampaignId, setSelectedCampaignId, loading, error, loadCampaigns],
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
