import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Pin,
  ChevronDown,
  Database,
  Shapes,
  Link2,
  FileText,
  NotebookPen,
  ShieldCheck,
  History,
  Layers,
  MapPin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCampaignContext } from '../context/CampaignContext.jsx'
import { getWorldEntityTypeUsage } from '../api/entityTypes.js'
import { getWorldLocationTypeUsage } from '../api/locationTypes.js'

export default function Sidebar({
  open,
  pinned,
  allowPinning = true,
  onPinToggle,
  onClose,
}) {
  const location = useLocation()
  const { user } = useAuth()
  const {
    selectedCampaign,
    selectedCampaignId,
    activeWorld,
    activeWorldId,
    viewAsCharacterId,
    contextKey,
  } = useCampaignContext()
  const [campaignsCollapsed, setCampaignsCollapsed] = useState(false)
  const [charactersCollapsed, setCharactersCollapsed] = useState(false)
  const [worldAdminCollapsed, setWorldAdminCollapsed] = useState(false)
  const [entitiesCollapsed, setEntitiesCollapsed] = useState(false)
  const [locationsCollapsed, setLocationsCollapsed] = useState(false)
  const [notesCollapsed, setNotesCollapsed] = useState(false)
  const [entityTypes, setEntityTypes] = useState([])
  const [loadingEntityTypes, setLoadingEntityTypes] = useState(false)
  const [entityTypeError, setEntityTypeError] = useState('')
  const [locationTypes, setLocationTypes] = useState([])
  const [loadingLocationTypes, setLoadingLocationTypes] = useState(false)
  const [locationTypeError, setLocationTypeError] = useState('')
  const [otherLocationTypesCollapsed, setOtherLocationTypesCollapsed] = useState(false)

  useEffect(() => {
    setEntityTypes([])
    setEntityTypeError('')
    setLocationTypes([])
    setLocationTypeError('')
  }, [contextKey])

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const activeEntityType = searchParams.get('entityType') ?? ''
  const isEntitiesSection =
    location.pathname === '/entities' || location.pathname.startsWith('/entities/')

  const campaignWorldId = activeWorldId || ''
  const isSystemAdmin = user?.role === 'system_admin'
  const hasWorldContext = Boolean(activeWorldId)

  const membershipRole = useMemo(() => {
    if (!selectedCampaign || !user) return ''
    const member = selectedCampaign.members?.find((entry) => entry?.user_id === user.id)
    return member?.role ?? ''
  }, [selectedCampaign, user])

  const isSelectedWorldOwner = useMemo(() => {
    if (!activeWorld || !user?.id) return false
    const worldOwnerId =
      activeWorld.created_by ??
      activeWorld.creator?.id ??
      activeWorld.owner_id ??
      activeWorld.owner?.id ??
      ''
    if (!worldOwnerId) return false
    return String(worldOwnerId) === String(user.id)
  }, [activeWorld, user?.id])

  const canViewAllEntities = Boolean(
    hasWorldContext && (isSystemAdmin || membershipRole === 'dm' || isSelectedWorldOwner),
  )
  const canViewEntityTypes = Boolean(hasWorldContext && (isSystemAdmin || isSelectedWorldOwner))
  const canViewBulkEntityUpload = Boolean(hasWorldContext && (isSystemAdmin || isSelectedWorldOwner))
  const canViewRelationshipTypes = Boolean(
    hasWorldContext && (isSystemAdmin || isSelectedWorldOwner),
  )
  const canUseBulkAccessTool = Boolean(hasWorldContext && isSelectedWorldOwner)
  const isPlayerInSelectedCampaign = useMemo(() => {
    if (!selectedCampaign || !Array.isArray(selectedCampaign.members)) return false
    if (!user?.id) return false

    return selectedCampaign.members.some(
      (member) => member?.user_id === user.id && member?.role === 'player',
    )
  }, [selectedCampaign, user])

  const isDMInSelectedCampaign = useMemo(() => {
    if (!selectedCampaign || !Array.isArray(selectedCampaign.members)) return false
    if (!user?.id) return false

    return selectedCampaign.members.some(
      (member) => member?.user_id === user.id && member?.role === 'dm',
    )
  }, [selectedCampaign, user])

  const shouldShowWorldAdminGroup = Boolean(
    hasWorldContext &&
      (canViewAllEntities ||
        canViewEntityTypes ||
        canViewBulkEntityUpload ||
        canViewRelationshipTypes ||
        canUseBulkAccessTool),
  )

  const canAccessCampaignNotes = useMemo(() => {
    if (!selectedCampaignId) return false
    if (isSystemAdmin) return true
    return isDMInSelectedCampaign || isPlayerInSelectedCampaign
  }, [isSystemAdmin, isDMInSelectedCampaign, isPlayerInSelectedCampaign, selectedCampaignId])

  // --- Load entity types for selected campaign world ---
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
        const response = await getWorldEntityTypeUsage(campaignWorldId, {
          viewAsCharacterId,
        })
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : []

        if (!cancelled) setEntityTypes(list)
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to load entity types for world', err)
          setEntityTypes([])
          setEntityTypeError('Unable to load entity types')
        }
      } finally {
        if (!cancelled) setLoadingEntityTypes(false)
      }
    }

    loadEntityTypes()
    return () => {
      cancelled = true
    }
  }, [campaignWorldId, contextKey, viewAsCharacterId])

  // --- Load location types for selected campaign world ---
  useEffect(() => {
    let cancelled = false

    if (!campaignWorldId) {
      setLocationTypes([])
      setLocationTypeError('')
      setLoadingLocationTypes(false)
      return
    }

    const loadLocationTypes = async () => {
      setLoadingLocationTypes(true)
      setLocationTypeError('')

      try {
        const response = await getWorldLocationTypeUsage(campaignWorldId, {
          viewAsCharacterId,
        })
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : []

        if (!cancelled) setLocationTypes(list)
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to load location types for world', err)
          setLocationTypes([])
          setLocationTypeError('Unable to load location types')
        }
      } finally {
        if (!cancelled) setLoadingLocationTypes(false)
      }
    }

    loadLocationTypes()
    return () => {
      cancelled = true
    }
  }, [campaignWorldId, contextKey, viewAsCharacterId])

  const isActive = useCallback(
    (path) => {
      if (path === '/') {
        return location.pathname === '/'
      }
      return location.pathname === path || location.pathname.startsWith(`${path}/`)
    },
    [location.pathname],
  )

  const handleEntitiesClick = useCallback(
    (event) => {
      if (!hasWorldContext) {
        event.preventDefault()
        alert('Please select a campaign or world context before viewing entities.')
      }
    },
    [hasWorldContext],
  )

  const handleNavContainerClick = useCallback(
    (event) => {
      if (pinned) return
      if (event.defaultPrevented) return
      const target = event.target
      const element = target instanceof Element ? target : target?.parentElement
      if (!element || typeof element.closest !== 'function') return
      const anchor = element.closest('a')
      if (anchor && event.currentTarget.contains(anchor)) {
        onClose()
      }
    },
    [pinned, onClose],
  )

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <span>Navigation</span>
        {allowPinning && (
          <button
            type="button"
            className={`pin-btn ${pinned ? 'pinned' : ''}`}
            title={pinned ? 'Unpin menu' : 'Pin menu'}
            aria-pressed={pinned}
            onClick={onPinToggle}
          >
            <Pin size={16} className="pin-icon" />
          </button>
        )}
      </div>

      <nav
        className="nav-links"
        onClick={!pinned ? handleNavContainerClick : undefined}
      >
        <Link to="/" className={isActive('/') ? 'active' : ''}>
          Home
        </Link>

        <Link to="/worlds" className={isActive('/worlds') ? 'active' : ''}>
          Worlds
        </Link>

        {/* --- World Admin --- */}
        {shouldShowWorldAdminGroup && (
          <div className={`nav-group ${worldAdminCollapsed ? 'collapsed' : ''}`}>
            <button
              type="button"
              className="nav-heading-btn"
              onClick={() => setWorldAdminCollapsed((prev) => !prev)}
              aria-expanded={!worldAdminCollapsed}
              aria-controls="world-admin-nav"
            >
              <span className="nav-heading">World Admin</span>
              <ChevronDown
                size={14}
                className={`nav-heading-icon ${worldAdminCollapsed ? 'collapsed' : ''}`}
              />
            </button>
            <div id="world-admin-nav" className="nav-sub-links">
              {canViewAllEntities && (
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
              )}

              {canViewEntityTypes && (
                <Link
                  to="/location-types"
                  className={`nav-entity-link ${isActive('/location-types') ? 'active' : ''}`}
                >
                  <MapPin size={16} className="nav-icon" />
                  <span>Location Admin</span>
                </Link>
              )}

              {canViewAllEntities && (
                <Link
                  to="/entity-relationships"
                  className={`nav-entity-link ${
                    isActive('/entity-relationships') ? 'active' : ''
                  }`}
                >
                  <Link2 size={16} className="nav-icon" />
                  <span>All Relationships</span>
                </Link>
              )}

              {canViewEntityTypes && (
                <Link
                  to="/entity-types"
                  className={`nav-entity-link ${isActive('/entity-types') ? 'active' : ''}`}
                >
                  <Shapes size={16} className="nav-icon" />
                  <span>Entity Types</span>
                </Link>
              )}

              {canViewBulkEntityUpload && (
                <Link
                  to="/entities/bulk-upload"
                  className={`nav-entity-link ${
                    isActive('/entities/bulk-upload') ? 'active' : ''
                  }`}
                >
                  <Database size={16} className="nav-icon" />
                  <span>Bulk Entity Upload</span>
                </Link>
              )}

              {canViewRelationshipTypes && (
                <Link
                  to="/relationship-types"
                  className={`nav-entity-link ${
                    isActive('/relationship-types') ? 'active' : ''
                  }`}
                >
                  <Link2 size={16} className="nav-icon" />
                  <span>Relationship Types</span>
                </Link>
              )}

              {canUseBulkAccessTool && campaignWorldId && (
                <Link
                  to={`/worlds/${campaignWorldId}/access/bulk`}
                  className={`nav-entity-link ${
                    isActive(`/worlds/${campaignWorldId}/access/bulk`) ? 'active' : ''
                  }`}
                >
                  <ShieldCheck size={16} className="nav-icon" />
                  <span>Bulk Access Editor</span>
                </Link>
              )}

              {canUseBulkAccessTool && campaignWorldId && (
                <Link
                  to={`/worlds/${campaignWorldId}/collections`}
                  className={`nav-entity-link ${
                    isActive(`/worlds/${campaignWorldId}/collections`) ? 'active' : ''
                  }`}
                >
                  <Layers size={16} className="nav-icon" />
                  <span>Collections</span>
                </Link>
              )}

              {canUseBulkAccessTool && campaignWorldId && (
                <Link
                  to={`/worlds/${campaignWorldId}/access/audit`}
                  className={`nav-entity-link ${
                    isActive(`/worlds/${campaignWorldId}/access/audit`) ? 'active' : ''
                  }`}
                >
                  <History size={16} className="nav-icon" />
                  <span>Access Audit Log</span>
                </Link>
              )}

              {isSelectedWorldOwner && !hasWorldContext && (
                <span className="nav-helper">
                  Select a world you own to use the bulk access tools
                </span>
              )}
            </div>
          </div>
        )}

        {/* --- Campaigns --- */}
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

        {/* --- Entities --- */}
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
            {loadingEntityTypes && <span className="nav-helper">Loading entity types…</span>}
            {!loadingEntityTypes && entityTypeError && (
              <span className="nav-helper error">{entityTypeError}</span>
            )}
            {!loadingEntityTypes && !entityTypeError && entityTypes.length === 0 && (
              <span className="nav-helper">
                {hasWorldContext
                  ? 'No entities in this world yet'
                  : 'Select a campaign or world context to see entity types'}
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

          </div>
        </div>

        {/* --- Locations --- */}
        {hasWorldContext && (
          <div className={`nav-group ${locationsCollapsed ? 'collapsed' : ''}`}>
            <button
              type="button"
              className="nav-heading-btn"
              onClick={() => setLocationsCollapsed((prev) => !prev)}
              aria-expanded={!locationsCollapsed}
              aria-controls="locations-nav"
            >
              <span className="nav-heading">Locations</span>
              <ChevronDown
                size={14}
                className={`nav-heading-icon ${locationsCollapsed ? 'collapsed' : ''}`}
              />
            </button>
            <div id="locations-nav" className="nav-sub-links">
              <Link
                to="/locations"
                className={`nav-entity-link ${isActive('/locations') ? 'active' : ''}`}
              >
                <MapPin size={16} className="nav-icon" />
                <span>All Locations</span>
              </Link>

              {loadingLocationTypes && <span className="nav-helper">Loading location types…</span>}
              {!loadingLocationTypes && locationTypeError && (
                <span className="nav-helper error">{locationTypeError}</span>
              )}

              {!loadingLocationTypes &&
                !locationTypeError &&
                locationTypes
                  .filter((type) => type.focus === true)
                  .map((type) => (
                    <Link
                      key={type.id}
                      to={`/locations?locationType=${type.id}`}
                      className={`nav-entity-type ${
                        location.pathname === '/locations' &&
                        new URLSearchParams(location.search).get('locationType') === type.id
                          ? 'active'
                          : ''
                      }`}
                    >
                      <span className="nav-entity-label">{type.name}</span>
                      <span className="nav-entity-count">{type.locationCount || 0}</span>
                    </Link>
                  ))}

              {!loadingLocationTypes &&
                !locationTypeError &&
                locationTypes.filter((type) => type.focus !== true).length > 0 && (
                  <div className={`nav-group ${otherLocationTypesCollapsed ? 'collapsed' : ''}`}>
                    <button
                      type="button"
                      className="nav-heading-btn"
                      onClick={() => setOtherLocationTypesCollapsed((prev) => !prev)}
                      aria-expanded={!otherLocationTypesCollapsed}
                      aria-controls="other-locations-nav"
                    >
                      <span className="nav-heading">Other Types</span>
                      <ChevronDown
                        size={14}
                        className={`nav-heading-icon ${otherLocationTypesCollapsed ? 'collapsed' : ''}`}
                      />
                    </button>
                    <div id="other-locations-nav" className="nav-sub-links">
                      {locationTypes
                        .filter((type) => type.focus !== true)
                        .map((type) => (
                          <Link
                            key={type.id}
                            to={`/locations?locationType=${type.id}`}
                            className={`nav-entity-type ${
                              location.pathname === '/locations' &&
                              new URLSearchParams(location.search).get('locationType') === type.id
                                ? 'active'
                                : ''
                            }`}
                          >
                            <span className="nav-entity-label">{type.name}</span>
                            <span className="nav-entity-count">{type.locationCount || 0}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* --- Notes --- */}
        <div className={`nav-group ${notesCollapsed ? 'collapsed' : ''}`}>
          <button
            type="button"
            className="nav-heading-btn"
            onClick={() => setNotesCollapsed((prev) => !prev)}
            aria-expanded={!notesCollapsed}
            aria-controls="notes-nav"
          >
            <span className="nav-heading">Notes</span>
            <ChevronDown
              size={14}
              className={`nav-heading-icon ${notesCollapsed ? 'collapsed' : ''}`}
            />
          </button>
          <div id="notes-nav" className="nav-sub-links">
            {!selectedCampaignId && (
              <span className="nav-helper">Select a campaign to view notes</span>
            )}
            {selectedCampaignId && !canAccessCampaignNotes && (
              <span className="nav-helper">Notes are available to campaign members</span>
            )}
            {canAccessCampaignNotes && (
              <>
                <Link
                  to="/notes/session"
                  className={isActive('/notes/session') ? 'active' : ''}
                >
                  <NotebookPen size={16} className="nav-icon" />
                  <span>Session Notes</span>
                </Link>
                <Link
                  to="/notes/entities"
                  className={isActive('/notes/entities') ? 'active' : ''}
                >
                  <FileText size={16} className="nav-icon" />
                  <span>Entity Notes</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* --- Characters --- */}
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
            {selectedCampaignId && isPlayerInSelectedCampaign && (
              <Link
                to="/characters/companions"
                className={isActive('/characters/companions') ? 'active' : ''}
              >
                My Companions
              </Link>
            )}
            {selectedCampaignId && isDMInSelectedCampaign && (
              <Link
                to="/characters/others"
                className={isActive('/characters/others') ? 'active' : ''}
              >
                All Characters
              </Link>
            )}
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

        {/* --- Requests --- */}
        <Link
          to="/requests"
          className={isActive('/requests') ? 'active' : ''}
        >
          <FileText size={16} className="nav-icon" />
          <span>Feature/Bugs</span>
        </Link>

        {/* --- Admin Users --- */}
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
