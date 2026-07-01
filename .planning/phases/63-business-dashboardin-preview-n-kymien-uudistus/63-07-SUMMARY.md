---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
plan: 07
subsystem: api
tags: [nextjs, supabase, vercel, ssrf, waitUntil, business-onboarding]

requires:
  - phase: 63-business-dashboardin-preview-n-kymien-uudistus
    provides: DiagonaalKortti dashboard variant / edit-or-continue action (Plan 04/05)
provides:
  - Hardened /api/business/analyze-website pipeline (parallel uploads, internal max-duration guard, GET-side staleness self-heal)
  - Wizard's "Analysoi ->" button actually triggers analysis instead of only flipping UI phase
  - Visible failure/retry UI in WaitingForAI instead of a silent 60s timeout back to the same button
  - Fix for a resumed-draft flow silently racing a second background analysis against the user's explicit retry
  - Fix for real-world URLs without an explicit protocol (e.g. "gogo.fi") being rejected as invalid by the SSRF guard
affects: [business-onboarding, branding-analysis]

tech-stack:
  added: []
  patterns:
    - "Promise.race against an internal soft deadline (MAX_ANALYSIS_DURATION_MS) to convert a Vercel waitUntil hard-kill into a controlled failed-status write"
    - "GET-side staleness self-heal: a read endpoint may perform a narrowly-scoped write to unstick a stale in-progress row, guarded by ownership + status filters"

key-files:
  created: []
  modified:
    - app/api/business/analyze-website/route.ts
    - app/business/onboarding/page.tsx
    - lib/branding/ssrfGuard.ts

key-decisions:
  - "Auto-fire of background analysis in handleNimiUrlNext is now guarded by !alreadyHasLocation — resumed draft sessions rely solely on the wizard's explicit 'Analysoi ->' button, since both paths UPSERT the same business_branding row and would otherwise race."
  - "Bare-domain URLs (no protocol) are normalized to https:// server-side in the analyze-website POST handler, rather than only client-side, so the fix covers both the first-time creation flow and the wizard's manual retry flow uniformly, and legacy already-saved draft URLs without a protocol are also covered."
  - "MAX_POLLS reduced 30 -> 20 (40s worst-case) now that the route's 12s staleness self-heal resolves most stuck runs well before the client's own timeout."

patterns-established:
  - "When a fetch-triggering POST returns 400/500, do not assume the client-visible symptom (e.g. 'stuck waiting screen') is caused by the feature just built — check the actual response body first; it can reveal an unrelated, pre-existing data-quality issue (missing URL protocol) instead of a logic bug in the new code."

requirements-completed: [BIZPANEL-07]

coverage:
  - id: D1
    description: "Analysis pipeline uploads run concurrently, writes a controlled 'failed' status within ~8s instead of being silently killed, and the GET handler self-heals any 'analyzing' row older than 12s"
    requirement: BIZPANEL-07
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Wizard's 'Analysoi ->' button actually triggers a POST to /api/business/analyze-website, and a failed/timed-out analysis shows a distinguishable retry screen instead of silently reverting"
    requirement: BIZPANEL-07
    verification:
      - kind: manual_procedural
        ref: "operator UAT re-verification round 2 (after URL normalization fix)"
        status: pass
    human_judgment: true
    rationale: "End-to-end network timing and UI-state behavior requires a human to exercise the live flow against a real (or realistic) target URL."
  - id: D3
    description: "Resuming an existing draft venue and re-triggering analysis no longer hangs or races a silent duplicate background request"
    verification:
      - kind: manual_procedural
        ref: "operator UAT re-verification round 2, specifically the continue-existing-draft path that was broken in round 1"
        status: pass
    human_judgment: true
    rationale: "Distinguishing the new-venue vs resumed-draft code paths and confirming no race requires live operator testing, not just static analysis."
  - id: D4
    description: "Real-world URLs typed without an explicit protocol (e.g. 'gogo.fi') are accepted by the SSRF guard instead of 400ing as invalid"
    verification:
      - kind: manual_procedural
        ref: "operator-reported Network tab payload ({url: \"gogo.fi\", paikka_id: 373}) reproduced the 400, fix confirmed via operator re-test"
        status: pass
    human_judgment: true
    rationale: "Confirmed via the operator's own reported request payload and their subsequent live re-test, not an automated test case."

duration: ~2h (including 2 rounds of UAT-driven follow-up fixes)
completed: 2026-07-02
status: complete
---

# Phase 63 Plan 07: Analysis Pipeline Hardening + Retry Flow Summary

**Fixed the wizard's "Analysoi ->" button to actually start analysis, hardened the pipeline against Vercel's ~10s waitUntil kill with a controlled failure path, fixed a resumed-draft race condition, and fixed real-world bare-domain URLs (no protocol) being rejected outright by the SSRF guard.**

## Performance

- **Duration:** ~2h across the original plan tasks plus 2 rounds of operator-driven follow-up fixes
- **Tasks:** 2 planned auto tasks + 1 checkpoint (originally) + 2 follow-up fix rounds discovered during checkpoint re-verification
- **Files modified:** 3

## Accomplishments
- `runAnalysis` extracted into `runAnalysisPipeline` + a `Promise.race` wrapper against an 8s internal deadline, so the pipeline writes a controlled `'failed'` status instead of being silently killed by Vercel's ~10s `waitUntil` budget
- Logo-candidate and gallery-image uploads parallelized via `Promise.allSettled`, replacing sequential loops (and a shared-counter race in the gallery path)
- GET handler self-heals any `'analyzing'` row older than 12s back to `'failed'`, so no venue can remain stuck indefinitely even if the internal guard never got to write
- `OnboardingWizardPage`'s `handleRunAnalysis` now actually POSTs to `/api/business/analyze-website` (previously only flipped `pagePhase` to `'waiting'` with no request ever firing) — wired to both the wizard's "Analysoi →" button and `WaitingForAI`'s retry button
- `WaitingForAI` shows a distinct failure screen ("Analyysi epäonnistui tai kesti liian kauan.") with "Yritä uudelleen"/"Ohita" instead of silently reverting after `MAX_POLLS` (reduced 30→20, ~40s worst case) is exhausted
- Fixed a race condition where resuming an existing draft venue silently re-fired a second background analysis (via `handleNimiUrlNext`'s auto-trigger) that could clobber the result of the user's explicit "Analysoi →" click
- Fixed bare-domain URLs (e.g. `"gogo.fi"`, no `https://` prefix) being rejected by `isUrlSafe`'s `new URL()` parse as if they were private/invalid — the onboarding URL input has no client-side normalization, so real venue websites entered without a protocol always 400'd

## Task Commits

Original plan tasks:
1. **Task 1: Server pipeline hardening** - `8c4c358` (feat)
2. **Task 2: Client wiring fix — button triggers analysis + retry UI** - `7b3af92` (fix)
2b. **Deviation fix (found during first checkpoint round): resumed-draft race condition** - `b1499ce` (fix)

**Merge to master:** `1c5caa3` (early merge, requested by operator to enable live dev-server testing before checkpoint approval)

Follow-up fix from operator UAT re-verification round 2:
3. **Normalize bare-domain URLs before SSRF/parse validation** - `7ffe320` (fix)

## Files Created/Modified
- `app/api/business/analyze-website/route.ts` - `runAnalysisPipeline` extraction, `Promise.race` deadline guard, `Promise.allSettled` upload parallelization, GET staleness self-heal, URL normalization before validation
- `app/business/onboarding/page.tsx` - `handleRunAnalysis` POST wiring, `WaitingForAI` failed/retry UI, `MAX_POLLS` reconciliation, guarded auto-fire on resumed sessions
- `lib/branding/ssrfGuard.ts` - new `normalizeWebsiteUrl()` helper (prepends `https://` when no protocol is present)

## Decisions Made
- The resumed-draft race condition (Task 2b) was found and fixed *during* the first checkpoint round, before operator re-verification — documented as a plan deviation since it required investigating a code path (`handleNimiUrlNext`'s auto-fire) outside the two originally planned tasks.
- The URL-normalization fix was applied server-side (in the POST handler, before `isUrlSafe`) rather than only client-side, so it uniformly covers the first-time creation flow, the wizard's manual retry flow, and any already-saved legacy draft URL missing a protocol — a client-only fix would have left resumed drafts with old un-normalized saved URLs still broken.

## Deviations from Plan

### Auto-fixed Issues

**1. [Found during first checkpoint round] Resumed-draft flow silently raced a duplicate analysis**
- **Found during:** Operator's first Task 3 checkpoint verification report ("goes to waiting screen but never completes... works for new venue but not continuing existing draft")
- **Issue:** `handleNimiUrlNext`'s AI-trigger block fired unconditionally, including on the fast-forward/resume path. Every reopen of an existing draft's onboarding silently kicked off a second, independent background analysis racing the wizard's explicit "Analysoi →" button — both UPSERT the same `business_branding` row, so `WaitingForAI`'s poll could observe a stale/unrelated result.
- **Fix:** Guarded the auto-fire with `!alreadyHasLocation` so it only runs on genuine first-time entry; resumed sessions rely solely on the wizard's own button.
- **Files modified:** `app/business/onboarding/page.tsx`
- **Verification:** `npx tsc --noEmit` clean, `npm test` 233/233 passing.
- **Committed in:** `b1499ce`

**2. [Found during second checkpoint round, post-merge] Bare-domain URLs 400'd as "Invalid or private URL"**
- **Found during:** Operator's second re-verification round, after merge to master. Network tab showed `POST /api/business/analyze-website` returning 400; operator provided the exact request payload (`{url: "gogo.fi", paikka_id: 373}`), confirming `new URL("gogo.fi")` throws (no scheme) and `isUrlSafe`'s try/catch reported it identically to a genuine private-IP rejection.
- **Fix:** Added `normalizeWebsiteUrl()` to `lib/branding/ssrfGuard.ts` (prepends `https://` when no protocol is present) and applied it in the POST handler before `isUrlSafe` validation and before the value is stored/used in the analysis pipeline.
- **Files modified:** `lib/branding/ssrfGuard.ts`, `app/api/business/analyze-website/route.ts`
- **Verification:** Operator confirmed the analysis flow works for the same `gogo.fi` draft after the fix.
- **Committed in:** `7ffe320`

---

**Total deviations:** 2 auto-fixed, both genuine pre-existing/newly-surfaced bugs blocking the plan's core UAT goal (analysis must complete or fail visibly, never hang).
**Impact on plan:** Both fixes were necessary for BIZPANEL-07's edit/continue path to be usable at all — no scope creep.

## Issues Encountered
- Initial merge to master happened *before* checkpoint approval, at the operator's explicit request (see Plan 06's SUMMARY for the same note — both plans were merged together in the same session).
- The bare-domain URL bug was diagnosed directly from the operator's Network-tab payload rather than guesswork, avoiding a wasted fix cycle.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Analysis pipeline is confirmed working end-to-end by the operator for both the new-venue and resumed-draft paths, including the failure/retry UI.
- `normalizeWebsiteUrl()` in `lib/branding/ssrfGuard.ts` is a general-purpose fix available to any other code path that validates business-supplied URLs.

---
*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Completed: 2026-07-02*
