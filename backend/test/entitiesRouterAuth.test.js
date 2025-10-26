import test from 'node:test'
import assert from 'node:assert/strict'

import entitiesRouter from '../src/routes/entities.js'
import { authenticate } from '../src/middleware/authMiddleware.js'

test('entities router applies authenticate middleware before protected entity routes', () => {
  const stack = entitiesRouter.stack || []

  assert.ok(stack.length > 0, 'router stack should not be empty')

  const middlewareIndex = stack.findIndex((layer) => layer.handle === authenticate)
  assert.notEqual(middlewareIndex, -1, 'authenticate middleware should be registered on entities router')

  const protectedRoutes = stack
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => Boolean(layer.route))
    .filter(({ layer }) => {
      const { path } = layer.route
      return path !== '/:id/graph'
    })

  for (const { index, layer } of protectedRoutes) {
    assert.ok(
      middlewareIndex <= index,
      `authenticate middleware should run before the protected route ${layer.route.path}`
    )
  }
})
