import { X, Loader2, CheckCircle2, AlertTriangle, PlayCircle } from 'lucide-react'
import './PreviewPopout.css'

export default function PreviewPopout({
  isOpen,
  onClose,
  preview,
  previewing,
  importing,
  onImport,
  error,
}) {
  if (!isOpen) return null

  const canImport = Boolean(preview && !previewing && !importing)

  return (
    <div className="preview-popout" role="dialog" aria-modal="true">
      <div className="preview-popout__overlay" onClick={onClose} />
      <div className="preview-popout__panel">
        <header className="preview-popout__header">
          <div>
            <h2>Import Preview</h2>
            <p>Review the summary before running the upload.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="preview-popout__close">
            <X size={20} />
          </button>
        </header>

        <div className="preview-popout__content">
          {previewing && (
            <div className="preview-popout__state">
              <Loader2 className="spin" size={28} />
              <p>Generating preview…</p>
            </div>
          )}

          {!previewing && error && (
            <div className="preview-popout__alert preview-popout__alert--error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!previewing && preview && (
            <div className="preview-popout__summary">
              <div className="preview-popout__summary-grid">
                <SummaryMetric label="Total rows" value={preview.total} />
                <SummaryMetric label="To create" value={preview.createCount} tone="success" />
                <SummaryMetric label="Duplicates" value={preview.duplicateCount} tone="warn" />
                <SummaryMetric label="Invalid" value={preview.invalidCount} tone="error" />
              </div>

              {preview.duplicateCount > 0 && Array.isArray(preview.duplicates) && (
                <div className="preview-popout__list">
                  <h3>Duplicate rows</h3>
                  <ul>
                    {preview.duplicates.map((duplicate) => (
                      <li key={duplicate.row}>
                        <span>Row {duplicate.row}</span>
                        <span className="preview-popout__list-name">{duplicate.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.invalidCount > 0 && Array.isArray(preview.invalidRows) && (
                <div className="preview-popout__list">
                  <h3>Invalid rows</h3>
                  <ul>
                    {preview.invalidRows.map((row) => (
                      <li key={row.row}>
                        <span>Row {row.row}</span>
                        <span className="preview-popout__list-name">{row.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="preview-popout__footer">
          <button type="button" className="preview-popout__dismiss" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="preview-popout__confirm"
            disabled={!canImport}
            onClick={onImport}
          >
            {importing ? <Loader2 className="spin" size={18} /> : <PlayCircle size={18} />}
            Run upload
          </button>
        </footer>
      </div>
    </div>
  )
}

function SummaryMetric({ label, value, tone }) {
  return (
    <div className={`summary-metric${tone ? ` summary-metric--${tone}` : ''}`}>
      <span className="summary-metric__label">{label}</span>
      <span className="summary-metric__value">{value}</span>
      {tone === 'success' && (
        <span className="summary-metric__icon">
          <CheckCircle2 size={18} />
        </span>
      )}
      {tone === 'warn' && (
        <span className="summary-metric__icon">
          <AlertTriangle size={18} />
        </span>
      )}
      {tone === 'error' && (
        <span className="summary-metric__icon">
          <AlertTriangle size={18} />
        </span>
      )}
    </div>
  )
}
