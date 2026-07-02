# Phase 64: Hallintaoikeuspyynnöt — dashboard-UI - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

The `/business` dashboard's owner-facing DiagonaalKortti card gains a single "team management" entry point per venue: a popup that lets the päähallitsija (owner) approve/reject pending access requests for that venue AND view/remove current sub-managers (never themselves). The approve/reject backend (Phase 60: `app/api/business/access-request/{approve,reject}/route.ts`) already exists and works — this phase builds only the UI that calls it, plus a new removal backend (Route Handler + RLS-aware fetch) that doesn't exist yet. As a deliberate small extension (confirmed twice with the user), Phase 64 also adds a minimal name-collection field to the invite-link signup flow, since `business_accounts` currently has no personal-name column to identify requesters by.

</domain>

<decisions>
## Implementation Decisions

### Pending-requests entry point (ACCESS-04)
- **D-01:** One icon button on the `DiagonaalKortti` dashboard `dashboardActions` controls panel (e.g. a `Users`/`UserPlus` icon from `lucide-react`, matching Phase 63's icon conventions) opens a single popup. This is the ONE combined "team management" entry point — not a separate icon for requests vs. team.
- **D-02:** The icon/popup is shown whenever the venue has pending requests and/or team members beyond the owner (i.e., relevant state exists to manage).
- **D-03:** The popup has two sections: "Pending requests" (rows with requester identity + inline Approve/Reject buttons) and "Current team" (rows with member identity + a remove button, see Team & removal UI below).
- **D-04:** Per the REQUIREMENTS.md Out-of-Scope list, an in-app notification badge/bell system for pending requests is explicitly NOT wanted — email (Phase 60) is deemed sufficient for alerting. This icon+popup is the in-dashboard list ACCESS-04 requires, not a global notification system; do not build a nav-level unread counter.

### Requester/member identification — new name field (small scope extension)
- **D-05:** `business_accounts` has NO personal-name column (`company_name` was dropped entirely in Phase 59's `20260625000000_companies_role_rls.sql` — only `companies.name`, the *company's* name, remains). To show a real name (not just email) in the pending-requests and team lists, Phase 64 ALSO adds a name-collection input to the invite-link signup flow (`app/business/liity` or wherever that signup path lives) plus a new `business_accounts` column (exact naming, e.g. `display_name`/`requester_name`, left to planner). **This is a confirmed deliberate expansion beyond pure dashboard-UI — the user approved it explicitly after being shown the scope-creep tradeoff (it touches Phase 60's deferred "polished signup-via-invite-link onboarding UX"). Do not redirect this back to "defer" during planning/research — it's locked.**
- **D-06:** The full polished signup-via-invite-link onboarding UX (Phase 60's original deferred item) is NOT in scope — only the minimal name field needed for identification. A richer onboarding screen for that flow stays deferred.
- **D-07:** Displaying another user's email still requires a service-role Route Handler (mirrors `admin/approve`'s JWT-verify + `supabaseAdmin` pattern) — RLS cannot join `auth.users` for other users' rows. The name field (D-05) reduces reliance on email for display but doesn't eliminate the need for service-role fetches for the popup's data.

### Team & removal UI (ACCESS-07)
- **D-08:** Team management lives in the SAME popup as pending requests (D-03) — not a separate icon/popup.
- **D-09:** "Current team" rows list all `business_paikka_links` rows for that `paikka_id` beyond the requester's own row — i.e., every member with approved access to that specific venue, joined to `business_accounts.role` to distinguish owner from member. No RLS SELECT policy currently allows an owner to read other members' `business_paikka_links` rows (self-scoped only) — Phase 64 needs a service-role Route Handler for this list (or a new RLS SELECT policy; researcher should evaluate which is more consistent — Phase 60's D-05 precedent favors service-role for sensitive cross-account reads/writes over new RLS).
- **D-10:** Removing a sub-manager requires a confirm-dialog step before the DELETE fires (no undo — the removed member would need to re-request access). Matches the destructive-action caution pattern used elsewhere in the app.
- **D-11:** No email notification on removal — silent DB update. The removed member discovers it via RLS blocking their next access attempt, or their own dashboard/UI reflecting the change on next load. This deliberately diverges from Phase 60's approve/reject-decision emails (user's explicit choice, not an oversight).
- **D-12:** No removal backend exists yet (confirmed via codebase scout — no DELETE RLS policy, no Route Handler). New Route Handler must: JWT-verify caller, confirm caller is `role='owner'` AND holds an approved `business_paikka_links` row for that `paikka_id` (venue-scoped, matching the existing approve/reject authorization shape), guard against removing the owner's own row (ACCESS-07 hard-block, backend-enforced regardless of UI state — see D-14), then delete/downgrade the target member's `business_paikka_links` row for that venue.

### Reject interaction detail
- **D-13:** One-click reject in the dashboard popup — no reason text field in the UI. `rejection_reason` (column already exists on `business_access_requests` since Phase 60) stays `null` for all Phase 64 dashboard-triggered rejections. The requester's decision email (`sendAccessRequestDecisionEmail`, Phase 60) will show no reason for this path — accepted tradeoff for UI simplicity.

### Owner self-protection UX (ACCESS-07)
- **D-14:** The owner's own row IS shown in the "Current team" list (e.g. labeled "(Sinä) Omistaja" or similar — exact copy left to planner), with its remove icon visibly disabled/grayed out — not omitted from the list. This makes the protection explicit and visible in the UI, on top of the backend hard-block (D-12) which is the actual enforcement mechanism (defense-in-depth: UI disables it, backend refuses it even if somehow bypassed).

### Invite-link signup wiring fix (resolves RESEARCH.md Open Question 1 / Assumption A4)
- **D-15:** RESEARCH.md confirmed a pre-existing wiring gap in the invite-link signup flow: `app/business/liity/page.tsx` redirects new/unauthenticated visitors to `/business/rekisteroidy?paikka_id=X`, but `rekisteroidy/page.tsx` never reads `paikka_id`, never sends `invite: true` to `/api/business/register`, and always redirects to `/business` post-signup instead of back to `/business/liity?paikka_id=X`. Result: a brand-new employee who signs up via an invite link today becomes owner of a bogus new company instead of a pending member of the inviting venue. **User decision (post-research, confirmed 2026-07-02): Phase 64 BUNDLES this fix** (pass `paikka_id` through, send `invite: true` to `/api/business/register`, redirect back to `/business/liity?paikka_id=X` after signup) rather than deferring it — because D-05's name-collection field lives in this exact flow and is otherwise unreachable for genuinely new invite-link users. This expands Phase 64's diff beyond the original "minimal name-collection field" framing in D-05/D-06; that expansion is accepted and locked.

### Claude's Discretion
- Exact icon choice for the combined team-management entry point (D-01) — e.g. `Users`, `UserPlus`, `UserCog` from `lucide-react`, matching existing DiagonaalKortti icon sizing/style (`w-7 h-7 rounded-full`, `stopPropagation`/`preventDefault` click guards per Phase 63's established pattern).
- Exact column name for the new `business_accounts` name field (D-05) — e.g. `display_name`, `requester_name`, `contact_name`.
- Whether the new team-list/removal read (D-09) uses a new RLS SELECT policy or a service-role Route Handler — flagged for researcher to evaluate against Phase 60's D-05 precedent (service-role preferred for sensitive cross-account reads in this codebase).
- Exact UI copy/wording for the owner's disabled remove control (D-14) and the confirm-dialog text for removal (D-10).
- Whether the popup reuses/extends `RejectionReasonPopup.tsx`'s glass-panel/backdrop/Escape-close pattern directly, or is a new component — `RejectionReasonPopup` is single-value today (one reason), so a list variant needs restructuring per Phase 63's own scout notes; planner should decide reuse vs. new component.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior phase context
- `.planning/phases/60-hallintaoikeuspyynn-t-backend-s-hk-posti/60-CONTEXT.md` — D-04/D-05 established the venue-scoped (not company-wide) approval model and the service-role approve/reject Route Handler pattern this phase's removal handler must mirror; D-06 explicitly scoped the full request-management dashboard to Phase 64
- `.planning/phases/63-business-dashboardin-preview-n-kymien-uudistus/63-CONTEXT.md` — D-01–D-09 establish the `DiagonaalKortti` dashboard-controls-panel pattern (icon buttons, `panelShade`/`panelChipBg` derivation, `RejectionReasonPopup` as the existing small-popup analog) this phase's new icon/popup must follow
- `.planning/phases/59-multi-company-skeemamigraatio/59-CONTEXT.md` — confirms `business_accounts.company_name` was dropped entirely (D-05 there) — root cause for why Phase 64 needs a new name field (D-05 here)

### Schema this phase builds on
- `supabase/migrations/20260626000000_business_access_requests.sql` — `business_access_requests` table: `id`, `requester_id`, `paikka_id`, `status`, `rejection_reason`, timestamps; partial UNIQUE `(requester_id, paikka_id) WHERE status='pending'`
- `supabase/migrations/20260625000000_companies_role_rls.sql` — `companies` table, `business_accounts.company_id`/`role` (owner/member), `current_company_id()` helper; confirms `company_name` dropped (line 133) and the `REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated` column-lockdown pattern (line 140) — any new `business_accounts` column this phase adds must follow the same REVOKE+explicit-GRANT pattern from PROJECT.md's Key Decisions table, not a broken column-REVOKE
- `supabase/migrations/20260605000000_business_accounts.sql` — base `business_accounts`/`business_paikka_links` shape; confirms `business_paikka_links` has NO `role` column — ownership is derived by joining to `business_accounts.role`, not stored per-link

### Existing approve/reject infrastructure (already built, do not rebuild)
- `app/api/business/access-request/approve/route.ts` — JWT verify → venue-scoped owner authorization (`business_paikka_links` approved row + `role='owner'`) → `UPDATE ... WHERE status='pending'` + `count:'exact'` → sets `business_accounts.company_id/role='member'` + upserts `business_paikka_links` → email via `lib/email.ts`. Phase 64's UI calls this route as-is.
- `app/api/business/access-request/reject/route.ts` — same authorization/concurrency shape, sets `status='rejected'`, optional `rejection_reason` (D-13: Phase 64 UI never populates it).
- `app/api/business/access-request/submit/route.ts` — existing submit path (D-08/D-09/D-10 guards from Phase 60); not modified by this phase except wherever the new name field (D-05) is collected, if that turns out to be the same form.

### Email infrastructure
- `lib/email.ts` — `sendAccessRequestNotificationEmail(to, {requesterName, venueName, requestId})` and `sendAccessRequestDecisionEmail(to, {venueName, approved, reason?})` already exist and are wired into approve/reject/submit. Reused as-is; D-11 confirms no new removal-notification email is added.

### Components to modify
- `app/components/DiagonaalKortti.tsx` — add the new `dashboardActions` icon button (D-01) and wire the popup
- `app/business/page.tsx` — fetch pending requests + team-member data per owned venue (D-09) to feed the new popup; currently only fetches `business_paikka_links` self-scoped (`business_account_id = user.id`)
- `app/components/RejectionReasonPopup.tsx` — evaluate for reuse/extension as the base for the new combined requests+team popup (Claude's Discretion above)
- Invite-link signup flow (exact file TBD by researcher — likely `app/business/liity/` per Phase 60's D-01/D-02 deep-link mechanism) — add the name-collection input (D-05)

### Project-level constraints
- `CLAUDE.md` — glassmorphism `.glass` utilities, monochrome `#111111` accent, 4-size/2-weight typography, animation conventions — the new popup and icon button must follow these
- `.planning/PROJECT.md` Key Decisions table — REVOKE-UPDATE column-privilege pattern (any new `business_accounts` column lockdown), venue-scoped (not company-wide) access model confirmed in Phase 60

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/admin/approve/route.ts` and `access-request/{approve,reject}/route.ts` — direct template for the new removal Route Handler's JWT-verify + authorization + concurrency-safe update shape (D-12)
- `panelShade`/`panelChipBg` derivation (`lib/branding/brandingResult.ts`, used by `DiagonaalKortti.tsx:239-287`) — existing complementary-shade computation for the controls panel; the new icon button slots into this same panel
- `RejectionReasonPopup.tsx` — glass-panel/backdrop/Escape-close popup pattern; base candidate for the new combined popup (needs restructuring from single-value to list, per Phase 63's own scout notes)

### Established Patterns
- Every Route Handler verifies JWT via `supabaseAdmin.auth.getUser(token)` before any DB read (CLAUDE.md constraint, enforced across `admin/approve` and `access-request/{approve,reject}`) — the new removal handler must do the same
- Concurrency-safe state transitions always use `UPDATE ... WHERE status = 'pending'` + `{ count: 'exact' }` (or equivalent guard for the removal DELETE) — never SELECT-then-mutate without a WHERE guard
- Icon buttons on `DiagonaalKortti`'s `dashboardActions` panel: `lucide-react` icons, `w-7 h-7 rounded-full`, `onClick={e => { e.stopPropagation(); e.preventDefault(); ... }}`, conditionally rendered based on venue state (Phase 63 precedent: copy-invite-link only shown when approved+not-kesken)
- Authorization for venue-scoped actions checks BOTH `business_accounts.role === 'owner'` AND an approved `business_paikka_links` row for the specific `paikka_id` — role alone is not sufficient (Phase 60 precedent, must carry into the removal handler)

### Integration Points
- `app/business/page.tsx`'s venue-card render loop (post-Phase-63 `DiagonaalKortti`-grid) is where the new popup trigger and its data-fetch integrate
- `business_paikka_links` composite `UNIQUE(business_account_id, paikka_id)` (Phase 59) is what the removal handler deletes/mutates for the target member+venue pair

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants requester/member identification to include a real name, not just email — pushed back twice when offered "email only" as the simpler default, confirming this despite it touching Phase 60's deferred onboarding-polish item. This is the one place in this discussion where the user chose the more expansive option over the recommended minimal one.
- User wants the owner's own row visibly present but disabled in the team list (not hidden) — explicit preference for visible protection over implicit omission.

</specifics>

<deferred>
## Deferred Ideas

- **Full polished signup-via-invite-link onboarding UX** — Phase 60's original deferred item stays deferred; Phase 64 only adds the minimal name field (D-05/D-06), not a redesigned onboarding screen for that flow.
- **In-app notification badge/bell system** — explicitly Out of Scope per REQUIREMENTS.md; not revisited.
- **Removal email notification** — considered and explicitly declined (D-11), not just unaddressed. If a future need arises, it's a new addition to `lib/email.ts` following the existing conventions.
- **Company-wide `business_paikka_links` visibility widening** — still not delivered (re-deferred from Phase 59 → 60 → still open). Phase 64's team-list read (D-09) is venue-scoped only (for the specific `paikka_id` the popup is opened from), not a company-wide member directory. If a future phase wants a company-wide "all my people across all venues" view, that's new scope.

### Reviewed Todos (not folded)
- **Block business accounts from logging into customer site** (`2026-06-24-block-business-accounts-from-logging-into-customer-site.md`) — reviewed again (also surfaced and deferred in Phase 63), re-confirmed deferred. Different domain: auth/session boundary vs. access-request/team management.

</deferred>

---

*Phase: 64-Hallintaoikeuspyynnöt — dashboard-UI*
*Context gathered: 2026-07-02*
