---
phase: 30-i18n-fien
plan: "03"
subsystem: i18n
tags: [next-intl, i18n, language-toggle, profiili, cookie]
dependency_graph:
  requires: [30-01]
  provides: [ProfiiliClient-i18n, LanguageToggle]
  affects: [app/profiili/ProfiiliClient.tsx]
tech_stack:
  added: []
  patterns: [useTranslations, useLocale, useTransition, changeLocaleAction, router.refresh, glass-card-section]
key_files:
  created: []
  modified:
    - app/profiili/ProfiiliClient.tsx
decisions:
  - "toggle() defined as inner function in ProfiiliClient (not a separate exported component) — simplifies prop access and matches PATTERNS.md recommendation"
  - "startTransition wraps async changeLocaleAction + router.refresh() — T-30-06 race condition mitigated: cookie write completes before page re-render"
  - "saveKiinnostuksetError also replaced with t('saveError') — same key as handleSave error, which is correct (both share the same Finnish error string)"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-04"
  tasks_completed: 1
  tasks_pending: 1
  files_created: 0
  files_modified: 1
---

# Phase 30 Plan 03: ProfiiliClient i18n + LanguageToggle — Summary

**One-liner:** ProfiiliClient.tsx migrated to next-intl — 13 Finnish string literals replaced with t('Profiili.*') calls and LanguageToggle glass card section added with startTransition + changeLocaleAction + router.refresh().

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ProfiiliClient.tsx — string translations + LanguageToggle | 163ea9e | app/profiili/ProfiiliClient.tsx |

## Pending Tasks

| Task | Name | Type | Status |
|------|------|------|--------|
| 2 | Human visual verification of /profiili language toggle | checkpoint:human-verify | Pending — awaiting orchestrator |

## What Was Built (Task 1)

ProfiiliClient.tsx was updated with:

**New imports:**
- `useTranslations, useLocale` from `next-intl`
- `useRouter` from `next/navigation`
- `useTransition` from `react` (added to existing import)
- `changeLocaleAction` from `@/app/actions/locale`

**New hooks inside component:**
- `const t = useTranslations('Profiili')`
- `const locale = useLocale()`
- `const router = useRouter()`
- `const [isPending, startTransition] = useTransition()`

**String replacements (13 total):**
1. `'Profiili vaatii kirjautumisen'` → `{t('requiresAuth')}`
2. `'Kirjaudu sisään nähdäksesi...'` → `{t('requiresAuthDesc')}`
3. `'Kirjaudu sisään'` (button) → `{t('signInButton')}`
4. `'Takaisin hakemistoon'` (unauthenticated link) → `{t('backToDirectory')}`
5. `'Profiili'` (h1) → `{t('title')}`
6. `'Kotipaikkakunta'` (label) → `{t('homeCity')}`
7. `placeholder="esim. Tampere"` → `placeholder={t('homeCityPlaceholder')}`
8. `'Tallenna'` (first button) → `{t('save')}`
9. `'Kotikaupunki tallennettu'` → `{t('homeCitySaved')}`
10. `'Tallennus epäonnistui...'` (handleSave error) → `t('saveError')`
11. `'Kiinnostuksen kohteet'` (label) → `{t('interests')}`
12. `'Tallenna'` (second button) → `{t('save')}`
13. `'Kiinnostukset tallennettu'` → `{t('interestsSaved')}`
14. `'Takaisin hakemistoon'` (bottom link) → `{t('backToDirectory')}`

Note: The `handleSaveKiinnostukset` error string was also translated (same `t('saveError')` key) — this is correct since both error strings were identical Finnish text.

**toggle() function:**
```typescript
function toggle() {
  const next = locale === 'fi' ? 'en' : 'fi'
  startTransition(async () => {
    await changeLocaleAction(next)
    router.refresh()
  })
}
```

**Language glass card section** (added between kiinnostukset section and back-link):
```tsx
<div className="glass rounded-2xl p-4 flex flex-col gap-3 mt-4">
  <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
    {t('language')}
  </label>
  <button
    onClick={toggle}
    disabled={isPending}
    className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60"
  >
    {locale === 'fi' ? t('switchToEnglish') : t('switchToFinnish')}
  </button>
</div>
```

## Verification Results

```
npx tsc -p worktree/tsconfig.json --noEmit --skipLibCheck
  0 errors — no TypeScript errors in ProfiiliClient.tsx

npx vitest run
  77 tests passed (8 test files) — full suite green
```

## Human Checkpoint Details (Task 2 — Pending)

The orchestrator needs to verify:
1. Navigate to http://localhost:3000/profiili
2. Verify "Kieli" section appears below interests with "Switch to English" button
3. Click button — page re-renders; button now reads "Vaihda suomeksi"
4. DevTools → Application → Cookies → NEXT_LOCALE=en with path=/
5. F5 reload — UI still in English
6. Click "Vaihda suomeksi" — returns to Finnish
7. F5 reload — Finnish persists
8. Set city filter on / → toggle language on /profiili → return to / → city filter preserved

## Key Decisions

- toggle() as inner function (not separate LanguageToggle component export): simpler, matches PATTERNS.md recommendation, avoids prop-drilling
- `startTransition(async () => { await changeLocaleAction(next); router.refresh() })`: T-30-06 mitigated — cookie write guaranteed complete before refresh
- Both save error strings use same `t('saveError')` key: correct — both had identical Finnish text

## Deviations from Plan

**1. [Rule 3 — Blocking] git merge master before Task 1**
- **Found during:** Pre-task setup
- **Issue:** Worktree branch (`worktree-agent-ad4a8e8461ab0d8f3`) was based on master commit `d8ebb4e` — before plan 30-01's next-intl installation, `app/actions/locale.ts`, `messages/`, etc.
- **Fix:** Ran `git merge master --no-edit` (fast-forward) to bring i18n infrastructure into the worktree before implementing plan 30-03.
- **Impact:** None — fast-forward merge, no conflicts.

## Known Stubs

None — all 13+ string replacements are wired to real translation keys from `messages/fi.json` and `messages/en.json`. Language toggle calls real `changeLocaleAction` server action.

## Threat Surface Scan

No new security-relevant surface beyond plan's threat model:
- T-30-06 (race condition): mitigated via `await changeLocaleAction(next)` before `router.refresh()`
- T-30-07 (user email display): accepted — email shown only to authenticated user, unchanged behavior

## Self-Check: PASSED

Files:
- FOUND: app/profiili/ProfiiliClient.tsx (contains useTranslations, useLocale, changeLocaleAction, toggle function, glass card with t('language'))

Commits:
- 163ea9e: feat(30-03): migrate ProfiiliClient — translate all strings, add LanguageToggle
