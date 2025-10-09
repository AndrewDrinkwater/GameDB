import { Link, useLocation } from 'react-router-dom'
import { Pin } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Sidebar({ open, pinned, onPinToggle, onClose }) {
  const location = useLocation()
  const { user } = useAuth()

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
        <Link
          to="/worlds"
          className={location.pathname === '/worlds' ? 'active' : ''}
        >
          Worlds
        </Link>

        <Link
          to="/campaigns"
          className={location.pathname === '/campaigns' ? 'active' : ''}
        >
          Campaigns
        </Link>

        <div className="nav-group">
          <span className="nav-heading">Characters</span>
          <Link
            to="/characters/my"
            className={location.pathname === '/characters/my' ? 'active' : ''}
          >
            My Characters
          </Link>
          <Link
            to="/characters/others"
            className={location.pathname === '/characters/others' ? 'active' : ''}
          >
            Other Characters
          </Link>
          {user?.role === 'system_admin' && (
            <Link
              to="/characters/all"
              className={
                location.pathname === '/characters/all' ? 'active admin-link' : 'admin-link'
              }
            >
              All Characters
            </Link>
          )}
        </div>

        {/* Admin-only link */}
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
