---
phase: 52-cleanup-i18n-merkkijonot-authmodal-bugi
verified: 2026-06-22T15:20:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 52: Cleanup — i18n & AuthModal Verification Report

**Phase Goal:** EN-locale user sees the entire UI in their selected language, and AuthModal's error-message classification works correctly.
**Verified:** 2026-06-22T15:20:00Z
**Status:** passed
**Re-verification:** No — initial verification. The body of this file below "Independent Re-Verification" section was authored by the plan-52-01 executor as the required `must_haves.artifacts` evidence document (file+line/git citations for CLEAN-06/CLEAN-07). It is preserved as-is. The section above and immediately below is the goal-backward verifier's independent re-check of those claims against the current codebase — not a re-statement of the executor's prose.

## Goal Achievement (Independent Re-Verification)

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | EN-locale user sees English loading/mode-toggle texts in AuthModal (no hardcoded Finnish strings) | VERIFIED | `app/components/AuthModal.tsx:38` `useTranslations('Auth')`; every user-visible string (`signingIn`, `creatingAccount`, `signIn`, `signUp`, `noAccount`, `createAccount`, `or`, `close`, `continueWithGoogle`, etc.) routes through `t()`. Re-ran `grep -nE "[äöåÄÖÅ]"` myself — zero matches in the file. `messages/en.json` has an `Auth` namespace with 19 keys (confirmed via `node -e require`). |
| 2 | EN-locale user sees the homepage CalloutCard, the paikka detail page location row, and DiagonaalKortti's aria-label in English | VERIFIED | `CalloutCard.tsx:74-75` (`PaikkaKortti`/`Lajit`), `app/paikat/[id]/page.tsx:38` (`PaikkaPage`, server `getTranslations`), `DiagonaalKortti.tsx:43-44` (`PaikkaKortti`/`Lajit`) — all re-confirmed by direct grep. Zero Finnish-diacritic matches in CalloutCard.tsx and page.tsx. DiagonaalKortti.tsx has 5 Finnish-diacritic matches (lines 63, 71, 72, 146, 147), each independently read and confirmed to be `//` code comments about layout math, not user-visible text. The `alt={`Kuva: ${paikka.nimi}`}` string at line 224 is the one known hardcoded Finnish string — screen-reader-only, explicitly deferred per CONTEXT.md D-05, and confirmed untouched: `git diff a6d38e0..HEAD -- app/components/DiagonaalKortti.tsx` produces empty output (no changes since before this phase started). All four namespaces (`Auth`, `PaikkaKortti`, `PaikkaPage`, `Lajit`) exist in `messages/en.json` (19/12/8/9 keys respectively, confirmed programmatically). |
| 3 | AuthModal's error-message classification produces the correct message when an error matches multiple conditions (precedence bug `A \|\| B && C` → `(A \|\| B) && C` fixed) | VERIFIED | Read `app/components/AuthModal.tsx:27-31` and `app/business/rekisteroidy/mapBusinessError.ts:11-16` directly — both use the correct `(A \|\| B) && C` grouping. Confirmed commit `85eea7a8` exists via `git show` (matches cited message and date). Re-ran `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts -t "weak password"` myself: 2 passed / 6 skipped — confirms the selector finds exactly the two intended regression tests (one per classifier) and they pass. |
| 4 | Project build is not broken by this phase's changes | VERIFIED | Ran `npm run build` myself on current HEAD: "✓ Compiled successfully", all 31 routes generated (including `/business/rekisteroidy` and `/paikat/[id]`), no TS/ESLint errors. Confirms the orchestrator's two post-merge fixes (commit `24e1be5`) actually resolved the build. |
| 5 | Test suite passes and the regression test exercises real production code, not an inlined copy | VERIFIED | Ran `npm test` myself on current HEAD: 15 files, 184 tests, all passed. Read the test file directly: imports `mapError` from `@/app/components/AuthModal` (line 2) and `mapBusinessError` from `@/app/business/rekisteroidy/mapBusinessError` (line 3, the post-merge-corrected path) — both genuine exports of production files, confirmed by reading those files. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/__tests__/AuthModal.mapError.test.ts` | Vitest regression test, ≥25 lines, imports real `mapError`/`mapBusinessError` | VERIFIED | 39 lines; 8 test cases; imports the real production exports |
| `52-VERIFICATION.md` (this file) | CLEAN-06/CLEAN-07 evidence with file+line and commit citations | VERIFIED | Executor's evidence section below correctly updated post-merge to cite `mapBusinessError.ts` instead of `page.tsx`; both post-merge build-gate fixes documented accurately (independently confirmed) |
| `package.json` `scripts.test` | `"vitest run"` | VERIFIED | Line 10: `"test": "vitest run"` |
| `app/business/rekisteroidy/mapBusinessError.ts` | New module housing the extracted classifier (post-merge fix, not in original plan) | VERIFIED | Exists, exports `mapBusinessError`, correct precedence, no debt markers |
| `app/business/rekisteroidy/page.tsx` | No named export of `mapBusinessError` (Next.js route-export contract) | VERIFIED | `grep "^export"` shows only `export default function BusinessRekisteroidyPage`; imports `mapBusinessError` internally at line 9, calls it at line 80 |
| `vitest.config.ts` | Valid `oxc.jsx` config | VERIFIED | `oxc: { jsx: { runtime: 'automatic' } }` — correct object form, not the invalid bare string that caused the second post-merge build failure |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `AuthModal.mapError.test.ts` | `app/components/AuthModal.tsx` | `import { mapError } from '@/app/components/AuthModal'` | WIRED | Real import; `mapError` genuinely exported at `AuthModal.tsx:20` |
| `AuthModal.mapError.test.ts` | `app/business/rekisteroidy/mapBusinessError.ts` | `import { mapBusinessError } from '@/app/business/rekisteroidy/mapBusinessError'` | WIRED | Original plan frontmatter specified `@/app/business/rekisteroidy/page` as the import target; the post-merge extraction (commit `24e1be5`) moved the real export to the new module, and the test was correctly updated to match. Documented deviation, not silent drift. |
| `app/business/rekisteroidy/page.tsx` | `app/business/rekisteroidy/mapBusinessError.ts` | `import ... from './mapBusinessError'` (line 9), called at line 80 | WIRED | Internal use only; default export and call-site behavior unchanged |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| CLEAN-06 | 52-01 | EN-locale user does not see hardcoded Finnish strings in AuthModal/CalloutCard/paikkasivu/DiagonaalKortti | SATISFIED | Truths 1-2 |
| CLEAN-07 | 52-01 | AuthModal error-classification operator-precedence bug fixed | SATISFIED | Truth 3 |

No orphaned requirements — REQUIREMENTS.md maps only CLEAN-06 and CLEAN-07 to Phase 52, and both appear in the plan's `requirements` frontmatter.

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any phase-modified file (`AuthModal.tsx`, `mapBusinessError.ts`, `page.tsx`, the test file, `vitest.config.ts`).

### Specifically-Requested Re-Verification (per task brief)

| Claim | Re-verified myself | Result |
|-------|---------------------|--------|
| `npm run build` succeeds on current HEAD | Yes | "✓ Compiled successfully", 31 routes |
| `npm test` passes 184+ tests on current HEAD | Yes | 15 files, 184 tests, all passed |
| `page.tsx` has no named export of `mapBusinessError` | Yes | Only `export default function BusinessRekisteroidyPage` |
| `mapBusinessError.ts` exists and exports the function | Yes | Confirmed, 18 lines, correct precedence |
| Test imports `mapBusinessError` from new module path, not `page.tsx` | Yes | `import { mapBusinessError } from '@/app/business/rekisteroidy/mapBusinessError'` |
| `DiagonaalKortti.tsx` line ~224 not modified | Yes | `git diff a6d38e0..HEAD` empty for this file |
| No message key added/changed/removed in `messages/en.json`/`messages/fi.json` | Yes | `git diff a6d38e0..HEAD` empty for both files |

### Human Verification Required

None. All success criteria are verifiable by static analysis, grep, git history, and automated test/build execution.

### Gaps Summary

None. All three ROADMAP success criteria hold, both requirement IDs (CLEAN-06, CLEAN-07) are satisfied, build and test gates pass on current HEAD, and every claim flagged for independent re-verification in the task brief was confirmed true by direct inspection rather than trusted from SUMMARY.md or the executor's evidence prose below.

Minor non-blocking observation: `.planning/REQUIREMENTS.md` traceability table still shows CLEAN-06/CLEAN-07 as "Pending" and `.planning/STATE.md` progress counters show `completed_phases: 0` — bookkeeping fields normally updated at phase closeout, not a code-correctness issue, and does not affect this verification's status.

---

# Executor Evidence Document (original content, preserved)

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

---

_Verified: 2026-06-22T15:20:00Z_
_Verifier: Claude (gsd-verifier)_
