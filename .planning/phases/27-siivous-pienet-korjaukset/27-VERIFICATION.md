---
phase: 27-siivous-pienet-korjaukset
verified: 2026-06-03T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open sheet fully — verify TODO button (top-right fixed) remains visible above the sheet top edge on a small iOS device (e.g. iPhone SE)"
    expected: "The TODO bookmark button is fully visible, not covered by the sheet glass surface"
    why_human: "contentH formula uses fullH which is a runtime value — pixel geometry cannot be verified without rendering on a real device"
  - test: "Tap a CalloutCard (venue name callout visible above a pin at zoom >= 16) and observe whether PaikkaSheet opens immediately or after a delay"
    expected: "Sheet opens with no perceptible delay (no 700ms wait before sheet appears)"
    why_human: "Animation timing requires interactive observation; cannot be verified by static code analysis"
  - test: "Scroll the sheet card list and observe the bottom edge of the list"
    expected: "A gradient fade from transparent to white appears at the bottom of the list, visually indicating more content below"
    why_human: "Visual rendering of CSS gradient overlay requires device/browser inspection"
---

# Phase 27: Siivous & pienet korjaukset — Verification Report

**Phase Goal:** Siivous & pienet korjaukset — clean up dead routes/links and apply 8 targeted UX fixes across navigation, map, search, and sheet interactions.
**Verified:** 2026-06-03
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                       | Status     | Evidence                                                                            |
|----|---------------------------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------------|
| 1  | Visiting /suosikit returns a 404 (route does not exist)                                     | VERIFIED  | `app/suosikit/` directory absent from filesystem; Next.js auto-404s deleted routes |
| 2  | NavBar expanded menu no longer shows a TO DO link                                           | VERIFIED  | NavBar.tsx contains no `suosikit` string; no Bookmark import                       |
| 3  | NavPill expanded menu no longer shows a TO DO link                                          | VERIFIED  | NavPill.tsx contains no `suosikit` string; no Bookmark import; `/profiili` intact  |
| 4  | Supabase suosikit queries in Etusivu.tsx are NOT touched                                    | VERIFIED  | Etusivu.tsx still references `suosikit` table for the TODO overlay                 |
| 5  | The sheet no longer has an "Avaa paikkasivu selaimessa" link at the bottom                  | VERIFIED  | PaikkaSheet.tsx: no "Avaa paikkasivu selaimessa"; `import Link` removed            |
| 6  | CombinedFilterPill container has a visible rgba(0,0,0,0.04) background tint                 | VERIFIED  | Etusivu.tsx line 352: `background: 'rgba(0,0,0,0.04)'` on outer motion.div         |
| 7  | Collapsed search input row has pointer-events:none when search is not active                | VERIFIED  | Etusivu.tsx line 437: `pointerEvents: listOpen ? undefined : 'none'`               |
| 8  | Searching with no results shows nothing — no "Ei tuloksia" and no "Tyhjennä haku"           | VERIFIED  | Neither string found anywhere in Etusivu.tsx                                       |
| 9  | Cluster clicks zoom the map to expansion zoom and pan to center; no popup list              | VERIFIED  | `getClusterExpansionZoom` at line 1086; `expandedCluster` absent; `getLeaves` absent |
| 10 | Gradient fade at bottom of sheet card list (UI-24)                                          | VERIFIED  | Etusivu.tsx line 1522: `linear-gradient(to bottom, transparent, rgba(255,255,255,0.92))` |
| 11 | Sheet max height formula leaves TODO button visible (SHEET-05)                              | VERIFIED  | Etusivu.tsx line 569: `Math.round(Math.min(fullH * 0.82, fullH - 108))`            |
| 12 | CalloutCard tap fast-path skips 700ms animation when already at zoom >= 16 (SHEET-06)       | VERIFIED  | Etusivu.tsx line 1053: `if (zoomRef.current >= 16) { setValittu(p) }`; fallback else at line 1058 |

**Score:** 10/10 truths verified (all PLAN must-haves confirmed; cluster method name deviation is a documented correct fix — see note below)

### Required Artifacts

| Artifact                               | Expected                               | Status    | Details                                                          |
|----------------------------------------|----------------------------------------|-----------|------------------------------------------------------------------|
| `app/suosikit/page.tsx`                | DELETED — must not exist               | VERIFIED  | Directory `app/suosikit/` does not exist on disk                 |
| `app/suosikit/SuosikitClient.tsx`      | DELETED — must not exist               | VERIFIED  | Directory `app/suosikit/` does not exist on disk                 |
| `app/components/NavBar.tsx`            | No href="/suosikit"                    | VERIFIED  | File contains no `suosikit`; Bookmark import removed             |
| `app/components/NavPill.tsx`           | No href="/suosikit"                    | VERIFIED  | File contains no `suosikit`; `/profiili` link intact at line 65  |
| `app/components/PaikkaSheet.tsx`       | No "Avaa paikkasivu selaimessa"        | VERIFIED  | Neither the link text nor `import Link` is present               |
| `app/components/Etusivu.tsx` (Plan 03) | Contains `rgba(0,0,0,0.04)`            | VERIFIED  | Line 352, style on outer CombinedFilterPill motion.div           |
| `app/components/Etusivu.tsx` (Plan 04) | Contains `getClusterExpansionZoom`     | VERIFIED  | Line 1086 — plan specified `getExpansionZoom` (wrong name); executor used correct Supercluster API name (documented deviation in SUMMARY-04) |
| `app/components/Etusivu.tsx` (Plan 05) | Contains `linear-gradient`             | VERIFIED  | Line 1522, gradient fade overlay div                             |

**Note on MAP-16 method name:** PLAN-04 must_have specified `contains: "sc.getExpansionZoom"` but the actual Supercluster API exposes `getClusterExpansionZoom`. The executor auto-fixed this (TypeScript error TS2339) and documented it as a deviation. The behavioral requirement (cluster zoom to expansion level) is fully implemented. The plan artifact spec had an incorrect string literal — this is a plan error, not an implementation gap.

### Key Link Verification

| From                                   | To                              | Via                                              | Status   | Details                                              |
|----------------------------------------|---------------------------------|--------------------------------------------------|----------|------------------------------------------------------|
| NavBar.tsx expanded menu               | removed                         | No `href="/suosikit"` block                      | VERIFIED | Line scan returns zero matches                       |
| NavPill.tsx expanded menu              | removed                         | No `href="/suosikit"` block                      | VERIFIED | Line scan returns zero matches                       |
| PaikkaSheet.tsx bottom                 | removed                         | No "Avaa paikkasivu selaimessa" link             | VERIFIED | Line scan returns zero matches                       |
| CombinedFilterPill outer div           | rgba(0,0,0,0.04) background     | `style={{ ... background: 'rgba(0,0,0,0.04)' }}` | VERIFIED | Line 352 of Etusivu.tsx                              |
| search-expand motion.div               | pointer-events:none when closed | `pointerEvents: listOpen ? undefined : 'none'`   | VERIFIED | Line 437 of Etusivu.tsx                              |
| search results section                 | deleted empty-state             | Simple conditional `&&` (no else branch)         | VERIFIED | Neither "Ei tuloksia" nor "Tyhjennä haku" found       |
| cluster AdvancedMarker onClick         | map zoom via MapClusterZoom     | `sc.getClusterExpansionZoom` + `setClusterZoomTarget` | VERIFIED | Lines 1086-1088; MapClusterZoom wired at line 1130  |
| sheet scroll container sibling        | gradient overlay div            | `position:absolute` div after scroll motion.div  | VERIFIED | Lines 1513-1526 of Etusivu.tsx                       |
| contentH formula                       | capped at fullH - 108           | `Math.min(fullH * 0.82, fullH - 108)`            | VERIFIED | Line 569 of Etusivu.tsx                              |
| CalloutCard onClick                    | immediate setValittu            | `zoomRef.current >= 16` fast path                | VERIFIED | Lines 1053-1060; fallback else branch retained       |

### Data-Flow Trace (Level 4)

Not applicable for this phase — all changes are deletion/cleanup or CSS/interaction fixes with no new data sources.

### Behavioral Spot-Checks

| Behavior                                    | Command                                                                                            | Result                      | Status |
|---------------------------------------------|----------------------------------------------------------------------------------------------------|-----------------------------|--------|
| suosikit route files deleted                | `ls app/suosikit/ 2>/dev/null \|\| echo NOT_FOUND`                                                 | DIRECTORY NOT FOUND         | PASS   |
| NavBar contains no suosikit reference       | grep `suosikit` in NavBar.tsx                                                                      | No matches                  | PASS   |
| NavPill contains no suosikit reference      | grep `suosikit` in NavPill.tsx                                                                     | No matches                  | PASS   |
| PaikkaSheet has no "Avaa paikkasivu"        | grep `Avaa paikkasivu` in PaikkaSheet.tsx                                                          | No matches                  | PASS   |
| Etusivu FILTER-04 tint                      | grep `rgba(0,0,0,0.04)` in Etusivu.tsx                                                             | Line 352 found              | PASS   |
| Etusivu FILTER-05 pointer-events            | grep `pointerEvents.*listOpen` in Etusivu.tsx                                                      | Line 437 found              | PASS   |
| Etusivu SEARCH-01 no Ei tuloksia            | grep `Ei tuloksia` in Etusivu.tsx                                                                  | No matches                  | PASS   |
| Etusivu MAP-16 getClusterExpansionZoom      | grep `getClusterExpansionZoom` in Etusivu.tsx                                                      | Line 1086 found             | PASS   |
| Etusivu MAP-16 expandedCluster absent       | grep `expandedCluster` in Etusivu.tsx                                                              | No matches                  | PASS   |
| Etusivu MAP-16 getLeaves absent             | grep `getLeaves` in Etusivu.tsx                                                                    | No matches                  | PASS   |
| Etusivu UI-24 gradient overlay              | grep `linear-gradient(to bottom, transparent` in Etusivu.tsx                                       | Line 1522 found             | PASS   |
| Etusivu SHEET-05 contentH formula           | grep `Math.min(fullH \* 0.82, fullH - 108)` in Etusivu.tsx                                        | Line 569 found              | PASS   |
| Etusivu SHEET-06 fast path                  | grep `zoomRef.current >= 16` in Etusivu.tsx                                                        | Line 1053 found             | PASS   |
| Etusivu SHEET-06 fallback preserved         | grep `pendingValittuRef.current = p` in Etusivu.tsx                                                | Line 1058 found             | PASS   |

### Probe Execution

No probes defined for this phase. Step 7c: SKIPPED (cleanup/UX-fix phase; no probe scripts declared).

### Requirements Coverage

| Requirement | Source Plan | Description                                                                          | Status       | Evidence                                                  |
|-------------|-------------|--------------------------------------------------------------------------------------|--------------|-----------------------------------------------------------|
| NAV-06      | 27-01       | /suosikit route, components, and nav links removed entirely                          | SATISFIED    | Directory gone; no href in NavBar or NavPill              |
| NAV-07      | 27-01       | TO DO button from toolbar removed                                                    | SATISFIED    | D-04 clarifies this overlaps NAV-06 (same TO DO nav links removed); confirmed absent |
| SHEET-04    | 27-02       | "Avaa paikkasivu selaimessa" link removed from PaikkaSheet                           | SATISFIED    | String absent from PaikkaSheet.tsx; unused Link import also removed |
| FILTER-04   | 27-03       | FilterCarouselPill background tint rgba(0,0,0,0.04)                                  | SATISFIED    | Line 352 Etusivu.tsx                                      |
| FILTER-05   | 27-03       | Hidden search row no longer intercepts map touches                                   | SATISFIED    | Line 437 Etusivu.tsx: pointerEvents conditional           |
| SEARCH-01   | 27-03       | "Ei tuloksia" and "Tyhjennä haku" elements removed from search results               | SATISFIED    | Neither string found in Etusivu.tsx                       |
| MAP-16      | 27-04       | Cluster click zooms map to expansion zoom, no popup list                             | SATISFIED    | getClusterExpansionZoom + MapClusterZoom; expandedCluster gone |
| UI-24       | 27-05       | Gradient fade overlay at bottom of sheet card list                                   | SATISFIED    | Line 1522 Etusivu.tsx: linear-gradient div                |
| SHEET-05    | 27-05       | Sheet max height reduced so TODO button is not covered                               | SATISFIED    | Line 569: Math.min formula; visual confirmation needed    |
| SHEET-06    | 27-05       | CalloutCard tap opens PaikkaSheet immediately at zoom >= 16                          | SATISFIED    | Lines 1053-1060: fast path; latency confirmation needs human |

All 10 requirements assigned to Phase 27 in REQUIREMENTS.md are addressed and verifiably implemented.

### Anti-Patterns Found

| File                             | Line | Pattern                                                                                  | Severity | Impact                                                                 |
|----------------------------------|------|------------------------------------------------------------------------------------------|----------|------------------------------------------------------------------------|
| `app/components/Etusivu.tsx`     | 1053 | `else` branch (pendingValittuRef path) is dead code — outer render guard already ensures `zoomLevel >= 16` | Info | WR-04 in REVIEW.md; not a runtime bug, a maintenance concern; no action required for goal achievement |

No TBD, FIXME, or XXX debt markers found in any file modified by this phase.

**From REVIEW.md (pre-existing issues not introduced by Phase 27):**
- CR-02: `handleOverlayDelete` auth-state staleness — pre-existing logic, not introduced by Phase 27
- WR-01: NavPill still rendered on `/paikat/[id]` alongside Etusivu toolbar — pre-existing, not in scope
- WR-02: NavBar.tsx dead file (not imported anywhere) — pre-existing, noted in CLAUDE.md BottomNav pattern
- WR-03: PaikkaSheet review fetch ignores errors — pre-existing pattern, not introduced by Phase 27
- IN-02: BottomNav.tsx still references deleted `/suosikit` — BottomNav is a documented dead file per CLAUDE.md; not in scope

The MapClusterZoom implementation (line 148) uses `map.moveCamera()` (atomic) + `setTimeout` defer — this correctly addresses the concern raised in REVIEW CR-01 (the review was written against an earlier worktree version before the final master commit).

### Human Verification Required

#### 1. SHEET-05: TODO Button Visibility on Device

**Test:** Open the map view on a small screen device (iPhone SE or equivalent viewport ~375×667). Tap a venue pin to open PaikkaSheet. Let the sheet animate fully open.
**Expected:** The circular TODO/bookmark button (fixed top-right, below the NavPill) is fully visible above the sheet top edge with clear visual separation.
**Why human:** `contentH` is computed as `Math.round(Math.min(fullH * 0.82, fullH - 108))` where `fullH` is set at runtime from `window.innerHeight`. The formula cannot be verified without a real device rendering.

#### 2. SHEET-06: Zero-Delay Sheet Open on CalloutCard Tap

**Test:** Navigate to the map view, zoom into any location until a venue CalloutCard appears (venue name bubble above a pin). Tap the CalloutCard.
**Expected:** PaikkaSheet slides up immediately with no perceptible delay (no 700ms animation wait).
**Why human:** Interaction timing requires live observation; `zoomRef.current >= 16` is almost always true when a CalloutCard is visible, but confirming the UX improvement requires tapping and observing.

#### 3. UI-24: Gradient Fade Visual Appearance

**Test:** Open PaikkaSheet for any venue that has multiple items (hours, price, description, reviews). Scroll partway through the list.
**Expected:** A smooth gradient fade from content to white appears at the bottom of the list, masking the hard clip boundary.
**Why human:** The gradient `div` has `position: absolute` and `zIndex: 2` above the scroll content. Visual appearance depends on browser compositing and actual sheet background colour — the `rgba(255,255,255,0.92)` end-colour must visually match the glass surface.

---

## Gaps Summary

No gaps. All 10 requirements are verifiably implemented in the codebase. The only human-needed items are visual and interactive quality checks (rendering appearance, perceived latency, pixel geometry) that cannot be resolved by static analysis.

---

_Verified: 2026-06-03_
_Verifier: Claude (gsd-verifier)_
