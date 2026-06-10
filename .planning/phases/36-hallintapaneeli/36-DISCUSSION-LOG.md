# Phase 36: Hallintapaneeli - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 36-hallintapaneeli
**Areas discussed:** Edit flow UX, Routing structure, Save model for edits, Preview placement

---

## Edit flow UX

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse onboarding wizard | Redirect to /business/onboarding?step=N&edit=true; all 5 steps already built | ✓ |
| Dedicated /business/[id]/edit page | New route with per-section accordion or tabs | |
| Inline accordion on /business | Expand venue row inline with collapsible sections | |

**User's choice:** Reuse onboarding wizard
**Notes:** —

---

## Edit flow UX — Step 6 replacement in edit mode

| Option | Description | Selected |
|--------|-------------|----------|
| Per-step 'Tallenna' saves immediately | Each step has own save button; writes directly to liikuntapaikat; no Step 6 | partial |
| Keep Step 6 as 'Esikatselu + Julkaise' | All changes batched, reviewed in Step 6, then published | |
| Auto-save on step change | Moving to next step automatically saves current step | |

**User's choice:** Per-step saves + preview possibility ("Each step should have its own save button, but there should also be preview possibility to see the visual changes before publishing")
**Notes:** User requested both per-step saves AND a way to preview before publishing. Led to D-04 (preview button per step).

---

## Edit flow UX — Preview trigger in edit mode

| Option | Description | Selected |
|--------|-------------|----------|
| Preview button on each step | 'Näytä esikatselu' button opens modal with current published data | ✓ |
| Step 6 stays as dedicated preview step | After steps 1–5, Step 6 shows preview; 'Sulje muokkaus' exits | |
| Live sidebar preview | Preview panel always visible alongside edit step on desktop | |

**User's choice:** Preview button on each step
**Notes:** Modal shows already-saved (published) state, not unsaved form state.

---

## Edit flow UX — Paikka step editability

| Option | Description | Selected |
|--------|-------------|----------|
| Editable but no re-approval needed | All fields freely editable; immediate publish | |
| Locked after approval | Paikka info (name, address) locked; only Mediat/Hinnasto/Aukioloajat/Yhteystiedot editable | ✓ |

**User's choice:** Locked after approval
**Notes:** Name/address changes would require admin contact.

---

## Routing structure

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-route: /business + /business/[id] | /business = list; /business/[id] = full venue management | ✓ |
| Single /business page with per-venue expansion | Clicking venue expands inline; no new routes | |

**User's choice:** Multi-route
**Notes:** —

---

## Routing structure — Which statuses show Muokkaa

| Option | Description | Selected |
|--------|-------------|----------|
| Approved only | Only approved venues show Muokkaa | |
| All statuses | All venues (pending, approved, rejected) show Muokkaa | ✓ |

**User's choice:** All statuses
**Notes:** Even pending venues can be edited while awaiting approval.

---

## Routing structure — /business/[id] visual layout

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse onboarding wizard layout as-is | Same full-screen wizard; zero new layout work | |
| Wider panel / dashboard layout | max-w-2xl or wider with sidebar feel | ✓ |
| Same compact card as /business | Centered max-w-sm/md card; wizard steps scroll within | |

**User's choice:** Wider dashboard layout
**Notes:** Feels more like a management panel than an onboarding flow.

---

## Save model for edits

| Option | Description | Selected |
|--------|-------------|----------|
| Direct UPDATE to liikuntapaikat | Writes directly; no draft; new POST /api/business/update-paikka | ✓ |
| Write to onboarding_draft, then sync on 'Julkaise' | Staged changes, final publish step | |

**User's choice:** Direct UPDATE to liikuntapaikat
**Notes:** Matches BIZPANEL-02 "välittömästi ilman erillistä hyväksyntäpyyntöä".

---

## Save model — API design

| Option | Description | Selected |
|--------|-------------|----------|
| One unified endpoint | POST /api/business/update-paikka with {paikka_id, section, data} | ✓ |
| Separate endpoints per section | /update-paikka/mediat, /hinnasto, /aukioloajat, /yhteystiedot | |

**User's choice:** One unified endpoint
**Notes:** —

---

## Save model — Photo upload mode

| Option | Description | Selected |
|--------|-------------|----------|
| Replace | New uploads overwrite existing photos | |
| Append up to max | New photos added to existing (up to 5); per-photo delete button | ✓ |

**User's choice:** Append up to max
**Notes:** Implies per-photo delete button (×) on each thumbnail. Logo is replaced (replace semantics).

---

## Preview placement

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen modal overlay | Modal covers /business/[id]; no URL change | ✓ |
| Dedicated /business/[id]/preview route | Navigates to separate route; shareable URL | |
| Bottom sheet (mobile-first) | Slides up from bottom; consistent with PaikkaSheet pattern | |

**User's choice:** Full-screen modal overlay
**Notes:** —

---

## Preview placement — Published vs. unsaved data

| Option | Description | Selected |
|--------|-------------|----------|
| No diff — show published state only | Preview shows live liikuntapaikat data | ✓ |
| Show unsaved changes in preview | Preview reflects current form state | |

**User's choice:** Published state only
**Notes:** "This is how it looks right now to users."

---

## Preview placement — Quick preview on /business list

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — preview button on list row | Each venue row has Muokkaa + Esikatselu | ✓ |
| No — preview only from /business/[id] | Simpler list; fewer buttons | |

**User's choice:** Yes — preview button on list row
**Notes:** Useful for checking how an approved venue looks without entering edit mode.

---

## Claude's Discretion

- `/business/[id]` sidebar-navigaatio vs. yläreunan tab-bar edit-vaiheiden välillä
- ProgressBar-komponentin näyttäminen edit-moodissa (koko progressbar vs. pelkät step-labelit)
- "Tallenna"-napin sijainti per vaihe (alaosa vs. kiinteä toolbar)
- Poistonapin confirmointidialogi kuvalle (välitön vs. confirm-dialog)
- UI-feedback kun max 5 kuvaa on täynnä

## Deferred Ideas

- Kuvien järjestyksen muokkaus drag-and-drop:lla — ei BIZPANEL-vaatimuksissa
- Laji-tyypin (sport type) muokkaus — Paikka-vaihe lukittu (D-02)
- Muutoshistoria / audit log — ei v1.7:ssä
- Multi-venue ketjuadmin — Future requirements -listalla
