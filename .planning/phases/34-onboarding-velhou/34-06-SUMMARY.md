---
phase: 34-onboarding-velhou
plan: 06
subsystem: onboarding-wizard-shell
tags: [wizard, suspense, progress-bar, step-routing, framer-motion, i18n]
dependency_graph:
  requires:
    - lib/onboardingUtils.ts (OnboardingDraft type — Plan 01)
    - app/api/business/onboarding/save-step/route.ts (Plan 05)
    - messages/fi.json Business namespace keys (Plan 03)
    - supabase onboarding_draft table + RLS (Plan 02)
  provides:
    - app/business/onboarding/page.tsx (Suspense server wrapper)
    - app/business/onboarding/OnboardingWizardInner.tsx (wizard orchestrator)
    - app/business/onboarding/ProgressBar.tsx (6-step progress indicator)
    - app/business/onboarding/StepPaikka.tsx (Step 1 read-only venue display)
  affects:
    - Plans 34-07, 34-08, 34-09 (steps 2-6 slot into OnboardingWizardInner step-switcher)
tech_stack:
  added: []
  patterns:
    - Suspense wrapper for useSearchParams (Next.js 14 requirement)
    - URL-based step routing via useSearchParams + router.push
    - AnimatePresence mode="wait" step crossfade (opacity only, duration 0.2)
    - framer-motion whileTap={{ scale: 0.95 }} on interactive elements
    - createBrowserSupabase for client-side draft load
    - Glassmorphism .glass card surface for wizard steps and progress bar
key_files:
  created:
    - app/business/onboarding/page.tsx
    - app/business/onboarding/ProgressBar.tsx
    - app/business/onboarding/OnboardingWizardInner.tsx
    - app/business/onboarding/StepPaikka.tsx
  modified: []
decisions:
  - page.tsx is a thin Server Component with no data fetching — Suspense required for useSearchParams in child
  - completedSteps derived from draft.current_step client-side (steps 1..current_step-1)
  - Steps 2-6 return null as stubs in OnboardingWizardInner until Plans 07-09 implement them
  - StepPaikka uses motion.button with disabled prop when paikkaId is null (prevents advancing without a venue)
  - goToStep(draft.current_step) only fires when URL step param is 1 — prevents redirect loop
  - Worktree was 177 commits behind master; merged master before TypeScript check
metrics:
  duration: "~25 minutes"
  completed: "2026-06-10"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 34 Plan 06: Wizard Shell, ProgressBar, and StepPaikka — Summary

6-step onboarding wizard skeleton with Suspense wrapper, URL-based step routing via useSearchParams, glassmorphism ProgressBar with completed/active/future circle states, and Step 1 read-only venue display wired to onboarding_draft draft load.

## What Was Built

### app/business/onboarding/page.tsx

Thin Server Component (no 'use client') wrapping OnboardingWizardInner in a Suspense boundary. The fallback is a centered spinner matching the existing business/page.tsx pattern. Required by Next.js 14 because useSearchParams() is called in the child — without Suspense the build produces a warning and the page renders incorrectly on streaming.

### app/business/onboarding/ProgressBar.tsx

Client component rendering 6 step circles in a `.glass rounded-2xl px-6 py-4 mb-6` container. Circle states:
- Completed: white fill, `border-[rgba(0,0,0,0.12)]`, lucide-react Check icon, cursor-pointer, motion.button with `whileTap={{ scale: 0.95 }}`, onClick calls `onStepClick(n)`.
- Current: `bg-[#111111] text-white`, `aria-current="step"`, step number in `text-[10px] font-bold`.
- Future: white fill, `border-[rgba(0,0,0,0.07)]`, step number in `text-[rgba(17,17,17,0.35)]`, `pointer-events-none`.

Connector lines (`h-px bg-[rgba(0,0,0,0.07)] flex-1 mx-2`) between circles. Step labels below each circle in `text-[10px] font-bold uppercase tracking-widest`. Navigation role set on container.

### app/business/onboarding/OnboardingWizardInner.tsx

Client orchestrator implementing:
1. URL step routing: `const step = parseInt(searchParams.get('step') ?? '1', 10)` + `goToStep(n)` via `router.push`.
2. Mount useEffect: gets current user, resolves paikka_id (URL param fallback to business_paikka_links query), loads onboarding_draft, resumes from `draft.current_step` if user is on step 1, loads liikuntapaikat row for paikkaInfo.
3. completedSteps derived from `Array.from({ length: draft.current_step - 1 }, (_, i) => i + 1)`.
4. Renders ProgressBar + AnimatePresence step crossfade (duration 0.2). Step 1 renders StepPaikka; steps 2-6 return null as stubs.

### app/business/onboarding/StepPaikka.tsx

Read-only Step 1 displaying the linked venue. Shows caps label (`selectedVenueLabel`) above venue name (`text-sm font-bold text-[#111111]`) and address (`text-sm text-[rgba(17,17,17,0.45)]`). Falls back to spinner when `paikkaInfo === null`. Footer has no back button (step 1) and a `motion.button` "Seuraava" CTA disabled when `paikkaId === null`.

## Verification

- `npx tsc --noEmit` — no errors
- All 4 files exist in worktree
- Commits 6b25ed2 and 84cd476 present in git log
- Acceptance criteria met:
  - page.tsx: no 'use client', contains "Suspense" (3 occurrences) and "OnboardingWizardInner" (2)
  - ProgressBar.tsx: 'use client', Check import (2), aria-current (1)
  - OnboardingWizardInner.tsx: 'use client', useSearchParams (2), useRouter (2), onboarding_draft (1), AnimatePresence (3), ProgressBar (2), StepPaikka (2)
  - StepPaikka.tsx: 'use client', onNext (3), nextCta (1)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 6b25ed2 | feat | create onboarding page Suspense wrapper and ProgressBar |
| 84cd476 | feat | create OnboardingWizardInner orchestrator and StepPaikka |

## Deviations from Plan

### Deviation 1 — Worktree merge required (Rule 3: blocking issue)

**Found during:** TypeScript check after Task 1
**Issue:** Worktree branch was 177 commits behind master. `lib/onboardingUtils.ts` (created in Plan 01) was absent from the worktree, causing `Cannot find module '@/lib/onboardingUtils'` TypeScript error.
**Fix:** `git merge master --no-edit` in the worktree — brought in all 177 missing commits including Plans 01-05 outputs. TypeScript then passed cleanly.
**Files modified:** None (merge only, no new code changes).

## Known Stubs

Steps 2-6 in OnboardingWizardInner.tsx return `null` when `step >= 2`. This is intentional — Plans 34-07, 34-08, and 34-09 implement the remaining steps. The wizard renders correctly for step 1 (StepPaikka) and shows only the ProgressBar for steps 2-6 until those plans execute.

## Threat Flags

None. No new network endpoints introduced. Client-side Supabase reads are scoped to the authenticated user's own `onboarding_draft` row via RLS (T-34-06-02 mitigated in Plan 02 migration). paikka_id URL param is treated as a hint only — wizard re-fetches from business_paikka_links (T-34-06-01 accepted).

## Self-Check: PASSED

- app/business/onboarding/page.tsx: FOUND
- app/business/onboarding/ProgressBar.tsx: FOUND
- app/business/onboarding/OnboardingWizardInner.tsx: FOUND
- app/business/onboarding/StepPaikka.tsx: FOUND
- 6b25ed2 (Task 1 commit): FOUND
- 84cd476 (Task 2 commit): FOUND
