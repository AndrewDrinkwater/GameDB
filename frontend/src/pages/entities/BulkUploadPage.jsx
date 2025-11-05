import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { UploadCloud, FileText, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export default function BulkUploadPage() {
  const { token } = useAuth()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState([])

  // Fetch uploaded files for the logged-in user
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/entities/upload', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch uploads')
        const data = await res.json()
        setUploadedFiles(data.files || [])
      } catch (err) {
        console.warn('⚠️ Could not fetch uploads', err)
      }
    }

    if (token) fetchFiles()
  }, [token])

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setMessage('')
    setError('')
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    setMessage('')
    setError('')

    try {
      const res = await fetch('/api/entities/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')

      setMessage('✅ File uploaded successfully!')
      setUploadedFiles((prev) => [data.file, ...prev])
      setFile(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bulk-upload-page">
      <h2 className="page-title">Bulk Entity Upload</h2>
      <p className="page-subtitle">
        Upload a spreadsheet or CSV file to bulk-create or update entities.
      </p>

      <div className="upload-section">
        <label className="file-input-label">
          <input type="file" onChange={handleFileChange} hidden />
          <div className="file-input-display">
            <UploadCloud size={20} />
            <span>{file ? file.name : 'Select a file to upload'}</span>
          </div>
        </label>

        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? <Loader2 className="animate-spin" size={16} /> : 'Upload File'}
        </button>
      </div>

      {message && (
        <div className="status-message success">
          <CheckCircle size={16} /> {message}
        </div>
      )}
      {error && (
        <div className="status-message error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Uploaded files list */}
      <div className="uploaded-files">
        <h3>Recent Uploads</h3>
        {uploadedFiles.length === 0 && <p>No files uploaded yet.</p>}
        {uploadedFiles.length > 0 && (
          <ul>
            {uploadedFiles.map((f) => (
              <li key={f.id}>
                <FileText size={14} />{' '}
                <a href={f.file_path} target="_blank" rel="noreferrer">
                  {f.file_name}
                </a>{' '}
                <small>({(f.size_bytes / 1024).toFixed(1)} KB)</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`
        .bulk-upload-page {
          padding: 2rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .page-subtitle {
          color: #666;
          margin-bottom: 1.5rem;
        }
        .upload-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .file-input-label {
          cursor: pointer;
        }
        .file-input-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          border-radius: 6px;
          background-color: #f9f9f9;
          transition: background 0.2s;
        }
        .file-input-display:hover {
          background-color: #f1f1f1;
        }
        .upload-btn {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          cursor: pointer;
        }
        .upload-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .status-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 6px;
        }
        .status-message.success {
          background: #e6fbe6;
          color: #166534;
        }
        .status-message.error {
          background: #fef2f2;
          color: #991b1b;
        }
        .uploaded-files {
          margin-top: 2rem;
        }
        .uploaded-files ul {
          list-style: none;
          padding: 0;
        }
        .uploaded-files li {
          margin: 0.25rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  )
}
