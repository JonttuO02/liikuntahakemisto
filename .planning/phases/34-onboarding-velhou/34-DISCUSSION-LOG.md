# Phase 34: Onboarding-velhou - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 34-onboarding-velhou
**Areas discussed:** Wizard trigger & routing, Data persistence strategy, Media upload mechanics, Pricing & hours input

---

## Wizard trigger & routing

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /business/onboarding after claim/create | Claim/create Route Handlers redirect directly to wizard. No pending placeholder needed. | ✓ |
| Business page redirects if onboarding incomplete | /business detects onboarding_completed=false and redirects. | |
| Wizard launches as overlay on /business | Modal/sheet overlay — /business URL stays the same. | |

**User's choice:** Redirect to /business/onboarding after claim/create

---

| Option | Description | Selected |
|--------|-------------|----------|
| /business/onboarding?step=2 (query param) | Single page component reads ?step=N. Back/forward browser buttons work. | ✓ |
| /business/onboarding/2 (path segment) | Each step is a separate Next.js route file. | |
| React state only, no URL step | Step tracked in useState. Browser back goes to /business. | |

**User's choice:** /business/onboarding?step=2 (query param)

---

| Option | Description | Selected |
|--------|-------------|----------|
| onboarding_completed boolean on business_accounts | New boolean column; set true at Step 6 submit. | ✓ |
| Infer from data existence | Wizard done if business_paikka_links exists AND liikuntapaikat has non-null fields. | |

**User's choice:** onboarding_completed boolean on business_accounts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — completed steps are unlocked, can revisit | Progress bar shows completed steps as clickable. Validation only on forward movement. | ✓ |
| No — strictly linear, can't go back | Each step is a one-way gate. | |

**User's choice:** Yes — completed steps are unlocked, can revisit

---

## Data persistence strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Save per step as user advances | Each 'Next' click saves that step's data to DB immediately. | ✓ |
| Accumulate in state, submit everything at Step 6 | All data held in React state or localStorage. One API call at the end. | |

**User's choice:** Save per step as user advances

---

| Option | Description | Selected |
|--------|-------------|----------|
| Update liikuntapaikat row directly per step | Each step PATCHes relevant columns on liikuntapaikat via Route Handler. | |
| Separate onboarding_draft table | Draft data lives separately; merged into liikuntapaikat only at final submit. | ✓ |

**User's choice:** Separate onboarding_draft table
**Notes:** More isolation — live data stays untouched until the full wizard is submitted.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Final submit Route Handler copies draft → liikuntapaikat atomically | Step 6 POST copies all draft fields + sets onboarding_completed = true. Draft deleted after. | ✓ |
| Admin approval triggers the merge | Draft stays separate until admin approves in Phase 35. | |

**User's choice:** Final submit Route Handler copies draft → liikuntapaikat atomically

---

| Option | Description | Selected |
|--------|-------------|----------|
| Load from onboarding_draft on wizard mount | Wizard fetches existing draft on load and resumes at current step. | ✓ |
| Always restart from Step 1 | No resume logic; user must re-enter everything. | |

**User's choice:** Load from onboarding_draft on wizard mount

---

## Media upload mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate zones: logo (1 file) + photos (1–5 files) | Distinct upload areas. Logo as square preview; photos as horizontal strip. | ✓ |
| Single zone, user tags each file as photo or logo | One upload button; dropdown per file to mark type. | |
| Photos only in Step 2; logo as separate optional step | Logo moved to Step 5 or own step. | |

**User's choice:** Two separate zones: logo (1 file) + photos (1–5 files)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Click to open file picker, thumbnails shown after select | Simple input[type=file]. No drag-and-drop. | |
| Drag-and-drop zone + click fallback | Dotted drop zone; drag or click to browse. | ✓ |

**User's choice:** Drag-and-drop zone + click fallback

---

| Option | Description | Selected |
|--------|-------------|----------|
| On 'Next' button click | User picks files (shown as previews), clicks Next — then upload happens with progress bar. | ✓ |
| Immediately on file select | Each file uploads the moment it's picked. Progress bar per file. | |

**User's choice:** On 'Next' button click

---

## Pricing & hours input

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed category list as rows | Predefined types: Kertakäynti / Kuukausijäsenyys / 10-kerran kortti / Vuosijäsenyys. | |
| Fully free-form rows | User adds rows with custom name + price. No predefined categories. | |
| Fixed + user can add custom rows | Fixed rows first, then '+ Lisää hintarivi' button for custom additions. | ✓ |

**User's choice:** Fixed + user can add custom rows

---

| Option | Description | Selected |
|--------|-------------|----------|
| Per-day rows: checkbox 'Auki' + time range inputs | 7 rows (Ma–Su). Each: day name, toggle, start time, end time. Google Places prefilled. | ✓ |
| Grid/table with all days at once | Spreadsheet-style. Compact but harder on mobile. | |
| Free-text field | Single textarea. Simple but no structured data. | |

**User's choice:** Per-day rows: checkbox 'Auki' + time range inputs

---

| Option | Description | Selected |
|--------|-------------|----------|
| In onboarding_draft as JSONB, merged to liikuntapaikat.hinnasto on submit | Consistent with onboarding_draft decision above. | ✓ |
| Separate pricing rows table | Each price row is a DB row in a new table. | |

**User's choice:** In onboarding_draft as JSONB, merged to liikuntapaikat.hinnasto on submit

---

## Claude's Discretion

- Storage path structure for media: `{business_account_id}/{paikka_id}/photos/` and `{business_account_id}/{paikka_id}/logo/` — standard hierarchical layout
- Progress bar during upload: single overall bar (not per-file) using Tailwind width transition
- onboarding_draft schema fields: researcher to define exact column names and JSONB structure

## Deferred Ideas

- Kuvien järjestyksen muokkaus drag-and-drop:lla Step 2:ssa — lykätty; latausjärjestys riittää Phase 34:ssa
- Laji-kenttä Step 1:ssä — researcher selvittää onko laji jo saatavilla claim/create-datasta
- Sähköpostivahvistus submit-hetkellä yritykselle — Phase 35 (Admin-hyväksyntäjärjestelmä) hoitaa tämän
