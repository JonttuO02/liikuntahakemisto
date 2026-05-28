# 13-01 Summary: DiagonaalKortti Component

## File created
- `app/components/DiagonaalKortti.tsx` — 119 lines

## Key implementation choices
- Clip-path values: left panel `polygon(0 0, 62% 0, 57% 100%, 0 100%)`, right panel `polygon(57% 0, 100% 0, 100% 100%, 52% 100%)`
- Alt text for map image: `"Karttakuva: ${paikka.nimi}"`
- Info panel padding: `p-3`
- Card height: `h-32` (128px fixed)
- Static Maps URL: 200x128 size, scale=2, zoom=15, roadmap type with red pin

## Import decisions
- `cn` was removed from the import (not needed in this component; `void cn` approach skipped in favour of a clean import)
- All other imports retained as specified

## Exports
- Default export: `DiagonaalKortti`
- Named export: `diagonaalKorttiVariants` (for parent grid containers using `motion` stagger)

## Verification
- TypeScript (`tsc --noEmit`): no errors
- lib tests (`vitest run lib/`): 43/43 passed across 5 test files

## Deviations from plan
- None. The `void cn` line and `cn` import were both omitted (plan note said to remove `cn` if it causes a TS warning — removed proactively since `cn` has no usage in this component).
