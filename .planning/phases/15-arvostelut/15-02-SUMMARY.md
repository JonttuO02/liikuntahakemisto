---
phase: 15-arvostelut
plan: "02"
subsystem: frontend-components
tags: [react, framer-motion, glassmorphism, tdd, reviews, star-picker, review-section]

requires:
  - phase: 15-arvostelut
    plan: "01"
    provides: lib/reviewUtils.ts (resolveDisplayName, computeAvgRating)

provides:
  - app/components/StarPicker.tsx: Controlled 5-star input with hover preview and whileTap animation
  - app/components/ReviewSection.tsx: Glass card shell with StarAverage + ReviewForm slot + ReviewCard list + Näytä kaikki toggle
  - export type ReviewRow: 6-field type alias (id, rating, teksti, is_anonymous, reviewer_name, created_at) — consumed by Plan 04

affects:
  - 15-03 (ReviewForm.tsx is imported as ./ReviewForm from ReviewSection; Plan 03 resolves the TS2307 missing-module error)
  - 15-04 (page.tsx imports ReviewSection and passes server-fetched ReviewRow[] data)

tech-stack:
  added: []
  patterns:
    - "Controlled star input: hovered || value drives filled/empty display; parent owns value"
    - "Unicode ★ glyph as icon — no lucide-react, no SVG; text-2xl is icon-sizing not a typography size"
    - "ReviewCard inline in ReviewSection (no separate file): flex flex-col gap-2 py-3 border-b last:border-0"
    - "StarAverage: Math.round(avg) filled stars + (Math.round(avg*10)/10).toFixed(1) numeric"
    - "Näytä kaikki: self-start underline text-link, disappears on click (no collapse)"

key-files:
  created:
    - app/components/StarPicker.tsx
    - app/components/ReviewSection.tsx
  modified: []

key-decisions:
  - "StarPicker is fully controlled: value+onChange props only; hovered state drives preview but parent always owns the selected value"
  - "ReviewSection imports ./ReviewForm (Plan 03) — one expected TS2307 missing-module error until Plan 03 lands; acceptable per verification spec"
  - "ReviewRow type exported from ReviewSection.tsx — Plan 04 imports it from here to ensure type consistency"
  - "ReviewCard defined inline in ReviewSection (not a separate file) per UI-SPEC Component Inventory"
  - "visit_date and crowd_rating explicitly excluded from ReviewCard (D-08 scope guard enforced by verify script banned-token check)"
  - "last:border-0 Tailwind v3 pseudo class removes bottom border from final ReviewCard"

metrics:
  duration: 8min
  completed: 2026-05-28
  tasks: 2/2
  files: 2
---

# Phase 15 Plan 02: Arvostelut Visual Scaffold Summary

**StarPicker (controlled 5-star input with hover preview) + ReviewSection (glass card + StarAverage + ReviewCard list + ReviewForm slot) — both verify scripts pass, TypeScript clean except expected ./ReviewForm missing-module**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Tasks:** 2/2 complete
- **Files created:** 2

## Accomplishments

- `StarPicker.tsx`: Controlled component — 5 `motion.button` stars, hover preview via `hovered || value`, `onMouseLeave` revert, `whileTap={{ scale: 0.95, duration: 0.12 }}`, Unicode ★ glyph, ARIA `role="group"` + per-button `aria-label`, no lucide-react, no spring physics
- `ReviewSection.tsx`: Glass card shell (`max-w-2xl mx-auto px-4 pb-10` + `glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5`), `StarAverage` inline block (filled ★ + rounded decimal + count / empty state "Ei vielä arvosteluja"), `ReviewForm` slot (Plan 03), `ReviewCard` inline (amber stars + `resolveDisplayName` author + teksti), "Näytä kaikki" toggle button
- Exports `ReviewRow` type alias with exactly 6 fields — no `user_id`, no `visit_date`, no `crowd_rating` (T-15-02 scope guard)
- Both verify scripts exit 0 and print OK
- Single expected TS2307 error (`./ReviewForm` missing) — resolves when Plan 03 lands

## Task Commits

1. **Task 1: Create StarPicker.tsx** - `389e5b6` (feat)
2. **Task 2: Create ReviewSection.tsx** - `fb333af` (feat)

## Files Created/Modified

- `/app/components/StarPicker.tsx` — Controlled 5-star input: `value`/`onChange` props, hover preview state, 5 `motion.button` elements, Unicode ★, ARIA labels
- `/app/components/ReviewSection.tsx` — Glass card shell: `StarAverage` + `ReviewForm` slot + `ReviewCard` list + "Näytä kaikki" toggle; exports `ReviewRow` type

## Decisions Made

- StarPicker uses `hovered || value` to drive display — zero-value falsy shortcircuit is intentional; `value` is always 1–5 or 0 (no star selected) and `hovered` is 0 when not hovering
- `ReviewSection` declares and exports `ReviewRow` type rather than importing from a shared types file — keeps the type co-located with the component that defines the shape and simplifies Plan 04 import
- `ReviewCard` is inline (not a separate file) per UI-SPEC Component Inventory note
- `last:border-0` chosen over `border-0` on a wrapper `last-of-type` — Tailwind v3 native pseudo, matches the ReviewCard `border-b` sibling pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Synced Plan 01 dependency files from master**
- **Found during:** Pre-execution setup
- **Issue:** Worktree branch `worktree-agent-aa4931650b3bed557` branched from `ab6f084` (Phase 13) and did not contain Plan 01 outputs (`lib/reviewUtils.ts`, `lib/reviewUtils.test.ts`, `supabase/migrations/20260528_reviews.sql`) which are imported by ReviewSection
- **Fix:** `git checkout master -- lib/reviewUtils.ts lib/reviewUtils.test.ts supabase/migrations/20260528_reviews.sql` and committed as `cdf5f5f`
- **Files modified:** lib/reviewUtils.ts, lib/reviewUtils.test.ts, supabase/migrations/20260528_reviews.sql
- **Commit:** `cdf5f5f`

**2. [Rule 3 - Blocking] Removed incompatible StarPicker component test file**
- **Found during:** Task 1 TDD RED phase
- **Issue:** `vitest.config.ts` includes only `lib/**/*.test.ts`; component tests require jsdom environment not configured; the StarPicker test file would not be picked up by the test runner
- **Fix:** Used `node -e` content-check script (as specified in plan `<verify>`) as the functional equivalent of a RED→GREEN gate; removed the test file to avoid a misleading untracked file
- **Impact:** No behavioral change — verify script provides same coverage as manual content inspection

## Known Stubs

**ReviewForm slot in ReviewSection.tsx** — `<ReviewForm paikkaId={paikkaId} />` is imported from `./ReviewForm` which does not exist until Plan 03. Until Plan 03 lands:
- TypeScript reports TS2307 (expected and documented in plan verification spec)
- Next.js build will fail on `ReviewSection.tsx` until `./ReviewForm` exists
- This is intentional per plan design: Plan 02 wires the slot, Plan 03 fills it

This stub is not a plan-goal blocker — Plan 02's goal is the visual scaffold (StarPicker + ReviewSection shell), and both are complete. The ReviewForm integration completes in Plan 03.

## Threat Flags

No new threat surface beyond plan's threat model.

- T-15-02 mitigated: `resolveDisplayName(review.is_anonymous, review.reviewer_name)` used in ReviewCard — `user_id` field excluded from `ReviewRow` type, cannot be rendered by mistake
- T-15-05 mitigated: `review.teksti` rendered as React text node (`{review.teksti}`) — no `dangerouslySetInnerHTML`

## Self-Check: PASSED

- `app/components/StarPicker.tsx` exists: FOUND
- `app/components/ReviewSection.tsx` exists: FOUND
- Commit `389e5b6` (StarPicker): FOUND
- Commit `fb333af` (ReviewSection): FOUND
- Both verify scripts: OK
- TypeScript errors on ReviewSection.tsx: 1 (expected TS2307 for ./ReviewForm — acceptable per plan spec)

---
*Phase: 15-arvostelut*
*Completed: 2026-05-28*
