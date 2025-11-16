import { useEffect, useMemo, useState } from 'react'

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'in', label: 'Is one of' },
  { value: 'not_in', label: 'Is not one of' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'is_set', label: 'Has a value' },
  { value: 'is_not_set', label: 'Is empty' },
]

const ACTION_OPTIONS = [
  { value: 'show', label: 'Show field' },
  { value: 'hide', label: 'Hide field' },
]

const MATCH_MODE_OPTIONS = [
  { value: 'all', label: 'All conditions must match' },
  { value: 'any', label: 'Any condition can match' },
  { value: 'none', label: 'None of the conditions can match' },
]

const defaultCondition = () => ({ field: '', operator: 'equals', valuesText: '' })
const defaultAction = () => ({ target: '', action: 'show' })

const normaliseConditions = (conditions = []) => {
  if (!Array.isArray(conditions) || !conditions.length) {
    return [defaultCondition()]
  }

  return conditions.map((condition) => ({
    field: condition.field || condition.fieldKey || '',
    operator: condition.operator || 'equals',
    valuesText: Array.isArray(condition.values) ? condition.values.join(', ') : '',
  }))
}

const normaliseActions = (actions = []) => {
  if (!Array.isArray(actions) || !actions.length) {
    return [defaultAction()]
  }

  return actions.map((action) => ({
    target: action.target || action.field || '',
    action: action.action || 'show',
  }))
}

const parseValuesText = (value) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

export default function FieldRuleForm({
  fields = [],
  initialData = null,
  onSubmit,
  onCancel,
  submitting = false,
  errorMessage = '',
}) {
  const [name, setName] = useState('')
  const [matchMode, setMatchMode] = useState('all')
  const [conditions, setConditions] = useState([defaultCondition()])
  const [actions, setActions] = useState([defaultAction()])
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setName(initialData?.name || '')
    setMatchMode(initialData?.match_mode || initialData?.matchMode || 'all')
    setConditions(normaliseConditions(initialData?.conditions))
    setActions(normaliseActions(initialData?.actions))
  }, [initialData])

  useEffect(() => {
    setLocalError(errorMessage || '')
  }, [errorMessage])

  const fieldOptions = useMemo(
    () =>
      fields.map((field) => ({
        value: field.id || field.name,
        label: field.label || field.name,
      })),
    [fields],
  )

  const handleConditionChange = (index, key, value) => {
    setConditions((prev) => {
      const next = prev.slice()
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const handleActionChange = (index, key, value) => {
    setActions((prev) => {
      const next = prev.slice()
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const addCondition = () => setConditions((prev) => [...prev, defaultCondition()])
  const removeCondition = (index) =>
    setConditions((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)))

  const addAction = () => setActions((prev) => [...prev, defaultAction()])
  const removeAction = (index) => setActions((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!conditions.length) {
      setLocalError('Add at least one condition.')
      return
    }
    if (!actions.length) {
      setLocalError('Add at least one action.')
      return
    }

    const parsedConditions = conditions
      .map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        values: parseValuesText(condition.valuesText || ''),
      }))
      .filter((condition) => condition.field && condition.operator)

    if (!parsedConditions.length) {
      setLocalError('Each condition needs a field and operator.')
      return
    }

    const parsedActions = actions
      .map((action) => ({ target: action.target, action: action.action }))
      .filter((action) => action.target && action.action)

    if (!parsedActions.length) {
      setLocalError('Each action needs a target and action type.')
      return
    }

    const payload = {
      name: name.trim(),
      match_mode: matchMode,
      conditions: parsedConditions,
      actions: parsedActions,
    }

    try {
      const result = await onSubmit?.(payload)
      if (result === false) {
        return
      }
      setLocalError('')
    } catch (err) {
      setLocalError(err.message || 'Failed to save rule')
    }
  }

  return (
    <form className="field-rule-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="field-rule-name">Rule Name</label>
        <input
          id="field-rule-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Show hometown when origin is set"
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="field-rule-match-mode">When should this rule run?</label>
        <select
          id="field-rule-match-mode"
          value={matchMode}
          onChange={(event) => setMatchMode(event.target.value)}
          disabled={submitting}
        >
          {MATCH_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-rule-editor-section">
        <div className="field-rule-editor-heading">
          <h3>Conditions</h3>
          <button type="button" className="btn ghost" onClick={addCondition} disabled={submitting}>
            Add condition
          </button>
        </div>
        <p className="field-hint">Fields to watch before applying the actions.</p>

        <div className="field-rule-list" role="list">
          {conditions.map((condition, index) => (
            <div key={`condition-${index}`} className="field-rule-row" role="listitem">
              <select
                value={condition.field}
                onChange={(event) => handleConditionChange(index, 'field', event.target.value)}
                disabled={submitting}
              >
                <option value="">Choose field</option>
                {fieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={condition.operator}
                onChange={(event) => handleConditionChange(index, 'operator', event.target.value)}
                disabled={submitting}
              >
                {OPERATOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={condition.valuesText}
                onChange={(event) => handleConditionChange(index, 'valuesText', event.target.value)}
                placeholder="Comma separated values"
                disabled={submitting || ['is_set', 'is_not_set'].includes(condition.operator)}
              />

              <button
                type="button"
                className="icon-btn"
                onClick={() => removeCondition(index)}
                disabled={conditions.length === 1 || submitting}
                title="Remove condition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="field-rule-editor-section">
        <div className="field-rule-editor-heading">
          <h3>Actions</h3>
          <button type="button" className="btn ghost" onClick={addAction} disabled={submitting}>
            Add action
          </button>
        </div>
        <p className="field-hint">Choose what should happen when the conditions above match.</p>

        <div className="field-rule-list" role="list">
          {actions.map((action, index) => (
            <div key={`action-${index}`} className="field-rule-row" role="listitem">
              <select
                value={action.target}
                onChange={(event) => handleActionChange(index, 'target', event.target.value)}
                disabled={submitting}
              >
                <option value="">Choose field</option>
                {fieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={action.action}
                onChange={(event) => handleActionChange(index, 'action', event.target.value)}
                disabled={submitting}
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="icon-btn"
                onClick={() => removeAction(index)}
                disabled={actions.length === 1 || submitting}
                title="Remove action"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {localError && (
        <div className="form-error" role="alert">
          {localError}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn cancel" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Rule'}
        </button>
      </div>
    </form>
  )
}

