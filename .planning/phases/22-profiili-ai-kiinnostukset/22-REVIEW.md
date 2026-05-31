---
phase: 22-profiili-ai-kiinnostukset
reviewed: 2026-05-31T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - lib/buildKiinnostuksetKonteksti.ts
  - supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql
  - app/profiili/ProfiiliClient.tsx
  - app/components/Etusivu.tsx
  - app/api/saasuositus/route.ts
findings:
  critical: 2
  warning: 2
  info: 1
  total: 5
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-05-31T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 22 adds sport-interest selection (`kiinnostukset`) to user profiles and pipes those interests into the AI recommendation widget. The migration, sanitization, and UI toggle logic are solid. Two runtime bugs undermine the personalization feature: (1) the `sessionStorage` cache key does not encode `kotikaupunki` or `kiinnostukset`, so profile-driven re-runs of the AI effect silently return a stale generic response; and (2) `kiinnostukset` is omitted from the `useEffect` dependency array, meaning a user who saves new interests in ProfiiliClient will not see the AI widget update in the same session without a page reload.

## Critical Issues

### CR-01: `kotikaupunki` and `kiinnostukset` absent from AI cache key — personalization silently bypassed

**File:** `app/components/Etusivu.tsx:387-416`

**Issue:** The sessionStorage cache key is composed of only `date + weatherKaupunki + suosikitSizeAndIds` (lines 388-390). `kotikaupunki` and `kiinnostukset` are not included. The AI `useEffect` has both `kotikaupunki` and (implicitly) `kiinnostukset` in its reactive scope and re-runs when these change. However, the re-run hits the same cache key as the earlier generic (unauthenticated) response and returns the cached anonymous text without making a new personalized API call.

Concrete sequence that reproduces the bug:
1. Page loads before auth resolves → `supabaseUser` is `null` → GET is sent, generic response cached under key `saasuositus-{date}-{city}`.
2. Auth resolves → `kotikaupunki` loads as `'Helsinki'` → effect re-runs with same key → cache hit → returns the generic response; the "Käyttäjä vierailee…" context is never sent to the API.
3. Same applies to `kiinnostukset`: even if `kiinnostukset` somehow triggered a re-run (it does not — see CR-02), the same stale key would be served from cache.

**Fix:** Include `kotikaupunki` and a sorted-join of `kiinnostukset` in the cache key. Also gate cached look-up on whether the user is authenticated, so an anonymous cache hit cannot be reused for an authenticated request.

```typescript
const kiinnostuksetKey = [...kiinnostukset].sort().join(',')
const key = 'saasuositus-' + new Date().toISOString().slice(0, 10)
  + '-' + weatherKaupunki
  + (todoIds.size > 0 ? '-' + suosikitSizeAndIds : '')
  + (kotikaupunki ? '-hk:' + kotikaupunki : '')
  + (kiinnostuksetKey ? '-ki:' + kiinnostuksetKey : '')
```

---

### CR-02: `kiinnostukset` missing from `useEffect` dependency array — AI widget never reacts to interest changes

**File:** `app/components/Etusivu.tsx:401-416`

**Issue:** `kiinnostukset` is read inside the AI `useEffect` (line 402, spread into the POST body) but is absent from the dependency array on line 416. The exhaustive-deps suppression comment on line 415 only justifies excluding `paikat`; it does not cover `kiinnostukset`. As a result:

- When a user saves new interests in ProfiiliClient and returns to the homepage within the same session, the `kiinnostukset` state in Etusivu is updated (line 359) via `subscribeToAuthUser`, but the AI effect does not re-fire. The widget continues showing a recommendation that ignores the user's sport preferences until `suosikitSizeAndIds`, `weatherKaupunki`, or `kotikaupunki` independently changes.
- Combined with CR-01, even if the effect did re-run, the cache would suppress the personalized API call anyway.

**Fix:** Add `kiinnostukset` to the dependency array. To avoid spurious re-runs from reference churn (a new array is created on every profile load), stabilize with a sorted join string the same way `suosikitSizeAndIds` handles favorites.

```typescript
const kiinnostuksetKey = useMemo(
  () => [...kiinnostukset].sort().join(','),
  [kiinnostukset]
)

// In the useEffect dependency array:
}, [suosikitSizeAndIds, weatherKaupunki, kotikaupunki, kiinnostuksetKey])
```

---

## Warnings

### WR-01: `handleSave` and `handleSaveKiinnostukset` are separate upserts — no error feedback on failure

**File:** `app/profiili/ProfiiliClient.tsx:51-84`

**Issue:** Both save handlers silently swallow errors: the `if (!error)` guard shows a success toast but there is no `else` branch or UI signal when the Supabase write fails. If the upsert fails (network error, RLS reject, schema mismatch), the user receives no feedback and believes their data was saved.

```typescript
if (!error) {
  setSaved(true)
  setTimeout(() => setSaved(false), 2500)
}
// No else — user gets no feedback on failure
```

This is especially problematic for `kiinnostukset`: if the migration has not been applied in the target environment, `kiinnostukset` column does not exist and the upsert will silently fail.

**Fix:** Add an error state and display a failure message.

```typescript
const [saveError, setSaveError] = useState<string | null>(null)

async function handleSaveKiinnostukset() {
  if (!userId) return
  const supabase = createBrowserSupabase()
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, kiinnostukset, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (!error) {
    setSavedKiinnostukset(true)
    setSaveError(null)
    setTimeout(() => setSavedKiinnostukset(false), 2500)
  } else {
    setSaveError('Tallennus epäonnistui. Yritä uudelleen.')
  }
}
```

---

### WR-02: `supabaseUser` guard for GET vs POST fires before auth resolves — first-load AI call is always anonymous for authenticated users

**File:** `app/components/Etusivu.tsx:401-403`

**Issue:** `supabaseUser` initializes as `null` (line 174). The AI `useEffect` triggers early in the component lifecycle (it depends on `suosikitSizeAndIds`, `weatherKaupunki`, `kotikaupunki` — all set at initial render). At that moment, auth has not resolved yet, so `supabaseUser !== null` is `false` and a GET request (anonymous, no personalization) is sent. The auth subscription fires shortly after and updates `supabaseUser`, `todoIds`, and `kotikaupunki`, but these state updates trigger independent dependency changes that may or may not re-run the effect depending on whether the new values actually differ from the initial empty state.

For a logged-in user with no favorites and no kotikaupunki (new user), none of the three deps change after auth resolves, so the AI effect never re-runs as POST. The user permanently receives the generic unauthenticated greeting for that session.

**Fix:** Add `supabaseUser` (or a boolean `isAuthReady` flag) to the dependency array, or delay the AI fetch until auth state is known.

```typescript
const [isAuthReady, setIsAuthReady] = useState(false)

// In subscribeToAuthUser callback:
setIsAuthReady(true)

// In AI useEffect:
if (!isAuthReady) return

}, [suosikitSizeAndIds, weatherKaupunki, kotikaupunki, kiinnostuksetKey, isAuthReady])
```

---

## Info

### IN-01: `buildKiinnostuksetKonteksti` does not validate that strings are known sport keys

**File:** `lib/buildKiinnostuksetKonteksti.ts:13-18`

**Issue:** The function accepts any `string[]` and passes values directly into the AI prompt. Although the route handler (route.ts:105-110) applies a character allowlist (`[^\w\sÄäÖöÅå\-,.'()&]`) before passing the array here, the function itself has no awareness of the `lajiKonfig` key space. A client could POST an array like `["padel", "padel", "padel", ...]` (10× after slice) or any 80-character string that passes the allowlist. The AI prompt currently has no instruction to treat unrecognized sport names skeptically.

This is a defense-in-depth gap rather than a critical injection risk (the allowlist filters the most dangerous characters), but validating against the known key set from `lajiKonfig` would be more correct and would degrade more gracefully if the client sends garbage.

**Fix:** Filter to known keys at the call site in the route handler, or accept only values that match `Object.keys(lajiKonfig)`.

```typescript
import { lajiKonfig } from '@/lib/lajit'

kiinnostukset = Array.isArray(body.kiinnostukset)
  ? body.kiinnostukset
      .slice(0, 10)
      .filter((s: unknown): s is string => typeof s === 'string' && s in lajiKonfig)
  : []
```

---

_Reviewed: 2026-05-31T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
