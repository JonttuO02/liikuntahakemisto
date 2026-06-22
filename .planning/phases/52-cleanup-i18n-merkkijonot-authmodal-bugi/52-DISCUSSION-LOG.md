# Phase 52: Cleanup — i18n-merkkijonot & AuthModal-bugi - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 52-Cleanup — i18n-merkkijonot & AuthModal-bugi
**Areas discussed:** Phase scope (given scouting findings), Alt-text fix approach

---

## Phase scope

Before asking, Claude scouted the codebase and found that 3 of 4 named components (`AuthModal`, `CalloutCard`, `app/paikat/[id]/page.tsx`) already fully use `next-intl` with correct EN translations, and the AuthModal precedence bug was already fixed in commit `85eea7a8` (2026-06-04) — before the v3.0 roadmap was written.

| Option | Description | Selected |
|--------|-------------|----------|
| Fix the one stray string, close fast | Only fix DiagonaalKortti's alt text; verify CLEAN-07 already satisfied | |
| Broader audit beyond these 4 files | Grep whole app/ tree for other hardcoded Finnish strings, beyond ROADMAP scope | |
| Just the named components, but double-check thoroughly | Stay within the 4 named files; planner explicitly verifies each success criterion against current code | ✓ |

**User's choice:** "Just the named components, but double-check thoroughly"
**Notes:** User rejected widening scope beyond the 4 files ROADMAP.md names. Planner/researcher must verify (not assume) each success criterion against actual current code, since scouting already showed most criteria appear satisfied.

---

## Alt-text fix approach (DiagonaalKortti.tsx line 224)

Claude explained that `alt={`Kuva: ${paikka.nimi}`}` is screen-reader/fallback-only text (not visible to sighted users), found during scouting as the one remaining hardcoded Finnish string in the 4 named files.

| Option | Description | Selected |
|--------|-------------|----------|
| New i18n key in PaikkaKortti namespace with interpolation | `t('venuePhotoAlt', { name: paikka.nimi })` → EN "Photo: {name}" / FI "Kuva: {name}" | |
| Drop the alt text entirely (mark decorative) | `alt="" aria-hidden`, since venue name is already shown as visible text elsewhere on the card | |
| (User's actual answer, not one of the offered options) | Don't fix it now — defer to a later cleanup phase | ✓ |

**User's choice:** Defer — "Texts that are not visible for users dont have to be fixed at this time. It can be done later."
**Notes:** User initially asked for clarification on where/how the alt text shows up before deciding. Captured as a deferred idea in CONTEXT.md with both fix options preserved for whoever picks it up later.

---

## Claude's Discretion

- If other hardcoded Finnish strings are found within the 4 named files during planning/research that weren't surfaced in this discussion, fix them as part of this phase.
- Format of "already verified" evidence in the plan (checklist vs. inline citations) left to the planner.

## Deferred Ideas

- DiagonaalKortti.tsx alt text (`Kuva: {name}`) — hardcoded Finnish screen-reader-only string. Fix later: either i18n key with interpolation, or mark decorative (`alt="" aria-hidden`).
