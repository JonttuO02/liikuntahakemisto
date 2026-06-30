# Deferred Items — Phase 62

Items discovered during execution that are out of scope for the current plan
(pre-existing issues unrelated to the files this plan modifies).

## Plan 01

- **`app/business/onboarding/page.tsx:205`** — ESLint error `'paikkaInfo' is assigned a value but never used` (`@typescript-eslint/no-unused-vars`). This blocks `npm run build` from reaching a clean exit code, but it is unrelated to Plan 01's scope (`app/components/PaikkaSheet.tsx`, `messages/fi.json`, `messages/en.json`). Confirmed pre-existing: file last touched in commit `096f218` (Phase 61), not modified by this plan. TypeScript type-checking for PaikkaSheet.tsx itself passed cleanly ("Compiled successfully" + no type errors against `t('location')`/`t('showOnMap')`) before this unrelated lint error halted the build. Not fixed here per SCOPE BOUNDARY rule — flag for a future cleanup phase.
