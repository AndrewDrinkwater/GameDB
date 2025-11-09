import React, { useState, useEffect } from 'react'
import { createEntity } from '../../../api/entities.js'
import { getEntityTypes } from '../../../api/entityTypes.js'

export default function InlineEntityCreator({ worldId, onCreated }) {
  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [entityTypes, setEntityTypes] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadTypes = async () => {
      if (!worldId) {
        setEntityTypes([])
        return
      }

      try {
        const res = await getEntityTypes({ worldId })
        if (!cancelled) {
          const payload = Array.isArray(res?.data) ? res.data : res
          setEntityTypes(Array.isArray(payload) ? payload : [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to load entity types', err)
          setEntityTypes([])
        }
      }
    }

    loadTypes()
    return () => {
      cancelled = true
    }
  }, [worldId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !typeId) {
      setError('Name and type are required.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const payload = {
        world_id: worldId,
        name,
        description,
        entity_type_id: typeId,
        visibility: 'visible'
      }
      const res = await createEntity(payload)
      const entity = res?.data || res
      onCreated(entity)
      setName('')
      setTypeId('')
      setDescription('')
    } catch (err) {
      console.error('❌ Failed to create entity inline', err)
      setError(err.message || 'Failed to create entity')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="inline-entity-creator" onSubmit={handleSubmit}>
      <h4>Create New Entity</h4>

      {error && <div className="alert error">{error}</div>}

      <div className="form-row">
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Entity name..."
        />
      </div>

      <div className="form-row">
        <label>Type</label>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
        >
          <option value="">Select type...</option>
          {entityTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>Description</label>
        <textarea
          rows="2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional..."
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={loading || !worldId}>
          {loading ? 'Creating…' : 'Create Entity'}
        </button>
      </div>
    </form>
  )
}
