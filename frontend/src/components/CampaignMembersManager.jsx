import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchUsers } from '../api/users'
import {
  addUserToCampaign,
  fetchAssignmentsByCampaign,
  removeUserFromCampaign,
  updateCampaignAssignment,
} from '../api/userCampaignRoles'

const ROLE_OPTIONS = [
  { label: 'Dungeon Master', value: 'dm' },
  { label: 'Player', value: 'player' },
  { label: 'Observer', value: 'observer' },
]

export default function CampaignMembersManager({ campaignId, canManage, onMembersChanged }) {
  const [members, setMembers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState({ user_id: '', role: 'player' })
  const [saving, setSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!campaignId) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetchAssignmentsByCampaign(campaignId)
      const list = res?.data || []
      setMembers(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetchUsers()
      const data = res?.data || []
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users', err)
    }
  }, [])

  useEffect(() => {
    loadMembers()
    if (canManage) {
      loadUsers()
    }
  }, [loadMembers, loadUsers, canManage])

  const availableUsers = useMemo(() => {
    if (!Array.isArray(users)) return []
    const assignedIds = new Set(members.map((m) => m.user_id))
    return users
      .filter((user) => !assignedIds.has(user.id))
      .map((user) => ({ value: user.id, label: user.username || user.email || user.id }))
  }, [users, members])

  const resetForm = useCallback(() => {
    setFormState({ user_id: '', role: 'player' })
  }, [])

  const handleAdd = async (event) => {
    event.preventDefault()
    if (!formState.user_id) return
    setSaving(true)
    setError(null)
    try {
      const res = await addUserToCampaign({
        campaign_id: campaignId,
        user_id: formState.user_id,
        role: formState.role,
      })
      const record = res?.data
      if (record) {
        setMembers((prev) => {
          const existing = prev.find((item) => item.id === record.id)
          const nextMembers = existing
            ? prev.map((item) => (item.id === record.id ? record : item))
            : [record, ...prev]

          if (typeof onMembersChanged === 'function') {
            onMembersChanged(nextMembers)
          }

          return nextMembers
        })
        resetForm()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenForm = () => {
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    resetForm()
  }

  const handleRoleChange = async (id, role) => {
    setError(null)
    try {
      const res = await updateCampaignAssignment(id, { role })
      const record = res?.data
      if (record) {
        setMembers((prev) => {
          const nextMembers = prev.map((item) => (item.id === record.id ? record : item))

          if (typeof onMembersChanged === 'function') {
            onMembersChanged(nextMembers)
          }

          return nextMembers
        })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('Remove this user from the campaign?')) return
    setError(null)
    try {
      await removeUserFromCampaign(id)
      setMembers((prev) => {
        const nextMembers = prev.filter((item) => item.id !== id)

        if (typeof onMembersChanged === 'function') {
          onMembersChanged(nextMembers)
        }

        return nextMembers
      })
    } catch (err) {
      setError(err.message)
    }
  }

  if (!campaignId) return null

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h3>Campaign Members</h3>
          {canManage ? (
            <button
              type="button"
              className="btn submit"
              onClick={handleOpenForm}
              disabled={availableUsers.length === 0}
            >
              Add User
            </button>
          ) : null}
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading members…</p>
        ) : members.length === 0 ? (
          <p>No users associated with this campaign yet.</p>
        ) : (
          <table className="compact-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Added</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.user?.username || member.user?.email || member.user_id}</td>
                  <td>
                    {canManage ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      member.role
                    )}
                  </td>
                  <td>
                    {member.createdAt ? new Date(member.createdAt).toLocaleString() : '—'}
                  </td>
                  {canManage ? (
                    <td>
                      <button type="button" className="btn danger" onClick={() => handleRemove(member.id)}>
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManage && availableUsers.length === 0 ? (
          <p className="help-text">All registered users are already assigned.</p>
        ) : null}
      </div>
      {canManage && isFormOpen ? (
        <div className="member-form-popout" role="dialog" aria-modal="true">
          <div className="member-form-popout-backdrop" onClick={handleCloseForm} />
          <form className="member-form-popout-content" onSubmit={handleAdd}>
            <div className="member-form-popout-header">
              <h4>Add user to campaign</h4>
              <button
                type="button"
                className="member-form-popout-close"
                onClick={handleCloseForm}
                aria-label="Close add user form"
              >
                ×
              </button>
            </div>
            <div className="form-grid cols-1">
              <div className="form-group">
                <label>User</label>
                <select
                  value={formState.user_id}
                  onChange={(e) => setFormState((prev) => ({ ...prev, user_id: e.target.value }))}
                  disabled={saving || availableUsers.length === 0}
                >
                  <option value="">Select user…</option>
                  {availableUsers.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formState.role}
                  onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value }))}
                  disabled={saving}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {availableUsers.length === 0 ? (
              <p className="help-text">All registered users are already assigned.</p>
            ) : null}
            <div className="member-form-popout-actions">
              <button type="button" className="btn cancel" onClick={handleCloseForm}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn submit"
                disabled={saving || !formState.user_id}
              >
                {saving ? 'Saving…' : 'Add user'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
