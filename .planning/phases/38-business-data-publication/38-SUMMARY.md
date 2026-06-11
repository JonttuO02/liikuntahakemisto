---
phase: 38
plan: 38
subsystem: business-data-publication
tags: [postgres-trigger, business-managed, verification-badge, admin-approval, atomic-publish]
dependency_graph:
  requires: [37]
  provides: [approval-trigger, verification-badge]
  affects: [liikuntapaikat, business_paikka_links, PaikkaKortti, DiagonaalKortti, PaikkaSheet]
tech_stack:
  added: []
  patterns:
    - Postgres AFTER UPDATE trigger with SECURITY DEFINER for atomic multi-table write
    - Lucide BadgeCheck with currentColor inheritance (no explicit color class)
key_files:
  created:
    - supabase/migrations/20260611000001_approval_trigger.sql
  modified:
    - app/api/business/claim-paikka/route.ts
    - app/api/business/create-paikka/route.ts
    - app/api/admin/approve/route.ts
    - lib/types.ts
    - app/page.tsx
    - app/components/PaikkaKortti.tsx
    - app/components/DiagonaalKortti.tsx
    - app/components/PaikkaSheet.tsx
decisions:
  - Postgres trigger as single source of truth for published=true and business_managed=true at approval (D-01/PUB-01)
  - BadgeCheck w-3.5 h-3.5 currentColor — no explicit color class, inherits from parent text (D-07/D-08/D-09)
  - Render badge only when paikka.business_managed === true, not is_claimed (D-10)
metrics:
  duration: "4 minutes"
  completed: "2026-06-11"
  tasks_completed: 3
  files_changed: 8
---

# Phase 38 Plan 38: Business Data Publication Summary

**One-liner:** Postgres AFTER UPDATE trigger atomically publishes venues on admin approval; BadgeCheck icon renders in all three card/sheet components when business_managed=true.

## What Was Built

### Plan 38-01: Postgres trigger migration (PUB-01)

Created `supabase/migrations/20260611000001_approval_trigger.sql` with a `SECURITY DEFINER` trigger function `public.set_business_managed_on_approval()`. The trigger fires `AFTER UPDATE OF claim_status ON business_paikka_links` when `NEW.claim_status = 'approved'` and atomically sets `published = true, business_managed = true` on the linked `liikuntapaikat` row. Works for both claim and created venue types — for claim venues `published=true` is idempotent. The migration uses `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER` making it safe to re-run.

Note: Local Supabase Docker was not available in this environment. The migration file is syntactically complete and matches the acceptance criteria. Applying to the hosted Supabase instance via `npx supabase db push` or the dashboard is required before business approvals go live.

### Plan 38-02: Route cleanup (D-02, D-03, D-06)

Three surgical edits to make the trigger the sole source of truth:

1. `claim-paikka/route.ts`: Removed `business_managed: true` from the `.update({ is_claimed: true })` call — the trigger now handles `business_managed`.
2. `create-paikka/route.ts`: Removed `business_managed: true` from the `.insert()` call. Newly created venues start with `business_managed=false` until admin approves. Updated comment to reflect trigger-based assignment.
3. `approve/route.ts`: Removed Step 6 entirely (the `if (link.link_type === 'created')` block that manually set `published=true`). Renumbered the email-sending block from Step 7 to Step 6.

### Plan 38-03: TypeScript type + SELECT + verification badge (PUB-02, PUB-03, PUB-04)

Three coordinated changes:

1. `lib/types.ts`: Added `is_claimed?: boolean | null` and `business_managed?: boolean | null` to the `Liikuntapaikka` type following the existing optional-field convention.
2. `app/page.tsx`: Extended the `.select()` string with `, is_claimed, business_managed` so the data flows to all card and sheet components. (`app/paikat/[id]/page.tsx` already uses `select('*')` — no change needed there.)
3. Badge components: Added `BadgeCheck` import from `lucide-react` and a conditional render `{paikka.business_managed && <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />}` in:
   - `PaikkaKortti.tsx` — inside the `<h3>` venue name element; inherits `text-[#111111]`
   - `DiagonaalKortti.tsx` — inside the `<p>` venue name element; inherits `text-[#111111]`
   - `PaikkaSheet.tsx` — inside the hero `<h2 className="font-bold text-white ...">` element; inherits white via `currentColor`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 38-01 | c8336b1 | feat(38-01): add Postgres trigger for atomic approval publication |
| 38-02 | d382495 | feat(38-02): remove premature business_managed writes from API routes |
| 38-03 | ced6cb9 | feat(38-03): add TypeScript types, SELECT columns, and BadgeCheck verification badge |

## Must-Have Verification

1. `supabase/migrations/20260611000001_approval_trigger.sql` — EXISTS, contains valid `AFTER UPDATE OF claim_status` trigger, `published = true, business_managed = true`, `WHEN (NEW.claim_status = 'approved')` (PUB-01) - PASS
2. `claim-paikka/route.ts` contains `.update({ is_claimed: true })` only — no `business_managed: true` (D-02) - PASS
3. `create-paikka/route.ts` INSERT does not include `business_managed: true` — `published: false` is present (D-03) - PASS
4. `approve/route.ts` does not contain `link.link_type === 'created'` or `update({ published: true })` — Step 6 fully removed (D-06) - PASS
5. `lib/types.ts` has `is_claimed?: boolean | null` and `business_managed?: boolean | null` (PUB-02) - PASS
6. `app/page.tsx` SELECT includes `is_claimed` and `business_managed` (PUB-03) - PASS
7. All three components import `BadgeCheck` and render conditionally on `paikka.business_managed` with `w-3.5 h-3.5 ml-1 inline-block align-middle` (PUB-04) - PASS
8. `npx tsc --noEmit` passes with no errors - PASS

## Deviations from Plan

**1. [Note] Local Supabase Docker not available — migration not applied locally**

- **Found during:** Task 38-01
- **Issue:** `npx supabase start` requires Docker which is not available in this execution environment. Migration could not be applied to a local DB.
- **Impact:** The migration file is complete and syntactically correct. It has not been executed against a running Postgres instance.
- **Required action:** Before testing admin approval flow, apply the migration to the hosted Supabase project via `npx supabase db push` (after `supabase link`) or paste the SQL into the Supabase dashboard SQL editor.
- **No code changes needed** — this is an infrastructure constraint, not a code defect.

No other deviations. Plan executed as written.

## Known Stubs

None. The badge is conditional on `paikka.business_managed` which is a real DB column populated by the trigger. No hardcoded empty values or placeholder text introduced.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes introduced. The trigger runs server-side inside Postgres with `SECURITY DEFINER` and `SET search_path = public` — standard safe pattern for Supabase triggers.

## Self-Check: PASSED

- `supabase/migrations/20260611000001_approval_trigger.sql` — FOUND
- `app/api/business/claim-paikka/route.ts` — FOUND, contains `.update({ is_claimed: true })`
- `app/api/business/create-paikka/route.ts` — FOUND, insert has no `business_managed`
- `app/api/admin/approve/route.ts` — FOUND, no `link_type === 'created'` block
- `lib/types.ts` — FOUND, both optional fields added
- `app/page.tsx` — FOUND, SELECT extended
- `app/components/PaikkaKortti.tsx` — FOUND, BadgeCheck conditional render
- `app/components/DiagonaalKortti.tsx` — FOUND, BadgeCheck conditional render
- `app/components/PaikkaSheet.tsx` — FOUND, BadgeCheck in h2 hero
- Commits c8336b1, d382495, ced6cb9 — all present in git log
- `npx tsc --noEmit` — PASSED
