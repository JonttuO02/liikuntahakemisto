import { describe, it, expect } from 'vitest'
import { getOpenStatus, formatGroupedHours } from './aukiolo'

// Date setup notes:
// new Date(2024, 0, 1) = Monday January 1 2024, getDay() = 1
// new Date(2024, 0, 5) = Friday January 5 2024, getDay() = 5
// new Date(2024, 0, 7) = Sunday January 7 2024, getDay() = 0

describe('getOpenStatus', () => {
  it('returns no-data when aukioloajat is null', () => {
    expect(getOpenStatus(null)).toEqual({ status: 'no-data' })
  })

  it('returns no-data when aukioloajat is undefined', () => {
    expect(getOpenStatus(undefined)).toEqual({ status: 'no-data' })
  })

  it('returns closed with hours null when today is not in data (Sunday, only monday defined)', () => {
    const aukioloajat = { monday: { open: '09:00', close: '21:00' } }
    const sunday = new Date(2024, 0, 7, 10, 0) // Sunday Jan 7 2024
    expect(getOpenStatus(aukioloajat, sunday)).toEqual({ status: 'closed', hours: null })
  })

  it('returns no-data when the only day has empty strings (hasAnyData false)', () => {
    const aukioloajat = { sunday: { open: '', close: '' } }
    const sunday = new Date(2024, 0, 7, 10, 0)
    expect(getOpenStatus(aukioloajat, sunday)).toEqual({ status: 'no-data' })
  })

  it('returns open when current time is within opening hours on that day', () => {
    const aukioloajat = { monday: { open: '09:00', close: '21:00' } }
    const monday10 = new Date(2024, 0, 1, 10, 0) // Monday 10:00
    expect(getOpenStatus(aukioloajat, monday10)).toEqual({ status: 'open', hours: '09:00–21:00' })
  })

  it('returns closed when current time is after closing hours', () => {
    const aukioloajat = { monday: { open: '09:00', close: '21:00' } }
    const monday22 = new Date(2024, 0, 1, 22, 0) // Monday 22:00
    expect(getOpenStatus(aukioloajat, monday22)).toEqual({ status: 'closed', hours: '09:00–21:00' })
  })

  it('returns open for after-midnight hours when current time is before midnight', () => {
    const aukioloajat = { friday: { open: '22:00', close: '02:00' } }
    const friday23 = new Date(2024, 0, 5, 23, 0) // Friday 23:00
    expect(getOpenStatus(aukioloajat, friday23)).toEqual({ status: 'open', hours: '22:00–02:00' })
  })

  it('returns closed for after-midnight hours when current time is before opening', () => {
    const aukioloajat = { friday: { open: '22:00', close: '02:00' } }
    const friday8 = new Date(2024, 0, 5, 8, 0) // Friday 08:00
    expect(getOpenStatus(aukioloajat, friday8)).toEqual({ status: 'closed', hours: '22:00–02:00' })
  })

  it('returns no-data when all days have empty open/close strings', () => {
    const aukioloajat = {
      monday: { open: '', close: '' },
      tuesday: { open: '', close: '' },
    }
    expect(getOpenStatus(aukioloajat)).toEqual({ status: 'no-data' })
  })
})

describe('formatGroupedHours', () => {
  it('returns empty array when aukioloajat is null', () => {
    expect(formatGroupedHours(null)).toEqual([])
  })

  it('groups consecutive days with same hours and marks missing days as suljettu', () => {
    const aukioloajat = {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '09:00', close: '18:00' },
      // sunday is not in data → treated as suljettu
    }

    const result = formatGroupedHours(aukioloajat)

    expect(result[0].label).toBe('Ma–Pe')
    expect(result[0].hours).toBe('06:00–22:00')
    expect(result[1].label).toBe('La')
    expect(result[1].hours).toBe('09:00–18:00')
    expect(result[2].label).toBe('Su')
    expect(result[2].hours).toBe('suljettu')
  })
})
