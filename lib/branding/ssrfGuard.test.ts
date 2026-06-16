import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isUrlSafe } from './ssrfGuard'
import { fetchWithSsrfGuard } from './fetchSafe'

// Mock global fetch so tests never make real network calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('isUrlSafe / SCRAP-07', () => {
  it('allows https URLs', () => {
    expect(isUrlSafe('https://example.com')).toBe(true)
  })

  it('allows http URLs', () => {
    expect(isUrlSafe('http://example.com')).toBe(true)
  })

  it('rejects protocols not in the allowlist', () => {
    expect(isUrlSafe('ftp://example.com')).toBe(false)
  })

  it('rejects localhost', () => {
    expect(isUrlSafe('http://localhost')).toBe(false)
  })

  it('rejects loopback 127.0.0.1', () => {
    expect(isUrlSafe('http://127.0.0.1')).toBe(false)
  })

  it('rejects the cloud metadata endpoint 169.254.169.254', () => {
    expect(isUrlSafe('http://169.254.169.254')).toBe(false)
  })

  it('rejects 192.168.x.x private range', () => {
    expect(isUrlSafe('http://192.168.1.1')).toBe(false)
  })

  it('rejects 10.x.x.x private range', () => {
    expect(isUrlSafe('http://10.0.0.5')).toBe(false)
  })

  it('rejects 172.16/12 private range (lower and upper bound)', () => {
    expect(isUrlSafe('http://172.16.0.1')).toBe(false)
    expect(isUrlSafe('http://172.31.255.255')).toBe(false)
  })

  it('rejects 100.64.0.0/10 CGNAT range', () => {
    expect(isUrlSafe('http://100.64.0.1')).toBe(false)
  })

  it('rejects unparseable input', () => {
    expect(isUrlSafe('not a url')).toBe(false)
  })
})

describe('fetchWithSsrfGuard / SCRAP-07', () => {
  it('returns the response for a safe URL returning 200', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: { get: () => null },
    })

    const res = await fetchWithSsrfGuard('https://example.com')

    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('follows a single 301 redirect to another safe URL and returns the final 200', async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 301,
        headers: { get: (k: string) => (k === 'location' ? 'https://example.com/new' : null) },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
      })

    const res = await fetchWithSsrfGuard('https://example.com')

    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws an SSRF-rejection error and never fetches a 302 redirect target that is a private IP', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 302,
      headers: { get: (k: string) => (k === 'location' ? 'http://127.0.0.1' : null) },
    })

    await expect(fetchWithSsrfGuard('https://example.com')).rejects.toThrow(
      /SSRF guard rejected URL/
    )

    // The private URL must never have been fetched
    expect(mockFetch).toHaveBeenCalledTimes(1)
    for (const call of mockFetch.mock.calls) {
      expect(call[0]).not.toContain('127.0.0.1')
    }
  })

  it('throws "Redirect with no Location header" when a 3xx has no Location header', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 302,
      headers: { get: () => null },
    })

    await expect(fetchWithSsrfGuard('https://example.com')).rejects.toThrow(
      'Redirect with no Location header'
    )
  })

  it('throws the hop-cap error after exceeding MAX_REDIRECT_HOPS (2) redirects', async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 301,
        headers: { get: (k: string) => (k === 'location' ? 'https://example.com/1' : null) },
      })
      .mockResolvedValueOnce({
        status: 301,
        headers: { get: (k: string) => (k === 'location' ? 'https://example.com/2' : null) },
      })
      .mockResolvedValueOnce({
        status: 301,
        headers: { get: (k: string) => (k === 'location' ? 'https://example.com/3' : null) },
      })

    await expect(fetchWithSsrfGuard('https://example.com')).rejects.toThrow(
      /Exceeded .* redirect hops/
    )
  })

  it('calls the underlying fetch with redirect: "manual" on every call', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: { get: () => null },
    })

    await fetchWithSsrfGuard('https://example.com')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ redirect: 'manual' })
    )
  })
})
