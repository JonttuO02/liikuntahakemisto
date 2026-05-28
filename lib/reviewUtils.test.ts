import { describe, it, expect } from 'vitest'
import { resolveDisplayName, computeAvgRating } from './reviewUtils'

describe('resolveDisplayName', () => {
  it('returns Anonyymi when isAnonymous is true with a name present', () => {
    expect(resolveDisplayName(true, 'jukka')).toBe('Anonyymi')
  })

  it('returns Anonyymi when isAnonymous is true with null name', () => {
    expect(resolveDisplayName(true, null)).toBe('Anonyymi')
  })

  it('returns the reviewer name when isAnonymous is false and name is present', () => {
    expect(resolveDisplayName(false, 'jukka')).toBe('jukka')
  })

  it('returns Anonyymi when isAnonymous is false and name is null', () => {
    expect(resolveDisplayName(false, null)).toBe('Anonyymi')
  })

  it('returns Anonyymi when isAnonymous is false and name is empty string', () => {
    expect(resolveDisplayName(false, '')).toBe('Anonyymi')
  })
})

describe('computeAvgRating', () => {
  it('returns null for an empty array', () => {
    expect(computeAvgRating([])).toBeNull()
  })

  it('returns the average for two ratings', () => {
    expect(computeAvgRating([3, 5])).toBe(4)
  })

  it('returns the single value for a one-element array', () => {
    expect(computeAvgRating([1])).toBe(1)
  })

  it('returns 5 when all ratings are 5', () => {
    expect(computeAvgRating([5, 5, 5, 5, 5])).toBe(5)
  })
})
