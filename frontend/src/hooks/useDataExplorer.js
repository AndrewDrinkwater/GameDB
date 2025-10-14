import { useCallback, useMemo, useState } from 'react'
import {
  compareValues,
  createSearchMatcher,
  DEFAULT_FILTER_CONFIG,
  evaluateCondition,
  formatValueForDisplay,
  getInitialCondition,
  hasActiveFilters,
  normaliseDataType,
} from '../utils/dataExplorer.js'

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined
  if (typeof path !== 'string') return undefined
  const segments = path.split('.')
  let current = obj
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    current = current[segment]
  }
  return current
}

const ensureArray = (value) => {
  if (!Array.isArray(value)) return []
  return value
}

const deriveColumns = (columns = []) =>
  columns.map((column) => ({
    ...column,
    dataType: normaliseDataType(column.dataType || column.type),
  }))

const DEFAULT_OPTIONS = {}

export default function useDataExplorer(data, options = DEFAULT_OPTIONS) {
  const derivedColumns = useMemo(() => deriveColumns(options.columns || []), [options.columns])
  const columnMap = useMemo(() => new Map(derivedColumns.map((col) => [col.key, col])), [derivedColumns])

  const getValue = useCallback(
    (item, key) => {
      const column = columnMap.get(key) || {}
      if (typeof column.accessor === 'function') {
        return column.accessor(item)
      }
      if (column.path) {
        return getByPath(item, column.path)
      }
      return getByPath(item, key) ?? item?.[key]
    },
    [columnMap],
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [sortState, setSortState] = useState({ key: '', direction: 'asc' })
  const [groupBy, setGroupBy] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTER_CONFIG)
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())

  const resetCollapsedGroups = useCallback(() => {
    setCollapsedGroups(new Set())
  }, [])

  const toggleSort = useCallback((key) => {
    if (!key) return
    setSortState((prev) => {
      if (prev.key === key) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc'
        return { key, direction: nextDirection }
      }
      return { key, direction: 'asc' }
    })
  }, [])

  const updateGroupBy = useCallback(
    (key) => {
      setGroupBy((prev) => {
        const next = prev === key ? '' : key
        if (next !== prev) {
          resetCollapsedGroups()
        }
        return next
      })
    },
    [resetCollapsedGroups],
  )

  const searchMatcher = useMemo(() => createSearchMatcher(searchTerm), [searchTerm])

  const searchableColumns = useMemo(
    () => derivedColumns.filter((column) => column.searchable !== false),
    [derivedColumns],
  )

  const dataAfterSearch = useMemo(() => {
    if (!searchTerm) return ensureArray(data)
    const matcher = searchMatcher
    return ensureArray(data).filter((item) =>
      searchableColumns.some((column) => {
        const value = getValue(item, column.key)
        return matcher(value)
      }),
    )
  }, [data, searchMatcher, getValue, searchableColumns, searchTerm])

  const filterConfig = useMemo(() => filters || DEFAULT_FILTER_CONFIG, [filters])
  const filterConditions = useMemo(() => ensureArray(filterConfig.conditions), [filterConfig])
  const logicOperator = (filterConfig.logic || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND'
  const filterActive = hasActiveFilters(filterConfig)

  const dataAfterFilters = useMemo(() => {
    if (!filterActive) return dataAfterSearch
    return dataAfterSearch.filter((item) => {
      const evaluations = filterConditions.map((condition) => {
        const column = columnMap.get(condition.field)
        if (!column || !condition.operator) return false
        const value = getValue(item, condition.field)
        return evaluateCondition(value, condition, column.dataType)
      })
      return logicOperator === 'OR'
        ? evaluations.some(Boolean)
        : evaluations.every(Boolean)
    })
  }, [dataAfterSearch, filterConditions, columnMap, getValue, logicOperator, filterActive])

  const sortedData = useMemo(() => {
    const list = ensureArray(dataAfterFilters)
    if (!sortState.key) return list
    const column = columnMap.get(sortState.key)
    if (!column) return list
    const sorted = [...list]
    sorted.sort((a, b) => {
      const valueA = getValue(a, sortState.key)
      const valueB = getValue(b, sortState.key)
      const comparison = compareValues(valueA, valueB, column.dataType)
      return sortState.direction === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [dataAfterFilters, sortState, columnMap, getValue])

  const groups = useMemo(() => {
    if (!groupBy) return []
    const column = columnMap.get(groupBy)
    if (!column) return []
    const collection = []
    const indexMap = new Map()

    sortedData.forEach((item) => {
      const value = getValue(item, groupBy)
      const display = formatValueForDisplay(value, column.dataType)
      const key = `${groupBy}:${display}`
      if (!indexMap.has(key)) {
        indexMap.set(key, collection.length)
        collection.push({
          id: key,
          value,
          label: display,
          items: [],
        })
      }
      const index = indexMap.get(key)
      collection[index].items.push(item)
    })

    return collection
  }, [sortedData, groupBy, columnMap, getValue])

  const toggleGroupCollapse = useCallback((groupId) => {
    if (!groupId) return
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const isGroupCollapsed = useCallback(
    (groupId) => (groupId ? collapsedGroups.has(groupId) : false),
    [collapsedGroups],
  )

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_CONFIG)
  }, [])

  const setFilterConfig = useCallback((config) => {
    if (!config || typeof config !== 'object') {
      setFilters(DEFAULT_FILTER_CONFIG)
      return
    }
    const logic = (config.logic || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND'
    const conditions = ensureArray(config.conditions).map((condition) => {
      const column = columnMap.get(condition.field)
      if (!column) return null
      return {
        ...condition,
        field: column.key,
        operator: condition.operator || getInitialCondition(column.key, column.dataType).operator,
        value: condition.value ?? '',
      }
    })
    setFilters({
      logic,
      conditions: conditions.filter(Boolean),
    })
  }, [columnMap])

  const visibleData = groupBy ? groups : sortedData

  return {
    searchTerm,
    setSearchTerm,
    sortState,
    toggleSort,
    groupBy,
    setGroupBy: updateGroupBy,
    filters: filterConfig,
    setFilters: setFilterConfig,
    clearFilters,
    filterActive,
    data: sortedData,
    groups,
    visibleData,
    getValue,
    toggleGroupCollapse,
    isGroupCollapsed,
    columns: derivedColumns,
  }
}
