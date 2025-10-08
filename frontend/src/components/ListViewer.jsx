import { useState, useMemo } from 'react'
import { Settings } from 'lucide-react'
import ColumnPicker from './ColumnPicker'
import SearchBar from './SearchBar'

export default function ListViewer({
  data,
  columns,
  title,
  extraActions,
  onRowClick,
}) {
  const [visibleCols, setVisibleCols] = useState(columns.map((c) => c.key))
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Filter logic
  const filteredData = useMemo(() => {
    if (!search) return data
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [search, data])

  const visibleColumns = columns.filter((c) => visibleCols.includes(c.key))

  return (
    <div className="list-viewer">
      {/* Header: title + controls */}
      <div className="list-viewer-header">
        <h2>{title}</h2>

        <div className="list-controls">
          {/* Extra actions (e.g. New button) */}
          {extraActions && <div className="extra-actions">{extraActions}</div>}

          {/* Search bar */}
          <SearchBar value={search} onChange={setSearch} />

          {/* Column picker */}
          <div className="column-picker-wrapper">
            <button
              className="icon-btn"
              title="Column settings"
              onClick={() => setPickerOpen(!pickerOpen)}
            >
              <Settings size={18} />
            </button>
            {pickerOpen && (
              <div className="column-picker-popover">
                <ColumnPicker
                  columns={columns}
                  visibleCols={visibleCols}
                  onChange={setVisibleCols}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table or empty state */}
      {filteredData.length === 0 ? (
        <div className="empty-state">
          <p>No results found.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'clickable-row' : ''}
              >
                {visibleColumns.map((col) => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
