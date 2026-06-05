---
phase: 32-yritysrekisterointi-auth
reviewed: 2026-06-05T11:59:44Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - app/api/business/register/route.ts
  - app/business/page.tsx
  - app/business/rekisteroidy/page.tsx
  - app/components/AuthModal.tsx
  - messages/en.json
  - messages/fi.json
findings:
  critical: 2
  warning: 5
  info: 1
  total: 8
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-06-05T11:59:44Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 32 introduces a business registration flow: a Route Handler (`/api/business/register`) that JWT-verifies then inserts into `business_accounts`, a registration page (`/business/rekisteroidy`), and changes to `AuthModal` to redirect business users to `/business` after sign-in. The i18n namespaces (`Business`, `Auth`) are complete and consistent across both locales.

Two critical defects were found. The first is a **data-loss bug** in the Route Handler: the atomicity rollback (`deleteUser`) fires on any INSERT failure, including for users who are not new — it will permanently delete the auth account of any pre-existing authenticated user whose insert fails for any reason (duplicate key, transient error, etc.). The second is an **orphan auth user** condition on the client side: if the registration page's Step 1 (signUp) succeeds but Step 2 (fetch to Route Handler) fails due to a network error before the route can call `deleteUser`, the auth user is left with no business_accounts row and no way to retry (email-already-in-use on retry).

Five warnings cover stale-closure risk in the AuthModal auth-state subscription, fragile error-string matching, and leaked internal error details.

---

## Critical Issues

### CR-01: Route Handler `deleteUser` fires on any authenticated user whose INSERT fails — destroys pre-existing accounts

**File:** `app/api/business/register/route.ts:36`

**Issue:** The route verifies the caller's JWT at line 10-12, confirming the user exists and is authenticated. Then on line 36, if the `business_accounts` INSERT fails for *any* reason (transient DB error, duplicate constraint because the user already has a row, network timeout to Supabase), `supabaseAdmin.auth.admin.deleteUser(user.id)` permanently deletes the calling user's auth account. This is an elevation-of-privilege inversion: the "rollback" was intended to clean up a brand-new user created in the same request, but this Route Handler does **not** create the auth user — the client creates the user via `signUp()` and then calls this endpoint with the resulting JWT. A second registration attempt from the same account, or any transient INSERT failure, will silently wipe a real user account.

**Fix:** Remove `deleteUser` from the Route Handler entirely. The Route Handler should only create the `business_accounts` row; it cannot and should not perform auth cleanup because it has no way to know whether the auth user was just created or is pre-existing. Client-side cleanup must be done in the registration page (see CR-02). If an idempotent re-insert is desired, add a `ON CONFLICT (user_id) DO NOTHING` or check first.

```typescript
// app/api/business/register/route.ts — remove the deleteUser branch

  if (error) {
    // Do NOT call deleteUser here — this endpoint does not own the auth user lifecycle.
    // The client that called signUp() is responsible for any auth cleanup.
    return NextResponse.json(
      { error: 'business_accounts insert failed' },
      { status: 500 }
    )
  }
```

---

### CR-02: Client leaves orphan auth user when Step 2 network fetch fails before reaching the Route Handler

**File:** `app/business/rekisteroidy/page.tsx:65-78`

**Issue:** Step 1 (`supabase.auth.signUp`) at line 50 creates an auth user and returns a session. Step 2 (`fetch('/api/business/register', ...)`) at line 65 sends the JWT to the Route Handler to insert the `business_accounts` row. If Step 2 fails for a reason that means the Route Handler never executed (network error, DNS failure, 502 from the Next.js edge, or any path where the Route Handler returns a non-500 error before reaching the `deleteUser` call), `response.ok` is false (line 74), the page shows an error, and returns. The newly created auth user is now permanently orphaned: the user will see a generic error, and any subsequent registration attempt with the same email will fail with "Email address is already in use" with no path to recovery.

With CR-01 fixed (deleteUser removed from Route Handler), the client must take responsibility for cleanup on INSERT failure.

**Fix:** After a failed Step 2, sign out the newly created user and delete them via a dedicated cleanup call, or at minimum sign them out so the session is cleared. The registration page should call `supabase.auth.signOut()` to at least clear the local session, and ideally expose a server action or separate route that can call `deleteUser` only when the user was just created in this same flow.

```typescript
// app/business/rekisteroidy/page.tsx — cleanup on Step 2 failure

      if (!response.ok) {
        // Clean up the auth user we just created — without business_accounts it is orphaned.
        // signOut clears the local session; a separate admin endpoint can deleteUser.
        await supabase.auth.signOut()
        setError(t('errorAccountCreationFailed'))
        setLoading(false)
        return
      }
```

Note: A full cleanup requires a server-side endpoint that accepts "I just created this user, please delete them" — which itself needs to be JWT-protected and stateless. The minimum viable fix is `signOut()` so the user can retry. Document the orphan risk in a comment if full deletion is deferred.

---

## Warnings

### WR-01: `detail: error.message` leaks internal Supabase error strings to API callers

**File:** `app/api/business/register/route.ts:38`

**Issue:** The 500 response body includes `detail: error.message`, which can contain internal Supabase/Postgres error text such as constraint names, column names, and table structure. This is an information-disclosure risk.

**Fix:** Remove `detail` from the error response, or restrict it to a sanitized message:

```typescript
return NextResponse.json(
  { error: 'Registration failed. Please try again.' },
  { status: 500 }
)
```

---

### WR-02: `onAuthStateChange` subscription in AuthModal recreates on every `loading` toggle — stale-closure risk

**File:** `app/components/AuthModal.tsx:79-102`

**Issue:** The `useEffect` at line 79 depends on `[open, loading]` (line 102). Every time `loading` changes — which happens at the start and end of every sign-in attempt — this effect tears down and recreates the `onAuthStateChange` subscription. There is a window between teardown of the old subscription and setup of the new one where a `SIGNED_IN` event could be missed entirely. Additionally, the callback closes over `onClose`, `router`, `onSuccess`, and `pendingPaikkaId`, none of which are in the dependency array (suppressed by the eslint-disable comment). If `onClose` or `onSuccess` are unstable references (new function on each parent render), the effect will use stale closures, calling the wrong version of `onClose` or posting navigation to an old router instance.

The `eslint-disable-next-line react-hooks/exhaustive-deps` at line 101 is masking this.

**Fix:** Stabilize the subscription lifecycle. The subscription should only be created when `open` becomes true, not on every `loading` toggle. Pass `onClose` and `onSuccess` as stable refs using `useRef` to avoid the stale-closure problem without needing to re-subscribe:

```typescript
const onCloseRef = useRef(onClose)
const onSuccessRef = useRef(onSuccess)
useEffect(() => { onCloseRef.current = onClose }, [onClose])
useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

useEffect(() => {
  if (!open) return
  const supabase = createBrowserSupabase()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event !== 'SIGNED_IN' || !session || !loading) return
      // ... use onCloseRef.current, onSuccessRef.current
    }
  )
  return () => subscription.unsubscribe()
}, [open]) // loading read inside callback via ref or state check
```

---

### WR-03: `mapBusinessError` in `rekisteroidy/page.tsx` — weak-password detection matches on `'6'` anywhere in the message

**File:** `app/business/rekisteroidy/page.tsx:20-26`

**Issue:** The condition on line 21-25:
```typescript
(message.includes('Password should be at least') || message.includes('password')) &&
message.includes('6')
```
will match any error message that contains both the word "password" and the digit "6" — e.g. "6 accounts already have this password hash" or any Supabase message that changes the number. The same pattern also exists in `AuthModal.tsx:27-31`. This is a fragile heuristic that will misclassify unrelated errors as "weak password".

**Fix:** Match on the full canonical Supabase error string rather than substring fragments:

```typescript
if (message.includes('Password should be at least 6')) {
  return 'errorWeakPassword'
}
```

---

### WR-04: AuthModal async `onAuthStateChange` callback calls `onClose()` and `router.push()` after potential unmount

**File:** `app/components/AuthModal.tsx:85-96`

**Issue:** The callback passed to `onAuthStateChange` is `async`. It calls `supabase.from('business_accounts').select(...)` which is awaited. Between the `SIGNED_IN` event firing and the database query completing, the modal may have been closed (user presses Escape, backdrop click), unmounting the component. When the query resolves, `onClose()` is called (potentially a no-op depending on parent implementation) and `router.push('/business')` fires — navigating the user away unexpectedly even though they may have already dismissed the modal.

**Fix:** Add a mounted/cancelled guard:

```typescript
useEffect(() => {
  if (!open) return
  let cancelled = false
  const supabase = createBrowserSupabase()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event !== 'SIGNED_IN' || !session || !loading || cancelled) return
      const { data: bizRow } = await supabase
        .from('business_accounts')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (bizRow) {
        onClose()
        router.push('/business')
      } else {
        onSuccess?.(pendingPaikkaId ?? null)
        onClose()
      }
    }
  )
  return () => {
    cancelled = true
    subscription.unsubscribe()
  }
}, [open, loading]) // eslint-disable-next-line react-hooks/exhaustive-deps
```

---

### WR-05: No idempotency guard — re-submitting registration creates a duplicate INSERT that triggers rollback

**File:** `app/api/business/register/route.ts:30-41`

**Issue:** If a user somehow calls this endpoint twice with the same valid JWT (e.g., double-click, client retry, or after CR-02 is fixed and the client retries after a `signOut()`/new `signUp()` with the same email), the second INSERT will fail on a unique constraint on `user_id`. Currently this triggers `deleteUser` (CR-01), which would destroy the account. Even after CR-01 is fixed, the 500 response provides no indication that the user already has a `business_accounts` row. The endpoint should check for an existing row and return 200 (idempotent) or 409 (conflict) rather than 500.

**Fix:** Check for an existing row before inserting, or use `upsert` with `ignoreDuplicates: true`:

```typescript
const { error } = await supabaseAdmin
  .from('business_accounts')
  .insert({ user_id: user.id, company_name })
  // Postgres: ON CONFLICT (user_id) DO NOTHING
  // Supabase client: use .upsert with ignoreDuplicates or check error.code
  
// Alternatively, check error code for unique violation:
if (error) {
  if (error.code === '23505') { // unique_violation
    return NextResponse.json({ ok: true }) // idempotent — already registered
  }
  return NextResponse.json({ error: 'Registration failed.' }, { status: 500 })
}
```

---

## Info

### IN-01: Business registration page shows `errorGeneric` when email confirmation is required (`!data.session`)

**File:** `app/business/rekisteroidy/page.tsx:58-60`

**Issue:** When Supabase's "Confirm email" setting is enabled in the project, `signUp()` returns `{ data: { session: null }, error: null }`. The current guard at line 58 shows `t('errorGeneric')` ("Something went wrong. Please try again.") — which is misleading since the operation succeeded and the user just needs to check their email. The `Business` namespace has no `errorCheckEmail` key (unlike `Auth` which has `Auth.errorCheckEmail`).

**Fix:** Add `Business.errorCheckEmail` to both locale files and use it here:

```typescript
// messages/en.json — Business namespace
"errorCheckEmail": "Check your email to confirm your account before continuing."

// messages/fi.json — Business namespace  
"errorCheckEmail": "Tarkista sähköpostisi ja vahvista tili ennen jatkamista."

// rekisteroidy/page.tsx line 59
setError(t('errorCheckEmail'))
```

---

_Reviewed: 2026-06-05T11:59:44Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
