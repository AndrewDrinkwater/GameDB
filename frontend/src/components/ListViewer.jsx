import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Filter, Settings } from 'lucide-react'
import ColumnPicker from './ColumnPicker'
import SearchBar from './SearchBar'
import useDataExplorer from '../hooks/useDataExplorer.js'
import ConditionBuilderModal from './ConditionBuilderModal.jsx'

export default function ListViewer({
  data,
  columns,
  title,
  extraActions,
  onRowClick,
}) {
  const [visibleCols, setVisibleCols] = useState(columns.map((column) => column.key))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [menuState, setMenuState] = useState({ open: false, column: null, x: 0, y: 0 })

  const resolvedColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        dataType: column.dataType || column.type || 'string',
      })),
    [columns],
  )

  const explorer = useDataExplorer(data, { columns: resolvedColumns })

  const visibleColumns = resolvedColumns.filter((column) => visibleCols.includes(column.key))

  const handleHeaderClick = (column) => {
    explorer.toggleSort(column.key)
  }

  const handleContextMenu = (event, column) => {
    event.preventDefault()
    setMenuState({
      open: true,
      column,
      x: event.clientX,
      y: event.clientY,
    })
  }

  useEffect(() => {
    if (!menuState.open) return
    const close = () => setMenuState({ open: false, column: null, x: 0, y: 0 })
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
    }
  }, [menuState.open])

  const handleGroupBy = (column) => {
    explorer.setGroupBy(column.key)
    setMenuState({ open: false, column: null, x: 0, y: 0 })
  }

  const renderCell = (row, column) => {
    if (typeof column.render === 'function') {
      return column.render(row, explorer.getValue(row, column.key))
    }
    const cellValue = row[column.key]
    if (cellValue !== undefined) return cellValue
    return explorer.getValue(row, column.key)
  }

  const tableHasData = explorer.groupBy
    ? explorer.groups.some((group) => group.items.length > 0)
    : explorer.data.length > 0

  return (
    <div className="list-viewer">
      <div className="list-viewer-header">
        <h2>{title}</h2>

        <div className="list-controls">
          {extraActions && <div className="extra-actions">{extraActions}</div>}

          <SearchBar
            value={explorer.searchTerm}
            onChange={explorer.setSearchTerm}
            placeholder={`Search ${title.toLowerCase()}...`}
          />

          <button
            type="button"
            className={`btn secondary compact${explorer.filterActive ? ' is-active' : ''}`}
            onClick={() => setFilterOpen(true)}
          >
            <Filter size={16} /> Filters
          </button>

          <div className="column-picker-wrapper">
            <button
              className="icon-btn"
              title="Column settings"
              onClick={() => setPickerOpen((prev) => !prev)}
            >
              <Settings size={18} />
            </button>
            {pickerOpen && (
              <div className="column-picker-popover">
                <ColumnPicker
                  columns={resolvedColumns}
                  visibleCols={visibleCols}
                  onChange={setVisibleCols}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {!tableHasData ? (
        <div className="empty-state">
          <p>No results found.</p>
        </div>
      ) : (
        <div className="list-viewer-table-wrapper">
          <table>
            <thead>
              <tr>
                {visibleColumns.map((column) => {
                  const isSorted = explorer.sortState.key === column.key
                  const sortDirection = explorer.sortState.direction
                  const isGrouped = explorer.groupBy === column.key
                  return (
                    <th
                      key={column.key}
                      onClick={() => handleHeaderClick(column)}
                      onContextMenu={(event) => handleContextMenu(event, column)}
                      className="sortable-header"
                      role="button"
                      tabIndex={0}
                    >
                      <span className="header-label">
                        {column.label}
                        {isSorted && (
                          <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                        )}
                        {isGrouped && <span className="group-indicator">Grouped</span>}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {explorer.groupBy
                ? explorer.groups.map((group) => (
                    <Fragment key={group.id}>
                      <tr className="group-header-row">
                        <td colSpan={visibleColumns.length}>
                          <button
                            type="button"
                            className="group-toggle"
                            onClick={() => explorer.toggleGroupCollapse(group.id)}
                          >
                            {explorer.isGroupCollapsed(group.id) ? (
                              <ChevronRight size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </button>
                          <span className="group-label">
                            {group.label} <span className="group-count">({group.items.length})</span>
                          </span>
                        </td>
                      </tr>
                      {!explorer.isGroupCollapsed(group.id) &&
                        group.items.map((row) => (
                          <tr
                            key={row.id}
                            onClick={() => onRowClick && onRowClick(row)}
                            className={onRowClick ? 'clickable-row' : ''}
                          >
                            {visibleColumns.map((column) => (
                              <td key={column.key}>{renderCell(row, column)}</td>
                            ))}
                          </tr>
                        ))}
                    </Fragment>
                  ))
                : explorer.data.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={onRowClick ? 'clickable-row' : ''}
                    >
                      {visibleColumns.map((column) => (
                        <td key={column.key}>{renderCell(row, column)}</td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {menuState.open && menuState.column && (
        <div
          className="column-context-menu"
          style={{ top: menuState.y, left: menuState.x }}
          role="menu"
        >
          <button type="button" onClick={() => handleGroupBy(menuState.column)}>
            {explorer.groupBy === menuState.column.key
              ? 'Remove grouping'
              : `Group by ${menuState.column.label}`}
          </button>
          {explorer.groupBy && explorer.groupBy !== menuState.column.key && (
            <button type="button" onClick={() => handleGroupBy({ key: '' })}>
              Clear grouping
            </button>
          )}
        </div>
      )}

      <ConditionBuilderModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fields={resolvedColumns.map((column) => ({
          key: column.key,
          label: column.label,
          dataType: column.dataType,
        }))}
        value={explorer.filters}
        onApply={(config) => {
          explorer.setFilters(config)
          setFilterOpen(false)
        }}
      />
    </div>
  )
}
