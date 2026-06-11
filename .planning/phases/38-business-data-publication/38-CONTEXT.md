# Phase 38: Business Data Publication - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin approval atomically publishes a venue and marks it as business-managed. A verification badge (BadgeCheck checkmark) appears next to the venue name everywhere it is shown — PaikkaKortti, DiagonaalKortti, PaikkaSheet. The Google Places sync script is updated to protect business-managed venues from being overwritten.

Four requirements: PUB-01 (Postgres trigger), PUB-02 (type), PUB-03 (SELECT), PUB-04 (badge).

**Key correction vs. prior phases:** `business_managed=true` is NOT set at claim/create time anymore. The trigger is the single source of truth — it sets both `published=true` and `business_managed=true` at approval time for all venue types. This means:
1. Remove `business_managed=true` write from `app/api/business/claim-paikka/route.ts` (partial undo of DEBT-02)
2. Remove `business_managed=true` write from `app/api/business/create-paikka/route.ts` (if present)
3. Remove Step 6 from `app/api/admin/approve/route.ts` (trigger replaces it)

</domain>

<decisions>
## Implementation Decisions

### Badge Timing (business_managed flag lifecycle)

- **D-01:** `business_managed=true` is set **at approval time only** — via the Postgres trigger. Not at claim-submit time, not at create time. Badge is truthful: only approved venues get the checkmark.
- **D-02:** Remove `business_managed: true` from `app/api/business/claim-paikka/route.ts` (DEBT-02 partial undo — the claim still sets `is_claimed=true`, just not `business_managed`).
- **D-03:** Remove `business_managed: true` from `app/api/business/create-paikka/route.ts` (if the column is written there).

### Postgres Trigger (PUB-01)

- **D-04:** Trigger condition: `AFTER UPDATE OF claim_status ON business_paikka_links WHEN (NEW.claim_status = 'approved')`.
- **D-05:** Trigger action: `UPDATE liikuntapaikat SET published = true, business_managed = true WHERE id = NEW.paikka_id`. Unconditional — no branching on `link_type`. For claim venues `published` is already `true` (idempotent no-op).
- **D-06:** Remove Step 6 from `app/api/admin/approve/route.ts` entirely — the trigger handles publication. The route only sets `claim_status='approved'` on the link (Step 5) and sends the email (Step 7).

### Badge Visual (PUB-04)

- **D-07:** Icon: Lucide `BadgeCheck`, 14px (use `w-3.5 h-3.5`), `currentColor` so it inherits the surrounding text color.
- **D-08:** In PaikkaKortti and DiagonaalKortti: icon is `#111111` (inherits card title color). Placement: inline after `paikka.nimi` with `ml-1 inline-block align-middle`.
- **D-09:** In PaikkaSheet hero section: icon is white (`text-white`) — matches the `text-white` hero heading. Placement: inline after `paikka.nimi`.
- **D-10:** Condition: render badge only when `paikka.business_managed === true`.

### Sync Script Protection (success criteria #2)

- **D-11:** At the start of `app/api/admin/sync-paikat/route.ts`, query `liikuntapaikat` for all `place_id` values where `business_managed = true`. Build a `Set<string>` of those `place_id`s.
- **D-12:** Before the upsert loop, filter out any Places API results whose `place_id` is in the exclusion set. Zero writes to approved business-managed venues.

### Claude's Discretion

- Migration timestamp and filename for the trigger migration
- Whether to wrap the trigger UPDATE in a `BEGIN/EXCEPTION/END` block (safe for non-critical trigger failure)
- Exact TypeScript inline type for the `ml-1` gap vs a `gap-1 flex items-center` wrapper around the name

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — PUB-01, PUB-02, PUB-03, PUB-04 (Phase 38 requirements)
- `.planning/ROADMAP.md` §Phase 38 — Success criteria and phase goal

### Files being modified
- `app/api/admin/approve/route.ts` — current state: Step 6 sets published=true for created venues; D-06 removes Step 6 entirely (trigger takes over)
- `app/api/business/claim-paikka/route.ts` — current state: sets business_managed=true (DEBT-02); D-02 removes that write
- `app/api/admin/sync-paikat/route.ts` — current state: upserts all venues unconditionally; D-11/D-12 adds exclusion filter
- `lib/types.ts` — current state: no `is_claimed` or `business_managed` fields; PUB-02 adds them
- `app/page.tsx` — current state: SELECT does not include `is_claimed` or `business_managed`; PUB-03 adds them
- `app/components/PaikkaKortti.tsx` — PUB-04: add BadgeCheck after `paikka.nimi`
- `app/components/DiagonaalKortti.tsx` — PUB-04: add BadgeCheck after `paikka.nimi`
- `app/components/PaikkaSheet.tsx` — PUB-04: add BadgeCheck after `paikka.nimi` (white, in hero)

### New files
- `supabase/migrations/YYYYMMDDXXXXXX_approval_trigger.sql` — Postgres trigger for atomic approval publication

### Prior phase context
- `.planning/phases/35-admin-hyvaksyntajarjestelma/35-CONTEXT.md` — approve route pattern, email sending
- `.planning/phases/37-tech-debt-foundation/37-CONTEXT.md` — DEBT-02 (business_managed at claim time; Phase 38 partially undoes this)

### DB schema reference
- `supabase/migrations/20260605000004_published_is_claimed.sql` — defines `published` and `is_claimed` columns on `liikuntapaikat`
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_paikka_links` table schema

### i18n
- `messages/fi.json` and `messages/en.json` — no new user-facing strings expected; badge is a visual-only element

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/admin/approve/route.ts` — Step 5 sets `claim_status='approved'`; Step 6 (published=true) to be removed; Step 7 sends email. Trigger fires after Step 5's DB write.
- `lib/types.ts` — `Liikuntapaikka` type; add `is_claimed?: boolean | null` and `business_managed?: boolean | null` with optional marker for forward compatibility (existing convention)
- Lucide icons already installed (`lucide-react`) — `BadgeCheck` is available, no new dependency

### Established Patterns
- **Type additions:** Optional fields marked with `?` and a comment (e.g., `// Phase 38 — business data publication`) — convention from `lib/types.ts`
- **SELECT additions:** `app/page.tsx` SELECT is an explicit column list — add `is_claimed, business_managed` to the string
- **Trigger pattern:** Most recent migration uses `IF NOT EXISTS` guards; check `supabase/migrations/` for most recent timestamp to sequence correctly
- **Inline badge pattern:** The "Sponsoroitu" badge in PaikkaKortti is the nearest analog for conditional inline rendering — but the checkmark goes next to the name, not in the badge row

### Integration Points
- Postgres trigger fires inside the Supabase DB when the approve route writes `claim_status='approved'` — no Next.js code path involved
- `app/page.tsx` SELECT drives the props passed to `Etusivu` → then to all card/sheet components; once `business_managed` is in the SELECT and type, all components receive it automatically
- `sync-paikat` exclusion query uses `supabaseAdmin` (service role, bypasses RLS) — same client already used in the route

</code_context>

<specifics>
## Specific Ideas

- BadgeCheck should use `currentColor` so placement in hero (white text) vs card (black text) is handled by CSS inheritance, not conditional class switching.
- Trigger migration should use `CREATE OR REPLACE FUNCTION` + `CREATE TRIGGER` pattern (same as Supabase standard). Function returns `NEW`.
- Sync exclusion: `const { data: managed } = await supabaseAdmin.from('liikuntapaikat').select('place_id').eq('business_managed', true)` → `const managedIds = new Set(managed?.map(r => r.place_id) ?? [])` → filter results before upsert.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within the four PUB requirements. No scope creep.

</deferred>

---

*Phase: 38-business-data-publication*
*Context gathered: 2026-06-11*
