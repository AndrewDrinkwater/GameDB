import { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Edit2 } from 'lucide-react'
import { fetchRequestNotes, createRequestNote, deleteRequestNote } from '../../api/requestNotes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import RequestNoteForm from './RequestNoteForm.jsx'
import './RequestNotes.css'

export default function RequestNotes({ requestId, canAddNote: canAdd }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  const loadNotes = async () => {
    setLoading(true)
    try {
      const response = await fetchRequestNotes(requestId)
      setNotes(Array.isArray(response?.data) ? response.data : [])
    } catch (err) {
      console.error('Failed to load notes', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (requestId) {
      loadNotes()
    }
  }, [requestId])

  const handleAddNote = async (content) => {
    setSubmitting(true)
    try {
      await createRequestNote(requestId, { content })
      await loadNotes()
    } catch (err) {
      console.error('Failed to add note', err)
      alert('Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      await deleteRequestNote(requestId, noteId)
      await loadNotes()
    } catch (err) {
      console.error('Failed to delete note', err)
      alert('Failed to delete note')
    }
  }

  const handleStartEdit = (note) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = async (noteId) => {
    try {
      const { updateRequestNote } = await import('../../api/requestNotes.js')
      await updateRequestNote(requestId, noteId, { content: editContent })
      setEditingId(null)
      setEditContent('')
      await loadNotes()
    } catch (err) {
      console.error('Failed to update note', err)
      alert('Failed to update note')
    }
  }

  const formatTimeAgo = (date) => {
    if (!date) return ''
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return ''

    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return <div className="request-notes__loading">Loading notes...</div>
  }

  return (
    <div className="request-notes">
      <div className="request-notes__header">
        <MessageSquare size={20} />
        <h3>Notes ({notes.length})</h3>
      </div>

      {canAdd && (
        <RequestNoteForm onSubmit={handleAddNote} loading={submitting} />
      )}

      <div className="request-notes__list">
        {notes.length === 0 ? (
          <div className="request-notes__empty">No notes yet</div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="request-note">
              {editingId === note.id ? (
                <div className="request-note__edit">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="request-note__edit-textarea"
                    rows={3}
                  />
                  <div className="request-note__edit-actions">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="request-note__edit-save"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="request-note__edit-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="request-note__content">{note.content}</div>
                  <div className="request-note__footer">
                    <div className="request-note__meta">
                      <span className="request-note__author">
                        {note.author?.username || 'Unknown'}
                      </span>
                      <span className="request-note__time">
                        {formatTimeAgo(note.createdAt)}
                      </span>
                    </div>
                    {user?.id === note.createdBy && (
                      <div className="request-note__actions">
                        <button
                          onClick={() => handleStartEdit(note)}
                          className="request-note__action"
                          title="Edit note"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="request-note__action"
                          title="Delete note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

