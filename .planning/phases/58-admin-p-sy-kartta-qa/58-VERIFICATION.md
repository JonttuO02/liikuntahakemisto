---
phase: 58-admin-p-sy-kartta-qa
verified: 2026-06-25T00:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "The Sijainti map centers on the venue's latitude/longitude at fixed zoom 15"
    reason: "Plan's literal text specified a static fixed zoom 15 with a simple click-toggle. During the blocking human-verify checkpoint, the operator explicitly requested the implementation instead match the main map's (Etusivu.tsx) actual zoom-threshold pin/CalloutCard behavior (zoom 15 initial view, auto-zoom to 16 on pin click to reveal the card at street level) — this is consistent with ADMIN-07's own REQUIREMENTS.md wording ('sama pinni/CalloutCard/zoomaus kuin pääsivun kartalla' — same pin/CalloutCard/ZOOM as the main map) and D-07's 'Initial view' framing. The final behavior was live-approved by the operator in conversation (commits 3bd2188, b7e9b42, a537dba, ec6dbe8), not captured in any file but per task instructions this is treated as the human-verify gate having passed.
    accepted_by: "Joona Orava (live conversation, relayed via task instructions)"
    accepted_at: "2026-06-25"
re_verification: null
---

# Phase 58: Admin venue-location map (admin-p-sy-kartta-qa) Verification Report

**Phase Goal:** Add a read-only "Sijainti" (location) map section to the admin application detail page (`app/admin/[id]/page.tsx`) so the admin can visually verify a venue's pin position before approving/rejecting it (ADMIN-07).
**Verified:** 2026-06-25
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Admin detail page (`/admin/[id]`) shows a new "Sijainti" section above other preview sections | VERIFIED | `app/admin/[id]/page.tsx:192` — `<SectionLabel>Sijainti</SectionLabel>` appears at line 192, before `Diagonaalikortti` (line 234) and `Profiilisivu` (line 239). The plan's original "Listakortti" section was removed entirely (operator-approved, SUMMARY Deviation #3) since it became redundant with the map's own CalloutCard — so "Sijainti" is unambiguously first. |
| 2 | The Sijainti map centers on the venue's latitude/longitude at zoom matching the main map's interaction model | PASSED (override) | `defaultCenter={{ lat: paikka.latitude, lng: paikka.longitude }}`, `defaultZoom={15}` (line 197-200). On pin click the map auto-zooms to 16 via `AdminCardZoom`, mirroring `Etusivu.tsx`'s `zoomLevel >= 16` pin/card threshold (Etusivu.tsx:810). Deviates from the plan's literal "fixed zoom 15, simple toggle" text but matches ADMIN-07's REQUIREMENTS.md wording ("sama ... zoomaus kuin pääsivun kartalla") and was live-approved by the operator (see override above). |
| 3 | The map is zoomable and pannable via standard Google Maps gestures (not a static image) | VERIFIED | `gestureHandling="greedy"` (line 202); no `fitBounds` or static-image rendering anywhere in the file (`grep fitBounds` = no matches). |
| 4 | Clicking the SportPin reveals the CalloutCard popup | VERIFIED | `onClick={() => setAutoZoomTarget({ lat: paikka.latitude!, lng: paikka.longitude! })}` on the SportPin wrapper (line 212) triggers `AdminCardZoom`, which animates zoom to ≥16; `zoomLevel >= 16` then renders `<CalloutCard ... />` instead of `<SportPin .../>` (lines 209-225). |
| 5 | Clicking the CalloutCard does nothing — no navigation, no PaikkaSheet, no action (D-08) | VERIFIED | `<CalloutCard p={{ ...paikka, latitude: paikka.latitude, longitude: paikka.longitude }} />` (line 222) has NO `onClick` prop and no wrapping click handler — confirmed by source inspection of lines 216-224. Contrast with `Etusivu.tsx:911`, which wraps its CalloutCard render in a clickable element that opens `PaikkaSheet`; no equivalent exists in the admin page. No `pointer-events-none` was added either (matches plan prohibition). |

**Score:** 5/5 truths verified (0 present-behavior-unverified; 1 PASSED via override)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/admin/[id]/page.tsx` | New "Sijainti" map section rendering Map + AdvancedMarker + SportPin + CalloutCard | VERIFIED | Contains "Sijainti" (line 192); section is substantive (not a stub) — includes full Map/AdvancedMarker/SportPin/CalloutCard composition plus a custom `AdminCardZoom` animation helper (lines 197-300). |
| `app/components/CalloutCard.tsx` | Reused as-is per plan; modified for a shared shadow-rendering bugfix | VERIFIED | Modified to switch outer `.glass` shadow from `box-shadow` to `filter: drop-shadow(...)` (lines 162-165) so it follows the `clip-path` notch silhouette — a disclosed, narrowly-scoped fix that also benefits the main map (latent bug, not a behavior change). No `pointer-events-none` or onClick was added to this component. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `app/admin/[id]/page.tsx` | `@vis.gl/react-google-maps` | import of `Map` and `AdvancedMarker` | WIRED | Line 6: `import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'`. Both used: `Map` at line 197, `AdvancedMarker` at line 207. |
| `app/admin/[id]/page.tsx` | `app/components/SportPin.tsx` | SportPin import and render inside AdvancedMarker | WIRED | Line 9 import; rendered at line 213 inside the `AdvancedMarker` (line 207), conditional on `zoomLevel < 16`. |
| `app/admin/[id]/page.tsx` | `app/components/CalloutCard.tsx` | CalloutCard import, rendered with NO onClick wrapper | WIRED | Line 10 import; rendered at line 222 with no onClick on the element or its wrapper div (line 221) — confirmed read-only per D-08. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| Sijainti map | `paikka.latitude` / `paikka.longitude` | `link.liikuntapaikat` from `/api/admin/applications/[id]` fetch (lines 53-58, 110) | Yes — real DB-backed venue data fetched per-application, narrowed by `paikka.latitude != null && paikka.longitude != null` guard (line 190) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| TypeScript compiles cleanly (confirms lat/lng non-null narrowing is correctly typed) | `npx tsc --noEmit -p tsconfig.json` | No output / exit 0 | PASS |
| Commits referenced in SUMMARY actually exist and touch the claimed files | `git log --oneline -5 -- "app/admin/[id]/page.tsx" "app/components/CalloutCard.tsx"` | `ec6dbe8`, `a537dba`, `b7e9b42`, `3bd2188` all present, matching SUMMARY's Task Commits list | PASS |
| No `fitBounds` / auto-fit-bounds logic exists (D-06/plan prohibition) | `grep -n "fitBounds" "app/admin/[id]/page.tsx"` | No matches | PASS |
| Exactly one `AdvancedMarker` element rendered (no `.map()` over a collection) | `grep -c "AdvancedMarker"` + manual read | 1 JSX instance (open/close tag + import reference) | PASS |
| CalloutCard has no onClick prop or wrapper | source inspection, lines 216-224 | No `onClick`, no `pointer-events-none` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| ADMIN-07 | 58-01-PLAN.md | Admin detail page shows venue location on its own map, same pin/CalloutCard/zoom as main map, fully visual (pin click shows CalloutCard but doesn't open venuepage) | SATISFIED | All 5 observable truths above verified; REQUIREMENTS.md wording ("sama pinni/CalloutCard/zoomaus kuin pääsivun kartalla... pinin klikkaus näyttää CalloutCardin, mutta ei avaa venuepagea") matches the implemented zoom-driven pin/card transition and the no-op CalloutCard click. |

No orphaned requirements — REQUIREMENTS.md maps only ADMIN-07 to Phase 58 (ADMIN-06 and QA-01 were explicitly dropped during Phase 58 discussion, tracked at REQUIREMENTS.md lines 12-13, 78-79).

**Note (non-blocking, bookkeeping):** `.planning/REQUIREMENTS.md` line 14 still shows ADMIN-07's checkbox as `[ ]` (unchecked) and `.planning/STATE.md` still shows Phase 58 as "EXECUTING" — these are tracking-file updates that normally follow a passing verification and are not a code-level gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/admin/[id]/page.tsx` | — | None found (no TODO/FIXME/HACK/PLACEHOLDER markers, no empty handlers, no hardcoded-empty stub data) | — | — |
| `app/components/CalloutCard.tsx` | — | None found in the modified shadow-handling code | — | — |

No debt markers, no stub implementations, no disconnected props.

### Human Verification Required

None outstanding. The plan's single `checkpoint:human-verify` task (Task 2) was the gating mechanism for this phase's two highest-risk behaviors — the D-08 read-only CalloutCard and the D-06/D-07 zoom/pan interaction — and per the verification task instructions, the operator approved the final live behavior in conversation across iterative fix rounds (commits 3bd2188 → b7e9b42 → a537dba → ec6dbe8). That approval is treated as the human-verify gate having passed; it is not re-flagged here.

### Gaps Summary

No gaps. All 5 observable truths derived from the plan's `must_haves.truths` and the ROADMAP's 3 success criteria are verified in the codebase. One truth (zoom behavior) required an explicit override because the live-approved implementation deviated from the plan's literal "fixed zoom 15, simple click-toggle" text in favor of matching the main map's actual zoom-threshold interaction — this is consistent with ADMIN-07's own requirement wording and was an operator-driven, disclosed scope refinement (SUMMARY Deviation #1), not an unauthorized shortcut. TypeScript compiles cleanly, all key links are wired, no anti-patterns or debt markers were found in the modified files, and the commit history corroborates the SUMMARY's account of the iterative human-verify cycle.

---

_Verified: 2026-06-25_
_Verifier: Claude (gsd-verifier)_
