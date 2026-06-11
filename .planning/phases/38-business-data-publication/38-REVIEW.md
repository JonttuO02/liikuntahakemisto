---
phase: 38-business-data-publication
reviewed: 2026-06-11T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - supabase/migrations/20260611000001_approval_trigger.sql
  - app/api/business/claim-paikka/route.ts
  - app/api/business/create-paikka/route.ts
  - app/api/admin/approve/route.ts
  - lib/types.ts
  - app/page.tsx
  - app/components/PaikkaKortti.tsx
  - app/components/DiagonaalKortti.tsx
  - app/components/PaikkaSheet.tsx
findings:
  critical: 4
  warning: 4
  info: 2
  total: 10
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-06-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 38 adds the business-data publication pipeline: an approval trigger, two business API routes (claim, create), an admin approve route, type additions, and BadgeCheck rendering in three card/sheet components.

The implementation is largely sound but contains four critical issues: an unverified authorization bypass (any authenticated user, not just registered businesses, can call claim/create), an `is_claimed` denormalization flag that is never reset on rejection (permanent data corruption), unescaped user-controlled data in an email subject line (header injection), and a missing `NOT NULL` guard in the approval trigger that allows a bad `paikka_id` FK to silently produce zero rows without any error. Additionally, `app/page.tsx` omits `photo_urls` and `logo_url` from the SELECT list even though `DiagonaalKortti` and `PaikkaSheet` both consume them from the same data object.

---

## Critical Issues

### CR-01: Any authenticated user can submit claim/create — no `business_accounts` membership check

**File:** `app/api/business/claim-paikka/route.ts:31-38` and `app/api/business/create-paikka/route.ts:53-60`

**Issue:** Both routes verify a valid JWT and then immediately INSERT into `business_paikka_links` using `user.id` as `business_account_id`. However, `business_paikka_links.business_account_id` is a FK to `business_accounts.user_id`. If a regular (non-business) authenticated user calls these endpoints they will receive a Postgres FK violation error (code `23503`) which is not caught or user-friendly, and depending on DB constraint deferral they may even succeed if the FK is somehow satisfied. More importantly, the *intent* is that only registered businesses may claim venues — this pre-check is absent. A user who has never gone through business registration can submit a claim by calling the API directly.

**Fix:**
```typescript
// After JWT verification, before the INSERT, add:
const { data: bizAccount } = await supabaseAdmin
  .from('business_accounts')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle()

if (!bizAccount) {
  return NextResponse.json({ error: 'Business account not found' }, { status: 403 })
}
```
Apply this check in both `claim-paikka/route.ts` (after line 14) and `create-paikka/route.ts` (after line 14).

---

### CR-02: `is_claimed` flag is never reset on rejection — permanent data corruption

**File:** `app/api/admin/reject/route.ts` (out of scope but causes the bug); `app/api/business/claim-paikka/route.ts:51-61` and `app/api/business/create-paikka/route.ts:71-81`

**Issue:** When a claim or create application is submitted, `is_claimed` is set to `true` on the `liikuntapaikat` row. The `reject` route (reviewed for cross-reference) sets `claim_status = 'rejected'` on `business_paikka_links` but never resets `is_claimed = false` on `liikuntapaikat`. After rejection the venue remains permanently marked as claimed in search results ("Jo hallittu"), preventing any other business from legitimately claiming it. This is a data-integrity defect: the "Jo hallittu" UI state becomes a lie and the venue is locked out of the claim flow indefinitely.

Additionally, the approval trigger (`20260611000001_approval_trigger.sql`) has no counterpart reset trigger for rejected status — the mismatch between the trigger approach (for publication) and the ad-hoc flag approach (for claiming) creates this gap.

**Fix:** In `app/api/admin/reject/route.ts`, after setting `claim_status = 'rejected'`, also reset the flag:
```typescript
// After Step 5 update succeeds, add:
await supabaseAdmin
  .from('liikuntapaikat')
  .update({ is_claimed: false })
  .eq('id', link.paikka_id)
```

---

### CR-03: Email subject line contains unescaped user-controlled data (header injection / content injection)

**File:** `lib/email.ts:26`

**Issue:** The `sendAdminNotificationEmail` function correctly escapes user data inside the HTML body via `esc()`, but the `subject` line is constructed by direct interpolation of `params.companyName` and `params.venueName` without escaping:

```typescript
const subject = `[Aktiivi] Uusi hakemus: ${params.companyName} — ${params.venueName}`
```

Both values originate from the `create-paikka` route (where they come from user-supplied JSON body) or from the database after a claim (where the `nimi` was set by an admin during data import, but `company_name` was set by the business at registration). A malicious registrant can set their `company_name` to a string containing newline characters (`\r\n`) to inject additional email headers, or set it to a long string containing HTML entities that confuse the MUA. Email header injection via `\r\n` is a well-known attack vector.

**Fix:**
```typescript
function escSubject(s: string): string {
  // Strip CR/LF to prevent header injection; strip control characters
  return s.replace(/[\r\n\t]/g, ' ').trim()
}

// In sendAdminNotificationEmail:
const subject = `[Aktiivi] Uusi hakemus: ${escSubject(params.companyName)} — ${escSubject(params.venueName)}`
```
Apply similarly to `sendApprovalEmail` and `sendRejectionEmail` subject lines.

---

### CR-04: Approval trigger silently no-ops when `paikka_id` does not match any row

**File:** `supabase/migrations/20260611000001_approval_trigger.sql:13-15`

**Issue:** The trigger function executes:
```sql
UPDATE liikuntapaikat
SET published = true, business_managed = true
WHERE id = NEW.paikka_id;
```

If `NEW.paikka_id` references a row that no longer exists (e.g., a venue that was deleted between submission and approval), the UPDATE silently matches zero rows and returns `RETURN NEW` without error. The `claim_status` is set to `'approved'` in `business_paikka_links` but the venue is never published. From the admin's perspective the approval appears to succeed (HTTP 200), but the business never sees their venue go live. There is no error, no log, no notification.

**Fix:** Add a row-count check in the trigger:
```sql
CREATE OR REPLACE FUNCTION public.set_business_managed_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE liikuntapaikat
  SET published = true, business_managed = true
  WHERE id = NEW.paikka_id;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'approval_trigger: paikka_id % not found in liikuntapaikat', NEW.paikka_id;
  END IF;

  RETURN NEW;
END;
$$;
```
This causes the `UPDATE` on `business_paikka_links` to roll back automatically (trigger exception), so the admin route receives a 500 error and can investigate rather than silently publishing nothing.

---

## Warnings

### WR-01: `app/page.tsx` omits `photo_urls` and `logo_url` from SELECT — components render fallback images

**File:** `app/page.tsx:7`

**Issue:** The Supabase SELECT string is:
```
'id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus, featured, is_claimed, business_managed'
```
`photo_urls` and `logo_url` are not included. Both `DiagonaalKortti` (lines 88–96, 190–202) and `PaikkaSheet` (lines 59–62, 160–165) read `paikka.logo_url` and `paikka.photo_urls`. When these fields are absent, `DiagonaalKortti` will always show the `Building2` placeholder and the `Camera` fallback, and `PaikkaSheet` will always show the Camera placeholder carousel regardless of whether the business has uploaded images. This means businesses that have completed onboarding with logos and photos will see their venue displayed without any media in the listing view.

**Fix:**
```typescript
// app/page.tsx line 7 — extend the select string:
.select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus, featured, is_claimed, business_managed, image_url, photo_urls, logo_url')
```

---

### WR-02: `claim-paikka` has a TOCTOU race for the `is_claimed` flag

**File:** `app/api/business/claim-paikka/route.ts:31-61`

**Issue:** The route first INSERTs into `business_paikka_links` (which is protected by `UNIQUE(paikka_id)`), then in a separate statement UPDATEs `is_claimed = true` on `liikuntapaikat`. Between these two statements, a concurrent request that reads `is_claimed` could observe a stale `false` value for a venue that is already claimed. More critically, if the is_claimed UPDATE fails (marked non-critical and swallowed), `is_claimed` stays `false` forever for that venue despite the link existing. This means the "Jo hallittu" indicator never appears, defeating its purpose.

The comment "Non-critical: if this UPDATE fails, the claim link still exists — log but do not rollback" understates the user-visible impact: the venue appears claimable to other users (though the DB constraint would ultimately reject their attempt with a 409).

**Fix:** Either treat the `is_claimed` UPDATE failure as critical (return 500 and rollback the link INSERT), or move the flag update to a database trigger that fires on `business_paikka_links INSERT` — which would make it atomic and impossible to miss.

---

### WR-03: Admin `approve` route lacks idempotency — double-approval after state guard bypass is possible

**File:** `app/api/admin/approve/route.ts:44-55`

**Issue:** The route fetches the link and checks `claim_status !== 'pending'` (step 4a), then in a separate statement updates `claim_status = 'approved'` (step 5). Between the fetch and the update, a concurrent admin request for the same `link_id` can pass the `pending` check in both requests and both will execute the UPDATE — resulting in two approval emails being sent and the trigger firing twice. The trigger UPDATE is idempotent (`published=true` twice is harmless), but two approval emails will be sent to the business.

**Fix:** Use a conditional UPDATE that only proceeds if the current status is still `pending`:
```typescript
const { error: updateLinkError, count } = await supabaseAdmin
  .from('business_paikka_links')
  .update({ claim_status: 'approved' })
  .eq('id', linkId)
  .eq('claim_status', 'pending')  // atomic guard
  .select('id', { count: 'exact', head: true })

if (updateLinkError) { /* ... */ }
if (count === 0) {
  return NextResponse.json({ error: 'Application is not pending' }, { status: 409 })
}
```

---

### WR-04: `DiagonaalKortti` `onToggleTodo` button always renders a static `Check` icon — saved/unsaved state is invisible

**File:** `app/components/DiagonaalKortti.tsx:224-232`

**Issue:** The `onToggleTodo` button in `DiagonaalKortti` always renders `<Check className="w-3.5 h-3.5" />` regardless of the `isSaved` prop. In `PaikkaKortti`, the equivalent button correctly switches between `<BookmarkCheck>` (saved) and `<Bookmark>` (unsaved). The `DiagonaalKortti` button ignores the `isSaved` value entirely for the icon — users cannot tell whether a venue is saved from the diagonal card view.

**Fix:**
```typescript
// Replace the static Check icon with a conditional:
import { BookmarkCheck, Bookmark } from 'lucide-react'

// In the button:
{isSaved
  ? <BookmarkCheck className="w-3.5 h-3.5 fill-[#111111] text-[#111111]" />
  : <Bookmark className="w-3.5 h-3.5" />
}
```
The `Check` import is then unused and should be removed.

---

## Info

### IN-01: `Check` icon imported but only used in the broken toggle button — functionally dead import

**File:** `app/components/DiagonaalKortti.tsx:6`

**Issue:** `Check` from `lucide-react` is imported alongside `Camera`, `Building2`, etc. It is used only in the `onToggleTodo` button (WR-04 above) where it renders a static checkmark regardless of state. Once WR-04 is fixed with `BookmarkCheck`/`Bookmark`, the `Check` import becomes dead code.

**Fix:** Remove `Check` from the import after fixing WR-04.

---

### IN-02: `create-paikka` email notification re-queries the newly-inserted `nimi` from the database instead of using the in-scope variable

**File:** `app/api/business/create-paikka/route.ts:91-95`

**Issue:** After inserting the venue with `nimi` from the validated local variable, the email notification block re-queries `liikuntapaikat` to fetch `nimi` again:
```typescript
const { data: paikka } = await supabaseAdmin
  .from('liikuntapaikat')
  .select('nimi')
  .eq('id', newPaikkaId)
  .single()
```
The variable `nimi` (line 22) is already in scope and contains the same value that was just inserted. This is a redundant DB round-trip.

**Fix:**
```typescript
// Replace the paikka query with the in-scope variable:
if (biz && link) {
  await sendAdminNotificationEmail({
    companyName: biz.company_name,
    venueName: nimi,   // already in scope
    linkType: 'created',
    applicationId: link.id,
    submittedAt: new Date().toISOString(),
  })
}
```

---

_Reviewed: 2026-06-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
