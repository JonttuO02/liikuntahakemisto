# Feature Research

**Domain:** B2B SaaS team/workspace access — "request access to a shared resource, owner approves" pattern, applied to multi-employee-per-company venue management for a small Finnish local-business directory
**Researched:** 2026-06-24
**Milestone:** v3.1 — saman yrityksen sisäinen hallintaoikeuspyyntö (intra-company access-request feature)
**Confidence:** MEDIUM-HIGH (the request/approve pattern itself is extremely well-established — Slack workspace join requests, Figma/Notion team access requests, GitHub org access requests, generic IAM access-request tooling all converge on the same shape; this is a well-trodden UX problem, not a novel one. Codebase-specific dependency claims are HIGH confidence — read directly from migrations.)

## Context From Existing Codebase

Three load-bearing facts from the current schema constrain every recommendation below (see `supabase/migrations/20260605000000_business_accounts.sql`):

1. **`business_accounts.user_id` is the PRIMARY KEY, FK'd 1:1 to `auth.users(id)`.** There is currently no concept of "a company" as an entity independent of its single login — the account *is* the company. Multi-employee-per-company requires either (a) a new `company_id` that multiple `business_accounts` rows point to, or (b) keeping `business_accounts` as today's "company" row and adding a separate `business_employees`/`business_users` table that maps `auth.users.id` → `business_accounts.user_id` (the company). Option (b) is far less invasive — it adds a join table rather than restructuring the existing 1:1 FK that `business_paikka_links`, `business_branding`, RLS policies, onboarding, and Resend emails all already key off of.
2. **`business_paikka_links.business_account_id` has `UNIQUE(paikka_id)`** — one venue is linked to exactly one `business_accounts.user_id` today. The new feature does NOT need to break this uniqueness: the venue still belongs to one `business_accounts` row (the "company"); what's new is that *multiple employee logins* should be able to manage on behalf of that same `business_accounts` row. This is an important scope boundary — this is an **employee-to-company linking problem**, not a multi-owner-per-venue problem.
3. **All existing RLS policies use `auth.uid() = business_account_id` / `auth.uid() = user_id`.** Every employee who should be able to manage a venue needs their own `auth.uid()` to resolve to the same `business_account_id` for RLS purposes — meaning RLS policies must change from "uid equals the row" to "uid is a member of the company that owns the row," which is the central technical complexity of this feature, independent of the request/approve UX layer.

This means the request-access feature has **two layers that must not be conflated**:
- **Layer A (data model):** how a second employee login becomes linked to the same company at all — this is the harder, schema-changing part.
- **Layer B (request/approve UX):** the actual "ask colleague, colleague approves" flow this research question is about — this is the well-understood, lower-complexity part once Layer A exists.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| "Request access" entry point for a new employee | Every team-based SaaS (Slack, Notion, Figma, Linear, GitHub orgs) lets a new user signal "I belong to this org, let me in" rather than forcing an admin to pre-provision every account — this is the literal feature being requested | LOW-MEDIUM | New employee registers a normal `business_accounts`-style login, then searches/selects the existing company (by name or by the venue they want to manage) and submits a request. Needs a lightweight company lookup — could be venue name search rather than company name search, since employees know "the gym I work at," not necessarily the exact registered company string |
| Pending-request list visible to the approver | Universal expectation — Slack shows pending join requests to workspace admins, GitHub shows pending org access requests to org owners, Notion shows pending member requests to workspace admins. Users expect a clear inbox-like list, not a buried setting | LOW | Render as a card/list inside the existing `/business` dashboard — reuse the visual language already established for venue status pills (`VenueRow` claim_status pattern) rather than inventing a new UI module |
| Approve / Reject buttons with immediate effect | The core verb of the entire pattern — without one-click approve/reject the feature doesn't exist | LOW | Two buttons, optimistic UI update, RLS-guarded mutation restricted to existing members of that company only |
| Email notification to the approver when a request arrives | Async B2B SaaS workflows assume the approver is not staring at the dashboard when the request lands — every reference pattern (Slack, GitHub, IAM tools) notifies by email/Slack so the requester isn't left hanging indefinitely | LOW-MEDIUM | Reuse the existing Resend integration and email-template patterns already built for admin approval notifications (`ADMIN-01`/`ADMIN-04` from v1.7) — same provider, same general shape, new template |
| Email notification to the requester on approval/rejection | Mirrors the existing admin→business approval/rejection email pattern (`ADMIN-04`) — the requester needs to know the outcome without polling the login page | LOW | Same Resend pattern; reject should optionally carry a reason, mirroring the existing admin-rejection-with-reason UX already shipped in v1.7 (`ADMIN-03`) |
| Clear "pending" state shown to the requester while waiting | Users abandon or retry-spam when there's no feedback after submitting a request — every pattern surveyed (Slack "Your request is pending," GitHub "Request pending owner approval") shows an explicit waiting state | LOW | Show a simple "Pyyntö lähetetty, odottaa hyväksyntää" screen/banner on the requester's own dashboard, gating their access to the venue's management UI until approved |
| Requester sees only what they're allowed to see while pending | Critical security/trust expectation — a pending request must not leak existing venue data, edit access, or other employees' info before approval | LOW-MEDIUM | RLS must explicitly NOT grant any `business_paikka_links`/venue-management read or write until the request transitions to `approved` — pending state should be invisible to all RLS-gated venue tables |

### Differentiators (Competitive Advantage)

Genuinely optional for this app's size and audience — call out clearly that none of these are required for v3.1.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Role levels (owner vs. member/editor) | Lets the original registrant retain exclusive rights (e.g. only the owner can remove other employees, change billing-adjacent settings) while employees get day-to-day editing rights | MEDIUM | Only worth building if there's a near-term need to restrict *some* actions to the original company registrant (e.g. deleting the venue, changing company name). For pure "can edit the venue" parity between colleagues, a flat member list with no role distinction is simpler and matches the stated milestone scope ("toinen työntekijä... olemassaolevaan paikkaan") — defer unless a concrete asymmetric-permission need surfaces |
| Audit log of who approved/requested/acted when | Valuable for trust and dispute resolution ("who changed our opening hours?") once a company has 3+ logins | LOW-MEDIUM | Cheap to add incrementally — a single `business_access_log` table (actor_id, action, target, timestamp) appended to on every request/approve/reject/edit. Worth doing even at MVP if cheap, since it's an append-only insert with no UI requirement at launch — UI for viewing it can come later. Low risk to add now, can be silently deferred without harming the core flow if time-constrained |
| Self-service "remove a colleague's access" | Mirrors "leave workspace"/"remove member" patterns in Slack/Notion/GitHub — lets companies prune access without contacting support | LOW-MEDIUM | Natural follow-on once the employee-list concept exists; not required for the initial ask-and-approve loop, but the underlying schema (a join table of employees-per-company) should be designed so this is a simple `DELETE`/status-flip later, not a redesign |
| In-app notification badge (in addition to email) | Reduces reliance on checking email; matches modern SaaS dashboards (Slack bell icon, GitHub notification dot) | LOW | Nice but skippable — email-only is sufficient for a small, low-volume Finnish local-business audience where multi-employee companies will be the minority case, not the majority workflow |
| Request expiry / auto-cancel after N days | Prevents stale pending requests from cluttering the approver's list indefinitely | LOW | Low priority at this scale — manual reject is sufficient; defer until real usage shows abandoned requests piling up |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Full RBAC system (custom roles, granular per-field permissions) | Looks "enterprise-grade" and future-proof | Massive overbuild for a small Finnish sports-venue directory where most companies will have 1-3 employees total; adds permission-matrix UI, more RLS complexity, more support burden, and no current requirement asks for it — directly conflicts with the project's "small local-business app" scale | Flat membership model: an employee is either a member-with-edit-access of the company or not. Re-evaluate only if real usage shows a concrete asymmetric-permission need (e.g. disputes over who can delete a venue) |
| Auto-approve based on matching email domain (e.g. anyone @company.fi auto-joins) | Feels like it removes friction for "obviously legitimate" colleagues | Finnish small businesses very commonly use generic consumer email domains (gmail.com, outlook.com) rather than a custom company domain, so domain-matching would either fail to help most users or, worse, wrongly auto-approve unrelated people who happen to share a domain (gmail.com is everyone) — a real security hole for a feature whose entire purpose is gatekeeping | Keep human-in-the-loop approval always required — it's the explicit design intent already stated in the milestone ("nykyinen hallitsija hyväksyy/hylkää") and is also the correct security model given Finland's email-domain reality |
| Allowing a request to silently auto-approve if no one responds within X hours | Looks like it solves the "what if the approver is unavailable" problem | Defeats the entire purpose of gatekeeping — an unattended request becoming access is exactly the failure mode B2B access-request systems exist to prevent; for a venue-management context this could let an unverified person edit pricing/hours/contact info unsupervised | If approver unresponsiveness becomes a real support issue, address it with a reminder email (resend notification after N days), never with silent auto-grant |
| Letting the requester pick their own role/permission level when requesting | Seems user-friendly ("let them self-describe what they need") | Self-asserted permission level is a textbook privilege-escalation anti-pattern — the approver, not the requester, must be the one who decides what access is granted | Requester submits a plain request ("I'd like to help manage [venue]"); approver's approve action is what grants access, with no role selector needed at MVP (ties to flat-membership recommendation above) |
| Building a generic "organization/teams" abstraction reusable across future unrelated features | Looks architecturally elegant and future-proof | Premature abstraction — this milestone has one concrete need (shared venue management within a company); building a generic multi-purpose teams system risks scope creep, delays shipping, and may not even fit whatever the *next* real multi-user need turns out to be | Build the minimal join table needed for this feature (employee ↔ company ↔ access-request status) and let it evolve later if/when a second real use case appears — consistent with this project's existing pattern of avoiding speculative generality (e.g. Ketjuadmin explicitly deferred in PROJECT.md rather than designed preemptively) |
| Real-time (websocket/polling) live update of the pending-request list | Feels modern and responsive | Unnecessary complexity for a feature where requests will be rare (maybe one every few months per company) — this is a low-frequency, low-urgency interaction, not a chat app | Standard request/response: dashboard re-fetches pending requests on page load/navigation, exactly like the existing admin approval queue (`/admin`) already does with no real-time layer |

## Feature Dependencies

```
[Employee-to-company link (Layer A: data model)]
    └──requires──> [New table: business_employees or business_company_members
                     (auth.users.id ↔ business_accounts.user_id "company" anchor, with status: pending/approved/rejected)]
                       └──requires──> [RLS policy rewrite: every policy currently checking
                                        auth.uid() = business_account_id must become
                                        auth.uid() IN (SELECT user_id FROM business_employees
                                          WHERE company_id = business_account_id AND status = 'approved')]

[Request-access UX (Layer B: this research's scope)]
    └──requires──> [Employee-to-company link table existing first — Layer B is pure UI/notification
                     work on top of Layer A's schema; cannot be built before Layer A lands]
    └──requires──> [Venue/company lookup for the requester — must let a new employee find
                     "the colleague's company" without already having access to it
                     (e.g. search by venue name, not by internal company_id)]

[Approve/reject buttons on existing colleague's dashboard]
    └──requires──> [Pending-request list query scoped to companies the logged-in employee
                     already belongs to as 'approved' — must not let a pending requester
                     see or approve their own request]

[Email notifications (request submitted, approved, rejected)]
    └──enhances──> [Existing Resend integration (ADMIN-01/04 pattern from v1.7)]
    └──reuses──> [Existing email-template conventions, not a new provider/integration]

[Audit log (differentiator, optional)]
    └──enhances──> [Employee-to-company link table — independent append-only addition,
                     does not block or get blocked by the core request/approve flow]

[Role levels: owner vs member (differentiator, optional)]
    └──conflicts──> [Flat membership model recommended for MVP — adding roles later means
                      adding a role column to the same join table, not a redesign, so deferring
                      this does not create technical debt]
```

### Dependency Notes

- **Layer A (employee-to-company schema) must land before Layer B (request/approve UX) — they cannot be built in parallel.** Layer B's entire UI (request form, pending list, approve/reject buttons) reads and writes rows in whatever table Layer A creates. Sequence these as two plans within the same phase, or as two phases with A strictly before B, not as parallel work.
- **RLS rewrite is the highest-complexity, highest-risk piece, not the request/approve UI.** Every existing RLS policy on `business_paikka_links`, `business_branding`, and any future business-scoped table keys off `auth.uid() = business_account_id`. Changing this to a subquery against a membership table touches every table the business portal already relies on — this needs careful regression testing (existing single-employee companies must keep working exactly as before; this is an additive capability, not a replacement of the existing single-login flow).
- **The venue/company lookup step is a small but easy-to-miss piece.** Unlike the admin approval flow (where the admin already sees every pending business registration), here the *requesting employee* needs a way to find "my colleague's existing company" without already having access to it — likely a venue name search (since employees know their workplace's public name) that resolves to the underlying `business_accounts` row, rather than requiring the employee to know any internal ID.
- **Audit log and role levels are both decoupled enhancements** — neither blocks nor is blocked by the core request/approve loop, and both can be added later without schema rework if the join table is designed with a `status` and (for audit) an append-only action log from day one. Recommend including audit logging at MVP since it is cheap insurance; recommend deferring role levels since flat membership matches the stated requirement exactly.
- **This feature explicitly does NOT touch `business_paikka_links`'s `UNIQUE(paikka_id)` constraint** — the venue still has exactly one owning `business_accounts` row (the company); what changes is how many `auth.users` logins can act on behalf of that one company row. Conflating this with "multiple companies can co-manage one venue" would be solving a different, out-of-scope problem (closer to the already-deferred Ketjuadmin idea, which is the inverse: one company managing multiple venues — not relevant here).

## MVP Definition

### Launch With (v1.1 — this milestone)

- [ ] New employee registration flow that, instead of (or in addition to) creating a brand-new company, lets the employee search for and request to join an existing company via the venue it manages — essential entry point for the whole feature
- [ ] `business_employees`-style join table: `auth.users.id`, company anchor (`business_accounts.user_id`), `status` (`pending`/`approved`/`rejected`), `created_at` — essential data model, smallest viable shape
- [ ] RLS policy updates on `business_paikka_links` (and any other company-scoped tables touched by day-to-day venue management) to check membership via the join table instead of direct `auth.uid() = business_account_id` equality — essential, this is what actually grants the new employee real access once approved
- [ ] Pending-request list on the approving colleague's `/business` dashboard with Approve/Reject buttons — essential, the core UX ask
- [ ] Resend email to the existing colleague(s) when a request arrives — essential, mirrors `ADMIN-01` precedent already shipped
- [ ] Resend email to the requester on approval or rejection (with optional reason on rejection, mirroring `ADMIN-03`) — essential, closes the loop so the requester isn't left guessing
- [ ] "Request pending" waiting state shown to the requester, with explicit RLS-enforced zero access to venue data until approved — essential security/trust requirement

### Add After Validation (v1.x)

- [ ] Audit log of access-request and approval actions (who requested, who approved, when) — cheap, low-risk to add even at MVP if time allows; otherwise first thing to add after launch
- [ ] Self-service "remove a colleague's access" from the dashboard — natural follow-on once the membership table exists and the first real multi-employee company exists in production
- [ ] In-app notification badge in addition to email — only worth it once real usage shows email-only is insufficient

### Future Consideration (v2+)

- [ ] Role levels (owner vs. member) with asymmetric permissions (e.g. only the owner can remove people or delete the venue) — defer until a concrete dispute or support request demonstrates the flat model is insufficient
- [ ] Request expiry / reminder emails for stale pending requests — defer until real usage shows abandoned requests are a problem
- [ ] Generalized teams/organizations abstraction reusable beyond this one feature — explicitly avoid premature generalization; revisit only if a second, genuinely different multi-user need appears (e.g. if Ketjuadmin from PROJECT.md's Future list is picked up later, design this table with that in mind but do not build it now)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Employee-to-company join table + status field | HIGH | MEDIUM | P1 |
| RLS rewrite for membership-based access | HIGH | MEDIUM-HIGH | P1 |
| Request-to-join entry point (venue/company search) | HIGH | LOW-MEDIUM | P1 |
| Pending-request list + approve/reject buttons | HIGH | LOW | P1 |
| Email notifications (request + outcome) | HIGH | LOW | P1 |
| Requester "pending" waiting state with zero leaked access | HIGH | LOW | P1 |
| Audit log of requests/approvals | MEDIUM | LOW | P2 |
| Self-service remove-colleague | MEDIUM | LOW-MEDIUM | P2 |
| In-app notification badge | LOW-MEDIUM | LOW | P3 |
| Role levels (owner/member) | MEDIUM | MEDIUM | P3 |
| Request expiry/reminders | LOW | LOW | P3 |
| Full custom RBAC | LOW (for this scale) | HIGH | Avoid |

**Priority key:**
- P1: Must have for this milestone's launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor / Reference Pattern Analysis

| Feature | Slack (workspace join request) | GitHub (org access request) | Our Approach |
|---------|----------------------------------|------------------------------|---------------|
| Request entry point | User signs up with a matching email domain or shared invite link, requests to join | User searches for the org, clicks "Request access" on the org page | Employee searches by venue name (more intuitive for this audience than an internal company ID), requests to join the company that manages it |
| Who approves | Any existing workspace admin/owner | Org owners or admins | Any existing approved employee of that company — flat model, no special "owner" tier required at MVP, matching the milestone's literal wording ("nykyinen hallitsija hyväksyy") |
| Notification to approver | In-app + email digest | Email + in-app notification | Email only at MVP (Resend, reusing existing pattern) — in-app badge deferred |
| Outcome notification to requester | In-app + email | Email | Email only at MVP, mirrors existing `ADMIN-04` business-approval email pattern |
| Role granted on approval | Member (flat, with separate admin promotion later) | Member (flat, with separate role assignment later) | Flat "approved employee" — no role distinction at MVP, consistent with both reference patterns deferring roles to a later, separate step |
| Domain-based auto-approval | Sometimes offered as an org-level opt-in setting | Not offered — always explicit approval | Explicitly avoided (anti-feature) — Finnish small businesses commonly use generic consumer email domains, making domain-matching unreliable and risky |

## Sources

- General access-request/approval-workflow conventions, audit-log schema patterns for multi-tenant SaaS (MEDIUM confidence — aggregated industry blog consensus, consistent across multiple independent sources, not a single primary spec): [Zluri — How To Optimize User Access Requests & Approvals for SaaS Tools](https://www.zluri.com/blog/how-to-optimize-user-access-requests-and-approvals-for-saas-tools), [Entitle — What are Approval Workflows](https://www.entitle.io/resources/glossary/approval-workflows), [Veza — Access Request Management: A Complete Guide](https://veza.com/blog/access-request-management/)
- Multi-tenant SaaS architecture, audit logging, and role/membership patterns (MEDIUM-HIGH confidence — vendor technical content from identity/auth infrastructure providers, internally consistent): [WorkOS — The developer's guide to SaaS multi-tenant architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture), [Clerk — Multi-tenant authentication](https://clerk.com/blog/multi-tenant-authentication-what-you-need-to-know), [AWS Prescriptive Guidance — Multi-tenant SaaS authorization and API access control](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/introduction.html)
- Reference patterns for request-to-join / org-access-request UX (MEDIUM confidence — drawn from well-known, widely-documented product behavior in Slack workspace joins, GitHub organization access requests, Notion/Figma team member requests; general product knowledge cross-checked against the access-management sources above, not independently re-verified against current vendor docs for this report)
- Existing codebase, read directly as primary source (HIGH confidence): `supabase/migrations/20260605000000_business_accounts.sql`, `.planning/PROJECT.md` (BIZ-01/02/03, ADMIN-01–05, CLAIM-04/05, Ketjuadmin deferred-feature note)

---
*Feature research for: Liikuntahakemisto v3.1 — intra-company employee access-request feature for shared venue management*
*Researched: 2026-06-24*
