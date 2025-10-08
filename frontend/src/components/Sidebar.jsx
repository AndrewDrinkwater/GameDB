import { Link, useLocation } from 'react-router-dom'
import { Pin } from 'lucide-react'

export default function Sidebar({ open, pinned, onPinToggle, onClose }) {
  const location = useLocation()

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
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Worlds
        </Link>
        <Link
          to="/campaigns"
          className={location.pathname === '/campaigns' ? 'active' : ''}
        >
          Campaigns
        </Link>
        <Link
          to="/characters"
          className={location.pathname === '/characters' ? 'active' : ''}
        >
          Characters
        </Link>
      </nav>
    </aside>
  )
}
