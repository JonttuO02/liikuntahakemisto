# Phase 8: Map Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 08-map-features
**Areas discussed:** GPS accuracy ring, Zoom card design, Map focus UX

---

## GPS Accuracy Ring

| Option | Description | Selected |
|--------|-------------|----------|
| Real GPS accuracy | Ring radius = pos.coords.accuracy meters. useGPS exposes accuracy. Shrinks as signal improves. | |
| Fixed decorative ring | Always same visual size. No accuracy math. Simpler. | ✓ |

**User's choice:** Fixed decorative ring

| Option | Description | Selected |
|--------|-------------|----------|
| Translucent blue, medium | Same blue as the dot (rgba(66,133,244,0.18–0.25)). Ring ~40–48px. | |
| White pulsing ring | White with Framer Motion pulse. More visible on dark tiles. | ✓ |
| You decide | Claude picks consistent with existing blue dot. | |

**User's choice:** White pulsing ring

| Option | Description | Selected |
|--------|-------------|----------|
| Slow breathing (scale + opacity) | Scales 1.0→1.2, opacity 0.6→0.1, repeats ~2s. | |
| Outward ripple (expand + fade) | Expands scale 0.5→2.0 + fades as it grows, resets. Sonar ping effect. | ✓ |
| You decide | Claude picks whichever looks better. | |

**User's choice:** Outward ripple (expand + fade)

**Notes:** useGPS hook stays unchanged. Ring is a Framer Motion div inside the user location AdvancedMarker.

---

## Zoom Card Design

| Option | Description | Selected |
|--------|-------------|----------|
| Zoom 16 | ~1 city block. Cards fit without overlap in typical Finnish density. | ✓ |
| Zoom 17 | One step closer. Less overlap risk, users zoom further. | |
| Zoom 15 | City-neighborhood level. Higher overlap risk. | |

**User's choice:** Zoom 16

| Option | Description | Selected |
|--------|-------------|----------|
| Name + sport pill + price | Matches MAP-06 success criteria literally. | ✓ |
| Name + sport pill only | Simpler, skip price. | |
| Name only | Minimal. | |

**User's choice:** Name + sport pill + price

| Option | Description | Selected |
|--------|-------------|----------|
| Instant swap | No animation, all pins become cards at zoom threshold. Simple. | |
| Fade crossfade | Pin fades out, card fades in via AnimatePresence. | ✓ |
| Scale-up pop | Card scales 0.8→1.0 + opacity. Playful. | |

**User's choice:** Fade crossfade

| Option | Description | Selected |
|--------|-------------|----------|
| Open bottom-sheet | Same as pin click — setValittu(p). Consistent UX. | |
| Navigate to profile page | Link to /paikat/[id]. Leaves map. | |
| (User free text) | "I want the bottom-sheets changed as big, almost whole page filling card. So when pin icon is clicked the map zooms towards the pin turns into the small card, and when small card is clicked, it expands to the big card." | ✓ |

**User's choice (free text):** New interaction model — pin tap → auto-zoom to 16 → pin becomes mini-card → mini-card tap → 90vh bottom sheet with full venue content.

Follow-up questions:

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-zoom on pin tap | map.panTo + map.setZoom(16). Pin transforms as zoom crosses threshold. | ✓ |
| Manual zoom only | User zooms in themselves. Pins transform passively. | |

| Option | Description | Selected |
|--------|-------------|----------|
| 90% height modal/sheet | Slides up to ~90vh. Shows profile page content (hours, phone, booking, description). | ✓ |
| Full-screen takeover | Covers entire screen. | |

**Notes:** Significant redesign of bottom-sheet interaction. Pin click now triggers auto-zoom; setValittu is only set from mini-card click. Big sheet is ~90vh with full venue profile content.

---

## Map Focus UX

| Option | Description | Selected |
|--------|-------------|----------|
| Open map + auto-show venue info | Navigate to /?id=<id>. Map centers at zoom 16. 90% sheet opens automatically. | |
| Open map + mini-card only | Navigate to /?id=<id>. Map centers at zoom 16. Mini-card visible, big sheet does NOT auto-open. | ✓ |
| Open map + just center/zoom | No mini-card or sheet on arrival. | |

**User's choice:** Open map + mini-card only (user taps mini-card themselves to expand)

| Option | Description | Selected |
|--------|-------------|----------|
| Fullscreen map opens automatically | If id param present, fullscreen map opens on mount. | ✓ |
| User opens map manually | Landing with toggle visible, user taps. | |

**User's choice:** Fullscreen map opens automatically

URL clarification:

| Option | Description | Selected |
|--------|-------------|----------|
| /?id=<paikka_id> only | No ?nakyma=kartta. Consistent with CLAUDE.md constraint. | ✓ |
| /?nakyma=kartta&id=<paikka_id> | Original STATE.md URL. Param is dead but harmless. | |

**User's choice:** `/?id=<paikka_id>` only — confirmed the ?nakyma=kartta param should NOT be generated.

**Notes:** STATE.md had `/?nakyma=kartta&id=<paikka_id>` as the locked URL. User confirmed CLAUDE.md constraint wins — URL is `/?id=<paikka_id>` only.

---

## Claude's Discretion

- GPS ring: exact size (outer diameter), animation duration, number of staggered rings (1 or 2)
- Mini-card: width cap, text truncation for long names
- How to pass aukiolo_json to Etusivu's big sheet (may need SELECT update)
- Whether to extract big sheet to separate VenueSheet.tsx component
- Whether big sheet adapts styling for dark map mode (isDark)

## Deferred Ideas

- Marker clustering (out of scope per REQUIREMENTS.md — replaced by zoom-based transformation)
- City filter on map view (separate concern, later phase)
- Mini-card overlap handling in dense areas (future iteration)
