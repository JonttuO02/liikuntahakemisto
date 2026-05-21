# Phase 4: Service Information UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 4-service-information-ui
**Areas discussed:** Card hours info, Drop-in detection, Open now filter, Profile page layout

---

## Card Hours Info

### What shows on the card

| Option | Description | Selected |
|--------|-------------|----------|
| Badge only | Just "Auki nyt" (green) or "Suljettu" (gray) badge | |
| Badge + today's hours | Badge AND today's time range: "Auki nyt · 09:00–21:00" | ✓ |
| Hours text only | Today's time range without the badge | |

**User's choice:** Badge + today's hours

---

### Where on the card

| Option | Description | Selected |
|--------|-------------|----------|
| Below name, above address | High up — very visible | ✓ |
| Below address/description, above CTA | Natural reading flow | |
| Inside the bottom row alongside price | Compact, potentially crowded | |

**User's choice:** Below the venue name, above address

---

### No aukioloajat data fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing (hide the row) | Card looks same as today | |
| "Tarkista aukioloajat" link | Link to website or profile | |
| "Aukioloajat lisätään pian" placeholder | Same pattern as price fallback | ✓ |

**User's choice:** "Aukioloajat lisätään pian" placeholder

---

## Drop-in Detection

### How to determine kertakäynti eligibility

| Option | Description | Selected |
|--------|-------------|----------|
| Detect from hinta_kuvaus text | Case-insensitive match for "kertakäynti" — no schema change | ✓ |
| New DB boolean column: kertakaynti_ok | Explicit control, requires migration + seed update | |

**User's choice:** Detect from hinta_kuvaus text

---

### "Kertakäynti OK" badge visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Green filled pill alongside sport badge | Same row as sport badge at the top | |
| Small text label in the bottom row | Near price, contextually relevant | |
| You decide | Let planner choose based on card layout | ✓ |

**User's choice:** You decide (Claude's discretion)

---

## Open Now Filter

### Filter placement

| Option | Description | Selected |
|--------|-------------|----------|
| Alongside sport filter pills | Same row as Kuntosali / Padel pills | |
| Separate row above the grid | Dedicated toggle row — clearer hierarchy | ✓ |

**User's choice:** Separate row above the grid

---

### Venues with no hours data when filter is active

| Option | Description | Selected |
|--------|-------------|----------|
| Hide them (strict) | Only confirmed-open venues shown | |
| Show them with a note (lenient) | Venues without data stay visible with "Aukioloajat tuntematon" | ✓ |

**User's choice:** Show them with a note (lenient mode)

---

## Profile Page Layout

### Weekly hours display format

| Option | Description | Selected |
|--------|-------------|----------|
| Full day-by-day table (Ma, Ti, Ke, To, Pe, La, Su) | One row per day, today highlighted | |
| Grouped ranges (Ma–Pe / La / Su) | Compact, consecutive same-hour days collapsed | ✓ |
| You decide | Planner chooses layout | |

**User's choice:** Grouped ranges (Ma–Pe / La / Su)

---

### hinta_kuvaus display

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text as-is | Render verbatim in Row layout | |
| Replace hintateksti(hinta_min, hinta_max) | Show hinta_kuvaus instead of derived price | |
| Show both | Derived price headline + hinta_kuvaus detail | |

**User's choice (free text):** "hinta_min/max replaced with the hinta_kuvaus. On profile page but also in cards" — confirmed: `hinta_kuvaus` replaces the derived price on both cards and profile page; fall back to `hintateksti()` when null.

---

## Claude's Discretion

- "Kertakäynti OK" badge placement and visual style — planner chooses based on card layout constraints
- Exact Lucide icon for the hours row on the profile page
- Tailwind classes for open (green) vs. closed (gray) badge — should align with the `glass` design system

## Deferred Ideas

None — discussion stayed within phase scope.
