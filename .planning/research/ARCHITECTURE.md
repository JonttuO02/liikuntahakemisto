# Architecture Research

**Domain:** Multi-tenant venue-directory SaaS (Next.js 14 App Router + Supabase) — migrating from external-API-sourced data to user-submitted data
**Researched:** 2026-06-22
**Confidence:** HIGH (grounded directly in current repo code, not generic patterns)

> Note on naming: the milestone brief refers to the venues table as `paikat`. The actual table in this codebase is **`liikuntapaikat`** (confirmed in every migration and route read during this research). There is **no `google_place_id` column** — the existing Google-sourced join key is `place_id` (`liikuntapaikat.place_id`, unique, used by `sync-paikat`'s upsert `onConflict: 'place_id'`). All recommendations below use the real names.

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Consumer surface (/)                         │
│  Etusivu (map) / PaikkaSheet / paikat/[id] — reads liikuntapaikat    │
│  WHERE published = true. Untouched by this milestone.                │
├──────────────────────────────────────────────────────────────────────┤
│                      Business surface (/business/*)                  │
│  middleware.ts → sb-biz-* cookie refresh + "is there a user?" guard  │
│  (no DB query in middleware — confirmed decision, do not change)     │
│       ↓                                                               │
│  app/business/layout.tsx        — renders BusinessNav (no auth check)│
│  app/business/[id]/layout.tsx   — RSC: redirect('/business/kirjaudu')│
│                                     if !user (per-route guard pattern)│
│       ↓                                                               │
│  app/business/page.tsx (CLIENT)  — dashboard: status card, venue     │
│                                     list, "+ add venue" (ClaimSearch) │
│                                     BUG: auto-router.push() into      │
│                                     onboarding when any draft row     │
│                                     exists for the account            │
│       ↓                                                               │
│  app/business/onboarding/page.tsx (CLIENT) — 3 page-level phases:    │
│    'paikka' → 'analyze' → 'wizard'                                   │
│       ↓                                                               │
│  WizardInner (mode='onboarding'|'edit') — 5-step numbered wizard     │
│    step1 Mediat → step2 Hinnasto → step3 Aukioloajat →               │
│    step4 Yhteystiedot → step5 Esikatselu (submit)                    │
├──────────────────────────────────────────────────────────────────────┤
│                          API / Route Handlers                        │
│  /api/business/create-paikka   — INSERT liikuntapaikat + link        │
│  /api/business/claim-paikka    — link existing liikuntapaikat        │
│  /api/business/onboarding/save-step  — upsert onboarding_draft       │
│  /api/business/onboarding/submit     — atomic draft → liikuntapaikat │
│  /api/admin/sync-paikat        — Google Places upsert (TO DECOMMISSION)│
├──────────────────────────────────────────────────────────────────────┤
│                              Supabase                                │
│  liikuntapaikat        — single venues table (consumer + business)  │
│  business_accounts     — 1 row per business user (FK auth.users)    │
│  business_paikka_links — many-to-... (currently 1:1 via UNIQUE)      │
│  onboarding_draft      — paikka_id-scoped wizard staging table       │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current Implementation |
|-----------|----------------|------------------------|
| `middleware.ts` | Session refresh only, path-conditional cookie namespace (`sb-biz-*` vs `sb-*`); redirects unauthenticated `/business/*` to `/business/kirjaudu` | Never queries app tables — by design (documented constraint, must stay this way) |
| `app/business/[id]/layout.tsx` | RSC auth guard for edit-mode routes | `redirect()` if `!user`, nothing else |
| `app/business/page.tsx` | Dashboard — status, venues, add-venue | Client component; **currently also does onboarding-redirect logic that must move out** |
| `WizardInner` | Single component, two modes (`onboarding`/`edit`), 5 numbered steps shared across both | URL-driven step state (`?step=N`), `maxReachedStep` forward-skip guard, `LivePreviewProvider` context |
| `onboarding_draft` | Per-(business_account_id, paikka_id) staging row, written field-by-field via `save-step`, deleted on `submit` | `UNIQUE(business_account_id, paikka_id)`, `current_step INT`, JSONB columns per step |
| `liikuntapaikat` | Single venues table for both Google-sourced and business-managed/business-created rows | `business_managed BOOLEAN`, `is_claimed BOOLEAN`, `published BOOLEAN`, `place_id` (Google key, nullable for business-created rows) |
| `sync-paikat` route | Cron-style admin route that searches Google Places and upserts `liikuntapaikat` | Explicitly skips rows where `business_managed = true` — **this exclusion logic is the seam to cut** |

## Recommended Project Structure (delta only — additions/changes for v3.0)

```
app/
├── api/
│   ├── admin/
│   │   └── sync-paikat/route.ts        # DELETE (decommission) or gate behind a feature flag
│   ├── business/
│   │   ├── onboarding/
│   │   │   └── save-step/route.ts      # MODIFY: accept new 'sijainti' field, validate lat/lng
│   │   └── create-paikka/route.ts      # MODIFY: accept yritys_nimi (or write to business_accounts.company_name only)
├── business/
│   ├── page.tsx                        # MODIFY: remove auto-redirect; add resume-badge UI
│   ├── onboarding/
│   │   ├── page.tsx                    # MODIFY: insert 'sijainti' phase into pagePhase union
│   │   ├── StepSijainti.tsx            # NEW: map + autocomplete pin step
│   │   └── StepPaikka.tsx              # MODIFY: add yritys_nimi / toimipiste_nimi fields (create-from-scratch path)
supabase/migrations/
├── YYYYMMDDHHMMSS_onboarding_draft_add_sijainti.sql # NEW (additive)
```

### Structure Rationale

- New onboarding step gets its **own component file** (`StepSijainti.tsx`) following the exact convention of every other step (`StepMediat`, `StepHinnasto`, etc.) — one component per wizard step, each accepting `paikkaId`, `initialDraft*`, `onNext`, `onPrev`.
- The fix for the dashboard redirect bug stays inside `app/business/page.tsx` (client) because the underlying signal (`onboarding_draft` row existence) is fetched there already with the user's own Supabase session — no architectural reason to move it to middleware or the RSC layout (see Integration Points below for why).

## Architectural Patterns

### Pattern 1: Page-level "pre-phase" before the numbered wizard

**What:** `app/business/onboarding/page.tsx` is a small state machine (`'paikka' | 'analyze' | 'wizard'`) that runs *before* `WizardInner`'s own numbered steps. Each pre-phase resolves `paikka_id` independently (URL param → `business_paikka_links` lookup → draft fallback) and passes it down.
**When to use:** For any new step that must exist **before** `paikka_id` is guaranteed to exist, or before the draft row exists at all (chicken-and-egg: `onboarding_draft` is FK'd to `liikuntapaikat.id`, so you cannot write step data into the draft until a `liikuntapaikat` row exists).
**Trade-off:** Two different "step" numbering systems now exist (page-level phases vs. `WizardInner`'s `?step=1..5`). This is already mildly confusing (see Phase 50 migration `renumber_onboarding_steps.sql`, which had to shift all step numbers down by 1 when `StepPaikka` was promoted to a pre-phase). Adding a "Sijainti" pre-phase will likely require **another renumbering migration** for `onboarding_draft.current_step` if the new step inserts before any existing numbered step that persists into the draft.

**Where Sijainti fits:** The milestone brief says Sijainti must come "before existing steps that need location, like AI website-analysis or pricing." Concretely:

- **For the claim flow** (existing venue, already has `latitude`/`longitude` on `liikuntapaikat`): Sijainti is **not needed** — skip it. The location step is only relevant to the **create-from-scratch flow**, which currently inserts a venue with `lat/lng = NULL` (`create-paikka/route.ts` never sets `latitude`/`longitude`).
- **For the create-from-scratch flow:** Sijainti must run as a **page-level pre-phase**, inserted between `'paikka'` (now: company/branch-name entry, see Pattern 3) and `'analyze'` (AI website analysis, which the milestone says should benefit from having coordinates already). Recommended `pagePhase` union: `'paikka' → 'sijainti' → 'analyze' → 'wizard'`, with `'sijainti'` skipped entirely when resolving an existing (claimed) venue that already has coordinates.
- Because `latitude`/`longitude` already exist as columns on `liikuntapaikat` (confirmed: `WizardInner`'s `PaikkaInfo` type and the `liikuntapaikat` select in `StepPaikkaPrePhase` both already select them), **lat/lng should be written directly to `liikuntapaikat` at the Sijainti step**, not to `onboarding_draft`. This matches the existing pattern where `StepPaikka` already operates directly against `liikuntapaikat` rather than the draft (the draft only stores step-specific JSONB: `media_urls`, `hinnasto`, `aukioloajat`, `yhteystiedot`). The user-typed address string, however, should go to `onboarding_draft` (new column `sijainti_osoite TEXT`) until submit, consistent with how editable/correctable step data is staged today (`media_urls`, `hinnasto`, etc.) rather than written live to the public table.

### Pattern 2: `onboarding_draft` as a thin staging table, not a full step machine

**What:** The draft table stores `current_step INT` plus JSONB blobs per step domain (`media_urls`, `hinnasto`, `aukioloajat`, `yhteystiedot`). It does **not** store venue identity fields (name, address, sport type) — those live directly on `liikuntapaikat` from the moment the row is created (claim or create).
**When to use:** Any new step whose data is "correctable before publish" (pricing, hours, contact info) → new JSONB/text column on `onboarding_draft`. Any new step whose data is identity/location data that's safe to persist immediately (and arguably *should* persist immediately, e.g. for the admin queue to show pending venues on a map) → direct column on `liikuntapaikat`.
**Trade-off:** This split means "abandon onboarding" leaves partial data on `liikuntapaikat` (visible only because `published=false` gates consumer visibility) but not on the draft. This is already the existing behavior for `create-paikka` (name/address/city land immediately) — Sijainti and the company/branch-name fields should follow the same precedent for consistency, not introduce a third pattern.

### Pattern 3: Where company-name vs. branch-name belongs

**What:** Today, `business_accounts.company_name` is the only "name" field for a business; `liikuntapaikat.nimi` is the only name field for a venue. There is no distinction between "the legal/brand company" and "this specific branch/location" — `ClaimSearchForm`'s create-flow writes the user-typed venue name straight into `liikuntapaikat.nimi`.

**Recommendation:**
- **Company name → `business_accounts.company_name`** (already exists, no migration needed for the 1-business-1-venue case). This is the right home because it is account-level identity, not venue-level — it must **not** move to `business_paikka_links` or `liikuntapaikat`, both of which are designed to be per-venue and (per the Future/deferred roadmap item "Ketjuadmin — yksi tili, useita toimipisteitä eri omistajilla") will eventually support **one account, many venues**.
- **Branch/location name → `liikuntapaikat.nimi`** (already exists) — this is the public-facing venue name shown in lists/cards/map pins, and must stay independent per venue to support the multi-branch future. Do not conflate it with `business_accounts.company_name`.
- **What's missing today and should be added:** a way to render "Company X — Branch Y" consistently when a business has chain semantics. Since chain support is explicitly deferred (per PROJECT.md "Future" section), the pragmatic v3.0 move is: **add no new table now**, just relabel the "Paikka" pre-phase form to clearly collect two distinct text inputs — `yritysNimi` (writes/updates `business_accounts.company_name`) and `toimipisteNimi` (writes to `liikuntapaikat.nimi`, exactly like today). This requires **zero schema migration** for the create-from-scratch path because both columns already exist; it is purely a UI/copy change plus one extra write (`business_accounts.company_name` UPDATE, JWT-verified, following `create-paikka`'s existing verification pattern).
- **For future chain support:** `business_paikka_links` is already structured as the right join table for "one account, many venues" (it's already `business_account_id` ↔ `paikka_id`). The only constraint enforcing "one venue, one owner" is `UNIQUE(paikka_id)` on `business_paikka_links` — correct, and does **not** block "one owner, many venues" (the codebase already defensively handles `.limit(1)` lookups in several places, suggesting the schema anticipated multi-venue accounts even though the UI mostly assumes one today). **No schema change needed now** — flag this as already future-proofed.

## Data Flow

### Onboarding wizard data flow (current, before v3.0 changes)

```
ClaimSearchForm (create) ──POST /api/business/create-paikka──→ INSERT liikuntapaikat (nimi, osoite, kaupunki, laji='Muu', published=false)
                                                              → INSERT business_paikka_links (link_type='created', claim_status='pending')
                                                              → liikuntapaikat.is_claimed = true
                          ──redirect──→ /business/onboarding?paikka_id=N
                                              ↓
                          pagePhase='paikka' → StepPaikka (display only, no writes)
                                              ↓
                          pagePhase='analyze' → AnalysoiSivusto (AI website scrape) → onboarding/save-step (step:0, field:media_urls)
                                              ↓
                          pagePhase='wizard' → WizardInner step1..5 → onboarding/save-step per step → onboarding/submit (atomic copy draft→liikuntapaikat, DELETE draft)
```

### Proposed v3.0 data flow (additions in CAPS)

```
ClaimSearchForm (create) ──POST /api/business/create-paikka──→ INSERT liikuntapaikat (..., YRITYS_NIMI→business_accounts.company_name UPDATE, TOIMIPISTE_NIMI→nimi)
                          ──redirect──→ /business/onboarding?paikka_id=N
                                              ↓
                          pagePhase='paikka' → StepPaikka (now collects/confirms yritys+toimipiste names on create path)
                                              ↓
                          pagePhase='SIJAINTI' (NEW, create-flow only — skipped if venue already has lat/lng)
                                  → map + autocomplete pin → UPDATE liikuntapaikat SET latitude, longitude
                                  → save user-typed address string to onboarding_draft.sijainti_osoite (NEW column)
                                              ↓
                          pagePhase='analyze' → AnalysoiSivusto (can use lat/lng for context; AI sport-category suggestion is a separate milestone scope item)
                                              ↓
                          pagePhase='wizard' → unchanged step1..5
```

### Dashboard redirect flow (bug fix)

```
CURRENT (buggy):
  /business/page.tsx mounts → fetch business_accounts → fetch onboarding_draft (any row, limit(1))
    → if draft exists: router.push('/business/onboarding')   ← unconditional, no user choice

PROPOSED:
  /business/page.tsx mounts → fetch business_accounts → fetch onboarding_draft rows (all, not limit(1))
    → render dashboard UNCONDITIONALLY
    → for each venue link that has a matching incomplete draft: render a
      "Kesken — jatka" badge + explicit button → router.push(`/business/onboarding?paikka_id=${id}`)
    → no useEffect-driven navigation away from the dashboard, ever
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting the redirect-guard fix in middleware

**What people do:** Reach for `middleware.ts` to "centralize" the auto-redirect logic since it already gates `/business/*` auth.
**Why it's wrong:** This project has an explicit, documented architectural decision that **middleware never queries application tables** (only `supabase.auth.getUser()` for session refresh). `onboarding_draft` existence is an application-data question, not an auth question. Putting it in middleware would (a) violate that decision, (b) run on every single `/business/*` request including pages where the dashboard badge is irrelevant, and (c) make the "explicit resume action" UX (a button, not a forced redirect) awkward to express from middleware, which can only redirect or pass through.
**Do this instead:** Keep the check where it already happens — client-side in `app/business/page.tsx` — but change it from "auto-navigate" to "render a badge with a manual CTA," exactly as the milestone brief specifies.

### Anti-Pattern 2: Deleting Google sync data/route in the wrong order

**What people do:** Drop the sync route, the data, and any related columns all in one pass, or run the data-deletion migration before confirming the route is actually dead.
**Why it's wrong:** If the route or its cron trigger is still wired up (even dormant) when the data-deletion migration runs, a subsequent manual invocation will re-populate rows the migration just deleted, or fail against a state it didn't expect. Doing route-removal and data-deletion as a single atomic step also makes it impossible to verify "is anything still calling this?" before the irreversible delete.
**Do this instead:** Decommission order must be: (1) remove/disable the route and any cron trigger calling it first (pure code deploy, reversible), (2) confirm in production logs/monitoring that no further calls occur, (3) only then run the data-deletion migration, (4) optionally, much later, consider dropping now-dormant columns (see Migration Order below).

### Anti-Pattern 3: Treating `business_managed` exclusion removal as a no-op

**What people do:** Assume that once Google sync is deleted, the `business_managed` boolean and its filter logic become irrelevant and can be ignored or dropped immediately.
**Why it's wrong:** `business_managed` may carry meaning beyond the sync route (e.g. distinguishing professionally-maintained business data from any remaining non-business rows in UI or RLS logic) — assuming it's purely a sync-route artifact without checking all references risks silently breaking unrelated logic.
**Do this instead:** Audit all `business_managed` references across the codebase before deciding whether to keep, repurpose, or drop the column. Do not couple "delete Google sync" with "delete `business_managed`" automatically.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Places API (Text Search + Place Details) | Server-only `GOOGLE_PLACES_API_KEY`, called from `/api/admin/sync-paikat` (cron/manual `GET` with `ADMIN_SECRET` bearer auth) | Entire integration point to be decommissioned in this milestone — confirm no other route imports from this file before deleting |
| Google Maps JS API (Autocomplete/Places widget) | Client-side `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, "ephemeral use" per milestone brief — used live in the Sijainti step's address-search box; only the resulting lat/lng + user-typed string are persisted, not a Places result object | New integration point for v3.0 Sijainti step; reuses existing client-side Maps key, no new env var needed |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `middleware.ts` ↔ everything else | Auth-only (session refresh + redirect-if-no-user); never reads `onboarding_draft`/`liikuntapaikat`/`business_accounts` | Hard constraint — do not add table queries here for the redirect-bug fix or the Sijainti step |
| `app/business/page.tsx` ↔ `onboarding_draft` | Direct browser-client Supabase read (RLS-scoped to `auth.uid()`) | Fix changes this from "navigate away" to "render badge" — same query, different consumer behavior |
| `WizardInner` (`OnboardingMode`) ↔ `onboarding_draft` | Browser-client reads/writes via `/api/business/onboarding/save-step` (server-verified JWT) and direct reads for resume logic | New Sijainti step, if it writes lat/lng directly to `liikuntapaikat`, should go through a small dedicated route extension (e.g. extend `save-step` or add a sibling route) — do **not** let the client write `latitude`/`longitude` directly via the anon key, since `liikuntapaikat` writes are documented as service-role-only (CLAUDE.md: "Supabase writes: service role key only; anon key is read-only after RLS") |
| `create-paikka` route ↔ `business_accounts.company_name` | Currently one-way: reads `company_name` for the admin-notification email only, never writes it | Adding yritys-nimi capture means this route (or a sibling) must also `UPDATE business_accounts SET company_name = ...` — needs its own JWT-verified write path, following the exact pattern already used in `create-paikka` (`supabaseAdmin`, verified `user.id`) |
| `liikuntapaikat.published` gate ↔ admin approval | New venues `published=false` until `business_paikka_links.claim_status` flips to `approved` via the existing approval trigger | Unaffected by this milestone — Sijainti/name changes happen pre-publish, same as today's onboarding fields |

## Migration Order (safest sequence)

This is the most consequential architectural question in the brief. Recommended order, with rationale per step:

1. **Land the dashboard redirect-bug fix first, independently.** It is purely a frontend behavior change (`app/business/page.tsx`), touches no schema, and currently **actively breaks any business account that has an in-progress draft** every time they load `/business`. Shipping this first removes a live UX bug without being gated on anything else, and de-risks later phases (you don't want to be debugging onboarding step changes while this redirect is also fighting you in manual QA).

2. **Decommission the Google sync *route and trigger* (code only, no data deletion yet).** Remove/disable `/api/admin/sync-paikat` (or feature-flag it off) and any cron job invoking it. Verify via `business_managed` usage audit (Anti-Pattern 3) whether anything else depends on the route's side effects. This step is safe to ship alone — no live business account is affected by removing a route nobody but admins/cron calls.

3. **Add the new `onboarding_draft.sijainti_osoite` column (additive migration, nullable, no backfill required).** `liikuntapaikat.latitude`/`longitude` already exist — no migration needed there. Because this column is nullable and additive, this migration is safe to run **at any time, including before or after step 2** — it does not depend on Google-sync removal and does not affect existing rows. The only true hard dependency is that this step must land **before** the Sijainti UI/route code that writes to it (standard "migration before code that uses it" ordering).

4. **Insert the Sijainti pre-phase into the onboarding code** (`pagePhase` union + new route/save-step field), gated to the create-from-scratch flow only. This depends on step 3's column existing. Because this changes `onboarding_draft.current_step` semantics again (a third renumbering event after the Phase 50 one), follow the same one-time `UPDATE onboarding_draft SET current_step = ...` data-migration precedent used in `20260617000000_renumber_onboarding_steps.sql` — **write and ship that data migration in the same deploy as the code change**, never split across deploys, to avoid leaving in-flight drafts on stale step numbers (this is the exact bug class that migration was created to prevent).

5. **Only after step 2 has been live for at least one full deploy cycle with zero sync calls observed, run the data-deletion migration** that removes Google-sourced rows from `liikuntapaikat` (e.g. `DELETE FROM liikuntapaikat WHERE business_managed = false AND place_id IS NOT NULL` — confirm predicate against current data before running). This is irreversible, so it must come last among the "safe" steps and strictly after the route is confirmed dead, not just disabled-but-deployed.

6. **Defer column drops (`place_id` and any other Google-only columns) to a later cleanup migration, or don't drop them at all.** Per the milestone's own question ("kept dormant for future re-use?") — recommend **keep `place_id` nullable and dormant**. It costs nothing to leave it (NULL for all business-created rows going forward), it preserves a clean audit trail / re-import path if Google data is ever needed again, and dropping it provides no benefit large enough to justify a destructive schema change. If storage/clutter concerns later make column removal desirable, that is a safe, fully independent migration that can run anytime after step 5 with zero risk to live business accounts (no code reads `place_id` outside the now-deleted sync route — confirm via a repo-wide search before dropping).

**Why this order protects live business accounts mid-onboarding:** Steps 1, 3, and 4 touch only the business onboarding surface and are either purely additive (3) or behavior-only (1, 4-with-migration-discipline) — none of them delete or block in-progress drafts. Step 2 (route removal) cannot affect a business account's `onboarding_draft` or `liikuntapaikat` row, since the sync route only ever wrote to non-`business_managed` rows. Step 5 (data deletion) is scoped to `business_managed = false` rows by construction (the existing sync route already excludes `business_managed = true`), so even run without extra care it should never touch a venue currently owned by a business account — but ordering it last, after sync is provably dead, removes any chance of a race where a sync run resurrects a row between deletion and route shutdown.

## Sources

- Direct repository inspection (HIGH confidence — primary source, not inferred):
  - `app/business/page.tsx`, `app/business/[id]/layout.tsx`, `app/business/layout.tsx`
  - `app/business/onboarding/page.tsx`, `StepPaikka.tsx`, `WizardInner.tsx`
  - `app/components/ClaimSearchForm.tsx`
  - `app/api/admin/sync-paikat/route.ts`, `app/api/business/create-paikka/route.ts`
  - `middleware.ts`
  - `supabase/migrations/20260605000000_business_accounts.sql`, `20260606000000_onboarding.sql`, `20260617000000_renumber_onboarding_steps.sql`
  - `.planning/PROJECT.md` (decision log, constraints, shipped-feature history)
  - `CLAUDE.md` (documented architectural constraints: middleware never queries DB, service-role-only writes)

---
*Architecture research for: Liikuntahakemisto v3.0 — Google Places decommission + business onboarding location/identity restructuring*
*Researched: 2026-06-22*
