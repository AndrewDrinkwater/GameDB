# Entity API – cURL Examples

Use the following snippets to interact with the entity system. Replace `TOKEN` with a valid JWT and the UUID placeholders with real identifiers from your database.

## List entity types

```bash
curl -X GET \
  http://localhost:4000/api/entity-types \
  -H "Authorization: Bearer TOKEN"
```

## Create an entity

```bash
curl -X POST \
  http://localhost:4000/api/entities \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ancient Library",
    "description": "A forgotten archive hidden beneath the city.",
    "world_id": "WORLD_UUID",
    "entity_type_id": "ENTITY_TYPE_UUID",
    "visibility": "partial",
    "metadata": { "location": "Old Town" }
  }'
```

## Fetch a single entity (with secrets if permitted)

```bash
curl -X GET \
  http://localhost:4000/api/entities/ENTITY_UUID \
  -H "Authorization: Bearer TOKEN"
```

## List all entities visible to the current user

```bash
curl -X GET \
  'http://localhost:4000/api/entities?world_id=WORLD_UUID' \
  -H "Authorization: Bearer TOKEN"
```

When called by a Dungeon Master (DM) for a world, the list and detail responses include every entity in that world. Players will only receive entities marked as `visible` or `partial`, along with their own creations.
