# Phase 28: SVG-ikonit — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 28-SVG-ikonit
**Areas discussed:** Zip file & icon style, lib/sportIcons.ts interface, Migration strategy

---

## Zip file & icon style

| Option | Description | Selected |
|--------|-------------|----------|
| All 9 sports | padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta, kiipeily, jääkiekko | ✓ |
| 7 sports (current set only) | kiipeily and jääkiekko still need fallbacks | |
| Haven't opened it yet | Need to inspect before knowing coverage | |

**User's choice:** Zip has 20+ icons, all 9 app sports covered, extras ignored.
**Notes:** User confirmed all app sports (including kiipeily and jääkiekko) are present.

| Option | Description | Selected |
|--------|-------------|----------|
| Fill-based | Solid shapes | ✓ |
| Stroke-based | Outline style like Lucide | |
| Unknown / mixed | Planner determines from zip | |

**User's choice:** Fill-based icons.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep navy #1e3a8a | Consistent blue pin style | ✓ |
| Sport accent color | Each sport's own color in the pin | |
| Let Claude decide | Planner picks | |

**User's choice:** Keep navy #1e3a8a for map pins.

---

## lib/sportIcons.ts interface

| Option | Description | Selected |
|--------|-------------|----------|
| Inner SVG markup strings | Full content between `<svg>` tags — handles multi-path fill icons | ✓ |
| Path d-strings only | Just the `d` attribute value — breaks if icons have multiple paths | |

**User's choice:** Inner SVG markup strings.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — export SportIcon component | `SportIcon({ laji, size?, className? })` wrapper component | ✓ |
| No — each consumer renders inline | More verbose per-file, pure data lib | |

**User's choice:** Export `SportIcon` React component.

---

## Migration strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Automate zip extraction | Executor unzips, extracts inner SVG, writes to lib/sportIcons.ts | ✓ |
| Manual — user provides paths | Manual extraction before running the phase | |

**User's choice:** Automate it.

| Option | Description | Selected |
|--------|-------------|----------|
| Delete immediately | Remove SPORT_ICONS from lajit.ts atomically | ✓ |
| Re-export as shim | Compatibility re-export (backwards-compat hack) | |

**User's choice:** Delete immediately.

| Option | Description | Selected |
|--------|-------------|----------|
| Split: registry first, then consumers | 2 plans — registry stable before consumer migration | ✓ |
| Single plan | All in one | |

**User's choice:** Split into 2 plans.

---

## Claude's Discretion

- viewBox normalization: assume 24×24 for SportIcon (matches current Lucide usage and SportPin transform math)
- Fallback key in sportIcons.ts: carry over the simple `<circle cx="12" cy="12" r="4"/>` fallback from SportPin's current SPORT_ICONS

## Deferred Ideas

None — discussion stayed within phase scope.
