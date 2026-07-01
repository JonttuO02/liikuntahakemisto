---
phase: 62-venuepage-konsolidaatio
verified: 2026-07-01T12:00:00Z
status: passed
score: 10/12 must-haves verified
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/10
  gaps_closed:

    - "CR-01 click-catcher paint-order fix — confirmed via manual tap-through (62-UAT.md Test 1: result: pass). DiagonaalKortti full-card tap-to-open now VERIFIED (was PRESENT_BEHAVIOR_UNVERIFIED)."
  gaps_remaining: []
  regressions:

    - "During the same manual UAT pass, a NEW regression was found and reported (62-UAT.md Test 2): opening PaikkaSheet from the search results list or the TO DO overlay unmounted the underlying overlay instead of layering the sheet on top of it. Root-caused in .planning/debug/paikkasheet-dismisses-search-todo-overlay.md and closed via gap-closure plan 62-04 (commit 035ebc1). The 62-04 diff's own code review (62-04-REVIEW.md) then found 2 further warnings (WR-01, WR-02), fixed in a follow-up commit (5221e7f). All three fixes are confirmed present in the current codebase (see Observable Truths below) but NONE has been behaviorally re-confirmed by a human in a running app — 62-UAT.md's Test 2 still reads result:issue and was never re-run to result:pass after the fix landed."

gaps: []
behavior_unverified_items:

  - truth: "Opening PaikkaSheet from the search results list or the TO DO overlay leaves that overlay mounted underneath (via z-index layering, not conditional mounting); closing the sheet returns the user directly to the overlay they were browsing."
    test: "Search for a venue so the search list shows results; tap a card's info panel (not the photo). Confirm PaikkaSheet opens ON TOP of the still-visible search list. Close the sheet and confirm you land back in the search list, not the bare map. Repeat by opening the TO DO (favorites) overlay and tapping a saved card."
    expected: "In both cases PaikkaSheet layers over the originating surface; that surface remains visible/mounted underneath (or at least resumes without needing to be manually reopened) after the sheet is closed."
    why_human: "This is a state-mutation/AnimatePresence-mount invariant. Source inspection (this report) confirms the two setSearchOpen(false)/setTodoOpen(false) calls were removed from the onOpen handlers (app/components/Etusivu.tsx:1026, 1427), which is necessary for the fix — but whether the AnimatePresence-wrapped overlay actually stays visually mounted and the browse-open-close-browse flow feels correct in a live render is a rendered/animated outcome that grep and tsc cannot exercise. No component/interaction test framework exists in this project (no *.test.*/*.spec.* file references Etusivu, DiagonaalKortti, or PaikkaSheet). 62-UAT.md Test 2 (the exact regression this fix targets) has not been re-run since the fix landed."

  - truth: "While PaikkaSheet is open (a venue is selected), the background TodoButton does not silently toggle the hidden TO DO overlay's open state, and background search/filter controls (CombinedFilterPill, list-toggle button, search-results list) are excluded from the tab order and accessibility tree — the two follow-up fixes (WR-01, WR-02) from 62-04-REVIEW.md."
    test: "Open TO DO overlay, tap a saved card to open PaikkaSheet (overlay now hidden behind the sheet), then tap where the floating bookmark/TodoButton normally sits. Confirm nothing happens (button is inert) and the TO DO overlay is still open/showing its previous items when the sheet is closed. Separately, with the search list open and a venue selected (PaikkaSheet open), Tab through the page with a keyboard and confirm focus cannot land on the search input, city/sport filter pills, or list-toggle button until the sheet is closed."
    expected: "TodoButton is unclickable (disabled, pointer-events:none) while a venue is selected, so it cannot flip todoOpen to false behind the sheet. Background search controls and the list-toggle wrapper are marked inert while a venue is selected, so keyboard/AT users cannot reach or operate them until PaikkaSheet closes."
    why_human: "The code uses standard, spec-guaranteed platform primitives (disabled attribute, pointerEvents:'none', the HTML inert global attribute — commit 5221e7f, app/components/Etusivu.tsx:1073,1188,1342,1398) which is a strong signal of correctness, but no automated interaction/accessibility test exercises real click-through or Tab-order behavior in this project, and no human re-test has been recorded since the fix landed."
---

# Phase 62: Venuepage-konsolidaatio Verification Report

**Phase Goal:** app/paikat/[id] poistettu; sisältö+navigointi yhdistetty PaikkaSheetiin; vanha reitti 404 (Venuepage consolidation — the standalone venue-detail route is deleted, its unique content and navigation are merged into the PaikkaSheet modal, and the old route now 404s)
**Verified:** 2026-07-01T12:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 62-04 + its own review-remediation follow-up commit)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Unique content of the deleted venue page (show-on-map) is migrated into PaikkaSheet before deletion (VENUEPAGE-02, roadmap SC1) | ✓ VERIFIED | `app/components/PaikkaSheet.tsx:268-283` — `MapPin`-icon `SheetRow` guarded by coordinates + `!preview`. `messages/fi.json:34-35`, `messages/en.json:34-35` carry `PaikkaSheet.location`/`PaikkaSheet.showOnMap`. Unchanged since original verification, re-confirmed by direct read. |
| 2 | Show-on-map row is absent when coordinates are null or the sheet is a preview render | ✓ VERIFIED | Same guard clause, re-confirmed. |
| 3 | Erillinen paikkasivu (`app/paikat/[id]`) is deleted entirely (VENUEPAGE-01, roadmap SC2) | ✓ VERIFIED | `ls app/paikat` → no such file/directory. Fresh `npm run build` in this re-verification: 33/33 routes, no `/paikat/[id]` entry. |
| 4 | Direct request to the deleted route returns Next.js's automatic 404 with no redirect (VENUEPAGE-04, roadmap SC4) | ✓ VERIFIED | No `app/paikat/[id]/not-found.tsx` (deleted with the directory); `middleware.ts` has no `paikat` reference; `next.config.mjs`'s only `redirects()` entry is unrelated to `/paikat`; root `app/not-found.tsx` still exists for the global 404 UI. |
| 5 | DiagonaalKortti's click-catcher receives clicks/taps across the full card (including the info-panel region), not just the photo half — CR-01 fix | ✓ VERIFIED (upgraded from PRESENT_BEHAVIOR_UNVERIFIED) | Source unchanged and correct (`app/components/DiagonaalKortti.tsx:242-255` — catcher div renders after LEFT/RIGHT panels, same z-10 layer). **Now behaviorally confirmed**: `.planning/phases/62-venuepage-konsolidaatio/62-UAT.md` Test 1 records `result: pass` — a human tapped the info-panel area on both a search-list card and a TO DO-overlay card and PaikkaSheet opened in both cases. |
| 6 | Clicking a card in the search list opens PaikkaSheet (no page navigation) AND leaves the search overlay mounted underneath, so closing the sheet resumes browsing (VENUEPAGE-03) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code fix confirmed: `app/components/Etusivu.tsx:1426-1428` — `onOpen={(clicked) => { setValittu(clicked) }}`, no `setSearchOpen(false)` call (removed in commit `035ebc1`, region-anchored grep confirms no match). z-index math confirmed correct (PaikkaSheet backdrop 65 / sheet 66 > search list 59). But this is a state-transition/mount invariant no automated test exercises, and `62-UAT.md` Test 2 — the exact scenario this fix targets — still reads `result: issue` and was never re-run since the fix landed. Routed to human verification. |
| 7 | Clicking a card in the TO DO overlay opens PaikkaSheet (no page navigation) AND leaves the TO DO overlay mounted underneath, so closing the sheet resumes browsing (VENUEPAGE-03) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Same pattern: `app/components/Etusivu.tsx:1026` — `onOpen={(clicked) => { setValittu(clicked) }}`, `setTodoOpen(false)` removed. Same UAT-not-re-run caveat as truth 6 — bundled into the same human-verification item. |
| 8 | While PaikkaSheet is open, the floating TodoButton cannot silently flip `todoOpen` to `false` behind the sheet (WR-01 fix, 62-04-REVIEW.md) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `app/components/Etusivu.tsx:1188` — `disabled={!!valittu}` and `style={{ ..., pointerEvents: valittu ? 'none' : undefined }}` added in commit `5221e7f`. Diff-verified present; standard, spec-guaranteed DOM behavior (disabled buttons don't fire onClick), but no automated test and no recorded human re-test exercise this exact interaction post-fix. |
| 9 | While PaikkaSheet is open, background search/filter controls and the list-toggle button are excluded from tab order / accessibility tree (WR-02 fix, 62-04-REVIEW.md) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `app/components/Etusivu.tsx:1073,1342,1398` — `inert={!!valittu}` added in commit `5221e7f` on the list-toggle wrapper, `CombinedFilterPill` wrapper, and search-results-list container. Diff-verified present; `inert` is a standard HTML global attribute (removes descendants from tab order, hit-testing, and a11y tree per spec) — `npx tsc --noEmit` compiles clean with this usage in the actual project tsconfig (independently re-verified in this pass by temporarily adding a scratch `<div inert={true} />` and confirming no type error). No automated keyboard/Tab-order test exists to exercise it live. |
| 10 | DiagonaalKortti renders an inert, non-navigating overlay when `onOpen` is absent (preview contexts) | ✓ VERIFIED | `app/components/DiagonaalKortti.tsx:253-255` — falsy branch, plain `<div>` no handlers. All 3 consumer sites (`app/admin/[id]/page.tsx`, `LivePreviewPane.tsx`, `PreviewModal.tsx`) still call without `onOpen`. Unchanged, re-confirmed. |
| 11 | No dangling references to the deleted route or `PaikkaPage` i18n namespace remain; build/typecheck/tests green | ✓ VERIFIED | `grep -rn "/paikat/" app/ --include=*.tsx --include=*.ts` → 0 matches. `grep -rc PaikkaPage messages/fi.json messages/en.json` → 0/0. Fresh `npx tsc --noEmit` → clean. Fresh `npm test` → 224/224 passed (21 files). Fresh `npm run build` → green, 33/33 static pages. All re-run independently in this verification pass, not taken from commit messages. |
| 12 | All findings from `62-REVIEW.md` (original phase review) and `62-04-REVIEW.md` (gap-closure review) are actually fixed in the codebase, not just claimed | ✓ VERIFIED | `62-REVIEW.md` items (CR-01, WR-01..06, IN-01) re-confirmed present (unchanged from original verification). `62-04-REVIEW.md`'s WR-01 and WR-02 confirmed fixed via direct diff inspection of commit `5221e7f` (see truths 8/9); its IN-01 (onShowMap asymmetry) was explicitly scoped "no action required" by the reviewer — not a gap. |

**Score:** 10/12 truths verified (2 present + wired, behavior not exercised — truths 6/7 are one behavior-unverified item, truths 8/9 are a second, per the frontmatter `behavior_unverified_items` list)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/PaikkaSheet.tsx` | show-on-map `SheetRow` | ✓ VERIFIED | Unchanged from prior verification |
| `messages/fi.json` / `messages/en.json` | `PaikkaSheet.location`/`showOnMap` keys | ✓ VERIFIED | Unchanged |
| `app/components/DiagonaalKortti.tsx` | `onOpen` prop, click-catcher after LEFT/RIGHT panels, inert overlay when no `onOpen` | ✓ VERIFIED | Unchanged since original verification; CR-01 now behaviorally confirmed (truth 5) |
| `app/components/Etusivu.tsx` | `onOpen` wired without clearing overlay flags; TodoButton disabled+pointer-events-none while sheet open; background controls `inert` while sheet open | ✓ VERIFIED (existence/wiring); ⚠️ layering + a11y behavior unconfirmed live | See truths 6-9 |
| `app/paikat/[id]/` | Deleted directory | ✓ VERIFIED | Confirmed absent |
| `.planning/phases/62-venuepage-konsolidaatio/62-UAT.md` | Test 1 wording reconciled with fixed intent; Test 2 status reflects post-fix reality | ⚠️ PARTIAL | Test 1 wording correctly updated (no longer asserts dismiss-on-open). Test 2 still reads `result: issue` — was never re-run/updated to `pass` after the fix landed. This is expected (re-testing is this verification's job), not a defect, but flagged so the human-verification loop closes it. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `DiagonaalKortti` overlay `onClick` | `Etusivu.setValittu` | `onOpen` callback prop | ✓ WIRED (source + human-confirmed click-reachability, per UAT Test 1 pass) | |
| Search-list/TO DO `onOpen` handlers | overlay-open flags (`searchOpen`/`todoOpen`) | *absence* of a call — the fix is subtractive | ✓ WIRED (source-confirmed) — ⚠️ rendered/mount outcome unconfirmed live | `app/components/Etusivu.tsx:1026,1427` |
| `TodoButton` onClick | `todoOpen` state | `disabled`/`pointerEvents` guard (WR-01 fix) | ✓ WIRED (source-confirmed) — ⚠️ live click-blocking unconfirmed | `app/components/Etusivu.tsx:1188` |
| Background search controls | tab order / a11y tree | `inert` attribute (WR-02 fix) | ✓ WIRED (source-confirmed, type-checks) — ⚠️ live keyboard-focus behavior unconfirmed | `app/components/Etusivu.tsx:1073,1342,1398` |
| `app/paikat/[id]` route | Next.js 404 | directory deletion, no `not-found.tsx` override, no redirect | ✓ WIRED | Re-confirmed via build route table |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles cleanly | `npx tsc --noEmit` | No output (0 errors) | ✓ PASS |
| `inert` prop type-checks against project's actual React/TS setup | scratch `<div inert={true} />` added to `app/components/`, `npx tsc --noEmit`, then removed | No error | ✓ PASS |
| Full test suite passes | `npm test` | 21 files / 224 tests passed | ✓ PASS |
| Production build succeeds, route table excludes `/paikat/[id]` | `npm run build` | 33/33 static pages generated; no `/paikat/[id]` route | ✓ PASS |
| `/paikat/` string fully absent from `app/` | `grep -rn "/paikat/" app/` | 0 matches | ✓ PASS |
| No test file references the components whose runtime behavior is in question | `grep -rl "DiagonaalKortti\|PaikkaSheet\|Etusivu" --include="*.test.*" --include="*.spec.*" .` | 0 matches | confirms no automated behavioral coverage exists — informs routing to human verification |
| Live click/tap/keyboard-focus behavior of the layering + WR-01/WR-02 fixes | — | not run (no server/browser harness in this environment; no component/interaction test suite) | ? SKIP — routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| VENUEPAGE-01 | 62-03 | `app/paikat/[id]` deleted entirely | ✓ SATISFIED | Directory confirmed absent; REQUIREMENTS.md marks `[x]`/Complete |
| VENUEPAGE-02 | 62-01 | Unique content migrated to PaikkaSheet before deletion | ✓ SATISFIED | Implementation present; REQUIREMENTS.md checkbox now `[x]`/Complete (the prior verification's flagged documentation gap has since been fixed, commit `5cf1757`) |
| VENUEPAGE-03 | 62-02, 62-03, 62-04 | Internal paths open PaikkaSheet inline instead of navigating, the same way a CalloutCard click does | ✓ SATISFIED (code + partial human confirmation) | No-navigation + inline-open behavior is human-confirmed (UAT Test 1 pass). The additional overlay-preservation requirement surfaced during that same UAT pass (Test 2) is code-fixed but awaiting human re-confirmation — see truths 6/7. |
| VENUEPAGE-04 | 62-03 | Direct URL to deleted route returns 404, no redirect | ✓ SATISFIED | Re-confirmed |

No orphaned requirements — all 4 phase-mapped IDs (VENUEPAGE-01..04) appear in plan frontmatter and REQUIREMENTS.md's traceability table under Phase 62, all marked Complete.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any phase-modified file (`Etusivu.tsx`, `DiagonaalKortti.tsx`, `PaikkaSheet.tsx`, `PaikkaKortti.tsx`, `messages/*.json`). No stub returns, no dangling `onCardClick`/`handleCardClick` references, no console.log-only implementations. The previously-flagged documentation gap (VENUEPAGE-02 checkbox) has already been resolved (commit `5cf1757`, prior to this re-verification).

### Human Verification Required

### 1. PaikkaSheet layers over the search list / TO DO overlay instead of dismissing it

**Test:** Open Etusivu, search so at least one venue renders in the search results list, tap its info panel to open PaikkaSheet, then close the sheet. Confirm the search list is still there / resumes without needing to be manually reopened. Repeat with the TO DO (favorites) overlay: open it, tap a saved card, close the sheet, confirm the TO DO overlay's items are still shown.

**Expected:** PaikkaSheet opens on top of the still-mounted overlay in both cases; closing the sheet returns the user directly to the overlay they were browsing, not to the bare map.

**Why human:** This is the exact regression diagnosed in `.planning/debug/paikkasheet-dismisses-search-todo-overlay.md` and closed by gap-closure plan 62-04 (commit `035ebc1`, which removed the two `setSearchOpen(false)`/`setTodoOpen(false)` calls). Source inspection confirms the fix is applied and the z-index math supports correct layering, but this is a rendered AnimatePresence/mount-state outcome that only a live render can confirm. `62-UAT.md` Test 2 (the test that originally caught this regression) has not been re-run since the fix landed — its `result:` field still reads `issue`.

### 2. WR-01/WR-02 follow-up fixes actually block interaction with hidden background controls

**Test:** Open the TO DO overlay, tap a saved card to open PaikkaSheet, then tap where the floating bookmark/TodoButton normally sits (top-right, below the nav pill). Confirm nothing happens and the TO DO overlay's contents are unaffected when the sheet is later closed. Separately, with a search result open and PaikkaSheet showing, use Tab on a keyboard and confirm you cannot focus the (hidden) search input, city/sport filter pills, or list-toggle button until the sheet is closed.

**Expected:** The TodoButton is inert/unclickable while a venue is selected (WR-01). Background search/filter controls are removed from the tab order and accessibility tree while a venue is selected (WR-02).

**Why human:** These fixes (commit `5221e7f`) use standard platform primitives (`disabled`, `pointerEvents:'none'`, the HTML `inert` attribute) that are spec-guaranteed to behave correctly, and this verification independently confirmed the code compiles and the diff is exactly as described — but no automated interaction or accessibility test exists in this project, and no human has exercised these two specific interactions since the fix landed.

### Gaps Summary

No functional gaps remain unaddressed at the code level. All 4 roadmap success criteria for Phase 62 are satisfied in the codebase: unique content migrated (SC1), the standalone page deleted (SC2), internal paths open PaikkaSheet inline without navigation (SC3's core requirement — human-confirmed via UAT Test 1), and the deleted route 404s with no redirect (SC4). `npm run build`, `npx tsc --noEmit`, and `npm test` (224/224) are all green in this independently re-run verification pass.

The phase is held at `human_needed` rather than `passed` because the gap-closure fix (62-04) and its own review-remediation follow-up (WR-01/WR-02) introduce three interaction/state invariants — search/TO DO overlay layering, TodoButton inertness, and background-control keyboard exclusion — that are code-confirmed present and correctly wired but have NOT been behaviorally re-confirmed by a human in a running app since they were written. `62-UAT.md` Test 2, which is the designated re-test for exactly this scenario, still shows `result: issue` from before the fix. This is not evidence the fix is broken — it is the expected state for code that has been fixed but not yet re-tested. Once a human confirms the two verification items above, the phase can be marked `passed` without further code changes (assuming the tests pass as expected).

---

_Verified: 2026-07-01T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
