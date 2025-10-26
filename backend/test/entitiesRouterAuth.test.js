import test from 'node:test'
import assert from 'node:assert/strict'

import entitiesRouter from '../src/routes/entities.js'
import { authenticate } from '../src/middleware/authMiddleware.js'

test('entities router applies authenticate middleware before entity routes', () => {
  const stack = entitiesRouter.stack || []

  assert.ok(stack.length > 0, 'router stack should not be empty')

  const middlewareIndex = stack.findIndex((layer) => layer.handle === authenticate)
  assert.notEqual(middlewareIndex, -1, 'authenticate middleware should be registered on entities router')

  const firstRouteIndex = stack.findIndex((layer) => Boolean(layer.route))
  if (firstRouteIndex !== -1) {
    assert.ok(
      middlewareIndex <= firstRouteIndex,
      'authenticate middleware should run before the first entity route handler'
    )
  }
})
