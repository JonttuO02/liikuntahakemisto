# Phase 6: UI Polish & Data Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 06-ui-polish-and-data-foundation
**Areas discussed:** GDPR page content, Sponsoroitu badge on map, Hero subtitle after city filter

---

## GDPR Page Content

### Data controller identity

| Option | Description | Selected |
|--------|-------------|----------|
| Your own name (private developer) | E.g. 'Joona Orava' — simple, accurate if personal project | |
| A company name | E.g. 'Acta Digital Oy' or similar | |
| Leave as placeholder text for now | '[Rekisterinpitäjä]' placeholder — fill in before Phase 9 ships | ✓ |

**User's choice:** Leave as placeholder text for now

### Policy scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — current state only | Honest: no personal data collected yet, sessionStorage only. Note policy updates when Phase 9 accounts added. | ✓ |
| Forward-looking | Describe planned Phase 9 auth features. Riskier — describes features not yet live. | |

**User's choice:** Minimal — current state only

### Contact email

| Option | Description | Selected |
|--------|-------------|----------|
| joona.orava@gmail.com | Use known email address | |
| Leave as placeholder | '[yhteyssähköposti@esimerkki.fi]' — fill in before Phase 9 ships | ✓ |

**User's choice:** Leave as placeholder

**Notes:** Both controller identity and contact email are placeholders. The page will be live for LEGAL-01 compliance before Phase 9 auth, so the user will fill in the real values at that point.

---

## Sponsoroitu Badge on Map

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom-sheet popup only | Badge in slide-up panel when tapping a pin. Already planned in UI-SPEC. No pin marker changes. | ✓ |
| Map pin marker too | Actual Google Maps pin icon/label shows a visual indicator. Harder with standard Marker. | |
| Both | Badge in bottom-sheet AND visual mark on pin. Most complete but more work; Phase 7 changes markers anyway. | |

**User's choice:** Bottom-sheet popup only

**Notes:** "Kartalla" in ADS-02 is interpreted as the bottom-sheet panel in Etusivu.tsx (~lines 448–503). Pin marker badge is deferred to Phase 7 when AdvancedMarker migration provides the capability.

---

## Hero Subtitle After City Filter

### Text when "Kaikki" is selected

| Option | Description | Selected |
|--------|-------------|----------|
| "Kaikki kaupungit · N paikkaa" | Matches UI-SPEC. Signals multi-city capable even before Phase 10 data. N = filtered count. | ✓ |
| "Tampere · N paikkaa" | More truthful to current data state. Would auto-update when Phase 10 adds other cities. | |
| Just the count: "N paikkaa" | Simplest. No city label. | |

**User's choice:** "Kaikki kaupungit · N paikkaa"

### Text when specific city selected

| Option | Description | Selected |
|--------|-------------|----------|
| "{city} · N paikkaa" — N = filtered count | Dynamic city name + filtered venue count | ✓ |
| "{city} · N paikkaa" — N = total count | Total venues in city regardless of other filters | |

**User's choice:** Filtered count (all active filters apply)

**Notes:** Count always reflects the currently filtered venue list (city + sport + price + auki filters combined).

---

## Claude's Discretion

- Whether to also add "Tietosuoja" link to the NavBar dropdown (in addition to mandatory LiikuntapaikatLista footer link)
- Exact Lucide icon for booking URL row on profile page (ExternalLink suggested in RESEARCH)
- Vertical rhythm and max-width treatment of GDPR prose page
- Exact position of booking URL Row among profile page rows (after Hinta, before Kuvaus)

## Deferred Ideas

- **Sponsoroitu badge on actual map pin markers** — deferred to Phase 7; AdvancedMarker migration is a prerequisite for custom badge rendering on markers.
- **Dynamic city in AI weather widget** — "Tampere" hardcoded for Phase 6; becomes dynamic in Phase 10 when multi-city weather API calls are city-aware.
