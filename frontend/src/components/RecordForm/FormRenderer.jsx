import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import FieldRenderer from './FieldRenderer'
import useUnsavedChangesPrompt, {
  UNSAVED_CHANGES_MESSAGE,
} from '../../hooks/useUnsavedChangesPrompt'

/**
 * Backwards-compatible form renderer.
 * Supports:
 * - schema.sections[{ title, columns, fields: [...] }]
 * - schema.fields (flat)
 */
function FormRenderer(
  {
    schema,
    initialData = {},
    onSubmit,
    onCancel,
    onDelete, // optional
    hideActions = false,
    enableUnsavedPrompt = true,
    onStateChange,
  },
  ref,
) {
  const [formData, setFormData] = useState(() =>
    initialData ? { ...initialData } : {},
  )
  const [initialSignature, setInitialSignature] = useState(() =>
    JSON.stringify(initialData ?? {}),
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('success')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const nextData = initialData ? { ...initialData } : {}
    setFormData(nextData)
    setInitialSignature(JSON.stringify(initialData ?? {}))
    setStatusMessage('')
    setStatusType('success')
  }, [initialData])

  // Normalize schema to sections so both shapes work
  const sections = useMemo(() => {
    if (Array.isArray(schema?.sections) && schema.sections.length > 0) {
      return schema.sections
    }
    if (Array.isArray(schema?.fields)) {
      return [{ title: schema.title, columns: schema.columns || 1, fields: schema.fields }]
    }
    return []
  }, [schema])

  const assignNestedValue = (source, keyPath, value) => {
    if (!keyPath || keyPath.length === 0) return source

    const next = { ...(source || {}) }
    let cursor = next

    for (let index = 0; index < keyPath.length; index += 1) {
      const keySegment = keyPath[index]
      const isLast = index === keyPath.length - 1

      if (isLast) {
        cursor[keySegment] = value
      } else {
        const existing = cursor[keySegment]
        const cloned =
          existing && typeof existing === 'object' && !Array.isArray(existing)
            ? { ...existing }
            : {}
        cursor[keySegment] = cloned
        cursor = cloned
      }
    }

    return next
  }

  const handleChange = (key, value) => {
    if (!key || typeof key !== 'string') return

    setFormData((prev) => {
      if (!key.includes('.')) {
        return { ...(prev || {}), [key]: value }
      }

      const segments = key.split('.').filter((segment) => segment.length > 0)
      if (segments.length === 0) {
        return { ...(prev || {}) }
      }

      return assignNestedValue(prev, segments, value)
    })
  }

  const currentSignature = useMemo(
    () => JSON.stringify(formData ?? {}),
    [formData],
  )

  const isDirty = useMemo(
    () => currentSignature !== initialSignature,
    [currentSignature, initialSignature],
  )

  const bypassRef = useRef(false)

  useEffect(() => {
    if (!isDirty) {
      bypassRef.current = false
    }
  }, [isDirty])

  useEffect(() => {
    if (isDirty && statusMessage) {
      setStatusMessage('')
      setStatusType('success')
    }
  }, [isDirty, statusMessage])

  useEffect(() => {
    if (typeof onStateChange === 'function') {
      onStateChange({ isDirty, isSubmitting })
    }
  }, [isDirty, isSubmitting, onStateChange])

  const shouldPrompt = enableUnsavedPrompt && isDirty
  useUnsavedChangesPrompt(shouldPrompt, undefined, bypassRef)

  const handleActionSubmit = useCallback(async () => {
    if (!onSubmit) return true

    const nextSignature = JSON.stringify(formData ?? {})

    setIsSubmitting(true)
    setStatusType('success')
    setStatusMessage('')

    bypassRef.current = true

    try {
      const result = await onSubmit(formData)
      if (result === false) {
        bypassRef.current = false
        return false
      }

      const payload =
        result && typeof result === 'object' && !Array.isArray(result) ? result : {}

      setInitialSignature(nextSignature)
      const message =
        typeof result === 'string'
          ? result
          : payload.message || schema?.saveSuccessMessage || ''

      if (message) {
        const variant = payload.status === 'error' ? 'error' : 'success'
        setStatusType(variant)
        setStatusMessage(message)
      }

      bypassRef.current = false
      return payload
    } catch (err) {
      console.error('Failed to submit form:', err)
      setStatusType('error')
      setStatusMessage(err.message || 'Failed to save changes.')
      bypassRef.current = false
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, schema])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await handleActionSubmit()
  }

  const handleCancelClick = () => {
    if (!onCancel) return

    if (
      !isDirty ||
      window.confirm(UNSAVED_CHANGES_MESSAGE)
    ) {
      setInitialSignature(currentSignature)
      bypassRef.current = true
      onCancel()
    }
  }

  const handleDeleteClick = async () => {
    if (!onDelete) return

    try {
      const result = await onDelete(formData)
      if (result) {
        setInitialSignature(currentSignature)
        bypassRef.current = true
      }
    } catch (err) {
      console.error('Failed to delete record:', err)
    }
  }

  const resetForm = useCallback(
    (data = initialData) => {
      const nextData = data ? { ...data } : {}
      setFormData(nextData)
      setInitialSignature(JSON.stringify(data ?? {}))
      setStatusMessage('')
      setStatusType('success')
      bypassRef.current = false
    },
    [initialData],
  )

  useImperativeHandle(
    ref,
    () => ({
      submit: handleActionSubmit,
      reset: resetForm,
      isDirty: () => isDirty,
      isSubmitting: () => isSubmitting,
    }),
    [handleActionSubmit, resetForm, isDirty, isSubmitting],
  )

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      <h2 className="form-title">{schema?.title || 'Record'}</h2>

      {sections.map((section, i) => (
        <div className="form-section" key={i}>
          {section.title ? <h3>{section.title}</h3> : null}
          <div className={`form-grid cols-${section.columns || 1}`}>
            {(section.fields || []).map((field, idx) => {
                if (!field || typeof field !== 'object') {
                    console.warn('⚠️ Skipping invalid field in schema:', field)
                return null
                }
                return (
                    <FieldRenderer
                        key={`${field.key || field.name || field.field || 'field'}-${idx}`}
                        field={field}
                        data={formData}
                        onChange={handleChange}
                        mode="edit"
                    />
                )
            })}
          </div>
        </div>
      ))}

      {statusMessage ? (
        <div
          className={`form-feedback ${statusType}`}
          role={statusType === 'error' ? 'alert' : 'status'}
        >
          {statusMessage}
        </div>
      ) : null}

      {!hideActions ? (
        <div className="form-actions sticky-actions" role="toolbar">
          <div className="left-actions">
            {onDelete ? (
              <button
                type="button"
                className="btn delete"
                onClick={handleDeleteClick}
                disabled={isSubmitting}
              >
                {schema?.deleteLabel || 'Delete'}
              </button>
            ) : null}
          </div>

          <div className="right-actions">
            <button
              type="button"
              className="btn cancel"
              onClick={handleCancelClick}
              disabled={isSubmitting}
            >
              {schema?.cancelLabel || 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn submit"
              disabled={isSubmitting}
            >
              {schema?.saveLabel || 'Save'}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  )
}

export default forwardRef(FormRenderer)
