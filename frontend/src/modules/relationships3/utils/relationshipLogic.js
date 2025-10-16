// src/modules/relationships3/utils/relationshipLogic.js

/**
 * Get the entity_type_id from an entity object, regardless of structure.
 */
export function getEntityTypeId(entity) {
  if (!entity) return ''
  return (
    entity.entity_type_id ||
    entity.entityTypeId ||
    entity.entityType?.id ||
    entity.entity_type?.id ||
    ''
  )
}

/**
 * Determine which relationship types are valid given current selections.
 * You can start from From, To, or Relationship — it works both ways.
 */
export function getValidRelationships({ fromEntity, toEntity, allRelationshipTypes = [] }) {
  const fromTypeId = getEntityTypeId(fromEntity)
  const toTypeId = getEntityTypeId(toEntity)

  // If neither selected, show all
  if (!fromTypeId && !toTypeId) return allRelationshipTypes

  return allRelationshipTypes.filter((rt) => {
    const fromAllowed =
      !fromTypeId ||
      String(rt.from_type_id ?? rt.fromTypeId ?? rt.from_type?.id ?? '') === String(fromTypeId)
    const toAllowed =
      !toTypeId ||
      String(rt.to_type_id ?? rt.toTypeId ?? rt.to_type?.id ?? '') === String(toTypeId)
    return fromAllowed && toAllowed
  })
}

/**
 * Given a relationship type, return which entities are valid as 'from' or 'to'.
 */
export function getValidEntities({ relationshipType, entities = [], role = 'from' }) {
  if (!relationshipType) return entities

  const allowedTypeId =
    role === 'from'
      ? relationshipType.from_type_id ??
        relationshipType.fromTypeId ??
        relationshipType.from_type?.id
      : relationshipType.to_type_id ??
        relationshipType.toTypeId ??
        relationshipType.to_type?.id

  if (!allowedTypeId) return entities

  return entities.filter(
    (e) => String(getEntityTypeId(e)) === String(allowedTypeId)
  )
}

/**
 * Prevents duplicates and self-relationships.
 */
export function validateRelationship({ fromEntityId, toEntityId, relationshipTypeId, existingRelationships = [] }) {
  if (fromEntityId === toEntityId) {
    return 'An entity cannot have a relationship with itself.'
  }

  const duplicate = existingRelationships.find(
    (r) =>
      String(r.fromId) === String(fromEntityId) &&
      String(r.toId) === String(toEntityId) &&
      String(r.relationshipTypeId) === String(relationshipTypeId)
  )
  if (duplicate) {
    return 'This relationship already exists.'
  }

  return null
}
