---
phase: 39-auth-separaatio
plan: "04"
subsystem: auth
tags: [supabase, ssr, cookie-namespace, business-auth, route-migration]
dependency_graph:
  requires:
    - "39-01 (lib/supabase-business.ts — createBusinessBrowserClient + createBusinessServerClient)"
    - "39-02 (middleware path-conditional refresh)"
    - "39-03 (/business/kirjaudu login page)"
  provides:
    - "All /business/* RSC layouts using createBusinessServerClient"
    - "All /business/* client components using createBusinessBrowserClient"
    - "rekisteroidy with business client, no AuthModal, Link to /business/kirjaudu"
  affects:
    - "Phase 40 (CLEAN-01 through CLEAN-05 — cleanup of consumer auth remnants)"
tech_stack:
  added: []
  patterns:
    - "createBusinessServerClient(cookies()) in RSC layouts for sb-biz-* namespace"
    - "createBusinessBrowserClient() singleton in all /business/* client components"
    - "Next.js Link replacing AuthModal sign-in button in rekisteroidy"
key_files:
  created: []
  modified:
    - app/business/[id]/layout.tsx
    - app/business/onboarding/layout.tsx
    - app/business/page.tsx
    - app/business/onboarding/OnboardingWizardInner.tsx
    - app/business/onboarding/StepMediat.tsx
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/onboarding/StepAukioloajat.tsx
    - app/business/onboarding/StepHinnasto.tsx
    - app/business/onboarding/StepEsikatselu.tsx
    - app/business/rekisteroidy/page.tsx
decisions:
  - "All /business/* files now use business client exclusively — no consumer sb-* cookie namespace accessed from business routes"
  - "AuthModal removed from rekisteroidy and replaced with a plain Link to /business/kirjaudu (D-14)"
  - "Redirect target in both RSC layouts changed from / to /business/kirjaudu (D-07)"
  - "lib/supabaseSSR.ts createBrowserSupabase left untouched — consumer routes unaffected"
metrics:
  duration_minutes: 15
  completed: "2026-06-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 10
---

# Phase 39 Plan 04: Business Route Migration to Business Supabase Client Summary

**One-liner:** Migrated all 10 /business/* files from consumer createBrowserSupabase/createServerSupabase to createBusinessBrowserClient/createBusinessServerClient, completely isolating the business auth session to the sb-biz-* cookie namespace.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate RSC layouts to business server client | f94664f | app/business/[id]/layout.tsx, app/business/onboarding/layout.tsx |
| 2 | Migrate 7 client components to business browser client | 6000d69 | page.tsx, OnboardingWizardInner.tsx, StepMediat.tsx, StepYhteystiedot.tsx, StepAukioloajat.tsx, StepHinnasto.tsx, StepEsikatselu.tsx |
| 3 | Migrate rekisteroidy — client swap + AuthModal removal + kirjaudu link | f8b4765 | app/business/rekisteroidy/page.tsx |

## What Was Built

### Task 1 — RSC Layout Migration
Both RSC auth guard layouts (`app/business/[id]/layout.tsx` and `app/business/onboarding/layout.tsx`) were updated with three mechanical substitutions each:
- `createServerSupabase` import replaced with `createBusinessServerClient` from `@/lib/supabase-business`
- `createServerSupabase(cookies())` call replaced with `createBusinessServerClient(cookies())`
- `redirect('/')` replaced with `redirect('/business/kirjaudu')`

Both layouts now guard their routes using the sb-biz-* cookie namespace exclusively.

### Task 2 — Client Component Migration (7 files)
Pure import and call-site renaming across all 7 business client components:
- `import { createBrowserSupabase } from '@/lib/supabaseSSR'` replaced with `import { createBusinessBrowserClient } from '@/lib/supabase-business'`
- All `createBrowserSupabase()` call sites replaced with `createBusinessBrowserClient()`

Files affected: `app/business/page.tsx` (2 call sites), `OnboardingWizardInner.tsx` (3 call sites), `StepMediat.tsx` (3 call sites), `StepYhteystiedot.tsx` (2 call sites), `StepAukioloajat.tsx` (2 call sites), `StepHinnasto.tsx` (2 call sites), `StepEsikatselu.tsx` (1 call site). No logic changes made.

### Task 3 — rekisteroidy Migration + AuthModal Removal
In `app/business/rekisteroidy/page.tsx`:
- Swapped client (2 call sites: detectRecovery and handleSubmit)
- Removed AuthModal import
- Added Link import from next/link
- Removed `const [authModalOpen, setAuthModalOpen] = useState(false)` (dead after modal removal)
- Replaced sign-in button with `<Link href="/business/kirjaudu">` (same styling preserved)
- Removed `<AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />` JSX

## Verification Results

```
grep -r "createBrowserSupabase|createServerSupabase" app/business/  → 0 matches (OK)
grep -r "createBusinessBrowserClient|createBusinessServerClient" app/business/ | wc -l  → 31 matches (OK)
grep "createBrowserSupabase" lib/supabaseSSR.ts  → export function createBrowserSupabase() (OK, consumer definition preserved)
grep -rn session-cookie-client app/api/business/ app/api/admin/  → 0 matches (OK, JWT Bearer unchanged)
npx tsc --noEmit | grep "app/business"  → empty (OK — all modified files compile cleanly)
```

## Deviations from Plan

None — plan executed exactly as written. All three tasks were pure mechanical search-and-replace operations as described.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced.
- T-39-09 (Spoofing — business RSC reading consumer session): Mitigated — both RSC layouts now use createBusinessServerClient, reading only sb-biz-* cookies.
- T-39-10 (Information Disclosure — consumer auth visible to business pages): Mitigated — business client singleton is separate from consumer singleton.
- T-39-11 (Tampering — AuthModal removed without replacement): Mitigated — replaced with explicit Link to /business/kirjaudu.

## Known Stubs

None.

## Self-Check: PASSED

- app/business/[id]/layout.tsx: createBusinessServerClient present, createServerSupabase absent, redirect /business/kirjaudu present — VERIFIED
- app/business/onboarding/layout.tsx: same checks — VERIFIED
- 7 client components: createBrowserSupabase=0, createBusinessBrowserClient>=1 each — VERIFIED
- app/business/rekisteroidy/page.tsx: AuthModal=0, authModalOpen=0, business/kirjaudu=1, createBusinessBrowserClient=3 — VERIFIED
- Commits f94664f, 6000d69, f8b4765: PRESENT
- TypeScript compiles cleanly for all modified files: VERIFIED (empty grep output)
