# Phase 55: AI-lajiluokitus sivuanalyysiin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 55-ai-lajiluokitus-sivuanalyysiin
**Areas discussed:** Suggestion UI, Persistence, Fallback, Edge paths, Taxonomy scope

---

## Suggestion UI

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-selected pill row, must confirm | All 9 categories as pills, AI's pick pre-highlighted with badge, write deferred to existing confirm buttons | |
| Distinct suggestion card with Confirm/Change | Standalone "Ehdotettu laji: X" card with explicit Vahvista/Vaihda actions | ✓ |
| Plain dropdown, AI pre-fills value | Single `<select>` pre-filled with AI's guess | |

**User's choice:** Distinct suggestion card with Confirm/Change
**Notes:** Matches ROADMAP's "erottuva ehdotus-elementti" wording more directly than blending into the existing pick-and-confirm-later pattern used by logo/colors.

---

## Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Add to onboarding_draft, write at final submit | Same deferred pattern as hinnasto/aukioloajat/yhteystiedot | ✓ |
| Immediate autosave PATCH on confirm | Same pattern as selected_logo_url/selected_background_color | |

**User's choice:** Add to onboarding_draft, write at final submit
**Notes:** Consistent with the wizard-wide convention that nothing touches `liikuntapaikat` until final submit.

---

## Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| No pre-selection — force a manual pick | Picker shows nothing highlighted when AI is uncertain/invalid | ✓ |
| Default to neutral category | Pre-select e.g. 'liikuntahalli' when AI is uncertain | |

**User's choice:** No pre-selection — force a manual pick
**Notes:** Avoids ever implying a confident guess that wasn't actually made.

---

## Edge paths

| Option | Description | Selected |
|--------|-------------|----------|
| Re-analyze resets laji selection | Mirrors existing logo/color reset-on-reanalyze behavior | ✓ |
| Re-analyze keeps the user's manual laji pick | Preserve prior pick across re-runs | |
| Add a manual laji picker to the skip path too | Fixes permanent 'Muu' stuck-state for skip-analysis users | ✓ |
| Leave skip path untouched (defer) | Note the gap as a deferred idea instead | |

**User's choice:** Re-analyze resets laji selection; Add a manual laji picker to the skip path too
**Notes:** Both selected (multiSelect). The skip-path picker was initially framed as a possible scope-creep risk but the user chose to include it since the alternative directly undermines this phase's own success criteria (laji permanently stuck at 'Muu' for some users).

---

## Taxonomy scope

| Option | Description | Selected |
|--------|-------------|----------|
| 9 taxonomy categories only | Picker only shows/writes the real lib/lajit.ts keys | |
| 9 categories + 'Muu' catch-all | Keep 'Muu' as a valid 10th option | |
| (free text, user-provided) | User wants a manual free-text entry for categories not on the list | ✓ |

**User's choice:** "There should be possibility to manually write the category if its not on the list"
**Notes:** Resolved as: the Vaihda picker offers the 9 taxonomy categories plus a free-text input as an escape hatch (D-02 in CONTEXT.md). This applies only to the user-facing override — Claude's own AI suggestion is still constrained to the 9 taxonomy keys only (D-07), per AI-06's "ei vapaata tekstiä" requirement.

---

## Claude's Discretion

- Exact placement/component for the skip-path manual picker (D-06).
- Exact wiring of the full-wizard path's `laji` save-step write (likely `page.tsx`'s `handleConfirm`).
- Visual styling of the suggestion card and Vaihda picker (badge shape, modal/dropdown/inline list).
- Whether `suggested_laji` validation happens server-side only or also client-side as defense-in-depth.

## Deferred Ideas

None.
