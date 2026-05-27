# Phase 11: PWA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 11-pwa
**Areas discussed:** Caching strategy, Install prompt, Offline fallback, Icon generation

---

## Caching strategy

### Which pages should be offline-capable?

| Option | Description | Selected |
|--------|-------------|----------|
| Listing page only (/?nakyma=lista) | Cache only what the success criterion requires. Simplest scope. | ✓ |
| Listing + home map view (/) | Cache both main views. Map pins won't work offline but shell loads. | |
| Listing + home + visited detail pages | Runtime-cache /paikat/[id] as user visits them. | |

**User's choice:** Listing page only (/?nakyma=lista)

### Cache strategy for the listing page?

| Option | Description | Selected |
|--------|-------------|----------|
| NetworkFirst | Tries network first; falls back to cache only when offline. | ✓ |
| StaleWhileRevalidate | Returns cached HTML immediately, fetches fresh in background. | |

**User's choice:** NetworkFirst

### Cache TTL (how old is too stale)?

| Option | Description | Selected |
|--------|-------------|----------|
| 24 hours | Venue data changes infrequently — a day-old snapshot is fine. | ✓ |
| 7 days | Good for infrequent users offline for longer stretches. | |
| No expiry | Simplest — cached until SW updates or cache cleared. | |

**User's choice:** 24 hours

### Static asset precaching?

| Option | Description | Selected |
|--------|-------------|----------|
| Precache static assets | Serwist precaches /_next/static/** at install time — standard pattern. | ✓ |
| Runtime cache only | Assets cached only when first requested. | |

**User's choice:** Precache static assets

---

## Install prompt

### Android install prompt surface

| Option | Description | Selected |
|--------|-------------|----------|
| Browser-native only | Let Android Chrome show its own A2HS banner automatically. Zero extra UI. | ✓ |
| Custom prompt in right toolbar (Etusivu) | Intercept beforeinstallprompt, add 'Asenna' in MoreHorizontal toolbar. | |
| Custom floating banner | Show a subtle bottom banner across all pages. | |

**User's choice:** Browser-native only

### iOS-specific hint

| Option | Description | Selected |
|--------|-------------|----------|
| No hint (iOS users figure it out) | Keeps UI simple. PWA-02 doesn't specify iOS instructions. | ✓ |
| Hint in right toolbar on Etusivu | Show 'Paina Jaa → Lisää kotinäyttöön' tooltip on iOS. | |
| You decide | Claude picks the simplest option. | |

**User's choice:** No hint

### Display mode for installed app

| Option | Description | Selected |
|--------|-------------|----------|
| standalone | No browser chrome. Feels like a native app. | ✓ |
| minimal-ui | Shows minimal browser toolbar with back/forward. | |

**User's choice:** standalone

---

## Offline fallback

### What do uncached pages show when offline?

| Option | Description | Selected |
|--------|-------------|----------|
| Custom /offline page (precached) | Finnish 'Ei verkkoyhteyttä' page with retry button. | ✓ |
| Browser's native error | Chrome/Safari 'No connection' page. | |
| Redirect to cached listing page | Send offline users to /?nakyma=lista if cached. | |

**User's choice:** Custom /offline page (precached)

### /offline page content

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: logo + Finnish message + retry button | 'Ei verkkoyhteyttä. Tarkista yhteys ja yritä uudelleen.' Matches existing error page style. | ✓ |
| Include cached listing link | Also show 'Selaa tallennettuja paikkoja' link. | |

**User's choice:** Minimal: logo + Finnish message + retry button

---

## Icon generation

### How to generate PNG icons?

| Option | Description | Selected |
|--------|-------------|----------|
| Script with sharp (devDep) | Add sharp, write generate script, run once. Fully automated. | |
| I'll provide the PNG files manually | User places icons in public/ themselves. | |

**User's response (free text):** Brand and name "ACTA" are not final — icon work can be done later with the right logo and name.

### Placeholder icon approach

| Option | Description | Selected |
|--------|-------------|----------|
| Generate from current acta-symbol.svg with sharp | Real PNG icons from existing SVG. Easy to replace. | |
| Simple solid-color placeholder (indigo square) | Programmatically-generated indigo squares. Clearly temporary. | ✓ |
| I'll drop PNG files into public/ before executing | Manual placeholder icons by user. | |

**User's choice:** Simple solid-color placeholder (indigo square)
**Notes:** Brand and name are in flux. Real icons deferred until branding is finalized.

---

## Claude's Discretion

- Serwist configuration details (sw.ts contents, workbox plugin options, cache key normalization)
- Manifest fields beyond the discussed ones (name, short_name, description, lang, orientation, icons array structure)
- How to programmatically generate indigo placeholder PNGs (library choice: pureimage vs canvas vs sharp)

## Deferred Ideas

- Real icon generation with final brand/logo — when name and logo are decided
- iOS "Add to Home Screen" instructions in UI
- Etusivu (/) offline support — map requires network anyway
- /paikat/[id] runtime caching as user visits detail pages
- Custom Android install prompt UI in right toolbar
