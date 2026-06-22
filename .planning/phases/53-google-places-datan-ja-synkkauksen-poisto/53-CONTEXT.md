# Phase 53: Google Places -datan ja synkkauksen poisto - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Decommission the Google Places sync mechanism and remove Google-sourced venue data from the database, without losing business claims, reviews, or favorites that should survive.

Specifically:
1. Delete `/api/admin/sync-paikat` (route returns 404 after removal).
2. Delete pure-Google `liikuntapaikat` rows — rows with **no** `business_paikka_links` row at all (no claim, no creation by a business).
3. Preserve all rows that have a `business_paikka_links` row, regardless of `link_type` (`claim` or `created`) or `business_managed` value.
4. Audit `reviews`/`suosikit` row counts before and after the deletion.

Requirements: DATA-11, DATA-12.

</domain>

<decisions>
## Implementation Decisions

### Fate of unclaimed Google rows
- **D-01:** Pure-Google rows (no `business_paikka_links` row at all, regardless of `business_managed`) are **hard-deleted**, not soft-deleted and not kept-with-staleness-signal. This satisfies DATA-12's literal "rows deleted from the database."
- **D-02:** Rows provenance must be determined via `business_paikka_links.link_type`, never via `business_managed` alone — `business_managed = true` does **not** mean a row is safe to keep blind (a `link_type = 'claim'` row has Google-origin base data but must be kept because it's claimed). The actual deletion predicate is "no matching `business_paikka_links` row," not "`business_managed = false`."
- **D-03:** All `reviews`/`suosikit` rows referencing the deleted venues are confirmed by the product owner to be test-only data — cascade loss on those specific rows is explicitly acceptable. No retention/recovery requirement for this data.

### Cron/schedule removal
- **D-04:** There is no Vercel account/project link for this repo and no `vercel.json` cron config — confirmed with the product owner there is no external scheduler (Vercel Cron Jobs, GitHub Actions, or otherwise) calling `/api/admin/sync-paikat`. The route is invoked manually only (or not at all currently).
- **D-05:** Because no external trigger exists, decommissioning is simplified to: delete the route file. No separate "disable the cron" step is needed before route deletion (the usual safest-order concern from research doesn't apply here since there's nothing external to race against).

### business_managed column fate
- **D-06:** `business_managed` is **left untouched** in this phase. It is confirmed (via grep) to be load-bearing well beyond the sync route — it drives the verified-business checkmark badge in `PaikkaSheet.tsx`, `PaikkaKortti.tsx`, `DiagonaalKortti.tsx`, plus logic in `app/page.tsx`, `app/business/map/page.tsx`, and `app/api/business/create-paikka/route.ts`. Do not rename, repurpose, or drop it as part of DATA-11/12.
- Renaming/clarifying this flag in the future (if ever desired) belongs in its own separate phase — see Deferred Ideas.

### Reviews/suosikit audit depth
- **D-07:** Audit method is a row-count `SELECT` before running the deletion migration and another `SELECT` after — comparing `liikuntapaikat`, `reviews`, `suosikit`, and `business_paikka_links` counts to confirm only the intended pure-Google rows (and their cascade dependents) dropped. No full `pg_dump`/point-in-time-recovery backup is required, since the affected reviews/suosikit data is confirmed test-only (D-03) and the deletion predicate (D-02) is provenance-safe by construction.

### Claude's Discretion
- Exact SQL/migration structure (SELECT-first dry-run, then DELETE) is left to the planner/executor — the decision here is "row-count audit, no pg_dump," not the specific query shape.
- Whether the deletion runs as a one-off SQL script/Supabase migration or a small admin endpoint is an implementation detail for planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research (milestone-level, already covers this phase in depth)
- `.planning/research/PITFALLS.md` — Pitfall 1 (cascade deletion via blind `business_managed` filter — provenance must come from `business_paikka_links.link_type`) and Pitfall 2 (sync removal creates frozen-data gap, now moot per D-01's hard-delete decision) directly govern this phase's migration logic.
- `.planning/research/ARCHITECTURE.md` — "Migration Order (safest sequence)" section (steps 2 and 5) and "Anti-Pattern 3" (treating `business_managed` exclusion removal as a no-op) — both directly informed D-05 and D-06 above.
- `.planning/REQUIREMENTS.md` — DATA-11, DATA-12 (exact requirement wording and phase mapping table).
- `.planning/ROADMAP.md` §"Phase 53: Google Places -datan ja synkkauksen poisto" — success criteria (4 items) this phase must satisfy.

### Schema
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_paikka_links` schema: `link_type CHECK (link_type IN ('claim', 'created'))`, `UNIQUE(paikka_id)`, `ON DELETE CASCADE` to `liikuntapaikat`.
- `supabase/migrations/20260605000001_business_managed.sql` — `business_managed` column origin and its original sync-exclusion purpose.

### Code to remove
- `app/api/admin/sync-paikat/route.ts` — the route to delete in full.
- `app/api/admin/__tests__/sync-paikat-filter.test.ts` — existing test covering the route; remove or adapt alongside the route deletion.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None new — this phase is subtractive (deletion), not additive.

### Established Patterns
- `business_paikka_links.link_type IN ('claim', 'created')` is the existing, authoritative provenance signal — already used by `app/api/business/claim-paikka/route.ts` and `app/api/business/create-paikka/route.ts`. Reuse this column for the deletion predicate; do not introduce a new provenance column.
- `business_managed` references confirmed across: `app/components/DiagonaalKortti.tsx`, `app/components/PaikkaKortti.tsx`, `app/components/PaikkaSheet.tsx` (verified-business `BadgeCheck` icon), `app/page.tsx`, `app/business/map/page.tsx`, `app/api/business/create-paikka/route.ts`, `lib/branding/brandingResult.ts`, `lib/types.ts`. None of these should change in this phase.

### Integration Points
- `app/api/admin/sync-paikat/route.ts` is gated by `ADMIN_SECRET` bearer auth (no JWT/session check) — confirm nothing else depends on this auth pattern before removing the file.
- `GOOGLE_PLACES_API_KEY` (server-only env var) is used exclusively by `sync-paikat`'s Text Search + Place Details calls — confirmed not shared with the v3.0 Sijainti step's Autocomplete/Geocoding work, which uses the separate client-side `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Safe to consider removing `GOOGLE_PLACES_API_KEY` after the route and data are gone (not required by DATA-11/12, but a natural follow-up cleanup).

</code_context>

<specifics>
## Specific Ideas

No specific UI/UX requirements — this is a backend/data decommission phase with no user-facing surface beyond the route returning 404.

</specifics>

<deferred>
## Deferred Ideas

- **business_managed rename/clarification** — if ever desired (e.g., renaming to something like `is_verified_business` for clarity), this is its own future phase, not bundled with Phase 53 (per D-06).
- **GOOGLE_PLACES_API_KEY removal** — natural follow-up once the route and data are gone, but not part of DATA-11/12's stated scope; noted for awareness, not scheduled.

### Reviewed Todos (not folded)
None — no matching todos found (`todo.match-phase` returned 0 matches for Phase 53).

</deferred>

---

*Phase: 53-google-places-datan-ja-synkkauksen-poisto*
*Context gathered: 2026-06-22*
