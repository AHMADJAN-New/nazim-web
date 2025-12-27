// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient } from '../../lib/api-client'

// Mock fetch
global.fetch = vi.fn()

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('includes authorization header when token exists', async () => {
    localStorage.setItem('token', 'test-token')

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    })

    await apiClient.get('/test')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('handles 401 unauthorized by clearing token', async () => {
    localStorage.setItem('token', 'invalid-token')

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })

    try {
      await apiClient.get('/test')
    } catch (error) {
      expect(localStorage.getItem('token')).toBeNull()
    }
  })

  it('sends POST requests with JSON body', async () => {
    const testData = { name: 'Test', value: 123 }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: testData }),
    })

    await apiClient.post('/test', testData)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(testData),
      })
    )
  })

  it('handles network errors', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    await expect(apiClient.get('/test')).rejects.toThrow('Network error')
  })
})
