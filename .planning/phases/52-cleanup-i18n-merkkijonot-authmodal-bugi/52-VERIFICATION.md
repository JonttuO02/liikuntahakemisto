# Phase 52 Verification — CLEAN-06 / CLEAN-07

This document records concrete file+line and git evidence that CLEAN-06 and CLEAN-07
already hold true in the current codebase, per CONTEXT.md D-01/D-02/D-04. No
implementation work was required for either requirement; this plan only adds
durable evidence plus a regression test guarding the precedence behavior.

## CLEAN-06 — i18n coverage of the four named components

Scope locked to exactly these four files per CONTEXT.md D-03 (no broader sweep).

| File | Namespace(s) | Hook call (file:line) |
|------|--------------|------------------------|
| `app/components/AuthModal.tsx` | `Auth` | `app/components/AuthModal.tsx:38` — `const t = useTranslations('Auth')` |
| `app/components/CalloutCard.tsx` | `PaikkaKortti`, `Lajit` | `app/components/CalloutCard.tsx:74-75` — `const t = useTranslations('PaikkaKortti')`, `const tLajit = useTranslations('Lajit')` |
| `app/paikat/[id]/page.tsx` | `PaikkaPage` | `app/paikat/[id]/page.tsx:38` — `const t = await getTranslations('PaikkaPage')` |
| `app/components/DiagonaalKortti.tsx` | `PaikkaKortti`, `Lajit` | `app/components/DiagonaalKortti.tsx:43-44` — `const t = useTranslations('PaikkaKortti')`, `const tLajit = useTranslations('Lajit')` |

Verification command and result:

```
grep -lE "useTranslations|getTranslations" app/components/AuthModal.tsx app/components/CalloutCard.tsx "app/paikat/[id]/page.tsx" app/components/DiagonaalKortti.tsx
```

Result: all 4 files matched (4/4). EN translations for the consumed namespaces
(`Auth`, `PaikkaKortti`, `PaikkaPage`, `Lajit`) are present in `messages/en.json`
per RESEARCH.md's prior confirmation.

### Hardcoded Finnish-character grep classification

Grep pattern `[äöåÄÖÅ]` was run against each of the four files individually.

- `app/components/AuthModal.tsx` — no matches.
- `app/components/CalloutCard.tsx` — no matches.
- `app/paikat/[id]/page.tsx` — no matches.
- `app/components/DiagonaalKortti.tsx` — 4 matches, all inside `//` code comments
  describing layout math (card height percentages, masking/fade logic). Per
  RESEARCH.md Pitfall 2, code comments are not user-visible and are NOT
  localization violations.

A separate targeted grep for `alt=` in `DiagonaalKortti.tsx` confirms the one
known user-adjacent (screen-reader-only) hardcoded Finnish string:

```
app/components/DiagonaalKortti.tsx:224:  alt={`Kuva: ${paikka.nimi}`}
```

This is the single hardcoded Finnish string in scope across all four files,
and per **CONTEXT.md D-05** it is **explicitly deferred** by user decision:
"Texts that are not visible for users don't have to be fixed at this time. It
can be done later." It is screen-reader / fallback-only text (not visible to
sighted users), and the user rejected fixing it now. This plan does not touch
that line.

**Conclusion:** Zero unexplained user-visible hardcoded Finnish strings across
the four in-scope files. CLEAN-06 is satisfied by the current codebase.

## CLEAN-07 — operator-precedence bug in error classification

The bug described in STATE.md Carry-Forward (`P30-BUG`) — `mapError`'s
weak-password check using ungrouped `A || B && C` instead of `(A || B) && C`
— was already fixed prior to this phase.

**Fix commit:** `85eea7a88dbd43411f869a12e1aaa64cfaecdda0` ("fix(30): CR-01
operator precedence in AuthModal mapError password check"), dated 2026-06-04.

**Current correct code:**

- `app/components/AuthModal.tsx:27-31`:
  ```ts
  if (
    (message.includes('Password should be at least') ||
      message.includes('password')) &&
    message.includes('6')
  ) {
    return 'errorWeakPassword'
  }
  ```
- `app/business/rekisteroidy/mapBusinessError.ts:1-17` (relocated from
  `page.tsx:10-27` — see Testability change below):
  ```ts
  if (
    (message.includes('Password should be at least') || message.includes('password')) &&
    message.includes('6')
  ) {
    return 'errorWeakPassword'
  }
  ```

Both classifiers correctly group `(A || B) && C` — the equivalent logic in
`mapBusinessError` (rekisteroidy page) was already correct as well; it did not
need the same historical fix because it was written correctly from the start.

**Testability change (this plan):** `mapError` and `mapBusinessError` were
module-private `function` declarations. `mapError` is now exported (`export
function`) directly from `AuthModal.tsx` — a behavior-preserving change, no
call sites changed, default export unchanged, precedence expression
byte-for-byte unchanged.

`mapBusinessError` could not be exported the same way: `app/business/rekisteroidy/page.tsx`
is a Next.js App Router `page.tsx` route file, and Next's generated route
typing (`checkFields<Diff<...>>` in `.next/types/.../page.ts`) only permits a
closed set of named exports (`default`, `metadata`, `generateStaticParams`,
etc.) — any other named export fails `next build`'s type-check. This surfaced
as a post-merge build-gate failure (`npm run build` failed; `npm test` /
`npx vitest run` passed regardless, since Vitest's transform pipeline doesn't
apply Next's route-export typing). Fix: `mapBusinessError` was moved verbatim
(zero logic change) into a new plain module, `app/business/rekisteroidy/mapBusinessError.ts`,
which `page.tsx` now imports for its own internal use (no export from
`page.tsx` itself, default export of the page component unchanged, call site
at `page.tsx:80` unchanged). The regression test imports `mapBusinessError`
from the new module path instead of from `page.tsx`.

**Regression guard:** `app/components/__tests__/AuthModal.mapError.test.ts`
(added this plan) asserts the precedence behavior for both `mapError` and
`mapBusinessError`, including the specific regression case (message containing
`password` and `6` but not the full `Password should be at least` phrase must
resolve to `errorWeakPassword`) and the guard case (message containing
`password` without `6` must resolve to `errorGeneric`, proving the old
ungrouped form's bug is gone). `npm test` / `npx vitest run` runs this suite.

**Conclusion:** CLEAN-07 is satisfied by the current codebase and is now
guarded by an automated regression test, preventing silent reintroduction of
the precedence bug in a future refactor.

**Test-infrastructure fix (Rule 3 — blocking issue, no new dependency):**
`AuthModal.tsx` is a `'use client'` `.tsx` component containing JSX, and the
project's `tsconfig.json` sets `"jsx": "preserve"`. Vitest 4's default oxc
transform failed to parse the file for import analysis under that setting
when the test imported `mapError` directly from `AuthModal.tsx`, blocking the
otherwise-correct test from running. Fixed by adding `oxc: { jsx: 'automatic'
}` to `vitest.config.ts` — this only affects the Vitest transform pipeline
(no new package installed, no change to the Next.js build's own JSX handling
which is unaffected by `vitest.config.ts`). Confirmed: all 8 new test cases
pass, the `-t "weak password"` selector matches the 2 weak-password tests
across both classifiers, and `npm test` runs the full repo suite (15 files,
184 tests) green with no regressions in pre-existing tests.

**Post-merge build-gate fix #1 (blocking issue, no new dependency):** After the
worktree merge, the orchestrator's post-merge build gate (`npm run build`)
failed with a TypeScript error in `.next/types/app/business/rekisteroidy/page.ts`:
exporting `mapBusinessError` directly from `page.tsx` violates Next.js App
Router's closed allowed-exports contract for route segment files. `npx vitest run`
and `npm test` had already passed because Vitest's transform does not apply
this Next-specific route-export type-check, so the issue was invisible to the
plan's own per-task verification and only caught by the phase-level
build gate. Fixed by extracting `mapBusinessError` into a new non-route
module (`app/business/rekisteroidy/mapBusinessError.ts`); `page.tsx` now
imports it for internal use only.

**Post-merge build-gate fix #2 (blocking issue, no new dependency):** Fixing
#1 surfaced a second, independent build failure: `npm run build` type-checks
the whole project including `vitest.config.ts` itself, and `oxc: { jsx:
'automatic' }` (added by fix attempt above) does not type-check — Vitest 4's
`OxcOptions.jsx` type is `'preserve' | JsxOptions`, where `JsxOptions` is an
object (`{ runtime?: 'classic' | 'automatic'; ... }`), not the bare string
`'automatic'`. `npx vitest run` had not caught this because Vitest's own
config loader does not strictly type-check `vitest.config.ts` at runtime.
Fixed by changing the value to `oxc: { jsx: { runtime: 'automatic' } }` in
`vitest.config.ts`.

**Re-verified after both fixes:** `npm run build` succeeds (`✓ Compiled
successfully`), `npm test` passes (184/184), `npx vitest run
app/components/__tests__/AuthModal.mapError.test.ts -t "weak password"`
selects and passes both weak-password regression cases.
