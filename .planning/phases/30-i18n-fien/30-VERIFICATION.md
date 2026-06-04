---
phase: 30-i18n-fien
verified: 2026-06-04T23:05:00Z
status: gaps_found
score: 6/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "All UI texts translated in all components — I18N-03"
    status: failed
    reason: "Multiple user-visible Finnish strings remain hardcoded in modified components, visible to EN locale users"
    artifacts:
      - path: "app/components/Etusivu.tsx"
        issue: "Line 278: 'vain jäsenyys' hardcoded in CalloutCard sub-component (not the PaikkaKortti/DiagonaalKortti translated paths). Line 1262: 'Tallennetaan...' and 'Jätä arvostelu' in inline review overlay — surrounding labels use tTodo() but these two are bare Finnish strings."
      - path: "app/components/AuthModal.tsx"
        issue: "Line 274: loading state labels 'Kirjaudutaan...' and 'Luodaan tiliä...' are hardcoded Finnish — EN users see Finnish while auth request is in flight. Lines 284-303: mode-toggle paragraph ('Ei tiliä?', 'Luo tili', 'Onko sinulla jo tili?', 'Kirjaudu') are fully hardcoded Finnish."
      - path: "app/paikat/[id]/page.tsx"
        issue: "Lines 91-96: 'Sijainti' label and 'Näytä kartalla →' link text are hardcoded Finnish. All other Row labels on this page use t() calls but this location Row was not converted."
      - path: "app/components/DiagonaalKortti.tsx"
        issue: "Line 205: aria-label='Näytä kartalla' is hardcoded Finnish. Component already uses useTranslations('PaikkaKortti') but this aria-label was missed."
    missing:
      - "Add Todo.saving and Todo.submitReview keys to fi.json/en.json; use tTodo() in Etusivu.tsx:1262"
      - "Add useTranslations('PaikkaKortti') hook to CalloutCard sub-function in Etusivu.tsx; use t('membershipOnly') at line 278"
      - "Add Auth.signingIn, Auth.creatingAccount, Auth.noAccount, Auth.createAccount, Auth.alreadyHaveAccount, Auth.signInLink keys; use t() at AuthModal.tsx:274 and 284-303"
      - "Add PaikkaPage.location and PaikkaPage.showOnMap keys to fi.json/en.json; use t() at paikat/[id]/page.tsx:91,96"
      - "Add PaikkaKortti.showOnMap key to fi.json/en.json; use t('showOnMap') at DiagonaalKortti.tsx:205"
  - truth: "npx tsc --noEmit passes with zero errors across all modified files"
    status: failed
    reason: "tsc --noEmit exits 0 — this truth passes. However AuthModal.tsx has an operator precedence bug (CR-01 from REVIEW.md) in mapError() that silently misclassifies errors. This is a logic correctness issue, not a TS error, but it is in a Phase 30 modified file."
    artifacts:
      - path: "app/components/AuthModal.tsx"
        issue: "Line 27: `message.includes('Password should be at least') || message.includes('password') && message.includes('6')` — && binds tighter than ||, so the second sub-expression matches any error message containing both 'password' and '6'. Intent is (A || B) && C. The tsc gate passes because this is a logical error, not a type error."
    missing:
      - "Fix operator precedence: wrap OR sub-expressions in parentheses — (message.includes('Password should be at least') || message.includes('password')) && message.includes('6')"
human_verification:
  - test: "FI to EN full visual sweep — AuthModal loading state"
    expected: "Click Sign in, type email+password, click submit — loading button should read 'Signing in...' in EN locale, not 'Kirjaudutaan...'"
    why_human: "Loading state is transient (replaces button text during async operation) — cannot verify by grep alone"
  - test: "paikat/[id]/page.tsx location row in EN locale"
    expected: "Navigate to any venue detail page in EN locale — the location row label should read 'Location' and the map link 'Show on map', not Finnish 'Sijainti'/'Näytä kartalla'"
    why_human: "Requires live server with EN cookie set to observe the rendered output"
  - test: "Etusivu CalloutCard membershipOnly label in EN locale"
    expected: "On the map, the callout card for a venue with membershipOnly=true should show 'membership only' in EN locale, not 'vain jäsenyys'"
    why_human: "CalloutCard is only shown when a venue is selected on the map — requires specific data condition"
---

# Phase 30: i18n FI/EN Verification Report

**Phase Goal:** next-intl i18n FI/EN — all UI texts translated, language toggle on /profiili, NEXT_LOCALE cookie persistence
**Verified:** 2026-06-04T23:05:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

The phase goal has three components: (1) next-intl infrastructure wiring, (2) language toggle on /profiili with cookie persistence, and (3) all UI texts translated. Components (1) and (2) are fully verified. Component (3) is partially complete — 8 of the 9 modified components are substantially translated but 4 components retain hardcoded Finnish strings visible in EN locale.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | next-intl installed and resolvable | VERIFIED | package.json: "next-intl": "^4.13.0"; npm ls resolves 4.13.0 |
| 2 | resolveLocale('en') = 'en', resolveLocale(undefined) = 'fi', resolveLocale('de') = 'fi' | VERIFIED | lib/i18nUtils.test.ts: 6 tests pass (confirmed by npx vitest run) |
| 3 | i18n/request.ts reads NEXT_LOCALE cookie and returns locale + messages | VERIFIED | i18n/request.ts:9-17 — cookies().get('NEXT_LOCALE'), resolveLocale(raw), dynamic import ../messages/${locale}.json |
| 4 | NextIntlClientProvider wraps app/layout.tsx children | VERIFIED | app/layout.tsx:28-30 — async RootLayout, getLocale(), html lang={locale}, NextIntlClientProvider wraps main |
| 5 | changeLocaleAction writes NEXT_LOCALE cookie with path=/ maxAge=1 year | VERIFIED | app/actions/locale.ts:4-9 — 'use server', cookies().set with path:'/', maxAge: 31536000 |
| 6 | next.config.mjs wraps withSerwist with withNextIntl (outermost) | VERIFIED | next.config.mjs:19 — export default withNextIntl(withSerwist({...})) |
| 7 | Language toggle on /profiili: calls changeLocaleAction + router.refresh(), disabled during pending | VERIFIED | ProfiiliClient.tsx:102-108, 205-212 — toggle() with startTransition + await changeLocaleAction(next) + router.refresh(); disabled={isPending} |
| 8 | All UI texts translated in all components (I18N-03) | FAILED | Hardcoded Finnish strings remain in 4 components — see Gaps |
| 9 | tsc --noEmit exits 0 | VERIFIED | npx tsc --noEmit exits 0; no Phase 30 file errors |

**Score:** 7/9 truths verified (truth #8 failed; truth #9 technically passes but has a logic bug in a Phase 30 file)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/i18nUtils.ts` | resolveLocale + Locale export | VERIFIED | Exports resolveLocale and Locale type; SUPPORTED_LOCALES whitelist |
| `lib/i18nUtils.test.ts` | 6 unit tests | VERIFIED | 6 tests pass (vitest run confirmed) |
| `messages/fi.json` | 11 namespaces | VERIFIED | Nav, PaikkaKortti, PaikkaSheet, Filters, Todo, Profiili, Auth, Map, PaikkaPage, NotFound, Days |
| `messages/en.json` | 11 namespaces parallel | VERIFIED | Parallel structure confirmed; all keys present |
| `i18n/request.ts` | getRequestConfig reading NEXT_LOCALE | VERIFIED | Imports resolveLocale; reads cookie; dynamic import |
| `global.d.ts` | AppConfig augmentation | VERIFIED | Imports fi.json; declares Locale and Messages types |
| `app/actions/locale.ts` | changeLocaleAction server action | VERIFIED | 'use server'; maxAge 31536000; path '/' |
| `app/layout.tsx` | NextIntlClientProvider wrapping | VERIFIED | async RootLayout; getLocale(); lang={locale} |
| `app/components/NavPill.tsx` | useTranslations('Nav') | VERIFIED | Line 19: useTranslations('Nav'); t('profile'), t('signIn'), t('signOut'), t('openMenu'), t('closeMenu') |
| `app/components/Etusivu.tsx` | useTranslations present; sentinel preserved | PARTIAL | useTranslations imported (lines 64, 350, 571-573); useState('Kaikki') confirmed at line 601; searchKaupunki === 'Kaikki' at line 1023. BUT: 'vain jäsenyys' hardcoded at line 278 (CalloutCard), 'Tallennetaan...'/'Jätä arvostelu' hardcoded at line 1262 |
| `app/components/PaikkaKortti.tsx` | useTranslations('PaikkaKortti') | VERIFIED | Line 35; all 11 keys translated |
| `app/components/DiagonaalKortti.tsx` | useTranslations('PaikkaKortti') | PARTIAL | Line 37: useTranslations('PaikkaKortti'); most strings translated. BUT: aria-label="Näytä kartalla" hardcoded at line 205 |
| `app/profiili/ProfiiliClient.tsx` | useTranslations + useLocale + changeLocaleAction | VERIFIED | Lines 27-30; all 13+ strings replaced; toggle() function wired correctly |
| `app/components/PaikkaSheet.tsx` | useTranslations('PaikkaSheet') | VERIFIED | Lines 25-26; all section headings, open/closed, review count singular/plural |
| `app/components/AuthModal.tsx` | useTranslations('Auth') | PARTIAL | Line 34: useTranslations('Auth'); modal title, close, Google, divider, placeholders translated. BUT: loading-state labels ('Kirjaudutaan...', 'Luodaan tiliä...') and mode-toggle paragraph hardcoded Finnish (lines 274, 284-303) |
| `app/paikat/[id]/page.tsx` | getTranslations('PaikkaPage') | PARTIAL | Line 38: await getTranslations('PaikkaPage'); backToDirectory, hours, phone, price, bookNow, description translated. BUT: 'Sijainti' label and 'Näytä kartalla →' link at lines 91/96 not translated |
| `app/not-found.tsx` | async + getTranslations('NotFound') | VERIFIED | async function; 3 strings (title, description, backHome) all translated |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| i18n/request.ts | messages/${locale}.json | dynamic import | WIRED | Line 16: `(await import('../messages/${locale}.json')).default` — resolveLocale ensures only 'fi' or 'en' reach this path |
| app/actions/locale.ts | NEXT_LOCALE cookie | cookies().set | WIRED | Line 6: store.set('NEXT_LOCALE', locale, {...}) |
| app/layout.tsx | next-intl | NextIntlClientProvider | WIRED | Line 28: `<NextIntlClientProvider>` wraps main |
| ProfiiliClient.tsx | app/actions/locale.ts | import changeLocaleAction | WIRED | Line 11: import changeLocaleAction from '@/app/actions/locale' |
| ProfiiliClient LanguageToggle | NEXT_LOCALE cookie | changeLocaleAction + router.refresh() | WIRED | Lines 104-107: await changeLocaleAction(next); router.refresh() |
| Etusivu.tsx | searchKaupunki state | sentinel 'Kaikki' unchanged | WIRED | Line 601: useState('Kaikki') preserved; line 1023: comparison preserved |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| ProfiiliClient.tsx | locale | useLocale() | next-intl provider context (set from NEXT_LOCALE cookie via i18n/request.ts) | FLOWING |
| NavPill.tsx | t() calls | useTranslations('Nav') | messages/{locale}.json Nav namespace via NextIntlClientProvider | FLOWING |
| PaikkaKortti.tsx | t() calls | useTranslations('PaikkaKortti') | messages/{locale}.json PaikkaKortti namespace | FLOWING |
| PaikkaSheet.tsx | t() / tKortti() calls | useTranslations('PaikkaSheet') + useTranslations('PaikkaKortti') | messages/{locale}.json, both namespaces | FLOWING |
| app/paikat/[id]/page.tsx | t() calls | getTranslations('PaikkaPage') | server-side via i18n/request.ts, locale from NEXT_LOCALE cookie | FLOWING |
| app/not-found.tsx | t() calls | getTranslations('NotFound') | server-side via i18n/request.ts | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| resolveLocale unit tests | npx vitest run lib/i18nUtils.test.ts --reporter=verbose | 6/6 tests pass | PASS |
| Full test suite (77 tests) | npx vitest run | 8 files, 77 tests pass | PASS |
| TypeScript compilation gate | npx tsc --noEmit | Exit code 0, zero errors | PASS |
| next-intl package installed | grep next-intl package.json | "next-intl": "^4.13.0" | PASS |

### Probe Execution

Step 7c: SKIPPED — no probe scripts present in scripts/*/tests/probe-*.sh; phase has no declared probes.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| I18N-01 | 30-03 | Language toggle on /profiili | SATISFIED | ProfiiliClient.tsx has Kieli glass card with toggle button; locale = useLocale(); changeLocaleAction on click |
| I18N-02 | 30-01, 30-03 | NEXT_LOCALE cookie persists across page loads | SATISFIED | changeLocaleAction sets httpOnly-less cookie (warning: no httpOnly); i18n/request.ts reads it on every server request; human checkpoint confirmed persistence |
| I18N-03 | 30-02, 30-04 | All UI texts in selected locale; map/filter state preserved | PARTIAL | 5 of 9 component areas fully translated; 4 retain hardcoded Finnish visible in EN locale. Map/filter state preservation is a known accepted limitation (user explicitly accepted checks 10-13 per task instructions). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| app/components/AuthModal.tsx | 27 | Operator precedence bug: `A \|\| B && C` (should be `(A \|\| B) && C`) | WARNING | Incorrect error classification — unrelated errors may be displayed as "password too short" in Finnish |
| app/components/AuthModal.tsx | 274 | 'Kirjaudutaan...' / 'Luodaan tiliä...' — hardcoded Finnish | BLOCKER | EN users see Finnish during auth loading state |
| app/components/AuthModal.tsx | 284-303 | Mode-toggle paragraph ('Ei tiliä?', 'Luo tili', etc.) — hardcoded Finnish | BLOCKER | EN users see Finnish for account creation/login toggle |
| app/components/Etusivu.tsx | 278 | 'vain jäsenyys' in CalloutCard — hardcoded Finnish | BLOCKER | EN users see Finnish in map callout card for membership-only venues |
| app/components/Etusivu.tsx | 1262 | 'Tallennetaan...' / 'Jätä arvostelu' — hardcoded Finnish in inline review | BLOCKER | EN users see Finnish in todo review submission button |
| app/paikat/[id]/page.tsx | 91, 96 | 'Sijainti' label and 'Näytä kartalla →' — hardcoded Finnish | BLOCKER | EN users see Finnish location row on venue detail page |
| app/components/DiagonaalKortti.tsx | 205 | aria-label="Näytä kartalla" — hardcoded Finnish | WARNING | EN users get Finnish screen-reader label on map-pin button |
| app/components/PaikkaSheet.tsx | 99-104 | Close button has no aria-label — t('close') key exists but not applied | WARNING | Screen-reader users cannot identify the close button |
| messages/fi.json + en.json | 30/31 | Orphan key 'reviewCount' in PaikkaSheet namespace — never referenced in any component | INFO | Dead key; bundle inflation; maintenance confusion |
| app/not-found.tsx | 18 | font-semibold violates CLAUDE.md typography convention (2 weights only: 400/700) | INFO | Design consistency issue; should be font-bold |

### Human Verification Required

#### 1. AuthModal loading state text in EN locale

**Test:** Set NEXT_LOCALE=en (via /profiili toggle), then open AuthModal, enter credentials, and click submit
**Expected:** Loading button reads "Signing in..." in EN locale (not "Kirjaudutaan...")
**Why human:** Loading state is a transient async transition; cannot be verified by static analysis

#### 2. paikat/[id]/page.tsx location row in EN locale

**Test:** With NEXT_LOCALE=en, navigate to /paikat/[any valid id]
**Expected:** Location row label reads "Location" and the map link reads "Show on map", not Finnish text
**Why human:** Requires live server with active EN cookie and a real venue ID

#### 3. Etusivu CalloutCard membershipOnly in EN locale

**Test:** With NEXT_LOCALE=en, select a venue on the map that has membershipOnly=true
**Expected:** Callout card shows "membership only" (English), not "vain jäsenyys"
**Why human:** Requires specific data condition (membershipOnly venue) and map interaction

### Gaps Summary

The phase successfully delivers the i18n infrastructure (Plan 30-01), the language toggle on /profiili with cookie persistence (Plans 30-02, 30-03), and TypeScript-clean translation wiring across most components. All tests pass. The tsc gate is clean.

The phase goal "all UI texts translated" is not fully achieved. Four components retain hardcoded Finnish strings that EN users will encounter:

1. **AuthModal.tsx** — loading state strings and mode-toggle paragraph (6 untranslated strings). This is the most visible gap: EN users see Finnish while authentication is in progress and when toggling between sign-in/create-account modes.

2. **Etusivu.tsx** — CalloutCard sub-component missed `vain jäsenyys` (the PaikkaKortti/DiagonaalKortti paths were correctly translated but CalloutCard was not), and the inline review button in the TODO overlay has 2 untranslated Finnish strings.

3. **paikat/[id]/page.tsx** — The location Row (label="Sijainti" and link text "Näytä kartalla →") was not converted. All 6 other Row labels on the same page were translated.

4. **DiagonaalKortti.tsx** — aria-label="Näytä kartalla" was not converted. The component already has useTranslations wired; only this one aria-label was missed.

All gaps require adding translation keys to messages/fi.json and messages/en.json and replacing the hardcoded literals with t() calls. The root cause is that several sub-functions and conditional branches within components were not fully scanned during the translation pass.

---

_Verified: 2026-06-04T23:05:00Z_
_Verifier: Claude (gsd-verifier)_
