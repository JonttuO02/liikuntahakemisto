# Architecture Research

**Domain:** Multi-user-per-company B2B account model + cross-employee access-request workflow, layered onto an existing Next.js 14 + Supabase business portal
**Researched:** 2026-06-24
**Confidence:** HIGH (grounded directly in this repo's existing migrations, route handlers, and `lib/supabase-business.ts` — not generic SaaS theory)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Browser — sb-biz-* cookie namespace                 │
├──────────────────────────────────────────────────────────────────────────┤
│  /business/kirjaudu   /business (dashboard)   /business/[id] (venue)     │
│       │                      │                        │                 │
│       │   ┌──────────────────┴───────────┐   ┌─────────┴──────────┐     │
│       │   │ VenueAccessBadge /            │   │ AccessRequestModal │     │
│       │   │ RequestAccessButton           │   │ (employee-initiated)│    │
│       │   └──────────────────┬───────────┘   └─────────┬──────────┘     │
│       │                      │                          │                │
│       │   ┌──────────────────┴───────────────────────────┐              │
│       │   │ PendingAccessRequestsPanel (manager-facing,    │              │
│       │   │ rendered on /business dashboard, approve/reject)│              │
│       │   └──────────────────┬───────────────────────────┘              │
├───────┴──────────────────────┴──────────────────────────────────────────┤
│                    Route Handlers (app/api/business/*)                  │
│  POST /api/business/access-requests        (create request)             │
│  GET  /api/business/access-requests        (list mine + incoming)       │
│  POST /api/business/access-requests/[id]/approve                        │
│  POST /api/business/access-requests/[id]/reject                         │
│  — each verifies JWT via supabaseAdmin.auth.getUser(token), exactly      │
│    like existing approve/reject/register routes                         │
├──────────────────────────────────────────────────────────────────────────┤
│                          lib/email.ts (Resend)                          │
│  sendAccessRequestEmail(toManager, requester, venue)                    │
│  sendAccessRequestDecisionEmail(toRequester, venue, decision)            │
├──────────────────────────────────────────────────────────────────────────┤
│                    Supabase Postgres + RLS (service role writes)        │
│  business_accounts (existing, 1 row = 1 auth user)                      │
│  business_paikka_links (existing, UNIQUE(paikka_id) — 1 manager/venue)   │
│  venue_access_requests (NEW — requester, venue, current manager, status)│
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `venue_access_requests` table | Single source of truth for a pending/approved/rejected request to gain management rights on a venue already linked to another `business_accounts` row | New table, FK to `liikuntapaikat`, `business_accounts` (requester), `business_accounts` (current manager, denormalized at request time) |
| `business_paikka_links` (existing) | Still the authority on "who manages this venue" — `UNIQUE(paikka_id)` stays; an approved access request **re-points** this row's `business_account_id`, it does not duplicate it | Existing table, no schema change required for the access-request feature itself |
| `POST /api/business/access-requests` | Validates requester JWT, looks up venue's current manager via `business_paikka_links`, inserts request row, fires manager-notification email | Route Handler, mirrors `register/route.ts` JWT pattern |
| `POST /api/business/access-requests/[id]/approve` | Verifies caller is the *current manager* of the target venue (not `is_admin`), re-points `business_paikka_links.business_account_id` to requester, marks request `approved`, emails requester | Route Handler, mirrors `admin/approve/route.ts` concurrency-safe pending-filter pattern |
| `POST /api/business/access-requests/[id]/reject` | Verifies caller is current manager, marks request `rejected`, emails requester | Route Handler, mirrors `admin/reject/route.ts` |
| Dashboard UI (`/business`) | Renders a "Pending requests for your venues" panel (manager view) and a "Your sent requests" status strip (requester view) | Client component, fetches via the two GET-shaped list endpoints or a single combined endpoint |
| `lib/email.ts` additions | Two new senders following the exact `sub()`/`esc()` escaping pattern already in the file | Pure functions appended to existing file, no new dependency |

**Key architectural decision — no `companies` table.** The milestone scope (per PROJECT.md "Future" list) explicitly defers "Ketjuadmin" (chain admin — one tenant, many venues, many owners) to a later milestone. Introducing a `companies` table now would require migrating `business_accounts.company_name` (a free-text field, not normalized) into a foreign key, touching every existing read path (`/business`, `/admin`, onboarding, branding) and the email templates. That is out of scope for v3.1, which only asks for "a second employee can request access to a venue the company already manages." A lightweight **join/request table** is sufficient and strictly additive — zero existing schema or query needs to change.

## Recommended Project Structure

```
supabase/migrations/
└── 20260625000000_venue_access_requests.sql   # NEW — table + RLS, additive only

app/api/business/
├── access-requests/
│   ├── route.ts              # POST (create) + GET (list, scoped by query param: mine|incoming)
│   └── [id]/
│       ├── approve/route.ts  # POST — manager-only
│       └── reject/route.ts   # POST — manager-only

app/business/
├── page.tsx                          # existing dashboard — add <AccessRequestsPanel /> render slot
├── AccessRequestsPanel.tsx           # NEW client component (incoming list + approve/reject buttons)
├── RequestAccessButton.tsx           # NEW — shown on a venue card when viewer ≠ current manager
└── AccessRequestModal.tsx            # NEW — confirm-and-submit dialog

lib/
└── email.ts                          # MODIFIED — add sendAccessRequestEmail + sendAccessRequestDecisionEmail
```

### Structure Rationale

- **`access-requests/` route folder mirrors `admin/` exactly** — same JWT-verify-first pattern, same `[id]/approve` and `[id]/reject` sub-route shape already proven in `app/api/admin/approve/route.ts` and `app/api/admin/reject/route.ts`. No new pattern to learn.
- **No new page/route** — the feature lives entirely inside the existing `/business` dashboard, consistent with this milestone's stated goal of consolidating UI rather than spreading it across new pages.
- **`lib/email.ts` extended, not duplicated** — keeps the single Resend client, the `sub()`/`esc()` injection-safe helpers, and the `FROM`/`ADMIN_EMAIL` env convention in one place.

## Architectural Patterns

### Pattern 1: Lightweight request/grant table, no tenant table

**What:** A new `venue_access_requests` table records the *intent* (who wants access to what, who must decide). It does **not** become the authority on current access — `business_paikka_links.business_account_id` remains that authority. Approval is a side-effecting UPDATE on the existing link row, not a new grant table that the rest of the app would need to learn to query.

**When to use:** When the underlying access model (1 manager per venue, via `business_paikka_links.UNIQUE(paikka_id)`) does not need to change — only *who* currently holds that single slot needs a request/approval workflow to change hands.

**Trade-offs:** Simpler migration, zero changes to every existing query that reads `business_paikka_links` to determine venue ownership (`/business`, `/admin`, onboarding, branding, RLS policies). Trade-off: this models "transfer of single manager" rather than "multiple simultaneous managers per venue." That matches the milestone's literal spec ("nykyinen hallitsija hyväksyy/hylkää" — *the current* manager approves) — it is a hand-off, not co-management. If a future milestone wants *simultaneous* multi-manager venues, `business_paikka_links` would need its `UNIQUE(paikka_id)` relaxed to `UNIQUE(paikka_id, business_account_id)` — explicitly flag this as a Future item, do not build it now.

**Example:**
```sql
-- venue_access_requests: requester wants to take over management of paikka_id
-- currently held by current_manager_id (denormalized snapshot at request time,
-- so the email and UI can show "who you're asking" even if it changes later)
CREATE TABLE venue_access_requests (
  id                 BIGSERIAL PRIMARY KEY,
  paikka_id          BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  requester_id       UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  current_manager_id UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at         TIMESTAMPTZ
);
```

### Pattern 2: Approval mutates the existing link row, not a new "membership" row

**What:** On approve, the Route Handler does **one transaction-equivalent pair of writes**: (1) `UPDATE business_paikka_links SET business_account_id = requester_id WHERE paikka_id = X AND business_account_id = current_manager_id` (concurrency-guarded exactly like `admin/approve/route.ts`'s `count: 'exact'` + `.eq('claim_status','pending')` pattern), and (2) `UPDATE venue_access_requests SET status = 'approved', decided_at = now() WHERE id = Y AND status = 'pending'`.

**When to use:** Any time "access changes hands" rather than "access is added alongside existing access."

**Trade-offs:** Clean and consistent with existing `claim_status` state-machine idioms in the codebase. Trade-off: the *previous* manager instantly loses dashboard visibility into that venue (their RLS-scoped queries on `business_paikka_links` stop returning that row). This is almost certainly the desired behavior for "hand the keys to a colleague," but confirm with the user during `/gsd:discuss-phase` whether the outgoing manager should be soft-revoked instead of hard-cut.

**Example:**
```typescript
// app/api/business/access-requests/[id]/approve/route.ts
const { count: linkUpdated } = await supabaseAdmin
  .from('business_paikka_links')
  .update({ business_account_id: req.requester_id }, { count: 'exact' })
  .eq('paikka_id', req.paikka_id)
  .eq('business_account_id', user.id) // caller must BE the current manager
if (!linkUpdated) return NextResponse.json({ error: 'Not current manager' }, { status: 409 })

await supabaseAdmin
  .from('venue_access_requests')
  .update({ status: 'approved', decided_at: new Date().toISOString() })
  .eq('id', requestId)
  .eq('status', 'pending')
```

### Pattern 3: RLS for "colleagues see each other's venues" without a companies table

**What:** Since there is no `companies` table, "colleague" cannot be resolved by a JOIN on a shared `company_id`. Two viable options, in order of preference for this milestone:

1. **Scope visibility to the request itself, not to "all colleague venues."** The requester only ever needs to see (a) their own `business_paikka_links` rows and (b) the venues they have an open or resolved `venue_access_requests` row for. This requires **zero new RLS policy on `liikuntapaikat`** — the existing `business_paikka_links` SELECT policy (`auth.uid() = business_account_id`) is untouched, and a new `venue_access_requests` SELECT policy covers `requester_id = auth.uid() OR current_manager_id = auth.uid()`. This is the minimal, correct scope for "Saman yrityksen toisen työntekijän hallintaoikeuspyyntö olemassa olevaan paikkaan" as literally specified — the requester names a *specific existing venue* (e.g. by company name search or a shared invite link), they do not browse "all of my company's venues" first.
2. **If product wants a colleague to browse a list of "your company's venues" before requesting** (broader visibility), that requires *some* notion of "same company," which today only exists as a free-text `company_name` string. Do **not** match on `company_name` string equality for RLS (fragile, typo-prone, security-relevant). If this is needed, it is the trigger to introduce a minimal `companies` table after all — but confirm this requirement explicitly before building it; it is a bigger schema change than the milestone description implies.

**When to use:** Option 1 for this milestone. Option 2 only if discuss-phase surfaces an explicit requirement for "browse colleague venues without already knowing which one."

**Trade-offs:** Option 1 keeps the migration purely additive and avoids ever needing a privilege check more complex than "are you the requester or the current manager of this specific row" — which the existing JWT-verify-then-row-ownership-check pattern in this codebase already does for every other table.

## Data Flow

### Request Flow (employee requests access to a colleague's venue)

```
Employee logs in as a NEW business_accounts row (own registration via existing
/api/business/register — no schema change needed, they are just another
1 user_id : 1 business_accounts row, same as today)
    ↓
Employee identifies target venue (by name/address search against liikuntapaikat,
or a shared deep link containing paikka_id — exact UX is a discuss-phase decision)
    ↓
POST /api/business/access-requests { paikka_id }
    ↓
Route Handler:
  1. verify JWT → requester_id = user.id
  2. SELECT business_account_id FROM business_paikka_links WHERE paikka_id = X
     → current_manager_id (404 if venue has no manager yet — nothing to request)
  3. guard: requester_id != current_manager_id (can't request your own venue)
  4. guard: no existing 'pending' request for (paikka_id, requester_id) — avoid duplicate spam
  5. INSERT venue_access_requests (status='pending')
  6. fire sendAccessRequestEmail(to: current_manager's email via
     supabaseAdmin.auth.admin.getUserById, requester company_name, venue nimi)
     — non-critical, wrapped in try/catch exactly like admin/approve's email step
    ↓
Manager sees it in <AccessRequestsPanel /> on /business dashboard
(GET /api/business/access-requests?scope=incoming — RLS-equivalent filter
 current_manager_id = auth.uid() AND status = 'pending')
    ↓
Manager clicks Approve or Reject
    ↓
POST /api/business/access-requests/[id]/approve   (or /reject)
    ↓
Route Handler:
  1. verify JWT → caller must equal request.current_manager_id (403 otherwise —
     this is a NEW authorization check distinct from is_admin; it is "are you
     the manager", not "are you platform staff")
  2. approve: UPDATE business_paikka_links.business_account_id = requester_id
              (concurrency-guarded, count-checked — see Pattern 2)
     reject:  no link mutation
  3. UPDATE venue_access_requests SET status, decided_at (guarded by
     .eq('status','pending') to prevent double-processing, same idiom as
     admin/approve)
  4. fire sendAccessRequestDecisionEmail(to: requester's email, venue nimi, decision)
    ↓
Requester sees updated status in their own "sent requests" list on /business
(GET /api/business/access-requests?scope=mine)
```

### State Management

```
venue_access_requests.status: 'pending' → 'approved' | 'rejected'
business_paikka_links.business_account_id: re-pointed only on 'approved'
    ↓ (dashboard re-fetch after action, same pattern as existing approve/reject
       client code which re-fetches /business state after admin actions)
/business page.tsx server component re-renders with new ownership
```

### Key Data Flows

1. **Request creation:** Employee → venue lookup → manager resolution via existing `business_paikka_links` → insert request → async email to manager. No write to `business_paikka_links` happens here — only on decision.
2. **Decision:** Manager-only mutation gated by `current_manager_id` equality (a *row-level* authorization check, not the existing `is_admin` platform-role check used in `/admin` routes — this is new and must not be confused with admin approval workflow, which governs *new venue applications*, not *intra-company access transfer*).
3. **Notification:** Both emails reuse the existing `lib/email.ts` Resend singleton, `sub()`/`esc()` sanitization, and `NEXT_PUBLIC_APP_URL` link-back convention — zero new email infrastructure.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (few dozen business accounts) | Table as designed is more than sufficient; no indexing beyond PK/FK needed |
| 100s of businesses, frequent employee turnover | Add an index on `venue_access_requests(paikka_id, status)` and `(requester_id, status)` for dashboard list queries; consider an `expires_at` / auto-expire-stale-pending-requests cron if requests pile up unanswered |
| Multi-manager-per-venue need emerges | This is the trigger to revisit the "no companies table" decision — see Pattern 3 option 2 — not a concern for this milestone |

### Scaling Priorities

1. **First bottleneck:** none expected at this app's scale — this is a low-volume B2B workflow (one request per employee-onboarding event, not a high-frequency table).
2. **Second bottleneck:** if "browse colleague venues" (Pattern 3 option 2) is added later, that is the point to introduce a real `companies` table with a migration that backfills from `business_accounts.company_name` — plan that as its own phase, not bundled into this access-request feature.

## Anti-Patterns

### Anti-Pattern 1: Adding a `companies` table "to be safe" for this milestone

**What people do:** Pre-emptively normalize `company_name` into a `companies` table with `business_accounts.company_id` FK, reasoning "we'll need it eventually for multi-tenant."
**Why it's wrong:** PROJECT.md explicitly defers "Ketjuadmin" (the actual multi-tenant/chain-admin need) to Future. Doing it now means migrating every existing read of `business_accounts.company_name` (dashboard, admin panel, onboarding, branding, emails) for a milestone that doesn't require it, and risks merge conflicts with the parallel v3.1 work (dashboard redesign, page consolidation) touching the same files.
**Do this instead:** Ship `venue_access_requests` as a pure addition. If a real multi-tenant `companies` table becomes necessary, do it as its own dedicated migration phase with its own backfill plan.

### Anti-Pattern 2: Reusing `is_admin` / `/admin` approval plumbing for venue access requests

**What people do:** Route access-request approval through the existing `admin/approve` endpoint or check `profiles.is_admin`, since "approval" already exists in the codebase.
**Why it's wrong:** `is_admin` governs *platform staff* approving *new venue applications* into the marketplace. Venue access requests are approved by the *current business manager of that specific venue* — a completely different authorization boundary. Conflating them would let any admin approve access transfers (probably fine) but, worse, would make it easy to accidentally let an *unrelated* business manager approve someone else's request if the row-ownership check is copy-pasted carelessly from the admin route without adapting the guard condition.
**Do this instead:** New authorization check: `request.current_manager_id === verified user.id`, completely separate from `is_admin`.

### Anti-Pattern 3: Allowing the access-request endpoint to accept an arbitrary `current_manager_id` from the client

**What people do:** Trust a `manager_id` field in the POST body to know who to notify/require approval from.
**Why it's wrong:** Same elevation-of-privilege class of bug this codebase already explicitly guards against in `register/route.ts` (comment: "attacker cannot POST an arbitrary user_id"). A client-supplied manager id could let a requester self-approve by claiming to be their own manager.
**Do this instead:** Always derive `current_manager_id` server-side from `SELECT business_account_id FROM business_paikka_links WHERE paikka_id = X`, never from the request body.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Resend (existing) | Append two new sender functions to `lib/email.ts` using the existing `resend.emails.send()` call shape | No new env vars; reuse `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` |
| Supabase Auth (existing `sb-biz-*`) | No change — employees register exactly like any other business account via existing `/api/business/register`; the *only* new concept is the request/approval table | Manager's email for notification comes from `supabaseAdmin.auth.admin.getUserById(current_manager_id)`, same call already used in `admin/approve/route.ts` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `venue_access_requests` ↔ `business_paikka_links` | Direct SQL read (resolve current manager) + direct SQL write (re-point on approval) via `supabaseAdmin` service-role client in Route Handlers — no RLS bypass risk since these are server-only writes | Mirrors the exact relationship `business_paikka_links` already has with `liikuntapaikat` |
| `/business` dashboard ↔ access-request endpoints | Client-side fetch with the user's `sb-biz-*` session JWT in `Authorization: Bearer` header — same pattern as every existing `/business/*` mutation | New `AccessRequestsPanel.tsx` slots into the existing dashboard without disturbing the venue-list rendering this milestone's dashboard-redesign work is also touching — **coordinate file-level overlap with the dashboard-redesign phase** (both touch `/business/page.tsx`) |
| Admin panel (`/admin`) ↔ access-request feature | None required. Access requests are resolved entirely by the manager peer-to-peer; admin is not in this loop unless a future "admin can override/audit transfers" requirement appears | Keep these systems decoupled — do not add an admin escalation path unless explicitly requested |

## Suggested Build Order (relative to other v3.1 work)

1. **Migration first** (`venue_access_requests` table + RLS) — pure additive, zero risk of breaking other in-flight v3.1 work (admin bugfix, dashboard redesign, page consolidation, onboarding reorder). Land this before any dashboard UI work so the dashboard-redesign phase can build `AccessRequestsPanel.tsx` against a real schema instead of mocking it.
2. **Route Handlers** (create/approve/reject) — depends only on the migration; independent of dashboard visual work, admin bugfix, and onboarding reorder. Can proceed in parallel with those phases.
3. **Email senders in `lib/email.ts`** — small, can be done alongside step 2 by the same phase.
4. **Dashboard UI integration** (`AccessRequestsPanel`, `RequestAccessButton`) — should land **after** (or carefully coordinated with) the "/business-dashboard: paikkalista → DiagonaalKortti-kortit" redesign phase, since both touch `app/business/page.tsx`. Sequencing this access-request UI phase *after* the dashboard redesign avoids a merge conflict and lets the new panel be designed against the final card layout (status pills, hover/tap icon-button overlay) rather than the old one.
5. **No dependency on**: admin `/admin` bugfix (different code path entirely — `is_admin` check, separate route), the page-consolidation work (`app/paikat/[id]` removal — unrelated to business routes), or the onboarding step reorder (unrelated wizard steps). These can all proceed in any order relative to this feature.

## Sources

- `supabase/migrations/20260605000000_business_accounts.sql` — existing `business_accounts` (1 row = 1 login = 1 company) and `business_paikka_links` (`UNIQUE(paikka_id)`, `claim_status` state machine) schema and RLS, read directly from this repo
- `supabase/migrations/20260615000000_business_accounts_contact_phone.sql` — confirms additive-column convention for this table
- `lib/supabase-business.ts` — confirms `sb-biz-*` cookie-namespaced client pattern (browser + server)
- `app/api/admin/approve/route.ts` — confirms JWT-verify → row-ownership-guard → concurrency-safe `count:'exact'` update → non-critical try/catch email pattern, reused as the template for the new approve/reject endpoints
- `app/api/business/register/route.ts` — confirms "never trust client-supplied id, always derive from verified JWT" convention, and the comment explicitly warning against elevation-of-privilege via body-supplied IDs
- `lib/email.ts` — confirms Resend singleton, `sub()`/`esc()` header-injection/XSS-safe helpers, and env var conventions to extend rather than duplicate
- `.planning/PROJECT.md` — confirms "Ketjuadmin (multi-venue per tili, useita toimipisteitä eri omistajilla)" is explicitly deferred to Future, which is the basis for recommending no `companies` table in this milestone

---
*Architecture research for: multi-user-per-company + venue access requests in a Next.js 14 / Supabase business portal*
*Researched: 2026-06-24*
