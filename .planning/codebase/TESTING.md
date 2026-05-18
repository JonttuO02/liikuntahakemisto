# Testing Patterns

**Analysis Date:** 2026-05-19

## Test Framework

**Runner:** None — no test runner is installed or configured.

**Assertion Library:** None.

**Config files present:** None. There is no `jest.config.*`, `vitest.config.*`, or any other test runner configuration file in the project root.

**Test-related devDependencies in `package.json`:** None. The devDependencies are:
- `@types/node`, `@types/react`, `@types/react-dom` — TypeScript types only
- `eslint`, `eslint-config-next` — linting only
- `postcss`, `tailwindcss` — build tooling only
- `typescript` — type checking only

## Test File Coverage

**Application source tests:** Zero. There are no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files anywhere under the project source directories (`app/`, `lib/`, `components/`).

**`__tests__` directories:** None in the project source. The only `__tests__` folders that exist are inside `node_modules/` (third-party packages).

## What Is and Is Not Tested

**Tested:** Nothing in this codebase is tested.

**Untested areas (full list):**

| Area | Files | Risk |
|------|-------|------|
| Data filtering logic | `app/components/LiikuntapaikatLista.tsx` | High — `suodatettu` useMemo combines laji, text search, and price filters; edge cases not exercised |
| Price formatting helper | `app/components/PaikkaKortti.tsx`, `app/components/Etusivu.tsx`, `app/paikat/[id]/page.tsx` | Medium — `hintateksti()` duplicated across three files, null combinations untested |
| Sport type detection | `app/api/hae-paikat/route.ts` | Medium — `detectLaji()` maps Google Places `types[]` to Finnish sport slugs; incorrect mappings would silently corrupt data |
| Address parsing | `app/api/hae-paikat/route.ts` | Medium — `parseOsoite()` applies string manipulation that could break on unexpected Google formats |
| API route happy path and error branches | `app/api/hae-paikat/route.ts` | High — external API error handling (502, 403, 500 paths) untested |
| Weather code parsing | `app/components/Etusivu.tsx` | Low — `parseSaa()` simple range checks |
| Scroll-driven transforms | `app/components/Etusivu.tsx` | Low — animation values, not logic |
| Navigation active-state logic | `app/components/BottomNav.tsx` | Medium — `isKoti`, `isKartta`, `isLista` flags depend on pathname + searchParam combinations |
| Supabase client initialisation | `lib/supabase.ts` | Low — thin wrapper, but missing env vars would panic at runtime |
| `cn()` utility | `lib/utils.ts` | Low — standard clsx + tailwind-merge composition |
| `lajiKonfig` lookup fallback | `lib/lajit.ts` | Low — fallback `?? { label: ..., badgeTw: ..., accentBg: ... }` applied in three components |

## Coverage Gaps — Priority

**High priority (logic bugs would be silent or hard to detect):**

1. **`suodatettu` filter chain** in `app/components/LiikuntapaikatLista.tsx` — the combined laji + search text + price filter useMemo is the core UX feature. Cases to cover: empty search string, null `hinta_min`/`hinta_max`, case-insensitive laji match, filter reset.

2. **`detectLaji()`** and **`parseOsoite()`** in `app/api/hae-paikat/route.ts` — pure functions with clear inputs and outputs, easy to unit test, high impact if wrong (corrupts the Supabase dataset).

3. **API route error paths** in `app/api/hae-paikat/route.ts` — missing `GOOGLE_PLACES_API_KEY`, network failure, Places API non-OK status, `REQUEST_DENIED`, Supabase upsert error. These currently rely entirely on the conditional branching being correct.

**Medium priority:**

4. **`hintateksti()`** — duplicated verbatim in three files (`PaikkaKortti.tsx`, `Etusivu.tsx`, `paikat/[id]/page.tsx`). Should be extracted to `lib/` and tested once for all four cases: both null, min only, max only, both set.

5. **BottomNav active-state flags** — requires URL/pathname mocking but catches navigation regressions.

**Low priority:**

6. `parseSaa()`, `cn()`, `lajiKonfig` fallback — simple enough to verify by inspection.

## Recommended Testing Approach

Given the Next.js 14 App Router architecture, the recommended setup is:

**Unit testing (pure functions):**
- Install `vitest` — works without a DOM, fast, integrates with TypeScript out of the box
- Test `detectLaji`, `parseOsoite`, `hintateksti` (after extraction to `lib/`), `parseSaa`, `cn`
- Place test files co-located as `lib/lajit.test.ts`, `lib/utils.test.ts`, etc.

**API route integration testing:**
- Use `vitest` with `fetch` mocking (`vi.fn()`) to test the `GET` handler in `app/api/hae-paikat/route.ts`
- Mock `@supabase/supabase-js` to avoid real database calls

**Component testing:**
- If component tests are added, use `@testing-library/react` with `vitest` and `jsdom`
- Priority: `LiikuntapaikatLista` filter behaviour, `BottomNav` active-state computation

**What NOT to test:**
- Framer Motion animation values — visual regression territory
- Supabase query shape — integration concern, better handled by type safety
- Tailwind class output — visual regression territory

**Minimum viable test command setup (not yet present):**
```bash
# Would need to be added to package.json:
"test": "vitest run"
"test:watch": "vitest"
"test:coverage": "vitest run --coverage"
```

## Current Quality Gate

The only automated quality check currently configured is `next lint` (ESLint with `next/core-web-vitals` and `next/typescript` rulesets). This provides:
- TypeScript type checking via `tsc --noEmit` (strict mode)
- React hooks rule enforcement
- Next.js-specific rules (no `<img>` without Next Image, etc.)

There is no pre-commit hook, no CI configuration, and no coverage threshold.

---

*Testing analysis: 2026-05-19*
