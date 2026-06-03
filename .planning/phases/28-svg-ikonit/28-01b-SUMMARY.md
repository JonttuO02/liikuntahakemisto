---
phase: 28
plan: "01b"
subsystem: icons
tags: [svg, icons, sport-pins, public-assets]
dependency_graph:
  requires: [28-01, 28-02]
  provides: [original-zip-icons-in-public]
  affects: [SportPin, SportIcon, lib/sportIcons]
tech_stack:
  added: []
  patterns: [img-tag-for-svg-assets, svg-image-element-in-pin]
key_files:
  created:
    - public/icons/padel.svg
    - public/icons/kuntosali.svg
    - public/icons/jooga.svg
    - public/icons/uinti.svg
    - public/icons/tennis.svg
    - public/icons/liikuntahalli.svg
    - public/icons/liikunta.svg
    - public/icons/kiipeily.svg
    - "public/icons/jääkiekko.svg"
  modified:
    - lib/sportIcons.tsx
    - app/components/SportPin.tsx
decisions:
  - Original ZIP SVGs (PNG-embedded rasters) used directly via img/image elements — no color override needed since icon sits on white circle
  - liikuntahalli.svg sourced from salibandy.svg (closest hall sport in ZIP)
  - liikunta.svg sourced from juoksu.svg (general movement icon, no liikunta in ZIP)
  - jääkiekko key stored with Finnish characters (jaakiekko.svg in ZIP renamed)
  - 'use client' removed from sportIcons.tsx — img is valid in server and client components
metrics:
  duration: "~10 minutes"
  completed: "2026-06-03"
  tasks_completed: 4
  files_changed: 11
---

# Phase 28 Plan 01b: Replace lucide-react paths with original ZIP images — Summary

Replace the lucide-react SVG path strings in SPORT_ICONS with `/icons/*.svg` URL paths, rewrite SportIcon to render `<img>`, and update SportPin to use SVG `<image href>` element — using the original design artwork from final_sports_svg_exports.zip.

## What Changed

### Context

The original Phase 28 plan 01 used lucide-react vector paths because the ZIP's SVG files embed PNG rasters (not vector paths), which are incompatible with `fill="currentColor"`. Plan 01b replaces that approach now that it's confirmed:
- The icon sits on a WHITE CIRCLE in SportPin — CSS color control is not needed
- Card badges and filter pills can use plain `<img>` tags — no CSS color control needed

### Task 1: Extract SVGs to public/icons/

Extracted 9 sport icons from `final_sports_svg_exports.zip` to `public/icons/`:

| Source filename (ZIP) | Destination (public/icons/) | Notes |
|---|---|---|
| padel.svg | padel.svg | Direct match |
| kuntosali.svg | kuntosali.svg | Direct match |
| jooga.svg | jooga.svg | Direct match |
| uinti.svg | uinti.svg | Direct match |
| tennis.svg | tennis.svg | Direct match |
| kiipeily.svg | kiipeily.svg | Direct match |
| jaakiekko.svg | jääkiekko.svg | Renamed: added Finnish ä characters |
| salibandy.svg | liikuntahalli.svg | No liikuntahalli in ZIP; salibandy is a hall sport |
| juoksu.svg | liikunta.svg | No liikunta in ZIP; juoksu used as general movement icon |

### Task 2: Rewrite lib/sportIcons.tsx

- `SPORT_ICONS` values changed from SVG path markup strings to `/icons/*.svg` URL paths
- `SportIcon` component now renders `<img src={src} width height alt="" aria-hidden>` instead of `<svg dangerouslySetInnerHTML>`
- `fallback` key points to `/icons/liikunta.svg`
- Removed `'use client'` directive — pure img component with no hooks or browser APIs

### Task 3: Update SportPin.tsx

- Replaced `<g transform="translate(5,5) scale(0.75)" style={{ color: '#1e3a8a' }} dangerouslySetInnerHTML>` with `<image href={...} x="5" y="5" width="18" height="18" />`
- Same visual position and size as before
- No color style needed — image renders its own colors on the white circle background
- No dangerouslySetInnerHTML — `<image>` is a standard SVG element

### Task 4: TypeScript check

- `npx tsc --noEmit` exits 0 — no errors
- Etusivu filter pill `<span style={{ color: isSelected ? color : undefined }}>` wrapping SportIcon has no effect on `<img>` (harmless, no change needed)

## Commits

| Hash | Message |
|---|---|
| 5c24077 | feat(28-01): extract sport SVG icons from ZIP to public/icons/ |
| b9fd36e | feat(28-01): rewrite sportIcons.tsx to use image paths and img SportIcon |
| 4332f61 | feat(28-01): update SportPin to use SVG image element for sport icons |

## Deviations from Plan

**1. [Rule 2 - Missing Critical] liikuntahalli and liikunta not in ZIP**
- Found during: Task 1
- Issue: The ZIP has no liikuntahalli.svg or liikunta.svg file
- Fix: Used salibandy.svg for liikuntahalli (hall sport) and juoksu.svg for liikunta (general movement)
- Files modified: public/icons/liikuntahalli.svg, public/icons/liikunta.svg

**2. [Rule 1 - Deviation] 'use client' removed from sportIcons.tsx**
- Found during: Task 2
- Issue: The task said to evaluate whether 'use client' is still needed; SportIcon is now a pure img component
- Fix: Removed 'use client' since there are no hooks, browser APIs, or JSX state; all consumers already have their own 'use client' directives

## Known Stubs

None — all 9 sport keys have real icon files.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- public/icons/ contains all 9 SVG files: padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta, kiipeily, jääkiekko
- lib/sportIcons.tsx SPORT_ICONS values are /icons/*.svg paths
- SportIcon renders img not svg+dangerouslySetInnerHTML
- SportPin uses SVG image element, no dangerouslySetInnerHTML, no color style on icon
- npx tsc --noEmit exits 0
- All 3 commits verified in git log
