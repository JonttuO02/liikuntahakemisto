---
phase: 62-venuepage-konsolidaatio
verified: 2026-07-01T02:23:33Z
status: human_needed
score: 9/10 must-haves verified
behavior_unverified: 1
overrides_applied: 0
human_verification:
  - test: "Open Etusivu, run a search that returns results, and tap a DiagonaalKortti card directly on the LEFT info-panel area (venue name / price / sport badge / open-status text) — not just the RIGHT photo half. Repeat for a card inside the TO DO (favorites) overlay."
    expected: "PaikkaSheet opens for the tapped venue in both cases, and the search/TO DO overlay is dismissed (not layered underneath the sheet). This must work on a touch device or with mouse click, not only via Tab+Enter/Space keyboard activation."
    why_human: "This is the CR-01 blocker the code review found and fixed in commit 6f62627 — DiagonaalKortti's click-catcher was originally painted underneath the info panel by CSS stacking order (same z-10, earlier DOM position), so taps on the readable part of the card silently did nothing. Source inspection (this report) confirms the DOM order was corrected — the catcher div now renders after the LEFT/RIGHT panels — but actual click hit-testing is a browser paint/stacking behavior that only a live render can confirm; no component/interaction test framework exists in this project (confirmed: no *.test.*/*.spec.* files reference DiagonaalKortti/PaikkaSheet/PaikkaKortti) so this cannot be proven by grep or by npx tsc/npm run build alone."
---

# Phase 62: Venuepage-konsolidaatio Verification Report

**Phase Goal:** app/paikat/[id] poistettu; sisältö+navigointi yhdistetty PaikkaSheetiin; vanha reitti 404 (Venuepage consolidation — the standalone venue-detail route is deleted, its unique content and navigation are merged into the PaikkaSheet modal, and the old route now 404s)
**Verified:** 2026-07-01T02:23:33Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Unique content of the deleted venue page (show-on-map) is migrated into PaikkaSheet before deletion (VENUEPAGE-02, roadmap SC1) | ✓ VERIFIED | `app/components/PaikkaSheet.tsx:266-286` — conditional `SheetRow` guarded by `paikka.latitude != null && paikka.longitude != null && !preview`, `MapPin` icon, `t('location')`/`t('showOnMap')`. `messages/fi.json:34-35` and `messages/en.json:34-35` carry the keys under the `PaikkaSheet` namespace with correct values (FI has no trailing arrow). |
| 2 | Show-on-map row is absent when coordinates are null or the sheet is a preview render | ✓ VERIFIED | Same guard clause as above (`&& !preview`); source assertion confirmed via direct read, not just grep. |
| 3 | Erillinen paikkasivu (`app/paikat/[id]`) is deleted entirely from the application (VENUEPAGE-01, roadmap SC2) | ✓ VERIFIED | `ls app/paikat` → "No such file or directory"; `npm run build` route table has no `/paikat/[id]` entry (33/33 routes generated, confirmed by fresh build run in this verification, not just the SUMMARY's claim). |
| 4 | Direct request to the deleted route returns Next.js's automatic 404 with no redirect (VENUEPAGE-04, roadmap SC4) | ✓ VERIFIED | No `app/paikat/[id]/not-found.tsx` (deleted with the directory); `middleware.ts` has no `paikat` reference; `next.config.ts`'s only `redirects()` entry rewrites `/?nakyma=lista` → `/`, unrelated to `/paikat`; a root-level `app/not-found.tsx` exists (pre-existing global 404 UI, not a route-specific override) so Next.js's App Router will render it with a genuine 404 status for any `/paikat/*` request. |
| 5 | DiagonaalKortti calls `onOpen(paikka)` on click when `onOpen` is provided, with no page navigation, and the click-catcher receives clicks across the full card (including the info-panel region) — CR-01 fix (VENUEPAGE-03) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Source confirms the fix: click-catcher `<div role="button" ...>` (app/components/DiagonaalKortti.tsx:245-255) now renders **after** the LEFT (`:90-208`) and RIGHT (`:211-240`) panels inside the shared `z-10` layer, so per CSS paint order it now sits on top of both — this was the exact bug CR-01 identified (catcher previously rendered first, panels painted over it). No `next/link` import remains; no `/paikat/` string remains; `onCardClick` prop fully removed. This is a CSS stacking/paint-order (ordering) invariant — code presence and correct DOM order are necessary but not sufficient; no automated interaction test exists in the repo to exercise a real click/tap and confirm hit-testing in a browser. Routed to human verification below. |
| 6 | DiagonaalKortti renders an inert, non-navigating overlay when `onOpen` is absent (preview contexts: PreviewModal, LivePreviewPane, admin/[id]) | ✓ VERIFIED | `app/components/DiagonaalKortti.tsx:253-255` — falsy branch renders a plain `<div className="absolute inset-0 block z-10" />` with no `onClick`/`onKeyDown`/`role`. Confirmed all 3 consumer sites (`app/admin/[id]/page.tsx:246`, `app/business/onboarding/LivePreviewPane.tsx:54`, `app/components/PreviewModal.tsx:60`) call `<DiagonaalKortti paikka={...} .../>` without `onOpen`. |
| 7 | Clicking a card in the search list opens PaikkaSheet and dismisses the search overlay first (no page navigation) | ✓ VERIFIED (wiring) | `app/components/Etusivu.tsx:1422-1425` — `onOpen={(clicked) => { setSearchOpen(false); setValittu(clicked) }}`, dismiss-then-open order matches the `onShowMap` sibling pattern at the same call site. Same CR-01 paint-order caveat applies to the actual click reaching this handler — covered by item 5's human-verification entry, not duplicated here. |
| 8 | Clicking a card in the TO DO overlay opens PaikkaSheet and dismisses the TO DO overlay first | ✓ VERIFIED (wiring) | `app/components/Etusivu.tsx:1026` — `onOpen={(clicked) => { setTodoOpen(false); setValittu(clicked) }}`. Same click-reachability caveat as item 5/7. |
| 9 | No dangling references to the deleted route or `PaikkaPage` i18n namespace remain anywhere in the app; `npm run build` passes | ✓ VERIFIED | `grep -rn "/paikat/" app/ --include=*.tsx --include=*.ts` → 0 results (including `PaikkaKortti.tsx`, which the code review's WR-06 flagged as still linking to the dead route — now migrated to the same `onOpen` pattern). `grep -rc "PaikkaPage" messages/fi.json messages/en.json` → 0/0. Fresh `npx tsc --noEmit` → clean. Fresh `npm run build` → green, 33/33 static pages generated. |
| 10 | The critical code-review regression (CR-01) and all 6 warnings/1 info item from `62-REVIEW.md` are actually fixed in the current codebase, not just claimed in the fix commit message | ✓ VERIFIED (except behavior confirmation of CR-01 itself, see item 5) | WR-01: `searchResultsRef`/`etusivu-scroll-state` effect fully removed from `Etusivu.tsx` (0 grep matches). WR-02: top-level discarded `paikkaInfo` plumbing removed from `app/business/onboarding/page.tsx` (only a legitimate, locally-used `paikkaInfo` remains inside `StepNimiJaURLPrePhase`, passed to `StepNimiJaURL`). WR-03: `PaikkaSheet`'s show-on-map now takes `onShowMap` wired in `Etusivu.tsx` to `setAutoZoomTarget` (client-side, no reload); falls back to `next/link`'s `Link` (not a full-reload `<a>`) when no callback given. WR-04: `contrastText` now applied to `membershipOnly`/`priceComingSoon` spans in `DiagonaalKortti.tsx:135,190`. WR-05: `messages/en.json:125-127` has `websiteUrlLabel`/`websiteUrlPlaceholder`/`websiteUrlHelper`. WR-06: `PaikkaKortti.tsx` migrated to the same optional `onOpen` pattern, no more `/paikat/` links. IN-01: `Etusivu.tsx`'s two `onOpen` callbacks use `clicked`, not shadowed `p`. |

**Score:** 9/10 truths verified (1 present + wired, behavior not exercised)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/PaikkaSheet.tsx` | `MapPin` import + conditional show-on-map `SheetRow` | ✓ VERIFIED | Present, wired, guard correct (Task 1, Plan 01); further extended in 6f62627 with `onShowMap` prop (WR-03 fix) |
| `messages/fi.json` / `messages/en.json` | `PaikkaSheet.location` / `PaikkaSheet.showOnMap` keys | ✓ VERIFIED | Present with correct FI (no arrow) / EN values |
| `app/components/DiagonaalKortti.tsx` | `onOpen?: (paikka) => void` prop replacing `onCardClick`; conditional overlay | ✓ VERIFIED (existence/wiring); ⚠️ click-reachability behavior unverified | See truth 5/6 |
| `app/components/Etusivu.tsx` | `onOpen` wired on both `DiagonaalKortti` usages; `handleCardClick` removed | ✓ VERIFIED | 2 `onOpen` sites confirmed, `handleCardClick` fully absent |
| `app/paikat/[id]/` | Deleted directory | ✓ VERIFIED | Confirmed absent (also parent `app/paikat/` removed as it became empty) |
| `messages/fi.json` / `messages/en.json` | `PaikkaPage` namespace removed | ✓ VERIFIED | `grep -rc PaikkaPage` → 0 for both files |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `DiagonaalKortti` overlay `onClick` | `Etusivu.setValittu` | `onOpen` callback prop | ✓ WIRED (source); ⚠️ click hit-testing unconfirmed in-browser | Correct DOM order post-fix; see truth 5 |
| `PaikkaSheet` show-on-map | `Etusivu.setAutoZoomTarget` | `onShowMap` callback (WR-03 fix, replaces the original `/?id=` full-reload anchor) | ✓ WIRED | `Etusivu.tsx:1460-1465` |
| `app/paikat/[id]` route | Next.js 404 | directory deletion, no `not-found.tsx` override, no redirect | ✓ WIRED | Confirmed via directory absence + config inspection + build route table |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles cleanly | `npx tsc --noEmit` | No output (0 errors) | ✓ PASS |
| Production build succeeds, route table excludes `/paikat/[id]` | `npm run build` | 33/33 static pages generated; no `/paikat/[id]` route listed | ✓ PASS |
| Message files remain valid JSON | `node -e "JSON.parse(...)"` on both files | `valid` | ✓ PASS |
| `/paikat/` string fully absent from `app/` | `grep -rn "/paikat/" app/ --include=*.tsx --include=*.ts` | 0 matches | ✓ PASS |
| Interactive click/tap reaches the DiagonaalKortti overlay in a real browser | — | not run (no server/browser harness available in this environment; no component test suite exists) | ? SKIP — routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| VENUEPAGE-01 | 62-03 | `app/paikat/[id]` deleted entirely | ✓ SATISFIED | Directory confirmed absent |
| VENUEPAGE-02 | 62-01 | Unique content migrated to PaikkaSheet before deletion | ✓ SATISFIED (code) — **documentation gap**: `.planning/REQUIREMENTS.md` line 40/94 still marks this `[ ]` / "Pending" though the other 3 VENUEPAGE items and the phase itself are marked `[x]`/Complete. This is a stale tracking artifact, not a functional gap — the implementation is present and verified. Recommend updating REQUIREMENTS.md's checkbox and traceability table to `[x]` / "Complete". |
| VENUEPAGE-03 | 62-02, 62-03 | Internal paths open PaikkaSheet inline instead of navigating | ✓ SATISFIED (wiring); behavior confirmation pending — see truth 5 |
| VENUEPAGE-04 | 62-03 | Direct URL to deleted route returns 404, no redirect | ✓ SATISFIED | See truth 4 |

No orphaned requirements — all 4 phase-mapped IDs (VENUEPAGE-01..04) appear in plan frontmatter `requirements:` fields and in `.planning/REQUIREMENTS.md`'s traceability table under Phase 62.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | 40, 94 | VENUEPAGE-02 checkbox/status not updated to reflect completion | ℹ️ Info | Documentation-only; does not affect functional correctness, ship-blocking, or phase goal achievement. Recommend a follow-up edit. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any phase-modified file (`DiagonaalKortti.tsx`, `Etusivu.tsx`, `PaikkaSheet.tsx`, `PaikkaKortti.tsx`, `app/business/onboarding/page.tsx`, `messages/*.json`). No stub returns, no hardcoded-empty props feeding rendered content, no console.log-only implementations.

### Human Verification Required

### 1. Full-card tap-to-open on DiagonaalKortti (CR-01 regression fix confirmation)

**Test:** Open the app (Etusivu), search for a venue so at least one result renders as a `DiagonaalKortti` card in the search list, and tap directly on the venue name / price / sport badge area (the LEFT info panel — NOT the photo thumbnail). Then open the TO DO (favorites) overlay and repeat on a saved card there.

**Expected:** PaikkaSheet opens for the tapped venue in both cases (search list and TO DO overlay), and the overlay you tapped from (search or TO DO) is dismissed rather than remaining visible underneath the sheet.

**Why human:** The code review found a real interaction regression here (CR-01, blocker) caused by CSS stacking order — the click-catcher div was painting underneath the card's own info panel, so taps on most of the visible card silently did nothing (only the photo half worked). The fix commit (`6f62627`) reordered the DOM so the catcher now renders after both panels, which this verification confirmed by direct source inspection. However, whether a real click/tap actually now reaches the catcher in a live browser is a paint/stacking behavior that cannot be proven by source inspection, `tsc`, or `next build` alone — this project has no component/interaction test framework (no `*.test.*`/`*.spec.*` file references `DiagonaalKortti`, `PaikkaSheet`, or `PaikkaKortti`), so a manual tap-through is the only way to close this out.

### Gaps Summary

No functional gaps. The phase's 4 roadmap success criteria (unique content migrated, page deleted, internal paths open PaikkaSheet, deleted route 404s) are all satisfied in the codebase, `npm run build` is green, and every item from the phase's own code review (`62-REVIEW.md`, 1 critical + 6 warnings + 1 info) was independently re-confirmed present in the current codebase rather than taken on the fix commit's word.

The phase is held at `human_needed` rather than `passed` for one reason only: the CR-01 click-catcher fix is a CSS paint-order (stacking) correction that source inspection and the build pipeline cannot behaviorally exercise — this needs one manual tap-through in a running app to close out, per the verification methodology's rule that ordering-dependent runtime behavior requires human/behavioral confirmation, not just presence-and-wiring evidence.

Also flagged (non-blocking): `.planning/REQUIREMENTS.md` still shows VENUEPAGE-02 as `[ ]`/"Pending" despite being implemented and verified — a stale documentation checkbox, recommended for cleanup but not a gate on phase completion.

---

_Verified: 2026-07-01T02:23:33Z_
_Verifier: Claude (gsd-verifier)_
