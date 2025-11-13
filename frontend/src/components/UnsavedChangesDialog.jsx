import { X } from 'lucide-react'

export default function UnsavedChangesDialog({
  open,
  eyebrowLabel = 'Heads up',
  title = 'Unsaved changes',
  description = 'You have unsaved changes on this record.',
  destinationLabel = '',
  saving = false,
  onSaveAndContinue,
  onContinueWithoutSaving,
  onStay,
}) {
  if (!open) return null

  const destinationText = destinationLabel
    ? ` before continuing to ${destinationLabel}`
    : ''

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
            onClick={onStay}
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
            onClick={onSaveAndContinue}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={onContinueWithoutSaving}
            disabled={saving}
          >
            Continue without saving
          </button>
          <button
            type="button"
            className="btn cancel"
            onClick={onStay}
            disabled={saving}
          >
            Stay here
          </button>
        </div>
      </div>
    </div>
  )
}
