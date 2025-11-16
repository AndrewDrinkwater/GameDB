import { useState, useRef, useEffect, useMemo } from 'react'
import { User, Menu, LogOut, Moon, Sun, Clock, Layers, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCampaignContext } from '../context/CampaignContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { Link } from 'react-router-dom'
import useIsMobile from '../hooks/useIsMobile.js'
import { fetchCharacters } from '../api/characters.js'
import HistoryTab from './history/HistoryTab.jsx'

export default function HeaderBar({ onMenuToggle }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const {
    campaigns,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedCampaign,
    loading,
    error,
    worlds,
    selectedWorld,
    selectedWorldId,
    setSelectedWorldId,
    worldLoading,
    worldError,
    viewAsCharacterId,
    setViewAsCharacterId,
  } = useCampaignContext()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCampaignChange = (event) => {
    setSelectedCampaignId(event.target.value)
  }

  const handleWorldChange = (event) => {
    setSelectedWorldId(event.target.value)
  }

  const isMobile = useIsMobile()

  const [viewAsCharacters, setViewAsCharacters] = useState([])
  const [viewAsLoading, setViewAsLoading] = useState(false)
  const [viewAsError, setViewAsError] = useState('')
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)

  const membershipRole = useMemo(() => {
    if (!selectedCampaign || !user) return ''
    const member = selectedCampaign.members?.find((entry) => entry?.user_id === user.id)
    return member?.role || ''
  }, [selectedCampaign, user])

  const selectedCampaignWorldOwnerId = useMemo(() => {
    if (!selectedCampaign?.world) return ''
    const world = selectedCampaign.world
    return (
      world.created_by ||
      world.creator?.id ||
      world.owner_id ||
      world.owner?.id ||
      ''
    )
  }, [selectedCampaign])

  const canUseCharacterContext = useMemo(() => {
    if (!selectedCampaignId) return false
    if (!user) return false
    if (user.role === 'system_admin') return true
    if (membershipRole === 'dm') return true
    if (!selectedCampaignWorldOwnerId) return false
    return String(selectedCampaignWorldOwnerId) === String(user.id)
  }, [membershipRole, selectedCampaignId, selectedCampaignWorldOwnerId, user])

  useEffect(() => {
    if (!canUseCharacterContext) {
      setViewAsCharacterId('')
    }
  }, [canUseCharacterContext, setViewAsCharacterId])

  useEffect(() => {
    let cancelled = false

    if (!canUseCharacterContext || !selectedCampaignId) {
      setViewAsCharacters([])
      setViewAsLoading(false)
      setViewAsError('')
      return
    }

    const loadCharacters = async () => {
      setViewAsLoading(true)
      setViewAsError('')

      try {
        const response = await fetchCharacters({ scope: 'others', campaign_id: selectedCampaignId })
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []

        if (cancelled) return

        const options = list
          .map((character) => {
            if (!character?.id) return null
            const name = character.name || 'Unnamed character'
            const playerName =
              character.player?.username || character.player?.email || character.player?.name || ''
            return {
              id: String(character.id),
              label: playerName ? `${name} (${playerName})` : name,
            }
          })
          .filter(Boolean)
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

        setViewAsCharacters(options)
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to load characters for view-as context', err)
          setViewAsCharacters([])
          setViewAsError(err.message || 'Unable to load characters')
          setViewAsCharacterId('')
        }
      } finally {
        if (!cancelled) {
          setViewAsLoading(false)
        }
      }
    }

    loadCharacters()

    return () => {
      cancelled = true
    }
  }, [canUseCharacterContext, selectedCampaignId, setViewAsCharacterId])

  const viewAsStatus = useMemo(() => {
    if (viewAsLoading) return 'Loading characters…'
    if (viewAsError) return viewAsError
    if (!viewAsCharacterId) return 'Viewing entities as yourself (DM/owner)'
    const match = viewAsCharacters.find((character) => character.id === viewAsCharacterId)
    return match ? `Viewing as ${match.label}` : 'Viewing as selected character'
  }, [viewAsCharacterId, viewAsCharacters, viewAsError, viewAsLoading])

  const campaignStatus = useMemo(() => {
    if (loading) return 'Loading campaigns…'
    if (error) return 'Unable to load campaigns'
    if (!campaigns.length) return 'No eligible campaigns'
    if (!selectedCampaign) return 'Select a campaign'
    return `${selectedCampaign.name}${selectedCampaign.world?.name ? ` · ${selectedCampaign.world.name}` : ''}`
  }, [campaigns, error, loading, selectedCampaign])

  const worldStatus = useMemo(() => {
    if (selectedCampaign?.world) {
      return selectedCampaign.world.name
        ? `Campaign world · ${selectedCampaign.world.name}`
        : 'Campaign world selected'
    }

    if (worldLoading) return 'Loading worlds…'
    if (worldError) return 'Unable to load worlds'
    if (!worlds.length) return 'No accessible worlds'
    if (!selectedWorld) return 'Select a world'
    return selectedWorld.name ? `World · ${selectedWorld.name}` : 'Selected world'
  }, [selectedCampaign, selectedWorld, worldLoading, worldError, worlds.length])

  const worldOptions = useMemo(() => {
    const seen = new Set()
    const options = []

    worlds.forEach((world) => {
      if (!world?.id) return
      const id = String(world.id)
      if (seen.has(id)) return
      options.push({ id, name: world.name || `World #${id}` })
      seen.add(id)
    })

    if (selectedCampaign?.world?.id) {
      const campaignWorldId = String(selectedCampaign.world.id)
      if (!seen.has(campaignWorldId)) {
        options.unshift({
          id: campaignWorldId,
          name: selectedCampaign.world.name || 'Campaign world',
        })
      }
    }

    return options
  }, [worlds, selectedCampaign])

  useEffect(() => {
    if (!isMobile) {
      setContextPanelOpen(false)
    }
  }, [isMobile])

  const getRoleLabel = (campaign) => {
    if (!user) return ''
    const membership = campaign?.members?.find((member) => member.user_id === user.id)
    if (!membership) {
      return user.role === 'system_admin' ? 'System Admin' : ''
    }
    if (membership.role === 'dm') return 'DM'
    if (membership.role === 'player') return 'Player'
    return membership.role || ''
  }

  const closeContextPanel = () => setContextPanelOpen(false)

  const contextSelectors = (
    <>
      <div className="campaign-selector" title={campaignStatus}>
        <label htmlFor="campaign-context-select">Campaign</label>
        <select
          id="campaign-context-select"
          value={selectedCampaignId}
          onChange={handleCampaignChange}
          disabled={loading || (!campaigns.length && !selectedCampaignId)}
        >
          <option value="">
            {loading
              ? 'Loading campaigns…'
              : error
                ? 'Unable to load campaigns'
                : campaigns.length
                  ? 'Select a campaign'
                  : 'No campaigns available'}
          </option>
          {campaigns.map((campaign) => {
            const role = getRoleLabel(campaign)
            const suffix = [
              role ? `as ${role}` : null,
              campaign.world?.name ? `World: ${campaign.world.name}` : null,
            ]
              .filter(Boolean)
              .join(' • ')
            const optionLabel = suffix ? `${campaign.name} (${suffix})` : campaign.name
            return (
              <option key={campaign.id} value={campaign.id}>
                {optionLabel}
              </option>
            )
          })}
        </select>
      </div>
      <div className="campaign-selector" title={worldStatus}>
        <label htmlFor="world-context-select">World</label>
        <select
          id="world-context-select"
          value={selectedWorldId}
          onChange={handleWorldChange}
          disabled={worldLoading}
        >
          <option value="">
            {selectedCampaign?.world
              ? selectedCampaign.world.name
                ? `Using ${selectedCampaign.world.name}`
                : 'Using campaign world'
              : worldLoading
                ? 'Loading worlds…'
                : worldError
                  ? 'Unable to load worlds'
                  : worlds.length
                    ? 'Select a world'
                    : 'No worlds available'}
          </option>
          {worldOptions.map((world) => (
            <option key={world.id} value={world.id}>
              {world.name}
            </option>
          ))}
        </select>
      </div>
      {canUseCharacterContext && (
        <div className="campaign-selector" title={viewAsStatus}>
          <label htmlFor="character-context-select">View as</label>
          <select
            id="character-context-select"
            value={viewAsCharacterId}
            onChange={(event) => setViewAsCharacterId(event.target.value)}
            disabled={viewAsLoading || Boolean(viewAsError)}
          >
            <option value="">
              {viewAsLoading
                ? 'Loading characters…'
                : viewAsError
                  ? viewAsError
                  : 'Entire campaign context'}
            </option>
            {viewAsCharacters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )

  const menuButton = (
    <button
      type="button"
      className={`menu-btn ${isMobile ? 'menu-btn-icon' : 'menu-btn-text'}`}
      onClick={onMenuToggle}
      aria-label={isMobile ? 'Toggle navigation menu' : undefined}
    >
      {isMobile ? <Menu size={20} /> : 'Menu'}
    </button>
  )

  const historyButton = (
    <button
      type="button"
      className={`history-btn ${isMobile ? 'history-btn-icon' : 'history-btn-text'}`}
      title="View recently viewed records"
      aria-label={isMobile ? 'Open history' : undefined}
      onClick={() => setHistoryPanelOpen(true)}
    >
      {isMobile ? <Clock size={20} /> : 'History'}
    </button>
  )

  const contextButton = (
    <button
      type="button"
      className={`context-btn ${isMobile ? 'context-btn-icon' : 'context-btn-text'}`}
      onClick={() => setContextPanelOpen(true)}
      aria-label={isMobile ? 'Change context' : undefined}
      title={isMobile ? 'Change context' : undefined}
      disabled={!isMobile}
    >
      {isMobile ? <Layers size={20} /> : 'Context'}
    </button>
  )

  return (
    <header className="app-header">
      <div className="header-start">
        {isMobile ? (
          <>
            <h1 className="title">
              <Link to="/" className="title-link">
                GameDB
              </Link>
            </h1>
            {menuButton}
            {contextButton}
            {historyButton}
          </>
        ) : (
          <>
            <h1 className="title">
              <Link to="/" className="title-link">
                GameDB
              </Link>
            </h1>
            {menuButton}
            {historyButton}
          </>
        )}
      </div>

      {!isMobile && <div className="header-center">{contextSelectors}</div>}

      <div className="user-menu" ref={dropdownRef}>
        <button
          className="user-icon"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title="User Menu"
        >
          <User size={20} />
        </button>

      {dropdownOpen && (
        <div className="user-dropdown">
          <div className="user-info">
            <strong>{user?.username || 'User'}</strong>
            <br />
            <small>{user?.role || ''}</small>
          </div>
          <button className="dropdown-action" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="dropdown-action logout" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>

      {isMobile && contextPanelOpen && (
        <div className="mobile-context-overlay" role="dialog" aria-modal="true">
          <button
            className="mobile-context-overlay-close"
            onClick={closeContextPanel}
            aria-label="Close context picker"
          />
          <div className="mobile-context-panel">
            <div className="mobile-context-header">
              <h2>Choose context</h2>
              <button type="button" onClick={closeContextPanel} aria-label="Close context picker">
                <X size={20} />
              </button>
            </div>
            <div className="mobile-context-body">{contextSelectors}</div>
          </div>
        </div>
      )}
      <HistoryTab isOpen={historyPanelOpen} onClose={() => setHistoryPanelOpen(false)} />
    </header>
  )
}
