---
phase: 15-arvostelut
reviewed: 2026-05-28T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - app/components/ReviewForm.tsx
  - app/components/ReviewSection.tsx
  - app/components/StarPicker.tsx
  - app/paikat/[id]/page.tsx
  - lib/reviewUtils.test.ts
  - lib/reviewUtils.ts
  - supabase/migrations/20260528_reviews.sql
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-05-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the Phase 15 Arvostelut implementation: reviews table migration, ReviewForm, ReviewSection, StarPicker, profile page integration, and utility functions. The overall structure is sound — RLS policies are present, upsert uses the correct conflict target, and the utility functions are correct and well-tested.

Three critical issues were found: (1) `reviewer_name` (derived from the user's email prefix) is stored in the row and returned via the public SELECT policy, allowing any client to read real names even when the user chose "Anonyymi" — violating T-15-02; (2) no DELETE RLS policy exists, so users cannot delete their own reviews — this is an incomplete implementation rather than a permissive gap; (3) the `teksti` field has no server-side length constraint, enabling unbounded writes that bypass any future client-side limit. Four warnings and three info items were also found.

---

## Critical Issues

### CR-01: `reviewer_name` leaks real email prefix to any reader regardless of `is_anonymous`

**File:** `supabase/migrations/20260528_reviews.sql:23-25` and `app/paikat/[id]/page.tsx:31`

**Issue:** The public SELECT policy (`USING (true)`) returns every column including `reviewer_name`. The `reviewer_name` column stores the email prefix (`user.email?.split('@')[0]`) unconditionally at write time (ReviewForm.tsx line 110). When a user posts anonymously, `is_anonymous = true` is stored, but `reviewer_name = 'joonasmith'` (for example) is also stored in the same row and is readable by any unauthenticated client via the public API. The only guard is the client-side `resolveDisplayName()` call, which can be bypassed by directly querying the Supabase REST endpoint. This directly violates T-15-02 (identity disclosure).

**Fix — two-part:**

1. In the migration, store `reviewer_name` as NULL when the user is anonymous — enforce this at the DB layer:
```sql
-- Replace the existing UPDATE policy with one that enforces anonymity at DB level:
CREATE POLICY "Users can update own review"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (is_anonymous = false OR reviewer_name IS NULL)
  );
```

2. In `ReviewForm.tsx` line 110, null out `reviewer_name` when anonymous:
```ts
reviewer_name: isAnonymous ? null : (user.email?.split('@')[0] ?? null),
```

3. Additionally, use a column-level security approach or a DB trigger to enforce that `reviewer_name IS NULL` whenever `is_anonymous = true`, so the invariant holds even if the client is bypassed:
```sql
ALTER TABLE reviews ADD CONSTRAINT chk_anon_no_name
  CHECK (is_anonymous = false OR reviewer_name IS NULL);
```

---

### CR-02: No DELETE RLS policy — users cannot delete their own reviews

**File:** `supabase/migrations/20260528_reviews.sql:19-36`

**Issue:** RLS is enabled with no `FOR DELETE` policy. With Supabase's default-deny stance under RLS this means no user (including the owner) can delete their own review. If a user wants to retract a review entirely there is no path to do so. The implementation also has no "delete" UI, but the missing policy is a correctness gap that will surface as a silent permission error if a delete is ever attempted — and there is no recourse for users who wish to remove their review entirely. The insert + upsert path works, but without a delete policy the data is essentially write-only from the user's perspective.

**Fix:**
```sql
-- Add after the UPDATE policy:
CREATE POLICY "Users can delete own review"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);
```

---

### CR-03: `teksti` has no server-side length limit — unbounded writes possible

**File:** `supabase/migrations/20260528_reviews.sql:9`

**Issue:** `teksti text NOT NULL DEFAULT ''` has no length constraint. The `<textarea>` in ReviewForm has no `maxLength` attribute either (ReviewForm.tsx lines 156–163). An authenticated user can submit arbitrarily large text through the REST API, bypassing the UI entirely. With no server-side cap this can be used for storage exhaustion or to inject very large payloads into pages that render all reviews.

**Fix — enforce at both layers:**

In the migration:
```sql
teksti text NOT NULL DEFAULT '' CHECK (char_length(teksti) <= 2000),
```

In ReviewForm.tsx textarea:
```tsx
<textarea
  maxLength={2000}
  value={teksti}
  ...
/>
```

---

## Warnings

### WR-01: `today` constant is module-level — date is frozen at server bundle time (or first client load)

**File:** `app/components/ReviewForm.tsx:29`

**Issue:** `const today = new Date().toISOString().split('T')[0]` is declared at module scope. In a Next.js client bundle this executes once when the module is first evaluated — typically at page load. If the page is kept open across midnight, the `max` attribute on the date input will continue to reference yesterday's date, preventing the user from selecting today. More importantly, in SSR/RSC environments with module-level caching the value could be bundled at build time and become permanently stale.

**Fix:** Move the computation inside the component or derive it lazily:
```tsx
// Inside ReviewForm component body, or inside buildForm:
const today = new Date().toISOString().split('T')[0]
```

---

### WR-02: `setTimeout` for `saved` banner not cleaned up — sets state on unmounted component

**File:** `app/components/ReviewForm.tsx:124`

**Issue:** `setTimeout(() => setSaved(false), 2500)` is called without storing the timer ID. If the user navigates away within 2.5 seconds after a successful submit, the timeout fires on an unmounted component. React 18 suppresses the "setState on unmounted component" warning in production but the timer is still a latent resource leak. If the component remounts quickly (e.g., router.refresh() triggers a re-render), a second timer may fire and reset state unexpectedly.

**Fix:**
```tsx
const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// In handleSubmit success branch:
if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
savedTimerRef.current = setTimeout(() => setSaved(false), 2500)

// Add cleanup in useEffect:
useEffect(() => {
  return () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }
}, [])
```

---

### WR-03: `editing` flag is never reset to `false` after a successful save

**File:** `app/components/ReviewForm.tsx:120-125`

**Issue:** After a successful upsert, `setSaved(true)` and `router.refresh()` are called, but `setEditing(false)` is not. The component stays in edit mode even though the review has been saved. The user sees the "Tallenna muutokset" form with the "Arvostelu tallennettu" banner, but they are not returned to the read-only `ExistingReviewView`. `router.refresh()` will re-fetch server data and call the `subscribeToAuthUser` callback again (which re-fetches `existingReview`), but the `editing` state is local and survives the refresh. This means the read-only summary view after editing is never shown.

**Fix:** Add `setEditing(false)` in the success branch:
```tsx
} else {
  setSubmitError(null)
  setSaved(true)
  setEditing(false)   // <-- return to read-only view
  router.refresh()
  setTimeout(() => setSaved(false), 2500)
}
```

---

### WR-04: `ReviewCard` in ReviewSection renders no empty-star glyphs — star display is incomplete

**File:** `app/components/ReviewSection.tsx:17,23`

**Issue:** `ReviewCard` computes `filledStars = '★'.repeat(review.rating)` but never computes or renders the empty stars. A 2-star review renders `★★` with no trailing hollow stars, while the aggregate display in `ReviewSection` correctly renders both filled and empty stars (lines 60–61). The `ExistingReviewView` in ReviewForm.tsx (line 33) does compute `emptyStars` correctly. The inconsistency means the public review list looks different from the user's own review preview, and a 1-star review displays as a single `★` with no context that 5 is the maximum.

**Fix:**
```tsx
function ReviewCard({ review }: { review: ReviewRow }) {
  const filledStars = '★'.repeat(review.rating)
  const emptyStars  = '☆'.repeat(5 - review.rating)
  const displayName = resolveDisplayName(review.is_anonymous, review.reviewer_name)

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-[rgba(0,0,0,0.07)] last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-sm">{filledStars}{emptyStars}</span>
        ...
```

---

## Info

### IN-01: `StarPicker` focuses a star on keyboard tab but never clears hover state on blur

**File:** `app/components/StarPicker.tsx:32,34`

**Issue:** `onFocus={() => setHovered(n)}` lights up the hovered star when a button receives focus (good for keyboard nav), but there is no `onBlur` handler. When a user tabs through the stars and then tabs away from the widget entirely, the last focused star remains visually highlighted (because `hovered` is still set to that star's value). This is a minor UX inconsistency — the `onMouseLeave` on the container clears hover on mouse-out, but keyboard focus-out has no equivalent.

**Fix:** Add a blur handler that clears hovered state when focus leaves the widget entirely:
```tsx
<div
  className="flex gap-1"
  role="group"
  aria-label="Tähtiarvosana"
  onMouseLeave={() => setHovered(0)}
  onBlur={(e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setHovered(0)
    }
  }}
>
```

---

### IN-02: `updated_at` is set client-side — server timestamp should be used instead

**File:** `app/components/ReviewForm.tsx:111`

**Issue:** `updated_at: new Date().toISOString()` is computed in the browser and sent as part of the upsert payload. Client clocks can be skewed or spoofed. The column already has `DEFAULT now()` but that only applies on INSERT; an explicit client value on UPDATE will override the server's clock. A DB-side trigger (`BEFORE UPDATE SET updated_at = now()`) or simply omitting `updated_at` from the upsert payload is the idiomatic approach.

**Fix:** Remove `updated_at` from the client payload and add a trigger in the migration:
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```
And remove line 111 from `ReviewForm.tsx`.

---

### IN-03: `computeAvgRating` tests do not cover non-integer average or out-of-range ratings

**File:** `lib/reviewUtils.test.ts:26-42`

**Issue:** The test suite covers the happy path but omits two meaningful edge cases: (a) a non-integer average such as `[1, 2]` → `1.5`, which verifies the function returns a raw float (important since callers round at render time per the docstring); (b) out-of-range rating values (e.g., `[0]` or `[6]`) are not tested — while the DB CHECK constraint prevents these from being stored, the utility function accepts any `number[]` and has no guard. The tests as written are not wrong, but they leave the documented "raw average, no rounding" contract unverified.

**Fix:** Add:
```ts
it('returns a non-integer average without rounding', () => {
  expect(computeAvgRating([1, 2])).toBe(1.5)
})
```

---

_Reviewed: 2026-05-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
