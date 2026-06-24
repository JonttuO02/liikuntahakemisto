---
phase: 57-dashboard-redirect-korjaus-kesken-tila
reviewed: 2026-06-24T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - app/api/business/onboarding/submit/route.ts
  - app/business/page.tsx
  - lib/venueStatus.test.ts
  - lib/venueStatus.ts
  - messages/en.json
  - messages/fi.json
  - supabase/migrations/20260624120000_business_paikka_links_submitted_at.sql
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 57: Code Review Report

**Reviewed:** 2026-06-24T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This phase adds an explicit `submitted_at` timestamp column to `business_paikka_links` and a pure `deriveVenueStatus` helper to disambiguate "claim_status=pending because never submitted" (→ render as "Kesken") from "claim_status=pending because the user genuinely submitted onboarding" (→ render as "Pending approval"). The migration is additive and safe (`ADD COLUMN IF NOT EXISTS`, nullable, no backfill). `deriveVenueStatus` is a small, easily-testable pure function and the unit tests cover the precedence rules described in its own logic well.

However, tracing the full lifecycle of `business_paikka_links.submitted_at` across all routes that mutate `claim_status` (`onboarding/submit`, `reapply`, `admin/reject`) surfaces a real precedence bug: the `reapply` route resets `claim_status` to `'pending'` but never touches `submitted_at`, and `submitted_at` can legitimately still be `null` when a row reaches `'rejected'` (the admin reject route only requires `claim_status === 'pending'`, not that onboarding was ever submitted). After such a reapply, `deriveVenueStatus` will misclassify a now-genuinely-pending application as `'kesken'`, showing the wrong badge and CTA. This is the kind of cross-route invariant violation that the new unit tests do not cover. There is also a minor untranslated string regression in `app/business/page.tsx`.

## Warnings

### WR-01: `reapply` route does not clear/set `submitted_at`, causing `deriveVenueStatus` to misclassify reapplied-but-never-onboarded venues as "Kesken"

**File:** `app/api/business/reapply/route.ts:64-71` (consumed by `lib/venueStatus.ts:7` and `app/business/page.tsx:287`)
**Issue:**
`deriveVenueStatus` treats `claim_status === 'pending' && !submitted_at` as `'kesken'` (line 7 of `lib/venueStatus.ts`). This is correct for the "created via `create-paikka`, never opened onboarding" case, which is exactly what this phase fixes.

But `business_paikka_links` rows are created by `app/api/business/create-paikka/route.ts:95` with `claim_status: 'pending'` and no `submitted_at` (defaults to `NULL`). `app/api/admin/reject/route.ts:46` only requires `link.claim_status === 'pending'` before rejecting — it does not require that onboarding was ever submitted. So an admin can reject a venue that was created but never onboarded, producing a row with `claim_status='rejected'`, `submitted_at=null`.

When the business owner then calls `POST /api/business/reapply`, the route (`app/api/business/reapply/route.ts:69`) does:
```ts
.update({ claim_status: 'pending', rejection_reason: null })
```
`submitted_at` is left untouched — i.e. still `null`. Back on the dashboard, `deriveVenueStatus('pending', false, null)` now returns `'kesken'` instead of `'pending'`, even though the business user just took an explicit "reapply" action that should put the application back into the admin's pending review queue with a "Pending approval" badge. The venue row also still has no draft to "continue" from in onboarding terms, so the "Jatka" CTA (`app/business/page.tsx:143/146`) sends the user to `/business/onboarding?paikka_id=...` for a venue whose onboarding may already be otherwise complete, which is a confusing UX dead-end rather than the intended "Pending approval" state.

**Fix:** Set `submitted_at` in the reapply update, mirroring what `onboarding/submit` does in Step 5a:
```ts
const { error: updateError } = await supabaseAdmin
  .from('business_paikka_links')
  .update({
    claim_status: 'pending',
    rejection_reason: null,
    submitted_at: new Date().toISOString(),
  })
  .eq('id', rejectedLink.id)
  .eq('claim_status', 'rejected')
```
Add a `deriveVenueStatus` unit test for this exact transition: `deriveVenueStatus('pending', false, '<reapply timestamp>')` → `'pending'`, plus a regression test asserting the pre-fix behavior (`submitted_at` left `null` after reapply) would have produced `'kesken'`.

### WR-02: Untranslated/hardcoded venue name fallback breaks English locale

**File:** `app/business/page.tsx:111`
**Issue:**
```tsx
{link.liikuntapaikat?.nimi ?? `Paikka ${link.paikka_id}`}
```
`"Paikka"` is a hardcoded Finnish word rendered for English-locale users whenever `liikuntapaikat` join data is missing (e.g. a dangling `business_paikka_links` row pointing at a deleted/unpublished venue, or a transient join failure). This is the only string in the diff that bypasses the `t()` translation layer that every other label in this file uses (`t('dashboardVenuesHeading')`, `t('statusKesken')`, etc.), and `messages/en.json`/`messages/fi.json` already define `addVenueCta`-style keys for everything else in this component.
**Fix:** Add a translation key (e.g. `venueFallbackName`) to both `messages/en.json` and `messages/fi.json` and use it:
```tsx
{link.liikuntapaikat?.nimi ?? t('venueFallbackName', { id: link.paikka_id })}
```
with `"venueFallbackName": "Venue {id}"` / `"venueFallbackName": "Paikka {id}"`.

## Info

### IN-01: No backfill strategy documented for already-`rejected`/`approved` rows reaching `pending` via existing non-onboarding paths

**File:** `supabase/migrations/20260624120000_business_paikka_links_submitted_at.sql:8-12`
**Issue:** The migration comment explains the no-backfill decision for pre-existing rows at the time the migration ships, which is a reasonable one-time tradeoff. However, it doesn't account for the `reapply` route (see WR-01) continuing to produce new rows with the same "stale `submitted_at`" problem going forward — the comment frames this as a one-time historical reclassification, but without the WR-01 fix it is an ongoing source of the same bug for every reapply of a never-submitted-then-rejected venue.
**Fix:** Once WR-01 is fixed, update the migration comment (or a follow-up doc note) to clarify that `submitted_at` is now also stamped by `reapply`, not just `onboarding/submit`, so future readers don't assume submit is the only writer.

### IN-02: `deriveVenueStatus` precedence is implicit and undocumented in code

**File:** `lib/venueStatus.ts:1-11`
**Issue:** The function correctly encodes a non-obvious precedence order (draft existence > submitted-pending > approved > rejected > default-pending), and the test file documents the *behavior* well, but the source file itself has zero comments explaining *why* `hasDraft` outranks even `'approved'`/`'rejected'` (the D-02 invariant referenced only in test names, not in the implementation). A future maintainer editing this 11-line function without reading the test suite could easily reorder the `if` chain and silently break the D-02 invariant.
**Fix:** Add a short comment above the function (or inline above line 6) stating the precedence contract, e.g.:
```ts
// Precedence (do not reorder): an in-progress draft always wins, even over a
// previously approved/rejected claim_status (D-02 invariant) — see venueStatus.test.ts.
```

---

_Reviewed: 2026-06-24T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
