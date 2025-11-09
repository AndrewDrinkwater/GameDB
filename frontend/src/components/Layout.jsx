import { useCallback, useEffect, useRef, useState } from 'react'
import HeaderBar from './HeaderBar.jsx'
import Sidebar from './Sidebar.jsx'
import { Outlet, useLocation } from 'react-router-dom'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPinned, setMenuPinned] = useState(true)
  const location = useLocation()
  const pinnedRef = useRef(menuPinned)

  const handleMenuToggle = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  const handlePinToggle = useCallback(() => {
    setMenuPinned((prevPinned) => {
      const nextPinned = !prevPinned
      setMenuOpen(true)
      return nextPinned
    })
  }, [])

  useEffect(() => {
    pinnedRef.current = menuPinned
  }, [menuPinned])

  useEffect(() => {
    if (!pinnedRef.current) {
      setMenuOpen(false)
    }
  }, [location.pathname, location.search])

  return (
    <div className="app-shell">
      <HeaderBar onMenuToggle={handleMenuToggle} />
      <div className="app-body">
        <Sidebar
          open={menuOpen || menuPinned}
          pinned={menuPinned}
          onPinToggle={handlePinToggle}
          onClose={() => setMenuOpen(false)}
        />
        <main className={`content ${menuPinned ? 'pinned' : ''}`}>
          <Outlet /> {/* ✅ Renders child route (Worlds, Campaigns, etc.) */}
        </main>
      </div>
    </div>
  )
}
