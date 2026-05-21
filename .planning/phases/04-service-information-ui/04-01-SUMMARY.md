# Phase 04-01 Summary — lib/aukiolo.ts utility library

## What was done

Created `lib/aukiolo.ts` with two exported utility functions for opening-hours logic, following TDD (RED → GREEN):

1. **Installed vitest** as a dev dependency (v4.1.7).
2. **Created `vitest.config.ts`** — `environment: 'node'`, includes `lib/**/*.test.ts`.
3. **RED phase**: wrote `lib/aukiolo.test.ts` with 11 test cases covering all edge cases. Tests failed with "Cannot find module './aukiolo'" as expected.
4. **GREEN phase**: implemented `lib/aukiolo.ts`. All 11 tests pass.
5. **TypeScript check**: `npx tsc --noEmit` exits with code 0 — no type errors.

## Exports

### `getOpenStatus(aukioloajat, now?): OpenStatus`
- Returns `{ status: 'no-data' }` when input is null/undefined or all entries have empty strings.
- Returns `{ status: 'closed', hours: null }` when today's day key is absent from data but other days have data.
- Returns `{ status: 'open' | 'closed', hours: 'HH:MM–HH:MM' }` for normal and after-midnight ranges.
- After-midnight detection: when `close < open` (in minutes), open if `now >= open || now < close`.

### `formatGroupedHours(aukioloajat): HourGroup[]`
- Returns `[]` for null/undefined input.
- Groups consecutive days with identical hours using Finnish abbreviations (Ma–Pe, La, Su).
- Days absent from data are treated as 'suljettu'.
- The en-dash separator (U+2013) is used consistently in time ranges.

## Test results

```
Test Files  1 passed (1)
     Tests  11 passed (11)
  Duration  178ms
```

## Files created

- `lib/aukiolo.ts` — utility implementation
- `lib/aukiolo.test.ts` — 11 vitest test cases
- `vitest.config.ts` — vitest configuration
