# Technology Stack — v1.8 Additions

**Project:** Liikuntahakemisto / AKTIIVI — v1.8 Yritysportaali v2 (Julkistaminen & UX)
**Researched:** 2026-06-11
**Scope:** New capabilities only. Existing stack (Next.js 14, Supabase, Tailwind v3, Framer Motion,
next-intl, @serwist/next, Vitest) is NOT re-evaluated.

---

## Summary Verdict: Zero new npm packages required

All three v1.8 feature areas — role-based UI, data publication pipeline, business dashboard UX — are
implementable entirely with the existing stack. The work is SQL migrations, Route Handler logic,
middleware edits, and React component restructuring. No dependency additions.

---

## Feature Area 1: Role-Based UI (consumer vs business user)

### Decision: DB lookup in page components, not in middleware

**Why middleware cannot do role-based routing in this project:**

Next.js middleware runs on the Edge Runtime. Supabase's own official documentation states that
middleware should only call `supabase.auth.getUser()` to refresh the session cookie. Any additional
Postgres query from middleware (e.g., `SELECT user_id FROM business_accounts`) fails or produces
unpredictable latency because the Edge Runtime has no persistent DB connection. This is a documented
limitation confirmed by multiple Supabase/Next.js community discussions. The existing `middleware.ts`
correctly does session refresh only and must stay that way.

**What middleware CAN do for v1.8:** Path-based redirect using only the session cookie.

```ts
// middleware.ts extension — no DB query, uses only auth.getUser() already called
const { data: { user } } = await supabase.auth.getUser()

if (!user && (
  request.nextUrl.pathname.startsWith('/business') ||
  request.nextUrl.pathname.startsWith('/admin')
)) {
  return NextResponse.redirect(new URL('/', request.url))
}
```

This is valid because it does NOT query `business_accounts` — it only checks for a logged-in session.
The business-vs-consumer distinction is made inside the page, not in middleware.

**Why not JWT custom claims (Supabase Custom Access Token Hook):**
Embedding `is_business` into the JWT via a Supabase Custom Access Token Hook is architecturally
possible but adds operational overhead (hook lives in Supabase dashboard, must be maintained separately,
role changes require a token refresh cycle). Given that the role check is a single
`SELECT user_id FROM business_accounts WHERE user_id = $1`, which is a primary key lookup (fast, indexed),
the direct DB check in the page component is simpler and matches the pattern already used for `is_admin`
in `/admin/page.tsx`.

**Recommended pattern — same as v1.7 `business_accounts` check:**

The `/business/page.tsx` already does:
1. `supabase.auth.getUser()` — confirms logged-in state
2. `SELECT user_id FROM business_accounts WHERE user_id = $1` — confirms business membership
3. Conditional renders based on result

For v1.8 dual-mode experience (business dashboard vs consumer profile), extend this same pattern:
- `/business/page.tsx`: render dashboard if `business_accounts` row exists; redirect to `/` if not
- `/profiili/page.tsx`: detect `business_accounts` membership; hide `kiinnostukset`/`kotikaupunki`
  sections if user is a business account

For the consumer-facing home page (`/`), no role check is needed — the map, sheet, and AI widget
display for everyone. The business user simply navigates to `/` like any consumer.

**No new packages needed.** `@supabase/ssr` and `createBrowserSupabase()` already handle this.

**Confidence:** HIGH — based on official Supabase Next.js SSR docs, existing codebase pattern in
`app/admin/page.tsx` and `app/business/page.tsx`, and documented Edge Runtime limitations.

---

## Feature Area 2: Business Data Publication Pipeline

### Decision: Postgres trigger function (pure SQL migration)

**Three approaches evaluated:**

| Approach | Mechanism | Verdict |
|----------|-----------|---------|
| A. Postgres trigger (PL/pgSQL) | Fires AFTER UPDATE on `business_paikka_links`; copies data in-DB atomically | USE THIS |
| B. Supabase Database Webhook (pg_net) | Fires async after UPDATE; POSTs to a Next.js Route Handler | Unnecessary network round-trip for a pure in-DB operation |
| C. Extend `/api/admin/approve` Route Handler | Application code already does partial sync (Step 6); add remaining sync here | Works, but mixes approval gate with data sync concerns |

**Recommendation: Approach A — Postgres trigger.**

The data sync on approval is entirely within the database. The onboarding wizard already writes all
business content (hinnasto, aukioloajat, yhteystiedot, photo_urls, logo_url) directly to `liikuntapaikat`
during the onboarding submit step (`/api/business/onboarding/submit`). On approval, only two flags
need to change: `published = true` and `business_managed = true`. A trigger handles this atomically
with zero application-layer involvement.

**What already exists in the schema (v1.7 migrations):**
- `liikuntapaikat.published` — `BOOLEAN NOT NULL DEFAULT true` (created: Phase 33 migration)
- `liikuntapaikat.business_managed` — `BOOLEAN NOT NULL DEFAULT false` (created: Phase 31 migration)
- `liikuntapaikat.is_claimed` — `BOOLEAN NOT NULL DEFAULT false` (created: Phase 33 migration)
- `/api/admin/approve/route.ts` Step 6: already sets `published = true` for `link_type = 'created'`
- Google Places sync script: already skips rows where `business_managed = true` (DATA-09)

**What v1.8 adds:** A Postgres trigger that makes the `published = true` + `business_managed = true`
flip reliable for ALL approval paths (application code, direct SQL admin changes, future automation):

```sql
-- Migration: 20260612000000_business_approval_trigger.sql
CREATE OR REPLACE FUNCTION sync_business_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.claim_status IS DISTINCT FROM 'approved'
     AND NEW.claim_status = 'approved'
  THEN
    UPDATE liikuntapaikat
    SET published = true,
        business_managed = true
    WHERE id = NEW.paikka_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_link_approved ON business_paikka_links;
CREATE TRIGGER on_link_approved
  AFTER UPDATE ON business_paikka_links
  FOR EACH ROW
  EXECUTE FUNCTION sync_business_approval();
```

`SECURITY DEFINER` is needed because `liikuntapaikat` has RLS and the trigger runs in the context of
the updating user (anon/business), not service role. `SECURITY DEFINER` makes the function execute as
the function owner (postgres/service role), which can write to `liikuntapaikat` freely.

**Relationship to existing `/api/admin/approve` Route Handler:**
The Route Handler Step 6 (sets `published = true` for `link_type = 'created'`) and the trigger will
both fire on the same approval. This is safe because both write the same values — idempotent UPDATEs.
The trigger adds coverage for `link_type = 'claim'` where the Route Handler currently does not sync.
Optionally remove the application-code Step 6 from the Route Handler after the trigger is confirmed
working, to reduce duplication — but it is not required.

**Verification badge ("verified tick"):**
The `is_claimed = true` column already exists on `liikuntapaikat`. This flag is already set to `true`
by the claim/create Route Handlers on submission (before approval). The verification badge is a
frontend-only addition: read `paikka.is_claimed` (already in `lib/types.ts`? — no, needs adding) and
render a small SVG tick next to the venue name in `PaikkaKortti`, `DiagonaalKortti`, and `PaikkaSheet`.
No new DB column needed. `is_claimed` must be added to the `Liikuntapaikka` type in `lib/types.ts`
and to the SELECT queries that feed those components.

**When to use Supabase Database Webhooks (pg_net) instead:**
Use webhooks only if the approval needs to trigger something OUTSIDE the database (e.g., calling a
third-party API, sending a Slack notification). For in-DB data sync, a trigger is always the right tool.
For email notifications on approval, the existing `/api/admin/approve` Route Handler already calls
`sendApprovalEmail` directly via Resend — no webhook needed there either.

**Confidence:** HIGH — standard Postgres pattern, no external dependencies, confirmed by Supabase
Postgres triggers documentation and existing migration conventions in this codebase.

---

## Feature Area 3: Business Dashboard UX

### Decision: Restructure existing `/business/page.tsx`, no new packages

The v1.7 `/business/page.tsx` is already a `'use client'` component that fetches `business_paikka_links`
with joined `liikuntapaikat` data. The v1.8 dashboard is a visual and information-architecture
restructuring of this same data — not a new data source.

**"Avaa kartta" button without consumer features:**
The consumer features (TO DO overlay, AI widget, review prompt, bottom sheet) are separate client
components that render on `/`. For a business user navigating to `/`, these components will still
render. If the requirement is a completely stripped-down map view for business users, the approach is:
a `?context=business` URL param + a single `if (searchParams.context === 'business') return null`
guard in the overlay components. This is a Tailwind/conditional-render change, no new packages.
If a business user just needs a link to the map without the overlay, a plain `<a href="/">` link works.

**`/profiili` without consumer-only fields for business users:**
The `/profiili` page needs to detect `is_business`. The check is the same `SELECT user_id FROM
business_accounts WHERE user_id = $1` pattern. Detection should happen once on mount, then stored in
component state to drive conditional renders of the `kiinnostukset` and `kotikaupunki` sections.

**Confidence:** HIGH — no new data, no new packages, pure UI restructuring.

---

## Package Inventory

| Capability | New package? | Rationale |
|-----------|-------------|-----------|
| Role-based UI branching | NO | DB lookup in existing client component pattern |
| Middleware route protection (unauthenticated) | NO | Extend existing `middleware.ts` with path check |
| Data sync on approval | NO | Postgres trigger in SQL migration |
| Verification badge on cards | NO | Read existing `is_claimed` boolean, Tailwind CSS |
| Business dashboard layout | NO | Tailwind grid/flex, existing glassmorphism classes |
| Business vs consumer profile page | NO | Conditional render based on `business_accounts` check |

**Total new npm installs for v1.8: 0**

---

## Existing Dependencies — Version Adequacy (confirmed)

| Package | Installed | Adequate for v1.8? | Notes |
|---------|-----------|-------------------|-------|
| `@supabase/ssr` | `^0.10.3` | YES | `createServerClient`, `createBrowserClient` both available |
| `@supabase/supabase-js` | `^2.105.4` | YES | `supabaseAdmin` in Route Handlers for trigger migration |
| `next` | `14.2.35` | YES | App Router, middleware, Server Components fully supported |
| `resend` | `^6.12.4` | YES | Email notifications already working, no change needed |
| `framer-motion` | `^12.38.0` | YES | Dashboard animations use existing motion primitives |

---

## What NOT to Add

**`@casl/ability` or similar authorization libraries:**
The role model is binary: a user either has a row in `business_accounts` or they do not. CASL and
Permit.io are designed for multi-role permission matrices with dozens of resources and actions.
Adding ~20 KB of abstraction for a two-role system is disproportionate.

**Supabase Edge Functions:**
No v1.8 use case. Data sync is in-DB (Postgres trigger). Email notifications are in Route Handlers
(Resend, already working). Edge Functions add deployment complexity (separate deploy step, different
runtime from Next.js).

**`jose` or `jsonwebtoken` for JWT parsing in middleware:**
Would be needed only if embedding custom claims in the JWT. This project does not use custom claims
and should not start now — the DB lookup pattern already works.

**Supabase Realtime subscriptions:**
Business dashboard does not need live updates. Approval status changes are infrequent admin actions.
A page refresh (or `router.refresh()`) after an action is sufficient.

**`react-query` or `swr`:**
The `useEffect + useState` pattern in `business/page.tsx` handles one data fetch on mount.
Adding a caching layer is premature for this access pattern.

**`sharp` or color extraction libraries:**
Automatic color theming from business images is explicitly listed as "Future (deferred)" in
`PROJECT.md`. Do not add for v1.8.

---

## SQL Migration Needed for v1.8

**`20260612000000_business_approval_trigger.sql`**

Creates a `SECURITY DEFINER` PL/pgSQL function and an AFTER UPDATE trigger on
`business_paikka_links` that sets `published = true` and `business_managed = true` on the linked
`liikuntapaikat` row when `claim_status` transitions to `'approved'`. Uses `IS DISTINCT FROM` to
safely handle NULL-to-value transitions. Idempotent: `CREATE OR REPLACE FUNCTION` +
`DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`.

No other schema changes are required for v1.8 as scoped in `PROJECT.md`. The `is_claimed`,
`business_managed`, and `published` columns already exist from v1.7 migrations.

`lib/types.ts` update needed (TypeScript, not schema): add `is_claimed?: boolean | null` and
`business_managed?: boolean | null` to the `Liikuntapaikka` type so the verified badge can read these
fields without TypeScript errors.

---

## Sources

- Supabase Database Webhooks docs (pg_net, SQL setup): https://supabase.com/docs/guides/database/webhooks
- Supabase Postgres Triggers docs: https://supabase.com/docs/guides/database/postgres/triggers
- Supabase Next.js SSR auth setup (middleware pattern): https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase discussion — role-based DB query from middleware limitations: https://github.com/orgs/supabase/discussions/29482
- Supabase Custom Access Token Hook docs: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- Existing codebase: `middleware.ts`, `app/admin/page.tsx`, `app/business/page.tsx`,
  `app/api/admin/approve/route.ts`, migrations `20260605000001`, `20260605000004`, `20260610000002`
