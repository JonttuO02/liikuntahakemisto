---
phase: 34-onboarding-velhou
verified: 2026-06-10T12:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 9/13
  gaps_closed:
    - "6-step wizard at /business/onboarding — step 2 (media upload) is accessible to users (CR-05 closed: OnboardingWizardInner.tsx line 148 now renders StepMediat)"
    - "POST /api/business/onboarding/save-step verifies authenticated user owns the paikka_id before accepting draft data (CR-01 closed: business_paikka_links ownership check at lines 86-95)"
    - "Step 6 preview renders PaikkaSheet per ONBOARD-07 requirement (closed: StepEsikatselu.tsx imports and renders PaikkaSheet with preview={true})"
    - "StepMediat.businessAccountId derives from session, not from an unvalidated prop (CR-02 closed: StepMediat no longer accepts businessAccountId in props; derives userId from session.user.id internally)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open Supabase dashboard; navigate to Table Editor and confirm onboarding_draft table exists with all 9 columns; navigate to Authentication -> Policies and confirm 4 RLS policies on onboarding_draft; confirm business_accounts.onboarding_completed column exists."
    expected: "All schema elements present and active."
    why_human: "Cannot verify live Supabase schema from static file inspection."
  - test: "Log in as a business user who has completed Phase 33 claim/create flow. Visit /business/onboarding. Complete all 6 steps including the media upload step (step 2). On step 6, verify PaikkaKortti, DiagonaalKortti, and PaikkaSheet all render with the entered data. Click 'Laheta hyvaksyttavaksi'."
    expected: "Wizard progresses through all 6 steps including media upload. Step 6 shows all three preview components with entered data. Submit redirects to /business. Supabase: onboarding_draft row deleted; business_accounts.onboarding_completed = true; liikuntapaikat updated with uploaded image URL."
    why_human: "Requires live Supabase instance with authenticated business user and Storage bucket."
  - test: "Complete Phase 33 claim or create flow as a new business user."
    expected: "On success, browser navigates to /business/onboarding (not a page reload)."
    why_human: "Requires full auth flow in a running browser."
---

# Phase 34: Onboarding Wizard Verification Report

**Phase Goal:** Build the onboarding wizard for business users — a 6-step wizard at /business/onboarding that guides a business owner through venue info, media upload, pricing, opening hours, contact info, and a preview before submitting to create/update their listing.
**Verified:** 2026-06-10T12:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (previous status: gaps_found, 9/13)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Wizard route exists at /business/onboarding with Suspense wrapper | VERIFIED | app/business/onboarding/page.tsx exists; no 'use client'; wraps OnboardingWizardInner in Suspense |
| 2 | ProgressBar shows 6 steps, highlights current step, marks completed steps with checkmark | VERIFIED | ProgressBar.tsx: 6 stepLabels, completed/current/future state classes, Check icon, aria-current="step" |
| 3 | Wizard loads existing onboarding_draft on mount and resumes from current_step | VERIFIED | OnboardingWizardInner.tsx: loadDraft useEffect loads draft via supabase, calls goToStep(draft.current_step) when step=1 |
| 4 | Step 1 (StepPaikka) displays venue name and address from business_paikka_links | VERIFIED | StepPaikka.tsx: renders paikkaInfo.nimi + osoite/kaupunki; OnboardingWizardInner resolves paikka_id from URL param or business_paikka_links query |
| 5 | Step 2 (StepMediat) media upload is accessible to users in the wizard | VERIFIED | OnboardingWizardInner.tsx line 148-154: `{step === 2 && paikkaId !== null && <StepMediat paikkaId={paikkaId} onNext={() => saveAndAdvance(2)} onPrev={() => goToStep(1)} />}`. CR-05 closed. |
| 6 | Step 3 (StepHinnasto) pricing table with at least-one-price validation gate | VERIFIED | StepHinnasto.tsx: 4 fixed rows + dynamic rows; hasAnyPrice gate disables Seuraava; save-step call with field='hinnasto' |
| 7 | Step 4 (StepAukioloajat) stores data with English day keys; pre-fills from paikkaInfo | VERIFIED | StepAukioloajat.tsx: ORDERED_DAYS whitelist enforced; useEffect pre-fills from existingAukioloajat; saves with English keys |
| 8 | Step 5 (StepYhteystiedot) collects contact info; description 300-char limit enforced | VERIFIED | StepYhteystiedot.tsx: maxLength={300}; char counter turns text-red-600 at limit; aria-describedby wired |
| 9 | Step 6 (StepEsikatselu) renders PaikkaKortti and DiagonaalKortti with draft data | VERIFIED | StepEsikatselu.tsx: buildDraftAsPaikka constructs preview; PaikkaKortti + DiagonaalKortti rendered with draftAsPaikka prop |
| 10 | Step 6 (StepEsikatselu) renders PaikkaSheet per ONBOARD-07 requirement | VERIFIED | StepEsikatselu.tsx line 108: `<PaikkaSheet paikka={draftAsPaikka} preview={true} todo={false} onClose={() => {}} onToggleTodo={() => {}} />`. PaikkaSheet.tsx has preview prop (line 22) that switches position:fixed to position:relative with height 600px. CR closed. |
| 11 | Submit button POSTs to /api/business/onboarding/submit and redirects to /business | VERIFIED | StepEsikatselu.tsx: POST to /api/business/onboarding/submit with JWT; on data.ok: router.push('/business') |
| 12 | save-step route verifies JWT and uses user.id from token (not body) for business_account_id | VERIFIED | save-step/route.ts: supabaseAdmin.auth.getUser(token); UPSERT uses user.id; comment confirms intent |
| 13 | save-step route verifies user owns paikka_id before accepting draft data | VERIFIED | save-step/route.ts lines 86-95: business_paikka_links ownership check via .maybeSingle(); returns 403 if no link row found. CR-01 closed. |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/onboardingUtils.ts` | Pure functions buildDraftAsPaikka, hinnastaToHintaKuvaus, FI_TO_EN, ORDERED_DAYS | VERIFIED | All 4 exports present; no Supabase imports |
| `lib/onboardingUtils.test.ts` | 21 unit tests covering ONBOARD-04 through ONBOARD-07 | VERIFIED | 21 tests; describe blocks for hinnastaToHintaKuvaus, buildDraftAsPaikka, FI_TO_EN, maxLength |
| `vitest.config.ts` | include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts'] | VERIFIED | All 3 globs present |
| `supabase/migrations/20260606000000_onboarding.sql` | onboarding_draft table + onboarding_completed column + 4 RLS policies | VERIFIED | Full DDL with UNIQUE constraint; all 4 RLS policies scoped to auth.uid() = business_account_id |
| `messages/fi.json` | 34 wizard i18n keys under Business namespace | VERIFIED | onboardingTitle, submitCta, errorNoPriceRow, errorSubmitFailed all present |
| `messages/en.json` | 34 wizard i18n keys under Business namespace | VERIFIED | Same key set in English |
| `app/components/ClaimSearchForm.tsx` | router.push to /business/onboarding on claim/create success | VERIFIED | 2x router.push calls; 0x window.location.reload() |
| `app/business/page.tsx` | onboarding_completed gate with router.push to /business/onboarding | VERIFIED | onboarding_completed queried in checkLinks(); redirect when account && !account.onboarding_completed |
| `app/api/business/onboarding/save-step/route.ts` | JWT-verified UPSERT; user.id from token; ownership check on paikka_id | VERIFIED | JWT + UPSERT working; business_paikka_links ownership check at lines 86-95 returns 403 if unauthorized (CR-01 closed) |
| `app/api/business/onboarding/submit/route.ts` | JWT; business_paikka_links ownership; atomic liikuntapaikat update | VERIFIED | All 7 steps present; ownership check at step 2; draft preserved on error |
| `app/business/onboarding/page.tsx` | Suspense wrapper; no 'use client' | VERIFIED | Thin server component; Suspense with spinner fallback |
| `app/business/onboarding/OnboardingWizardInner.tsx` | 6 steps wired; draft load; URL step routing | VERIFIED | All 6 steps wired including StepMediat at step 2 (CR-05 closed) |
| `app/business/onboarding/ProgressBar.tsx` | 6-step progress indicator | VERIFIED | Correct state classes; Check icon; aria-current; step labels |
| `app/business/onboarding/StepPaikka.tsx` | Step 1 read-only venue display | VERIFIED | Renders nimi + osoite/kaupunki; Seuraava button |
| `app/business/onboarding/StepMediat.tsx` | Step 2 media upload — wired and reachable | VERIFIED | Wired at step 2 in OnboardingWizardInner.tsx; derives userId from session internally (CR-02 closed); no businessAccountId prop |
| `app/business/onboarding/UploadDropZone.tsx` | Drag-and-drop file zone | VERIFIED | HTML5 drag events; MIME + size validation; animated thumbnails; accessible |
| `app/business/onboarding/UploadProgressBar.tsx` | CSS progress bar | VERIFIED | pct=0 returns null; CSS transition-[width]; no Framer Motion |
| `app/business/onboarding/StepHinnasto.tsx` | Step 3 pricing table with hasAnyPrice gate | VERIFIED | 4 fixed rows; dynamic rows; hasAnyPrice disables Seuraava |
| `app/business/onboarding/StepAukioloajat.tsx` | Step 4 hours editor with English keys | VERIFIED | ORDERED_DAYS whitelist; role="switch" toggles; Google Places pre-fill |
| `app/business/onboarding/StepYhteystiedot.tsx` | Step 5 contact form; 300-char limit | VERIFIED | maxLength=300; text-red-600 counter; aria-describedby |
| `app/business/onboarding/StepEsikatselu.tsx` | Step 6 preview + submit with PaikkaKortti, DiagonaalKortti, PaikkaSheet | VERIFIED | All three preview components rendered; PaikkaSheet uses preview={true} to escape position:fixed layout (ONBOARD-07 closed) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| ClaimSearchForm.tsx | /business/onboarding | router.push on success | VERIFIED | 2 occurrences confirmed; window.location.reload() absent |
| business/page.tsx | /business/onboarding | onboarding_completed check | VERIFIED | onboarding_completed queried; redirect on !onboarding_completed |
| OnboardingWizardInner.tsx | onboarding_draft | createBrowserSupabase SELECT | VERIFIED | .from('onboarding_draft').select('*').eq('business_account_id', user.id) |
| OnboardingWizardInner.tsx | StepMediat | step === 2 render | VERIFIED | `{step === 2 && paikkaId !== null && <StepMediat ...>}` — CR-05 closed |
| StepHinnasto.tsx | /api/business/onboarding/save-step | fetch with JWT, field='hinnasto' | VERIFIED | fetch with Authorization header; body contains field:'hinnasto' |
| StepAukioloajat.tsx | /api/business/onboarding/save-step | fetch with JWT, field='aukioloajat', English keys | VERIFIED | ORDERED_DAYS whitelist; English keys in save payload |
| StepYhteystiedot.tsx | /api/business/onboarding/save-step | fetch with JWT, field='yhteystiedot' | VERIFIED | JWT in Authorization header; field='yhteystiedot' in body |
| StepEsikatselu.tsx | lib/onboardingUtils.buildDraftAsPaikka | named import | VERIFIED | import present; draftAsPaikka = buildDraftAsPaikka(draft, paikkaInfo) |
| StepEsikatselu.tsx | /api/business/onboarding/submit | fetch with JWT | VERIFIED | POST with Authorization; router.push('/business') on data.ok |
| save-step/route.ts | onboarding_draft | supabaseAdmin UPSERT onConflict | VERIFIED | onConflict: 'business_account_id,paikka_id' |
| save-step/route.ts | business_paikka_links ownership | check before UPSERT | VERIFIED | .maybeSingle() check lines 86-95; 403 if no link found — CR-01 closed |
| submit/route.ts | business_paikka_links | ownership check before liikuntapaikat update | VERIFIED | .from('business_paikka_links').eq('business_account_id', user.id).eq('paikka_id', draft.paikka_id) |
| submit/route.ts | liikuntapaikat | UPDATE after ownership check | VERIFIED | Full field list including business_managed:true |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| StepEsikatselu.tsx | draftAsPaikka | buildDraftAsPaikka(draft, paikkaInfo) | All draft fields now potentially populated: media_urls via step 2 (now wired), hinnasto via step 3, aukioloajat via step 4, yhteystiedot via step 5 | FLOWING |
| OnboardingWizardInner.tsx | draft | supabase.from('onboarding_draft') | Real DB query | FLOWING |
| OnboardingWizardInner.tsx | paikkaInfo | supabase.from('liikuntapaikat') | Real DB query | FLOWING |

### Behavioral Spot-Checks

Step 7b skipped — no runnable server available. Key behaviors verified statically above.

### Probe Execution

Step 7c — no probe scripts defined for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ONBOARD-01 | 34-02, 34-03, 34-05, 34-06 | Automaattinen wizard-kayttoonotto ensimmaisella kirjautumisella | SATISFIED | onboarding_completed gate in business/page.tsx; ClaimSearchForm redirect; wizard page exists |
| ONBOARD-02 | 34-03, 34-06 | Vaihe 1 — Paikka: esitaytetty nimi ja osoite | SATISFIED | StepPaikka renders paikkaInfo from business_paikka_links join |
| ONBOARD-03 | 34-07 | Vaihe 2 — Mediat: 1-5 kuvaa + logo; edistymispalkki | SATISFIED | StepMediat wired at step 2; derives userId from session; UploadDropZone + UploadProgressBar functional; save-step called with field='media_urls' |
| ONBOARD-04 | 34-01, 34-08 | Vaihe 3 — Hinnasto; vahintaan yksi hintarivi pakollinen | SATISFIED | hasAnyPrice gate verified; hinnastaToHintaKuvaus tested; unit tests pass |
| ONBOARD-05 | 34-01, 34-08 | Vaihe 4 — Aukioloajat; Google Places esitayttona | SATISFIED | StepAukioloajat pre-fills from existingAukioloajat; English day keys enforced |
| ONBOARD-06 | 34-09 | Vaihe 5 — Yhteystiedot; kuvaus max 300 merkkia | SATISFIED | maxLength=300; red counter at limit; aria-describedby |
| ONBOARD-07 | 34-09, 34-10 | Vaihe 6 — Esikatselu: PaikkaKortti, DiagonaalKortti, PaikkaSheet | SATISFIED | All three components rendered; PaikkaSheet uses preview={true} prop (lines 59,64,72,73,88,91 of PaikkaSheet.tsx) to override position:fixed with position:relative |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| app/business/onboarding/UploadDropZone.tsx | 106 | URL.createObjectURL in render without revoke | WARNING | Memory leak on every render (CR-04) — not a blocker; does not prevent goal |
| app/api/business/onboarding/submit/route.ts | 20-24 | .single() instead of .maybeSingle() | WARNING | PostgREST throws 406 on empty result instead of clean null/404 (CR-03) — not a blocker |

### Human Verification Required

1. **Supabase schema live check**
   **Test:** Open Supabase dashboard; navigate to Table Editor and confirm onboarding_draft table exists with all 9 columns; navigate to Authentication -> Policies and confirm 4 RLS policies on onboarding_draft; confirm business_accounts.onboarding_completed column exists.
   **Expected:** All schema elements present and active.
   **Why human:** Cannot verify live Supabase schema from static file inspection.

2. **End-to-end wizard flow (all 6 steps)**
   **Test:** Log in as a business user who has completed Phase 33 claim/create flow. Visit /business/onboarding. Complete all 6 steps in order: step 1 (venue info), step 2 (upload at least one photo), step 3 (add at least one price row), step 4 (set opening hours), step 5 (add contact info), then step 6. Verify all three preview components show entered data. Click "Laheta hyvaksyttavaksi".
   **Expected:** Wizard progresses through all 6 steps. Step 2 uploads files to Supabase Storage and saves media_urls to onboarding_draft. Step 6 shows PaikkaKortti, DiagonaalKortti, and PaikkaSheet (in scrollable bounded box) with entered data including the uploaded photo. Submit redirects to /business. Supabase: onboarding_draft row deleted; business_accounts.onboarding_completed = true; liikuntapaikat updated with all fields including image_url from uploaded photo.
   **Why human:** Requires live Supabase instance with authenticated business user and Storage bucket.

3. **ClaimSearchForm redirect (post-claim)**
   **Test:** Complete Phase 33 claim or create flow as a new business user.
   **Expected:** On success, browser navigates to /business/onboarding (not a page reload).
   **Why human:** Requires full auth flow in a running browser.

### Gaps Summary

All four blockers from the initial verification have been resolved:

- **CR-05 (StepMediat dead code):** Closed. `OnboardingWizardInner.tsx` line 148 now renders `<StepMediat paikkaId={paikkaId} onNext={() => saveAndAdvance(2)} onPrev={() => goToStep(1)} />` guarded by `step === 2 && paikkaId !== null`.
- **CR-01 (save-step missing ownership check):** Closed. `save-step/route.ts` lines 86-95 query `business_paikka_links` for the (user.id, paikkaId) pair and return HTTP 403 if no matching row is found, before any UPSERT occurs.
- **ONBOARD-07 (PaikkaSheet absent from preview):** Closed. `StepEsikatselu.tsx` imports and renders `PaikkaSheet` with `preview={true}`. `PaikkaSheet.tsx` added a `preview?: boolean` prop that switches `position: fixed` to `position: relative; height: 600px; overflow: hidden` so the sheet renders inline within the wizard without the full-screen takeover.
- **CR-02 (businessAccountId from prop):** Closed. `StepMediat` no longer accepts a `businessAccountId` prop; the storage path prefix is derived from `session.user.id` at line 60 inside `handleNext`.

No automated blockers remain. Status is `human_needed` pending live end-to-end verification.

---

_Verified: 2026-06-10T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
