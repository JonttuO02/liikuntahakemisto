---
phase: 20-navigaatio-korjaukset
verified: 2026-05-30T14:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Open homepage at / — observe bottom sheet starts as a pill, then slides up automatically"
    expected: "Sheet initialises in closed pill state, then animates open via spring (~damping 28, stiffness 280, delay 0.1) without any user interaction"
    why_human: "Cannot verify CSS animation timing or visual spring feel programmatically; requires browser observation"
  - test: "Open homepage at /?id=5 — observe bottom sheet does NOT auto-open"
    expected: "Sheet stays in sliding/hidden state; map centres on the venue with id=5; auto-open effect does not fire"
    why_human: "Requires URL parameter interaction in a browser; cannot simulate focusId guard visually with grep"
  - test: "Open search overlay, scroll the result list down, tap a DiagonaalKortti to navigate to /paikat/ID, then tap Takaisin hakemistoon"
    expected: "User returns to / with search overlay open, scroll position restored, and all five filters (haku, laji, kertakaynti, aukinyt, kaupunki) restored to the values set before navigation"
    why_human: "Requires full browser interaction across two pages; sessionStorage read/write only verifiable end-to-end in a real browser"
  - test: "Tap Nayta kartalla on any venue detail page /paikat/[id]"
    expected: "Map centres on the venue coordinates; bottom sheet stays closed; GPS re-centre button is not automatically triggered"
    why_human: "Requires live GPS state and map interaction; cannot verify map pan vs GPS pan programmatically"
---

# Phase 20: Navigaatio-korjaukset Verification Report

**Phase Goal:** Navigation between the map, list, and venue profiles is consistent and predictable — back returns to the right scroll position, map centering uses venue coordinates, and the bottom sheet animates open gracefully on load
**Verified:** 2026-05-30T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pressing "Takaisin hakemistoon" from a venue profile returns user to list at previous scroll position | VERIFIED | `handleCardClick` in Etusivu.tsx (line 231) captures `searchResultsRef.current?.scrollTop` + all 5 filter states into `sessionStorage.setItem('etusivu-scroll-state', ...)`. Restore effect (line 288) reads, deletes, then restores state + `requestAnimationFrame` for scrollTop. `SuosikitClient.tsx` all three back-links are `href="/"`. |
| 2 | "Nayta kartalla" centres map on venue coordinates without triggering GPS re-centre | VERIFIED (code path confirmed; visual requires human) | `app/paikat/[id]/page.tsx` line 90: `href={`/?id=${paikka.id}`}`. Etusivu focusId effect (line 396) calls `setAutoZoomTarget` with venue lat/lng and `setSheetPhase('sliding')`. GPS re-centre is via separate `RecenterButton` not triggered by `autoZoomTarget`. |
| 3 | Homepage loads with bottom sheet closed, then sheet animates open automatically and immediately | VERIFIED (code path; visual requires human) | `sheetPhase` initialised as `'closed'` (line 159). Auto-open effect (line 392): `if (!focusId) setSheetPhase('open')` with `[]` deps fires on mount. When `/?id=X` is present `focusId` is truthy, guard prevents auto-open. |
| 4 | Toolbar on /suosikit and /profiili contains no search button and has no dead nakyma=lista links | VERIFIED | `NavPill.tsx` import on line 6 has no `Search`; no "Haku" JSX text node present; no `nakyma=lista` string present (grep returned zero matches). Expanded menu contains exactly: Profiili, Suosikit, Kirjaudu/Kirjaudu ulos. |
| 5 | "Takaisin" button on the TO DO (/suosikit) page navigates to / not the removed nakyma=lista route | VERIFIED | `SuosikitClient.tsx`: three `href="/"` at lines 73, 104, 134. Zero occurrences of `nakyma=lista` (grep returned no matches). Link texts preserved: "Takaisin hakemistoon" (x2, lines 76 and 137) and "Selaa hakemistoa" (line 107). |

**Score:** 5/5 truths verified (code paths complete; 4 items require human browser verification for visual/interactive confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/NavPill.tsx` | NavPill without Haku link, no nakyma=lista | VERIFIED | No `Search` import, no "Haku" text, no `nakyma=lista`; `/profiili` and `/suosikit` links present |
| `app/suosikit/SuosikitClient.tsx` | Three back-links pointing to "/" | VERIFIED | `href="/"` at lines 73, 104, 134; zero `nakyma=lista` occurrences |
| `app/components/DiagonaalKortti.tsx` | onCardClick prop in interface, destructuring, Link onClick | VERIFIED | Interface has `onCardClick?: () => void` (line 38); destructured in function signature (line 41); Link onClick fires `onCardClick?.()` (line 58) |
| `app/components/Etusivu.tsx` | sheetPhase init 'closed', auto-open effect, scroll restore, handleCardClick, searchResultsRef, ref on motion.div, onCardClick on DiagonaalKortti | VERIFIED | All six edits confirmed at specific lines (see Key Link Verification) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DiagonaalKortti.tsx` (Link onClick) | `sessionStorage.setItem` | `onCardClick?.()` fires before navigation | WIRED | Line 58 fires callback; Etusivu passes `handleCardClick` at line 1029 which writes to sessionStorage at line 243 |
| `Etusivu.tsx` (restore effect) | `searchResultsRef.current.scrollTop` | `requestAnimationFrame` in mount restore effect | WIRED | Lines 300–305: `requestAnimationFrame(() => { if (searchResultsRef.current) { searchResultsRef.current.scrollTop = s.scrollTop } })` |
| `Etusivu.tsx` (auto-open effect) | `sheetPhase` setter | `if (!focusId) setSheetPhase('open')` | WIRED | Lines 392–394; immediately before focusId effect at lines 396–403 |
| `Etusivu.tsx` (motion.div) | `searchResultsRef` | `ref={searchResultsRef}` on search-results container | WIRED | Line 959: `ref={searchResultsRef}` on the `motion.div key="search-results"` scroll container |
| `app/paikat/[id]/page.tsx` | `/?id=${paikka.id}` | "Nayta kartalla" href | WIRED | Line 90: `href={`/?id=${paikka.id}`}` confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Etusivu.tsx` restore effect | `s.scrollTop`, `s.searchHaku`, `s.searchLaji` etc. | `sessionStorage.getItem('etusivu-scroll-state')` written by `handleCardClick` | Yes — captured from live DOM (`searchResultsRef.current.scrollTop`) and React state | FLOWING |
| `Etusivu.tsx` auto-open | `sheetPhase` | Mount effect calling `setSheetPhase('open')` | Yes — changes React state from `'closed'` to `'open'` | FLOWING |
| `SuosikitClient.tsx` back-links | Route destination | `href="/"` | Yes — static correct route | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| NavPill has no nakyma=lista | `grep "nakyma=lista" NavPill.tsx` | No matches | PASS |
| NavPill has no Search import | `grep "Search" NavPill.tsx` | No matches | PASS |
| NavPill has /profiili link | `grep 'href="/profiili"' NavPill.tsx` | Line 57 match | PASS |
| SuosikitClient has zero nakyma=lista | `grep "nakyma=lista" SuosikitClient.tsx` | No matches | PASS |
| SuosikitClient has three href="/" | `grep 'href="/"' SuosikitClient.tsx` | Lines 73, 104, 134 | PASS |
| DiagonaalKortti has onCardClick in interface | `grep "onCardClick" DiagonaalKortti.tsx` | Lines 38, 41, 58 | PASS |
| Etusivu sheetPhase init 'closed' | `grep "sheetPhase.*useState" Etusivu.tsx` | `useState<...>('closed')` line 159 | PASS |
| Etusivu has searchResultsRef ref on motion.div | `grep "ref={searchResultsRef}" Etusivu.tsx` | Line 959 | PASS |
| Etusivu has onCardClick={handleCardClick} on DiagonaalKortti | `grep "onCardClick={handleCardClick}" Etusivu.tsx` | Line 1029 | PASS |
| Etusivu sessionStorage key consistent | `grep "etusivu-scroll-state" Etusivu.tsx` | Lines 243, 290, 292 — write/read/remove consistent | PASS |
| focusId guard on auto-open | `grep "if (!focusId) setSheetPhase" Etusivu.tsx` | Line 393 | PASS |
| removeItem before state setters | Order in restore effect | removeItem at line 292, first setState at line 294 | PASS |

### Probe Execution

No probe scripts declared or conventionally present for this phase. Step 7c: SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| NAV-01 | 20-02-PLAN.md | Back-nav from venue restores scroll + filters | SATISFIED | `handleCardClick` + sessionStorage restore effect in Etusivu.tsx; `onCardClick` wired through DiagonaalKortti |
| NAV-02 | 20-02-PLAN.md | "Nayta kartalla" uses venue coords, no GPS re-centre | SATISFIED | `href="/?id=${paikka.id}"` in paikat/[id]/page.tsx confirmed; focusId effect handles map centering; no new code needed |
| NAV-03 | 20-02-PLAN.md | Homepage loads sheet closed, animates open immediately | SATISFIED | `sheetPhase` init `'closed'`; auto-open mount effect with focusId guard |
| NAV-04 | 20-01-PLAN.md | Toolbar has no Haku/search button | SATISFIED | NavPill.tsx has no Search import, no Haku JSX node, no nakyma=lista |
| NAV-05 | 20-01-PLAN.md | TO DO page back-button goes to valid destination | SATISFIED | All three SuosikitClient back-links are `href="/"` |

All 5 requirements mapped to Phase 20 in REQUIREMENTS.md are covered by the two plan files. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TBD, FIXME, XXX, or other debt markers in any of the four modified files.

### Human Verification Required

#### 1. Bottom Sheet Open Animation (NAV-03)

**Test:** Load the homepage at `/` in a browser  
**Expected:** Bottom sheet starts as a narrow pill at the bottom, then immediately slides up via spring animation (damping 28, stiffness 280, 0.1s delay) to the open state — all without any user tap  
**Why human:** CSS/Framer Motion spring animation feel and timing cannot be verified by grep; requires visual observation

#### 2. Bottom Sheet Stays Closed on /?id=X (NAV-02 + NAV-03 guard)

**Test:** Load `/?id=5` (or any valid venue id) in a browser  
**Expected:** Map centres on the venue; bottom sheet does NOT auto-open; sheet remains in the hidden/pill state; focusId effect handles map centering  
**Why human:** Requires browser URL parameter interaction and visual confirmation of sheet state

#### 3. Back-Navigation Scroll + Filter Restore (NAV-01)

**Test:** Open search overlay on homepage, scroll the list ~300px down, apply at least one filter, tap a DiagonaalKortti card (navigates to /paikat/ID), then tap "Takaisin hakemistoon"  
**Expected:** Lands at `/` with search overlay open, list scrolled to the previous position, and all applied filters restored exactly as before navigation  
**Why human:** Requires full cross-page browser interaction; sessionStorage round-trip is only observable in a live browser

#### 4. "Nayta kartalla" Map Centering (NAV-02)

**Test:** Navigate to any venue detail page at `/paikat/[id]`, tap "Nayta kartalla"  
**Expected:** Navigates to `/?id=[id]`; map pans/zooms to the venue's coordinates; bottom sheet does not pop open; GPS re-centre button does not auto-fire  
**Why human:** Requires live map rendering and GPS state interaction in a browser

### Gaps Summary

No gaps found. All five roadmap success criteria are verified to code-path level. Four human verification items remain for visual/interactive browser confirmation. The implementation is substantive and complete — no stubs, no orphaned artifacts, no broken links detected.

---

_Verified: 2026-05-30T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
