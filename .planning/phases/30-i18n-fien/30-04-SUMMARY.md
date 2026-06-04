---
phase: 30-i18n-fien
plan: "04"
subsystem: ui
tags: [next-intl, i18n, typescript, react, server-components]

# Dependency graph
requires:
  - phase: 30-i18n-fien/30-01
    provides: next-intl infrastructure, messages/fi.json + en.json, i18n/request.ts
  - phase: 30-i18n-fien/30-02
    provides: NavPill, Etusivu, PaikkaKortti, DiagonaalKortti translated
  - phase: 30-i18n-fien/30-03
    provides: ProfiiliClient translated, LanguageToggle added
provides:
  - PaikkaSheet client component fully translated (section headings, open/closed status, review count singular/plural)
  - AuthModal client component fully translated (title, placeholders, buttons, aria-labels)
  - app/paikat/[id]/page.tsx server component using getTranslations('PaikkaPage')
  - app/not-found.tsx async server component using getTranslations('NotFound')
  - TypeScript gate passed — npx tsc --noEmit exits 0 across all phase 30 files
  - messages/fi.json + en.json extended with reviewCountSingular, reviewCountPlural, close keys in PaikkaSheet namespace
affects: [30-04-checkpoint, visual-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useTranslations('Namespace') for client components, getTranslations('Namespace') for async server components
    - Singular/plural pattern: count === 1 ? t('reviewCountSingular') : t('reviewCountPlural', { count })
    - Shared namespace reuse: PaikkaSheet uses both 'PaikkaSheet' and 'PaikkaKortti' namespaces

key-files:
  created: []
  modified:
    - app/components/PaikkaSheet.tsx
    - app/components/AuthModal.tsx
    - app/paikat/[id]/page.tsx
    - app/not-found.tsx
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "reviewCount split into reviewCountSingular + reviewCountPlural keys (fi.json/en.json) to support '1 arvostelu' vs 'N arvostelua' without ICU plural syntax"
  - "PaikkaSheet open/closed status translated via tKortti (PaikkaKortti namespace) for consistency with PaikkaKortti component"
  - "Worktree branch lacked phase 30-01..30-03 commits — merged master before execution to obtain messages/ and i18n/ files"

patterns-established:
  - "Server components: import { getTranslations } from 'next-intl/server'; const t = await getTranslations('Namespace')"
  - "Client components: import { useTranslations } from 'next-intl'; const t = useTranslations('Namespace')"
  - "not-found.tsx must be async to call getTranslations"

requirements-completed:
  - I18N-03

# Metrics
duration: 20min
completed: 2026-06-04
---

# Phase 30 Plan 04: PaikkaSheet, AuthModal, paikat/[id]/page, not-found — i18n SUMMARY

**PaikkaSheet + AuthModal client components and paikat/[id]/page + not-found server components fully translated with next-intl; tsc --noEmit passes with zero errors**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-04T19:00:00Z (approx.)
- **Completed:** 2026-06-04T19:13:09Z
- **Tasks:** 3 (Task 4 is human checkpoint — not executed)
- **Files modified:** 6

## Accomplishments

- PaikkaSheet.tsx: all section headings (price, hours, phone, description, bookNow, reviews, noReviews), open/closed status, review count singular/plural, and bookmark aria-labels now render via useTranslations
- AuthModal.tsx: modal title, aria-label, close button, Google button, TAI divider, email/password placeholders, and submit button label all translated via useTranslations('Auth')
- app/paikat/[id]/page.tsx (async server component): all 6 section labels (backToDirectory, hours, phone, price, bookNow, description) translated via getTranslations('PaikkaPage')
- app/not-found.tsx: made async, 3 strings (title, description, backHome) translated via getTranslations('NotFound')
- messages/fi.json + en.json: added reviewCountSingular, reviewCountPlural, close to PaikkaSheet namespace
- npx tsc --noEmit: exits 0, zero errors in all phase 30 files

## Task Commits

Each task was committed atomically:

1. **Task 1: PaikkaSheet.tsx + AuthModal.tsx — translate client components** - `c341197` (feat)
2. **Task 2: paikat/[id]/page.tsx + not-found.tsx — translate server components** - `14da9d2` (feat)
3. **Task 3: Full TypeScript gate** - verification only, no code changes needed (tsc exits 0)

## Files Created/Modified

- `app/components/PaikkaSheet.tsx` - Added useTranslations('PaikkaSheet') + useTranslations('PaikkaKortti'); all section headings, status text, review count, and bookmark aria-labels translated
- `app/components/AuthModal.tsx` - Added useTranslations('Auth'); modal title, aria-labels, Google button, divider, placeholders, submit button translated
- `app/paikat/[id]/page.tsx` - Added getTranslations('PaikkaPage') import and await; 6 Row label props replaced with t() calls
- `app/not-found.tsx` - Made async, added getTranslations('NotFound'); 3 hardcoded strings replaced with t() calls
- `messages/fi.json` - PaikkaSheet namespace: added reviewCountSingular ("1 arvostelu"), reviewCountPlural ("{count} arvostelua"), close ("Sulje")
- `messages/en.json` - PaikkaSheet namespace: added reviewCountSingular ("1 review"), reviewCountPlural ("{count} reviews"), close ("Close")

## Decisions Made

- **reviewCount split into reviewCountSingular + reviewCountPlural**: fi.json had only `reviewCount` as one ICU-like string. Rather than introduce ICU plural syntax, two explicit keys were added. Component logic: `reviews.length === 1 ? t('reviewCountSingular') : t('reviewCountPlural', { count: reviews.length })`. This is the most explicit and TypeScript-safe approach.
- **PaikkaSheet open/closed via tKortti**: The open/closed text ("Auki nyt" / "Suljettu") is shared vocabulary with PaikkaKortti — reusing the same namespace keys avoids translation duplication.
- **Master merge at execution start**: The worktree branch was created before phase 30-01..30-03 commits landed on master. `git merge master` (fast-forward) brought messages/, i18n/, global.d.ts, and component changes into scope before executing this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added reviewCountSingular and reviewCountPlural keys to fi.json and en.json**
- **Found during:** Task 1 (PaikkaSheet.tsx)
- **Issue:** Plan specified singular/plural review count logic but fi.json only had `reviewCount` (single key). Without reviewCountSingular, TypeScript would fail on `t('reviewCountSingular')` with an unknown key error.
- **Fix:** Added `reviewCountSingular`, `reviewCountPlural`, and `close` to PaikkaSheet namespace in both fi.json and en.json. The existing `reviewCount` key was retained for backward compatibility.
- **Files modified:** messages/fi.json, messages/en.json
- **Verification:** tsc --noEmit passes; key resolution confirmed by TypeScript augmentation in global.d.ts
- **Committed in:** c341197 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Translated open/closed status in PaikkaSheet**
- **Found during:** Task 1 (PaikkaSheet.tsx review)
- **Issue:** Plan mentioned section headings but did not explicitly list "Auki nyt" / "Suljettu" text in PaikkaSheet. These are hardcoded Finnish strings that would remain untranslated.
- **Fix:** Replaced both strings with tKortti('openNow') and tKortti('closed') (PaikkaKortti namespace already has these keys).
- **Files modified:** app/components/PaikkaSheet.tsx
- **Committed in:** c341197 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 2 — missing critical)
**Impact on plan:** Both additions necessary for full translation coverage and TypeScript type safety. No scope creep.

## Issues Encountered

- Worktree branch did not include phase 30-01..30-03 changes (branch was forked before those commits). Resolved with `git merge master --no-edit` (fast-forward merge). No conflicts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 9 i18n namespaces are active: Nav, PaikkaKortti, PaikkaSheet, Filters, Todo, Profiili, Auth, Map, PaikkaPage, NotFound, Days
- Task 4 (human visual verification checkpoint) is ready: start `npm run dev` and follow the 14-step checklist in 30-04-PLAN.md
- No blockers — TypeScript is clean, all translation keys resolve correctly

---
*Phase: 30-i18n-fien*
*Completed: 2026-06-04*
