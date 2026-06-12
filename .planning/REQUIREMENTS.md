# Requirements — v2.0 Business UX & Navigation

**Milestone:** v2.0  
**Status:** Active  
**Total:** 9 requirements across 4 categories

---

## Navigation

- [ ] **BIZNAV-01**: Business user sees a dedicated BusinessNav bar on all `/business/*` pages with links to Dashboard, Kartta, Profiili, and Kirjaudu ulos
- [ ] **BIZNAV-02**: Consumer NavBar is not rendered on any `/business/*` page

## Authentication

- [ ] **BIZUX-02**: User is automatically redirected to `/business` dashboard after successful login at `/business/kirjaudu`

## Dashboard

- [ ] **BIZUX-03**: `/business` dashboard shows an approval status card (pending / approved / rejected + reapply CTA), a venue list with status badges, and quick-action links to Kartta and venue edit

## Map

- [ ] **BIZUX-04**: `/business/map` shows a full-screen map of all published venues; a top-bar pill toggle switches between "Kaikki paikat" and "Omat paikat"; tapping a pin opens PaikkaSheet

## Business Profile

- [ ] **BIZPRO-01**: `/business/profiili` displays the business account's company name, email, and account type (read-only)
- [ ] **BIZPRO-02**: `/business/profiili` allows the user to edit contact fields (phone, email, website) and save them to `business_accounts`
- [ ] **BIZPRO-03**: `/business/profiili` provides a FI/EN language toggle that persists in the `NEXT_LOCALE` cookie
- [ ] **BIZPRO-04**: `/business/profiili` has a sign-out button that clears the `sb-biz-*` session and redirects to `/business/kirjaudu`

---

## Future Requirements

- Auto-detect display language from browser (was deferred in v1.6)
- Business notification preferences (email on approval/rejection)
- Multi-venue account management (ketjuadmin — one account, multiple venues with separate owners)
- Dashboard analytics (visits, sheet opens per venue)

## Out of Scope

- Consumer `/profiili` changes — business users navigate to `/business/profiili`, consumer profile stays unchanged
- BIZUX-05 (hide consumer fields on `/profiili` for business users) — dropped; business users have their own profile page
- Push notifications — not needed at this stage
- Payment/subscription features for sponsored packages — deferred

---

## Traceability

| REQ-ID | Description | Phase |
|--------|-------------|-------|
| BIZNAV-01 | BusinessNav component | Phase 41 |
| BIZNAV-02 | Consumer NavBar hidden on /business/* | Phase 41 |
| BIZUX-02 | Post-login redirect to /business | Phase 41 |
| BIZUX-03 | Dashboard: status card + venue list + actions | Phase 42 |
| BIZUX-04 | /business/map full-screen map + toggle | Phase 42 |
| BIZPRO-01 | /business/profiili display | Phase 43 |
| BIZPRO-02 | /business/profiili contact editing | Phase 43 |
| BIZPRO-03 | /business/profiili language toggle | Phase 43 |
| BIZPRO-04 | /business/profiili sign-out | Phase 43 |
