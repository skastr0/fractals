import { expect, test } from 'bun:test'

import { checkServerHealth } from '../lib/opencode/health'

test('checkServerHealth returns connected details', async () => {
  const mockFetch: typeof fetch = async (input) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url.endsWith('/global/health')) {
      return new Response(JSON.stringify({ healthy: true, version: '1.0.0' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    return new Response('Not Found', { status: 404 })
  }

  const result = await checkServerHealth({
    baseUrl: 'http://localhost:5577',
    fetch: mockFetch,
  })

  expect(result).toEqual({
    connected: true,
    url: 'http://localhost:5577',
    version: '1.0.0',
  })
})
