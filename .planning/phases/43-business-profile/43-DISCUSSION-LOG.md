# Phase 43: Business Profile - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 43-business-profile
**Areas discussed:** Contact email semantics, Page architecture, Save mechanism for contact fields, Read-only account info display

---

## Contact email semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Separate contact_email column | New contact_email column in business_accounts for public-facing contact | |
| Login email update | Supabase auth.updateUser email change with re-verification | |
| Phone number only | New contact_phone column; phone is admin-to-user contact channel | ✓ |

**User's choice:** Free text — "First of all the contact information in the profile isn't the same as the contact info of some venue. The info in the profile is for the users personal info. Lets add only phone number field there. That's editable and is for adding the possibility for admin to contact the user via phone."

**Notes:** Venue contact info (phone, email, website per venue) is already handled by WizardInner step 5 (Yhteystiedot) in business_paikka_links/liikuntapaikat. The /business/profiili editable field is entirely separate — it's the business user's own phone number so admins can call them. BIZPRO-02 scoped down to contact_phone TEXT NULLABLE only.

---

## Page architecture

| Option | Description | Selected |
|--------|-------------|----------|
| RSC + client split | RSC fetches server-side, passes props to BusinessProfiiliClient | ✓ |
| Pure client component | Fetches on mount with createBusinessBrowserClient() | |
| You decide | Claude picks based on consistency with Phase 42 | |

**User's choice:** RSC + client split (Recommended)

**Notes:** Consistent with Phase 42 dashboard pattern (D-07) and /business/map pattern. Server-side fetch avoids client-side flash.

---

## Save mechanism for contact fields

| Option | Description | Selected |
|--------|-------------|----------|
| Direct Supabase browser client | createBusinessBrowserClient().from('business_accounts').update() | ✓ |
| Route Handler with Bearer token + service role | POST to /api/business/profile | |
| Server Action (use server) | Next.js Server Action with service role | |

**User's choice:** Direct Supabase browser client (Recommended)

**Notes:** RLS allows UPDATE for own account. Mirrors consumer ProfiiliClient save pattern. No Route Handler boilerplate needed for a simple single-column update.

---

## Read-only account info display

| Option | Description | Selected |
|--------|-------------|----------|
| Company name + login email + 'Yritystili' badge | Glass card with name, email, account type badge | ✓ |
| Company name + login email only | Minimal display | |
| Company name + email + account type + approval status | All four fields | |

**User's choice:** Company name + login email + 'Yritystili' badge (Recommended)

**Sign-out placement:**

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom of page | After language toggle, standalone button | ✓ |
| Inside account info card | Top section, next to read-only data | |
| BusinessNav only — skip from page | Nav already has it from Phase 41 | |

**User's choice:** Bottom of page (Recommended)

**Notes:** Less prominent positioning reduces accidental taps. BusinessNav already has sign-out in the pill, but having it also on the profile page is consistent with consumer profiili pattern and explicit BIZPRO-04 requirement.

---

## Claude's Discretion

- Exact main padding (`pt-16` vs `pt-20`) — follow Phase 42 D-06 value
- Glass card structure per section vs combined wrapper
- Save error display style — `text-sm text-red-600` inline below button
- Loading skeleton approach — RSC avoids most loading states; client-side user.id fetch shows minimal spinner

## Deferred Ideas

- `contact_email` and `contact_website` on /business/profiili — scoped down in discussion; venue contact info is already in WizardInner
- Admin-facing display of `contact_phone` in admin approval panel — future admin phase
- Supabase auth email change flow — out of scope
