---
phase: 22-profiili-ai-kiinnostukset
plan: "03"
subsystem: ai-context
tags: [etusivu, route-handler, kiinnostukset, ai-prompt, security]
dependency_graph:
  requires:
    - 22-01 (lib/buildKiinnostuksetKonteksti.ts)
  provides:
    - app/components/Etusivu.tsx (kiinnostukset state + profiles query + POST body field)
    - app/api/saasuositus/route.ts (kiinnostukset sanitization + prompt extension)
  affects:
    - AI recommendation prompt (now includes user sport interests)
tech_stack:
  added: []
  patterns:
    - Same allowlist regex as suosikit for kiinnostukset sanitization (T-22-03)
    - Leading-space context append pattern (matching buildReissuKonteksti convention)
    - D-13 compliance: kiinnostukset excluded from AI fetch useEffect deps array
key_files:
  created:
    - lib/buildKiinnostuksetKonteksti.ts (cherry-picked from plan 01 commit — worktree did not have it)
  modified:
    - app/components/Etusivu.tsx
    - app/api/saasuositus/route.ts
decisions:
  - "kiinnostukset included unconditionally in POST body (empty array is harmless, handled in route.ts)"
  - "kiinnostukset NOT added to AI fetch useEffect deps array per D-13 (cache key is day-based only)"
  - "lib/buildKiinnostuksetKonteksti.ts cherry-picked to worktree from plan 01 commit (Rule 3 auto-fix)"
metrics:
  duration: "~10 min"
  completed: "2026-05-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 22 Plan 03: Kiinnostukset Data Flow Wire-Up Summary

**One-liner:** Etusivu.tsx loads kiinnostukset from profiles and sends them in POST body; route.ts sanitizes the array with the same allowlist as suosikit and appends buildKiinnostuksetKonteksti output to the AI prompt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend Etusivu.tsx — kiinnostukset state, profiles query, POST body | 1421c87 | app/components/Etusivu.tsx |
| 2 | Extend route.ts — kiinnostukset sanitization and prompt extension | 83c2daf | app/api/saasuositus/route.ts, lib/buildKiinnostuksetKonteksti.ts |

## What Was Built

### Task 1 — Etusivu.tsx

Three targeted changes:

1. **State declaration** — `const [kiinnostukset, setKiinnostukset] = useState<string[]>([])` added after kotikaupunki state.

2. **Profiles query extended** — `.select('kotikaupunki, kiinnostukset')` replaces the previous single-column select. `setKiinnostukset(profileData?.kiinnostukset ?? [])` is called after `setKotikaupunki`. The logged-out else branch adds `setKiinnostukset([])` to reset state on sign-out.

3. **POST body field added** — `kiinnostukset` included unconditionally in the POST JSON body: `{ suosikit: suosikkiNimet, kaupunki: weatherKaupunki, ...(kotikaupunki ? { kotikaupunki } : {}), kiinnostukset }`. The AI fetch useEffect deps array remains `[suosikitSizeAndIds, weatherKaupunki, kotikaupunki]` per D-13 — kiinnostukset intentionally excluded.

### Task 2 — route.ts

Three targeted changes:

1. **Import added** — `import { buildKiinnostuksetKonteksti } from '@/lib/buildKiinnostuksetKonteksti'` after the existing buildReissuKonteksti import.

2. **Sanitization** — `let kiinnostukset: string[] = []` declared before the try block. Inside try, `Array.isArray(body.kiinnostukset)` guard applied with `.slice(0, 10)`, `.filter(string check)`, and `.map(allowlist regex + .slice(0, 80))` — identical to suosikit sanitization, satisfying T-22-03.

3. **Prompt extension** — `const kiinnostuksetKonteksti = buildKiinnostuksetKonteksti(kiinnostukset)` computed after reissuKonteksti; appended as `${reissuKonteksti}${kiinnostuksetKonteksti}` at the end of the prompt string per D-12.

The GET handler is unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing lib/buildKiinnostuksetKonteksti.ts in worktree**
- **Found during:** Task 2 (TypeScript error TS2307 on import)
- **Issue:** The worktree was branched before Plan 01 completed. `lib/buildKiinnostuksetKonteksti.ts` exists only in the main repo (committed at 2f0fe1a in Plan 01). The worktree's `lib/` directory did not contain it.
- **Fix:** Cherry-picked file content from git history (`git show 2f0fe1a:lib/buildKiinnostuksetKonteksti.ts`) and wrote it to the worktree. Committed alongside route.ts changes.
- **Files modified:** lib/buildKiinnostuksetKonteksti.ts (created)
- **Commit:** 83c2daf

## Known Stubs

None — both files are complete implementations with no placeholder logic.

## Threat Flags

No new security-relevant surface introduced. Threat T-22-03 (POST body.kiinnostukset tampering) is mitigated: the same allowlist regex `[^\w\sÄäÖöÅå\-,.'()&]` as suosikit is applied, plus `.slice(0,10)` on the array and `.slice(0,80)` per element. No PII injected into prompt (T-22-04 accepted).

## Self-Check: PASSED

- [x] `app/components/Etusivu.tsx` — `useState<string[]>([])` for kiinnostukset: line 182 FOUND
- [x] `app/components/Etusivu.tsx` — profiles query uses `.select('kotikaupunki, kiinnostukset')`: line 306 FOUND
- [x] `app/components/Etusivu.tsx` — `setKiinnostukset(profileData?.kiinnostukset ?? [])`: line 308 FOUND
- [x] `app/components/Etusivu.tsx` — `setKiinnostukset([])` in else branch: line 312 FOUND
- [x] `app/components/Etusivu.tsx` — `kiinnostukset` in POST body JSON: line 351 FOUND
- [x] `app/components/Etusivu.tsx` — deps array `[suosikitSizeAndIds, weatherKaupunki, kotikaupunki]` (kiinnostukset absent): line 365 FOUND
- [x] `app/api/saasuositus/route.ts` — import buildKiinnostuksetKonteksti: line 5 FOUND
- [x] `app/api/saasuositus/route.ts` — `let kiinnostukset: string[] = []`: line 87 FOUND
- [x] `app/api/saasuositus/route.ts` — `Array.isArray(body.kiinnostukset)` guard: line 105 FOUND
- [x] `app/api/saasuositus/route.ts` — `kiinnostuksetKonteksti` in prompt: line 123 FOUND
- [x] `lib/buildKiinnostuksetKonteksti.ts` exists in worktree: FOUND
- [x] `tsc --noEmit` exits with 0: PASSED
- [x] Commit 1421c87 exists: FOUND
- [x] Commit 83c2daf exists: FOUND
