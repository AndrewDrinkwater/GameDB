import React, { useEffect, useState } from 'react'
import RelationshipComposer from '../../modules/relationships2/RelationshipComposer.jsx'

export default function Relationships2Page() {
  const [relTypes, setRelTypes] = useState([])
  const worldId = 'CURRENT_WORLD_ID' // replace with real id

  useEffect(() => {
    let cancel = false
    const load = async () => {
      try {
        const r = await fetch(`/api/worlds/${worldId}/relationship-types`)
        const json = await r.json()
        const list = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : [])
        if (!cancel) setRelTypes(list)
      } catch (err) {
        if (!cancel) setRelTypes([])
        console.error('Failed to load relationship types', err)
      }
    }
    load()
    return () => (cancel = true)
  }, [worldId])

  const handleSubmit = async ({ fromEntityId, toEntityId, relationshipTypeId, direction }) => {
    const payload = {
      world_id: worldId,
      from_entity_id: direction === 'reverse' ? toEntityId : fromEntityId,
      to_entity_id:   direction === 'reverse' ? fromEntityId : toEntityId,
      relationship_type_id: relationshipTypeId,
      bidirectional: true,
      context: { __direction: direction },
    }
    await fetch(`/api/entity-relationships`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    })
    alert('Created!')
  }

  return (
    <div className="page relationships2">
      <h1>Relationships v2 (Parallel)</h1>

      <h2>Global Mode</h2>
      <RelationshipComposer
        worldId={worldId}
        relationshipTypes={relTypes}
        mode="global"
        onSubmit={handleSubmit}
      />

      <hr />

      <h2>Inline Mode (locked From)</h2>
      <RelationshipComposer
        worldId={worldId}
        relationshipTypes={relTypes}
        mode="inline"
        lockedField="from"
        currentEntityId="LOCKED_ENTITY_ID"
        currentEntityTypeId="LOCKED_ENTITY_TYPE_ID"
        onSubmit={handleSubmit}
      />
    </div>
  )
}
