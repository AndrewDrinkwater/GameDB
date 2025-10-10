import { EntityRelationship } from '../models/index.js'

export async function ensureBidirectionalLink(relationship) {
  const { from_entity, to_entity, relationship_type_id, bidirectional } = relationship

  if (!bidirectional) return

  const existingReverse = await EntityRelationship.findOne({
    where: {
      from_entity: to_entity,
      to_entity: from_entity,
      relationship_type_id,
    },
  })

  if (!existingReverse) {
    await EntityRelationship.create({
      from_entity: to_entity,
      to_entity: from_entity,
      relationship_type_id,
      bidirectional: true,
      context: relationship.context || {},
    })
  }
}
