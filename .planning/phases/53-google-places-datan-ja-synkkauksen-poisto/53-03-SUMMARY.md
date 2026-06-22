---
phase: 53-google-places-datan-ja-synkkauksen-poisto
plan: 03
status: complete
deviation: true
---

# 53-03 Summary: Apply deletion to the target database

## What happened

This plan executed the irreversible production deletion gated by Plans 01/02. The execution **deviated from the PLAN.md / CONTEXT.md D-02 predicate** at the operator's explicit, twice-confirmed instruction during the blocking-human gate.

**Planned scope (D-02, the authored migration `20260622120000_remove_google_places_data.sql`):** delete only `liikuntapaikat` rows with no `business_paikka_links` row (pure-Google, unclaimed). Claimed/created venues were to survive.

**Actual scope (operator override):** delete **all** `liikuntapaikat` rows, with no provenance exception — including the 5 rows that had an active `business_paikka_links` claim. The operator was shown the claimed-venue detail (business names, business_account_ids) before final approval and confirmed "Yes, delete all 327 including the 5 claimed."

The authored migration file `supabase/migrations/20260622120000_remove_google_places_data.sql` was **not applied** as written — its `NOT EXISTS` predicate was bypassed. The actual deletion was executed via an ad-hoc script using `@supabase/supabase-js` with the service-role key (`DELETE FROM liikuntapaikat` unconditionally), since the Supabase CLI is not installed/linked in this environment. The migration file remains on disk as documentation of the originally-reviewed narrower predicate; it is now redundant with the broader deletion already performed and was not pushed via `supabase db push`.

## Audit evidence

**Baseline (before deletion):**

| Table | Count |
|---|---|
| liikuntapaikat | 327 |
| reviews | 0 |
| suosikit | 0 |
| business_paikka_links | 5 |
| pure-Google (deletion target per original predicate) | 322 |
| linked-kept (would have survived per original predicate) | 5 |

The 5 linked rows (all `link_type: claim`) belonged to 2 business accounts:
- `0f0e024d-9825-4bbf-9834-e2368b27e976` — paikka_id 10 (Kalevan liikuntapuiston ulkokuntosali), 18 (SportUni Keskusta, Atalpan liikuntakeskus), 24 (SportUni Kauppi, TAMK liikuntakeskus L-rakennus), 25 (Kalevan liikuntapuisto)
- `ac22a395-c69b-4cdc-bf95-bdfc71eb961d` — paikka_id 14 (Ikurin liikuntahalli)

**After (post-deletion):**

| Table | Count |
|---|---|
| liikuntapaikat | 0 |
| reviews | 0 |
| suosikit | 0 |
| business_paikka_links | 0 |

All 327 rows deleted (count returned by the delete call: 327). `business_paikka_links` and dependent `business_branding` rows for the 2 affected business accounts cascaded to 0 as well. The 2 `business_accounts` rows themselves are not deleted (out of scope) but now have no claimed venue.

## Approval trail

Three explicit operator confirmations were captured during this session (interactive checkpoint, no subagent):
1. Baseline numbers (322 pure-Google / 5 linked-kept) shown — operator stated the deletion should cover "all rows related to any google places related venue ... no matter if its claimed/created or not."
2. Clarifying question ("delete all 327, table goes empty" vs. "keep the 5, delete 322") — operator chose **delete all 327, table goes empty**.
3. Final confirmation naming the 5 specific claimed venues and their cascade impact — operator confirmed **"Yes, delete all 327 including the 5 claimed."**

## Follow-up implications (not actioned in this plan)

- `business_accounts` rows for the 2 affected businesses now have no linked venue. Whether those accounts need re-onboarding, a UI fix to handle "no claimed venue" state, or manual outreach is outside DATA-12 scope and not addressed here.
- CONTEXT.md decision D-02 ("keep if business_paikka_links row exists") no longer reflects what was actually executed in production. The authored migration file on disk implements D-02, not what ran. Anyone re-reading D-02 alongside this SUMMARY should treat this SUMMARY as the record of actual production state.
- No backup was taken (per D-07, accepted risk) — this deletion cannot be undone.

## Requirements satisfied

DATA-12 is satisfied in the broader sense (Google-Places-origin data removed from the database) but **not** via the originally-specified provenance-preserving predicate — the operator chose a stricter, total-wipe scope at the live gate. ROADMAP success criteria 2 (pure-Google count = 0) is met; criteria 3/4 (claimed/created venues preserved) were explicitly overridden by operator instruction and are not met by design.
