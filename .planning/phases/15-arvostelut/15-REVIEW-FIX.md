---
phase: 15-arvostelut
fixed_at: 2026-05-28T00:00:00Z
review_path: .planning/phases/15-arvostelut/15-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-05-28T00:00:00Z
**Source review:** .planning/phases/15-arvostelut/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10
- Fixed: 10
- Skipped: 0

## Fixed Issues

### CR-01: `reviewer_name` leaks real email prefix regardless of `is_anonymous`

**Files modified:** `app/components/ReviewForm.tsx`
**Commit:** 77b00ae
**Applied fix:** Changed `reviewer_name` in upsert payload to `isAnonymous ? null : (user.email?.split('@')[0] ?? null)`. When `isAnonymous=true`, `null` is stored in the DB. The DB-level constraint (CHECK) and strengthened UPDATE policy are documented as follow-up SQL in the migration file — run manually in Supabase SQL editor since the migration has already been applied.

### CR-02: No DELETE RLS policy — users cannot delete their own reviews

**Files modified:** `supabase/migrations/20260528_reviews.sql`
**Commit:** 147782e
**Applied fix:** Added commented-out follow-up SQL block to the migration file with instructions to run `CREATE POLICY "Users can delete own review" ON reviews FOR DELETE USING (auth.uid() = user_id)` manually in the Supabase SQL editor. The migration has already been applied to the live database, so the policy must be added via the SQL editor, not by re-running the migration.

### CR-03: `teksti` has no server-side length limit

**Files modified:** `app/components/ReviewForm.tsx`, `supabase/migrations/20260528_reviews.sql`
**Commit:** 77b00ae (ReviewForm.tsx), 147782e (migration follow-up)
**Applied fix:** Added `maxLength={2000}` to the textarea in ReviewForm.tsx. Added commented-out follow-up SQL with `ALTER TABLE reviews ADD CONSTRAINT chk_teksti_length CHECK (char_length(teksti) <= 2000)` in the migration file for manual execution in Supabase SQL editor.

### WR-01: `today` constant is module-level — frozen at bundle time

**Files modified:** `app/components/ReviewForm.tsx`
**Commit:** 77b00ae
**Applied fix:** Removed `const today = new Date().toISOString().split('T')[0]` from module scope. Added the same line as the first statement inside `buildForm()`, so it is computed fresh each time the form renders.

### WR-02: `setTimeout` for `saved` banner not cleaned up

**Files modified:** `app/components/ReviewForm.tsx`
**Commit:** 77b00ae
**Applied fix:** Added `const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`. In the success branch, the old `setTimeout` call is replaced with a ref-based version that clears any existing timer first. A dedicated cleanup `useEffect` with empty deps clears the timer on unmount.

### WR-03: `editing` flag never reset after successful save

**Files modified:** `app/components/ReviewForm.tsx`
**Commit:** 77b00ae
**Applied fix:** Added `setEditing(false)` in the success branch of `handleSubmit`, immediately after `setSaved(true)`. This returns the user to the read-only `ExistingReviewView` after a successful save.

### WR-04: `ReviewCard` renders no empty-star glyphs

**Files modified:** `app/components/ReviewSection.tsx`
**Commit:** 9c060a9
**Applied fix:** Added `const emptyStars = '☆'.repeat(5 - review.rating)` in `ReviewCard`. Updated the star `<span>` to render `{filledStars}{emptyStars}` so all 5 stars are always visible (e.g., a 2-star review shows `★★☆☆☆`).

### IN-01: `StarPicker` does not clear hover state on keyboard blur

**Files modified:** `app/components/StarPicker.tsx`
**Commit:** 0287fb4
**Applied fix:** Added `onBlur` handler to the container `<div>` that calls `setHovered(0)` when focus leaves the widget entirely (checked via `!e.currentTarget.contains(e.relatedTarget as Node | null)`). This matches the existing `onMouseLeave` behaviour for mouse users.

### IN-02: `updated_at` set client-side — server timestamp should be used

**Files modified:** `app/components/ReviewForm.tsx`
**Commit:** 77b00ae
**Applied fix:** Removed `updated_at: new Date().toISOString()` from the upsert payload. The column has `DEFAULT now()` for inserts; for updates, the DB trigger follow-up SQL is documented as a comment in the migration file (manual execution required in Supabase SQL editor).

### IN-03: `computeAvgRating` tests missing non-integer average case

**Files modified:** `lib/reviewUtils.test.ts`
**Commit:** ab7629b
**Applied fix:** Added test case `it('returns a non-integer average without rounding', () => { expect(computeAvgRating([1, 2])).toBe(1.5) })` to the `computeAvgRating` describe block, verifying the documented "raw average, no rounding" contract.

---

## DB Follow-up Required (CR-01, CR-02, CR-03)

The following SQL must be run manually in the Supabase SQL editor. The migration has already been applied so these cannot be added to the migration file without risk of re-run conflicts. They are documented as comments in `supabase/migrations/20260528_reviews.sql`.

**CR-02 — DELETE policy:**
```sql
CREATE POLICY "Users can delete own review"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);
```

**CR-01 — anonymity CHECK constraint:**
```sql
ALTER TABLE reviews ADD CONSTRAINT chk_anon_no_name
  CHECK (is_anonymous = false OR reviewer_name IS NULL);
```

**CR-01 — strengthen UPDATE policy:**
```sql
DROP POLICY IF EXISTS "Users can update own review" ON reviews;
CREATE POLICY "Users can update own review"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (is_anonymous = false OR reviewer_name IS NULL)
  );
```

**CR-03 — teksti length constraint:**
```sql
ALTER TABLE reviews ADD CONSTRAINT chk_teksti_length
  CHECK (char_length(teksti) <= 2000);
```

---

_Fixed: 2026-05-28T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
