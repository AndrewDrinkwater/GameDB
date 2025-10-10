import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Pin, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Sidebar({ open, pinned, onPinToggle, onClose }) {
  const location = useLocation()
  const { user } = useAuth()
  const [campaignsCollapsed, setCampaignsCollapsed] = useState(false)
  const [charactersCollapsed, setCharactersCollapsed] = useState(false)

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)

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
            <Link
              to="/campaigns/my"
              className={isActive('/campaigns/my') ? 'active' : ''}
            >
              My Campaigns
            </Link>
            <Link
              to="/campaigns/all"
              className={isActive('/campaigns/all') ? 'active' : ''}
            >
              All
            </Link>
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
            <Link
              to="/characters/my"
              className={isActive('/characters/my') ? 'active' : ''}
            >
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
                className={
                  isActive('/characters/all') ? 'active admin-link' : 'admin-link'
                }
              >
                All Characters
              </Link>
            )}
          </div>
        </div>

        {/* Admin-only link */}
        {user?.role === 'system_admin' && (
          <Link
            to="/users"
            className={
              location.pathname === '/users' ? 'active admin-link' : 'admin-link'
            }
            title="User Management (Admin Only)"
          >
            Users
          </Link>
        )}
      </nav>
    </aside>
  )
}
