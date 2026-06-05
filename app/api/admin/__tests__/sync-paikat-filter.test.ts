import { describe, it, expect } from 'vitest'

/**
 * Pure helper that mirrors the business_managed pre-filter logic inserted into
 * app/api/admin/sync-paikat/route.ts.
 *
 * Defined inline here so the test has no side-effectful imports (the route
 * module requires Next.js and Supabase to be available at import time).
 */
function buildSyncResults(
  allResults: Array<{ place_id: string; [key: string]: unknown }>,
  managedRows: Array<{ place_id: string }> | null
): Array<{ place_id: string; [key: string]: unknown }> {
  const managedSet = new Set((managedRows ?? []).map(r => r.place_id))
  return allResults.filter(r => !managedSet.has(r.place_id))
}

describe('buildSyncResults', () => {
  it('excludes a place_id that appears in managedRows', () => {
    const managedRows = [{ place_id: 'managed_place_1' }]
    const allResults = [
      { place_id: 'managed_place_1', name: 'Gym A' },
      { place_id: 'open_place_2',    name: 'Gym B' },
    ]

    const syncResults = buildSyncResults(allResults, managedRows)

    expect(syncResults).toHaveLength(1)
    expect(syncResults[0].place_id).toBe('open_place_2')
  })

  it('passes all results through when managedRows is empty', () => {
    const managedRows: Array<{ place_id: string }> = []
    const allResults = [
      { place_id: 'place_1' },
      { place_id: 'place_2' },
    ]

    const syncResults = buildSyncResults(allResults, managedRows)

    expect(syncResults).toHaveLength(2)
  })

  it('treats null managedRows (Supabase error path) as empty — no crash', () => {
    const allResults = [{ place_id: 'place_1' }]

    const syncResults = buildSyncResults(allResults, null)

    expect(syncResults).toHaveLength(1)
    expect(syncResults[0].place_id).toBe('place_1')
  })

  it('preserves allResults.length as the loydetty count while syncResults.length reflects filtered count', () => {
    const managedRows = [{ place_id: 'place_1' }]
    const allResults = [
      { place_id: 'place_1' },
      { place_id: 'place_2' },
    ]

    const syncResults = buildSyncResults(allResults, managedRows)

    // allResults.length = 2 → loydetty field in the API response
    expect(allResults).toHaveLength(2)
    // syncResults.length = 1 → tallennettu field in the API response
    expect(syncResults).toHaveLength(1)
  })
})
