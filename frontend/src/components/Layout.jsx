import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import HeaderBar from './HeaderBar.jsx'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPinned, setMenuPinned] = useState(false)

  const handleMenuToggle = () => setMenuOpen(!menuOpen)
  const handlePinToggle = () => setMenuPinned(!menuPinned)
  const handleClose = () => setMenuOpen(false)

  return (
    <div className="app-shell">
      <HeaderBar onMenuToggle={handleMenuToggle} />

      <div className="app-body">
        <Sidebar
          open={menuOpen || menuPinned}
          pinned={menuPinned}
          onPinToggle={handlePinToggle}
          onClose={handleClose}
        />
        <main className="content">
          <Outlet /> {/* This shows your Worlds, Campaigns, etc. */}
        </main>
      </div>
    </div>
  )
}
