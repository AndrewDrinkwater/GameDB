import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BulkAccessValidationError,
  MAX_BULK_ENTITY_IDS,
  buildEntityAccessUpdate,
  normaliseBulkAccessPayload,
} from '../src/utils/bulkAccessValidation.js'

test('normaliseBulkAccessPayload merges write targets into read lists', () => {
  const payload = normaliseBulkAccessPayload({
    entityIds: ['entity-1'],
    readAccess: 'selective',
    writeAccess: 'selective',
    readCampaignIds: [],
    readUserIds: [],
    readCharacterIds: [],
    writeCampaignIds: ['campaign-1'],
    writeUserIds: ['user-1'],
  })

  assert.equal(payload.readCampaignIds.includes('campaign-1'), true)
  assert.equal(payload.readUserIds.includes('user-1'), true)
  assert.equal(payload.writeCampaignIds.includes('campaign-1'), true)
  assert.equal(payload.writeUserIds.includes('user-1'), true)
})

test('normaliseBulkAccessPayload enforces write target requirement', () => {
  assert.throws(() => {
    normaliseBulkAccessPayload({
      entityIds: ['entity-1'],
      readAccess: 'global',
      writeAccess: 'selective',
      writeCampaignIds: [],
      writeUserIds: [],
    })
  }, /Selective write access requires at least one campaign or user/)
})

test('normaliseBulkAccessPayload requires an activated section', () => {
  assert.throws(() => {
    normaliseBulkAccessPayload({
      entityIds: ['entity-1'],
      readAccess: 'unchanged',
      writeAccess: 'unchanged',
    })
  }, /Select at least one access type/)
})

test('normaliseBulkAccessPayload rejects targets for unchanged sections', () => {
  assert.throws(() => {
    normaliseBulkAccessPayload({
      entityIds: ['entity-1'],
      readAccess: 'unchanged',
      writeAccess: 'selective',
      readCampaignIds: ['campaign-1'],
      writeCampaignIds: ['campaign-1'],
    })
  }, /Read access set to unchanged/)

  assert.throws(() => {
    normaliseBulkAccessPayload({
      entityIds: ['entity-1'],
      readAccess: 'selective',
      writeAccess: 'unchanged',
      readCampaignIds: ['campaign-1'],
      writeCampaignIds: ['campaign-1'],
    })
  }, /Write access set to unchanged/)
})

test('normaliseBulkAccessPayload rejects hidden read + selective write', () => {
  assert.throws(() => {
    normaliseBulkAccessPayload({
      entityIds: ['entity-1'],
      readAccess: 'hidden',
      writeAccess: 'selective',
      writeUserIds: ['user-1'],
    })
  }, BulkAccessValidationError)
})

test('normaliseBulkAccessPayload limits entities per request', () => {
  const ids = Array.from({ length: MAX_BULK_ENTITY_IDS + 1 }, (_, index) => `entity-${index}`)
  assert.throws(() => {
    normaliseBulkAccessPayload({
      entityIds: ids,
      readAccess: 'global',
      writeAccess: 'owner_only',
    })
  }, /only update/)
})

test('buildEntityAccessUpdate merges lists and overwrites access modes', () => {
  const entity = {
    read_access: 'global',
    write_access: 'global',
    read_campaign_ids: ['campaign-existing'],
    read_user_ids: [],
    read_character_ids: [],
    write_campaign_ids: [],
    write_user_ids: [],
  }

  const payload = {
    readAccess: 'selective',
    writeAccess: 'owner_only',
    readCampaignIds: ['campaign-new'],
    readUserIds: ['user-new'],
    readCharacterIds: ['character-1'],
    writeCampaignIds: ['campaign-writer'],
    writeUserIds: ['user-writer'],
  }

  const updates = buildEntityAccessUpdate(entity, payload)

  assert.equal(updates.read_access, 'selective')
  assert.equal(updates.write_access, 'owner_only')
  assert.deepEqual(new Set(updates.read_campaign_ids), new Set(['campaign-existing', 'campaign-new', 'campaign-writer']))
  assert.deepEqual(new Set(updates.read_user_ids), new Set(['user-new', 'user-writer']))
  assert.deepEqual(updates.read_character_ids, ['character-1'])
  assert.deepEqual(updates.write_campaign_ids, ['campaign-writer'])
  assert.deepEqual(updates.write_user_ids, ['user-writer'])
})

test('buildEntityAccessUpdate preserves access modes when unchanged', () => {
  const entity = {
    read_access: 'global',
    write_access: 'owner_only',
    read_campaign_ids: [],
    read_user_ids: [],
    read_character_ids: [],
    write_campaign_ids: [],
    write_user_ids: [],
  }

  const payload = {
    readAccess: 'unchanged',
    writeAccess: 'unchanged',
    readCampaignIds: [],
    readUserIds: [],
    readCharacterIds: [],
    writeCampaignIds: [],
    writeUserIds: [],
  }

  const updates = buildEntityAccessUpdate(entity, payload)
  assert.equal(updates.read_access, undefined)
  assert.equal(updates.write_access, undefined)
})
