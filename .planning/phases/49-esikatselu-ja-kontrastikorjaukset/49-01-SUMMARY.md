---
phase: 49
plan: 01
subsystem: business-onboarding-ui
tags: [contrast-fix, presentational-component, bugfix]
dependency_graph:
  requires: []
  provides:
    - "app/components/ContrastSafeLogo.tsx — shared contrast-safe logo display primitive"
  affects:
    - "app/business/onboarding/AnalysoiSivusto.tsx"
tech_stack:
  added: []
  patterns:
    - "Presentational-only wrapper component (no hooks, no branding-aware typing) mirroring DiagonaalKortti's existing rgba(0,0,0,0.06) logo-box tint"
key_files:
  created:
    - app/components/ContrastSafeLogo.tsx
  modified:
    - app/business/onboarding/AnalysoiSivusto.tsx
decisions: []
metrics:
  duration: "~15min"
  completed: "2026-06-17"
---

# Phase 49 Plan 01: Logo Contrast Fix Summary

Fixed PREV-03 — white/transparent-background logo candidates in AnalysoiSivusto's picker were invisible against the white `.glass` card because they rendered as a bare `<img>`. Introduced a shared `ContrastSafeLogo` primitive that wraps every candidate in a fixed `rgba(0,0,0,0.06)` backdrop box (the same tint already used by `DiagonaalKortti`'s logo box), and wired it into the single bug call site.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create the ContrastSafeLogo presentational primitive | 80299f7 | app/components/ContrastSafeLogo.tsx |
| 2 | Wire ContrastSafeLogo into the AnalysoiSivusto logo-candidate picker | cfbe9e3 | app/business/onboarding/AnalysoiSivusto.tsx |
| 3 | Human-verify contrast fix in the logo-candidate picker | — | awaiting human verification (checkpoint:human-verify, gate=blocking) |

## What Was Built

**`app/components/ContrastSafeLogo.tsx`** (new file): a presentational-only React component with props `{ src: string; alt?: string; className?: string }`. Renders an outer `div` (`w-full h-12 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center overflow-hidden`) containing an `<img>` (`h-full w-auto object-contain`). No `'use client'` (no hooks/state), no fallback icon, no animation — matches the UI-SPEC markup contract exactly. The `eslint-disable-next-line @next/next/no-img-element` comment now lives directly above this `<img>`.

**`app/business/onboarding/AnalysoiSivusto.tsx`** (modified): added the import `import ContrastSafeLogo from '@/app/components/ContrastSafeLogo'`, and replaced the bare `<img src={candidate.url} alt="" className="h-12 w-auto object-contain rounded" />` (plus its now-redundant eslint-disable comment) inside the logo-candidate picker's `.map()` button with `<ContrastSafeLogo src={candidate.url} />`. The surrounding `<button>` wrapper, `key`, `type`, `onClick={() => selectLogo(candidate.url)}`, the `isSelected` ring/border conditional classes, the `<span>` showing `candidate.type`, and the empty-state branch are all unchanged — confirmed via `git diff`, which shows only the intended swap (one import line added, one `<img>` block replaced with one `<ContrastSafeLogo>` line).

## Verification

- `npx tsc --noEmit` passes with no new type errors after both tasks.
- `npx next lint --file app/business/onboarding/AnalysoiSivusto.tsx` reports only two pre-existing warnings (`react-hooks/exhaustive-deps` at lines 381 and 443, both unrelated `useEffect` hooks far from the edited block) — no new lint errors introduced.
- `git diff --name-only` confirms `DiagonaalKortti.tsx` and `PaikkaSheet.tsx` are byte-for-byte unchanged, satisfying the plan's out-of-scope constraint (D-03).
- All grep-based automated checks from each task's `<verify>` block passed (backdrop tint, `object-contain`, default export name, import statement, old bare `<img>` className string absent).

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched the UI-SPEC's Component Inventory markup contract and call-site instructions precisely.

## Checkpoint: Task 3 (awaiting human verification)

**Type:** human-verify
**Gate:** blocking

**What was built:** The logo-candidate picker in AnalysoiSivusto's 'preview' phase now wraps every candidate logo in a fixed mid-gray (`rgba(0,0,0,0.06)`) backdrop box via the new shared `ContrastSafeLogo` primitive, so white/transparent-background logos are visibly framed instead of disappearing into the white card.

**How to verify:**
1. Run the dev server: `npm run dev` (from `C:/ClaudeCodeTestit/liikuntahakemisto`).
2. Sign in as a business account and open the onboarding wizard's website-analysis step (`AnalysoiSivusto`), or trigger the `'preview'` phase so the logo-candidate picker renders. If no live analysis result is on hand, point the analyzer at a site whose logo is a white/transparent PNG (or temporarily inspect a candidate with a transparent logo).
3. Confirm: each logo candidate now sits inside a light gray rounded box; a white or transparent-background logo is clearly visible against that gray, not invisible.
4. Confirm the picker still works as before: clicking a candidate still shows the dark selection ring, the small type label under each logo is still there, and the "no logo candidates" empty-state copy (if triggerable) is unchanged.

**Resume signal:** Type "approved" if white/transparent logos are now visible and selection still works, or describe what looks wrong.

This plan cannot be marked fully complete until a human performs the above verification. Tasks 1–2 (the actual code changes) are committed and verified via automated checks; Task 3 requires manual browser confirmation that this executor agent cannot perform.

## Self-Check: PASSED

- FOUND: app/components/ContrastSafeLogo.tsx
- FOUND: app/business/onboarding/AnalysoiSivusto.tsx (modified, diff confirmed)
- FOUND commit 80299f7 (Task 1)
- FOUND commit cfbe9e3 (Task 2)
