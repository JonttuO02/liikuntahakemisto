# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**Runner:** None — no automated test runner is installed or configured.

**Assertion library:** None.

**Config files present:** None. No `jest.config.*`, `vitest.config.*`, or `playwright.config.*` exists in the project root.

**Test-related devDependencies in `package.json`:** None. The devDependencies are:
- `@types/node`, `@types/react`, `@types/react-dom` — TypeScript types only
- `eslint`, `eslint-config-next` — linting only
- `postcss`, `tailwindcss` — build tooling only
- `typescript` — type checking only

## Test File Coverage

**Application source tests:** Zero. No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files exist under `app/`, `lib/`, or `components/`.

**`__tests__` directories:** None in project source. Only inside `node_modules/` (third-party packages).

## UAT Methodology (Phase 1)

Phase 1 used structured manual UAT documented in `.planning/phases/01-foundation-and-security/01-UAT.md`. This is the established quality gate pattern for all phases.

**Format:** Each test has:
- A numbered name
- An `expected:` description (specific, observable, often includes a curl command or exact URL)
- A `result: pass | fail`
- Optional `note:` for clarifications

**Phase 1 tests (11/11 passed):**

| # | Test | Method |
|---|------|--------|
| 1 | Cold start smoke test | Manual — browser + console |
| 2 | `/api/hae-paikat` returns 401 without auth | `curl` HTTP status check |
| 3 | `/api/admin/sync-paikat` returns 401 without auth | `curl` HTTP status check |
| 4 | `?nakyma=kartta` shows map view | Browser navigation |
| 5 | `?nakyma=lista` shows list view | Browser navigation |
| 6 | `/` without params shows Etusivu | Browser navigation |
| 7 | BottomNav active states correct on mobile viewport | Chrome DevTools device emulation |
| 8 | Loading skeleton on slow network | Chrome DevTools → Slow 3G throttle |
| 9 | Finnish 404 page | Browser navigation to non-existent route |
| 10 | Finnish error boundary page exists | File existence + visual confirmation |
| 11 | Schema columns + RLS | Supabase SQL Editor query |

**UAT document location pattern:** `.planning/phases/NN-phase-name/NN-UAT.md`

**Status field:** `status: complete` in the YAML frontmatter when all tests pass.

## Current Quality Gate

The only automated quality check is `next lint` (ESLint with `next/core-web-vitals` and `next/typescript` rulesets), which provides:
- TypeScript type checking via strict mode (`"strict": true` in `tsconfig.json`)
- React hooks rule enforcement
- Next.js-specific rules (no raw `<img>` tags, etc.)

There is no pre-commit hook, no CI configuration, and no coverage threshold.

## What Is Not Tested

No automated tests exist. The following areas carry risk:

| Area | Files | Risk |
|------|-------|------|
| Combined filter logic | `app/components/LiikuntapaikatLista.tsx` | High — `suodatettu` useMemo combines laji + text search + price; edge cases untested |
| `detectLaji()` | `app/api/hae-paikat/route.ts`, `app/api/admin/sync-paikat/route.ts` | High — silently maps Google Places types to Finnish sport slugs; wrong mapping corrupts DB |
| `parseOsoite()` | `app/api/hae-paikat/route.ts`, `app/api/admin/sync-paikat/route.ts` | Medium — string manipulation that could break on unexpected Google address formats |
| API route error paths | `app/api/hae-paikat/route.ts` | High — missing env var, network failure, `REQUEST_DENIED`, Supabase error branches untested |
| `hintateksti()` | `lib/utils.ts` | Medium — 4 null combinations; used in 3 render paths |
| BottomNav active-state flags | `app/components/BottomNav.tsx` | Medium — `isKoti`, `isLista`, `isSuosikit` depend on pathname + searchParam combinations |
| `getInfoWindowStyle()` fallback | `lib/lajit.ts` | Low — simple Record lookup with fallback |
| `cn()` utility | `lib/utils.ts` | Low — standard clsx + tailwind-merge |

**Note:** `detectLaji()` and `parseOsoite()` are duplicated verbatim across both route handlers (`app/api/hae-paikat/route.ts` and `app/api/admin/sync-paikat/route.ts`). Extraction to `lib/` is a prerequisite for testing them once.

## Coverage Gaps — Priority

**High priority (silent logic bugs):**

1. **`suodatettu` filter chain** (`LiikuntapaikatLista.tsx`) — core UX feature. Cases: empty search, null `hinta_min`/`hinta_max`, case-insensitive laji match, all-null prices with active price filter, filter reset.

2. **`detectLaji()`** — pure function with clear inputs/outputs, easy to unit test, high impact if wrong (corrupts Supabase dataset on every sync).

3. **`parseOsoite()`** — string manipulation on Google Places addresses; unexpected formats would silently store malformed addresses.

4. **API route error branches** (`hae-paikat/route.ts`) — all conditional return paths (missing key, 502, 403, `REQUEST_DENIED`, Supabase error) are untested.

**Medium priority:**

5. **`hintateksti()`** — already in `lib/utils.ts`; test all four null combinations: both null, min only, max only, both set.

6. **BottomNav active-state flags** — requires pathname + search param mocking; prevents navigation regression.

**Low priority:**

7. `cn()`, `lajiKonfig` fallback, `getInfoWindowStyle()` — simple enough to verify by inspection.

## Recommended Testing Approach

**Unit testing (pure functions) — add first:**
- Install `vitest` — no DOM required, fast, native TypeScript, works in Next.js projects
- Co-locate test files: `lib/utils.test.ts`, `lib/lajit.test.ts`
- For route handler helpers: extract `detectLaji` and `parseOsoite` from both route files into `lib/places.ts`, then test in `lib/places.test.ts`

**Component testing — add second:**
- `@testing-library/react` with `vitest` and `jsdom`
- Priority: `LiikuntapaikatLista` filter behaviour, `BottomNav` active-state computation

**API route integration testing:**
- `vitest` with `fetch` mocking (`vi.fn()`) and mocked `@supabase/supabase-js`
- Test all error branches in `app/api/hae-paikat/route.ts`

**What NOT to test:**
- Framer Motion animation values — visual regression territory
- Tailwind class output — visual regression territory
- Supabase query shape — covered by TypeScript types

**Minimum viable setup (not yet present):**
```bash
# To add to package.json scripts:
"test":          "vitest run"
"test:watch":    "vitest"
"test:coverage": "vitest run --coverage"
```

**To add to devDependencies:**
```json
"vitest": "^1.x",
"@testing-library/react": "^14.x",
"@testing-library/jest-dom": "^6.x",
"jsdom": "^24.x"
```

---

*Testing analysis: 2026-05-20*
