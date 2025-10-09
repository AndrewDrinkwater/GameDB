import { useState } from 'react'
import HeaderBar from './HeaderBar.jsx'
import Sidebar from './Sidebar.jsx'
import { Outlet } from 'react-router-dom'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPinned, setMenuPinned] = useState(false)

  return (
    <div className="app-shell">
      <HeaderBar onMenuToggle={() => setMenuOpen(!menuOpen)} />
      <div className="app-body">
        <Sidebar
          open={menuOpen || menuPinned}
          pinned={menuPinned}
          onPinToggle={() => setMenuPinned(!menuPinned)}
          onClose={() => setMenuOpen(false)}
        />
        <main className={`content ${menuPinned ? 'pinned' : ''}`}>
          <Outlet /> {/* ✅ Renders child route (Worlds, Campaigns, etc.) */}
        </main>
      </div>
    </div>
  )
}
