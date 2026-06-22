---
phase: 52-cleanup-i18n-merkkijonot-authmodal-bugi
fixed_at: 2026-06-22T12:42:39Z
review_path: .planning/phases/52-cleanup-i18n-merkkijonot-authmodal-bugi/52-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 52: Code Review Fix Report

**Fixed at:** 2026-06-22T12:42:39Z
**Source review:** .planning/phases/52-cleanup-i18n-merkkijonot-authmodal-bugi/52-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (WR-01, WR-02 — critical_warning scope; IN-01 and IN-02 out of scope for this pass)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: `mapError` and `mapBusinessError` are duplicated, divergence-prone logic

**Files modified:** `lib/authErrors.ts` (new), `app/business/rekisteroidy/mapBusinessError.ts`, `app/components/AuthModal.tsx`
**Commit:** `4fa98b8`
**Applied fix:** Extracted the shared `(A || B) && C` precedence-sensitive classifier into a new `lib/authErrors.ts` module exporting `mapAuthError`. `mapBusinessError.ts` now wraps `mapAuthError` and maps `errorInvalidCredentials` down to `errorGeneric` (business registration has no sign-in flow). `AuthModal.tsx`'s `mapError` now delegates to `mapAuthError` directly, preserving its existing named-export signature so the test import (`@/app/components/AuthModal`) keeps working unchanged.

Verified `app/business/rekisteroidy/page.tsx` continues to import `mapBusinessError` only from the sibling `./mapBusinessError` module and exports nothing beyond its default component — the Next.js route-export restriction this phase already fixed once is unaffected; `mapAuthError`/`mapBusinessError` remain plain non-route module exports, never re-exported from `page.tsx` itself.

### WR-02: `mapError`'s real-world correctness relies on an unstated assumption about Supabase's password-length error text

**Files modified:** `app/components/__tests__/AuthModal.mapError.test.ts`
**Commit:** `5d41b1d`
**Applied fix:** Added a regression test case to both the `mapError` and `mapBusinessError` describe blocks asserting that the literal real-world GoTrue error string `'Password should be at least 6 characters'` resolves to `errorWeakPassword`. This closes the gap where the existing precedence-regression test only used a synthetic message and never asserted against Supabase's actual wording.

## Verification

- `npx vitest run` — 186/186 tests pass (184 pre-existing + 2 new), run inside an isolated git worktree with `node_modules` and `.env.local` linked from the main checkout.
- `npm run build` — succeeds; type-checking and static generation for all 31 routes complete without error. Confirms the `lib/authErrors.ts` extraction and the `AuthModal.tsx` / `mapBusinessError.ts` edits did not reintroduce the Next.js `page.tsx` named-export build failure this phase previously had to fix — `page.tsx` still only has a default export.

## Skipped Issues

None — both in-scope findings were fixed and verified.

---

_Fixed: 2026-06-22T12:42:39Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
