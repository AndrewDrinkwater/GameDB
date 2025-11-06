import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { getWorldEntityTypeUsage } from '../../api/entityTypes.js'
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  PlayCircle,
  Eye,
  XCircle,
} from 'lucide-react'

export default function BulkUploadPage() {
  const { token } = useAuth()
  const { selectedCampaign } = useCampaignContext()

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [entityTypes, setEntityTypes] = useState([])
  const [selectedType, setSelectedType] = useState('')
  const [selectedUpload, setSelectedUpload] = useState(null)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // --- Fetch entity types for world ---
  useEffect(() => {
    const loadEntityTypes = async () => {
      if (!selectedCampaign?.world?.id) return
      setLoadingTypes(true)
      try {
        const res = await getWorldEntityTypeUsage(selectedCampaign.world.id)
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setEntityTypes(data)
      } catch (err) {
        console.warn('⚠️ Failed to load entity types', err)
      } finally {
        setLoadingTypes(false)
      }
    }
    loadEntityTypes()
  }, [selectedCampaign])

  // --- Fetch uploaded files ---
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

  useEffect(() => {
    if (token) fetchFiles()
  }, [token])

  // --- Handle file upload ---
  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setMessage('')
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return setError('Please select a file to upload.')
    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/entities/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')
      setMessage('✅ File uploaded successfully!')
      setFile(null)
      await fetchFiles()
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // --- Delete uploaded file ---
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this upload?')) return
    try {
      const res = await fetch(`/api/entities/upload/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete file')
      setMessage('File deleted.')
      await fetchFiles()
    } catch (err) {
      console.error('❌ Delete error:', err)
      setError(err.message)
    }
  }

  // --- Generate Excel template ---
  const handleGenerateTemplate = async () => {
    if (!selectedType) return
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/entities/template/${selectedType}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to generate template')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Entity_Template.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setMessage('✅ Template generated successfully.')
    } catch (err) {
      console.error('❌ Template generation failed', err)
      setError('Failed to generate template')
    }
  }

  // --- Preview import (matches backend preview route) ---
  const handlePreview = async () => {
    if (!selectedType) return setError('Select an Entity Type first.')
    if (!selectedUpload) return setError('Select an uploaded file to preview.')
    setPreviewing(true)
    setError('')
    setMessage('')
    setShowPreview(false)
    setPreview(null)

    console.log('🟡 Preview request started:', { selectedType, selectedUpload })

    try {
      const res = await fetch(`/api/entities/preview/${selectedType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: selectedUpload }),
      })

      const data = await res.json()
      console.log('🟢 Preview response:', data)

      if (!res.ok || !data.success) throw new Error(data.message || 'Preview failed')

      setPreview(data.summary)
      setShowPreview(true)
    } catch (err) {
      console.error('❌ Preview failed:', err)
      setError(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  // --- Import selected file ---
  const handleImport = async () => {
    if (!selectedType) return setError('Select an Entity Type first.')
    if (!selectedUpload) return setError('Select an uploaded file to import.')
    setImporting(true)
    setMessage('')
    setError('')

    try {
      const res = await fetch(`/api/entities/import/${selectedType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: selectedUpload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Import failed')
      setMessage(data.message || '✅ Import completed successfully.')
    } catch (err) {
      console.error('❌ Import error:', err)
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="bulk-upload-page">
        <h2 className="page-title">Bulk Entity Upload</h2>
        <p className="page-subtitle">
          Generate a spreadsheet template, upload it, then preview and import to create or update entities.
        </p>

        {/* Template generation */}
        <div className="template-section">
          {loadingTypes ? (
            <p>Loading entity types…</p>
          ) : (
            <>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="entity-type-select"
              >
                <option value="">Select Entity Type</option>
                {entityTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <button className="generate-btn" disabled={!selectedType} onClick={handleGenerateTemplate}>
                <Download size={16} /> Generate Template
              </button>
            </>
          )}
        </div>

        {/* Upload */}
        <div className="upload-section">
          <label className="file-input-label">
            <input type="file" onChange={handleFileChange} hidden />
            <div className="file-input-display">
              <UploadCloud size={20} />
              <span>{file ? file.name : 'Select a file to upload'}</span>
            </div>
          </label>

          <button className="upload-btn" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <Loader2 className="animate-spin" size={16} /> : 'Upload File'}
          </button>
        </div>

        {/* Status */}
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

        {/* Uploaded files */}
        <div className="uploaded-files">
          <h3>Uploaded Files</h3>
          {uploadedFiles.length === 0 && <p>No files uploaded yet.</p>}
          {uploadedFiles.length > 0 && (
            <ul>
              {uploadedFiles.map((f) => (
                <li key={f.id} className={selectedUpload === f.id ? 'selected' : ''}>
                  <button
                    className="select-btn"
                    onClick={() => setSelectedUpload(f.id === selectedUpload ? null : f.id)}
                  >
                    <FileText size={14} /> {f.file_name}
                  </button>
                  <small>({(f.size_bytes / 1024).toFixed(1)} KB)</small>
                  <button className="delete-btn" onClick={() => handleDelete(f.id)}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preview + Import */}
        <div className="import-section">
          <button
            className="preview-btn"
            disabled={!selectedUpload || !selectedType || previewing}
            onClick={handlePreview}
          >
            {previewing ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
            Preview Import
          </button>

          <button
            className="import-btn"
            disabled={!selectedUpload || !selectedType || importing}
            onClick={handleImport}
          >
            {importing ? <Loader2 className="animate-spin" size={16} /> : <PlayCircle size={16} />}
            Proceed Import
          </button>
        </div>

        {/* Preview results */}
        {showPreview && preview && (
          <div className="preview-panel">
            <h3>Import Preview Summary</h3>
            <p>Total rows: {preview.total}</p>
            <p>Will create: {preview.createCount}</p>
            <p>Duplicates: {preview.duplicateCount}</p>
            <p>Invalid: {preview.invalidCount}</p>

            {preview.duplicateCount > 0 && (
              <div className="dupes-list">
                <strong>Duplicates:</strong>
                <ul>
                  {preview.duplicates.map((d) => (
                    <li key={d.row}>
                      Row {d.row}: {d.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="close-preview" onClick={() => setShowPreview(false)}>
              <XCircle size={14} /> Close Preview
            </button>
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .bulk-upload-page { padding: 2rem; max-width: 750px; margin: 0 auto; }
        .page-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; }
        .page-subtitle { color: #666; margin-bottom: 1.5rem; }
        .template-section, .upload-section { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .entity-type-select { flex: 1; padding: 0.5rem; border: 1px solid #ccc; border-radius: 6px; }
        .generate-btn, .upload-btn, .import-btn, .preview-btn { display: flex; align-items: center; gap: 0.5rem; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; color: white; }
        .generate-btn { background-color: #059669; }
        .upload-btn { background-color: #2563eb; }
        .preview-btn { background-color: #f59e0b; }
        .import-btn { background-color: #7c3aed; margin-top: 1rem; }
        .delete-btn { background: transparent; border: none; color: #dc2626; cursor: pointer; }
        .status-message { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; padding: 0.75rem 1rem; border-radius: 6px; }
        .status-message.success { background: #e6fbe6; color: #166534; }
        .status-message.error { background: #fef2f2; color: #991b1b; }
        .uploaded-files { margin-top: 2rem; }
        .uploaded-files ul { list-style: none; padding: 0; }
        .uploaded-files li { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin: 0.25rem 0; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; }
        .uploaded-files li.selected { background: #eef2ff; border-color: #6366f1; }
        .select-btn { background: transparent; border: none; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: #2563eb; font-weight: 500; }
        .preview-panel { margin-top: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 6px; background: #fafafa; }
        .dupes-list { margin-top: 1rem; }
        .close-preview { background: transparent; border: none; color: #dc2626; margin-top: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; }
      `}</style>
    </>
  )
}

