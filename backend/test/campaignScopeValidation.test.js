import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ensureEntitiesVisibleToCampaign,
  ensurePayloadWithinCampaignScope,
} from '../src/utils/campaignBulkAccess.js'

const buildEntity = (overrides = {}) => ({
  id: overrides.id || 'entity-1',
  read_access: overrides.read_access ?? 'global',
  read_campaign_ids: overrides.read_campaign_ids ?? [],
  read_character_ids: overrides.read_character_ids ?? [],
})

test('ensureEntitiesVisibleToCampaign passes for global visibility', () => {
  assert.doesNotThrow(() =>
    ensureEntitiesVisibleToCampaign([buildEntity()], {
      campaignId: 'campaign-1',
      campaignCharacterIds: new Set(),
    }),
  )
})

test('ensureEntitiesVisibleToCampaign rejects hidden entities outside campaign scope', () => {
  assert.throws(() =>
    ensureEntitiesVisibleToCampaign(
      [
        buildEntity({
          id: 'entity-2',
          read_access: 'hidden',
        }),
      ],
      { campaignId: 'campaign-1', campaignCharacterIds: new Set() },
    ),
  )
})

test('ensurePayloadWithinCampaignScope rejects campaigns outside the DM scope', () => {
  assert.throws(() =>
    ensurePayloadWithinCampaignScope(
      {
        readCampaignIds: ['campaign-1', 'campaign-other'],
        writeCampaignIds: [],
        readUserIds: [],
        writeUserIds: [],
        readCharacterIds: [],
      },
      {
        campaignId: 'campaign-1',
        memberUserIds: new Set(['user-1']),
        campaignCharacterIds: new Set(['character-1']),
      },
    ),
  )
})

test('ensurePayloadWithinCampaignScope rejects write users outside membership', () => {
  assert.throws(() =>
    ensurePayloadWithinCampaignScope(
      {
        readCampaignIds: ['campaign-1'],
        writeCampaignIds: ['campaign-1'],
        readUserIds: [],
        writeUserIds: ['user-2'],
        readCharacterIds: [],
      },
      {
        campaignId: 'campaign-1',
        memberUserIds: new Set(['user-1']),
        campaignCharacterIds: new Set(['character-1']),
      },
    ),
  )
})
