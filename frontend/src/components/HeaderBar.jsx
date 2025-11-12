import { useState, useRef, useEffect, useMemo } from 'react'
import { User, Menu, LogOut, Moon, Sun, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCampaignContext } from '../context/CampaignContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { Link } from 'react-router-dom'
import useIsMobile from '../hooks/useIsMobile.js'

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

  const isMobile = useIsMobile()

  const campaignStatus = useMemo(() => {
    if (loading) return 'Loading campaigns…'
    if (error) return 'Unable to load campaigns'
    if (!campaigns.length) return 'No eligible campaigns'
    if (!selectedCampaign) return 'Select a campaign'
    return `${selectedCampaign.name}${selectedCampaign.world?.name ? ` · ${selectedCampaign.world.name}` : ''}`
  }, [campaigns, error, loading, selectedCampaign])

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
      title="History (coming soon)"
      aria-label={isMobile ? 'Open history (coming soon)' : undefined}
    >
      {isMobile ? <Clock size={20} /> : 'History'}
    </button>
  )

  return (
    <header className="app-header">
      <div className="header-start">
        {isMobile ? (
          <>
            {menuButton}
            <h1 className="title">
              <Link to="/" className="title-link">
                GameDB
              </Link>
            </h1>
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

      <div className="header-center">
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
      </div>

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
    </header>
  )
}
