# Phase 7: Map Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 07-map-infrastructure
**Areas discussed:** Pin visual design, Re-center button, mapId env handling

---

## Pin visual design

| Option | Description | Selected |
|--------|-------------|----------|
| Keep SVG teardrop via `<img>` | Wrap existing pinUrl() SVG as `<img>` inside AdvancedMarker. Zero visual change. | |
| HTML/CSS with Lucide icons | Build `<div style={{ background: color }}>` with React Lucide icon inside AdvancedMarker. | ✓ (initial) |
| vis.gl `<Pin>` component | Built-in Pin with custom color. Loses sport icon. | |

**User's choice (corrected):** User initially selected "HTML/CSS with Lucide icons" but then provided critical context: a previous AdvancedMarker migration attempt destroyed the map visuals. The explicit instruction was to keep `pinUrl()` unchanged and use its SVG as `<img>` inside AdvancedMarker — no visual change to pins.

**Notes:** User has two Map IDs (day and night) already created in Google Cloud Console.

---

## GPS marker (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, migrate to AdvancedMarker | Render as HTML div with blue ring + circle, same visual. | ✓ |
| Keep as legacy Marker | Don't migrate GPS marker. Mixing Marker + AdvancedMarker risks z-index issues. | |

**User's choice:** Migrate to AdvancedMarker (recommended).

---

## Map Styling — Day/Night Map IDs

| Option | Description | Selected |
|--------|-------------|----------|
| Two env vars, mapId switches on isDark | NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY + _NIGHT. `<Map mapId={isDark ? NIGHT : DAY}>`. MapStyleController removed. | ✓ |
| One Map ID, keep setOptions({ styles }) | Single mapId, MapStyleController remains. Google doesn't guarantee this works reliably when mapId is set. | |

**User's choice:** Two env vars, dynamic mapId (recommended).

---

## mapId env handling

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript-assert, let undefined through | No fallback. Google Maps console warning if missing. Fail dev-visibly. | ✓ |
| Explicit console.error in dev mode | Log error in development when mapId missing. | |

**User's choice:** Let undefined flow through (recommended).

---

## Re-center button — placement

| Option | Description | Selected |
|--------|-------------|----------|
| Fullscreen only, top-left after night toggle | Groups controls top-left: [Night toggle] [Re-center]. | |
| Fullscreen only, bottom-right floating | iOS-native style position. Separate from top controls. | ✓ |
| Both preview and fullscreen | Doesn't make sense for non-interactive preview. | |

**User's choice:** Bottom-right floating (fullscreen only).

---

## Re-center button — GPS unavailable behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silent no-op | Does nothing if coords is null. No error. | ✓ |
| Button hidden when GPS unavailable | Conditional render based on coords !== null. | |
| Show toast/message | "Sijaintia ei saatavilla". Needs toast system. | |

**User's choice:** Silent no-op (recommended).

---

## Re-center button — icon and visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Lucide Locate, always visible | Standard location icon. Always shown, silent no-op if no GPS. | ✓ |
| Lucide Crosshair, visible only when GPS available | Cleaner but requires conditional render. | |

**User's choice:** Locate icon, always visible (recommended).

---

## Claude's Discretion

- Pin shape (circle vs teardrop) — overridden by user explicit instruction to keep pinUrl() SVG unchanged
- Whether to delete `DAY_MAP_STYLES`, `NIGHT_MAP_STYLES` from `lib/mapStyles.ts`
- Whether to delete `userLocationPinUrl()` from `lib/sportPins.ts` after migration
- Exact bottom offset for re-center button to avoid overlapping filter pills

## Deferred Ideas

- GPS accuracy ring — Phase 8 (MAP-05)
- Zoom-based pin→card transformation — Phase 8 (MAP-06)
- In-app map focus from venue detail page — Phase 8 (MAP-07)
