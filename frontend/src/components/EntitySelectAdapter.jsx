import { useCallback, useMemo } from 'react'
import PropTypes from '../utils/propTypes.js'
import EntitySelect from './EntitySelect.jsx'

const normaliseId = (value) => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const normaliseEntity = (entity) => {
  if (!entity || typeof entity !== 'object') return null
  if (entity.id === undefined || entity.id === null) return null
  return entity
}

export default function EntitySelectAdapter({
  value,
  onChange,
  allowedTypeIds = [],
  onEntityResolved,
  initialEntities = [],
  ...rest
}) {
  const stringValue = useMemo(() => normaliseId(value), [value])

  const safeAllowedIds = useMemo(
    () =>
      Array.isArray(allowedTypeIds)
        ? allowedTypeIds
            .filter((id) => id !== undefined && id !== null && `${id}`.trim() !== '')
            .map((id) => String(id))
        : [],
    [allowedTypeIds],
  )

  const safeInitialEntities = useMemo(() => {
    if (!Array.isArray(initialEntities)) return []
    const seen = new Map()
    initialEntities.forEach((entity) => {
      const normalised = normaliseEntity(entity)
      if (!normalised) return
      const id = normaliseId(normalised.id)
      if (!id || seen.has(id)) return
      seen.set(id, { ...normalised, id })
    })
    return Array.from(seen.values())
  }, [initialEntities])

  const handleChange = useCallback(
    (nextValue) => {
      if (typeof nextValue === 'object' && nextValue !== null) {
        const normalised = normaliseEntity(nextValue)
        const nextId = normalised ? normaliseId(normalised.id) : ''
        onChange?.(nextId)
        if (normalised) {
          onEntityResolved?.(normalised)
        }
        return
      }

      const stringified = normaliseId(nextValue)
      onChange?.(stringified)
    },
    [onChange, onEntityResolved],
  )

  const handleEntityResolved = useCallback(
    (entity) => {
      const normalised = normaliseEntity(entity)
      if (!normalised) {
        onEntityResolved?.(null)
        return
      }
      onEntityResolved?.(normalised)
    },
    [onEntityResolved],
  )

  return (
    <EntitySelect
      {...rest}
      value={stringValue}
      onChange={handleChange}
      allowedTypeIds={safeAllowedIds}
      onEntityResolved={handleEntityResolved}
      initialEntities={safeInitialEntities}
    />
  )
}

EntitySelectAdapter.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  allowedTypeIds: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  ),
  onEntityResolved: PropTypes.func,
  initialEntities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }),
  ),
}
