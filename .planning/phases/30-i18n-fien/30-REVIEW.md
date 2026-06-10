---
phase: 30-i18n-fien
reviewed: 2026-06-04T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - app/actions/locale.ts
  - app/components/AuthModal.tsx
  - app/components/DiagonaalKortti.tsx
  - app/components/Etusivu.tsx
  - app/components/NavPill.tsx
  - app/components/PaikkaKortti.tsx
  - app/components/PaikkaSheet.tsx
  - app/layout.tsx
  - app/not-found.tsx
  - app/paikat/[id]/page.tsx
  - app/profiili/ProfiiliClient.tsx
  - global.d.ts
  - i18n/request.ts
  - lib/i18nUtils.test.ts
  - lib/i18nUtils.ts
  - messages/en.json
  - messages/fi.json
  - next.config.mjs
  - package.json
findings:
  critical: 2
  warning: 6
  info: 5
  total: 13
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-06-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

This phase wires up next-intl (without-routing mode) to add FI/EN language switching. The security-critical path — cookie value used to construct a dynamic `import()` path — is correctly guarded by `resolveLocale()`, and the whitelist approach in `lib/i18nUtils.ts` is tight. The core i18n plumbing is sound.

The main problem area is **incomplete translation coverage**: several user-visible strings were not moved into message files and remain hardcoded Finnish in components that now claim to be i18n-ready. Two of those cases are BLOCKER because they affect interactive state or produce wrong output regardless of locale. Additionally, the `NEXT_LOCALE` cookie is set without `httpOnly`, meaning client-side JavaScript can read and overwrite it — a minor security gap worth fixing. Several quality issues round out the findings.

---

## Critical Issues

### CR-01: Operator precedence bug in `mapError` — password check silently broken

**File:** `app/components/AuthModal.tsx:27`
**Issue:** The compound condition `message.includes('Password should be at least') || message.includes('password') && message.includes('6')` has the wrong precedence. `&&` binds tighter than `||`, so it parses as `message.includes('Password should be at least') || (message.includes('password') && message.includes('6'))`. The second sub-expression (`includes('password') && includes('6')`) will match any error message that contains both the word "password" and the digit "6" — for example `"Invalid login credentials for user@example.com"` if the email happened to contain a 6, or any generic error string the auth provider emits. The intent is clearly `(A || B) && C`, i.e. both sub-expressions together identify a "too short" password error, but the current form can misclassify unrelated errors as password-length errors, surfacing the wrong message to the user.

**Fix:**
```ts
if (
  (message.includes('Password should be at least') ||
    message.includes('password')) &&
  message.includes('6')
) {
  return 'Salasanan on oltava vähintään 6 merkkiä.'
}
```

---

### CR-02: AuthModal loading state strings are hardcoded Finnish — shown to English users

**File:** `app/components/AuthModal.tsx:274`
**Issue:** The submit button's loading-state labels (`'Kirjaudutaan...'` / `'Luodaan tiliä...'`) are hardcoded Finnish strings, not drawn from the translation files. The same component uses `t('signIn')` / `t('signUp')` for the idle state, so English users will see "Sign in" until they click, then the button text switches to Finnish "Kirjaudutaan..." while the request is in flight. This is a visible regression for EN locale.

Additionally, the mode-toggle paragraph at lines 283–304 (`"Ei tiliä?"`, `"Luo tili"`, `"Onko sinulla jo tili?"`, `"Kirjaudu"`) is fully hardcoded Finnish with no `t()` calls.

**Fix:** Add keys to both message files and use `t()`:
```jsonc
// en.json  (Auth namespace)
"signingIn": "Signing in...",
"creatingAccount": "Creating account...",
"noAccount": "No account?",
"createAccount": "Create account",
"alreadyHaveAccount": "Already have an account?",
"signInLink": "Sign in"
```
```tsx
// AuthModal.tsx line 274
{loading
  ? mode === 'signin' ? t('signingIn') : t('creatingAccount')
  : mode === 'signin' ? t('signIn') : t('signUp')
}
// lines 283-303
{mode === 'signin' ? (
  <>
    {t('noAccount')}{' '}
    <button ... onClick={() => setMode('signup')}>{t('createAccount')}</button>
  </>
) : (
  <>
    {t('alreadyHaveAccount')}{' '}
    <button ... onClick={() => setMode('signin')}>{t('signInLink')}</button>
  </>
)}
```

---

## Warnings

### WR-01: `NEXT_LOCALE` cookie lacks `httpOnly` — readable and writable by JavaScript

**File:** `app/actions/locale.ts:6`
**Issue:** The cookie is set with only `path` and `maxAge`. Without `httpOnly: true`, any client-side script (including injected third-party scripts from ad networks or analytics) can read the locale value via `document.cookie` and overwrite it. While locale is not a secret, a XSS payload on this page could silently switch the user's language. The cookie also lacks `sameSite`, which defaults to browser-dependent behaviour and can allow cross-site requests to carry the cookie.

**Fix:**
```ts
store.set('NEXT_LOCALE', locale, {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  httpOnly: true,
  sameSite: 'lax',
})
```
Note: `httpOnly: true` means `useLocale()` (client-side) won't be able to read the cookie directly. `next-intl` resolves locale server-side in `i18n/request.ts` and passes it to `NextIntlClientProvider`, so `useLocale()` reads from the provider context, not `document.cookie`. The flag is safe to add.

---

### WR-02: `PaikkaSheet` close button has no `aria-label`

**File:** `app/components/PaikkaSheet.tsx:99`
**Issue:** The close button in the sheet renders `<X className="w-4 h-4" />` with no `aria-label` attribute and no surrounding text. Screen-reader users cannot identify this button. The `PaikkaSheet.tsx` messages namespace already includes a `"close"` key (`t('close')`). The bookmark button on the same line correctly uses `tKortti('removeFromTodo')`.

**Fix:**
```tsx
<button
  onClick={onClose}
  aria-label={t('close')}
  className="..."
>
  <X className="w-4 h-4" />
</button>
```

---

### WR-03: `reviewCountSingular` key always returns bare "1 review" — count not embedded

**File:** `app/components/PaikkaSheet.tsx:244`
**Issue:** When `reviews.length === 1` the code calls `t('reviewCountSingular')`, which produces the static string `"1 review"` / `"1 arvostelu"`. This is technically correct for exactly 1 review, but the value is hardcoded into the translation string rather than interpolated — it will be wrong if the message is ever changed (e.g. `"one review"`) and it creates an asymmetry with the plural key. More importantly, the plural branch `t('reviewCountPlural', { count: reviews.length })` will only be reached for 2+ reviews, but the English `en.json` also has a redundant unused `"reviewCount": "{count} reviews"` key (line 31 in `en.json`) that was probably an earlier draft and was never removed.

**Fix:** Remove the orphan `reviewCount` key from both message files. For the singular, passing `count` is still good practice even if the string doesn't interpolate it yet:
```ts
reviews.length === 1
  ? t('reviewCountSingular', { count: 1 })
  : t('reviewCountPlural', { count: reviews.length })
```

---

### WR-04: Hardcoded Finnish strings in `Etusivu.tsx` — CalloutCard and inline-review UI

**File:** `app/components/Etusivu.tsx:278,1262`
**Issue:**
- Line 278 (inside `CalloutCard`): `<span className="...">{`vain jäsenyys`}</span>` — this is a different branch than the `DiagonaalKortti` / `PaikkaKortti` code paths that correctly call `t('membershipOnly')`. CalloutCard is rendered on the map for the nearest venue and is visible to English users.
- Line 1262 (inline review inside TodoOverlay): `{inlineSubmitting ? 'Tallennetaan…' : 'Jätä arvostelu'}` — two Finnish strings that are not translated. The surrounding review labels (`tTodo('ratingLabel')`, etc.) are translated, making this inconsistent.

**Fix for line 278** — `CalloutCard` needs its own `t` call (it is a local component, so either accept `t` as a prop or call `useTranslations('PaikkaKortti')` inside it):
```tsx
// Inside CalloutCard:
const t = useTranslations('PaikkaKortti')
// ...
{membershipOnly ? (
  <span className="...">{t('membershipOnly')}</span>
) : ...}
```

**Fix for line 1262** — add keys to the `Todo` namespace:
```jsonc
// fi.json / en.json  (Todo namespace)
"saving": "Tallennetaan…" / "Saving...",
"submitReview": "Jätä arvostelu" / "Submit review"
```
```tsx
{inlineSubmitting ? t('saving') : t('submitReview')}
```

---

### WR-05: Hardcoded Finnish in `app/paikat/[id]/page.tsx` — location row label

**File:** `app/paikat/[id]/page.tsx:91,96`
**Issue:** The "Sijainti" label (line 91) and the "Näytä kartalla →" link text (line 96) are hardcoded Finnish strings. All other `Row` labels on this page use `t('hours')`, `t('phone')`, etc., but this row was not converted. English users see Finnish text in this section.

**Fix:** Add to the `PaikkaPage` namespace:
```jsonc
// fi.json / en.json
"location": "Sijainti" / "Location",
"showOnMap": "Näytä kartalla →" / "Show on map →"
```
```tsx
<Row icon={...} label={t('location')}>
  <Link href={`/?id=${paikka.id}`} ...>
    {t('showOnMap')}
  </Link>
</Row>
```

---

### WR-06: `DiagonaalKortti` map-pin button `aria-label` is hardcoded Finnish

**File:** `app/components/DiagonaalKortti.tsx:205`
**Issue:** `aria-label="Näytä kartalla"` is a hardcoded Finnish string. The component already calls `const t = useTranslations('PaikkaKortti')` at line 37, and the map-pin button should use a translation key. There is no corresponding key in either message file yet.

**Fix:** Add key to both message files and use it:
```jsonc
// fi.json / en.json  (PaikkaKortti namespace)
"showOnMap": "Näytä kartalla" / "Show on map"
```
```tsx
aria-label={t('showOnMap')}
```

---

## Info

### IN-01: Orphan key `"reviewCount"` in both message files

**File:** `messages/en.json:31`, `messages/fi.json:30`
**Issue:** Both files contain `"reviewCount": "{count} reviews"` / `"reviewCount": "{count} arvostelua"` in the `PaikkaSheet` namespace. This key is never referenced in any component — `PaikkaSheet.tsx` uses `reviewCountSingular` and `reviewCountPlural` exclusively. Dead translation keys inflate bundle size and create maintenance confusion.

**Fix:** Delete `"reviewCount"` from both `messages/en.json` and `messages/fi.json`.

---

### IN-02: `not-found.tsx` uses `font-semibold` — violates project typography convention

**File:** `app/not-found.tsx:18`
**Issue:** `CLAUDE.md` explicitly states "2 weights only: 400 (normal) and 700 (bold). Never use 600 (semibold)." The back-home button uses `font-semibold` (weight 600). Every other button in the codebase uses `font-bold`.

**Fix:**
```tsx
className="inline-block bg-[#111111] hover:bg-[#333333] text-white font-bold px-6 py-2.5 rounded-full ..."
```

---

### IN-03: `next.config.mjs` — `createNextIntlPlugin()` called without explicit request config path

**File:** `next.config.mjs:9`
**Issue:** `createNextIntlPlugin()` is called with no argument. The default path it looks for is `./i18n/request.ts` (relative to the project root). The actual file is at `i18n/request.ts`, which matches the default, so this works — but it is fragile. If the file is moved or the next-intl default changes in a future major version the build will silently fall back or error with a cryptic message.

**Fix:** Pass the path explicitly:
```ts
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
```

---

### IN-04: `AuthModal` error messages for Google OAuth, signup flow, and catch are hardcoded Finnish and untranslated

**File:** `app/components/AuthModal.tsx:105,119,127,144`
**Issue:** Four error strings bypass the translation system entirely:
- Line 105: `'Jokin meni pieleen. Yritä uudelleen.'` (signin catch)
- Line 119: `'Tarkista sähköpostisi ja vahvista tili.'`
- Line 127: `'Jokin meni pieleen. Yritä uudelleen.'` (signup catch)
- Line 144: `'Google-kirjautuminen epäonnistui. Yritä uudelleen.'`

The `mapError()` helper at lines 20–31 also returns hardcoded Finnish strings and is never called through a translation function.

**Fix:** Move all error strings into the `Auth` namespace, and refactor `mapError` to accept the translator or return a key instead of a string.

---

### IN-05: `global.d.ts` augments next-intl `AppConfig` using only `fi.json` as the message type

**File:** `global.d.ts:1`
**Issue:** `Messages: typeof messages` where `messages` is imported from `./messages/fi.json`. This means TypeScript will only enforce key existence against the Finnish message file. If `en.json` has missing or misspelled keys they will not be caught at compile time. Given that several keys were found to be missing or orphaned (see CR-02, WR-05, WR-06, IN-01), this is a real gap.

**Fix:** A lightweight approach is to add a compile-time assertion that verifies structural equivalence:
```ts
import messages from './messages/fi.json'
import type enMessages from './messages/en.json'
// Ensures en.json has no missing keys relative to fi.json at compile time
type _AssertEnComplete = keyof typeof enMessages extends keyof typeof messages ? true : never
```
A stronger approach is to validate both files in CI with a script.

---

_Reviewed: 2026-06-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
