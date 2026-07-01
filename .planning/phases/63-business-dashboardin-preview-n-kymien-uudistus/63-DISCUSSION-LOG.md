# Phase 63: Business-dashboardin & preview-näkymien uudistus - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 63-business-dashboardin-preview-n-kymien-uudistus
**Areas discussed:** Todo cross-reference, Hover/tap reveal mechanic, Status pill + secondary actions, Whole-card click behavior, Live-preview 3-card layout

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| Leave deferred | Different domain (auth boundary, not dashboard UI) — keep it in the backlog for its own phase | ✓ |
| Fold into Phase 63 | Include it as an additional scope item in this phase's context | |

**User's choice:** Leave deferred (recommended)
**Notes:** "Block business accounts from logging into customer site" scored a loose keyword match (business/app/tsx) but is an auth-boundary topic, not dashboard/preview UI.

---

## Hover/tap reveal mechanic

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay slides in over the photo | Translucent glass panel slides in from the right on hover/tap, card stays same size | |
| Card expands wider | Card grows wider to reveal a new column, requires grid reflow | |
| Icons fade in over the photo directly | No sliding panel, icons fade in/out over the existing photo | |

**User's choice:** Free text — reject all three, drop hover/tap animation entirely.
**Notes:** "Lets make it a little bit different. I think after all a simpler is better, so lets drop the animation idea totally and on the business dashboard the picture on the right side of the diagonaalkortti is replaced with all the previously agreed buttons etc. So theres never a image in the background, its purely replaced with the controls. The card should still keep the visual of cut in center to two different areas so we need to figure out what the background colour for the controls should be. Considering that the colour of the left side of the card can be changed by the user, and both sides shouldnt be the same colour"

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard list only | Only /business dashboard cards lose the photo; consumer-facing, admin, live-preview keep the photo | ✓ |
| Everywhere action buttons could appear | Any DiagonaalKortti with actions replaces its photo | |

**User's choice:** Dashboard list only (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed dark neutral #111111 | Solid dark panel, white icons, matches project's monochrome accent | |
| Computed complementary shade of brandColor | Derive contrasting tone from brandColor via getContrastColor()-style logic | ✓ |
| Sport accent color | Use lajiKonfig[laji].color | |

**User's choice:** Computed complementary shade of brandColor

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed dark neutral #111111 | Same monochrome accent when no brand color exists | |
| Light gray glass surface | Neutral .glass-style panel matching left side's no-brandColor default | ✓ |

**User's choice:** Light gray glass surface

---

## Status pill + secondary actions

| Option | Description | Selected |
|--------|-------------|----------|
| Icon button in the controls panel | Retry/reapply icon joins preview/edit/jatka; rejection reason as caption elsewhere | (superseded by free text) |
| Keep as text below the card | Rejection reason + reapply link stay as separate text row underneath | |

**User's choice:** Free text — new interaction model.
**Notes:** "That behavior need some fixing as a whole. When venue application is rejected it should be indicated in controls panel and it should have an icon that opens a text popup showing the reason text when its clicked. And after that the user is directed to make the needed fixes to the venue."

| Option | Description | Selected |
|--------|-------------|----------|
| Icon button in the controls panel | 4th icon (link/share) added, shown conditionally when approved | ✓ |
| Separate element below/beside the card | Keep as distinct text button outside the DiagonaalKortti | |

**User's choice:** Icon button in the controls panel

| Option | Description | Selected |
|--------|-------------|----------|
| Popup has a CTA button | Reason popup shows text + CTA button navigating to edit/onboarding | ✓ |
| Popup auto-navigates on close | Closing the popup any way always navigates to edit/onboarding | |

**User's choice:** Popup has a CTA button

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-resubmit on save | Editing and saving a rejected venue auto-flips status back to pending, no separate reapply step | ✓ |
| Explicit reapply step stays | User still needs a distinct resubmit action | |

**User's choice:** Auto-resubmit on save
**Notes:** Flagged in CONTEXT.md as a backend behavior change beyond pure UI — the onboarding/edit submit route likely needs to auto-transition rejected→pending on save; fate of the existing `/api/business/reapply` route is Claude's Discretion pending research.

---

## Whole-card click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — fully inert | Left panel is purely informational, all actions live in icon buttons | ✓ |
| Opens preview | Clicking the card body opens the same preview modal as the preview icon | |

**User's choice:** Nothing — fully inert

---

## Live-preview 3-card layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stack below, same column | Add PaikkaSheet as a third section below CalloutCard/DiagonaalKortti, matching PreviewModal's order | ✓ |
| Mobile gets its own sub-tab | Desktop keeps 3-stack; mobile toggle gets an additional tab/segment | |

**User's choice:** Stack below, same column

| Option | Description | Selected |
|--------|-------------|----------|
| Real photo — consumer view | Live-preview's DiagonaalKortti shows the real photo, not the dashboard no-photo variant | ✓ |
| Dashboard variant for consistency | Use the no-photo controls variant everywhere in business-facing screens | |

**User's choice:** Real photo — consumer view

---

## Claude's Discretion

- Exact icon choices for preview/edit/jatka/invite-link/rejection-info buttons (Lucide icons matching existing conventions)
- Whether `/api/business/reapply` route is deleted or repurposed once auto-resubmit-on-save is implemented
- Exact prop naming for the dashboard-only DiagonaalKortti variant
- Popup implementation pattern for the rejection-reason display (no existing lightweight popover component found in scout)

## Deferred Ideas

- "Block business accounts from logging into customer site" — existing todo, reviewed but not folded; auth-boundary topic needs its own dedicated phase per the todo's own note.
