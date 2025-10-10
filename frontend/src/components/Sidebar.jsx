import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Pin, ChevronDown, Database, Shapes, Link2, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCampaignContext } from '../context/CampaignContext.jsx'
import { getWorldEntityTypeUsage } from '../api/entityTypes.js'
import { fetchWorlds } from '../api/worlds.js'

export default function Sidebar({ open, pinned, onPinToggle, onClose }) {
  const location = useLocation()
  const { user, sessionReady } = useAuth()
  const { selectedCampaign, selectedCampaignId } = useCampaignContext()
  const [campaignsCollapsed, setCampaignsCollapsed] = useState(false)
  const [charactersCollapsed, setCharactersCollapsed] = useState(false)
  const [entitiesCollapsed, setEntitiesCollapsed] = useState(false)
  const [entityTypes, setEntityTypes] = useState([])
  const [loadingEntityTypes, setLoadingEntityTypes] = useState(false)
  const [entityTypeError, setEntityTypeError] = useState('')
  const [ownsWorld, setOwnsWorld] = useState(false)

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const activeEntityType = searchParams.get('entityType') ?? ''
  const isEntitiesSection = location.pathname === '/entities' || location.pathname.startsWith('/entities/')

  const campaignWorldId = selectedCampaign?.world?.id ?? ''

  useEffect(() => {
    let cancelled = false

    if (!sessionReady || !user) {
      setOwnsWorld(false)
      return
    }

    const loadWorldOwnership = async () => {
      try {
        const response = await fetchWorlds()
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []

        if (cancelled) return

        const owns = list.some((world) => {
          if (!world) return false
          if (world.created_by && world.created_by === user.id) return true
          return world.creator?.id === user.id
        })

        setOwnsWorld(owns)
      } catch (err) {
        if (!cancelled) {
          console.warn('⚠️ Failed to determine world ownership', err)
          setOwnsWorld(false)
        }
      }
    }

    loadWorldOwnership()

    return () => {
      cancelled = true
    }
  }, [sessionReady, user])

  useEffect(() => {
    let cancelled = false

    if (!campaignWorldId) {
      setEntityTypes([])
      setEntityTypeError('')
      setLoadingEntityTypes(false)
      return
    }

    const loadEntityTypes = async () => {
      setLoadingEntityTypes(true)
      setEntityTypeError('')

      try {
        const response = await getWorldEntityTypeUsage(campaignWorldId)
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []

        if (!cancelled) {
          setEntityTypes(list)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to load entity types for world', err)
          setEntityTypes([])
          setEntityTypeError('Unable to load entity types')
        }
      } finally {
        if (!cancelled) {
          setLoadingEntityTypes(false)
        }
      }
    }

    loadEntityTypes()

    return () => {
      cancelled = true
    }
  }, [campaignWorldId])

  const isActive = useCallback(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    [location.pathname],
  )

  const handleEntitiesClick = useCallback(
    (event) => {
      if (!selectedCampaignId) {
        event.preventDefault()
        alert('Please select a campaign before viewing entities.')
      }
    },
    [selectedCampaignId],
  )

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <span>Navigation</span>
        <button
          className="pin-btn"
          title={pinned ? 'Unpin menu' : 'Pin menu'}
          onClick={onPinToggle}
        >
          <Pin size={16} style={{ opacity: pinned ? 1 : 0.6 }} />
        </button>
      </div>

      <nav className="nav-links" onClick={!pinned ? onClose : undefined}>
        <Link to="/worlds" className={isActive('/worlds') ? 'active' : ''}>
          Worlds
        </Link>

        <div className={`nav-group ${campaignsCollapsed ? 'collapsed' : ''}`}>
          <button
            type="button"
            className="nav-heading-btn"
            onClick={() => setCampaignsCollapsed((prev) => !prev)}
            aria-expanded={!campaignsCollapsed}
            aria-controls="campaigns-nav"
          >
            <span className="nav-heading">Campaigns</span>
            <ChevronDown
              size={14}
              className={`nav-heading-icon ${campaignsCollapsed ? 'collapsed' : ''}`}
            />
          </button>
          <div id="campaigns-nav" className="nav-sub-links">
            <Link to="/campaigns/my" className={isActive('/campaigns/my') ? 'active' : ''}>
              My Campaigns
            </Link>
            <Link to="/campaigns/all" className={isActive('/campaigns/all') ? 'active' : ''}>
              All
            </Link>
          </div>
        </div>

        <div className={`nav-group ${entitiesCollapsed ? 'collapsed' : ''}`}>
          <button
            type="button"
            className="nav-heading-btn"
            onClick={() => setEntitiesCollapsed((prev) => !prev)}
            aria-expanded={!entitiesCollapsed}
            aria-controls="entities-nav"
          >
            <span className="nav-heading">Entities</span>
            <ChevronDown
              size={14}
              className={`nav-heading-icon ${entitiesCollapsed ? 'collapsed' : ''}`}
            />
          </button>
          <div id="entities-nav" className="nav-sub-links">
            {loadingEntityTypes && (
              <span className="nav-helper">Loading entity types…</span>
            )}
            {!loadingEntityTypes && entityTypeError && (
              <span className="nav-helper error">{entityTypeError}</span>
            )}
            {!loadingEntityTypes && !entityTypeError && entityTypes.length === 0 && (
              <span className="nav-helper">
                {selectedCampaign ? 'No entities in this world yet' : 'Select a campaign to see entity types'}
              </span>
            )}
            {entityTypes.map((type) => (
              <Link
                key={type.id}
                to={`/entities?entityType=${type.id}`}
                className={`nav-entity-type ${
                  isEntitiesSection && activeEntityType === type.id ? 'active' : ''
                }`}
              >
                <span className="nav-entity-label">{type.name}</span>
                <span className="nav-entity-count">{type.entityCount}</span>
              </Link>
            ))}
            <Link
              to="/entities"
              className={`nav-entity-link ${
                isEntitiesSection && !activeEntityType ? 'active' : ''
              }`}
              onClick={handleEntitiesClick}
            >
              <Database size={16} className="nav-icon" />
              <span>All Entities</span>
            </Link>
            {user?.role === 'system_admin' && (
              <Link
                to="/entity-types"
                className={`nav-entity-link ${isActive('/entity-types') ? 'active' : ''}`}
              >
                <Shapes size={16} className="nav-icon" />
                <span>Entity Types</span>
              </Link>
            )}
            <Link
              to="/entity-relationships"
              className={`nav-entity-link ${isActive('/entity-relationships') ? 'active' : ''}`}
            >
              <Link2 size={16} className="nav-icon" />
              <span>Relationships</span>
            </Link>
            {ownsWorld && (
              <Link
                to="/entity-secrets"
                className={`nav-entity-link ${isActive('/entity-secrets') ? 'active' : ''}`}
              >
                <Lock size={16} className="nav-icon" />
                <span>Secrets</span>
              </Link>
            )}
          </div>
        </div>

        <div className={`nav-group ${charactersCollapsed ? 'collapsed' : ''}`}>
          <button
            type="button"
            className="nav-heading-btn"
            onClick={() => setCharactersCollapsed((prev) => !prev)}
            aria-expanded={!charactersCollapsed}
            aria-controls="characters-nav"
          >
            <span className="nav-heading">Characters</span>
            <ChevronDown
              size={14}
              className={`nav-heading-icon ${charactersCollapsed ? 'collapsed' : ''}`}
            />
          </button>
          <div id="characters-nav" className="nav-sub-links">
            <Link to="/characters/my" className={isActive('/characters/my') ? 'active' : ''}>
              My Characters
            </Link>
            <Link
              to="/characters/others"
              className={isActive('/characters/others') ? 'active' : ''}
            >
              Other Characters
            </Link>
            {user?.role === 'system_admin' && (
              <Link
                to="/characters/all"
                className={isActive('/characters/all') ? 'active admin-link' : 'admin-link'}
              >
                All Characters
              </Link>
            )}
          </div>
        </div>

        {user?.role === 'system_admin' && (
          <Link
            to="/users"
            className={location.pathname === '/users' ? 'active admin-link' : 'admin-link'}
            title="User Management (Admin Only)"
          >
            Users
          </Link>
        )}
      </nav>
    </aside>
  )
}
