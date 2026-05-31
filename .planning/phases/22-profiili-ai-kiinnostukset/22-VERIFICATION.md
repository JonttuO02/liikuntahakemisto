---
phase: 22-profiili-ai-kiinnostukset
verified: 2026-05-31T12:00:00Z
status: human_needed
score: 8/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Verify AI recommendation includes sport interests when set"
    expected: "POST body to /api/saasuositus contains kiinnostukset array; AI response text reflects user interests"
    why_human: "Claude API credits were exhausted during execution; live AI call could not be tested. Code path is wired but functional output requires a live API call to confirm."
  - test: "Verify no regression for users without interests"
    expected: "AI widget loads normally for unauthenticated users or users with no interests; no JS errors related to kiinnostukset"
    why_human: "Same reason as above — requires live API credits to exercise the AI response path."
---

# Phase 22: Profiili & AI-kiinnostukset Verification Report

**Phase Goal:** Users can declare sport interests on their profile and receive AI recommendations that reflect those interests
**Verified:** 2026-05-31
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The profiles table accepts a kiinnostukset text[] column | VERIFIED | `supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql` line 6: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kiinnostukset text[] DEFAULT '{}';` — idempotent, no RLS changes. Applied to live DB via SQL Editor per Plan 04 SUMMARY. |
| 2 | buildKiinnostuksetKonteksti returns '' for empty/null input | VERIFIED | `lib/buildKiinnostuksetKonteksti.ts` line 16: `if (!kiinnostukset \|\| kiinnostukset.length === 0) return ''` |
| 3 | buildKiinnostuksetKonteksti returns a Finnish sentence listing interests for non-empty array | VERIFIED | `lib/buildKiinnostuksetKonteksti.ts` line 17: returns `` ` Käyttäjä on kiinnostunut lajeista: ${kiinnostukset.join(', ')}.` `` — leading space, comma-separated, period at end |
| 4 | A logged-in user sees a 'Kiinnostuksen kohteet' card on /profiili below the kotikaupunki card | VERIFIED | `app/profiili/ProfiiliClient.tsx` lines 147–174: `.glass rounded-2xl p-4 flex flex-col gap-3 mt-4` card with label "Kiinnostuksen kohteet" at line 149, placed after the kotikaupunki card closing tag at line 146 |
| 5 | All 9 sport pills from lib/lajit.ts are shown in flex-wrap layout | VERIFIED | `ProfiiliClient.tsx` line 152: `Object.entries(lajiKonfig).map(([key, konfig]) => ...)` inside `<div className="flex flex-wrap gap-2">`. No sport accent colors used — pills use only `bg-[#111111]` / `border border-[rgba(0,0,0,0.12)]` per D-01 |
| 6 | Tapping a pill toggles its selected state; tapping Tallenna saves to Supabase and shows inline feedback | VERIFIED | `toggleKiinnostus` at line 67-69: adds/removes key. `handleSaveKiinnostukset` at lines 71-84: upserts `{ user_id, kiinnostukset, updated_at }` with `onConflict: 'user_id'`; sets `savedKiinnostukset` true for 2500ms. Line 173: `{savedKiinnostukset && <p className="text-sm text-green-700">Kiinnostukset tallennettu</p>}` |
| 7 | On next load, previously saved interests are pre-selected | VERIFIED | `ProfiiliClient.tsx` line 28: `loadProfile` queries `.select('kotikaupunki, kiinnostukset')`; line 33: `setKiinnostukset(data?.kiinnostukset ?? [])` on mount |
| 8 | Etusivu.tsx loads kiinnostukset from profiles and sends them in POST body | VERIFIED | `Etusivu.tsx` line 173: `useState<string[]>([])` for kiinnostukset state. Line 357: `supabase.from('profiles').select('kotikaupunki, kiinnostukset')`. Line 359: `setKiinnostukset(profileData?.kiinnostukset ?? [])`. Line 363: `setKiinnostukset([])` in logged-out else branch. Line 402: POST body includes `kiinnostukset` field unconditionally. Line 416: deps array is `[suosikitSizeAndIds, weatherKaupunki, kotikaupunki]` — kiinnostukset intentionally excluded per D-13. |
| 9 | The route handler sanitizes body.kiinnostukset and appends buildKiinnostuksetKonteksti output to the prompt | VERIFIED | `route.ts` line 5: `import { buildKiinnostuksetKonteksti }`. Line 87: `let kiinnostukset: string[] = []`. Lines 105-110: `Array.isArray(body.kiinnostukset)` guard, `.slice(0, 10)`, `.filter(string check)`, `.map(allowlist regex + .slice(0, 80))`. Line 121: `const kiinnostuksetKonteksti = buildKiinnostuksetKonteksti(kiinnostukset)`. Line 123: prompt ends with `${reissuKonteksti}${kiinnostuksetKonteksti}` |

**Score:** 9/9 truths verified in code. 2 of 3 ROADMAP success criteria fully verifiable programmatically; SC-2 and SC-3 require human verification (live AI call).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql` | ADD COLUMN IF NOT EXISTS kiinnostukset text[] | VERIFIED | File exists, exact DDL present, no RLS changes |
| `lib/buildKiinnostuksetKonteksti.ts` | AI prompt context builder, exports buildKiinnostuksetKonteksti | VERIFIED | File exists, correct signature `(kiinnostukset: string[] \| undefined \| null): string`, correct behavior |
| `app/profiili/ProfiiliClient.tsx` | Kiinnostukset card UI, handleSaveKiinnostukset, loadProfile extension | VERIFIED | All three elements present and substantive |
| `app/components/Etusivu.tsx` | kiinnostukset state + profiles query extension + POST body field | VERIFIED | All three changes present |
| `app/api/saasuositus/route.ts` | kiinnostukset sanitization + prompt extension | VERIFIED | Import, sanitization, and prompt append all present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/buildKiinnostuksetKonteksti.ts` | `app/api/saasuositus/route.ts` | named import | WIRED | `route.ts` line 5: `import { buildKiinnostuksetKonteksti } from '@/lib/buildKiinnostuksetKonteksti'`; called at line 121 |
| `app/profiili/ProfiiliClient.tsx` | Supabase profiles table | upsert with onConflict: user_id | WIRED | `handleSaveKiinnostukset` at lines 74-79: `.from('profiles').upsert({ user_id: userId, kiinnostukset, updated_at }, { onConflict: 'user_id' })` |
| `app/components/Etusivu.tsx` | `app/api/saasuositus/route.ts` | POST body.kiinnostukset | WIRED | Line 402: `JSON.stringify({ suosikit: todoNimet, kaupunki: weatherKaupunki, ...(kotikaupunki ? { kotikaupunki } : {}), kiinnostukset })` |
| `app/api/saasuositus/route.ts` | `lib/buildKiinnostuksetKonteksti.ts` | named import | WIRED | Confirmed above |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `ProfiiliClient.tsx` | `kiinnostukset: string[]` | Supabase `profiles` table `.select('kotikaupunki, kiinnostukset')` | Yes — DB query, fallback to `[]` | FLOWING |
| `Etusivu.tsx` | `kiinnostukset: string[]` | Supabase `profiles` table `.select('kotikaupunki, kiinnostukset')` in `subscribeToAuthUser` | Yes — DB query, fallback to `[]` | FLOWING |
| `route.ts` prompt | `kiinnostuksetKonteksti` | `buildKiinnostuksetKonteksti(kiinnostukset)` from sanitized POST body | Yes — live user-provided array processed at runtime | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for AI endpoint — requires live Anthropic API credits. TypeScript compilation is the appropriate proxy check here.

The following code-level checks were performed:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Migration file has correct DDL | grep `ADD COLUMN IF NOT EXISTS kiinnostukset` | 1 match | PASS |
| Migration has no RLS changes | grep `CREATE POLICY` | 0 matches | PASS |
| buildKiinnostuksetKonteksti empty guard | code review line 16 | `!kiinnostukset \|\| kiinnostukset.length === 0` | PASS |
| buildKiinnostuksetKonteksti non-empty output | code review line 17 | leading-space Finnish sentence | PASS |
| ProfiiliClient has kiinnostukset state | grep `useState<string[]>([])` | line 19 | PASS |
| ProfiiliClient loadProfile extended | grep `.select('kotikaupunki, kiinnostukset')` | line 28 | PASS |
| ProfiiliClient has 9 pills from lajiKonfig | `Object.entries(lajiKonfig)` in JSX | line 152 | PASS |
| ProfiiliClient upsert carries kiinnostukset | code review lines 71-84 | `{ user_id: userId, kiinnostukset, updated_at }` | PASS |
| Etusivu deps array excludes kiinnostukset | grep deps array | line 416: `[suosikitSizeAndIds, weatherKaupunki, kotikaupunki]` | PASS (D-13 compliant) |
| route.ts import added | grep `buildKiinnostuksetKonteksti` | line 5 | PASS |
| route.ts sanitizes kiinnostukset | code review lines 105-110 | `Array.isArray` guard + slice/filter/map | PASS |
| route.ts prompt append | code review line 123 | `${reissuKonteksti}${kiinnostuksetKonteksti}` | PASS |
| No sport accent colors on pills | grep `accentBg\|badgeTw` | 0 matches | PASS |

### Probe Execution

No probes declared. `supabase db push` was not runnable in the execution environment; migration was applied manually via SQL Editor. The column existence was confirmed by SC-1 passing in human UAT (interests saved and persisted on /profiili).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PROFILE-01 | 22-01, 22-02, 22-04 | Logged-in user can add sport interests as multi-select from lib/lajit.ts; selections saved to Supabase | SATISFIED | Migration file adds column; ProfiiliClient UI with 9 pills, upsert, and state restore all present and wired |
| PROFILE-02 | 22-01, 22-03, 22-04 | AI recommendation reflects user interests when present | SATISFIED (code) / NEEDS HUMAN (live output) | route.ts sanitizes and injects via buildKiinnostuksetKonteksti; Etusivu sends POST body. Live AI output verification deferred — API credits exhausted |

All requirements claimed by phase 22 plans are accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ProfiiliClient.tsx` | 136 | `placeholder="esim. Tampere"` | Info | HTML input placeholder attribute — not a stub, not a debt marker. Pre-existing on the kotikaupunki field. |
| `Etusivu.tsx` | 995, 998 | `placeholder="Hae liikuntapaikkaa..."` | Info | HTML input placeholder attribute in search bar — pre-existing, unrelated to phase 22. |

No `TBD`, `FIXME`, or `XXX` markers found in any files modified by this phase. No empty return stubs. No hardcoded empty arrays flowing to renders without a fetch fallback.

**D-13 note (kiinnostukset absent from useEffect deps):** The `// eslint-disable-next-line react-hooks/exhaustive-deps` at Etusivu.tsx line 415 covers the intentional exclusion of `kiinnostukset` from the AI fetch deps array. This is working as designed per D-13 (cache key is day-based only). The CR-02 code review flag is acknowledged and overridden by design decision D-13.

### Human Verification Required

#### 1. AI Recommendation Includes Sport Interests (SC-2)

**Test:** With interests selected and saved on /profiili, navigate to /. Clear the `saasuositus-*` sessionStorage key in DevTools (Application → Session Storage) to force a fresh AI call. Reload the page and wait for the AI widget to load. Optional: open the Network tab, filter by "saasuositus", and inspect the POST request body to confirm the `kiinnostukset` array is present.

**Expected:** The AI widget loads with a non-empty recommendation text. The POST body contains `kiinnostukset: ["padel", ...]` (or whichever sports were saved). Ideally the recommendation text references one of the selected sports, but this is not strictly verifiable as AI output is non-deterministic.

**Why human:** The Anthropic Claude API requires live credits. During Plan 04 execution, API credits were exhausted and the widget returned errors. The code path (Etusivu → POST body → route.ts sanitization → buildKiinnostuksetKonteksti → prompt) is fully wired and TypeScript-clean, but functional output requires a live API call.

#### 2. No Regression for Users Without Interests (SC-3)

**Test:** Log out (or use an account with no interests saved). Navigate to /. Confirm the AI widget loads normally. Open the browser console and confirm no JavaScript errors related to `kiinnostukset`.

**Expected:** The AI widget loads a recommendation as before. No console errors. The POST body (if inspecting Network) contains `kiinnostukset: []` (empty array, harmless). `buildKiinnostuksetKonteksti([])` returns `''`, leaving the prompt unchanged from pre-phase behavior.

**Why human:** Same reason as SC-2 — requires live API credits. Additionally, unauthenticated users use the GET path (not POST), which is unmodified. The only regression risk is an unauthenticated user somehow triggering the POST path, which the Etusivu.tsx ternary prevents.

### Gaps Summary

No code gaps found. All 9 observable truths are verified in the codebase:
- Migration file exists with correct idempotent DDL
- lib helper has correct signature and behavior
- ProfiiliClient UI is complete with pills, toggle, upsert, and state restore
- Etusivu data flow is wired end-to-end (profiles query → state → POST body)
- route.ts sanitizes and injects kiinnostukset into the AI prompt

The `human_needed` status is due solely to SC-2 and SC-3 requiring a live Anthropic API call that was unavailable during execution. The underlying data flow code is complete and correct.

---

_Verified: 2026-05-31_
_Verifier: Claude (gsd-verifier)_
