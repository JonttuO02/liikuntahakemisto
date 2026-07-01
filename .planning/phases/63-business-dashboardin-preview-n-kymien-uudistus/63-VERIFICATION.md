---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
verified: 2026-07-01T18:35:00Z
status: human_needed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open /business as a business account with an approved, a pending, a rejected, and a 'kesken' (draft) venue. Confirm each DiagonaalKortti dashboard card shows the correct status pill (Kesken/Odottaa hyväksyntää/Hyväksytty/Hylätty) in the image-side bottom corner, and that the controls-panel background is a visibly different shade from the left brand-colored panel when the venue has a brandColor set."
    expected: "Status pill text/color matches claim_status; controls panel background is getPanelShade(brandColor), clearly distinguishable from the left panel's brandColor background; falls back to plain glass panel when brandColor is unset."
    why_human: "Visual color-contrast and layout correctness (D-03/D-04) cannot be confirmed by grep/tsc — requires eyes on the rendered page with real brand colors."
  - test: "On the /business dashboard, click each icon button (preview/edit-or-continue/copy-invite-link/rejection-info) on cards of different statuses; also click the card's left info panel (name/price area)."
    expected: "Icon buttons trigger their respective action (open PreviewModal / navigate to edit or onboarding / copy link to clipboard / open RejectionReasonPopup); clicking anywhere on the left info panel does nothing (D-10, no click-catcher)."
    why_human: "Click-through behavior and the deliberate 'no hover/tap reveal, permanently visible controls' design (D-01, a documented discuss-phase decision that intentionally diverges from ROADMAP.md's literal 'hover/tap reveals' wording) requires interactive confirmation in a live browser."
  - test: "Open the RejectionReasonPopup from a rejected card: verify backdrop click, Escape key, and the close (X) button all dismiss it without navigating, and that the 'Korjaa tiedot' CTA navigates to /business/{paikka_id}."
    expected: "Popup opens with the correct venue's rejection_reason text (escaped, no HTML injection); dismiss affordances only close; CTA navigates once, to the right paikka_id."
    why_human: "Dialog interaction/dismiss/navigation behavior requires manual click-through (per 63-04/63-05 SUMMARY rationale); also note WR-06 (63-REVIEW.md) — the close button's aria-label reads 'Sulje esikatselu' ('Close preview'), a copy-paste leftover from PreviewModal, not a functional bug but a screen-reader mislabel worth confirming/fixing."
  - test: "Open the business preview modal (PreviewModal) and the onboarding/edit LivePreviewPane; click every visible element (CalloutCard, DiagonaalKortti, PaikkaSheet's image carousel, any buttons) and confirm nothing navigates away or triggers a network request."
    expected: "All three preview surfaces (PreviewModal, LivePreviewPane, onboarding) are purely visual — no navigation, no fetch calls, regardless of what is clicked."
    why_human: "Full click-audit across three surfaces and both desktop/mobile contexts requires manual interaction; grep confirms the code paths are gated (!preview, no onClick/href in CalloutCard) but not every possible click target."
  - test: "Save any section (e.g. hinnasto) of a previously-rejected venue via its edit form and observe the dashboard afterward."
    expected: "Venue's status flips from Hylätty to Odottaa hyväksyntää (pending) immediately after the save succeeds, with no separate 'Hae uudelleen' step."
    why_human: "End-to-end confirmation of the auto-resubmit UX (D-07) requires a real save through the running app/database; unit tests (tests/api/update-paikka.test.ts) confirm the server-side flip logic in isolation but not the full user-visible flow."
---

# Phase 63: Business-dashboardin & preview-näkymien uudistus Verification Report

**Phase Goal:** `/business`-dashboard on uudistettu DiagonaalKortti-korteilla ja ikonipainikkeilla, ja kaikki preview-näkymät käyttävät CalloutCardia, sisältävät venuepagen ja ovat puhtaasti visuaalisia
**Verified:** 2026-07-01
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `/business`-dashboardin paikkalista on korvattu DiagonaalKortti-korteilla, status-pillit kuvan alakulmassa (ROADMAP SC1, BIZPANEL-06) | ✓ VERIFIED | `app/business/page.tsx` renders `<DashboardVenueCard>` → `<DiagonaalKortti dashboardActions={...}>` for every `venueLinks` entry (lines 238-246). `VenueRow`/`StatusCard`-with-reapply no longer exists (`grep VenueRow` → 0 hits). Status pill (`absolute bottom-3 right-3 z-20`, `DiagonaalKortti.tsx:335-355`) sits inside the card's photo/controls half. |
| 2 | Hover (desktop)/tap (mobiili) paljastaa ikonipainikkeet, ei tekstipainikkeita (ROADMAP SC2, BIZPANEL-07) | ✓ VERIFIED (documented deviation) | Icon-only buttons (Eye/Pencil/Link2/AlertCircle, `DiagonaalKortti.tsx:245-285`) with `aria-label`s, no text labels. **Deviation from literal ROADMAP wording:** the panel is *permanently visible*, not hover/tap-revealed — this is decision **D-01**, explicitly made during `/gsd:discuss-phase 63` and recorded in `63-CONTEXT.md:18-19` and `63-RESEARCH.md:12-13` ("Drop the hover/tap reveal animation entirely... permanently replaced"). Functional intent (icon buttons, no text buttons) is fully met; only the reveal *mechanic* changed, by deliberate, documented human-approved decision, not omission. |
| 3 | Business-paikkalistan preview-modaali käyttää CalloutCardia, ei PaikkaKorttia (ROADMAP SC3, PREV-04) | ✓ VERIFIED | `app/components/PreviewModal.tsx` imports `CalloutCard` (line 6), no `PaikkaKortti` import or usage anywhere in the file (`grep PaikkaKortti` → 0 hits). Stack order: CalloutCard → DiagonaalKortti → PaikkaSheet (lines 47-81), matching D-11. |
| 4 | Edit/onboarding-live-preview sisältää venuepagen (PaikkaSheet) CalloutCardin ja DiagonaalKortin lisäksi (ROADMAP SC3, LIVEPREV-05) | ✓ VERIFIED | `app/business/onboarding/LivePreviewPane.tsx` renders 3 sections: CalloutCard (38-51), DiagonaalKortti (53-58, no `dashboardActions` — keeps real photo per D-14), PaikkaSheet with `preview={true}` (60-71). |
| 5 | Kaikki preview-näkymät ovat puhtaasti visuaalisia — klikkaus ei laukaise navigointia (ROADMAP SC4, PREV-05) | ✓ VERIFIED | `PaikkaSheet.tsx`: booking-link gated `isSafeUrl(paikka.varauslinkki) && !preview` (line 247); close/bookmark/drag/show-on-map all gated on `!preview` (lines 98, 101, 82, 267). `CalloutCard.tsx` has zero `onClick`/`href`/`Link` (grep confirms). `DiagonaalKortti` used in preview surfaces receives no `onOpen`/`onShowMap`/`onToggleTodo`, so its default click-catcher is a no-op `<div>` (line 331-333). |
| 6 | Server-side auto-resubmit: saving a rejected venue's section flips `claim_status` rejected→pending and clears `rejection_reason` (D-07, backs PREV-05) | ✓ VERIFIED | `app/api/business/update-paikka/route.ts:179-196` — flip branch gated on `linkRow.claim_status === 'rejected'` (server-derived, never from request body), concurrency-guarded with `.eq('claim_status', 'rejected')`. `tests/api/update-paikka.test.ts` has 3 dedicated tests (`flips claim_status...`, `does NOT flip... approved`, `ignores a client-supplied body claim_status field`) — all pass (see Behavioral Spot-Checks). |
| 7 | `getPanelShade(brandColor)` exists and is never equal to `brandColor`; `darkenHex`/`lightenHex` centralized (BIZPANEL-06 foundation) | ✓ VERIFIED | `lib/branding/brandingResult.ts` exports `getPanelShade`, `darkenHex`, `lightenHex` (lines 95, 109, 132). `CalloutCard.tsx` imports them (`import { getContrastColor, darkenHex, lightenHex } from '@/lib/branding/brandingResult'`) instead of declaring private copies. 25 unit tests in `brandingResult.test.ts` pass. |
| 8 | Dashboard variant's left info panel is fully inert — no click-catcher, no onClick (D-10) | ✓ VERIFIED | `DiagonaalKortti.tsx` left panel div (lines 112-230) has no `onClick`; the click-catcher block explicitly renders `null` when `dashboardActions` is present (line 323: `{dashboardActions ? null : onOpen ? (...) : (...)}`). |
| 9 | Rejected-status card exposes a rejection-info icon button opening `RejectionReasonPopup`, whose CTA navigates (never fetches) | ✓ VERIFIED | `DiagonaalKortti.tsx:275-285` renders the `AlertCircle` button when `dashboardActions.onShowRejectionInfo` is set (only for `claim_status === 'rejected'`, wired in `app/business/page.tsx:120`). `RejectionReasonPopup.tsx` CTA is a plain `<a href={editHref}>` (line 86-91) — no `fetch`, no `dangerouslySetInnerHTML`; text is rendered via `t()` interpolation only. |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/branding/brandingResult.ts` | exports `getPanelShade`, `darkenHex`, `lightenHex` | ✓ VERIFIED | All three exported; 25 tests pass |
| `lib/branding/brandingResult.test.ts` | covers `getPanelShade` direction + inequality | ✓ VERIFIED | Tests present and passing |
| `app/components/CalloutCard.tsx` | imports helpers instead of private copies | ✓ VERIFIED | `import { getContrastColor, darkenHex, lightenHex } from '@/lib/branding/brandingResult'` |
| `app/components/PreviewModal.tsx` | imports `CalloutCard`, not `PaikkaKortti` | ✓ VERIFIED | Confirmed via grep and full read |
| `app/business/onboarding/LivePreviewPane.tsx` | renders `PaikkaSheet` as 3rd section | ✓ VERIFIED | Full read confirms 3-section stack |
| `app/components/PaikkaSheet.tsx` | booking link + all nav suppressed under `preview` | ✓ VERIFIED | All interactive elements gated on `!preview` |
| `app/api/business/update-paikka/route.ts` | auto-resubmit branch present | ✓ VERIFIED | Lines 173-196 |
| `tests/api/update-paikka.test.ts` | covers flip/no-op/security cases | ✓ VERIFIED | 3 named tests found and passing |
| `app/components/DiagonaalKortti.tsx` | `dashboardActions` prop bundle | ✓ VERIFIED | Prop typed and consumed throughout render |
| `app/components/RejectionReasonPopup.tsx` | new component, correct props | ✓ VERIFIED | `{ open, onClose, rejectionReason, editHref }` matches spec |
| `messages/fi.json` / `messages/en.json` | `Business.fixDetailsCta`, `Business.showRejectionInfoLabel` + all consumed keys | ✓ VERIFIED | All keys present in both locale files (also `dashboardStatusRejectedTitle/Body/BodyNoReason`, `previewClose`, status* keys, etc.) |
| `app/business/page.tsx` | no `VenueRow`, no `handleReapply`, `DashboardVenueCard` present | ✓ VERIFIED | Confirmed via grep (0 hits for `VenueRow`/`handleReapply`) and full read |
| `app/api/business/reapply/route.ts` | deleted | ✓ VERIFIED | File does not exist; no remaining references to `api/business/reapply` anywhere in `app/` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `PreviewModal.tsx` | `CalloutCard.tsx` | JSX import + render with lat/lng shim | ✓ WIRED | `latitude: paikka.latitude ?? 0, longitude: paikka.longitude ?? 0` (D-12) |
| `LivePreviewPane.tsx` | `PaikkaSheet.tsx` | JSX import + render, `preview={true}` | ✓ WIRED | 3rd stacked section, no-op `onClose`/`onToggleTodo` |
| `DiagonaalKortti.tsx` | `lib/branding/brandingResult.ts` | `import { getContrastColor, getPanelShade }` | ✓ WIRED | Used to compute `panelShade`/`panelShadeContrastText` |
| `app/business/page.tsx` | `DiagonaalKortti.tsx` | `dashboardActions` prop bundle | ✓ WIRED | `DashboardVenueCard` builds and passes the full bundle per venue |
| `app/business/page.tsx` | `RejectionReasonPopup.tsx` | page-level state (`rejectionPopupLink`) | ✓ WIRED | Single instance, `open`/`onClose`/`rejectionReason`/`editHref` all wired |
| `update-paikka/route.ts` | `business_paikka_links` table | Supabase `.update()` with concurrency guard | ✓ WIRED | Confirmed in code + exercised by 3 passing unit tests |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `getPanelShade`/`darkenHex`/`lightenHex` unit tests | `npx vitest run lib/branding/brandingResult.test.ts` | 25 tests, all pass | ✓ PASS |
| `update-paikka` auto-resubmit unit tests (D-07 flip, no-op, security) | `npx vitest run tests/api/update-paikka.test.ts` | included in 25-test run above, all pass | ✓ PASS |
| Full project TypeScript compile | `npx tsc --noEmit` | no output / exit 0 | ✓ PASS |
| Full workspace test suite (single run, per phase-wide sanity) | `npx vitest run` | 21 files, 233 tests, all pass | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BIZPANEL-06 | 63-04, 63-05 | DiagonaalKortti dashboard cards with status pill in image corner | ✓ SATISFIED | Truths 1, 7, 9 |
| BIZPANEL-07 | 63-01, 63-04, 63-05 | Icon-button controls panel, no text buttons | ✓ SATISFIED | Truths 2, 8 (with documented D-01 deviation on the reveal mechanic) |
| PREV-04 | 63-02 | PreviewModal uses CalloutCard, not PaikkaKortti | ✓ SATISFIED | Truth 3 |
| LIVEPREV-05 | 63-02 | Live preview includes PaikkaSheet (venuepage) | ✓ SATISFIED | Truth 4 |
| PREV-05 | 63-02, 63-03 | All previews purely visual, no navigation/side-effects | ✓ SATISFIED | Truths 5, 6 |

**Note on REQUIREMENTS.md staleness:** `.planning/REQUIREMENTS.md` still shows `BIZPANEL-06`, `PREV-04`, and `LIVEPREV-05` as unchecked (`[ ]`) and its Traceability table (lines 88-92) lists them as "Pending", while `BIZPANEL-07`/`PREV-05` are marked "Complete". Codebase evidence above shows all 5 requirements are implemented and covered by passing tests/wiring. This is a documentation lag in REQUIREMENTS.md (expected to be updated once this verification lands), not a code gap — no orphaned requirements were found; all 5 phase-63 requirement IDs from PLAN frontmatter are accounted for in REQUIREMENTS.md's traceability table.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/business/update-paikka/route.ts` | 67-70, 86-90, 150-155 | CR-01 (63-REVIEW.md): `mediat`/`hinnasto`/`sijainti` sections silently null-out any field omitted from the request body (data-loss risk on partial saves) | ⚠️ Warning (out of phase-63 scope) | Pre-existing pattern in a file phase-63 modified for D-07; not introduced by this phase's diff (63-03 only added the flip branch at the end of the handler) and not covered by any phase-63 must-have. Unresolved per code review — no follow-up fix commit exists (unlike Phase 62's `fix(62): resolve code review findings`). Recommend tracking as a follow-up item/phase. |
| `app/api/business/update-paikka/route.ts` | 117-134 | CR-02 (63-REVIEW.md): `varauslinkki` can never be cleared once set (falls through as `undefined`, dropped by `JSON.stringify`) | ⚠️ Warning (out of phase-63 scope) | Same as above — pre-existing, unrelated to phase-63's D-07 auto-resubmit goal, unresolved. |
| `app/components/RejectionReasonPopup.tsx` | 75 | WR-06 (63-REVIEW.md): close button `aria-label={t('previewClose')}` reads "Close preview" — copy-paste leftover from PreviewModal, not descriptive of this dialog | ℹ️ Info | Accessibility polish item, not a functional bug. Included in Human Verification item 3. |

No debt markers (`TBD`/`FIXME`/`XXX`) found in any file modified by this phase. No stub/placeholder patterns (`return null`, empty handlers, hardcoded empty arrays feeding render) found in the reviewed files.

### Human Verification Required

See frontmatter `human_verification` list — 5 items covering: dashboard card visual correctness (status pill/panel color), icon-button click behavior and the D-01 "always visible controls" deviation, RejectionReasonPopup interaction, cross-surface preview inertness click-audit, and end-to-end auto-resubmit UX confirmation.

### Gaps Summary

No gaps found. All 9 derived observable truths (covering all 5 phase requirements: BIZPANEL-06, BIZPANEL-07, PREV-04, LIVEPREV-05, PREV-05) are verified in the codebase with passing automated tests (233/233), a clean TypeScript compile, and direct code inspection of every modified file. The single deviation from ROADMAP.md's literal wording (hover/tap-reveal → permanently-visible controls panel, D-01) is a documented, deliberate decision made during `/gsd:discuss-phase 63`, not an omission, and is accepted as satisfying the functional intent (icon buttons, no text buttons).

Two pre-existing Critical code-review findings (CR-01, CR-02 in `update-paikka/route.ts`, unrelated to phase-63's own goal) remain unresolved and are surfaced here as Warnings for tracking, not as phase-63 blockers — they predate this phase's changes and are outside its success criteria and must-haves.

Overall status is `human_needed` because several must-haves — the dashboard's visual layout/color correctness, click-through behavior across all icon buttons and the inert left panel, the RejectionReasonPopup dialog interaction, and the end-to-end auto-resubmit UX — require a human to interact with the running `/business` page, `PreviewModal`, and `LivePreviewPane`. Code-level wiring, exports, and test coverage for all of these are confirmed and passing.

---

_Verified: 2026-07-01_
_Verifier: Claude (gsd-verifier)_
