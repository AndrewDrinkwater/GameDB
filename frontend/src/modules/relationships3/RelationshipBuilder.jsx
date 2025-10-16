// src/modules/relationships3/RelationshipBuilder.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { getWorldEntities, getEntity } from '../../api/entities.js'
import { getRelationshipTypes } from '../../api/entityRelationshipTypes.js'
import { createRelationship } from '../../api/entityRelationships.js'
import EntitySearchSelect from './ui/EntitySearchSelect.jsx'
import InlineEntityCreator from './ui/InlineEntityCreator.jsx'

export default function RelationshipBuilder({
  worldId,
  fromEntity = null,
  onCreated,
  onCancel,
  existingRelationships = [],
}) {
  const [entities, setEntities] = useState([])
  const [relationshipTypes, setRelationshipTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [entity1, setEntity1] = useState(null)
  const [entity2, setEntity2] = useState(null)
  const [relationshipTypeId, setRelationshipTypeId] = useState('')
  const [showCreator, setShowCreator] = useState(false)

  // --- Load data once
  useEffect(() => {
    if (!worldId) return
    setLoading(true)
    Promise.all([getWorldEntities(worldId), getRelationshipTypes()])
      .then(([entsRes, typesRes]) => {
        const ents = Array.isArray(entsRes?.data) ? entsRes.data : entsRes
        const types =
          Array.isArray(typesRes?.data) ? typesRes.data : typesRes?.data || []
        setEntities(ents || [])
        setRelationshipTypes(types || [])
      })
      .catch((err) => setError(err.message || 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [worldId])

  // --- Auto-populate Entity 1 (only once)
  useEffect(() => {
    if (!fromEntity || entity1) return
    if (!fromEntity.id || !fromEntity.name) return

    const normalised = {
      id: fromEntity.id,
      name: fromEntity.name,
      entity_type_id:
        fromEntity.entity_type_id ||
        fromEntity.entityType?.id ||
        fromEntity.entity_type?.id,
      entityType: fromEntity.entityType || fromEntity.entity_type || null,
      typeName:
        fromEntity.typeName ||
        fromEntity.entityType?.name ||
        fromEntity.entity_type?.name,
    }

    setEntity1(normalised)
    console.debug('💡 Auto-populated Entity 1 once:', normalised)
  }, [fromEntity]) // intentionally not depending on entity1 to avoid repeats

  // --- Normalise helper
  const normaliseEntity = (entity) => {
    if (!entity) return null
    const typeId =
      entity.entity_type_id ||
      entity.typeId ||
      entity.entityType?.id ||
      entity.entity_type?.id
    const typeName =
      entity.typeName ||
      entity.entityType?.name ||
      entity.entity_type?.name
    return { ...entity, entity_type_id: typeId, typeName }
  }

  // --- Filter valid relationship types
  const validRelationshipTypes = useMemo(() => {
    const e1 = normaliseEntity(entity1)
    const e2 = normaliseEntity(entity2)
    if (!e1 || !e2) return []

    const type1 = e1.entity_type_id
    const type2 = e2.entity_type_id
    if (!type1 || !type2) return []

    const extractIds = (arr = []) =>
      arr
        .map(
          (t) =>
            t.id ||
            t.entity_type_id ||
            t.entityTypeId ||
            t.type_id ||
            t.typeId ||
            t,
        )
        .map(String)

    return relationshipTypes
      .map((rt) => {
        const fromIds = extractIds(rt.from_entity_types)
        const toIds = extractIds(rt.to_entity_types)
        const direct =
          fromIds.includes(String(type1)) && toIds.includes(String(type2))
        const reverse =
          fromIds.includes(String(type2)) && toIds.includes(String(type1))
        if (direct || reverse) {
          return { ...rt, _direction: direct ? 'direct' : 'reverse' }
        }
        return null
      })
      .filter(Boolean)
  }, [relationshipTypes, entity1, entity2])

  // --- Submit logic
  const handleSubmit = async () => {
    if (!entity1 || !entity2 || !relationshipTypeId)
      return setError('Please select both entities and a relationship type.')
    if (entity1.id === entity2.id)
      return setError('Cannot create self-relationships.')

    const duplicate = existingRelationships.find(
      (r) =>
        (r.from_entity_id === entity1.id &&
          r.to_entity_id === entity2.id &&
          r.relationship_type_id === relationshipTypeId) ||
        (r.from_entity_id === entity2.id &&
          r.to_entity_id === entity1.id &&
          r.relationship_type_id === relationshipTypeId),
    )
    if (duplicate) return setError('This relationship already exists.')

    const selectedType = validRelationshipTypes.find(
      (r) => r.id === relationshipTypeId,
    )

    let from_entity_id = entity1.id
    let to_entity_id = entity2.id
    if (selectedType?._direction === 'reverse') {
      from_entity_id = entity2.id
      to_entity_id = entity1.id
    }

    try {
      await createRelationship({
        from_entity_id,
        to_entity_id,
        relationship_type_id: relationshipTypeId,
      })
      onCreated?.({
        from_entity_id,
        to_entity_id,
        relationship_type_id: relationshipTypeId,
      })
    } catch (err) {
      setError(err.message || 'Failed to create relationship')
    }
  }

  if (loading) return <p>Loading relationship data…</p>

  return (
    <div className="relationship-builder-v3">
      <h2>Add Relationship</h2>
      {error && <div className="alert error">{error}</div>}

      {/* ENTITY 1 */}
      <div className="form-row">
        <EntitySearchSelect
          worldId={worldId}
          label="Entity 1"
          value={entity1?.id || ''}
          onChange={(entity) => {
            if (!fromEntity) {
              setEntity1(entity)
              setRelationshipTypeId('')
            }
          }}
          disabled={!!fromEntity}
        />
      </div>

      {/* ENTITY 2 */}
      <div className="form-row entity2-section">
        <EntitySearchSelect
          worldId={worldId}
          label="Entity 2"
          value={entity2?.id || ''}
          onChange={(entity) => setEntity2(entity)}
        />

        {!showCreator && (
          <button
            type="button"
            className="btn small tertiary"
            onClick={() => setShowCreator(true)}
            style={{ alignSelf: 'flex-start', marginTop: '0.4rem' }}
          >
            + Create new entity
          </button>
        )}

        {showCreator && (
          <InlineEntityCreator
            worldId={worldId}
            onCreated={async (newEntity) => {
              setEntities((prev) => [...prev, newEntity])
              try {
                const res = await getEntity(newEntity.id)
                const fullEntity = res?.data || res
                setEntity2(fullEntity)
              } catch {
                setEntity2(newEntity)
              }
              setShowCreator(false)
            }}
          />
        )}
      </div>

      {/* RELATIONSHIP TYPE */}
      {entity1 && entity2 && (
        <div className="form-row">
          <label>Relationship Type</label>
          <select
            value={relationshipTypeId}
            onChange={(e) => setRelationshipTypeId(e.target.value)}
          >
            <option value="">Select relationship type…</option>
            {validRelationshipTypes.length > 0 ? (
              validRelationshipTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} ({rt.from_name} → {rt.to_name})
                </option>
              ))
            ) : (
              <option disabled>No valid relationship types</option>
            )}
          </select>
        </div>
      )}

      {/* ACTIONS */}
      <div className="form-actions">
        <button
          className="btn primary"
          disabled={!entity1 || !entity2 || !relationshipTypeId}
          onClick={handleSubmit}
        >
          Create Relationship
        </button>
        <button className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
