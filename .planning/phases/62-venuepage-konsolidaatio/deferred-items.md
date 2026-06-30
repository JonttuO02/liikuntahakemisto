# Deferred Items — Phase 62

Items discovered during execution that are out of scope for the current task per the
SCOPE BOUNDARY rule (only auto-fix issues directly caused by the current task's changes).

## Plan 02 (DiagonaalKortti onOpen refactor)

### Pre-existing build-blocking ESLint error (unrelated file)

- **File:** `app/business/onboarding/page.tsx:205`
- **Error:** `'paikkaInfo' is assigned a value but never used.  @typescript-eslint/no-unused-vars`
- **Found during:** Task 1 verification (`npm run build`)
- **Origin:** Pre-existing — introduced in commit `096f218` ("fix(61): restore 6-step progressbar, fix refresh data loss, add manual AI trigger"), unrelated to Phase 62 / DiagonaalKortti.tsx.
- **Why deferred:** `npm run build` runs Next.js's bundled ESLint check across the whole project; this unrelated error causes the full build to exit non-zero even though `app/components/DiagonaalKortti.tsx` itself compiles cleanly (verified via `npx tsc --noEmit`, which reports zero errors for this file). Out of scope per SCOPE BOUNDARY — not touched by this task's `files_modified`.
- **Action:** Not fixed. Flagging for a future Phase 61 cleanup pass or a dedicated lint-debt task.

### Expected (not a bug) — `Etusivu.tsx` `onCardClick` stale reference

- **File:** `app/components/Etusivu.tsx:1471`
- **Symptom:** `npx tsc --noEmit` reports `Property 'onCardClick' does not exist on type 'IntrinsicAttributes & DiagonaalKorttiProps'` after Plan 02 removes `onCardClick` from `DiagonaalKorttiProps`.
- **Status:** NOT a deviation — this is the explicit, planned hand-off to Plan 03 (wave 2, `depends_on: ["62-01", "62-02"]`), which wires `onOpen` at both `Etusivu.tsx` call sites and removes the stale `onCardClick={handleCardClick}` prop per RESEARCH.md Pattern 3 / Pitfall 5. `Etusivu.tsx` is outside Plan 02's `files_modified` scope. This transient cross-plan TypeScript error resolves once Plan 03 executes in wave 2.
