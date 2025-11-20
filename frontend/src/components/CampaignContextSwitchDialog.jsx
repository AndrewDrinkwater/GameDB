import { X } from 'lucide-react'

export default function CampaignContextSwitchDialog({
  open,
  campaignName,
  onSwitch,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="unsaved-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="unsaved-dialog" role="document">
        <div className="unsaved-dialog-header">
          <div>
            <p className="unsaved-dialog-label">Campaign context</p>
            <h2>Switch campaign context?</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </div>
        <div className="unsaved-dialog-body">
          <p>
            This notification is for the campaign <strong>{campaignName || 'another campaign'}</strong>.
            You&apos;re currently viewing a different campaign context.
          </p>
          <p className="unsaved-dialog-help">
            Would you like to switch to the correct campaign context to view this notification?
          </p>
        </div>
        <div className="unsaved-dialog-actions">
          <button
            type="button"
            className="btn submit"
            onClick={onSwitch}
          >
            Switch campaign context
          </button>
          <button
            type="button"
            className="btn cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

