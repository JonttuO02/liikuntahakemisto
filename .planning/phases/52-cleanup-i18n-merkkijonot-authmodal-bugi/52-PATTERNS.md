# Phase 52: Cleanup — i18n-merkkijonot & AuthModal-bugi - Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 1 new file (test), 4 verification-only files (no modification)
**Analogs found:** 0 / 1 (no test files exist anywhere in this codebase outside `node_modules` — genuinely greenfield)

## Phase Nature

This is a **verification-and-document phase** (per CONTEXT.md D-04 and RESEARCH.md). CLEAN-06 and CLEAN-07 are both already satisfied in the current code:

- `AuthModal.tsx`, `CalloutCard.tsx`, `app/paikat/[id]/page.tsx` already use `next-intl` exclusively for user-visible strings.
- `DiagonaalKortti.tsx` is i18n'd except line 224's `alt={`Kuva: ${paikka.nimi}`}` — **explicitly deferred per D-05, do not touch.**
- The `mapError`/`mapBusinessError` operator-precedence bug was already fixed in commit `85eea7a8` (2026-06-04).

**No source files are modified this phase.** The only net-new artifact is one Vitest regression test file, justified by RESEARCH.md's Pitfall 3 / Open Question 1 (hardening already-fixed logic against future regressions) and the Wave 0 Gaps list.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/components/__tests__/AuthModal.mapError.test.ts` (NEW) | test | transform (pure function input→output) | None in this repo | no analog — greenfield |
| `app/components/AuthModal.tsx` | component | request-response (client auth) | — (read/verify only, not modified) | n/a |
| `app/components/CalloutCard.tsx` | component | request-response | — (read/verify only, not modified) | n/a |
| `app/paikat/[id]/page.tsx` | component (RSC) | request-response | — (read/verify only, not modified) | n/a |
| `app/components/DiagonaalKortti.tsx` | component | request-response | — (read/verify only, not modified) | n/a |

## Pattern Assignments

### `app/components/__tests__/AuthModal.mapError.test.ts` (test, transform)

**Analog:** None exists in this codebase. `Glob("**/*.test.ts")` returns zero results outside `node_modules` — every match (zod, tsconfig-paths, headers-polyfill, msw interceptors, etc.) is a third-party dependency's own test suite, not a project convention to follow. This file establishes the project's first test-file convention; subsequent phases will treat *this* file as the future analog.

**Test framework config** (source: `C:\ClaudeCodeTestit\liikuntahakemisto\vitest.config.ts`, full file):
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```
**Critical constraint:** the `include` glob requires the test file to live at `app/**/__tests__/*.test.ts` (or `lib/**/*.test.ts` or `tests/**/*.test.ts`). `app/components/__tests__/AuthModal.mapError.test.ts` matches this glob — confirmed valid path. Do not place it elsewhere (e.g. co-located as `AuthModal.test.tsx` next to the component) or Vitest will not discover it.

**Subject-under-test is not exported — testability gap to resolve:**

`mapError` in `app/components/AuthModal.tsx` (lines 20-35) is a module-private function, not exported:
```typescript
// Source: app/components/AuthModal.tsx lines 20-35 (current HEAD)
function mapError(message: string): 'errorInvalidCredentials' | 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'errorInvalidCredentials'
  }
  if (message.includes('User already registered') || message.includes('already been registered') || message.includes('already exists')) {
    return 'errorEmailInUse'
  }
  if (
    (message.includes('Password should be at least') ||
      message.includes('password')) &&
    message.includes('6')
  ) {
    return 'errorWeakPassword'
  }
  return 'errorGeneric'
}
```
The equivalent `mapBusinessError` in `app/business/rekisteroidy/page.tsx` (lines 10-27) has the identical visibility problem:
```typescript
// Source: app/business/rekisteroidy/page.tsx lines 10-27 (current HEAD)
function mapBusinessError(
  message: string
): 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
  if (
    message.includes('User already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'errorEmailInUse'
  }
  if (
    (message.includes('Password should be at least') || message.includes('password')) &&
    message.includes('6')
  ) {
    return 'errorWeakPassword'
  }
  return 'errorGeneric'
}
```

**Planner must choose one of these approaches (flag explicitly in PLAN.md):**
1. **Add `export` keyword to `function mapError(...)`** in `AuthModal.tsx` (and optionally `mapBusinessError` in `rekisteroidy/page.tsx`) — minimal one-line diff, makes the function importable by the test. This technically modifies a "verification-only" file, but the change is a no-op for runtime behavior (adding `export` does not change any call site) and is the lowest-risk way to make the pure function unit-testable.
2. **Duplicate the precedence logic inline in the test file** as a local copy — avoids touching `AuthModal.tsx` at all, but the test would no longer catch a *future* regression introduced directly in `AuthModal.tsx` (defeats the purpose per Pitfall 3).

Recommended: **Option 1** — export `mapError` (and `mapBusinessError` if testing both in the same file). This is the only change RESEARCH.md implicitly assumes is needed to make `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts -t "weak password"` (the exact command cited in RESEARCH.md's Phase Requirements → Test Map) actually exercise the real production code path.

**Suggested test structure** (no in-repo analog; following Vitest's standard `describe`/`it`/`expect` API, consistent with `vitest: ^4.1.7` in `package.json` and the project's TypeScript-first conventions seen elsewhere, e.g. strict typing of return values as seen in `mapError`'s own return-type union):
```typescript
import { describe, it, expect } from 'vitest'
import { mapError } from '@/app/components/AuthModal' // requires export added — see note above

describe('mapError', () => {
  it('classifies invalid login credentials', () => {
    expect(mapError('Invalid login credentials')).toBe('errorInvalidCredentials')
  })

  it('classifies duplicate email registration', () => {
    expect(mapError('User already registered')).toBe('errorEmailInUse')
  })

  it('classifies weak password (precedence regression case: "password" branch without "Password should be at least")', () => {
    // This is the exact bug shape from the original A || B && C precedence bug:
    // a message containing "password" (lowercase) AND "6" but NOT the "Password should be at least" phrase
    // must still resolve to errorWeakPassword, proving (A || B) && C is correctly grouped.
    expect(mapError('password must be at least 6 characters')).toBe('errorWeakPassword')
  })

  it('does NOT classify as weak password when "6" is absent (regression guard for the precedence fix)', () => {
    // Original bug (A || B && C, ungrouped) would have returned errorWeakPassword here
    // because B && C binds tighter than ||, making the whole expression true whenever A is true
    // regardless of C. With A=false here, the fixed (A || B) && C form requires BOTH (A||B) AND C.
    expect(mapError('password is invalid')).toBe('errorGeneric')
  })

  it('falls back to generic error for unrecognized messages', () => {
    expect(mapError('Some unknown Supabase error')).toBe('errorGeneric')
  })
})
```

**Imports pattern note:** the project uses the `@` path alias (confirmed in `vitest.config.ts` resolve.alias and implied by Next.js's default `tsconfig.json` `@/*` convention used throughout the app, e.g. `import { createBrowserSupabase } from '@/lib/supabaseSSR'` in `AuthModal.tsx` line 7) — use `@/app/components/AuthModal` for the import, not a relative `../AuthModal` path, to match codebase convention.

---

## Shared Patterns

### i18n usage (verification reference only — not to be re-implemented)
**Source:** confirmed via direct read across all 4 named files
```typescript
// AuthModal.tsx line 38 (client)
const t = useTranslations('Auth')

// CalloutCard.tsx lines 74-75 (client)
const t = useTranslations('PaikkaKortti')
const tLajit = useTranslations('Lajit')

// app/paikat/[id]/page.tsx line 38 (server, async RSC)
const t = await getTranslations('PaikkaPage')

// DiagonaalKortti.tsx lines 43-44 (client)
const t = useTranslations('PaikkaKortti')
const tLajit = useTranslations('Lajit')
```
**Apply to:** Nothing — this is the already-correct existing state, included here only so the planner does not mistakenly "re-fix" what already works (RESEARCH.md Anti-Pattern: "Re-implementing already-correct i18n").

### Precedence-fix pattern (reference, already live in two places)
**Source:** `AuthModal.tsx` lines 27-33 and `app/business/rekisteroidy/page.tsx` lines 20-23 (shown in full above)
**Apply to:** The new test file only — assert this exact grouping behavior, do not modify the grouping itself.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/components/__tests__/AuthModal.mapError.test.ts` | test | transform | Zero test files exist anywhere in this project outside `node_modules` (confirmed via `Glob("**/*.test.ts")`); this file is the first of its kind and must follow plain Vitest conventions (`describe`/`it`/`expect`) plus this project's `@/` import-alias convention, not an in-repo precedent. |

## Open Item for Planner

`mapError` (and `mapBusinessError`) must be exported from their respective files for the test to import and exercise the real production code. This is a minimal, behavior-preserving one-line change (`function mapError` → `export function mapError`) to two files that CONTEXT.md/RESEARCH.md otherwise classify as "verify only, do not modify" — the planner should call this out explicitly as the one sanctioned, intentionally-scoped exception, justified entirely by test-infrastructure need rather than feature work.

## Metadata

**Analog search scope:** Full repo glob for `**/*.test.ts` (excluding `node_modules` results as non-applicable); direct reads of `AuthModal.tsx`, `app/business/rekisteroidy/page.tsx`, `vitest.config.ts`, `package.json`.
**Files scanned:** 5 (4 source files + vitest config) + 1 package manifest
**Pattern extraction date:** 2026-06-22
