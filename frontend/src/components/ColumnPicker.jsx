import { useEffect, useRef } from 'react'

export default function ColumnPicker({ columns, visibleCols, onChange, onClose }) {
  const pickerRef = useRef(null)

  // Auto-close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const toggleCol = (key) => {
    onChange(
      visibleCols.includes(key)
        ? visibleCols.filter((c) => c !== key)
        : [...visibleCols, key]
    )
  }

  const resetCols = () => {
    onChange(columns.map((c) => c.key))
    onClose()
  }

  return (
    <div className="column-picker" ref={pickerRef}>
      <div className="column-picker-list">
        {columns.map((col) => (
          <label key={col.key} className="column-option">
            <input
              type="checkbox"
              checked={visibleCols.includes(col.key)}
              onChange={() => toggleCol(col.key)}
            />
            {col.label}
          </label>
        ))}
      </div>
      <button className="reset-btn" onClick={resetCols}>
        Reset Columns
      </button>
    </div>
  )
}
