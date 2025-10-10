import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyFieldDefaults,
  validateEntityMetadata,
} from '../src/utils/entityMetadataValidator.js'

const baseFields = [
  {
    id: 'field-hp',
    name: 'hp',
    label: 'HP',
    data_type: 'number',
    required: true,
    options: {},
    default_value: null,
    sort_order: 0,
  },
  {
    id: 'field-status',
    name: 'status',
    label: 'Status',
    data_type: 'enum',
    required: false,
    options: { choices: ['Alive', 'Dead'] },
    default_value: 'Alive',
    sort_order: 1,
  },
]

const fakeModels = {
  EntityTypeField: {
    async findAll() {
      return baseFields
    },
  },
}

test('validateEntityMetadata enforces required fields', async () => {
  await assert.rejects(
    validateEntityMetadata('entity-type', { status: 'Alive' }, fakeModels),
    /HP is required/
  )
})

test('applyFieldDefaults fills missing values and coerces numbers', () => {
  const fields = [
    {
      id: 'field-hp',
      name: 'hp',
      label: 'HP',
      data_type: 'number',
      required: false,
      options: {},
      default_value: '12',
      sort_order: 0,
    },
    {
      id: 'field-title',
      name: 'title',
      label: 'Title',
      data_type: 'string',
      required: false,
      options: {},
      default_value: 'Adventurer',
      sort_order: 1,
    },
  ]

  const result = applyFieldDefaults(fields, { hp: '30' })
  assert.deepEqual(result, { hp: 30, title: 'Adventurer' })
})

test('validateEntityMetadata validates enum values', async () => {
  await assert.rejects(
    validateEntityMetadata(
      'entity-type',
      { hp: 5, status: 'Unknown' },
      fakeModels
    ),
    /Status must be one of/
  )
})
