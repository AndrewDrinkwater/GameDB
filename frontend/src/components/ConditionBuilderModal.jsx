import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import {
  DEFAULT_FILTER_CONFIG,
  getInitialCondition,
  getOperatorsForType,
  hasActiveFilters,
  normaliseDataType,
} from '../utils/dataExplorer.js'

const ensureArray = (value) => (Array.isArray(value) ? value : [])

export default function ConditionBuilderModal({
  open,
  onClose,
  fields = [],
  value = DEFAULT_FILTER_CONFIG,
  onApply,
}) {
  const initialFieldKey = fields[0]?.key || ''

  const [logic, setLogic] = useState(value.logic || 'AND')
  const [conditions, setConditions] = useState(() => {
    const list = ensureArray(value.conditions)
    if (list.length > 0) return list.map((condition) => ({ ...condition }))
    return [getInitialCondition(initialFieldKey, fields[0]?.dataType)]
  })

  useEffect(() => {
    if (!open) return
    setLogic(value.logic || 'AND')
    const list = ensureArray(value.conditions)
    if (list.length > 0) {
      setConditions(list.map((condition) => ({ ...condition })))
    } else {
      setConditions([getInitialCondition(initialFieldKey, fields[0]?.dataType)])
    }
  }, [open, value, initialFieldKey, fields])

  const handleAddCondition = () => {
    const fallbackField = conditions[0]?.field || initialFieldKey
    const column = fields.find((field) => field.key === fallbackField)
    setConditions((prev) => [...prev, getInitialCondition(fallbackField, column?.dataType)])
  }

  const handleFieldChange = (index, nextField) => {
    setConditions((prev) => {
      const next = [...prev]
      const column = fields.find((field) => field.key === nextField)
      next[index] = {
        ...next[index],
        field: nextField,
        operator: getOperatorsForType(column?.dataType)[0]?.value || 'equals',
        value: '',
      }
      return next
    })
  }

  const handleOperatorChange = (index, operator) => {
    setConditions((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        operator,
      }
      return next
    })
  }

  const handleValueChange = (index, nextValue) => {
    setConditions((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        value: nextValue,
      }
      return next
    })
  }

  const handleRemove = (index) => {
    setConditions((prev) => {
      if (prev.length === 1) return prev
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
  }

  const handleApply = () => {
    const filteredConditions = conditions
      .map((condition) => ({ ...condition }))
      .filter((condition) => condition.field && condition.operator)

    if (filteredConditions.length === 0) {
      onApply?.(DEFAULT_FILTER_CONFIG)
      return
    }

    onApply?.({
      logic,
      conditions: filteredConditions,
    })
  }

  const activeFields = useMemo(() => fields.map((field) => ({
    ...field,
    dataType: normaliseDataType(field.dataType || field.type),
  })), [fields])

  if (!open) return null

  return (
    <div className="condition-modal-backdrop" role="dialog" aria-modal="true">
      <div className="condition-modal">
        <div className="condition-modal-header">
          <h2>Filters</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close filters">
            <X size={18} />
          </button>
        </div>

        <div className="condition-logic">
          <span>Match records where</span>
          <div className="logic-toggle" role="group" aria-label="Filter logic">
            <button
              type="button"
              className={`logic-btn${logic === 'AND' ? ' is-active' : ''}`}
              onClick={() => setLogic('AND')}
            >
              All conditions (AND)
            </button>
            <button
              type="button"
              className={`logic-btn${logic === 'OR' ? ' is-active' : ''}`}
              onClick={() => setLogic('OR')}
            >
              Any condition (OR)
            </button>
          </div>
        </div>

        <div className="condition-list">
          {conditions.map((condition, index) => {
            const column = activeFields.find((field) => field.key === condition.field) ||
              activeFields[0] || { dataType: 'string', key: '', label: 'Field' }
            const operators = getOperatorsForType(column.dataType)
            const selectedOperator = condition.operator || operators[0]?.value || 'equals'
            const requiresValue = !['is_true', 'is_false'].includes(selectedOperator)
            return (
              <div className="condition-row" key={condition.id || `${condition.field}-${index}`}>
                <select
                  className="condition-field"
                  value={condition.field || column.key}
                  onChange={(event) => handleFieldChange(index, event.target.value)}
                >
                  {activeFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>

                <select
                  className="condition-operator"
                  value={selectedOperator}
                  onChange={(event) => handleOperatorChange(index, event.target.value)}
                >
                  {operators.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>

                {requiresValue ? (
                  <input
                    className="condition-value"
                    type={column.dataType === 'number' ? 'number' : column.dataType === 'date' ? 'date' : 'text'}
                    value={condition.value ?? ''}
                    onChange={(event) => handleValueChange(index, event.target.value)}
                    placeholder="Value"
                  />
                ) : (
                  <span className="condition-value placeholder">No value</span>
                )}

                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleRemove(index)}
                  disabled={conditions.length === 1}
                  aria-label="Remove condition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="condition-actions">
          <button type="button" className="btn secondary" onClick={handleAddCondition}>
            <Plus size={16} /> Add condition
          </button>
          <div className="condition-action-right">
            {hasActiveFilters(value) && (
              <button type="button" className="btn ghost" onClick={() => onApply?.(DEFAULT_FILTER_CONFIG)}>
                Clear filters
              </button>
            )}
            <button type="button" className="btn submit" onClick={handleApply}>
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
