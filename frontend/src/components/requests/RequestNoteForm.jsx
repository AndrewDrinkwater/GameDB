import { useState } from 'react'
import { Send } from 'lucide-react'
import './RequestNoteForm.css'

export default function RequestNoteForm({ onSubmit, loading = false }) {
  const [content, setContent] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit(content.trim())
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="request-note-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        className="request-note-form__textarea"
        rows={3}
        disabled={loading}
      />
      <div className="request-note-form__actions">
        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="request-note-form__submit"
        >
          <Send size={16} />
          {loading ? 'Adding...' : 'Add Note'}
        </button>
      </div>
    </form>
  )
}

