---
phase: 30-i18n-fien
fixed_at: 2026-06-04T00:00:00Z
review_path: .planning/phases/30-i18n-fien/30-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-06-04T00:00:00Z
**Source review:** .planning/phases/30-i18n-fien/30-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (2 Critical + 6 Warning)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Operator precedence bug in `mapError` — password check silently broken

**Files modified:** `app/components/AuthModal.tsx`
**Commit:** 85eea7a
**Applied fix:** Wrapped the two `includes` calls in explicit parentheses so `(A || B) && C` evaluates correctly, preventing unrelated error messages from being misclassified as password-length errors.

### CR-02: AuthModal loading state + mode-toggle strings hardcoded Finnish

**Files modified:** `app/components/AuthModal.tsx`, `messages/fi.json`, `messages/en.json`
**Commit:** 0f4f375
**Applied fix:** Added 6 new keys to the `Auth` namespace in both message files (`signingIn`, `creatingAccount`, `noAccount`, `createAccount`, `alreadyHaveAccount`, `signInLink`). Replaced the hardcoded Finnish strings in the submit button loading state and mode-toggle paragraph with `t()` calls.

### WR-01: `NEXT_LOCALE` cookie lacks `httpOnly` and `sameSite`

**Files modified:** `app/actions/locale.ts`
**Commit:** dede5db
**Applied fix:** Added `httpOnly: true` and `sameSite: 'lax'` to the cookie options in `changeLocaleAction`.

### WR-02: `PaikkaSheet` close button missing `aria-label`

**Files modified:** `app/components/PaikkaSheet.tsx`
**Commit:** eaecb18
**Applied fix:** Added `aria-label={t('close')}` to the close button in the carousel header area. The `"close"` key already existed in `PaikkaSheet` namespace.

### WR-03: `reviewCountSingular` — pass `count` consistently

**Files modified:** `app/components/PaikkaSheet.tsx`, `messages/fi.json`, `messages/en.json`
**Commit:** 158ba99
**Applied fix:** Changed `t('reviewCountSingular')` to `t('reviewCountSingular', { count: 1 })` for consistency with the plural branch. Also removed the orphan `"reviewCount"` key from both message files (it was never referenced in any component).

### WR-04: Hardcoded Finnish in `Etusivu.tsx` — CalloutCard and inline-review UI

**Files modified:** `app/components/Etusivu.tsx`, `messages/fi.json`, `messages/en.json`
**Commit:** 3c13352
**Applied fix:** Added `const t = useTranslations('PaikkaKortti')` inside `CalloutCard` and changed `vain jäsenyys` to `{t('membershipOnly')}` (key already existed). Added `"saving"` and `"submitReview"` keys to the `Todo` namespace in both message files, then replaced the hardcoded `'Tallennetaan…'` and `'Jätä arvostelu'` strings with `tTodo('saving')` and `tTodo('submitReview')`.

### WR-05: Hardcoded Finnish in `app/paikat/[id]/page.tsx` — location row label

**Files modified:** `app/paikat/[id]/page.tsx`, `messages/fi.json`, `messages/en.json`
**Commit:** 00256f2
**Applied fix:** Added `"location"` and `"showOnMap"` keys to the `PaikkaPage` namespace in both message files. Replaced the hardcoded `"Sijainti"` label and `"Näytä kartalla →"` link text with `t('location')` and `t('showOnMap')`.

### WR-06: `DiagonaalKortti` map-pin button `aria-label` hardcoded Finnish

**Files modified:** `app/components/DiagonaalKortti.tsx`, `messages/fi.json`, `messages/en.json`
**Commit:** bd8c691
**Applied fix:** Added `"showOnMap"` key to the `PaikkaKortti` namespace in both message files (fi: `"Näytä kartalla"`, en: `"Show on map"`). Changed `aria-label="Näytä kartalla"` to `aria-label={t('showOnMap')}` — the component already had `const t = useTranslations('PaikkaKortti')`.

---

_Fixed: 2026-06-04T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
