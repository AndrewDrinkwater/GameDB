import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import {
  DEFAULT_FILTER_CONFIG,
  getInitialCondition,
  getOperatorsForType,
  hasActiveFilters,
  normaliseDataType,
} from '../utils/dataExplorer.js'
import EntitySearchSelect from '../modules/relationships3/ui/EntitySearchSelect.jsx'

const ensureArray = (value) => (Array.isArray(value) ? value : [])

const buildEnumOptions = (field) => {
  const choices = field?.options?.choices
  if (!Array.isArray(choices) || choices.length === 0) return []

  return choices
    .map((choice, index) => {
      if (choice === null || choice === undefined) return null
      if (typeof choice === 'object') {
        const value =
          choice.value ??
          choice.id ??
          choice.key ??
          choice.slug ??
          `choice-${index}`
        const label =
          choice.label ??
          choice.name ??
          choice.title ??
          choice.display ??
          value
        if (value === null || value === undefined) return null
        return { value: String(value), label: String(label ?? value) }
      }
      const text = String(choice)
      return { value: text, label: text }
    })
    .filter(Boolean)
}

export default function ConditionBuilderModal({
  open,
  onClose,
  fields = [],
  value = DEFAULT_FILTER_CONFIG,
  worldId,
  onApply,
}) {
  const safeFields = Array.isArray(fields) ? fields : []
  const initialFieldKey = safeFields[0]?.key || ''

  const [logic, setLogic] = useState(value.logic || 'AND')
  const [conditions, setConditions] = useState(() => {
    const list = ensureArray(value.conditions)
    if (list.length > 0) return list.map((condition) => ({ ...condition }))
    return [getInitialCondition(initialFieldKey, safeFields[0]?.dataType)]
  })
  
  // Store reference entity labels by entity ID for display
  const [referenceEntityLabels, setReferenceEntityLabels] = useState(new Map())

  useEffect(() => {
    if (!open) return
    setLogic(value.logic || 'AND')
    const list = ensureArray(value.conditions)
    if (list.length > 0) {
      setConditions(list.map((condition) => ({ ...condition })))
    } else {
      setConditions([getInitialCondition(initialFieldKey, safeFields[0]?.dataType)])
    }
  }, [open, value, initialFieldKey, safeFields])

  const handleAddCondition = () => {
    const fallbackField = conditions[0]?.field || initialFieldKey
    const column = safeFields.find((field) => field.key === fallbackField)
    setConditions((prev) => [...prev, getInitialCondition(fallbackField, column?.dataType)])
  }

  const handleFieldChange = (index, nextField) => {
    setConditions((prev) => {
      const next = [...prev]
      const column = safeFields.find((field) => field.key === nextField)
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

  const activeFields = useMemo(() => {
    const safeFields = Array.isArray(fields) ? fields : []
    return safeFields.map((field) => ({
      ...field, // Preserve all field properties including referenceTypeId, referenceTypeName, options, etc.
      originalDataType: field.dataType || field.type || 'string',
      dataType: normaliseDataType(field.dataType || field.type),
    }))
  }, [fields])

  // Handle reference entity selection - store label for display
  const handleReferenceEntityResolved = useCallback((entity, conditionIndex) => {
    if (!entity) {
      setReferenceEntityLabels((prev) => {
        const next = new Map(prev)
        // Find the condition value and remove its label
        const condition = conditions[conditionIndex]
        if (condition?.value) {
          next.delete(String(condition.value))
        }
        return next
      })
      return
    }

    const entityId = String(entity.id)
    const entityLabel = entity.name || `Entity ${entityId}`
    
    setReferenceEntityLabels((prev) => {
      const next = new Map(prev)
      next.set(entityId, entityLabel)
      return next
    })
  }, [conditions])

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
          {Array.isArray(conditions) && conditions.map((condition, index) => {
            const column = activeFields.find((field) => field.key === condition.field) ||
              activeFields[0] || { dataType: 'string', key: '', label: 'Field' }
            const operatorsRaw = getOperatorsForType(column.dataType)
            const operators = Array.isArray(operatorsRaw) ? operatorsRaw : []
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
                  (() => {
                    // Use originalDataType to check field type (before normalization)
                    const originalDataType = column.originalDataType || column.dataType
                    const isBoolean = originalDataType === 'boolean' || originalDataType === 'bool'
                    const isEnum = originalDataType === 'enum'
                    // Check for reference type from various possible locations
                    const referenceTypeIdForCheck =
                      column.referenceTypeId ||
                      column.reference_type_id ||
                      column.referenceType?.id ||
                      null
                    const isReference =
                      (originalDataType === 'reference' || column.dataType === 'reference') &&
                      referenceTypeIdForCheck
                    
                    // Check if we should show a dropdown instead of text input
                    const shouldShowDropdown =
                      (selectedOperator === 'equals' || selectedOperator === 'not_equals') &&
                      (isBoolean || isEnum || isReference)

                    // Boolean dropdown
                    if (shouldShowDropdown && isBoolean) {
                      return (
                        <select
                          className="condition-value"
                          value={condition.value ?? ''}
                          onChange={(event) => handleValueChange(index, event.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      )
                    }

                    // Enum dropdown
                    if (shouldShowDropdown && isEnum) {
                      const enumOptions = buildEnumOptions(column)
                      const safeEnumOptions = Array.isArray(enumOptions) ? enumOptions : []
                      if (safeEnumOptions.length === 0) {
                        // Fallback to text input if no enum options available
                        return (
                          <input
                            className="condition-value"
                            type="text"
                            value={condition.value ?? ''}
                            onChange={(event) => handleValueChange(index, event.target.value)}
                            placeholder="Value"
                          />
                        )
                      }
                      return (
                        <select
                          className="condition-value"
                          value={condition.value ?? ''}
                          onChange={(event) => handleValueChange(index, event.target.value)}
                        >
                          <option value="">Select...</option>
                          {safeEnumOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )
                    }

                    // Reference searchable dropdown
                    if (shouldShowDropdown && isReference) {
                      // Get referenceTypeId from various possible locations
                      const referenceTypeId =
                        column.referenceTypeId ||
                        column.reference_type_id ||
                        column.referenceType?.id ||
                        null
                      const referenceTypeName =
                        column.referenceTypeName ||
                        column.reference_type_name ||
                        column.referenceType?.name ||
                        'entities'
                      const currentValue = condition.value
                      
                      // Ensure referenceTypeId is a string for EntitySearchSelect
                      const allowedTypeIds = referenceTypeId
                        ? [String(referenceTypeId)]
                        : []
                      
                      // EntitySearchSelect can accept either a string ID or an entity object
                      // We'll pass the string ID directly, and it will load the entity internally
                      const entityValue = currentValue || null

                      return (
                        <div className="condition-value-reference">
                          <EntitySearchSelect
                            worldId={worldId}
                            value={entityValue}
                            allowedTypeIds={allowedTypeIds}
                            placeholder={`Search ${referenceTypeName.toLowerCase()}...`}
                            disabled={!worldId || !referenceTypeId}
                            onChange={(entity) => {
                              if (!entity) {
                                handleValueChange(index, '')
                                handleReferenceEntityResolved(null, index)
                              } else {
                                const entityId = String(entity.id)
                                handleValueChange(index, entityId)
                                handleReferenceEntityResolved(entity, index)
                              }
                            }}
                            onResolved={(entity) => handleReferenceEntityResolved(entity, index)}
                            minSearchLength={2}
                          />
                        </div>
                      )
                    }

                    // Default text/number/date input
                    return (
                      <input
                        className="condition-value"
                        type={
                          column.dataType === 'number'
                            ? 'number'
                            : column.dataType === 'date'
                              ? 'date'
                              : 'text'
                        }
                        value={condition.value ?? ''}
                        onChange={(event) => handleValueChange(index, event.target.value)}
                        placeholder="Value"
                      />
                    )
                  })()
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
