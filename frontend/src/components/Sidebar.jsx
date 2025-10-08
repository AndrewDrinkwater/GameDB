import { Pin } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Sidebar({ open, pinned, onPinToggle, onClose }) {
  return (
    <aside
      className={`sidebar ${open ? 'open' : ''}`}
      onMouseLeave={() => !pinned && onClose()}
    >
      <div className="sidebar-header">
        <span>Navigation</span>
        <button
          className="pin-btn"
          onClick={onPinToggle}
          title={pinned ? 'Unpin menu' : 'Pin menu'}
        >
          <Pin size={16} />
        </button>
      </div>

      <nav className="nav-links">
        <Link to="/">Worlds</Link>
        <Link to="/campaigns">Campaigns</Link>
        <Link to="/characters">Characters</Link>
      </nav>
    </aside>
  )
}
