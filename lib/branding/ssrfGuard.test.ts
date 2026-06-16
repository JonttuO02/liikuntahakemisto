import { describe, it, expect } from 'vitest'
import { isUrlSafe } from './ssrfGuard'

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
