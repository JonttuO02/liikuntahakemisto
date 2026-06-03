# Phase 27: Siivous & pienet korjaukset — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 27-siivous-pienet-korjaukset
**Areas discussed:** MAP-16 cluster zoom, FILTER-05 ghost fix, UI-24 card list fade, SHEET-05 + 06 sheet position & delay

---

## MAP-16 — Cluster zoom behavior

| Option | Description | Selected |
|--------|-------------|----------|
| getExpansionZoom + panTo | Use sc.getExpansionZoom(clusterId) for target level, then map.setZoom + map.panTo | |
| map.setZoom(currentZoom + 2) | Increment zoom by 2 toward cluster center | |
| Changed design | All clusters zoom in; popup list removed for ALL cluster types | ✓ |

**User's choice:** Free text — user changed the design: ALL clusters zoom in (no popup list for any). Same-coordinate venues are handled by individual pins at max zoom.

**Sub-question — zoom method:**

| Option | Description | Selected |
|--------|-------------|----------|
| getExpansionZoom + panTo (Recommended) | sc.getExpansionZoom(clusterId) → map.setZoom + map.panTo | ✓ |
| map.setZoom(currentZoom + 2) | Fixed increment | |

**Notes:** The expandedCluster popup state and all related JSX are to be removed entirely. No popup for any cluster type.

---

## FILTER-04 + FILTER-05 — Ghost element & pill background

**FILTER-05 symptom:**

| Option | Description | Selected |
|--------|-------------|----------|
| Pill blocks touch area when search closed | fix with pointer-events:none | ✓ |
| Search input visually overlapping | Conditional DOM render | |
| Not sure | Let agent investigate | |

**User's choice:** "Yes — the pill itself takes up touch area even when search is closed"

**FILTER-04 background:**

| Option | Description | Selected |
|--------|-------------|----------|
| Additional background on top of glass (Recommended) | Keep .glass + add rgba(0,0,0,0.04) tint | |
| Replace glass | Remove .glass, use only gray background | |
| .glass already removed | Add rgba(0,0,0,0.04) directly | ✓ |

**User's choice:** ".glass class has already been removed from the pill" — apply rgba(0,0,0,0.04) directly to container.

---

## UI-24 — Card list fade

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute gradient overlay (Recommended) | position:absolute div at bottom, cards scroll under it | ✓ |
| CSS mask-image | mask-image on scroll container | |
| Padding + clipping | No visual fade, just bottom padding | |

**User's choice:** Absolute gradient overlay (recommended)

**Fade color:**

| Option | Description | Selected |
|--------|-------------|----------|
| Transparent to white (#ffffff) | Standard | |
| Transparent to sheet's background | Match exact background color | ✓ |

**Notes:** Match the scroll container's exact background color, not hardcoded white.

---

## SHEET-05 + SHEET-06 — Sheet position & opening delay

**SHEET-05:**

| Option | Description | Selected |
|--------|-------------|----------|
| Sheet starts lower — reduce max open height | Leave space for TODO button top-right | ✓ |
| Sheet doesn't cover button's corner | Right-side padding/inset | |
| Let planner decide | Agent inspects pixel values | |

**User's choice:** Sheet starts lower — reduce max open height so TODO button is visible.

**SHEET-06:**

| Option | Description | Selected |
|--------|-------------|----------|
| There's a setTimeout | Remove or shorten delay | |
| Animation feels slow | Shorten duration/ease | |
| Not sure — investigate | Agent traces click handler path | ✓ |

**User's choice:** Not sure — agent should investigate and fix whatever causes the delay.

---

## Claude's Discretion

- SHEET-06 root cause investigation — agent decides the fix approach after tracing the code path.

## Deferred Ideas

None — discussion stayed within phase scope.
