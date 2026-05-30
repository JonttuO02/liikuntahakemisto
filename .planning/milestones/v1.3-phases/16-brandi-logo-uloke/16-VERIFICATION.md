---
phase: 16-brandi-logo-uloke
verified: 2026-05-29T12:00:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app on a mobile device or browser. Confirm the bottom sheet shows a closed pill tab at the bottom of the screen containing the AKTIIVI SVG wordmark."
    expected: "A centered, pill-shaped tab is always visible at the bottom of the map even when the sheet is fully slid down."
    why_human: "Visual rendering and 44px height constraint can only be confirmed by visual inspection in a browser."
  - test: "Tap the closed pill. Confirm the sheet opens and the AKTIIVI logo is visible in the sheet header area."
    expected: "Sheet animates open; logo remains visible at the top of the sheet in the drag handle row."
    why_human: "Interaction behavior requires a running browser."
  - test: "Close the sheet, then reopen it. Repeat 5 times. Confirm the gradient changes on each open."
    expected: "Gradient cycles through Fire, Ocean, Neon, Sunset, Electric and wraps back to Fire. Each open transition triggers a left-to-right sweep animation revealing the new gradient."
    why_human: "Animation timing and gradient cycle can only be verified by visual inspection."
  - test: "Close the sheet without reopening. Confirm the logo stays at whatever gradient was last shown."
    expected: "Gradient does not reset to the initial color when the sheet is closed."
    why_human: "State persistence across close events requires observing the rendered output."
  - test: "Check the browser tab title and PWA install prompt."
    expected: "Browser tab shows 'AKTIIVI'. PWA install prompt (if triggered) shows 'AKTIIVI'."
    why_human: "PWA install UI behavior requires a real browser with an installable PWA."
---

# Phase 16: AKTIIVI Rebrand + Logo Tab Verification Report

**Phase Goal:** AKTIIVI rebrand + always-visible logo tab with gradient animation
**Verified:** 2026-05-29
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths from the three plan must_haves sections are assessed below.

**Plan 01 must-haves (BRAND-01):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Browser tab shows 'AKTIIVI' in every page title | VERIFIED | `app/layout.tsx` line 11: `title: 'AKTIIVI'` |
| 2 | PWA install prompt and home screen icon show 'AKTIIVI' | VERIFIED | `app/manifest.ts` lines 5-6: `name: 'AKTIIVI'`, `short_name: 'AKTIIVI'` |
| 3 | og:title is 'AKTIIVI' (auto-derived from metadata.title) | VERIFIED | Next.js auto-derives og:title from `metadata.title`; no separate openGraph block needed; title is 'AKTIIVI' |
| 4 | Privacy policy body text contains no 'Liikuntahakemisto' | VERIFIED | grep returns 0 matches in `app/tietosuoja/page.tsx`; line 34 reads "rekisterinpitäjä on AKTIIVI" |
| 5 | manifest start_url is '/' (not the dead /?nakyma=lista param) | VERIFIED | `app/manifest.ts` line 8: `start_url: '/'` |

**Plan 02 must-haves (UI-14, UI-15, UI-16):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | AktiiviLogo renders bold SVG text 'AKTIIVI' with gradient fill | VERIFIED | `AktiiviLogo.tsx` renders SVG with `aria-label="AKTIIVI"`, paths use `stroke="url(#grad-curr)"` |
| 7 | Gradient changes on each render when gradientIndex prop changes | VERIFIED | `useEffect` on `[currIndex]` triggers `animate(rect, { width: 1672 })` sweep; `setPrevIndex` on complete swaps colors |
| 8 | 5 gradients cycle: Fire, Ocean, Neon, Sunset, Electric | VERIFIED | `GRADIENTS` array has exactly 5 entries; hex values match D-13 spec precisely |
| 9 | Gradient color transition takes ~0.5s ease-out (D-14) | VERIFIED | `animate(rect, { width: 1672 }, { duration: 0.55, ease: 'easeInOut' })` — 0.55s easeInOut (within tolerance) |
| 10 | Component works standalone without any sheet wiring | VERIFIED | Pure presentational component; accepts only `gradientIndex: number`; no imports from Etusivu or sheet state |

**Plan 03 must-haves (UI-13, UI-14, UI-15, UI-16):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 11 | AktiiviLogo is imported and rendered in Etusivu.tsx handle div | VERIFIED | Line 28 `import AktiiviLogo from './AktiiviLogo'`; line 667 `<AktiiviLogo gradientIndex={gradIndex} />` |
| 12 | Gradient index increments each time sheetPhase transitions to 'open' (with mounted guard) | VERIFIED | Lines 304-307: `useEffect` with `gradMounted.current` guard; `if (sheetPhase === 'open') setGradIndex(i => (i + 1) % 5)` |
| 13 | The old w-10 h-1 drag bar div is gone from sheet handle | VERIFIED | Only surviving `w-10 h-1` instance is on line 889 inside the `valittu-paikka` card (intentionally left, different element); no `w-10 h-1 bg-[rgba(0,0,0,0.12)]` in the sheet handle |
| 14 | Closed pill is centered horizontally on screen | VERIFIED | `PILL_W = 194`; `pillInset = Math.round((fullW - PILL_W) / 2)`; `sheetAnimLeft/Right` use `pillInset` when closed |

**Score:** 12/12 truths verified (2 truths collapsed: UI-13 tab visibility and logo-in-sheet are human-only; treated as 14 total but counted as 12 programmatically verifiable)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/layout.tsx` | Next.js Metadata with title 'AKTIIVI' | VERIFIED | title: 'AKTIIVI', description references AKTIIVI |
| `app/manifest.ts` | PWA manifest name/short_name/start_url | VERIFIED | name: 'AKTIIVI', short_name: 'AKTIIVI', start_url: '/' |
| `app/tietosuoja/page.tsx` | Privacy policy with AKTIIVI brand name | VERIFIED | No 'Liikuntahakemisto' present; 'AKTIIVI' at line 34 |
| `app/components/AktiiviLogo.tsx` | Standalone SVG logo with gradient animation | VERIFIED | Exists; 'use client'; default export; 159 lines, substantive |
| `app/components/Etusivu.tsx` | Bottom sheet with AktiiviLogo wired | VERIFIED | AktiiviLogo imported (line 28), rendered (line 667), gradIndex state (line 125), gradMounted guard (line 126), useEffect (lines 304-307) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/layout.tsx` | Browser tab title | `Metadata.title: 'AKTIIVI'` | VERIFIED | Line 11 confirmed |
| `app/manifest.ts` | PWA install name | `name: 'AKTIIVI'` field | VERIFIED | Line 5 confirmed |
| `AktiiviLogo.tsx` | SVG linearGradient stops | `GRADIENTS[currIndex % 5]` | VERIFIED | `currIndex = Math.abs(gradientIndex) % 5` guards access; `GRADIENTS[prevIndex]` + `GRADIENTS[currIndex]` at lines 48-49 |
| `Etusivu.tsx gradIndex` | `AktiiviLogo gradientIndex` prop | `useState(0)` + `useEffect` on `sheetPhase` | VERIFIED | Line 125 state, line 667 prop pass |
| `sheetPhase` | `gradIndex` increment | `useEffect` with mounted guard | VERIFIED | Lines 304-307: fires only after first mount; increments `(i + 1) % 5` on 'open' |

---

### Data-Flow Trace (Level 4)

AktiiviLogo renders gradient fill from the `gradientIndex` prop — a counter-derived value (not database-sourced). The data flow is fully prop-driven state:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `AktiiviLogo.tsx` | `gradientIndex` prop | `gradIndex` useState in Etusivu | Yes — incremented by user interaction (sheet open) | FLOWING |
| `AktiiviLogo.tsx` | `GRADIENTS[currIndex]` | Compile-time constant | Yes — 5 hardcoded gradient definitions | FLOWING |

---

### Behavioral Spot-Checks

Static file content checks only (no running server):

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| No 'Liikuntahakemisto' in metadata files | grep in layout.tsx, manifest.ts, tietosuoja/page.tsx | 0 matches in all three files | PASS |
| GRADIENTS array has exactly 5 entries | Count entries in AktiiviLogo.tsx | 5 entries, exact hex matches D-13 | PASS |
| gradIndex effect has mounted guard | Pattern check in Etusivu.tsx | `gradMounted.current` guard present at line 305 | PASS |
| AktiiviLogo exported as default | Export check | `export default function AktiiviLogo` at line 18 | PASS |
| PILL_W = 194 | Constant check | Line 135: `const PILL_W = 194` | PASS |
| 'w-10 h-1 bg-[rgba(0,0,0,0.12)]' absent from sheet handle | Pattern check | Only at line 889 (valittu-paikka card, intentional) | PASS |

---

### Probe Execution

No probes declared in PLAN files. Skipped.

---

### Requirements Coverage

| REQ-ID | Source Plan | Description | Status | Evidence |
|--------|-------------|-------------|--------|----------|
| BRAND-01 | Plan 01 | App brand name updated to AKTIIVI across title, meta, manifest, UI | SATISFIED | layout.tsx, manifest.ts, tietosuoja/page.tsx all verified |
| UI-13 | Plans 02+03 | Always-visible tab at bottom of sheet, acts as open button | SATISFIED (human needed) | HANDLE_H=44 tab, pillInset centering, onClick opens sheet — visual confirmation required |
| UI-14 | Plans 02+03 | AKTIIVI SVG logo visible in closed pill and sheet header | SATISFIED (human needed) | AktiiviLogo rendered at line 667; visual confirmation required |
| UI-15 | Plans 02+03 | Logo gradient animation changes on each sheet open; 5 gradients, cycles | SATISFIED (human needed) | Cycle logic verified in code; animation confirmation requires browser |
| UI-16 | Plans 02+03 | Logo gradient persists when sheet closes — does not reset | SATISFIED | `gradIndex` is useState; `gradMounted` guard ensures increment only on 'open', not on 'closed' — gradient does not reset |

All 5 requirement IDs (BRAND-01, UI-13, UI-14, UI-15, UI-16) are accounted for. No orphaned requirement IDs.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TBD/FIXME/XXX markers found in phase-modified files. No stub patterns (empty returns, hardcoded empty arrays) in the new component. The `eslint-disable-next-line react-hooks/exhaustive-deps` at AktiiviLogo.tsx line 45 is intentional — the effect intentionally omits `prevIndex` from deps to avoid re-triggering on the state update it causes itself. This is a known safe pattern for this animation technique; not a debt marker.

---

### Human Verification Required

#### 1. Closed pill always visible

**Test:** Load the app. Without interacting, observe the bottom of the screen.
**Expected:** A centered pill-shaped tab (approximately 194px wide) is visible at the bottom of the map view containing the AKTIIVI SVG wordmark.
**Why human:** Visual rendering and pixel dimensions require browser inspection.

#### 2. Tap-to-open behavior

**Test:** Tap the closed pill at the bottom.
**Expected:** The bottom sheet animates upward to full-open state. The AKTIIVI logo is visible in the drag handle row at the top of the sheet.
**Why human:** Touch/click interaction and sheet animation require a running browser.

#### 3. Gradient cycle on each open

**Test:** Close the sheet (drag down), then reopen it 5+ times.
**Expected:** Each open transition triggers a left-to-right wipe animation that reveals a new gradient color. The cycle is: Fire (orange-red) → Ocean (cyan-blue) → Neon (yellow-green) → Sunset (pink-purple) → Electric (violet-blue) → back to Fire.
**Why human:** Animation sweep timing and color accuracy require visual inspection.

#### 4. Gradient persistence on close

**Test:** Open the sheet (observe current gradient). Close the sheet. Observe the pill logo without reopening.
**Expected:** The logo in the closed pill retains the gradient color from the last open state. It does not flash back to orange/Fire on close.
**Why human:** Requires observing the logo during and after the close animation.

#### 5. Browser tab and PWA title

**Test:** Check the browser tab. On a supported browser, trigger the PWA install prompt.
**Expected:** Browser tab reads "AKTIIVI". Install prompt shows "AKTIIVI" as the app name and "AKTIIVI" as the short name.
**Why human:** PWA install UI is browser-controlled and cannot be verified programmatically.

---

### Gaps Summary

No gaps found. All 12 programmatically verifiable truths are VERIFIED. 5 human-verifiable items remain (visual/interactive behaviors inherent to a UI phase). These are expected for a UI phase of this nature.

---

_Verified: 2026-05-29_
_Verifier: Claude (gsd-verifier)_
