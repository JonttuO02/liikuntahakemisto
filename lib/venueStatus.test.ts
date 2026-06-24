import { describe, it, expect } from 'vitest'
import { deriveVenueStatus } from './venueStatus'

describe('deriveVenueStatus', () => {
  it('palauttaa kesken kun draft on olemassa ja claim_status on pending (D-04)', () => {
    expect(deriveVenueStatus('pending', true)).toBe('kesken')
  })

  it('palauttaa pending kun draftia ei ole ja claim_status on pending (D-03)', () => {
    expect(deriveVenueStatus('pending', false)).toBe('pending')
  })

  it('palauttaa approved kun draftia ei ole ja claim_status on approved', () => {
    expect(deriveVenueStatus('approved', false)).toBe('approved')
  })

  it('palauttaa rejected kun draftia ei ole ja claim_status on rejected', () => {
    expect(deriveVenueStatus('rejected', false)).toBe('rejected')
  })

  it('palauttaa kesken kun draft on olemassa, vaikka claim_status on approved (D-02 invariantti)', () => {
    expect(deriveVenueStatus('approved', true)).toBe('kesken')
  })

  it('palauttaa kesken kun draft on olemassa, vaikka claim_status on rejected (D-02 invariantti)', () => {
    expect(deriveVenueStatus('rejected', true)).toBe('kesken')
  })

  it('palauttaa pending tuntemattomalla/tyhjällä claim_statuksella kun draftia ei ole', () => {
    expect(deriveVenueStatus('', false)).toBe('pending')
  })
})
