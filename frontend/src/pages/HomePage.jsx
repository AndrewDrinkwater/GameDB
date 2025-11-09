import { useMemo } from 'react'
import { Crown, Loader2, Sparkles, Swords } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCampaignContext } from '../context/CampaignContext.jsx'

const ROLE_PRIORITY = { dm: 1, player: 2, other: 3 }

const getMembershipForUser = (campaign, userId) => {
  if (!campaign || !Array.isArray(campaign.members) || !userId) {
    return null
  }
  return campaign.members.find((member) => member?.user_id === userId) ?? null
}

export default function HomePage() {
  const { user } = useAuth()
  const {
    campaigns,
    loading,
    error,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedCampaign,
    refreshCampaigns,
  } = useCampaignContext()

  const displayName = user?.username || 'Adventurer'

  const sortedCampaigns = useMemo(() => {
    if (!Array.isArray(campaigns)) return []

    return [...campaigns]
      .map((campaign) => ({
        campaign,
        membership: getMembershipForUser(campaign, user?.id),
      }))
      .sort((a, b) => {
        const roleA = ROLE_PRIORITY[a.membership?.role] ?? ROLE_PRIORITY.other
        const roleB = ROLE_PRIORITY[b.membership?.role] ?? ROLE_PRIORITY.other
        if (roleA !== roleB) return roleA - roleB
        return a.campaign.name.localeCompare(b.campaign.name)
      })
  }, [campaigns, user?.id])

  const handleSelectCampaign = (campaignId) => {
    if (!campaignId) return
    setSelectedCampaignId(String(campaignId))
  }

  const renderCampaignGrid = () => {
    if (loading) {
      return (
        <div className="home-empty-state">
          <Loader2 className="spin" size={24} />
          <p>Loading your campaigns…</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="home-empty-state error">
          <p>{error}</p>
          <button type="button" className="home-refresh" onClick={refreshCampaigns}>
            Try again
          </button>
        </div>
      )
    }

    if (!sortedCampaigns.length) {
      return (
        <div className="home-empty-state">
          <Sparkles size={24} />
          <p>No campaigns yet. Join one to get started!</p>
        </div>
      )
    }

    return (
      <div className="campaign-grid">
        {sortedCampaigns.map(({ campaign, membership }) => {
          const campaignId = String(campaign.id)
          const isSelected = selectedCampaignId === campaignId
          const role = membership?.role ?? 'guest'
          const roleLabel =
            role === 'dm' ? 'Dungeon Master' : role === 'player' ? 'Player' : 'Observer'

          return (
            <button
              key={campaignId}
              type="button"
              className={`campaign-card ${role} ${isSelected ? 'active' : ''}`}
              onClick={() => handleSelectCampaign(campaignId)}
              aria-pressed={isSelected}
            >
              <header>
                <span className="campaign-role" aria-label={`Role: ${roleLabel}`}>
                  {role === 'dm' ? <Crown size={18} /> : <Swords size={18} />}
                  {roleLabel}
                </span>
                {isSelected && <span className="campaign-pill">Active</span>}
              </header>
              <div className="campaign-body">
                <h3>{campaign.name}</h3>
                {campaign.world?.name && (
                  <p className="campaign-world">World · {campaign.world.name}</p>
                )}
              </div>
              <footer>
                <span>Set campaign context</span>
              </footer>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-text">
          <p className="home-eyebrow">Your Tabletop Worldbuilding Database</p>
          <h1>Welcome, {displayName}.</h1>
          <p className="home-description">
            Select a campaign to explore and build the world.
          </p>
        </div>
        {selectedCampaign && (
          <div className="home-active-campaign">
            <span className="home-active-label">Currently focused</span>
            <h2>{selectedCampaign.name}</h2>
            {selectedCampaign.world?.name && (
              <p>{selectedCampaign.world.name}</p>
            )}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2>Your campaigns</h2>
            <p>Choose a tile below to update the active campaign context.</p>
          </div>
          <button
            type="button"
            className="home-refresh"
            onClick={refreshCampaigns}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        {renderCampaignGrid()}
      </section>
    </div>
  )
}
