import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Download,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ListChecks,
  FileCheck,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { getWorldEntityTypeUsage } from '../../api/entityTypes.js'
import StepCard from '../../components/bulkUpload/StepCard.jsx'
import UploadedFileList from '../../components/bulkUpload/UploadedFileList.jsx'
import PreviewPopout from '../../components/bulkUpload/PreviewPopout.jsx'
import './BulkUploadPage.css'

export default function BulkUploadPage() {
  const { token } = useAuth()
  const { selectedCampaign } = useCampaignContext()
  const worldId = selectedCampaign?.world?.id ?? ''

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
  const [isPopoutOpen, setIsPopoutOpen] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const fileInputRef = useRef(null)

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] ?? null
    setFile(selectedFile)
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
      setMessage('File uploaded successfully.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchFiles()
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

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
      if (selectedUpload === id) {
        setSelectedUpload(null)
        setPreview(null)
      }
      await fetchFiles()
    } catch (err) {
      console.error('❌ Delete error:', err)
      setError(err.message)
    }
  }

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

      setMessage('Template generated successfully.')
    } catch (err) {
      console.error('❌ Template generation failed', err)
      setError('Failed to generate template')
    }
  }

  const handlePreview = async () => {
    if (!selectedType) return setError('Select an Entity Type first.')
    if (!selectedUpload) return setError('Select an uploaded file to preview.')
    if (!worldId) return setError('No world selected for the current campaign.')

    setPreviewing(true)
    setIsPopoutOpen(true)
    setPreview(null)
    setPreviewError('')
    setMessage('')
    setError('')

    try {
      const res = await fetch(`/api/entities/preview/${selectedType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: selectedUpload, worldId }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Preview failed')

      setPreview(data.summary)
    } catch (err) {
      console.error('❌ Preview failed:', err)
      setPreviewError(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!selectedType) return setError('Select an Entity Type first.')
    if (!selectedUpload) return setError('Select an uploaded file to import.')
    if (!worldId) return setError('No world selected for the current campaign.')

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
        body: JSON.stringify({ fileId: selectedUpload, worldId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Import failed')
      setMessage(data.message || 'Import completed successfully.')
      setIsPopoutOpen(false)
      setPreview(null)
      await fetchFiles()
    } catch (err) {
      console.error('❌ Import error:', err)
      setPreviewError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleClosePopout = () => {
    if (importing || previewing) return
    setIsPopoutOpen(false)
    setPreviewError('')
  }

  const selectedTypeName = useMemo(
    () => entityTypes.find((type) => String(type.id) === String(selectedType))?.name ?? '',
    [entityTypes, selectedType],
  )

  const selectedUploadDetails = useMemo(
    () => uploadedFiles.find((fileItem) => fileItem.id === selectedUpload) ?? null,
    [uploadedFiles, selectedUpload],
  )

  useEffect(() => {
    setSelectedUpload(null)
    setPreview(null)
    setIsPopoutOpen(false)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setMessage('')
    setError('')
    setPreviewError('')
  }, [selectedType])

  return (
    <div className="bulk-upload-page">
      <div className="bulk-upload-page__header">
        <h1 className="bulk-upload-page__title">Bulk Entity Upload</h1>
        <p className="bulk-upload-page__subtitle">
          Follow the guided steps to prepare your template, upload a data file, preview the import, and
          launch the upload from a dedicated review panel.
        </p>
      </div>

      {message && (
        <div className="bulk-upload-page__status">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bulk-upload-page__status bulk-upload-page__status--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="bulk-upload-page__grid">
        <StepCard
          step="Select"
          title="Choose an entity type"
          subtitle={
            loadingTypes
              ? 'Loading entity types for this world...'
              : 'Pick which entity type you want to work with. Steps unlock after choosing.'
          }
        >
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="entity-type-select"
          >
            <option value="">{loadingTypes ? 'Loading…' : 'Select Entity Type'}</option>
            {entityTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </StepCard>

        {selectedType && (
          <>
            <StepCard
              step={1}
              title="Generate a template"
              subtitle="Download a spreadsheet tailored to the selected entity type."
            >
              <div className="step-actions">
                <button type="button" className="primary-action" onClick={handleGenerateTemplate}>
                  <Download size={18} />
                  Download template
                </button>
                {selectedTypeName && (
                  <span className="selected-file-banner">
                    <Sparkles size={16} /> Template matches {selectedTypeName}
                  </span>
                )}
              </div>
            </StepCard>

            <StepCard
              step={2}
              title="Upload your file"
              subtitle="Upload the filled spreadsheet and pick which file to preview."
            >
              <div className="file-input">
                <label htmlFor="bulk-upload-file">
                  <UploadCloud size={20} />
                  <div>
                    <div className="file-input__name">{file ? file.name : 'Select a file to upload'}</div>
                    <small>Supported format: Excel (.xlsx)</small>
                  </div>
                </label>
                <input
                  ref={fileInputRef}
                  id="bulk-upload-file"
                  type="file"
                  hidden
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="secondary-action"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                >
                  {uploading ? <Loader2 className="spin" size={18} /> : <UploadCloud size={18} />}
                  Upload file
                </button>
              </div>
              {selectedUploadDetails && (
                <div className="selected-file-banner">
                  <FileCheck size={16} /> Selected file: {selectedUploadDetails.file_name}
                </div>
              )}
              <UploadedFileList
                files={uploadedFiles}
                selectedId={selectedUpload}
                onSelect={(id) => {
                  setSelectedUpload(id)
                  setPreview(null)
                }}
                onDelete={handleDelete}
              />
            </StepCard>

            <StepCard
              step={3}
              title="Run a preview"
              subtitle="Review potential changes in the popout before committing to an upload."
            >
              <div className="step-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={handlePreview}
                  disabled={!selectedUpload || previewing}
                >
                  {previewing ? <Loader2 className="spin" size={18} /> : <ListChecks size={18} />}
                  Preview import
                </button>
                <span className="bulk-upload-page__empty-state">
                  The upload can only be launched from the preview popout.
                </span>
              </div>
            </StepCard>

            <StepCard
              step={4}
              title="Launch the upload"
              subtitle="Confirm the summary inside the popout, then run the upload from there."
            >
              <div className="step-actions">
                <span className="bulk-upload-page__empty-state">
                  After reviewing the preview, use the <strong>Run upload</strong> button in the panel to finish.
                </span>
                <span className="selected-file-banner">
                  <ArrowRight size={16} /> Preview popout controls the final import.
                </span>
              </div>
            </StepCard>
          </>
        )}
      </div>

      <PreviewPopout
        isOpen={isPopoutOpen}
        onClose={handleClosePopout}
        preview={preview}
        previewing={previewing}
        importing={importing}
        onImport={handleImport}
        error={previewError}
      />
    </div>
  )
}
