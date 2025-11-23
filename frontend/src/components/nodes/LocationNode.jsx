import { Handle, Position } from 'reactflow'
import { Plus, Info, Link as LinkIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import './nodeStyles.css'

export default function LocationNode({ data }) {
  const label = data?.label || 'Location'
  const typeName = data?.typeName || 'Location'
  const locationId = data?.locationId || data?.id
  const childCount = data?.childCount || 0
  const isOrphan = !data?.parentId
  const dragHoverState = data?.dragHoverState // 'valid', 'invalid', or null
  const isFocused = data?.isFocused || false
  const isCollapsed = data?.isCollapsed || false
  const onToggleCollapse = data?.onToggleCollapse

  const handleAddChild = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!data?.onAddChild || !locationId) return
    data.onAddChild(String(locationId))
  }

  const handleOpenInfo = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!data?.onOpenInfo || !locationId) return
    data.onOpenInfo(String(locationId))
  }

  const handleSetParent = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!data?.onSetParent || !locationId) return
    data.onSetParent(String(locationId))
  }

  const handleToggleCollapse = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!onToggleCollapse || !locationId || childCount === 0) return
    onToggleCollapse(String(locationId))
  }

  const hoverClass =
    dragHoverState === 'valid'
      ? 'location-node--drag-valid'
      : dragHoverState === 'invalid'
        ? 'location-node--drag-invalid'
        : ''
  
  const focusedClass = isFocused ? 'location-node--focused' : ''

  return (
    <div
      className={`location-node ${isOrphan ? 'location-node--orphan' : 'location-node--standard'} ${hoverClass} ${focusedClass}`}
      style={data?.style || {}}
    >
      {!isOrphan && (
        <Handle
          id="top"
          type="target"
          position={Position.Top}
          style={{
            width: 14,
            height: 14,
            background: 'linear-gradient(135deg, #cbd5f5 0%, #a5b4fc 100%)',
            border: '2px solid #ffffff',
            borderRadius: '999px',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.1)',
          }}
        />
      )}

      {/* Collapse/Expand Toggle Button */}
      {childCount > 0 && onToggleCollapse && (
        <button
          type="button"
          className="location-node__collapse-toggle"
          onClick={handleToggleCollapse}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={isCollapsed ? 'Expand children' : 'Collapse children'}
          title={isCollapsed ? 'Expand children' : 'Collapse children'}
        >
          {isCollapsed ? (
            <ChevronRight
              size={14}
              strokeWidth={2.5}
              absoluteStrokeWidth
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              absoluteStrokeWidth
              aria-hidden="true"
            />
          )}
        </button>
      )}

      <div className="location-node__content">
        <div className="location-node__row location-node__row--title">
          <div className="location-node__label" title={label}>
            {label}
          </div>
        </div>
        {typeName && (
          <div className="location-node__row location-node__row--type">
            <div className="location-node__type-pill">
              {typeName}
            </div>
          </div>
        )}
        {childCount > 0 && (
          <div className="location-node__row location-node__row--count">
            <div className="location-node__child-count">
              {childCount} {childCount === 1 ? 'child' : 'children'}
            </div>
          </div>
        )}
        <div className="location-node__row location-node__row--actions">
          <div className="location-node__actions" aria-hidden={!data?.onAddChild && !data?.onOpenInfo && !data?.onSetParent}>
            {isOrphan && data?.onSetParent && (
              <button
                type="button"
                className="location-node__action"
                onClick={handleSetParent}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Set parent location"
                title="Set parent location"
              >
                <LinkIcon
                  size={13}
                  strokeWidth={2.5}
                  absoluteStrokeWidth
                  aria-hidden="true"
                />
              </button>
            )}
            {data?.onAddChild && (
              <button
                type="button"
                className="location-node__action"
                onClick={handleAddChild}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Add child location"
                title="Add child location"
              >
                <Plus
                  size={13}
                  strokeWidth={2.5}
                  absoluteStrokeWidth
                  aria-hidden="true"
                />
              </button>
            )}
            {data?.onOpenInfo && (
              <button
                type="button"
                className="location-node__action"
                onClick={handleOpenInfo}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Open location details"
                title="Open location details"
              >
                <Info
                  size={13}
                  strokeWidth={2.5}
                  absoluteStrokeWidth
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {childCount > 0 && (
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          style={{
            width: 14,
            height: 14,
            background: 'linear-gradient(135deg, #cbd5f5 0%, #a5b4fc 100%)',
            border: '2px solid #ffffff',
            borderRadius: '999px',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.1)',
          }}
        />
      )}
    </div>
  )
}

