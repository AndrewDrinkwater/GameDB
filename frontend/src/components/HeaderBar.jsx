import { useState, useRef, useEffect } from 'react'
import { User, Menu, LogOut } from 'lucide-react'

export default function HeaderBar({ onMenuToggle, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

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
        <button className="user-icon" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <User size={20} />
        </button>

        {dropdownOpen && (
          <div className="user-dropdown">
            <div className="user-info">
              <strong>User:</strong> Admin
            </div>
            <button onClick={onLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
