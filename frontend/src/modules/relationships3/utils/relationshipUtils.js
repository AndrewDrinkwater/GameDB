// Utility: safely get type ID
export const getEntityTypeId = (entity) => {
  if (!entity) return ''

  return (
    entity.entity_type_id ||       // DB shape
    entity.entityTypeId ||         // alternate camelCase
    entity.entityType?.id ||       // nested
    entity.entity_type?.id ||      // nested snake
    entity.typeId ||               // 💡 lightweight search result
    entity.type_id ||              // possible alt key
    entity.type?.id ||             // defensive
    ''
  )
}


// src/modules/relationships3/utils/relationshipUtils.js
export function filterRelationshipTypesForSource(relationshipTypes, fromEntity, toEntity) {
  console.log("🧭 Filtering relationships", {
    totalTypes: relationshipTypes.length,
    fromEntity,
    toEntity
  });

  // If nothing is selected, return all
  if (!fromEntity && !toEntity) return relationshipTypes;

  return relationshipTypes.filter((rt) => {
    const fromTypeIds = (rt.from_entity_types || []).map((t) => String(t.id));
    const toTypeIds = (rt.to_entity_types || []).map((t) => String(t.id));

    // Match if FROM is defined and its type matches
    const fromMatch = fromEntity
      ? fromTypeIds.includes(String(fromEntity.entity_type_id))
      : true;

    // Match if TO is defined and its type matches
    const toMatch = toEntity
      ? toTypeIds.includes(String(toEntity.entity_type_id))
      : true;

    // Allow either or both sides to drive the match
    return fromMatch && toMatch;
  });
}



// Validation rules
export const validateRelationship = (fromEntity, toEntity, typeId, existing = []) => {
  if (!fromEntity || !toEntity || !typeId)
    return 'Missing required relationship fields.'

  if (fromEntity.id === toEntity.id)
    return 'An entity cannot be related to itself.'

  const duplicate = existing.find(
    (r) =>
      r.from_entity_id === fromEntity.id &&
      r.to_entity_id === toEntity.id &&
      r.relationship_type_id === typeId
  )
  if (duplicate) return 'That relationship already exists.'

  return null // no errors
}
