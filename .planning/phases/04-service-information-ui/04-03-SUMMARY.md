---
phase: 04-service-information-ui
plan: 03
status: done
completed: 2026-05-21
---

# 04-03 Summary — "Auki nyt" Filter Toggle

## What was done

Added the "Auki nyt" (Open now) filter toggle to `app/components/LiikuntapaikatLista.tsx`. This delivers UI-02: real-time open-status filtering entirely client-side via the existing `getOpenStatus` utility.

## Changes made

All 8 changes applied to `app/components/LiikuntapaikatLista.tsx`:

1. Added `Clock` to lucide-react imports
2. Added `import { getOpenStatus } from '@/lib/aukiolo'`
3. Added `const [aukinyt, setAukinyt] = useState(false)` state
4. Extended `suodatettu` useMemo with `matchesAuki` predicate and added `aukinyt` to the deps array — lenient D-08 logic: only `'closed'` venues are hidden; `'open'` and `'no-data'` both pass through
5. Updated grid key to `grid-${aktiivinen}-${aktiivHinta ?? 'all'}-${aukinyt}` — re-triggers card stagger animation on toggle
6. Reset handler now also calls `setAukinyt(false)` via "Tyhjennä haku"
7. Inserted Row 3 toggle button between price filters and the card grid — uses same glass-btn / bg-[#111111] active pattern as other filter buttons, Clock icon, whileTap scale 0.95
8. Passed `aukinyt={aukinyt}` to `PaikkaKortti` so null-aukioloajat cards show "Aukioloajat tuntematon" when the filter is active (D-08)

## Verification

- `npx tsc --noEmit` — exits 0, no TypeScript errors
- `npx vitest run lib/aukiolo.test.ts` — 11/11 tests pass

## Decisions honoured

- **D-07**: Toggle is in its own row (Row 3) below price filters
- **D-08 lenient**: venues with `no-data` aukioloajat remain visible when "Auki nyt" is active; their card shows "Aukioloajat tuntematon" (not "Aukioloajat lisätään pian")
- Filter is purely client-side — no server round-trip, no security boundary crossed
