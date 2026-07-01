---
phase: 62-venuepage-konsolidaatio
reviewed: 2026-07-01T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - app/api/business/create-paikka/route.ts
  - app/business/onboarding/page.tsx
  - app/components/DiagonaalKortti.tsx
  - app/components/Etusivu.tsx
  - app/components/PaikkaSheet.tsx
  - messages/en.json
  - messages/fi.json
findings:
  critical: 1
  warning: 6
  info: 1
  total: 8
status: issues_found
---

# Phase 62: Code Review Report

**Reviewed:** 2026-07-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the 7 files listed for the venue-page-consolidation phase (5 phase-owned files plus 2 drive-by Phase 61 fixes: `create-paikka/route.ts` and `onboarding/page.tsx`).

`create-paikka/route.ts`'s lat/lng validation rewrite is solid — the `parseCoord` allowlist correctly rejects non-finite/out-of-range/mismatched-pair coordinates while still allowing the legitimate "both omitted" case, and 0 (equator/prime-meridian) is handled correctly since the code checks `=== null`/`=== undefined` rather than falsy. No issues found there.

The consolidation work that replaced `DiagonaalKortti`'s `<Link>`-based navigation with an in-app `onOpen` callback (so cards open a modal `PaikkaSheet` instead of routing to a separate `/paikat/[id]` page) introduced a real interaction regression: the invisible click-catcher div that calls `onOpen` now renders *underneath* the card's own info panel in stacking order, so tapping the venue name/price/badge — the majority of the visible card — does nothing. Only the photo half of the card opens the sheet. This is a BLOCKER because it breaks the core "tap a card to see the venue" interaction in both places `DiagonaalKortti` is used with `onOpen` (search results list and the TODO/favorites overlay).

Several smaller issues were also found: a dead-code cleanup called for by this phase's own PATTERNS.md was not applied (`Etusivu.tsx`'s scroll-restore effect), a discarded piece of state in the onboarding page, a raw `<a>` causing a full page reload where the rest of the app uses client-side state updates, a contrast gap on branded cards, a missing English translation key, and (found while tracing `DiagonaalKortti`'s sibling component `PaikkaKortti.tsx`, which was *not* migrated to the new pattern) two dangling links to the now-deleted `/paikat/[id]` route reachable from the business onboarding preview modal.

## Critical Issues

### CR-01: Tapping a venue card's info panel no longer opens the sheet

**File:** `app/components/DiagonaalKortti.tsx:88-134`

**Issue:**
The card's click-to-open handler was moved from a wrapping `<Link>` (parent of all card content, so any click anywhere inside correctly bubbled to it) to a sibling `<div role="button" onClick={() => onOpen(paikka)}>` that is absolutely positioned `inset-0` at `z-10` and rendered **before** the LEFT info panel and RIGHT photo panel in the JSX:

```tsx
{onOpen ? (
  <div role="button" tabIndex={0} className="absolute inset-0 block z-10 cursor-pointer"
    onClick={() => onOpen(paikka)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(paikka) }}
  />
) : ( <div className="absolute inset-0 block z-10" /> )}

  {/* LEFT: info panel */}
  <div ref={leftPanelRef} className="absolute inset-0 z-10 flex flex-col p-3 overflow-hidden"
    style={{ clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)', ... }}>
    ... badge / name / price / open-status content ...
  </div>

  {/* RIGHT: venue photo */}
  <div className="absolute top-0 right-0 bottom-0 overflow-hidden" style={{ left: '50%', clipPath: '...' }}>
    ...
  </div>
```

The LEFT panel shares the *same* `z-10` as the click-catcher but is later in DOM order, so per CSS stacking rules it paints **on top** of the catcher within its clip-path region (roughly the left 57–62% of the card — exactly where the sport badge, venue name, price, and open-status text live). Neither the LEFT panel nor the RIGHT panel has an `onClick` handler or `pointer-events-none`, so clicks landing on that region are consumed by the panel and never reach the catcher div (siblings don't inherit each other's handlers via bubbling — only ancestors do). The RIGHT photo panel has no explicit `z-index` (`z-auto`≈0), so it sits *below* the catcher and photo taps do still work — but that's the only part of the card that responds to a tap.

Previously, `<Link>` wrapped the LEFT/RIGHT panels as their ancestor, so clicks anywhere on non-interactive descendant content correctly bubbled up to the link regardless of paint order. That safety property was lost in the refactor to a sibling overlay.

Impact: in both places `DiagonaalKortti` is used with `onOpen` in `Etusivu.tsx` (search results list and the TODO/favorites overlay list), tapping the readable part of the card — name, price, sport badge — silently does nothing. Only tapping the photo thumbnail opens the venue sheet. Keyboard activation (Tab + Enter/Space on the catcher div) still works since it doesn't depend on hit-testing, so this is a mouse/touch-only regression, but touch is the primary input for this app.

**Fix:** Render the click-catcher **after** the LEFT/RIGHT panels (still below the `z-20` action buttons, which already `stopPropagation`/`preventDefault`), so it paints on top of them and receives clicks everywhere except the two explicit buttons:

```tsx
<div className="absolute inset-0 rounded-2xl overflow-hidden">
  {/* LEFT panel */}
  <div ref={leftPanelRef} ...>...</div>
  {/* RIGHT panel */}
  <div ...>...</div>

  {/* Click-catcher now rendered last among the z-10 layer, on top of LEFT/RIGHT */}
  {onOpen ? (
    <div role="button" tabIndex={0} className="absolute inset-0 block z-10 cursor-pointer"
      onClick={() => onOpen(paikka)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(paikka) }}
    />
  ) : null}

  {hasCoords && ( <button ... /> )}   {/* z-20, still wins via stopPropagation */}
  {onToggleTodo && ( <button ... /> )}
</div>
```

Alternatively, add `pointer-events-none` to the LEFT and RIGHT panel wrapper `<div>`s and keep the catcher first — either approach restores full-card tap-to-open.

## Warnings

### WR-01: Dead scroll-restore effect left in place despite this phase's own cleanup plan

**File:** `app/components/Etusivu.tsx:583-613`

**Issue:** This phase removed `handleCardClick` (the only writer of the `sessionStorage` key `'etusivu-scroll-state'`) as part of migrating card navigation to the modal-based `onOpen` pattern. The phase's own `62-PATTERNS.md` explicitly flags the restore effect as consequently dead: *"The key `'etusivu-scroll-state'` will never be written, so the effect is permanently dead code. Removing is cleaner per research recommendation."* That removal was not carried out — the effect (and the `searchResultsRef` it depends on) is still present and now unreachable: `sessionStorage.getItem('etusivu-scroll-state')` will always return `null`, so the effect body after the `if (!raw) return` early-return — including the `_v` version check, `setSearchHaku`/`setSearchLaji`/`setSearchKaupunki` restoration, and the `console.warn` catch branch — can never execute.

**Fix:** Remove the effect (lines ~583-613) and the now-unused `searchResultsRef`/its `ref={searchResultsRef}` attachment, per the plan already written in `62-PATTERNS.md`.

### WR-02: Discarded onboarding state — fetched venue info is written but never read

**File:** `app/business/onboarding/page.tsx:205`

**Issue:**
```tsx
const [, setPaikkaInfo] = useState<PaikkaBase | null>(null)
```
The state value is destructured away entirely — only the setter is kept and threaded down to `StepNimiJaURLPrePhase` as `onPaikkaInfoResolved`. The fetched `paikka` row (`nimi, laji, osoite, kaupunki, latitude, longitude`) is stored into this slot and then never read anywhere in `OnboardingWizardPage` or passed to `WizardInner`. This is dead state — either the intent was to thread `paikkaInfo` into `WizardInner` (e.g. for a "resuming" banner) and that wiring was dropped, or the state should be removed entirely along with the `onPaikkaInfoResolved` plumbing.

**Fix:** Either use the captured value (e.g. `const [paikkaInfo, setPaikkaInfo] = useState(...)` and pass it to `WizardInner`), or delete the state/prop entirely if it's genuinely unneeded, and have `StepNimiJaURLPrePhase` manage its own local `paikkaInfo` only (which it already does).

### WR-03: "Show on map" link forces a full page reload instead of an in-app map focus

**File:** `app/components/PaikkaSheet.tsx:265-274`

**Issue:**
```tsx
<a
  href={`/?id=${paikka.id}`}
  className="text-[#111111] hover:text-[rgba(17,17,17,0.6)] text-sm font-bold underline underline-offset-2 [transition:color_150ms_var(--ease-out)]"
>
  {t('showOnMap')}
</a>
```
This is a plain `<a>` tag, not `next/link`'s `Link`. Clicking it triggers a full browser navigation/reload of the SPA to re-focus a marker that is already rendered on the map directly behind this very sheet. Every other "show on map" affordance in this codebase (`DiagonaalKortti`'s `onShowMap` prop) does this client-side via `setAutoZoomTarget(...)` with no navigation at all. A full reload here re-fetches weather, re-runs the AI recommendation call, resets GPS auto-pan state, and flashes a blank page — a much heavier and jankier interaction than the rest of the app for functionally the same action.

**Fix:** Give `PaikkaSheet` an optional `onShowMap?: (paikka: Liikuntapaikka) => void` prop (mirroring `DiagonaalKortti`) and have the caller in `Etusivu.tsx` wire it to `setAutoZoomTarget` + close the sheet, instead of navigating. If a URL-based fallback is still desired for deep-linking, use `next/link`'s `Link` at minimum so it stays client-side within the app.

### WR-04: Branded card's "membership only" / "coming soon" price text ignores contrast override

**File:** `app/components/DiagonaalKortti.tsx:147-204`

**Issue:** When `brandColor` is set, `contrastText` is computed and applied to the venue name and price chips so they stay legible against a business-chosen background color. However the `membershipOnly` label and `priceComingSoon` fallback text do not receive `contrastText`:
```tsx
{membershipOnly ? (
  <span className="text-xs text-[rgba(17,17,17,0.5)]">{t('membershipOnly')}</span>
) : priceItems ? (
  ...
) : (
  <span className="text-xs text-[rgba(17,17,17,0.35)]">{t('priceComingSoon')}</span>
)}
```
If a business picks a dark `brandColor` (making `contrastText` white), these two text states remain dark-gray-on-dark and become low/no contrast, while the sibling price-chip and name text correctly flip to white.

**Fix:** Apply `style={contrastText ? { color: contrastText } : undefined}` to both spans, consistent with the rest of the LEFT panel's text.

### WR-05: English translations missing keys consumed by the business claim form

**File:** `messages/en.json` (compare with `messages/fi.json:125-127`)

**Issue:** `messages/fi.json`'s `Business` namespace has:
```json
"websiteUrlLabel": "VERKKO-OSOITE (VALINNAINEN)",
"websiteUrlPlaceholder": "https://...",
"websiteUrlHelper": "Täytämme tiedot automaattisesti verkko-osoitteen perusteella",
```
`messages/en.json` has no equivalent keys. `app/components/ClaimSearchForm.tsx` reads `t('websiteUrlPlaceholder')` and `t('websiteUrlLabel')` (used as the input's `placeholder` and `aria-label`). On the English locale, `next-intl`'s default missing-message fallback renders the literal `Business.websiteUrlLabel` / `Business.websiteUrlPlaceholder` string instead of readable text, and logs a console error — a visible, user-facing regression for English-locale business signups.

**Fix:** Add the three missing keys to `messages/en.json` (e.g. `"websiteUrlLabel": "WEBSITE (OPTIONAL)"`, `"websiteUrlPlaceholder": "https://..."`, `"websiteUrlHelper": "We'll use your website to prefill venue details"` — consistent with the existing `stepNimiJaURLWebsite*` English strings already in the file).

### WR-06: `PaikkaKortti.tsx` still links to the deleted `/paikat/[id]` route (dangling link, missed migration)

**File:** `app/components/PaikkaKortti.tsx:90`, `app/components/PaikkaKortti.tsx:184-189`

**Issue:** Not in this phase's file list, but directly implicated by it: `app/paikat/[id]/` was removed by this consolidation (confirmed no route exists and `messages/*.json`'s now-deleted `PaikkaPage` namespace was cleaned up correctly). `DiagonaalKortti.tsx` was migrated from `<Link href="/paikat/...">` to the new `onOpen` callback pattern, but the older sibling component `PaikkaKortti.tsx` was not — it still contains two `<Link href={`/paikat/${paikka.id}`}>` (name link and "Näytä tiedot"/`showDetails` CTA button). `PaikkaKortti` is rendered by `PreviewModal.tsx` (`app/components/PreviewModal.tsx:52`), which is used by the business onboarding "LISTAKORTTI" live preview. Clicking either link there now 404s.

**Fix:** Either delete `PaikkaKortti.tsx` if it's fully superseded by `DiagonaalKortti` (confirm no other live consumers besides the preview), or migrate it to the same `onOpen`-callback pattern used in `DiagonaalKortti.tsx` so the preview doesn't advertise a dead link.

## Info

### IN-01: Parameter shadowing in card `onOpen` callbacks

**File:** `app/components/Etusivu.tsx:1059`, `app/components/Etusivu.tsx:1456-1459`

**Issue:** Both usages of `DiagonaalKortti`'s `onOpen` prop are defined inside a `.map(p => ...)` callback and themselves declare a parameter also named `p`, shadowing the outer one:
```tsx
{todoPaikat.map(p => (
  ...
  <DiagonaalKortti paikka={p} ... onOpen={(p) => { setTodoOpen(false); setValittu(p) }} />
))}
```
Functionally harmless today (the inner `p` passed by `DiagonaalKortti.onOpen(paikka)` is always the same object as the outer `p`), but shadowing invites confusion during future edits/debugging.

**Fix:** Rename the inner parameter, e.g. `onOpen={(clicked) => { setTodoOpen(false); setValittu(clicked) }}`.

---

_Reviewed: 2026-07-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
