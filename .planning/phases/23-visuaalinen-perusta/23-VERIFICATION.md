---
phase: 23-visuaalinen-perusta
verified: 2026-06-01T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Bottom sheet logo is redesigned and visible in the app (UI-23)"
    status: failed
    reason: "AktiiviLogo.tsx was redesigned correctly but is imported nowhere in the application. The bottom sheet in Etusivu.tsx still renders a static inline SVG logo watermark (lines 906-933) with stroke='#000000' and no animation. The redesigned component is completely orphaned — not imported in Etusivu.tsx, PaikkaSheet.tsx, or any other component."
    artifacts:
      - path: "app/components/AktiiviLogo.tsx"
        issue: "Component exists and meets design spec (grad-blue, runLoop, height 32) but is not wired into any consumer component."
      - path: "app/components/Etusivu.tsx"
        issue: "Still renders static inline SVG watermark at lines 906-933 (stroke='#000000', no animation). AktiiviLogo is neither imported nor used."
    missing:
      - "Add 'import AktiiviLogo from './AktiiviLogo'' to Etusivu.tsx (or the appropriate sheet host component)"
      - "Replace the static inline SVG logo watermark block (lines 906-933 in Etusivu.tsx) with <AktiiviLogo /> or integrate the component into the bottom sheet handle area"
---

# Phase 23: Visuaalinen Perusta Verification Report

**Phase Goal:** Karttapinnit nayttavat sporttiselta sinisella liukuvarilla ja animaatiolla; sovelluksen fontti on Outfit ja bottom sheet -logo on uudistettu
**Verified:** 2026-06-01
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                              | Status     | Evidence                                                                                   |
|----|------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------|
| 1  | Application loads with Outfit font for all body/UI text (UI-22)                    | VERIFIED   | `app/layout.tsx` imports `Outfit` from `next/font/google`, bound to `--font-sans`. No `Inter` present. |
| 2  | All single-venue map pins render blue gradient inline HTML (MAP-11)                | VERIFIED   | `<SportPin>` used at Etusivu.tsx:594. SportPin renders a div with `linear-gradient(to bottom, #38bdf8 0%, #0284c7 100%)`, white circle, sport icon with `currentColor`. |
| 3  | Orbit glint CSS animation runs on all pins (MAP-12)                                | VERIFIED   | `@keyframes spinOrbit` + `.pin-glint` in `app/globals.css:113-131`. `pin-glint` div present in SportPin.tsx and cluster inline HTML. |
| 4  | Cluster pins render blue gradient inline HTML with count label (MAP-13)             | VERIFIED   | Etusivu.tsx:628-641 — inline div cluster with `#38bdf8` gradient, white circle, `#0284c7` count label, `pin-glint` div. No `clusterPinUrl` remaining. |
| 5  | Bottom sheet logo is redesigned and visible with blue animation (UI-23)             | FAILED     | AktiiviLogo.tsx redesigned (grad-blue, runLoop, height 32) but NOT imported anywhere. Etusivu.tsx still uses static inline SVG watermark (lines 906-933) with no animation. |

**Score:** 4/5 truths verified

---

### Required Artifacts

| Artifact                           | Expected                                           | Status      | Details                                                                 |
|------------------------------------|----------------------------------------------------|-------------|-------------------------------------------------------------------------|
| `app/layout.tsx`                   | Outfit loaded, --font-sans, no Inter               | VERIFIED    | Outfit imported, `outfit.variable` on html className, Playfair retained |
| `app/components/AktiiviLogo.tsx`   | Blue sweep auto-loop, 32px, no external props      | ORPHANED    | Component is correct but not used anywhere in the app                   |
| `app/components/SportPin.tsx`      | Inline HTML pin, blue gradient, currentColor icons | VERIFIED    | All acceptance criteria met; no import from sportPins.ts                |
| `app/globals.css`                  | @keyframes spinOrbit + .pin-glint class            | VERIFIED    | Both present at lines 113-131, outside @layer blocks                    |
| `app/components/Etusivu.tsx`       | SportPin wired, cluster inline HTML, AktiiviLogo wired | PARTIAL | SportPin wired (line 594), cluster wired (lines 628-641); AktiiviLogo NOT imported |
| `lib/sportPins.ts`                 | Legacy functions removed, export {} remains        | VERIFIED    | 2 lines: comment + `export {}`                                          |

---

### Key Link Verification

| From                           | To                              | Via                             | Status      | Details                                                    |
|--------------------------------|---------------------------------|---------------------------------|-------------|-----------------------------------------------------------|
| `app/layout.tsx`               | html element className          | `outfit.variable`               | WIRED       | `cn('font-sans', outfit.variable, playfair.variable)` confirmed |
| `app/components/SportPin.tsx`  | `app/globals.css`               | `.pin-glint` class + spinOrbit  | WIRED       | Class used in SportPin.tsx:77, keyframes confirmed in CSS  |
| `app/components/Etusivu.tsx`   | `app/components/SportPin.tsx`   | `import SportPin` + JSX usage   | WIRED       | import at line 20, `<SportPin>` at line 594               |
| Etusivu.tsx cluster            | inline div cluster element      | blue gradient div replacing img | WIRED       | Lines 628-641, `#38bdf8` confirmed, `pin-glint` confirmed  |
| `app/components/AktiiviLogo.tsx` | Etusivu.tsx bottom sheet      | import + JSX usage              | NOT_WIRED   | AktiiviLogo not imported in Etusivu.tsx or any other file  |

---

### Data-Flow Trace (Level 4)

| Artifact              | Data Variable | Source                   | Produces Real Data | Status    |
|-----------------------|---------------|--------------------------|--------------------|-----------|
| `SportPin.tsx`        | `laji` prop   | Etusivu.tsx → Supabase   | Yes                | FLOWING   |
| `AktiiviLogo.tsx`     | (self-contained auto-loop) | internal useEffect | N/A — component not mounted | DISCONNECTED (orphaned) |

---

### Behavioral Spot-Checks

| Behavior                                      | Command                                                                                                      | Result                  | Status |
|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------|-------------------------|--------|
| layout.tsx has no Inter import                | `node -e "const c=require('fs').readFileSync('app/layout.tsx','utf8');console.log(!c.includes('Inter'))"`   | `true`                  | PASS   |
| AktiiviLogo.tsx has grad-blue + runLoop       | node check (see automation output)                                                                           | All patterns confirmed  | PASS   |
| SportPin.tsx has blue gradient + currentColor | node check                                                                                                   | All patterns confirmed  | PASS   |
| globals.css has spinOrbit + .pin-glint        | node check                                                                                                   | Both present            | PASS   |
| Etusivu.tsx has NO AktiiviLogo import         | `grep -r "AktiiviLogo" app/` → only AktiiviLogo.tsx itself                                                  | Not imported anywhere   | FAIL   |
| TypeScript: `npx tsc --noEmit`                | runs cleanly                                                                                                 | No output = no errors   | PASS   |

---

### Probe Execution

No probe scripts declared or found for this phase. Step 7c: SKIPPED (no probe scripts).

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                         | Status       | Evidence                                                   |
|-------------|-------------|---------------------------------------------------------------------|--------------|------------------------------------------------------------|
| UI-22       | 23-01-PLAN  | Outfit font replacing Inter, --font-sans preserved                   | SATISFIED    | `app/layout.tsx` — Outfit imported, Inter absent           |
| UI-23       | 23-02-PLAN  | Bottom sheet logo redesigned with blue sweep auto-loop animation     | BLOCKED      | AktiiviLogo.tsx redesigned correctly but not wired into app |
| MAP-11      | 23-03, 23-04-PLAN | Blue gradient inline HTML pins (single venue)               | SATISFIED    | SportPin.tsx wired in Etusivu.tsx                          |
| MAP-12      | 23-03-PLAN  | CSS orbit animation (transform only) on all pins                     | SATISFIED    | spinOrbit keyframes + .pin-glint in globals.css, used in pins |
| MAP-13      | 23-04-PLAN  | Cluster pins with blue theme and count label                         | SATISFIED    | Inline cluster HTML at Etusivu.tsx:628-641                 |

---

### Anti-Patterns Found

| File                              | Line    | Pattern                              | Severity | Impact                                                  |
|-----------------------------------|---------|--------------------------------------|----------|---------------------------------------------------------|
| `app/components/Etusivu.tsx`      | 906-933 | Static inline SVG logo watermark     | WARNING  | Old static logo not replaced; the redesigned AktiiviLogo is not rendered anywhere |
| `app/components/AktiiviLogo.tsx`  | —       | Exported component, zero importers   | BLOCKER  | UI-23 goal not visible to users; component is dead code until wired |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files.

---

### Human Verification Required

None required for automated checks. The glint animation and Outfit font rendering are visual — they are confirmed via code inspection at the code level. Only the AktiiviLogo wiring gap (above) blocks the phase.

---

## Gaps Summary

**One blocker prevents full goal achievement.**

UI-23 is the gap: the AktiiviLogo.tsx component was redesigned exactly as specified (32px height, single grad-blue gradient, self-contained `runLoop()` auto-loop, no props, `sweep-clip` clipPath, `#38bdf8` → `#0284c7`). However, the executor did not wire it into Etusivu.tsx. The bottom sheet still renders the original static inline SVG logo watermark at lines 906-933 of Etusivu.tsx (all paths with `stroke="#000000"`, no animation, `opacity: 0.08` watermark treatment). The redesigned component exists at `app/components/AktiiviLogo.tsx` but is imported nowhere.

The HANDOFF.json from an earlier phase (Phase 16) notes that "Wire AktiiviLogo into Etusivu bump — REVERTED this session" — which shows this exact wiring has historically been attempted and reverted. The Phase 23 executor rebuilt the component itself but did not complete the Etusivu wiring step described in the phase goal and UI-23 requirement.

**Fix required:** Import `AktiiviLogo` in `Etusivu.tsx` (or the component that hosts the bottom sheet handle area) and replace or supplement the static SVG watermark block (lines 906-933) with `<AktiiviLogo />` so the blue sweep animation is visible to users.

All other goals (MAP-11, MAP-12, MAP-13, UI-22) are fully achieved and correctly wired.

---

_Verified: 2026-06-01_
_Verifier: Claude (gsd-verifier)_
