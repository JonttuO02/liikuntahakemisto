# Phase 38: Business Data Publication — Plan

**Phase goal:** Admin-hyväksyntä julkaisee paikan atomisesti ja verifikaatio-tikki näkyy kaikkialla missä paikan nimi esitetään.

**Requirements:** PUB-01, PUB-02, PUB-03, PUB-04

**Wave structure overview:**
| Wave | Plans | Autonomous |
|------|-------|------------|
| 1 | 38-01, 38-02 | yes, yes |
| 2 | 38-03 | yes |

Wave 1: migration (38-01) and route cleanup (38-02) are fully independent — no shared files. Wave 2 (38-03) logically depends on Wave 1 being committed so the trigger is in place when the badge goes live. TypeScript changes in 38-03 also depend on the route cleanups in 38-02 being done to avoid stale business_managed writes.

**Pre-planning discovery:** `app/api/admin/sync-paikat/route.ts` already implements the business_managed exclusion filter (D-11/D-12 from CONTEXT.md) — lines 158–166 contain the `managedSet` pre-filter logic. No plan needed for sync protection. Noted in Source Audit.

---

## Plan 38-01: Postgres trigger migration — atomic approval publication (PUB-01)

**Wave:** 1 (parallel with 38-02 — creates a new migration file only)
**Requirements:** PUB-01
**Depends on:** —

### Goal

Create a Supabase migration that adds a Postgres AFTER UPDATE trigger on `business_paikka_links`. When `claim_status` transitions to `'approved'`, the trigger atomically sets `published = true` AND `business_managed = true` on the linked `liikuntapaikat` row. This works for both venue types (claim and created) — for claim venues `published=true` is already true so the SET is idempotent.

This trigger fires inside the DB when the approve route runs its Step 5 UPDATE, requiring no Next.js code path involvement.

### Tasks

1. **Read** `supabase/migrations/20260605000000_business_accounts.sql` to confirm `business_paikka_links` column names (`paikka_id`, `claim_status`). Read `supabase/migrations/20260605000001_business_managed.sql` and `supabase/migrations/20260605000004_published_is_claimed.sql` to confirm `business_managed` and `published` columns exist on `liikuntapaikat`.

   Create `supabase/migrations/20260611000001_approval_trigger.sql` with these contents:

   ```sql
   -- PUB-01: Trigger that atomically publishes a venue and marks it business-managed
   -- when admin approval sets claim_status = 'approved' on business_paikka_links.
   -- Fires for all venue types: for claim venues published=true is idempotent;
   -- for created venues this is the first time published transitions to true.

   CREATE OR REPLACE FUNCTION public.set_business_managed_on_approval()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   BEGIN
     UPDATE liikuntapaikat
     SET published = true, business_managed = true
     WHERE id = NEW.paikka_id;
     RETURN NEW;
   END;
   $$;

   DROP TRIGGER IF EXISTS approval_publish_trigger ON business_paikka_links;

   CREATE TRIGGER approval_publish_trigger
     AFTER UPDATE OF claim_status ON business_paikka_links
     FOR EACH ROW
     WHEN (NEW.claim_status = 'approved')
     EXECUTE FUNCTION public.set_business_managed_on_approval();
   ```

   Apply the migration to the local Supabase instance:
   ```
   npx supabase db push
   ```
   If the local DB is not running, start it first with `npx supabase start`. If `db push` is unavailable, try `npx supabase migration up`.

### Acceptance Criteria

- `supabase/migrations/20260611000001_approval_trigger.sql` exists.
- File contains `CREATE OR REPLACE FUNCTION public.set_business_managed_on_approval()`.
- File contains `RETURNS trigger` and `SECURITY DEFINER`.
- File contains `UPDATE liikuntapaikat SET published = true, business_managed = true WHERE id = NEW.paikka_id`.
- File contains `AFTER UPDATE OF claim_status ON business_paikka_links`.
- File contains `WHEN (NEW.claim_status = 'approved')`.
- File contains `DROP TRIGGER IF EXISTS approval_publish_trigger` before the CREATE TRIGGER (idempotent).
- Migration applies without error (exit 0) or shows as applied in `npx supabase migration list`.

### Files Changed

- `supabase/migrations/20260611000001_approval_trigger.sql` — new trigger migration (create)

---

## Plan 38-02: Route cleanup — remove premature business_managed writes (D-02, D-03, D-06)

**Wave:** 1 (parallel with 38-01 — touches only API routes, no shared files with 38-01)
**Requirements:** — (context decisions D-02, D-03, D-06; enables PUB-01 to be the single source of truth)
**Depends on:** —

### Goal

Three surgical edits: (1) remove `business_managed: true` from the `claim-paikka` UPDATE — the trigger is now the source of truth for this flag; (2) remove `business_managed: true` from the `create-paikka` INSERT — newly created venues will have `business_managed=false` until admin approves; (3) remove Step 6 from `approve/route.ts` entirely — the trigger fires automatically when `claim_status='approved'` is written in Step 5, making the manual `published = true` UPDATE redundant for created venues and wrong for claim venues.

### Tasks

1. **Read** `app/api/business/claim-paikka/route.ts` lines 50–62.

   Edit the `.update({ is_claimed: true, business_managed: true })` call (line 56) to remove `business_managed: true` so only `is_claimed: true` remains: `.update({ is_claimed: true })`. Keep the error handling comment and the `console.error` call. The log message references "is_claimed" so update it if it mentions `business_managed`. No other changes to the file.

### Acceptance Criteria for Task 1

- `app/api/business/claim-paikka/route.ts` contains `.update({ is_claimed: true })` (single-field update).
- File does NOT contain `business_managed: true` in any `.update()` call.
- `npx tsc --noEmit` passes.

2. **Read** `app/api/business/create-paikka/route.ts` lines 33–47.

   Edit the `.insert({ nimi, osoite, kaupunki, laji: 'Muu', published: false, business_managed: true })` call (line 38) to remove `business_managed: true`. The result must be `.insert({ nimi, osoite, kaupunki, laji: 'Muu', published: false })`. Remove the comment on line 35 that describes `business_managed=true` as protecting from overwrite — it is no longer set at insert time. Step 1 comment should simply describe that `published=false` hides the venue until admin approval. No other changes.

### Acceptance Criteria for Task 2

- `app/api/business/create-paikka/route.ts` `.insert()` call does NOT contain `business_managed: true`.
- File does NOT contain `business_managed` anywhere in the insert object.
- `published: false` is still present in the insert.
- `npx tsc --noEmit` passes.

3. **Read** `app/api/admin/approve/route.ts` lines 55–70.

   Remove Step 6 entirely — the `if (link.link_type === 'created') { ... }` block (lines 57–66) that does `update({ published: true })` on `liikuntapaikat`. Delete these 10 lines in full including the comment `// Step 6: for link_type = 'created', set published = true (claim venues are already published)`. Step 5 (set `claim_status='approved'`) and Step 7 (send email) must remain completely unchanged. Renumber the comment on Step 7 from `// Step 7:` to `// Step 6:` for continuity.

### Acceptance Criteria for Task 3

- `app/api/admin/approve/route.ts` does NOT contain `link.link_type === 'created'`.
- File does NOT contain `update({ published: true })`.
- Step 5 (`update({ claim_status: 'approved' })`) is still present and unchanged.
- Email-sending block (Step 7 / now Step 6) is still present and unchanged.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/api/business/claim-paikka/route.ts` — remove `business_managed: true` from liikuntapaikat UPDATE (keep `is_claimed: true`)
- `app/api/business/create-paikka/route.ts` — remove `business_managed: true` from liikuntapaikat INSERT
- `app/api/admin/approve/route.ts` — remove Step 6 (manual `published=true` UPDATE, now handled by trigger)

---

## Plan 38-03: TypeScript type + SELECT + verification badge (PUB-02, PUB-03, PUB-04)

**Wave:** 2 (depends on 38-01 and 38-02 — trigger must be in place and route cleanups committed)
**Requirements:** PUB-02, PUB-03, PUB-04
**Depends on:** 38-01, 38-02

### Goal

Three coordinated changes: (1) add `is_claimed` and `business_managed` optional fields to the `Liikuntapaikka` TypeScript type; (2) add these columns to the `app/page.tsx` SELECT query so the data flows into all card and sheet components; (3) add a `BadgeCheck` verification icon after the venue name in `PaikkaKortti`, `DiagonaalKortti`, and `PaikkaSheet`. The icon uses `currentColor` (inherits text color from parent) so it is black in cards and white in the PaikkaSheet hero without conditional class switching.

Note: `app/paikat/[id]/page.tsx` uses `select('*')` and already fetches all columns — no SELECT change needed there.

### Tasks

1. **Read** `lib/types.ts` in full.

   Add two fields to the `Liikuntapaikka` type after the `logo_url` and `photo_urls` lines:
   ```
   is_claimed?: boolean | null
   business_managed?: boolean | null
   ```
   Follow the existing convention of optional fields with `?` and a `| null` union. Place them after `photo_urls?: string[] | null` and before the closing `}`.

### Acceptance Criteria for Task 1

- `lib/types.ts` Liikuntapaikka type contains `is_claimed?: boolean | null`.
- `lib/types.ts` Liikuntapaikka type contains `business_managed?: boolean | null`.
- `npx tsc --noEmit` passes.

2. **Read** `app/page.tsx` lines 1–15 (the SELECT call).

   Edit the `.select(...)` string at line 7 to append `, is_claimed, business_managed` at the end of the column list. The result must be:
   ```
   .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus, featured, is_claimed, business_managed')
   ```

### Acceptance Criteria for Task 2

- `app/page.tsx` SELECT string contains `is_claimed`.
- `app/page.tsx` SELECT string contains `business_managed`.
- `npx tsc --noEmit` passes.

3. **Read** `app/components/PaikkaKortti.tsx` lines 85–100 (venue name section).

   Add a `BadgeCheck` import from `'lucide-react'` at the top of the file alongside existing Lucide imports. In the venue name JSX (line 91, `{paikka.nimi}`), add a conditional `BadgeCheck` icon directly after the text node:
   ```tsx
   {paikka.nimi}
   {paikka.business_managed && (
     <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />
   )}
   ```
   The icon uses no explicit color class — it inherits `currentColor` from the surrounding text (which is `text-[#111111]`). Do NOT add a wrapper element around the name — use inline flow. No other changes.

### Acceptance Criteria for Task 3

- `app/components/PaikkaKortti.tsx` imports `BadgeCheck` from `'lucide-react'`.
- File contains `paikka.business_managed &&` (conditional render).
- BadgeCheck has `className="w-3.5 h-3.5 ml-1 inline-block align-middle"` (no explicit color class).
- `npx tsc --noEmit` passes.

4. **Read** `app/components/DiagonaalKortti.tsx` lines 105–120 (venue name section).

   Add `BadgeCheck` to the import from `'lucide-react'`. After `{paikka.nimi}` at line 112, add the same conditional badge pattern as in Task 3:
   ```tsx
   {paikka.nimi}
   {paikka.business_managed && (
     <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />
   )}
   ```
   No explicit color class — inherits `currentColor`. No other changes.

### Acceptance Criteria for Task 4

- `app/components/DiagonaalKortti.tsx` imports `BadgeCheck` from `'lucide-react'`.
- File contains `paikka.business_managed &&` (conditional render).
- BadgeCheck has `className="w-3.5 h-3.5 ml-1 inline-block align-middle"` (no explicit color class).
- `npx tsc --noEmit` passes.

5. **Read** `app/components/PaikkaSheet.tsx` lines 165–180 (hero name section).

   Add `BadgeCheck` to the import from `'lucide-react'`. After `{paikka.nimi}` at line 172, add the conditional badge inline inside the `<h2>` element:
   ```tsx
   <h2 className="font-bold text-white text-lg leading-tight">
     {paikka.nimi}
     {paikka.business_managed && (
       <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />
     )}
   </h2>
   ```
   The `<h2>` already has `text-white` — the icon inherits white via `currentColor`. No explicit `text-white` needed on the icon. No other changes.

### Acceptance Criteria for Task 5

- `app/components/PaikkaSheet.tsx` imports `BadgeCheck` from `'lucide-react'`.
- File contains `paikka.business_managed &&` inside a `BadgeCheck` render.
- BadgeCheck has `className="w-3.5 h-3.5 ml-1 inline-block align-middle"` (no explicit color).
- The icon appears inside the `<h2 className="font-bold text-white ...">` element.
- `npx tsc --noEmit` passes.

### Files Changed

- `lib/types.ts` — add `is_claimed?: boolean | null` and `business_managed?: boolean | null` to Liikuntapaikka type
- `app/page.tsx` — add `is_claimed, business_managed` to SELECT column list
- `app/components/PaikkaKortti.tsx` — import BadgeCheck; add conditional badge after nimi
- `app/components/DiagonaalKortti.tsx` — import BadgeCheck; add conditional badge after nimi
- `app/components/PaikkaSheet.tsx` — import BadgeCheck; add conditional badge after nimi in hero h2

---

## Source Audit

| Source | Item | Covered by |
|--------|------|-----------|
| GOAL | Postgres-triggeri atomiselle hyväksynnälle | 38-01 |
| GOAL | verifikaatio-tikki kaikissa korteissa | 38-03 |
| PUB-01 | Trigger AFTER UPDATE OF claim_status sets published=true, business_managed=true | 38-01 |
| PUB-02 | Liikuntapaikka type: is_claimed?, business_managed? fields | 38-03 |
| PUB-03 | app/page.tsx SELECT includes is_claimed, business_managed | 38-03 |
| PUB-04 | BadgeCheck in PaikkaKortti, DiagonaalKortti, PaikkaSheet | 38-03 |
| D-01 | business_managed=true set at approval time only, via trigger | 38-01, 38-02 |
| D-02 | Remove business_managed: true from claim-paikka/route.ts | 38-02 |
| D-03 | Remove business_managed: true from create-paikka/route.ts | 38-02 |
| D-04 | Trigger condition: AFTER UPDATE OF claim_status WHEN NEW.claim_status='approved' | 38-01 |
| D-05 | Trigger action: UPDATE SET published=true, business_managed=true WHERE id=NEW.paikka_id | 38-01 |
| D-06 | Remove Step 6 from approve/route.ts (trigger replaces manual published=true) | 38-02 |
| D-07 | BadgeCheck w-3.5 h-3.5 currentColor | 38-03 |
| D-08 | Cards: icon #111111 (inherits card title) ml-1 inline-block align-middle | 38-03 |
| D-09 | PaikkaSheet hero: icon white (inherits text-white from h2) | 38-03 |
| D-10 | Render badge only when paikka.business_managed === true | 38-03 |
| D-11/D-12 | Sync exclusion filter — **ALREADY IMPLEMENTED** in sync-paikat/route.ts lines 158–166 | (no plan needed) |

---

## Phase Verification

### Must-haves

1. `supabase/migrations/20260611000001_approval_trigger.sql` exists and contains a valid `AFTER UPDATE OF claim_status` trigger that sets `published = true, business_managed = true` on `liikuntapaikat` when `NEW.claim_status = 'approved'` (PUB-01).
2. `app/api/business/claim-paikka/route.ts` contains `.update({ is_claimed: true })` only — no `business_managed: true` in the update call (D-02).
3. `app/api/business/create-paikka/route.ts` INSERT does not include `business_managed: true` — the field is absent from the insert object (D-03).
4. `app/api/admin/approve/route.ts` does not contain `link.link_type === 'created'` or `update({ published: true })` — Step 6 is fully removed (D-06).
5. `lib/types.ts` Liikuntapaikka type contains both `is_claimed?: boolean | null` and `business_managed?: boolean | null` (PUB-02).
6. `app/page.tsx` SELECT string includes `is_claimed` and `business_managed` (PUB-03).
7. `PaikkaKortti.tsx`, `DiagonaalKortti.tsx`, and `PaikkaSheet.tsx` each import `BadgeCheck` and render it conditionally when `paikka.business_managed === true` with `w-3.5 h-3.5 ml-1 inline-block align-middle` (PUB-04).
8. `npx tsc --noEmit` läpäisee ilman virheitä kaikkien muutosten jälkeen.
