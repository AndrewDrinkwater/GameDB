import { useCallback, useEffect, useState } from 'react'
import { fetchUsers, createUser, updateUser, removeUser } from '../api/users'
import ListViewer from '../components/ListViewer'
import FormRenderer from '../components/RecordForm/FormRenderer'
import newSchema from '../components/RecordForm/formSchemas/user.new.json'
import editSchema from '../components/RecordForm/formSchemas/user.edit.json'
import { useAuth } from '../context/AuthContext'

export default function UsersPage() {
  const { user, token, sessionReady } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [selectedUser, setSelectedUser] = useState(null)

  const loadUsers = useCallback(async () => {
    if (!token || user?.role !== 'system_admin') return

    setLoading(true)
    setError(null)
    try {
      const res = await fetchUsers()
      setUsers(res?.data || res || [])
    } catch (err) {
      console.error('❌ Failed to load users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, user?.role])

  useEffect(() => {
    if (sessionReady && token && user?.role === 'system_admin') {
      loadUsers()
    }
  }, [sessionReady, token, user?.role, loadUsers])

  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'createdAt', label: 'Created' },
  ]

  const handleNew = () => {
    setSelectedUser(null)
    setViewMode('new')
  }

  const handleCancel = () => {
    setViewMode('list')
    setSelectedUser(null)
  }

  const handleCreate = async (formData) => {
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role || 'player',
      }

      await createUser(payload)
      setViewMode('list')
      setSelectedUser(null)
      await loadUsers()
    } catch (err) {
      alert(`Error creating user: ${err.message}`)
    }
  }

  const handleUpdate = async (formData) => {
    if (!selectedUser?.id) return

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
      }

      if (formData.password) {
        payload.password = formData.password
      }

      await updateUser(selectedUser.id, payload)
      setViewMode('list')
      setSelectedUser(null)
      await loadUsers()
    } catch (err) {
      alert(`Error updating user: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser?.id) return
    if (!confirm(`Delete user "${selectedUser.username}"?`)) return

    try {
      await removeUser(selectedUser.id)
      setViewMode('list')
      setSelectedUser(null)
      await loadUsers()
    } catch (err) {
      alert(`Error deleting user: ${err.message}`)
    }
  }

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>
  if (!user || user.role !== 'system_admin') return <p className="error">Access denied. Admins only.</p>
  if (loading) return <p>Loading users...</p>
  if (error) return <p className="error">Error: {error}</p>

  if (viewMode === 'new') {
    return (
      <FormRenderer
        schema={newSchema}
        initialData={{}}
        onSubmit={handleCreate}
        onCancel={handleCancel}
      />
    )
  }

  if (viewMode === 'edit') {
    return (
      <FormRenderer
        schema={editSchema}
        initialData={selectedUser || {}}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <ListViewer
      data={users}
      columns={columns}
      title="Users"
      extraActions={
        <button type="button" className="btn submit" onClick={handleNew}>
          + New
        </button>
      }
      onRowClick={(row) => {
        setSelectedUser(row)
        setViewMode('edit')
      }}
    />
  )
}
