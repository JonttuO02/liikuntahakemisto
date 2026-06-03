# Phase 28: SVG-ikonit — Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `lib/sportIcons.ts` as a single SVG icon registry with inner-markup strings for all 9 app sports (padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta, kiipeily, jääkiekko). Migrate all 5 consumers — SportPin, PaikkaKortti, DiagonaalKortti, Etusivu filter pills, Etusivu CalloutCard — from their local/Lucide icon definitions to the new registry. Remove `SPORT_ICONS` and Lucide imports from `lib/lajit.ts`. All changes must leave `tsc --noEmit` clean.

</domain>

<decisions>
## Implementation Decisions

### Zip contents and icon style
- **D-01:** `final_sports_svg_exports.zip` (project root) contains 20+ icons. All 9 app sports are present; extras are ignored. Only the sports in `lib/lajit.ts` → `lajiKonfig` are extracted.
- **D-02:** Icons are **fill-based** SVGs (solid shapes, not stroke outlines).
- **D-03:** Executor automates extraction: unzip the file, read each sport's SVG, strip the outer `<svg ...>` wrapper, write the inner markup to `lib/sportIcons.ts`. No manual step.

### lib/sportIcons.ts data format
- **D-04:** The registry exports `SPORT_ICONS: Record<string, string>` where the value is the **full inner SVG markup** (everything between `<svg>` and `</svg>`). This handles multi-path fill icons without constraint.
- **D-05:** Any hardcoded fill colors in the extracted SVG paths must be replaced with `fill="currentColor"` so consumers can control color via CSS.

### SportIcon React component
- **D-06:** `lib/sportIcons.ts` also exports a `SportIcon` React component: `({ laji, size?, className? }) => <svg viewBox="0 0 24 24" width={size} height={size} className={className} dangerouslySetInnerHTML={{__html: SPORT_ICONS[laji] ?? SPORT_ICONS['liikunta']}} />`. Etusivu filter pills and PaikkaKortti badge switch from `<LucideIcon size={N} />` to `<SportIcon laji={...} size={N} />`.
- **D-07:** `dangerouslySetInnerHTML` is safe here: `SPORT_ICONS` is a compile-time constant.

### Map pins (SportPin)
- **D-08:** SportPin imports from `lib/sportIcons.ts` instead of its local constant. The `<g style={{ color: '#1e3a8a' }}>` wrapper stays — new fill icons use `fill="currentColor"` so the navy color still applies.
- **D-09:** The `<g stroke="currentColor" stroke-width="2.5" fill="none">` wrapper is removed from the inserted content since the new icons are fill-based (no strokes). The outer `<g>` in SportPin handles color only.

### lib/lajit.ts cleanup
- **D-10:** Delete `SPORT_ICONS` and all Lucide icon imports from `lib/lajit.ts` immediately — no compatibility shim, no re-export.

### Plan structure
- **D-11:** Two plans in sequence:
  - Plan 1: Unzip + extract inner SVG markup → write `lib/sportIcons.ts` + `SportIcon` component. No consumer changes yet.
  - Plan 2: Migrate all 5 consumers to `SportIcon` / `SPORT_ICONS`, delete SPORT_ICONS from `lib/lajit.ts`, run `tsc --noEmit`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — v1.6 requirements; Phase 28 scope: ICON-01, ICON-02

### Design system
- `CLAUDE.md` — Animation principles, component conventions, color system (authoritative)

### Icon source
- `final_sports_svg_exports.zip` — Source SVGs at project root; executor extracts inner markup from here

### Key implementation files
- `lib/lajit.ts` — Current home of `SPORT_ICONS` (to be deleted) and `lajiKonfig` (stays); defines which 9 sports need icons
- `app/components/SportPin.tsx` — Map pin component; local `SPORT_ICONS` → import from `lib/sportIcons.ts`; `<g>` wrapper color approach stays
- `app/components/PaikkaKortti.tsx` — Card component; local `SPORT_ICONS: Record<string, LucideIcon>` → `SportIcon` component
- `app/components/DiagonaalKortti.tsx` — Diagonal card; imports `SPORT_ICONS` from `lib/lajit` → `SportIcon` component
- `app/components/Etusivu.tsx` — Main view; imports `SPORT_ICONS` from `lib/lajit` (filter pills + CalloutCard) → `SportIcon` component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SportPin.tsx` `SPORT_ICONS` local constant (lines 12–21): Reference for the `<g>` wrapper approach and stroke→fill migration pattern. Shows the current inner content format.
- `g()` helper in SportPin.tsx (line 10): Generates the stroke wrapper — will be REMOVED when switching to fill-based icons. The outer `<g style={{ color: '#1e3a8a' }}>` stays but `fill="none"` and `stroke="currentColor"` attributes are dropped.
- `lajiKonfig` keys in `lib/lajit.ts`: The authoritative list of sport keys to extract from zip (padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta, kiipeily, jääkiekko).

### Established Patterns
- `dangerouslySetInnerHTML` with compile-time constant strings: already used in SportPin.tsx; safe and the intended pattern for `SportIcon`.
- Lucide `<Icon size={N} className="..." />` pattern in PaikkaKortti, DiagonaalKortti, Etusivu: replaced by `<SportIcon laji={...} size={N} className="..." />` — same prop surface.

### Integration Points
- Etusivu.tsx line ~193: `const Icon = SPORT_ICONS[p.laji] ?? Activity` (CalloutCard context) → `<SportIcon laji={p.laji} size={18} />`
- Etusivu.tsx lines ~413, ~496: `const Icon = SPORT_ICONS[sport.toLowerCase()]` (filter pill) → `<SportIcon laji={sport.toLowerCase()} size={14} />`
- PaikkaKortti.tsx line ~24: local `SPORT_ICONS` declaration → import `SportIcon` from `lib/sportIcons`
- DiagonaalKortti.tsx line 6: `import { lajiKonfig, SPORT_ICONS } from '@/lib/lajit'` → remove `SPORT_ICONS` import, add `SportIcon`

</code_context>

<specifics>
## Specific Ideas

- Icon fill color stripping: after extracting inner SVG from zip, replace all `fill="#..."` or `fill="black"` etc. with `fill="currentColor"` so CSS color inheritance works uniformly.
- SportPin viewBox is 28×38 (teardrop pin); the icon is rendered inside a `transform="translate(5,5) scale(0.75)"` group — icon should have a 24×24 viewBox to fit correctly (same as current).
- The `fallback` key in SportPin's current SPORT_ICONS (a simple circle) should be carried into `lib/sportIcons.ts` as a fallback for unknown sports.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 28-SVG-ikonit*
*Context gathered: 2026-06-03*
