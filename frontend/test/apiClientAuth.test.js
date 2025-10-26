import test from 'node:test'
import assert from 'node:assert/strict'

test('API client automatically adds bearer token from storage', async () => {
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage
  const originalWindow = globalThis.window

  const tokenValue = 'test-token-123'

  globalThis.localStorage = {
    getItem: () => JSON.stringify({ token: tokenValue }),
    removeItem: () => {},
  }

  globalThis.window = { location: { pathname: '/', href: '' } }

  let receivedOptions
  globalThis.fetch = async (url, options) => {
    receivedOptions = options
    return {
      ok: true,
      status: 200,
      headers: {
        get: (key) => (key === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({}),
      text: async () => '',
    }
  }

  try {
    const { default: api } = await import('../src/api/client.js')

    await api.get('/entities/123')

    assert.ok(receivedOptions, 'fetch should be called by the API client')
    assert.strictEqual(
      receivedOptions.headers.Authorization,
      `Bearer ${tokenValue}`,
      'Authorization header should include bearer token'
    )
  } finally {
    globalThis.fetch = originalFetch
    globalThis.localStorage = originalLocalStorage
    globalThis.window = originalWindow
  }
})
