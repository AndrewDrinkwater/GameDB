// src/modules/relationships2/logic/rules.js

export const allowedTypeIdsForRole = (relType, role /* 'from' | 'to' */) => {
  if (!relType) return []
  const arr = role === 'from'
    ? (relType.from_entity_types ?? relType.fromEntityTypes ?? relType.fromTypes ?? [])
    : (relType.to_entity_types   ?? relType.toEntityTypes   ?? relType.toTypes   ?? [])
  if (!Array.isArray(arr)) return []
  return arr.map(e =>
    String(
      e?.id ??
      e?.entity_type_id ??
      e?.entityTypeId ??
      e?.entityType?.id ??
      e?.entity_type?.id ??
      ''
    )
  ).filter(Boolean)
}

// Filter rel types by side(s). Empty allowed list on a role = unrestricted (treat as match).
export const filterRelationshipTypes = (relTypes, sourceTypeId /* from */, targetTypeId /* to */) => {
  if (!Array.isArray(relTypes)) return []
  const matchSide = (rt, role, typeId) => {
    if (!typeId) return true
    const allowed = allowedTypeIdsForRole(rt, role)
    return allowed.length === 0 || allowed.includes(String(typeId))
  }
  return relTypes.filter(rt => matchSide(rt, 'from', sourceTypeId) && matchSide(rt, 'to', targetTypeId))
}
