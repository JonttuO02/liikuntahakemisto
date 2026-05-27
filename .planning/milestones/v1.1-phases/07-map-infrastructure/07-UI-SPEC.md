---
phase: 7
slug: 07-map-infrastructure
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-22
---

# Phase 7 — UI Design Contract

> Visual and interaction contract for the AdvancedMarker migration, day/night mapId switch, and re-center button.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (custom glassmorphism, no shadcn) |
| Preset | not applicable |
| Component library | none (Tailwind v3 + custom CSS classes in globals.css) |
| Icon library | lucide-react |
| Font | Inter via `next/font/google`, variable `--font-sans` |

Primary visual primitives are the `.glass`, `.glass-hover`, `.glass-btn`, and `.glass-nav` utility classes defined in `app/globals.css`. Phase 7 uses `.glass-btn` for the re-center button. Never replicate these utilities inline.

---

## Spacing Scale

Declared values (multiples of 4, from existing Tailwind v3 scale):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps (`gap-1`) |
| sm | 8px | Compact element spacing (`gap-2`) |
| md | 16px | Default element spacing (`p-4`) |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions:
- Floating button touch target: `w-10 h-10` (40px) — minimum viable touch target for fullscreen map overlay controls
- Map overlay buttons top offset: `top-4` (16px), right offset: `right-4` (16px) — matches existing X close button and night toggle
- Re-center button bottom offset: `bottom-16` (64px) — positions above filter pills row (`bottom-4` + pill height ~40px + gap)

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Micro / badge | 10px (`text-[10px]`) | 700 (bold) | 1 |
| Body / UI label | 14px (`text-sm`) | 400 or 700 | 1.5 |
| Subheading / price | 20px (`text-xl`) | 700 (bold) | 1.2 |
| Display heading | 30–36px (`text-3xl sm:text-4xl`) | 700 (bold) | tight (1.1) |

Phase 7 introduces no new text elements. The only addition is the re-center button icon (no label text). Only 2 weights used project-wide: 400 (normal) and 700 (bold). Never use 600 (semibold).

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#ffffff` | Page backgrounds, card backgrounds |
| Secondary (30%) | `rgba(255,255,255,0.60–0.95)` via `.glass` | Map overlay panels, bottom sheet |
| Accent (10%) | `#111111` | Active filter pills, primary CTA buttons |
| Destructive | `#dc2626` | Destructive actions only (none in Phase 7) |

Accent reserved for: active filter pill background, primary CTA button background. Not used for the re-center button (which uses `.glass-btn` — translucent white, not black accent).

**User location marker blue:** `#4285F4` (Google blue) — used only for the user position indicator dot. Outer ring: `rgba(66,133,244,0.18)`. This is not part of the 60/30/10 accent — it is a semantic GPS indicator color, the only blue in the project.

**Map overlay button text color:** `rgba(17,17,17,0.6)` default, `#111111` on hover — same as X close button.

---

## Component Contracts

### Venue Pin Marker (AdvancedMarker)

Source: CONTEXT.md D-01, D-02

- Replaces: `<Marker icon={pinUrl(color, p.laji)} />`
- Migration pattern:
  ```tsx
  <AdvancedMarker
    key={p.id}
    position={{ lat: p.latitude, lng: p.longitude }}
    zIndex={valittu?.id === p.id ? 10 : 1}
    onClick={() => setValittu(p)}
  >
    <img src={pinUrl(color, p.laji)} width={28} height={38} alt="" />
  </AdvancedMarker>
  ```
- `pinUrl()` in `lib/sportPins.ts` must NOT be changed — the SVG output is the authoritative visual
- Size: 28x38px (unchanged from v1.0)
- Apply CSS class `gmap-pin` to the `<img>` element to preserve bounce animation and hover scale defined in `globals.css`
- Preview map markers: same migration, no `onClick` handler (preview is `gestureHandling="none"`)
- The `Pin` component from `@vis.gl/react-google-maps` must NOT be used (D-01)

### User Location Marker (AdvancedMarker)

Source: CONTEXT.md D-03, specifics block

- Replaces: `<Marker icon={{ url: userLocationPinUrl(), scaledSize: ..., anchor: ... }} />`
- Migration pattern:
  ```tsx
  <AdvancedMarker position={coords} zIndex={20}>
    <div style={{ width: 24, height: 24, position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: 'rgba(66,133,244,0.18)'
      }} />
      <div style={{
        position: 'absolute', inset: 3,
        borderRadius: '50%',
        background: '#4285F4',
        border: '2.5px solid white'
      }} />
    </div>
  </AdvancedMarker>
  ```
- Outer ring: 24x24px, 50% border-radius, background `rgba(66,133,244,0.18)` (translucent Google blue)
- Inner dot: `inset: 3px` (effectively 18x18px), 50% border-radius, background `#4285F4`, `2.5px solid white` border
- `clickable` equivalent: no `onClick` handler — matches current non-interactive behavior
- `userLocationPinUrl()` in `lib/sportPins.ts` may be deleted after this migration (Claude's discretion, D-03)

### Re-center Button (MAP-04)

Source: CONTEXT.md D-08 through D-13

- Scope: fullscreen map only — NOT on the 3D preview map
- Position: `absolute bottom-16 right-4 z-10` — bottom-right corner, above filter pills row
- Sizing: `w-10 h-10` (40x40px) — identical to X close button and night toggle
- Style: `glass-btn rounded-full flex items-center justify-center`
- Text color: `text-[rgba(17,17,17,0.6)] hover:text-[#111111]` — matches X close button
- Transition: `[transition:color_150ms_var(--ease-out)]` — matches X close button
- Icon: `<Locate className="w-4 h-4" />` from `lucide-react`
- Accessibility: `aria-label="Palaa omalle sijainnille"`
- Tap animation: `whileTap={{ scale: 0.95 }}` — matches filter pill pattern (D-09)
- Visibility: always rendered in fullscreen map, regardless of GPS state (D-11)
- Tap behavior: calls `map.panTo(coords)` if `coords` non-null; silent no-op if `coords` is null — no toast, no error, no visual feedback for null case (D-12)
- Implementation: inline `useMap()` hook or a small `RecenterButton` inner component using the same pattern as `MapPanController`
- `MapPanController` is KEPT unchanged — re-center button is an additive manual trigger (D-13)

### Map ID Switching (Day/Night)

Source: CONTEXT.md D-04, D-05, D-06

- Replaces: `<MapStyleController isDark={isDark} />` rendered inside both `<Map>` instances
- Migration: remove `<MapStyleController>` from both map instances; pass `mapId` directly to `<Map>`
- Pattern for both preview and fullscreen `<Map>` components:
  ```tsx
  const DAY_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY
  const NIGHT_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT
  // ...
  <Map mapId={isDark ? NIGHT_ID : DAY_ID} ... >
  ```
- No fallback for undefined mapId — let `undefined` flow through (D-07). Document both vars in `.env.local.example`
- `MapStyleController` function deleted from `Etusivu.tsx`
- `DAY_MAP_STYLES` and `NIGHT_MAP_STYLES` exports in `lib/mapStyles.ts` become unused and may be deleted (Claude's discretion, D-06)
- `isNightHour` must be KEPT — still used for `isDark` state initialization in `Etusivu.tsx` (D-06 explicit constraint)

---

## Interaction States

### Re-center Button States

| State | Visual |
|-------|--------|
| Default | `glass-btn` background, icon color `rgba(17,17,17,0.6)` |
| Hover | Elevated `glass-btn:hover` box-shadow (defined in globals.css), icon color `#111111` |
| Tap | `scale: 0.95` via `whileTap` |
| GPS unavailable (coords null) | Identical appearance — button still renders, tap is a silent no-op |

### Venue Pin States (preserved from v1.0)

| State | Visual |
|-------|--------|
| Default | 28x38px teardrop SVG, `.gmap-pin` bounce animation on enter |
| Hover | `scale(1.15)` via `.gmap-pin:hover` CSS |
| Active (selected) | `scale(1.25)` via `.gmap-pin[data-active="true"]` CSS, `zIndex: 10` |

Note: The `data-active` attribute must be wired to `valittu?.id === p.id` on the `<img>` element to preserve the active-pin visual scale.

---

## Animation Contract

Phase 7 introduces no new animations. Existing animation patterns are preserved:

- Pin entrance: `.gmap-pin` bounce keyframe — 0.48s, `cubic-bezier(0.23, 1, 0.32, 1)` (globals.css)
- Pin hover: `scale(1.15)`, 150ms (globals.css)
- Re-center tap: `whileTap={{ scale: 0.95 }}` — 100ms (CLAUDE.md filter button pattern)
- Fullscreen map enter/exit: existing `EASE_MAP` perspective transform — unchanged

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Re-center button aria-label | Palaa omalle sijainnille |

No other user-visible copy is added or changed in Phase 7. The MapStyleController removal and AdvancedMarker migration are invisible to users.

---

## Environment Variables Contract

| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` | Google Cloud Map ID for day/light theme | client |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` | Google Cloud Map ID for night/dark theme | client |

Both vars replace the previous single `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. Document in `.env.local.example`. Values already exist in Google Cloud Console — developer must copy them to local `.env.local`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| `@vis.gl/react-google-maps` v1.8.3 | `AdvancedMarker`, `useMap` | Already installed — no vetting required |
| `lucide-react` | `Locate` icon | Already installed — no vetting required |

No new packages introduced in this phase.

---

## Files Modified

| File | Change |
|------|--------|
| `app/components/Etusivu.tsx` | Primary target — AdvancedMarker migration, mapId prop, remove MapStyleController, add re-center button |
| `lib/mapStyles.ts` | Remove `DAY_MAP_STYLES`, `NIGHT_MAP_STYLES` if MapStyleController deleted; keep `isNightHour` |
| `lib/sportPins.ts` | Optionally delete `userLocationPinUrl()` after usage replaced |
| `.env.local.example` | Add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
