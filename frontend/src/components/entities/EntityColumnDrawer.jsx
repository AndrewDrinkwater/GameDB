import { useState, useEffect } from 'react'
import './EntityColumnDrawer.css'

export default function EntityColumnDrawer({
  isOpen,
  onClose,
  columns,
  draftColumnKeys,
  setDraftColumnKeys,
  selectedFilter,
  activeTypeName,
  columnsLoading,
  columnsError,
  columnSelectionError,
  handleUseSystemDefault,
  handleSaveColumns,
  isSavingUserColumns,
  isSavingSystemColumns,
  isSystemAdmin,
  isUserDirty,
  isSystemDirty,
  hasSystemDefault,
  COLUMN_SCOPE_USER,
  COLUMN_SCOPE_SYSTEM,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null)

  const handleToggleColumn = (key) => {
    setDraftColumnKeys((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    )
  }

  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    const items = document.querySelectorAll('.entities-column-item')
    items.forEach((el) => el.classList.remove('is-drop-target-before', 'is-drop-target-after'))
    const target = e.currentTarget
    if (draggedIndex === null) return
    if (index < draggedIndex) target.classList.add('is-drop-target-before')
    else if (index > draggedIndex) target.classList.add('is-drop-target-after')
  }

  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return
    const updated = [...draftColumnKeys]
    const [moved] = updated.splice(draggedIndex, 1)
    updated.splice(index, 0, moved)
    setDraftColumnKeys(updated)
    setDraggedIndex(null)
  }

  useEffect(() => {
    const clearIndicators = () => {
      document
        .querySelectorAll('.entities-column-item')
        .forEach((el) => el.classList.remove('is-drop-target-before', 'is-drop-target-after'))
    }
    window.addEventListener('dragend', clearIndicators)
    return () => window.removeEventListener('dragend', clearIndicators)
  }, [])

  if (!isOpen) return null

  return (
    <div className="entity-column-drawer">
      <div className="drawer-header">
        <h2>Columns for {activeTypeName || selectedFilter || 'Entity Type'}</h2>
        <button onClick={onClose} className="btn secondary">Close</button>
      </div>

      {columnsLoading ? (
        <p>Loading columns...</p>
      ) : columnsError ? (
        <div className="alert error">{columnsError}</div>
      ) : (
        <>
          <ul className="entities-column-list">
            {columns.map((col, index) => {
              const isSelected = draftColumnKeys.includes(col.key)
              const isDragging = draggedIndex === index
              return (
                <li
                  key={col.key}
                  className={`entities-column-item ${isDragging ? 'is-dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleColumn(col.key)}
                  />
                  <span>{col.label}</span>
                </li>
              )
            })}
          </ul>

          {columnSelectionError && (
            <div className="alert error">{columnSelectionError}</div>
          )}

          <div className="drawer-footer">
            <button
              className="btn secondary"
              onClick={handleUseSystemDefault}
              disabled={!hasSystemDefault}
            >
              Use System Default
            </button>
            <button
              className="btn"
              onClick={() => handleSaveColumns(COLUMN_SCOPE_USER)}
              disabled={!isUserDirty || isSavingUserColumns}
            >
              {isSavingUserColumns ? 'Saving...' : 'Save as My Default'}
            </button>
            {isSystemAdmin && (
              <button
                className="btn danger"
                onClick={() => handleSaveColumns(COLUMN_SCOPE_SYSTEM)}
                disabled={!isSystemDirty || isSavingSystemColumns}
              >
                {isSavingSystemColumns ? 'Saving...' : 'Save as System Default'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
