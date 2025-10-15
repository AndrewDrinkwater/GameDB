// src/modules/relationships2/RelationshipComposer.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import HybridEntityPicker from './ui/HybridEntityPicker.jsx'
import { computeFilterParams } from './logic/perspective.js'
import { allowedTypeIdsForRole, filterRelationshipTypes } from './logic/rules.js'
import './relationships2.css'

const getTypeId = (e) =>
  String(
    e?.entity_type_id ??
    e?.entityTypeId ??
    e?.entityType?.id ??
    e?.entity_type?.id ??
    ''
  )

export default function RelationshipComposer({
  worldId,
  relationshipTypes = [],
  mode = 'global',
  lockedField = null,            // 'from' | 'to' | null (inline only)
  currentEntityId = '',
  currentEntityTypeId = '',
  onSubmit,                      // ({fromEntityId, toEntityId, relationshipTypeId, direction})
  onStateChange,                 // optional ui state emit
}) {
  const isInline = mode === 'inline'

  const [direction, setDirection] = useState(isInline ? 'forward' : 'forward')
  const [fromEntityId, setFromEntityId] = useState(lockedField === 'from' ? String(currentEntityId) : '')
  const [toEntityId, setToEntityId]     = useState(lockedField === 'to'   ? String(currentEntityId) : '')
  const [fromTypeId, setFromTypeId]     = useState(lockedField === 'from' ? String(currentEntityTypeId) : '')
  const [toTypeId, setToTypeId]         = useState(lockedField === 'to'   ? String(currentEntityTypeId) : '')

  const [relationshipTypeId, setRelationshipTypeId] = useState('')

  // When user picks an entity, seed its type immediately (enables instant filtering)
  const onFromResolve = (entity) => {
    const t = getTypeId(entity)
    if (t) setFromTypeId(t)
  }
  const onToResolve = (entity) => {
    const t = getTypeId(entity)
    if (t) setToTypeId(t)
  }

  // perspective-aware filtering
  const { sourceType, targetType } = computeFilterParams({
    mode,
    lockedField,
    fromTypeId,
    toTypeId,
  })

  const availableRelTypes = useMemo(
    () => filterRelationshipTypes(relationshipTypes, sourceType, targetType),
    [relationshipTypes, sourceType, targetType]
  )

  const activeRel = useMemo(
    () => availableRelTypes.find((rt) => String(rt.id) === String(relationshipTypeId)) || null,
    [availableRelTypes, relationshipTypeId]
  )

  const allowedFrom = useMemo(
    () => (activeRel ? allowedTypeIdsForRole(activeRel, 'from') : []),
    [activeRel]
  )
  const allowedTo = useMemo(
    () => (activeRel ? allowedTypeIdsForRole(activeRel, 'to') : []),
    [activeRel]
  )

  // Parent UI updates — shallow de-duped to prevent render loop
  const lastRef = useRef({})
  useEffect(() => {
    if (!onStateChange) return
    const next = {
      submitDisabled: !(fromEntityId && toEntityId && relationshipTypeId),
      isBusy: false,
    }
    const prev = lastRef.current
    if (prev.submitDisabled === next.submitDisabled && prev.isBusy === next.isBusy) return
    lastRef.current = next
    onStateChange(next)
  }, [onStateChange, fromEntityId, toEntityId, relationshipTypeId])

  const handleSubmit = () => {
    if (!(fromEntityId && toEntityId && relationshipTypeId)) return
    onSubmit?.({
      fromEntityId,
      toEntityId,
      relationshipTypeId,
      direction, // 'forward' | 'reverse'
    })
  }

  return (
    <div className="relationship-composer">
      {isInline && (
        <div className="row">
          <label>Perspective</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="forward">Source → Target</option>
            <option value="reverse">Target ← Source</option>
          </select>
        </div>
      )}

      <div className="row two">
        <div className="col">
          <label>From Entity</label>
          <HybridEntityPicker
            worldId={worldId}
            value={fromEntityId}
            allowedTypeIds={allowedFrom.length ? allowedFrom : []}
            onChange={setFromEntityId}
            onResolve={onFromResolve}
            disabled={lockedField === 'from'}
            placeholder="Search or select entity…"
          />
        </div>

        <div className="col">
          <label>Relationship Type</label>
          <select
            value={relationshipTypeId}
            onChange={(e) => setRelationshipTypeId(e.target.value)}
            disabled={
              availableRelTypes.length === 0 ||
              (mode === 'global' && !fromTypeId && !toTypeId)
            }
          >
            <option value="">Select type…</option>
            {availableRelTypes.map((rt) => {
              const fromLabel = rt.from_name || rt.fromName || rt.name
              const toLabel   = rt.to_name   || rt.toName   || rt.name
              const summary   = fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`
              return (
                <option key={rt.id} value={rt.id}>
                  {rt.name} · {summary}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      <div className="row">
        <label>To Entity</label>
        <HybridEntityPicker
          worldId={worldId}
          value={toEntityId}
          allowedTypeIds={allowedTo.length ? allowedTo : []}
          onChange={setToEntityId}
          onResolve={onToResolve}
          disabled={lockedField === 'to'}
          placeholder="Search or select entity…"
        />
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn primary"
          disabled={!(fromEntityId && toEntityId && relationshipTypeId)}
          onClick={handleSubmit}
        >
          Create Relationship
        </button>
      </div>
    </div>
  )
}
