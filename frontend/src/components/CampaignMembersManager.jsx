import { useCallback, useEffect, useState } from 'react'
import {
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

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
        {canManage ? (
          <p className="help-text">
            Manage who can participate through the Players list. Update roles here to promote
            Dungeon Masters or set observers.
          </p>
        ) : null}
      </div>
    </>
  )
}
