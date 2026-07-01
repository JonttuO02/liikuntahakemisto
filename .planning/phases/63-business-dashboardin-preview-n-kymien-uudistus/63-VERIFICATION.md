---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
verified: 2026-07-01T22:23:31Z
status: passed
score: 14/14 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/9
  gaps_closed:
    - "Controls panel is always visibly two-sided (split layout), even when brandColor is unset — falls back to neutral gray instead of near-invisible .glass (63-UAT gap 1, closed by 63-06)"
    - "Copy-invite-link icon button gives visible confirmation (Check icon) that the link was copied, and only reports success on a genuinely resolved clipboard write (63-UAT gap 2, closed by 63-06)"
    - "Editing a draft venue and re-triggering brand-color analysis completes or fails visibly within a bounded time, instead of hanging forever (63-UAT gap 3, blocker, closed by 63-07)"
    - "Business dashboard is usable on desktop/wide viewports — cards keep a fixed width instead of stretching (63-UAT gap 4, closed by 63-06)"
  gaps_remaining: []
  regressions: []
---

# Phase 63: Business-dashboardin & preview-näkymien uudistus Verification Report

**Phase Goal:** `/business`-dashboard on uudistettu DiagonaalKortti-korteilla ja ikonipainikkeilla, ja kaikki preview-näkymät käyttävät CalloutCardia, sisältävät venuepagen ja ovat puhtaasti visuaalisia
**Verified:** 2026-07-01 (this run; supersedes the initial 2026-07-01T18:35 verification)
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 63-06, 63-07) and operator UAT re-verification

## Goal Achievement

This is the phase's **second** verification pass. The first pass (initial 63-VERIFICATION.md, now overwritten) scored all 9 derived truths VERIFIED at the code level but returned `human_needed` because visual/interactive behavior required a live human pass. That human pass happened: `63-UAT.md` records 5 conversational UAT tests against the running app, with Test 1 (visual correctness) returning `issue` with four specific, detailed operator-reported gaps (panel fallback color, dead-looking copy button, a blocker-severity stuck "analyzing" bug on draft edit, and desktop card stretching) and Tests 2-5 returning `pass`. Gap-closure plans 63-06 and 63-07 were built and executed against those four gaps, going through multiple additional rounds of operator-driven re-verification documented in each plan's SUMMARY.md coverage section (specific, non-generic details — a `gogo.fi` URL 400 repro, a `396px` DevTools measurement, a `website_url` NOT NULL Postgres error — that are strong evidence of genuine live testing, not a fabricated self-report). This pass independently re-verified, by direct code inspection (not by trusting SUMMARY prose), that every one of those follow-up fixes is actually present and correctly wired in the current codebase.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `/business`-dashboardin paikkalista on korvattu DiagonaalKortti-korteilla, status-pillit kuvan alakulmassa (ROADMAP SC1, BIZPANEL-06) | ✓ VERIFIED | `app/business/page.tsx:277` renders `<DashboardVenueCard>` → `<DiagonaalKortti dashboardActions={...}>` for every `venueLinks` entry. Status pill (`absolute bottom-3 right-3 z-20`, `DiagonaalKortti.tsx:335-355`) sits inside the card's photo/controls half. No `VenueRow`/legacy status-list component remains (`grep VenueRow app/` → 0 hits). |
| 2 | Hover (desktop)/tap (mobiili) paljastaa ikonipainikkeet, ei tekstipainikkeita (ROADMAP SC2, BIZPANEL-07) | ✓ VERIFIED (documented deviation) | Icon-only buttons (Eye/Pencil/Link2-or-Check/AlertCircle, `DiagonaalKortti.tsx:245-286`) with `aria-label`s, no text labels. **Deviation from literal ROADMAP wording**, unchanged from initial pass: the panel is *permanently visible*, not hover/tap-revealed — decision D-01, recorded in `63-CONTEXT.md`/`63-RESEARCH.md` and re-confirmed by 63-UAT Test 2 passing exactly this behavior with the operator's explicit approval. |
| 3 | Business-paikkalistan preview-modaali käyttää CalloutCardia, ei PaikkaKorttia (ROADMAP SC3, PREV-04) | ✓ VERIFIED | `app/components/PreviewModal.tsx` imports and renders `CalloutCard`; `grep PaikkaKortti app/components/PreviewModal.tsx` → 0 hits. |
| 4 | Edit/onboarding-live-preview sisältää venuepagen (PaikkaSheet) CalloutCardin ja DiagonaalKortin lisäksi (ROADMAP SC3, LIVEPREV-05) | ✓ VERIFIED | `app/business/onboarding/LivePreviewPane.tsx` renders 3 stacked sections: `CalloutCard` (line 42), `DiagonaalKortti` (line 57, no `dashboardActions` — real photo per D-14), `PaikkaSheet` with `preview={true}` (line 64). |
| 5 | Kaikki preview-näkymät ovat puhtaasti visuaalisia — klikkaus ei laukaise navigointia (ROADMAP SC4, PREV-05) | ✓ VERIFIED | `PaikkaSheet.tsx`: close/bookmark/drag/booking-link/show-on-map all gated on `!preview` (lines 82, 98, 101, 247, 267). `CalloutCard.tsx` has zero `onClick`/`href`/`Link` (grep confirms). Confirmed by 63-UAT Test 4 (pass): "PreviewModal, LivePreviewPane, and onboarding preview surfaces are purely visual." |
| 6 | Gap-closure: dashboard controls panel is always visibly two-sided (neutral-gray fallback) even when `brandColor` is unset — not the near-invisible `.glass` class (63-UAT gap 1, cosmetic) | ✓ VERIFIED | `DiagonaalKortti.tsx:241` — `` `w-full h-full flex items-center justify-center${panelShade ? '' : ' bg-[rgba(0,0,0,0.06)]'}` `` replaces the old `.glass` fallback with the same neutral gray used by the no-photo image placeholder (line 308). `grep -c "bg-\[rgba(0,0,0,0.06)\]"` → 3 (logo slot, no-photo placeholder, new controls-panel fallback), matching 63-06's own acceptance criterion. |
| 7 | Gap-closure: copy-invite-link gives a genuine visible confirmation (icon swap), only after a real successful clipboard write (63-UAT gap 2, minor) | ✓ VERIFIED | `DiagonaalKortti.tsx:272`: `{dashboardActions.copied ? <Check .../> : <Link2 .../>}`. `app/business/page.tsx:104-113`: `handleCopyInviteLink` is `async`, `await`s `navigator.clipboard.writeText`, only calls `setCopied(true)` inside the `try` on success, empty `catch` — no false-positive confirmation on failure. |
| 8 | Gap-closure: `/business` is usable on desktop/wide viewports — cards keep a fixed width instead of stretching full-width (63-UAT gap 4, minor) | ✓ VERIFIED | `app/business/page.tsx:251,274,276`: content wrapped in `max-w-5xl mx-auto`; venue-list wrapper is `flex flex-wrap gap-3` with each card in a `w-full sm:w-[396px]` fixed-width wrapper div (upgraded beyond the original plan's CSS-grid approach after operator DevTools measurement — documented deviation in 63-06 SUMMARY, verified present in code). `DiagonaalKortti.tsx:106` root has `min-w-0` to prevent grid/flex blowout. |
| 9 | Gap-closure: editing a draft venue and re-triggering brand-color analysis completes or fails visibly within a bounded time — no venue can be stuck at `status='analyzing'` forever (63-UAT gap 3, **blocker**) | ✓ VERIFIED | `app/api/business/analyze-website/route.ts`: `runAnalysis` extracted into `runAnalysisPipeline`, wrapped in `Promise.race` against an 8s `MAX_ANALYSIS_DURATION_MS` deadline (`grep -c "Promise.race"` → 1); logo/gallery uploads parallelized via `Promise.allSettled` (`grep -c` → 2); GET handler self-heals any `analyzing` row older than `STALE_ANALYZING_MS` (12s) back to `failed`, scoped by ownership + status filter. `app/business/onboarding/page.tsx`: `handleRunAnalysis` (line ~338+) actually `POST`s to `/api/business/analyze-website` before entering `waiting` phase, replacing the old no-op `() => setPagePhase('waiting')`; wired via `onRunAnalysis={handleRunAnalysis}` (`grep` confirms). `WaitingForAI` (lines 128-236) now has a `failed` state distinct from silent `onSkip()`, with "Yritä uudelleen"/"Ohita" buttons; `MAX_POLLS` reduced 30→20. |
| 10 | Gap-closure follow-up: brand colors chosen during onboarding actually reach the dashboard card and PreviewModal (found + fixed during 63-06 checkpoint re-verification, not originally scoped but load-bearing for BIZPANEL-06) | ✓ VERIFIED | `app/business/page.tsx:195-206` fetches `business_branding.selected_background_color/selected_accent_color` per venue and forwards as `brandColor`/`accentColor` props into `DashboardVenueCard` → `DiagonaalKortti`, and into `PreviewModal` (`app/components/PreviewModal.tsx:60-70` forwards to both `CalloutCard` and `DiagonaalKortti`). Underlying `/api/business/branding` PATCH endpoint changed from `.upsert()` (which unconditionally 500'd on the `website_url` NOT NULL constraint) to a scoped `.update()` (`app/api/business/branding/route.ts:168`). |
| 11 | Gap-closure follow-up: resumed-draft onboarding no longer silently races a duplicate background analysis against the user's explicit retry, and bare-domain URLs (no `https://` prefix) are accepted instead of 400ing (found + fixed during 63-07 checkpoint re-verification) | ✓ VERIFIED | `app/business/onboarding/page.tsx:333` — auto-fire guarded by `!alreadyHasLocation && !aiTriggered`, with an explanatory comment referencing the race this fixes. `lib/branding/ssrfGuard.ts:15` exports `normalizeWebsiteUrl()` (prepends `https://` when no protocol present), applied server-side in the analyze-website POST handler before `isUrlSafe` validation. |
| 12 | Server-side auto-resubmit: saving a rejected venue's section flips `claim_status` rejected→pending and clears `rejection_reason` (D-07, backs PREV-05) | ✓ VERIFIED | `app/api/business/update-paikka/route.ts:179-196` — flip branch gated on server-derived `linkRow.claim_status === 'rejected'`, concurrency-guarded. `tests/api/update-paikka.test.ts` has 3 dedicated passing tests. Confirmed by 63-UAT Test 5 (pass). |
| 13 | `getPanelShade(brandColor)` exists and is never equal to `brandColor`; `darkenHex`/`lightenHex` centralized (BIZPANEL-06 foundation) | ✓ VERIFIED | `lib/branding/brandingResult.ts` exports all three; `CalloutCard.tsx` imports them instead of private copies. 25 unit tests pass. |
| 14 | Rejected-status card exposes a rejection-info icon button opening `RejectionReasonPopup`, whose CTA navigates (never fetches) | ✓ VERIFIED | `DiagonaalKortti.tsx:275-285` renders `AlertCircle` button when `dashboardActions.onShowRejectionInfo` is set. `RejectionReasonPopup.tsx` CTA is a plain `<a href={editHref}>` — no `fetch`. Confirmed by 63-UAT Test 3 (pass). |

**Score:** 14/14 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/DiagonaalKortti.tsx` | dashboard controls panel, neutral-gray fallback, Check-icon copy state, `min-w-0` | ✓ VERIFIED | All present, confirmed via full read |
| `app/business/page.tsx` | `DashboardVenueCard`, fixed-width flex-wrap grid, `business_branding` color fetch, awaited clipboard write | ✓ VERIFIED | All present, confirmed via full read |
| `app/components/PreviewModal.tsx` | CalloutCard (not PaikkaKortti), forwards `brandColor`/`accentColor` | ✓ VERIFIED | Confirmed |
| `app/business/onboarding/LivePreviewPane.tsx` | 3-section stack incl. `PaikkaSheet` | ✓ VERIFIED | Confirmed |
| `app/api/business/analyze-website/route.ts` | `runAnalysisPipeline`, `Promise.race`, `Promise.allSettled` x2, staleness self-heal | ✓ VERIFIED | All acceptance-criteria greps match plan values exactly |
| `app/business/onboarding/page.tsx` | `handleRunAnalysis`, `onRetry` wiring, `MAX_POLLS = 20`, resumed-draft race guard | ✓ VERIFIED | All acceptance-criteria greps match plan values exactly |
| `lib/branding/ssrfGuard.ts` | `normalizeWebsiteUrl()` | ✓ VERIFIED | Present, applied before `isUrlSafe` |
| `app/api/business/branding/route.ts` | `.upsert()` → scoped `.update()` | ✓ VERIFIED | Confirmed at line 168 |
| `lib/branding/brandingResult.ts` | `getPanelShade`, `darkenHex`, `lightenHex` | ✓ VERIFIED | 25 tests pass |
| `tests/api/update-paikka.test.ts` | flip/no-op/security cases | ✓ VERIFIED | 3 named tests, passing |
| `app/components/RejectionReasonPopup.tsx` | correct props, plain `<a>` CTA | ✓ VERIFIED | Confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/business/page.tsx` (`DashboardVenueCard`) | `DiagonaalKortti.tsx` | `dashboardActions` prop bundle incl. `copied` | ✓ WIRED | `copied` state flows from `handleCopyInviteLink` into the icon-swap render |
| `app/business/page.tsx` | `business_branding` table | `.select('paikka_id, selected_background_color, selected_accent_color')` | ✓ WIRED | Populates `brandingByPaikkaId`, forwarded to card + `PreviewModal` |
| `app/business/onboarding/page.tsx` (`WizardInner`'s "Analysoi →") | `/api/business/analyze-website` POST | `handleRunAnalysis` | ✓ WIRED | `onRunAnalysis={handleRunAnalysis}` replaces the old no-op |
| `WaitingForAI` | `/api/business/analyze-website` GET | poll loop reading `status` | ✓ WIRED | `failed` state now driven by both explicit `status==='failed'` and poll exhaustion; retry re-invokes `onRetry` → `handleRunAnalysis` |
| GET `/api/business/analyze-website` | `business_branding` table | staleness self-heal `UPDATE`, scoped by `business_account_id`+`paikka_id`+`status='analyzing'` | ✓ WIRED | Confirmed in code; ownership-scoped, matches STRIDE mitigation in 63-07's threat model |
| `app/business/WizardInner.tsx` (`handleBrandingPickNext`) | `/api/business/branding` PATCH | color persistence on wizard advance | ✓ WIRED | Persists AI-default color even without explicit swatch re-click |
| `update-paikka/route.ts` | `business_paikka_links` table | Supabase `.update()` with concurrency guard | ✓ WIRED | Exercised by 3 passing unit tests |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full workspace test suite (single run) | `npx vitest run` | 21 files, 233 tests, all pass | ✓ PASS |
| Full project TypeScript compile | `npx tsc --noEmit` | no output / exit 0 | ✓ PASS |
| Gap-closure acceptance-criteria greps (63-06) | `grep -c` for `bg-[rgba(0,0,0,0.06)]`(3), `<Check `(1), `min-w-0`(3), `max-w-5xl mx-auto`(1), `async function handleCopyInviteLink`(1) | all match plan-specified counts exactly | ✓ PASS |
| Gap-closure acceptance-criteria greps (63-07) | `grep -c` for `Promise.allSettled`(2), `Promise.race`(1), `STALE_ANALYZING_MS`(≥2, actual 3), `MAX_ANALYSIS_DURATION_MS`(≥2, actual 4), `runAnalysisPipeline`(≥2, actual 3), `async function handleRunAnalysis`(1), `onRunAnalysis={handleRunAnalysis}`(1), `onRetry`(≥3, actual 4), `MAX_POLLS = 20`(1) | all match/exceed plan-specified counts | ✓ PASS |
| SSRF hardening scope check | `git log -- lib/branding/ssrfGuard.ts` | Phase 63's only commit to this file (`7ffe320`) adds `normalizeWebsiteUrl()`; the exact-match-only loopback/link-local check (CR-03, 63-REVIEW.md) predates Phase 63 (introduced Phase 47, hardened Phase 47) | ℹ️ confirms CR-03 is pre-existing, not a Phase 63 regression |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BIZPANEL-06 | 63-04, 63-05, 63-06 | DiagonaalKortti dashboard cards with status pill in image corner, always visibly two-sided, fixed-width on desktop | ✓ SATISFIED | Truths 1, 6, 8, 10, 13, 14 |
| BIZPANEL-07 | 63-01, 63-04, 63-05, 63-06, 63-07 | Icon-button controls panel, no text buttons, copy-link confirmation, edit/continue path leads somewhere usable | ✓ SATISFIED | Truths 2, 7, 9, 11 |
| PREV-04 | 63-02 | PreviewModal uses CalloutCard, not PaikkaKortti | ✓ SATISFIED | Truth 3 |
| LIVEPREV-05 | 63-02 | Live preview includes PaikkaSheet (venuepage) | ✓ SATISFIED | Truth 4 |
| PREV-05 | 63-02, 63-03 | All previews purely visual, no navigation/side-effects | ✓ SATISFIED | Truths 5, 12 |

**Note on REQUIREMENTS.md staleness (unchanged from initial pass):** `.planning/REQUIREMENTS.md` still shows `BIZPANEL-06`, `PREV-04`, and `LIVEPREV-05` as unchecked (`[ ]`) and its Traceability table lists them as "Pending". Codebase evidence above shows all 5 requirements are implemented, wired, and — per `63-UAT.md` — human-tested. This is a documentation lag in REQUIREMENTS.md, not a code gap. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/business/update-paikka/route.ts` | 67-70, 86-90, 150-155 | CR-01 (63-REVIEW.md): `mediat`/`hinnasto`/`sijainti` sections silently null-out any field omitted from the request body | ⚠️ Warning (out of phase-63 scope) | Pre-existing pattern in a file phase-63 modified for D-07; not introduced by this phase's diff. Unresolved, no follow-up fix commit. Recommend tracking as a follow-up. |
| `app/api/business/update-paikka/route.ts` | 117-134 | CR-02 (63-REVIEW.md): `varauslinkki` can never be cleared once set | ⚠️ Warning (out of phase-63 scope) | Same as above, pre-existing, unresolved. |
| `lib/branding/ssrfGuard.ts` | 60-72 | CR-03 (63-REVIEW.md Pass 2): loopback/link-local blocklist matches single exact IPs, not full `/8`/`/16` ranges | ⚠️ Warning (pre-existing, predates Phase 63 — confirmed via `git log`, introduced/hardened in Phase 47) | Real SSRF gap in a security-sensitive file phase 63 touched (only to add `normalizeWebsiteUrl`), but the vulnerable logic itself was not authored or modified by phase 63. Recommend a follow-up security fix regardless of phase attribution. |
| `app/business/onboarding/page.tsx` | 361-363 | CR-04 (63-REVIEW.md Pass 2): website URL silently wiped on back-navigation to URL step | ⚠️ Warning (out of phase-63 scope) | Root cause is in `StepNimiJaURL.tsx`, not modified by phases 63-06/63-07. Not one of 63-07's own must-haves. |
| `app/business/onboarding/page.tsx` | 250, 333 | CR-05 (63-REVIEW.md Pass 2): `aiTriggered` guard never resets for a corrected URL | ⚠️ Warning (out of phase-63 scope) | Related to but distinct from the race condition 63-07 did fix (`!alreadyHasLocation` guard); this specific one-shot-boolean issue remains. |
| `app/components/RejectionReasonPopup.tsx` | 75 | WR-06 (63-REVIEW.md): close button `aria-label` reuses `previewClose` ("Close preview") instead of a dialog-specific label | ℹ️ Info | Accessibility polish item, not a functional bug; 63-UAT Test 3 passed the functional dismiss behavior. |
| `app/components/DiagonaalKortti.tsx` | 367 | WR-05 (63-REVIEW.md): `onToggleTodo` button has no `!dashboardActions` guard, unlike the adjacent `MapPin` button | ℹ️ Info | No current call site passes both props together (confirmed via grep across `app/`) — latent, not currently exploitable. |

No debt markers (`TBD`/`FIXME`/`XXX`) found in any file modified by this phase (checked all 14 files touched across plans 01-07).

### Human Verification Required

None outstanding. All items from the initial verification's human-verification list have since been exercised by a human operator, recorded in `63-UAT.md` (5 conversational tests: 4 pass, 1 issue with 4 sub-gaps) and in the gap-closure plans' SUMMARY coverage sections (multiple additional rounds of operator re-verification for 63-06/63-07's fixes, each citing specific, non-generic operator-provided details — a `396px` DevTools measurement, a `gogo.fi` URL 400 repro, a `website_url` NOT NULL Postgres error — that corroborate genuine live testing occurred). This verification pass independently confirmed, via direct code inspection rather than trusting that narrative, that every fix those UAT rounds required is actually present and correctly wired in the current codebase.

### Gaps Summary

No gaps found. All 14 derived observable truths — covering all 5 phase requirements (BIZPANEL-06, BIZPANEL-07, PREV-04, LIVEPREV-05, PREV-05) plus the 4 UAT-discovered gaps closed by plans 63-06/63-07 plus the 3 follow-up cross-cutting fixes discovered during those plans' checkpoint re-verification — are verified in the codebase with passing automated tests (233/233), a clean TypeScript compile, exact-match acceptance-criteria greps against both gap-closure plans' specifications, and direct code inspection of every modified file (14 files across plans 01-07).

Five pre-existing/carried-forward Warning-level code-review findings (CR-01, CR-02, CR-03, CR-04, CR-05 in `63-REVIEW.md`) remain unresolved and are surfaced here for tracking, not as phase-63 blockers — all five predate this phase's own goal and success criteria, confirmed via `git log` file history where relevant (CR-03 specifically: the vulnerable loopback/link-local check was introduced in Phase 47, not touched by Phase 63's `normalizeWebsiteUrl()` addition).

Overall status is `passed`. Unlike the initial verification pass (which returned `human_needed` because the dashboard's visual/interactive behavior had not yet been exercised by a human), this pass has documented evidence (`63-UAT.md` plus SUMMARY coverage sections) that the human walkthrough happened, found real issues, and those issues were closed by plans 63-06/63-07 — independently re-confirmed here at the code level.

---

_Verified: 2026-07-01 (re-verification, supersedes initial pass)_
_Verifier: Claude (gsd-verifier)_
