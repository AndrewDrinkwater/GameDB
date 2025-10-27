import PropTypes from '../../utils/propTypes'
import { ChevronDown, ChevronUp, Maximize2, Target } from 'lucide-react'
import './RelationshipToolbar.css'

export default function RelationshipToolbar({
  onRefocus,
  onZoomToFit,
  depth,
  onIncreaseDepth,
  onDecreaseDepth,
}) {
  return (
    <div className="relationship-toolbar" role="toolbar" aria-label="Relationship viewer controls">
      <button
        type="button"
        className="relationship-toolbar__button"
        onClick={onRefocus}
      >
        <Target size={16} aria-hidden="true" />
        <span>Refocus</span>
      </button>

      <button
        type="button"
        className="relationship-toolbar__button"
        onClick={onZoomToFit}
      >
        <Maximize2 size={16} aria-hidden="true" />
        <span>Zoom to fit</span>
      </button>

      <div className="relationship-toolbar__levels" aria-label="Relationship depth controls">
        <span className="relationship-toolbar__levels-label">Levels</span>
        <div className="relationship-toolbar__levels-controls">
          <button
            type="button"
            className="relationship-toolbar__levels-button"
            onClick={onIncreaseDepth}
            disabled={depth >= 3}
            aria-label="Increase relationship depth"
          >
            <ChevronUp size={14} aria-hidden="true" />
          </button>
          <span className="relationship-toolbar__levels-value" aria-live="polite">
            {depth}
          </span>
          <button
            type="button"
            className="relationship-toolbar__levels-button"
            onClick={onDecreaseDepth}
            disabled={depth <= 1}
            aria-label="Decrease relationship depth"
          >
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

RelationshipToolbar.propTypes = {
  onRefocus: PropTypes.func.isRequired,
  onZoomToFit: PropTypes.func.isRequired,
  depth: PropTypes.number.isRequired,
  onIncreaseDepth: PropTypes.func.isRequired,
  onDecreaseDepth: PropTypes.func.isRequired,
}
