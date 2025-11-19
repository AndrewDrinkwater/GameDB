import { useState } from 'react'
import { changePassword } from '../api/auth.js'

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Client-side validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError('All fields are required')
        setLoading(false)
        return
      }

      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long')
        setLoading(false)
        return
      }

      if (newPassword !== confirmPassword) {
        setError('New password and confirmation do not match')
        setLoading(false)
        return
      }

      await changePassword(currentPassword, newPassword)

      setSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Security</h1>
          <p className="settings-subtitle">Manage your account security</p>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Change Password</h2>
          <p className="settings-section-description">
            Enter your current password and choose a new password to update your account security.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (minimum 6 characters)"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
            </div>

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}

            <button type="submit" disabled={loading} className="settings-submit-btn">
              {loading ? 'Changing password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

