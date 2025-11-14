import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Trash2, Upload, X } from 'lucide-react'
import { deleteEntityImage, uploadEntityImage } from '../../api/entities.js'
import {
  buildEntityImageUrl,
  resolveEntityResponse,
  withEntityImageFields,
} from '../../utils/entityHelpers.js'

const ACCEPTED_FILE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return ''
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${bytes} bytes`
}

export default function EntityImageCard({
  entity,
  canEdit,
  isEditing,
  onEntityUpdate,
  variant = 'card',
}) {
  const [pendingFile, setPendingFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef(null)

  const hasEntity = Boolean(entity?.id)
  const hasStoredImage = Boolean(entity?.imageData && entity?.imageMimeType)
  const serverImageUrl = useMemo(() => buildEntityImageUrl(entity), [entity])
  const displayUrl = previewUrl || serverImageUrl
  const imageAlt = entity?.name ? `${entity.name} artwork` : 'Entity artwork'
  const isCompact = variant === 'compact'

  const clearPendingFile = useCallback(() => {
    setPendingFile(null)
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return ''
    })
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    if (!isEditing && pendingFile) {
      clearPendingFile()
    }
  }, [isEditing, pendingFile, clearPendingFile])

  const handleFileSelectClick = () => {
    if (!canEdit || !isEditing || uploading || deleting) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!ACCEPTED_FILE_TYPES.has(file.type)) {
      setError('Only PNG or JPG images are allowed.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Image must be smaller than 2 MB.')
      event.target.value = ''
      return
    }

    setError('')
    setPendingFile(file)
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return URL.createObjectURL(file)
    })
  }

  const emitEntityUpdate = useCallback(
    (nextEntity) => {
      if (nextEntity && typeof onEntityUpdate === 'function') {
        onEntityUpdate(nextEntity)
      }
    },
    [onEntityUpdate],
  )

  const handleUpload = async () => {
    if (!pendingFile || !hasEntity) return
    setUploading(true)
    setError('')
    try {
      const response = await uploadEntityImage(entity.id, pendingFile)
      const updated = resolveEntityResponse(response)
      if (!updated) {
        throw new Error('Failed to upload image')
      }
      emitEntityUpdate(updated)
      clearPendingFile()
    } catch (err) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!hasEntity) return
    setDeleting(true)
    setError('')
    try {
      const response = await deleteEntityImage(entity.id)
      const updated = resolveEntityResponse(response)
      if (updated) {
        emitEntityUpdate(updated)
      } else {
        const fallback = withEntityImageFields({
          ...(entity || {}),
          imageData: null,
          imageMimeType: null,
          image_data: null,
          image_mime_type: null,
        })
        emitEntityUpdate(fallback)
      }
      clearPendingFile()
    } catch (err) {
      setError(err.message || 'Failed to delete image')
    } finally {
      setDeleting(false)
    }
  }

  const helperText = useMemo(() => {
    const parts = [
      'PNG or JPG up to 2 MB.',
      'Uploads are resized to 256×256 JPG (~70% quality, ~150 KB).',
    ]
    if (pendingFile) {
      parts.push(`Selected: ${pendingFile.name} (${formatFileSize(pendingFile.size)})`)
    }
    return parts.join(' ')
  }, [pendingFile])

  const ContainerTag = isCompact ? 'div' : 'section'
  const containerClassName = isCompact
    ? 'entity-image-card entity-image-card--compact'
    : 'entity-card entity-image-card'

  return (
    <ContainerTag className={containerClassName}>
      <div className="entity-card-header">
        <div>
          <h3 className="entity-card-title">Image</h3>
          <p>{isCompact ? 'Shown in the dossier summary.' : 'Displayed on the dossier tab.'}</p>
        </div>
        {canEdit && isEditing ? (
          <div className="entity-card-actions">
            {hasStoredImage && !pendingFile ? (
              <button
                type="button"
                className="btn secondary"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Removing…' : (
                  <span className="entity-image-action-label">
                    <Trash2 size={16} aria-hidden="true" /> Remove image
                  </span>
                )}
              </button>
            ) : null}
            <button
              type="button"
              className="btn secondary"
              onClick={handleFileSelectClick}
              disabled={uploading || deleting}
            >
              <span className="entity-image-action-label">
                <Upload size={16} aria-hidden="true" /> Choose image
              </span>
            </button>
          </div>
        ) : null}
      </div>
      <div className="entity-card-body">
        <div className={`entity-image-preview ${displayUrl ? 'has-image' : ''}`.trim()}>
          {displayUrl ? (
            <img src={displayUrl} alt={imageAlt} loading="lazy" />
          ) : (
            <div className="entity-image-placeholder">
              <ImageIcon size={32} aria-hidden="true" />
              <p>No image uploaded</p>
            </div>
          )}
          {pendingFile ? (
            <button
              type="button"
              className="entity-image-preview-clear"
              onClick={clearPendingFile}
              disabled={uploading}
              aria-label="Clear selected image"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {pendingFile && canEdit && isEditing ? (
          <div className="entity-image-actions">
            <button
              type="button"
              className="btn submit"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Save Image'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={clearPendingFile}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>
        ) : null}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          hidden
        />
        <p className="entity-image-helper">{helperText}</p>
        {error ? (
          <p className="entity-image-status entity-image-status--error">{error}</p>
        ) : null}
        {!error && uploading ? (
          <p className="entity-image-status">Uploading image…</p>
        ) : null}
        {!error && deleting ? (
          <p className="entity-image-status">Removing image…</p>
        ) : null}
      </div>
    </ContainerTag>
  )
}
