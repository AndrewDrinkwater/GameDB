// src/modules/relationships3/RelationshipBuilder.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { getWorldEntities } from '../../api/entities.js'
import { getRelationshipTypes } from '../../api/entityRelationshipTypes.js'
import { createRelationship } from '../../api/entityRelationships.js'
import EntitySearchSelect from './ui/EntitySearchSelect.jsx'
import InlineEntityCreator from './ui/InlineEntityCreator.jsx'
import { getEntity } from '../../api/entities.js' // make sure this import is at top

export default function RelationshipBuilder({
  worldId,
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


  // --- Load entities + relationship types
  useEffect(() => {
    if (!worldId) return
    setLoading(true)
    Promise.all([getWorldEntities(worldId), getRelationshipTypes()])
      .then(([entsRes, typesRes]) => {
        const ents = Array.isArray(entsRes?.data) ? entsRes.data : entsRes
        const types = Array.isArray(typesRes?.data) ? typesRes.data : typesRes?.data || []
        setEntities(ents || [])
        setRelationshipTypes(types || [])
      })
      .catch((err) => setError(err.message || 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [worldId])

  // --- Filter relationships valid for the selected entity types
  const validRelationshipTypes = useMemo(() => {
    if (!entity1 || !entity2) return []

    const type1 =
      entity1.entity_type_id || entity1.typeId || entity1.entityType?.id
    const type2 =
      entity2.entity_type_id || entity2.typeId || entity2.entityType?.id

    const results = relationshipTypes
      .map((rt) => {
        const fromIds = (rt.from_entity_types || []).map((t) => t.id)
        const toIds = (rt.to_entity_types || []).map((t) => t.id)
        const direct = fromIds.includes(type1) && toIds.includes(type2)
        const reverse = fromIds.includes(type2) && toIds.includes(type1)
        if (direct || reverse) {
          return { ...rt, _direction: direct ? 'direct' : 'reverse' }
        }
        return null
      })
      .filter(Boolean)

    return results
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
          r.relationship_type_id === relationshipTypeId)
    )
    if (duplicate) return setError('This relationship already exists.')

    const selectedType = validRelationshipTypes.find((r) => r.id === relationshipTypeId)

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
      onCreated?.({ from_entity_id, to_entity_id, relationship_type_id: relationshipTypeId })
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
            setEntity1(entity)
            setRelationshipTypeId('')
          }}
        />
      </div>

      {/* ENTITY 2 */}
      <div className="form-row entity2-section">
        <EntitySearchSelect
          worldId={worldId}
          label="Entity 2"
          value={entity2?.id || ''}
          onChange={(id) => {
            console.log('🟩 Entity 2 manually selected:', id)
            const found = entities.find((e) => e.id === id) || null
            setEntity2(found)
          }}
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
                  console.log('✅ Inline entity created:', newEntity)
                  setEntities((prev) => [...prev, newEntity])

                  try {
                    // use authenticated API helper
                    const res = await getEntity(newEntity.id)
                    const fullEntity = res?.data || res
                    setEntity2(fullEntity)
                    console.log('🎯 Auto-selected new entity as Entity 2:', fullEntity.name)
                  } catch (err) {
                    console.warn('⚠️ Could not fetch newly created entity; using local copy', err)
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

          {/* Direction cue */}
          {relationshipTypeId && (
            <div className="relationship-direction-cue">
              {(() => {
                const type = validRelationshipTypes.find(
                  (t) => t.id === relationshipTypeId
                )
                if (!type) return null

                const isReverse = type._direction === 'reverse'
                const fromLabel = isReverse ? entity2?.name : entity1?.name
                const toLabel = isReverse ? entity1?.name : entity2?.name

                return (
                  <p className="small text-muted">
                    <strong>Direction:</strong>{' '}
                    <span className="highlight">{fromLabel || 'Entity 1'}</span>{' '}
                    →{' '}
                    <span className="highlight">{toLabel || 'Entity 2'}</span>{' '}
                    <em>({type.name}, {type._direction})</em>
                  </p>
                )
              })()}
            </div>
          )}
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
