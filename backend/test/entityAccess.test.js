import test from 'node:test'
import assert from 'node:assert/strict'
import { Op } from 'sequelize'
import {
  canUserReadEntity,
  canUserWriteEntity,
  buildReadableEntitiesWhereClause,
} from '../src/utils/entityAccess.js'

test('canUserReadEntity suppresses creator privileges when personal access is disabled', () => {
  const entity = { id: 'e1', read_access: 'hidden', created_by: 'user-1' }
  const baseContext = {
    userId: 'user-1',
    isAdmin: false,
    isOwner: false,
    campaignIds: new Set(),
    characterIds: new Set(),
    hasWorldCharacter: false,
    worldAccess: { hasAccess: true },
    activeCampaignId: null,
  }

  assert.equal(canUserReadEntity(entity, baseContext), true)
  assert.equal(
    canUserReadEntity(entity, { ...baseContext, suppressPersonalAccess: true }),
    false,
  )
})

test('canUserWriteEntity no longer treats suppressed users as creators', () => {
  const entity = { id: 'e2', write_access: 'hidden', created_by: 'user-2' }
  const baseContext = {
    userId: 'user-2',
    isAdmin: false,
    isOwner: false,
    campaignIds: new Set(),
    characterIds: new Set(),
    hasWorldCharacter: false,
    worldAccess: { hasAccess: true },
    activeCampaignId: null,
  }

  assert.equal(canUserWriteEntity(entity, baseContext), true)
  assert.equal(
    canUserWriteEntity(entity, { ...baseContext, suppressPersonalAccess: true }),
    false,
  )
})

test('buildReadableEntitiesWhereClause skips user clauses when personal access is suppressed', () => {
  const context = {
    userId: 'user-3',
    isAdmin: false,
    isOwner: false,
    campaignIds: new Set(),
    characterIds: new Set(),
    hasWorldCharacter: false,
    worldAccess: null,
    activeCampaignId: null,
  }

  const clause = buildReadableEntitiesWhereClause(context)
  assert.ok(clause)
  assert.ok(Array.isArray(clause[Op.or]))
  assert.equal(clause[Op.or].some((entry) => entry.created_by === 'user-3'), true)

  const suppressedClause = buildReadableEntitiesWhereClause({
    ...context,
    suppressPersonalAccess: true,
  })
  assert.deepEqual(suppressedClause, { id: null })
})
