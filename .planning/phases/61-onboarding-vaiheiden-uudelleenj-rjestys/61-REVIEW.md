---
phase: 61
plan: review
type: review
status: issues_found
effort: high
reviewed_at: "2026-06-26"
findings_count: 7
severity_breakdown: {critical: 1, high: 3, medium: 2, low: 1}
---

# Phase 61 Code Review

## Summary

7 findings across the onboarding reorder. One data-loss bug (website clobber), three high-severity UX blockers (resuming-user flows broken), and three medium/low issues.

## Findings

### 1 — CRITICAL · app/business/onboarding/page.tsx + app/business/onboarding/StepYhteystiedot.tsx

**Website URL clobbered by step-4 save → varauslinkki always null**

`handleNimiUrlNext` fires `save-step` with `{ field: 'yhteystiedot', value: { website: url } }`. Later, `StepYhteystiedot.handleNext` fires `save-step` with `{ field: 'yhteystiedot', value: { puhelin, email, kuvaus } }` — no `website`. The save-step route does a column-level UPSERT (`{ [field]: value }`), which **replaces the entire JSONB column**. The step-4 write clobbers the website written at step 1. `submit/route.ts` reads `draft.yhteystiedot?.website` to populate `varauslinkki` — it will always be `null` for users who went through the new flow.

**Fix:** Include `website` in the step-4 `save-step` payload (read from `initialYhteystiedot?.website` or pass it down), or switch save-step to a JSONB merge (`jsonb_build_object || value`) instead of column replacement.

---

### 2 — HIGH · app/business/onboarding/page.tsx line 291 + 341

**Fast-forward sets `websiteUrl=null` → all fast-forwarded users misrouted through `handleSkip()`, bypassing AI analyze**

When `paikka.latitude !== null`, the fast-forward fires `handleNimiUrlNext(null)` → `setWebsiteUrl(null)`. `StepSijainti.onNext` checks `websiteUrl ? setPagePhase('analyze') : handleSkip()`. Since `websiteUrl` is `null` (not re-hydrated from draft), every resuming user with latitude already set gets routed through `handleSkip()` — the AI branding analysis never runs, even when the user had previously entered a website.

**Fix:** Re-hydrate `websiteUrl` from `draft.yhteystiedot?.website` when loading a resuming session, or skip both nimi-url and sijainti entirely (routing directly to `'analyze'` or `'laji-skip'`) for users where `paikka.latitude !== null`.

---

### 3 — HIGH · app/business/onboarding/page.tsx line 78–84 + StepSijainti.tsx line 111

**Fast-forward to `'sijainti'` when `lat` already saved → CTA disabled → resuming user stuck**

`StepSijainti` initializes `lat = null` in local state. Its CTA is `disabled={loading || lat === null}`. The fast-forward routes users with `paikka.latitude !== null` directly to the sijainti step, but the local `lat` state is still `null` — the CTA is disabled and there's no auto-advance. The user must re-pick their location before they can continue.

**Fix:** Either skip the sijainti step entirely for users where `paikka.latitude !== null` (route to analyze/laji-skip directly), or pre-populate `lat`/`lng` state in `StepSijainti` from a prop when resuming.

---

### 4 — HIGH · app/business/onboarding/page.tsx line 342

**Back from sijainti → back-loop after coordinates saved**

`StepSijainti.onPrev` sets `pagePhase='nimi-url'`, remounting `StepNimiJaURLPrePhase`. Its `useEffect` (dependency `[]`) re-runs on every mount, re-fetches the paikka, and — if `paikka.latitude` is now non-null (the user just saved coordinates) — immediately fires `onNext(null)` → `pagePhase='sijainti'` again. The user cannot navigate back; they are trapped.

**Fix:** Either pass the already-fetched `paikka` as a prop instead of re-fetching, or suppress the fast-forward when the user explicitly navigated back (e.g. a `userNavigatedBack` flag).

---

### 5 — HIGH · app/business/onboarding/StepYhteystiedot.tsx line 146 + WizardInner.tsx line 228

**`onNext()` unawaited → `finally` clears `loading` before submit completes → double-submit + silent errors**

`StepYhteystiedot.handleNext` calls `onNext()` without `await` inside a `try/finally`. `onNext` is typed `() => void` but receives the `async handleYhteystiedotSubmit`. The `finally` block runs `setLoading(false)` immediately after the call returns (before the submit POST resolves), re-enabling the CTA. A second tap fires a duplicate `/submit` POST. Additionally, any submit-side error (`res.ok === false`) is silently swallowed — `handleYhteystiedotSubmit` has no `catch`, no `setError`, and no path to surface failure back to `StepYhteystiedot`.

**Fix:** Type `onNext` as `() => Promise<void>` and `await onNext()` in `handleNext`, OR move the submit POST inside `StepYhteystiedot.handleNext` itself (after save-step succeeds) with proper error state. Add error handling in `handleYhteystiedotSubmit` that sets a local error state or throws.

---

### 6 — MEDIUM · app/business/WizardInner.tsx line 228

**`handleYhteystiedotSubmit` returns silently on non-OK response — user has no feedback on submit failure**

When `/api/business/onboarding/submit` returns a non-2xx status, `handleYhteystiedotSubmit` falls through the `if (res.ok)` guard and returns. Since `loading` is already cleared (see finding 5), the user sees the button re-enable with no error message and no navigation — no indication that submission failed.

**Fix:** Add an error state or callback to surface submit failures. At minimum: `else { console.error('Submit failed', res.status) }` as a stopgap; properly: propagate an error back to StepYhteystiedot's error display.

---

### 7 — LOW · app/business/onboarding/page.tsx line 186

**`aiTriggered` state is set but never read — double-trigger guard is dead code**

`handleNimiUrlNext` sets `setAiTriggered(true)` after firing the AI request, but `aiTriggered` is never checked at the entry of `handleNimiUrlNext`. A Back+Next cycle (sijainti → nimi-url → Next again) fires a second `analyze-website` request with no deduplication.

**Fix:** Either check `if (aiTriggered) return` at the top of the AI-trigger block, or remove `aiTriggered` entirely and accept that re-triggering is acceptable (the route is idempotent per session).

---

## Run to fix

```
/gsd-code-review 61 --fix
```
