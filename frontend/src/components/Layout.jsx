import { useCallback, useEffect, useRef, useState } from 'react'
import HeaderBar from './HeaderBar.jsx'
import Sidebar from './Sidebar.jsx'
import { Outlet, useLocation } from 'react-router-dom'

export default function Layout() {
  const getIsMobile = () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  }

  const [isMobile, setIsMobile] = useState(getIsMobile)
  const [menuPinned, setMenuPinned] = useState(() => !getIsMobile())
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const pinnedRef = useRef(menuPinned)
  const desktopPinnedRef = useRef(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 768px)')

    const handleChange = (event) => {
      setIsMobile(event.matches)
    }

    setIsMobile(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setMenuPinned(false)
      setMenuOpen(false)
    } else {
      const shouldPin = desktopPinnedRef.current
      setMenuPinned(shouldPin)
      setMenuOpen((prevOpen) => (shouldPin ? false : prevOpen))
    }
  }, [isMobile])

  const handleMenuToggle = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  const handlePinToggle = useCallback(() => {
    if (isMobile) return

    setMenuPinned((prevPinned) => {
      const nextPinned = !prevPinned
      desktopPinnedRef.current = nextPinned
      setMenuOpen(!nextPinned)
      return nextPinned
    })
  }, [isMobile])

  useEffect(() => {
    pinnedRef.current = menuPinned
  }, [menuPinned])

  useEffect(() => {
    if (menuPinned || !menuOpen) return undefined

    const handleClickAway = (event) => {
      const target = event.target
      const element =
        target instanceof Element
          ? target
          : target && 'parentElement' in target
            ? target.parentElement
            : null

      if (element?.closest?.('.sidebar')) {
        return
      }

      setMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickAway)

    return () => {
      document.removeEventListener('mousedown', handleClickAway)
    }
  }, [menuPinned, menuOpen])

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
          allowPinning={!isMobile}
          onPinToggle={handlePinToggle}
          onClose={() => setMenuOpen(false)}
        />
        {!menuPinned && menuOpen && (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <main className={`content ${menuPinned ? 'pinned' : ''}`}>
          <Outlet /> {/* ✅ Renders child route (Worlds, Campaigns, etc.) */}
        </main>
      </div>
    </div>
  )
}
