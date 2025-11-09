import { useEffect, useMemo, useState } from 'react'
import { Crown, Loader2, Sparkles, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCampaignContext } from '../context/CampaignContext.jsx'
import { fetchCharacters } from '../api/characters.js'

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

  const [myCharacters, setMyCharacters] = useState([])
  const [companions, setCompanions] = useState([])
  const [myCharactersLoading, setMyCharactersLoading] = useState(false)
  const [companionsLoading, setCompanionsLoading] = useState(false)
  const [myCharactersError, setMyCharactersError] = useState('')
  const [companionsError, setCompanionsError] = useState('')

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

  useEffect(() => {
    let cancelled = false

    setMyCharacters([])
    setCompanions([])
    setMyCharactersError('')
    setCompanionsError('')

    if (!selectedCampaignId || !user?.id) {
      setMyCharactersLoading(false)
      setCompanionsLoading(false)
      return () => {
        cancelled = true
      }
    }

    const mapSummary = (items) => {
      const source = Array.isArray(items?.data) ? items.data : Array.isArray(items) ? items : []
      return source.map((character) => {
        const levelValue = Number(character?.level)
        return {
          id: character?.id,
          name: character?.name || 'Unnamed character',
          className: character?.class || '',
          level: Number.isNaN(levelValue) ? null : levelValue,
          isActive: character?.is_active ?? true,
          playerName: character?.player?.username || '',
        }
      })
    }

    const loadCharacters = async () => {
      setMyCharactersLoading(true)
      setCompanionsLoading(false)

      try {
        const response = await fetchCharacters({ scope: 'my', campaign_id: selectedCampaignId })
        if (cancelled) return

        const myList = mapSummary(response)
        setMyCharacters(myList)
        setMyCharactersError('')
        setMyCharactersLoading(false)

        if (myList.length > 0) {
          setCompanionsLoading(true)
          try {
            const companionsResponse = await fetchCharacters({
              scope: 'companions',
              campaign_id: selectedCampaignId,
            })
            if (cancelled) return

            const companionList = mapSummary(companionsResponse)
            setCompanions(companionList)
            setCompanionsError('')
          } catch (err) {
            if (cancelled) return
            console.error('❌ Failed to load companions for home widgets', err)
            setCompanions([])
            setCompanionsError(err.message || 'Failed to load companions')
          } finally {
            if (!cancelled) {
              setCompanionsLoading(false)
            }
          }
        } else {
          setCompanions([])
          setCompanionsError('')
          setCompanionsLoading(false)
        }
      } catch (err) {
        if (cancelled) return
        console.error('❌ Failed to load characters for home widgets', err)
        setMyCharacters([])
        setCompanions([])
        setMyCharactersError(err.message || 'Failed to load characters')
        setCompanionsError('')
        setMyCharactersLoading(false)
        setCompanionsLoading(false)
      }
    }

    loadCharacters()

    return () => {
      cancelled = true
    }
  }, [selectedCampaignId, user?.id])

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

  const renderMyCharacters = () => {
    if (myCharactersLoading) {
      return (
        <div className="home-widget-empty">
          <Loader2 className="spin" size={20} />
          <p>Loading your characters…</p>
        </div>
      )
    }

    if (myCharactersError) {
      return (
        <div className="home-widget-error">
          <p>{myCharactersError}</p>
        </div>
      )
    }

    if (!myCharacters.length) {
      return (
        <div className="home-widget-empty">
          <p>No characters in this campaign yet.</p>
        </div>
      )
    }

    return (
      <div className="home-card-grid">
        {myCharacters.map((character) => (
          <article key={character.id} className="home-card">
            <header>
              <h3>{character.name}</h3>
              <span
                className={`home-card-status ${character.isActive ? 'active' : 'inactive'}`}
              >
                {character.isActive ? 'Active' : 'Inactive'}
              </span>
            </header>
            <div className="home-card-meta">
              {character.className && <span>{character.className}</span>}
              {character.level !== null && <span>Level {character.level}</span>}
            </div>
          </article>
        ))}
      </div>
    )
  }

  const renderCompanions = () => {
    if (companionsLoading) {
      return (
        <div className="home-widget-empty">
          <Loader2 className="spin" size={20} />
          <p>Loading companions…</p>
        </div>
      )
    }

    if (companionsError) {
      return (
        <div className="home-widget-error">
          <p>{companionsError}</p>
        </div>
      )
    }

    if (!companions.length) {
      return (
        <div className="home-widget-empty">
          <p>No companions discovered in this campaign yet.</p>
        </div>
      )
    }

    return (
      <div className="home-card-grid">
        {companions.map((character) => (
          <article key={character.id} className="home-card">
            <header>
              <h3>{character.name}</h3>
              <span
                className={`home-card-status ${character.isActive ? 'active' : 'inactive'}`}
              >
                {character.isActive ? 'Active' : 'Inactive'}
              </span>
            </header>
            <div className="home-card-meta">
              {character.className && <span>{character.className}</span>}
              {character.level !== null && <span>Level {character.level}</span>}
            </div>
            {character.playerName && (
              <p className="home-card-player">Played by {character.playerName}</p>
            )}
          </article>
        ))}
      </div>
    )
  }

  const showCharacterWidgets =
    !!selectedCampaign && myCharacters.length > 0 && !myCharactersError

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

      {showCharacterWidgets && (
        <>
          <section className="home-section">
            <div className="home-section-header">
              <div>
                <h2>My Characters</h2>
                <p>Quick access to your heroes in {selectedCampaign.name}.</p>
              </div>
              <Link to="/characters/my" className="home-link">
                Manage
              </Link>
            </div>
            {renderMyCharacters()}
          </section>

          <section className="home-section">
            <div className="home-section-header">
              <div>
                <h2>My Companions</h2>
                <p>Meet the fellow adventurers journeying in {selectedCampaign.name}.</p>
              </div>
              <Link to="/characters/companions" className="home-link">
                View list
              </Link>
            </div>
            {renderCompanions()}
          </section>
        </>
      )}
    </div>
  )
}
