import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  extractMentions,
  normaliseShareType,
  resolveCampaignId,
} from '../entityNoteController.js'

describe('entityNoteController helpers', () => {
  it('extractMentions returns unique mention payloads', () => {
    const content =
      'Hello @[Goblin Scout](111) and @[Goblin Scout](111)! Meet @[Mystic]( 222 ).'
    const mentions = extractMentions(content)

    assert.deepEqual(mentions, [
      { entityId: '111', entityName: 'Goblin Scout' },
      { entityId: '222', entityName: 'Mystic' },
    ])
  })

  it('normaliseShareType enforces allowed values', () => {
    assert.equal(normaliseShareType('PRIVATE'), 'private')
    assert.equal(normaliseShareType('companions'), 'companions')

    assert.throws(() => normaliseShareType('everyone'), /Share type must be one of/)
  })

  it('resolveCampaignId respects priority order', () => {
    const req = {
      query: { campaignId: '  1234  ' },
      body: { campaignId: 'abcd' },
      campaignContextId: 'efgh',
    }

    assert.equal(resolveCampaignId(req), '1234')
  })

  it('resolveCampaignId falls back to body or context', () => {
    const req = {
      query: { campaignId: '   ' },
      body: { campaign_id: '  def ' },
      campaignContextId: ' xyz ',
    }

    assert.equal(resolveCampaignId(req), 'def')

    const reqWithNoBody = {
      query: {},
      body: {},
      campaignContextId: ' xyz ',
    }

    assert.equal(resolveCampaignId(reqWithNoBody), 'xyz')
  })
})
