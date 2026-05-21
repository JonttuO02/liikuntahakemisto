---
phase: 04-service-information-ui
plan: 04
status: done
---

# 04-04 Summary — HoursTable + Profile Page Updates

## What was done

Created `app/components/HoursTable.tsx` (client island) and updated `app/paikat/[id]/page.tsx` to show grouped weekly opening hours and the `hinta_kuvaus` price description on the venue profile page.

## Files changed

- `app/components/HoursTable.tsx` — **created** (new client island)
- `app/paikat/[id]/page.tsx` — **modified** (imports, derived values, two Row blocks)

## Changes in detail

### HoursTable.tsx
- `'use client'` first line (browser `Date` needed for today-detection)
- Accepts `HourGroup[]` from `@/lib/aukiolo`
- Renders each group as a `<p>` — bold `text-[#111111]` for today, muted `text-[rgba(17,17,17,0.65)]` for other days
- Today detection: `DAY_KEYS[new Date().getDay()]` matched against `group.dayKeys`

### Profile page
- Added `Clock` to lucide-react imports
- Added imports for `formatGroupedHours` and `HoursTable`
- Replaced `const hinta = hintateksti(...)` with three derived values:
  - `hoursGroups` — from `formatGroupedHours(paikka.aukioloajat ?? null)`
  - `hintaTeksti` — from `hintateksti(paikka.hinta_min, paikka.hinta_max)`
  - `priceToShow` — `hinta_kuvaus` takes priority; falls back to `hintaTeksti`; null when both empty
- Inserted Aukioloajat Row (with Clock icon) between Sijainti and Puhelin rows — guarded by `hoursGroups.length > 0`
- Updated Hinta Row to use `priceToShow` as guard:
  - `hinta_kuvaus` present → prose `<p>` with `leading-relaxed`
  - numeric range fallback → serif bold `<span>`
  - both null → Row omitted entirely

## Verification

- `npx tsc --noEmit` — **0 errors**
- `npx vitest run lib/aukiolo.test.ts` — **11/11 tests passed**

## Acceptance criteria met

All must_haves from 04-04-PLAN.md satisfied:
- Today's group bold; other groups muted
- Aukioloajat Row with Clock icon renders when data present
- Row omitted when `aukioloajat` is null
- `hinta_kuvaus` renders as plain prose text
- Numeric price renders as serif bold
- Both null → no Hinta Row
- TypeScript clean
