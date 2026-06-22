# Phase 52: Cleanup — i18n-merkkijonot & AuthModal-bugi - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

EN-locale user sees the entire UI in their chosen language for `AuthModal`, `CalloutCard`, `app/paikat/[id]/page.tsx`, and `DiagonaalKortti` — no hardcoded Finnish strings. The AuthModal error-classification precedence bug (`A || B && C` → `(A || B) && C`) is fixed. Requirements: CLEAN-06, CLEAN-07.

</domain>

<decisions>
## Implementation Decisions

### Codebase scouting changed the picture — most of this phase already appears done
- **D-01:** Codebase scouting (done during this discussion) found that 3 of the 4 named components — `AuthModal.tsx`, `CalloutCard.tsx`, and `app/paikat/[id]/page.tsx` — already fully use `next-intl` (`useTranslations`/`getTranslations`) for every user-visible string, and the EN translations in `messages/en.json` are correct (verified `Auth`, `PaikkaKortti`, `PaikkaPage` namespaces).
- **D-02:** The AuthModal precedence bug (CLEAN-07) is **already fixed** — `git blame app/components/AuthModal.tsx` shows the `(message.includes(A) || message.includes(B)) && message.includes('6')` parenthesization was corrected in commit `85eea7a8` (2026-06-04), well before this v3.0 roadmap was written. The equivalent logic in `app/business/rekisteroidy/page.tsx` is also already correctly parenthesized.
- **D-03 (user decision):** Scope stays exactly as ROADMAP.md states it — only the 4 named components/files (`AuthModal`, `CalloutCard`, `app/paikat/[id]/page.tsx`, `DiagonaalKortti`). No broader sweep of the rest of the app for hardcoded Finnish strings — that's explicitly out of scope for this phase. User rejected widening scope when offered the option.
- **D-04 (user decision):** Given D-01/D-02, the planner/researcher must **verify each success criterion against the actual current code** rather than assume implementation work is needed from the ROADMAP wording alone. Where a criterion already holds true, the plan should confirm it with evidence (file + line references) rather than write redundant code.

### Remaining known issue — explicitly deferred
- **D-05 (user decision):** `DiagonaalKortti.tsx` line 224 has `alt={`Kuva: ${paikka.nimi}`}` — a hardcoded Finnish string ("Kuva:" = "Image:") in an `<img>` alt attribute. This is screen-reader-only / fallback-only text, not visible to sighted users. **User explicitly decided NOT to fix this now** — "Texts that are not visible for users don't have to be fixed at this time. It can be done later." This is captured as a deferred idea below, not in this phase's scope.

### Claude's Discretion
- If the researcher/planner find any other hardcoded Finnish strings within the 4 named files/components that weren't surfaced during this discussion's scouting, fix them as part of this phase (they're in-scope by file, even if not explicitly named above).
- How to format/document the "already fixed, verified" evidence in the plan (e.g., a verification checklist vs. inline file/line citations) is left to the planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` (Phase 52 section, lines ~198-206) — goal, success criteria, requirements CLEAN-06/CLEAN-07
- `.planning/REQUIREMENTS.md` (lines 12-13, 56-57) — CLEAN-06, CLEAN-07 requirement text and phase mapping
- `.planning/STATE.md` — current milestone v3.0 status, active decisions carried forward

### Files in scope
- `app/components/AuthModal.tsx` — already i18n'd (`Auth` namespace); precedence bug already fixed (lines 27-31)
- `app/components/CalloutCard.tsx` — already i18n'd (`PaikkaKortti`/`Lajit` namespaces)
- `app/paikat/[id]/page.tsx` — already i18n'd (`PaikkaPage` namespace)
- `app/components/DiagonaalKortti.tsx` — i18n'd for aria-labels (`PaikkaKortti`/`Lajit` namespaces); line 224 alt text is the one known remaining hardcoded string (deferred, see D-05)
- `messages/en.json`, `messages/fi.json` — translation source of truth; `Auth`, `PaikkaKortti`, `PaikkaPage`, `Lajit` namespaces already verified correct for EN

No external ADRs/specs beyond ROADMAP.md and REQUIREMENTS.md — requirements fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `next-intl` is already fully wired across the app (`useTranslations` client-side, `getTranslations` server-side) — no new i18n infrastructure needed.
- Existing interpolation pattern (`t('key', { name })`) used in `StepYhteystiedot.tsx`, `Etusivu.tsx`, `PaikkaSheet.tsx`, `ReviewForm.tsx` — reference if any new interpolated key is ever needed for the deferred alt-text fix.

### Established Patterns
- Decorative/redundant images use `alt="" aria-hidden` (see `CalloutCard.tsx`'s logo image, `DiagonaalKortti.tsx`'s logo image) — the established pattern for images where the info is already shown as visible text elsewhere on the card.

### Integration Points
- None beyond the 4 named files — this is a self-contained cleanup phase with no new capability and no cross-phase coupling (ROADMAP: "Depends on: Nothing").

</code_context>

<specifics>
## Specific Ideas

No specific new requirements — this phase is verification-and-fix of already-largely-resolved issues, not new design work.

</specifics>

<deferred>
## Deferred Ideas

- **DiagonaalKortti.tsx alt text fix** — `alt={`Kuva: ${paikka.nimi}`}` (line 224) is a hardcoded Finnish screen-reader string. User decided this can wait for a future cleanup phase since it's not visible to sighted users. When picked up later: either add a `venuePhotoAlt` i18n key with `{name}` interpolation, or mark the image `alt="" aria-hidden` (decorative) since the venue name is already shown as visible text on the card — pick whichever the team prefers at that time.

</deferred>

---

*Phase: 52-Cleanup — i18n-merkkijonot & AuthModal-bugi*
*Context gathered: 2026-06-22*
