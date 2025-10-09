import { useEffect, useState } from 'react'
import { fetchUsers, createUser, updateUser, removeUser } from '../api/users.js'
import FormRenderer from '../components/RecordForm/FormRenderer.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const schema = {
  title: 'User',
  fields: [
    { key: 'username', label: 'Username', type: 'text' },
    { key: 'password', label: 'Password', type: 'text', inputType: 'password' },
    { key: 'role', label: 'Role', type: 'select', options: ['player', 'gm', 'system_admin'] },
  ],
}

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (user?.role !== 'system_admin') return
    loadUsers()
  }, [user])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const json = await fetchUsers()
      setUsers(json.data || [])
    } catch (err) {
      console.error('❌ Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (formData) => {
    try {
      if (selected?.id) {
        await updateUser(selected.id, formData)
      } else {
        await createUser(formData)
      }
      setShowForm(false)
      setSelected(null)
      loadUsers()
    } catch (err) {
      alert(`Error saving user: ${err.message}`)
    }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.username}"?`)) return
    try {
      await removeUser(u.id)
      loadUsers()
    } catch (err) {
      alert(`Error deleting user: ${err.message}`)
    }
  }

  if (!user || user.role !== 'system_admin') {
    return <p className="error">Access denied. Admins only.</p>
  }

  return (
    <div className="page users-page">
      <header className="page-header">
        <h1>Users</h1>
        <button className="btn primary" onClick={() => { setSelected(null); setShowForm(true) }}>
          New User
        </button>
      </header>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td className="actions">
                  <button onClick={() => { setSelected(u); setShowForm(true) }}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <FormRenderer
              schema={schema}
              initialData={selected || {}}
              onSubmit={handleSave}
              onCancel={() => setShowForm(false)}
              onDelete={selected ? () => handleDelete(selected) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}
