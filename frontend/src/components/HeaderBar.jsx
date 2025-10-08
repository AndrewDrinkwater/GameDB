import { useState, useRef, useEffect } from 'react'
import { User, Menu, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function HeaderBar({ onMenuToggle }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { user, logout } = useAuth()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="app-header">
      <button className="menu-btn" onClick={onMenuToggle}>
        <Menu size={20} />
      </button>

      <h1 className="title">GameDB</h1>

      <div className="user-menu" ref={dropdownRef}>
        <button
          className="user-icon"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title="User Menu"
        >
          <User size={20} />
        </button>

        {dropdownOpen && (
          <div className="user-dropdown">
            <div className="user-info">
              <strong>{user?.username || 'User'}</strong>
              <br />
              <small>{user?.role || ''}</small>
            </div>
            <button onClick={logout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
