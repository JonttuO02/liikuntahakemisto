import { describe, it, expect } from 'vitest'
import { deriveVenueStatus } from './venueStatus'

describe('deriveVenueStatus', () => {
  it('palauttaa kesken kun draft on olemassa ja claim_status on pending (D-04)', () => {
    expect(deriveVenueStatus('pending', true, null)).toBe('kesken')
  })

  it('palauttaa kesken kun draftia ei ole ja claim_status on pending mutta submitted_at puuttuu (ei koskaan lähetetty)', () => {
    expect(deriveVenueStatus('pending', false, null)).toBe('kesken')
  })

  it('palauttaa pending kun draftia ei ole, claim_status on pending ja submitted_at on asetettu (oikeasti lähetetty)', () => {
    expect(deriveVenueStatus('pending', false, '2026-06-24T10:00:00Z')).toBe('pending')
  })

  it('palauttaa approved kun draftia ei ole ja claim_status on approved', () => {
    expect(deriveVenueStatus('approved', false, '2026-06-24T10:00:00Z')).toBe('approved')
  })

  it('palauttaa rejected kun draftia ei ole ja claim_status on rejected', () => {
    expect(deriveVenueStatus('rejected', false, '2026-06-24T10:00:00Z')).toBe('rejected')
  })

  it('palauttaa kesken kun draft on olemassa, vaikka claim_status on approved (D-02 invariantti)', () => {
    expect(deriveVenueStatus('approved', true, null)).toBe('kesken')
  })

  it('palauttaa kesken kun draft on olemassa, vaikka claim_status on rejected (D-02 invariantti)', () => {
    expect(deriveVenueStatus('rejected', true, null)).toBe('kesken')
  })

  it('palauttaa pending tuntemattomalla/tyhjällä claim_statuksella kun draftia ei ole', () => {
    expect(deriveVenueStatus('', false, null)).toBe('pending')
  })
})
