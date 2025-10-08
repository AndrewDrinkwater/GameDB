import { useState } from 'react'
import HeaderBar from './HeaderBar.jx'
import Sidebar from './Sidebar.jsx'
import { logout } from '../api/auth.js' // or wherever it lives

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPinned, setMenuPinned] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/login' // or navigate('/login') if using React Router
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <div className="app-shell">
      <HeaderBar
        onMenuToggle={() => setMenuOpen(!menuOpen)}
        onLogout={handleLogout}
      />
      <Sidebar
        open={menuOpen || menuPinned}
        pinned={menuPinned}
        onPinToggle={() => setMenuPinned(!menuPinned)}
        onClose={() => setMenuOpen(false)}
      />
      <main className="content">{children}</main>
    </div>
  )
}
