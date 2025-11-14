import { X } from 'lucide-react'

export default function UnsavedChangesDialog({
  open,
  eyebrowLabel = 'Heads up',
  title = 'Unsaved changes',
  description = 'You have unsaved changes on this record.',
  destinationLabel = '',
  saveLabel = 'Save and continue',
  discardLabel = 'Discard changes',
  cancelLabel = 'Stay here',
  saving = false,
  onClose = () => {},
  onAction = () => {},
}) {
  if (!open) return null

  const destinationText = destinationLabel
    ? ` before continuing to ${destinationLabel}`
    : ''

  const handleSave = () => {
    onAction('save')
  }

  const handleDiscard = () => {
    onAction('discard')
  }

  return (
    <div className="unsaved-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="unsaved-dialog" role="document">
        <div className="unsaved-dialog-header">
          <div>
            <p className="unsaved-dialog-label">{eyebrowLabel}</p>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={saving}
          >
            <X size={18} />
          </button>
        </div>
        <div className="unsaved-dialog-body">
          <p>
            {description}
            {destinationText}.
          </p>
          <p className="unsaved-dialog-help">
            Choose an option below to continue.
          </p>
        </div>
        <div className="unsaved-dialog-actions">
          <button
            type="button"
            className="btn submit"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={handleDiscard}
            disabled={saving}
          >
            {discardLabel}
          </button>
          <button
            type="button"
            className="btn cancel"
            onClick={onClose}
            disabled={saving}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
