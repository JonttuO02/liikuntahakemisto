# Feature Landscape — v1.1 Käyttäjät, Kartta & Laatu

**Domain:** Finnish sports venue directory (anonymous-first, GPS-centric, mobile web)
**Researched:** 2026-05-21
**Milestone context:** Adding auth, map improvements, UI polish, multi-city expansion, PWA, GDPR, and sponsorship to v1.0 MVP.

---

## Table Stakes

Features users expect in this category of app. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AUTH-01: Email + Google OAuth | Auth without Google OAuth feels incomplete in 2025. Google is the dominant social login in Finnish consumer apps. | Medium | Supabase Auth handles both natively. Social provider redirect URI must be configured in Supabase dashboard. |
| AUTH-02: Favorites persist across devices | Without sync, favorites are just a local bookmark list — no advantage over browser bookmarks. | Medium | Requires `suosikit` table in Supabase with user_id FK. Supabase anonymous-user-to-permanent upgrade preserves UID, so pre-auth favorites could carry over, but skip anonymous accounts (see Anti-Features). |
| MAP-04: Re-center button | Any GPS-enabled map without a re-center button is broken UX. Users pan away and cannot return. | Low | Single button, fixed position on map canvas. Calls `map.panTo(coords)`. Already have `useGPS` hook and `MapPanController` — this is just a UI button wired to existing logic. |
| MAP-05: GPS accuracy ring | Blue dot without accuracy ring looks broken when GPS is coarse (desktop/WiFi). Ring sets honest expectation. | Low | Google Maps `Circle` class. `fillOpacity: 0.08`, `strokeOpacity: 0.3`, radius = `GeolocationCoordinates.accuracy` meters. The `.accuracy` property is defined as 95th-percentile confidence in meters. |
| MAP-07: "Näytä kartalla" opens own map | Currently links to Google Maps external — jarring redirect out of the product. Users expect in-app map. | Medium | Route to `/?nakyma=kartta&lat=X&lng=Y&zoom=16` (venue coords, not user GPS — these are static). Map reads URL params on mount, pans + zooms to that venue. |
| UI-05/06: Price hierarchy in card | "Kertakäynti OK" badge with no price is useless noise. Price is the #1 decision factor for drop-in users. | Low | Replace badge with actual price string if available; fall back to "vain jäsenyys" if `hinta_kuvaus` contains only membership text. Move price above the CTA row. |
| UI-07: Remove "Varaa aika" from list card | Button adds visual weight and creates trust concerns (external link in list). Belongs on detail page only. | Low | Remove from `PaikkaKortti`. Keep on profile page as text link + URL. |
| UI-08: Dropdown filter (single-select) | With 3 cities and growing laji counts, horizontal pill scroll becomes unusable on mobile. Dropdown is standard. | Low | Replaces pill tabs in `LiikuntapaikatLista`. Single-select — multi-select adds complexity with little value at current data volume. |
| DATA-05/06/07: Multi-city (Helsinki + Turku) | Tampere-only limits audience severely. National scope requires multi-city. | High | Requires schema `kaupunki` column (already exists in type, verify DB column exists), UI city filter, and Google Places sync for 2 new cities. Helsinki has significantly more venues than Tampere — seed strategically with top 20-30 per sport per city. |
| LEGAL-01: GDPR privacy page | Finnish Tietosuojalaki (1050/2018, in force 2019-01-01) + EU GDPR Art. 13/14 require privacy information when collecting personal data. Auth means personal data. **Mandatory before shipping AUTH.** | Low | Static page at `/tietosuoja`. Content requirements in detailed spec below. Must be linked from auth modal and footer. |
| PWA-01/02: Installable + offline | Mobile users expect "add to home screen." Without manifest + service worker, Chrome shows no install prompt. Offline matters for gym areas with poor signal. | Medium | `@ducanh2912/next-pwa` is the maintained fork (original `next-pwa` abandoned). App Router offline fallback at `app/~offline/page.tsx`. |

---

## Differentiators

Features that set this product apart. Not expected by default, but valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| MAP-06: Zoom-dependent clustering → info cards | Google Maps does this; third-party venue apps rarely do. Creates "pro" feel. Venue count visible at city scale; individual cards at street scale. | Medium-High | `@googlemaps/markerclusterer` already in `package.json` (v2.6.2). Uses supercluster algorithm. Cluster click calls `getClusterExpansionZoom` and zooms to that level. At zoom ≥ 14 (current fullscreen default), individual markers show; below 14 clusters aggregate. |
| AUTH-03: Personalized AI recommendation | Weather widget currently generic. With favorites, Claude Haiku can say "Sinulle sopisi tänään padel" instead of generic advice. | Medium | Send favorites list to `/api/saasuositus`. Must not block widget (already non-blocking). Cache key must include favorites hash alongside date — otherwise a cached generic response shows to a logged-in user. |
| ADS-02: "Sponsoroitu" badge | Transparent advertising badge builds trust vs hiding it. `featured` flag already in schema and `Liikuntapaikka` type. | Low | Small "Sponsoroitu" label, visually distinct from sport badge (neutral gray, not indigo). Appears on list card and map bottom sheet. EU Digital Services Act (in force 2023) requires ad transparency — "Sponsoroitu" is compliant Finnish terminology. |
| AI-04: City name next to temperature | Makes widget contextually relevant when multi-city: "Tampere · 14°" vs just "14°". Small detail that signals quality. | Low | Use bounding-box lookup table (Tampere / Helsinki / Turku) against Open-Meteo response coordinates. Avoid a reverse-geocode API call — adds latency and cost for a decorative feature. |
| GPS accuracy ring (MAP-05) | Most Finnish sports apps don't show accuracy rings. Signals technical honesty and quality. | Low | Listed in table stakes above — also serves as a differentiator in practice. |

---

## Anti-Features

Features to explicitly NOT build in v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Anonymous user accounts (Supabase anonymous sign-in) | Edge cases multiply: data conflicts on upgrade, RLS complexity, session management across devices. App already works fully without auth. | Gate favorites behind explicit signup. Show value proposition: "Tallenna suosikit kaikkiin laitteisiin — kirjaudu sisään." |
| Multi-select sport filter | Data volume (< 100 venues per city) doesn't justify UI complexity. Users filter to find one sport, not combinations. | Single-select dropdown. Add "Kaikki" as default option. |
| Forced login gate | Core value is "find a venue without friction." Forcing login before browsing kills conversion. | Progressive auth: all browsing anonymous. Auth prompt appears only when user taps a favorites heart icon. |
| Server-side auth redirect (middleware) | Next.js middleware-based auth redirect creates 302 loops, breaks App Router caching, makes the app feel like a dashboard product. | Client-side auth check in favorites components only. |
| "Varaa aika" button on list cards | Already decided (UI-07). External booking URLs in list cards create trust concerns and visual noise. | Remove from `PaikkaKortti`. Keep on profile page as URL text link. |
| PWA push notifications | ~80% of users deny notification permission. Adds backend complexity (push subscription management). | Not needed for a discovery app. Users return by habit or search. |
| Multi-city GPS auto-switch | Auto-detecting city from GPS and silently reloading content is disorienting. | Explicit city selector. GPS is only for distance strings and map centering, not content switching. |
| `beforeinstallprompt` on first page load | Showing install prompt immediately is hostile UX. Research shows deferred prompts convert better. | Capture event with `preventDefault()`, store in ref. Show custom button only after user performs a meaningful action (e.g., saves first favorite) or on second visit. |
| Review / ratings system | Empty stars are worse than no stars. Reviews require moderation, volume, and accounts to be credible. | Use "Auki nyt" badge and "vain jäsenyys" flags as trust signals instead. |

---

## Feature Dependencies

```
LEGAL-01 (GDPR page) → AUTH-01 (must link privacy policy before collecting auth data)
AUTH-01 (email + Google OAuth) → AUTH-02 (favorites require a logged-in user_id)
AUTH-02 (favorites table) → AUTH-03 (personalized AI needs favorites list)
DATA-07 (kaupunki field confirmed in DB) → DATA-05/06 (Helsinki/Turku import)
DATA-07 (kaupunki in DB) → UI city filter dropdown
MAP-04 (re-center button) → existing useGPS hook (already implemented — just a button)
MAP-05 (accuracy ring) → existing useGPS hook (accuracy from GeolocationCoordinates API)
MAP-06 (clustering) → @googlemaps/markerclusterer (already in package.json v2.6.2)
MAP-07 ("Näytä kartalla") → URL routing confirmed: ?nakyma=kartta already in use
PWA-02 (manifest + install prompt) → PWA-01 (service worker must be registered first)
ADS-02 (Sponsoroitu badge) → ADS-01 (featured boolean in schema — already shipped v1.0)
UI-08 (dropdown filter) → DATA-07 (needs city as a filterable dimension too)
```

---

## Detailed Behavior Specifications

### MAP-06: Map Clustering

**Zoom thresholds for Finnish city scale:**
- Zoom < 12 (country/region): Large cluster circles, count label only
- Zoom 12–13 (city view): Cluster circles, count + optional sport icon if homogeneous cluster
- Zoom 14 (default fullscreen zoom): Transition zone — clusters begin breaking into individual markers
- Zoom ≥ 15 (street view): Individual sport pins only, no clustering

**Cluster circle design:**
- Radius: `Math.min(16 + Math.log2(count) * 6, 48)` px — scales with density
- Background color: use dominant sport color of clustered venues; fall back to `#4F46E5` (indigo-600) for mixed clusters
- White count number centered, `font-semibold`
- Click: call `getClusterExpansionZoom(clusterId)` → fly to that zoom level, do not open a bottom sheet

**Individual marker → info card:**
- Tap individual marker → existing bottom-sheet (`valittu` state) — no change to bottom sheet content needed
- Bottom sheet "Näytä tiedot" link goes to profile page; no need for a "Näytä kartalla" link inside the bottom sheet (user is already on the map)

**Implementation path:**
Use `@googlemaps/markerclusterer` `MarkerClusterer` with `SuperClusterAlgorithm`. Render custom cluster markers via the `renderer` prop to get full visual control (colored circles). Individual markers become `AdvancedMarker` elements (required by `@googlemaps/markerclusterer` v2). The library is already installed — no new dependency needed.

**Performance note:** With < 200 venues across 3 cities, supercluster rebuilds are fast. No virtualization needed.

### AUTH-01/02: Auth UX Flow

**Progressive disclosure (industry standard for anonymous-first apps):**
1. User browses without any auth prompt
2. User taps heart/favorites icon on a card
3. Modal appears: "Tallenna suosikkisi — kirjaudu sisään tai luo tili"
4. Options: Google OAuth (primary, large button) + Email magic link (secondary, smaller)
5. After auth: modal closes, venue added to favorites, UI updates immediately
6. NavBar shows user avatar or email initial; BottomNav gains "Suosikit" as active destination

**Supabase Auth configuration:**
- Enable Google OAuth in Supabase dashboard (requires Google Cloud Console OAuth 2.0 client)
- Email: magic link (passwordless) — lower friction than password; matches Finnish consumer expectations
- Site URL + redirect URLs must be configured: localhost:3000 + production domain
- RLS on `suosikit` table: `auth.uid() = user_id` for all CRUD operations
- Service role key for server-side operations (already established pattern)

**Skip anonymous accounts:** Do not use `supabase.auth.signInAnonymously()`. The complexity of linking sessions and handling data conflicts on upgrade is not justified when the app already works fully without auth.

### LEGAL-01: GDPR Privacy Page Minimum Content

Under GDPR Art. 13 + Finnish Tietosuojalaki (1050/2018), these sections are required when collecting personal data via auth:

**Required sections (Finnish language):**
1. **Rekisterinpitäjä:** App name, operator name (Joona Orava), contact email
2. **Henkilötietojen käsittelyn tarkoitus ja oikeusperuste:** Favorites feature (sopimuksen täytäntöönpano / contract performance). Specify each purpose separately.
3. **Kerättävät henkilötiedot:** Email address, Google account name/email (OAuth), Supabase user ID, saved favorites list (venue IDs)
4. **Tietojen säilyttämisaika:** Specific period required — "Tiedot poistetaan 24 kuukauden käyttämättömyyden jälkeen tai tilin poistohetkellä"
5. **Tietojen vastaanottajat:** Supabase (EU data processor — specify region), Google (OAuth provider). Individual names not required; categories sufficient.
6. **Siirrot EU/ETA-alueen ulkopuolelle:** Supabase stores data in EU (specify exact region in dashboard). Google OAuth may involve US data transfer — mention Standard Contractual Clauses basis.
7. **Rekisteröidyn oikeudet:** Right to access (tarkistusoikeus), rectify (oikaiseminen), erase (poistaminen), restrict (rajoittaminen), portability (siirto-oikeus), object (vastustamisoikeus), lodge complaint with **Tietosuojavaltuutetun toimisto** (tietosuoja.fi)
8. **Tietosuojavastaava:** Note "ei sovelleta" if not applicable (small app, no requirement)
9. **Evästeet:** Only required if analytics/tracking cookies are added. Supabase Auth uses `localStorage` for tokens, not cookies — note this distinction.

**Format:** Plain Finnish, easily readable. Static `/tietosuoja` page. Link from auth modal, NavBar footer, and registration confirmation email.

### PWA-01/02: Service Worker + Install Prompt

**Manifest fields required for Chrome installability:**
```json
{
  "name": "Liikuntahakemisto",
  "short_name": "Liikunta",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#EEF2FF",
  "theme_color": "#4F46E5",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "description": "Löydä liikuntapaikat läheltäsi",
  "screenshots": []
}
```

**`@ducanh2912/next-pwa` setup for Next.js 14 App Router:**
- Wrap `next.config.js` with `withPWA({ dest: 'public', cacheOnFrontEndNav: true, aggressiveFrontEndNavCaching: true, skipWaiting: true })`
- Offline fallback page: `app/~offline/page.tsx` (App Router convention — note tilde, not underscore)
- Caching strategy: `NetworkFirst` for `/api/*` routes; `CacheFirst` for static assets
- Google Maps tiles are cross-origin — service worker cannot cache them. Cache the app shell only.

**Install prompt UX:**
- Capture `beforeinstallprompt` with `event.preventDefault()` immediately in a global effect
- Store as `window.__installPrompt` or React ref
- Show custom install banner (small, above BottomNav, dismissable) only after: user saves first favorite OR `localStorage.visitCount >= 2`
- `beforeinstallprompt` fires only on Chromium. For iOS Safari: detect `navigator.standalone === false && /iPad|iPhone/.test(navigator.userAgent)` and show manual instructions drawer
- After install: hide banner, set `localStorage.pwaInstalled = true`

### ADS-02: Sponsoroitu Badge

**Placement:**
- `PaikkaKortti` (list): Small "Sponsoroitu" pill above the sport badge row. Use `bg-gray-100 text-gray-500` — explicitly NOT indigo, to be visually distinct from organic sport badges.
- Map bottom sheet (`valittu` state in `Etusivu.tsx`): Same label below venue name, before address
- Map cluster: No badge — clusters aggregate multiple venues, do not surface individual featured status

**Rendering:** `{paikka.featured && <span className="...">Sponsoroitu</span>}` — `featured` already in `Liikuntapaikka` type and DB schema (ADS-01, v1.0).

**EU Digital Services Act compliance:** Commercial content must be "clearly and unambiguously identifiable." "Sponsoroitu" is compliant Finnish terminology. Do not use "Suositellaan" (implies editorial endorsement) or "Nostettu" (ambiguous).

### AI-04: City Name in Widget

**City lookup approach (no API call):**
```typescript
function cityFromCoords(lat: number, lng: number): string {
  if (lat > 60.0 && lat < 60.5 && lng > 24.5 && lng < 25.2) return 'Helsinki'
  if (lat > 60.3 && lat < 60.7 && lng > 22.0 && lng < 22.5) return 'Turku'
  if (lat > 61.3 && lat < 61.7 && lng > 23.5 && lng < 24.1) return 'Tampere'
  return '' // do not guess for unknown cities
}
```
Display as: `"Tampere · 14°"`. If city lookup returns empty string, show just the temperature (no change from current behavior).

---

## MVP Recommendation for v1.1 Phase Ordering

**Phase 1 — Unblocks everything:**
1. LEGAL-01 (GDPR page) — 2-4 hours, static page, unblocks AUTH
2. DATA-07 (verify `kaupunki` column in DB, add city filter UI) — unblocks data expansion
3. AUTH-01 + AUTH-02 (auth modal, suosikit table, favorites UI) — core new capability

**Phase 2 — Map improvements (self-contained, no auth dependency):**
4. MAP-04 (re-center button) — 1 hour
5. MAP-05 (accuracy ring) — 2 hours
6. MAP-06 (clustering) — 1-2 days
7. MAP-07 ("Näytä kartalla" deep link) — 2-3 hours

**Phase 3 — UI polish + data:**
8. UI-05/06/07/08 (card polish, dropdown filter)
9. AI-04 (city name in widget)
10. ADS-02 (Sponsoroitu badge)
11. DATA-05/06 (Helsinki + Turku venue data import)

**Phase 4 — Infrastructure (build last, test in prod):**
12. PWA-01/02 — service worker interferes with dev mode; test in `next build && next start`
13. AUTH-03 (personalized AI) — polish feature, needs real favorites data to validate

**Never build in v1.1:** Anonymous accounts, multi-select filters, push notifications, forced login gate, immediate install prompt.

---

## Complexity Reference

| Label | Meaning |
|-------|---------|
| Low | < 1 day, no new dependencies |
| Medium | 2-5 days, may add a dependency or require new DB columns |
| High | > 1 week, architectural change or external system integration |

---

## Sources

- [Marker Clustering — Maps JavaScript API | Google for Developers](https://developers.google.com/maps/documentation/javascript/marker-clustering)
- [Custom Marker Clustering — React Google Maps (@vis.gl)](https://visgl.github.io/react-google-maps/examples/custom-marker-clustering)
- [Anonymous Sign-Ins | Supabase Docs](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Auth now supports Anonymous Sign-ins](https://supabase.com/blog/anonymous-sign-ins)
- [Making PWAs installable — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Installation prompt | web.dev](https://web.dev/learn/pwa/installation-prompt)
- [next-pwa (ducanh2912 fork) — offline fallbacks](https://ducanh-next-pwa.vercel.app/docs/next-pwa/offline-fallbacks)
- [Art. 13 GDPR — Information to be provided where personal data are collected](https://gdpr-info.eu/art-13-gdpr/)
- [EU:n tietosuoja-asetus — Tietosuojavaltuutetun toimisto](https://tietosuoja.fi/usein-kysyttya-gdpr)
- [GDPR Guide to National Implementation: Finland | White & Case](https://www.whitecase.com/insight-our-thinking/gdpr-guide-national-implementation-finland)
- [Rethinking Authentication UX — Smashing Magazine](https://www.smashingmagazine.com/2022/08/authentication-ux-design-guidelines/)
- [GeolocationCoordinates: accuracy property — MDN](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy)
- [Cluster marker — Map UI Patterns](https://mapuipatterns.com/cluster-marker/)
- [How to provide your own in-app install experience | web.dev](https://web.dev/articles/customize-install)
