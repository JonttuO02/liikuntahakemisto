# Phase 58: Admin-sijaintikartta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 58-admin-p-sy-kartta-qa
**Areas discussed:** Admin bug symptom & operator login path, is_admin provisioning, Map QA scope, Regression test format, New admin venue-location map

---

## Admin bug symptom & operator login path

| Option | Description | Selected |
|--------|-------------|----------|
| Bounces to homepage | Page flashes briefly then redirects to '/' | ✓ |
| Forbidden / 403-style message | Page loads but shows an error | |
| Something else / not sure yet | Different symptom | |

**User's choice:** Bounces to homepage (initial report). On retest, `/admin` worked normally.
**Notes:** Operator is joona.orava@gmail.com, the only intended admin account. They access `/admin` by typing the URL directly. On re-test during this discussion, nothing was knowingly changed (no explicit re-login/cookie-clear) and the page loaded successfully. Treated as not currently reproducible.

---

## Scope decision for ADMIN-06

| Option | Description | Selected |
|--------|-------------|----------|
| Still investigate root cause + add a fix/safeguard | Deep dive into session/timing race even though it works now | |
| Treat as resolved, just add minimal hardening | Better loading state instead of instant redirect | |
| Drop ADMIN-06 from this phase entirely | Remove requirement, focus phase elsewhere | ✓ |

**User's choice:** Drop ADMIN-06.
**Notes:** User pivoted immediately to a real, separate need they'd noticed while in the admin UI: no way to see a venue's location while reviewing an application. Reframed as new requirement ADMIN-07.

---

## New admin venue-location map (ADMIN-07)

| Question | Selected answer |
|---|---|
| Pin click behavior | CalloutCard shows on click, but does not open the venue sheet |
| Placement in `/admin/[id]` | New section alongside Listakortti / Diagonaalikortti / Profiilisivu |
| Initial zoom | Fixed close zoom (~15, street-level), centered on venue |
| Relation to QA-01 | Not related — user said QA-01 should be handled separately |
| Null coordinates handling | Not needed — "There should not be any venues without location" |
| Map container sizing | Match `SijaintiPicker.tsx` style: 320px height, rounded-2xl, bordered |

**User's quote:** "Add a map object that shows only that one venue on the map. The map should be zoomable etc. And has the same custompin as in the mainpage. It should work the same as the mainpage map, except clicking the calloutcard doesn't open anything."

---

## Map QA scope (QA-01) / Regression test format

| Option | Description | Selected |
|--------|-------------|----------|
| General check, no specific known incident | Confidence pass on the SijaintiPicker → lat/lng → main map pipeline | ✓ (then dropped) |
| There's a specific venue/case where it was wrong | N/A | |
| Manual check: approve a test venue, confirm pin | | |
| Automated test asserting saved lat/lng renders correctly | | |

**User's choice:** Dropped entirely — "I actually just did a quick check for it and everything seems to work right. We can just forget that QA-01."
**Notes:** No known incident, no regression found on manual spot-check. No automated test added this phase.

---

## Claude's Discretion

- Exact component structure for the new map section (standalone component vs. inline JSX in `app/admin/[id]/page.tsx`).

## Deferred Ideas

None — discussion stayed within phase scope (the scope itself was renegotiated with the user; both original requirements dropped, one new requirement added, all within Phase 58).
