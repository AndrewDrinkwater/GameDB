import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  clampCollectionDescription,
  normaliseCollectionEntityIds,
  normaliseCollectionName,
  normaliseSelectionMode,
} from '../entityCollectionController.js'

describe('entityCollectionController helpers', () => {
  it('normaliseCollectionName enforces required constraints', () => {
    assert.equal(normaliseCollectionName('  Heroes  '), 'Heroes')
    assert.throws(() => normaliseCollectionName('   '), /Name is required/)
  })

  it('clampCollectionDescription trims and limits length', () => {
    assert.equal(clampCollectionDescription('  Notes  '), 'Notes')
    assert.equal(clampCollectionDescription(''), null)

    const longText = 'x'.repeat(501)
    assert.throws(() => clampCollectionDescription(longText), /500 characters or less/)
  })

  it('normaliseSelectionMode only allows manual for now', () => {
    assert.equal(normaliseSelectionMode('manual'), 'manual')
    assert.equal(normaliseSelectionMode(undefined), 'manual')
    assert.throws(() => normaliseSelectionMode('filter'), /Only manual collections/)
  })

  it('normaliseCollectionEntityIds removes duplicates and enforces limit', () => {
    const values = normaliseCollectionEntityIds(['a', 'a', 'b'])
    assert.deepEqual(values, ['a', 'b'])

    assert.throws(() => normaliseCollectionEntityIds('abc'), /must be an array/)
  })
})
