import test from 'node:test'
import assert from 'node:assert/strict'
import { normaliseCampaignContextId, parseCampaignContext } from '../src/middleware/campaignContext.js'

test('normaliseCampaignContextId trims the provided header value', () => {
  assert.equal(normaliseCampaignContextId(' 1234 '), '1234')
  assert.equal(normaliseCampaignContextId(''), '')
  assert.equal(normaliseCampaignContextId(null), '')
})

test('parseCampaignContext attaches the campaign id to the request', () => {
  const req = { headers: { 'x-campaign-context-id': ' abc ' } }
  const res = {}
  let calledNext = false

  parseCampaignContext(req, res, () => {
    calledNext = true
  })

  assert.equal(req.campaignContextId, 'abc')
  assert.equal(calledNext, true)
})

