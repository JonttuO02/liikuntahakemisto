# Phase 16: Brändi & Logo-uloke — Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebrand the app from "Liikuntahakemisto" to "AKTIIVI" across all metadata surfaces (browser title, og:title, meta description, manifest.json, privacy policy), AND build an always-visible animated SVG logo tab at the top of the bottom sheet that opens the sheet on tap and cycles through 5 sporty gradient colors on each open.

</domain>

<decisions>
## Implementation Decisions

### Brand Rename
- **D-01:** Update ALL occurrences of "Liikuntahakemisto" to "AKTIIVI" — including `app/layout.tsx` title/description, `app/manifest.ts` name/short_name, and the `app/tietosuoja/page.tsx` privacy policy body text (legal entity name also updated to AKTIIVI).
- **D-02:** `manifest.ts` start_url is currently `/?nakyma=lista` (dead param) — change to `/`.
- **D-03:** og:title is auto-derived from Next.js `title` field — no separate `openGraph` block needed unless the title diverges.

### Logo Placeholder SVG
- **D-04:** Placeholder SVG = bold text "AKTIIVI" only — no chevrons. `fontSize: 28`, `letterSpacing: 4`, `fontWeight: 700`. Clean, easy to replace when real logo is delivered.
- **D-05:** The logo component replaces `ActaLogo.tsx` — create `AktiiviLogo.tsx` (or rename/replace). The old ACTA animation is discarded.
- **D-06:** Gradient animation applies to the SVG `<text>` element via `fill="url(#grad-current)"` + a `<linearGradient>` definition that is swapped on each open.

### Tab Layout (Closed State)
- **D-07:** Logo is centered in the 44px HANDLE_H tab. The existing `w-10 h-1` drag bar is **removed** — the logo IS the visual handle.
- **D-08:** The logo size stays fixed. The pill (closed sheet shape) is constrained so it never narrows smaller than the logo width. Adjust `pillInset` so the min closed width comfortably fits the "AKTIIVI" wordmark.
- **D-09:** Closed pill is **centered** horizontally — use `left: 50%; transform: translateX(-50%)` or equivalent Framer Motion animated values so the pill centers on screen rather than spanning most of the width.
- **D-10:** The logo physically moves with the sheet (it's part of the sheet element at the top). When the sheet opens, the logo slides up as part of the sheet motion — no separate entrance animation needed.

### Gradient Animation
- **D-11:** 5 sporty gradients, cycling 1→2→3→4→5→1 on each sheet open. State stored in a `useRef` (persists across re-renders, resets on page load).
- **D-12:** Gradient index increments on each `sheetPhase` transition to `'open'`. Index persists when sheet closes (UI-16 satisfied — color doesn't reset on close, only advances on next open).
- **D-13:** Gradient definitions (hex stops):

| Index | Name | Start | End |
|-------|------|-------|-----|
| 0 | Fire | `#FF7B00` | `#E63946` |
| 1 | Ocean | `#00B4D8` | `#0077B6` |
| 2 | Neon | `#C9F400` | `#00D68F` |
| 3 | Sunset | `#FF6CA8` | `#BE2ED6` |
| 4 | Electric | `#7B2FFF` | `#0055FF` |

- **D-14:** Gradient animates with a smooth color transition (Framer Motion animating the SVG gradient stops, or CSS transition on the `<linearGradient>` colors). Duration: ~0.5s ease-out — visible but not slow.

### Claude's Discretion
- Exact SVG viewBox dimensions for `AktiiviLogo.tsx` — size to look clean at both the 44px tab height and the open-sheet header context.
- Precise `pillInset` value — measure the logo width and set inset so pill is logo-width + comfortable padding (e.g., 16px each side).
- Whether gradient transition uses Framer Motion's `animate` on SVG attributes or a CSS approach — pick whatever works cleanly with `@vis.gl/react-google-maps` and avoids SVG re-render jank.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bottom Sheet Architecture
- `app/components/Etusivu.tsx` — the `sheetPhase` state machine (`'open' | 'sliding' | 'closed'`), `HANDLE_H = 44`, `sheetAnimY/Left/Right/Radius`, `pillInset`, drag-end handler. All tab/logo work builds on top of this.

### Brand Metadata Surfaces
- `app/layout.tsx` — `metadata.title`, `metadata.description` (og:title auto-derived). Update to AKTIIVI.
- `app/manifest.ts` — `name`, `short_name`, `start_url`. Update name/short_name to AKTIIVI; fix start_url to `/`.
- `app/tietosuoja/page.tsx` — privacy policy body; update "Liikuntahakemisto" to "AKTIIVI".

### Design System
- `app/globals.css` — `.glass`, `.glass-btn`, `.glass-hover` — the tab surface uses `.glass` (already on the sheet element).
- `CLAUDE.md` §Animation Principles — duration/ease rules: hover 0.18s easeOut, view transitions 0.2s opacity-only, card enter 0.35s.
- `CLAUDE.md` §Color System — glassmorphism primitives; `#111111` foreground.

### Existing Logo (to be replaced)
- `app/components/ActaLogo.tsx` — the existing animated SVG (ACTA chevrons). Reference for structure; the component will be replaced by `AktiiviLogo.tsx`.

### Requirements
- `.planning/REQUIREMENTS.md` §UI-13 through UI-16 — the 4 logo-uloke requirements with acceptance criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sheetPhase` state machine in `Etusivu.tsx:103` — already drives open/closed. Hook into the transition to `'open'` to advance the gradient index.
- `motion.div` sheet wrapper at `Etusivu.tsx:638` — the tab sits inside this. The `onClick` at `Etusivu.tsx:657` already handles tap-to-open when closed.
- `ActaLogo.tsx` — SVG animation pattern (Framer Motion on SVG elements) to reference for `AktiiviLogo.tsx`.

### Established Patterns
- SVG text fill gradient: define `<defs><linearGradient id="grad">...</linearGradient></defs>` inside the SVG, set `fill="url(#grad)"` on the `<text>` element. Swap gradient stops to change color.
- Framer Motion `animate` on SVG `fill` doesn't interpolate gradients — use CSS animation on `<stop>` color, or swap the gradient ID reference. Test which approach is jank-free.
- `pillInset` currently maps to `sheetAnimLeft/Right` when closed. Changing this to center the pill requires animating `left`/`right` asymmetrically or switching to `width` + `left:50%` + `transform`.

### Integration Points
- `sheetPhase` → `'open'` transition: add `useEffect` watching `sheetPhase` that increments gradient index ref when phase becomes `'open'`.
- Logo component renders inside the tab/handle `<div>` (currently `Etusivu.tsx:654-660`). Replace the drag-bar div content with `<AktiiviLogo gradientIndex={gradIndex} />`.
- Manifest route: `app/manifest.ts` is a Next.js `MetadataRoute.Manifest` export — edit directly.

</code_context>

<specifics>
## Specific Ideas

- **Pill centering:** The current pill narrows from both sides with `sheetAnimLeft` / `sheetAnimRight`. To achieve a centered, logo-width pill, animate to `left: calc(50% - logoHalfWidth)` and `right: calc(50% - logoHalfWidth)`. Measure logo half-width from a `ref` on `AktiiviLogo` or hardcode after measuring the SVG at the chosen fontSize.
- **Gradient persistence:** Use `const gradIndexRef = useRef(0)` — increment in the `sheetPhase → 'open'` effect. No `useState` so no re-render on index change (gradient updates only when logo re-renders for other reasons, or trigger via a `gradKey` state if needed to force SVG repaint).
- **ActaLogo replacement:** `ActaLogo.tsx` appears to not be imported anywhere currently (the ARCHITECTURE.md lists it but grep for `import ActaLogo` would confirm). Safe to replace file in-place or add `AktiiviLogo.tsx` alongside.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-Brändi & Logo-uloke*
*Context gathered: 2026-05-29*
