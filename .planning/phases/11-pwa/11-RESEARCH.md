# Phase 11: PWA - Research

**Researched:** 2026-05-27
**Domain:** Progressive Web Apps — Serwist service worker, Web App Manifest, Next.js 14 App Router integration
**Confidence:** HIGH (core Serwist + Next.js metadata API verified against official docs; icon generation approach verified against pureimage README)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Library is Serwist (`@serwist/next` + `serwist`) — next-pwa and @ducanh2912/next-pwa are abandoned, do not use.
- **D-02:** Service worker is disabled in dev mode (`disable: process.env.NODE_ENV === 'development'`).
- **D-03:** Service worker filters out `_rsc` requests (Next.js RSC requests) so client-side navigation does not break.
- **D-04:** `next dev` (not `--turbo`) — Serwist requires webpack.
- **D-05:** Cache target: only the listing view (`/?nakyma=lista`). Home page (/) and profile pages are not in offline scope this phase.
- **D-06:** Navigation strategy: **NetworkFirst** for the listing view — user gets fresh data when online; falls back to cache only offline.
- **D-07:** Cache expiry: 24 hours — snapshots older than 24h are dropped and the offline page is shown instead.
- **D-08:** Static assets (`/_next/static/**`): **precached** at SW install with CacheFirst + 1-year TTL (Next.js content-hash guarantees overwrite on new builds).
- **D-09:** Android: browser-native A2HS banner/mini-infobar is sufficient — no custom `beforeinstallprompt` UI.
- **D-10:** iOS: no install instructions — users find Share → Add to Home Screen themselves.
- **D-11:** Manifest `display: "standalone"` — installed version looks native without browser address bar.
- **D-12:** All pages outside cache scope get a custom `/offline` page when offline (not browser native error, not a redirect).
- **D-13:** `/offline` page is precached at SW install — always available offline.
- **D-14:** `/offline` content: minimal — logo + Finnish message "Ei verkkoyhteyttä. Tarkista yhteys ja yritä uudelleen." + "Yritä uudelleen" button. Follows `app/not-found.tsx` structure and glassmorphism design.
- **D-15:** Icons are placeholders — real brand icons done later.
- **D-16:** Placeholder icons generated programmatically: simple indigo square (#4F46E5) in two sizes: `public/icon-192x192.png` and `public/icon-512x512.png`. Script: `scripts/generate-pwa-icons.mjs` using pureimage (devDep).
- **D-17:** Manifest references icons, `theme_color: "#4F46E5"`, `background_color: "#ffffff"`.

### Claude's Discretion

None defined — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)

- Real brand icons (name/logo not decided yet)
- Home page (/) offline support (Google Maps requires network anyway)
- Profile pages (`/paikat/[id]`) runtime caching
- iOS install instructions tooltip/banner
- Custom Android install prompt UI
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | App works at basic level offline (service data shows without network) | NetworkFirst with 24h TTL + offline fallback page covers this. Precached `/?nakyma=lista` document + precached `/_next/static` assets enable a cached listing render. |
| PWA-02 | User can add app to home screen (Web App Manifest + install prompt) | `app/manifest.ts` + `display: "standalone"` + 192/512 icons meets Chrome installability criteria. `viewport` export with `themeColor` covers iOS/Android visual polish. |
</phase_requirements>

---

## Summary

Phase 11 makes Liikuntahakemisto installable and partially offline-capable by adding a Web App Manifest and a Serwist-powered service worker. The scope is deliberately narrow: only the listing view (`/?nakyma=lista`) is cached for offline use; the map (/) and profile pages remain network-only.

Serwist 9.5.11 is the current stable release (published 2026-05-03). The integration pattern for Next.js 14 App Router is well-documented and straightforward: `withSerwist()` wraps the existing empty `next.config.mjs`, `app/sw.ts` holds all caching logic, and `app/manifest.ts` uses the Next.js file-convention pattern to generate the manifest at build time (no manual `<link>` tag needed).

The key gotcha in Next.js App Router + Serwist is RSC request handling. Next.js client-side navigation sends fetch requests with `RSC: 1` and `Next-Router-Prefetch: 1` headers. If these requests are intercepted by a NetworkFirst strategy that fails offline, navigation breaks. The standard mitigation is to handle RSC requests separately with StaleWhileRevalidate (fast, offline-safe) and to add `precacheOptions.ignoreURLParametersMatching: [/^_rsc$/]` so the `_rsc` query parameter does not create duplicate precache misses.

The Supabase middleware runs on every non-static request and sets auth cookies. Service workers that cache navigation responses risk caching pages with stale `Set-Cookie` headers. Mitigation: exclude `/api/` routes from all caching strategies, and avoid caching authenticated responses that contain `Set-Cookie`. The listing page is publicly accessible (no auth gate), so caching it is safe. The SW must not cache responses from routes that set `sb-*` Supabase auth cookies.

**Primary recommendation:** Follow the standard Serwist Next.js pattern exactly as documented — `app/sw.ts` with `defaultCache` spread alongside custom RSC and listing-page strategies, `app/manifest.ts` via Next.js file convention, and `viewport` export in `app/layout.tsx` for `themeColor`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Web App Manifest | Frontend Server (SSR) | — | `app/manifest.ts` file convention; Next.js serves it at `/manifest.webmanifest` |
| Service worker registration | Browser / Client | Frontend Server (build) | Serwist auto-registers via `@serwist/window`; webpack compiles `app/sw.ts` → `public/sw.js` |
| Precache (static assets) | Browser / Client | CDN / Static | SW installs at `/_next/static/**` from `__SW_MANIFEST`; content-hash-safe |
| Runtime cache (listing page) | Browser / Client | — | NetworkFirst strategy in sw.ts intercepts navigation fetches |
| Offline fallback | Browser / Client | — | `setCatchHandler` / `fallbacks.entries` in sw.ts serves precached `/offline` |
| `themeColor` / `viewport` meta | Frontend Server (SSR) | — | `export const viewport: Viewport` in `app/layout.tsx` |
| Icon generation script | Build / Scripting | — | `scripts/generate-pwa-icons.mjs` runs before build; output goes to `public/` |
| RSC request handling | Browser / Client | — | SW intercepts RSC-header fetches; StaleWhileRevalidate keeps them offline-safe |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@serwist/next` | 9.5.11 | `withSerwist()` webpack plugin + SW auto-registration | Official Serwist Next.js adapter; replaces abandoned next-pwa |
| `serwist` | 9.5.11 | `Serwist`, `NetworkFirst`, `CacheFirst`, `StaleWhileRevalidate`, `ExpirationPlugin` | Core service worker runtime; unified import surface |

Both packages publish together on the same version cadence; always install matching versions.

### Supporting (devDependency)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pureimage` | 0.4.18 | Programmatic PNG generation — no native bindings | Icon generation script only; pure JS, works without Cairo/libpng system deps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pureimage` | `canvas` (npm) | `canvas` needs Cairo native bindings — requires system library install; `pureimage` is pure JS and works anywhere Node.js does |
| `pureimage` | `sharp` | `sharp` needs native libvips bindings; same problem as canvas but more common in production image pipelines |
| `app/manifest.ts` (file convention) | `public/manifest.webmanifest` (static) | Static file in public/ works but loses TypeScript validation; file convention is the Next.js 14 idiomatic approach |

**Installation:**

```bash
npm install @serwist/next serwist
npm install --save-dev pureimage
```

**Version verification (confirmed):**

```
npm view @serwist/next version  → 9.5.11  (published 2026-05-03)
npm view serwist version        → 9.5.11  (published 2026-05-03)
npm view pureimage version      → 0.4.18  (published 2024-09-23)
```

---

## Package Legitimacy Audit

All three packages were audited with `slopcheck` (scan returned [OK] for all three) and verified against npm registry.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@serwist/next` | npm | ~2 yrs (Serwist fork of next-pwa) | Active, well-known | github.com/serwist/serwist | [OK] | Approved |
| `serwist` | npm | ~2 yrs | Active, well-known | github.com/serwist/serwist | [OK] | Approved |
| `pureimage` | npm | ~10 yrs (joshmarinacci) | Niche but legitimate | github.com/joshmarinacci/node-pureimage | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request
      │
      ▼
  Service Worker (public/sw.js, compiled from app/sw.ts)
      │
      ├── /_next/static/** → CacheFirst (precache manifest)
      │        └── hits: cache → return immediately
      │
      ├── RSC prefetch (RSC:1 + Next-Router-Prefetch:1 header)
      │        └── StaleWhileRevalidate → "pages-rsc-prefetch" cache
      │
      ├── RSC navigation (RSC:1 header, no prefetch header)
      │        └── StaleWhileRevalidate → "pages-rsc" cache
      │
      ├── /?nakyma=lista (document navigation)
      │        └── NetworkFirst (24h TTL) → "listing-page" cache
      │              ├── online: network → cache → return
      │              └── offline: cache → return (or offline fallback)
      │
      ├── /api/** → NOT cached (pass-through to network)
      │        └── Supabase auth cookies flow unimpeded
      │
      └── everything else (/ , /paikat/[id], /suosikit …)
               └── networkFirst from defaultCache, or
                   offline → /offline fallback page
                            (precached at install)

app/manifest.ts  →  served at /manifest.webmanifest
app/layout.tsx   →  viewport export → <meta name="theme-color">
public/icon-192x192.png  ← generated by scripts/generate-pwa-icons.mjs
public/icon-512x512.png  ← generated by scripts/generate-pwa-icons.mjs
public/sw.js             ← webpack build output from app/sw.ts (gitignored)
```

### Recommended Project Structure

```
app/
├── sw.ts                    # Service worker source (compiled to public/sw.js)
├── manifest.ts              # Web App Manifest (Next.js file convention)
├── layout.tsx               # Add viewport export here (themeColor)
└── offline/
    └── page.tsx             # Offline fallback page (server component)
public/
├── icon-192x192.png         # Generated by scripts/; gitignored is fine
├── icon-512x512.png         # Generated by scripts/; gitignored is fine
└── sw.js                    # Webpack output; MUST be gitignored
scripts/
└── generate-pwa-icons.mjs   # One-shot icon generation script
next.config.mjs              # Wrapped with withSerwist()
.gitignore                   # Add: public/sw* and public/swe-worker*
tsconfig.json                # Add: types @serwist/next/typings, lib webworker, exclude public/sw.js
```

### Pattern 1: `next.config.mjs` — `withSerwist` Wrapper

**What:** Wraps the existing empty Next.js config with the Serwist webpack plugin. The plugin compiles `app/sw.ts` → `public/sw.js` and injects `__SW_MANIFEST` with the precache manifest.

**When to use:** Always — this is the entry point for all Serwist features.

```javascript
// Source: https://serwist.pages.dev/docs/next/getting-started [VERIFIED: official Serwist docs]
import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,  // prevent discarding user state on reconnect
  additionalPrecacheEntries: [{ url: "/offline", revision }],
});

export default withSerwist({
  // existing nextConfig — currently empty
});
```

**Key option notes:** [VERIFIED: official Serwist docs]
- `disable: process.env.NODE_ENV === 'development'` — locked in D-02; avoids dev cache poisoning
- `reloadOnOnline: false` — prevents forced reload when user reconnects (would discard form state)
- `additionalPrecacheEntries` — ensures `/offline` is in the precache manifest so it survives SW install
- `cacheOnNavigation` is NOT used — the listing-page NetworkFirst strategy handles caching explicitly

### Pattern 2: `app/sw.ts` — Complete Service Worker

**What:** The full service worker source. Handles precaching, runtime caching strategies, RSC exclusion, and offline fallback.

```typescript
// Source: https://serwist.pages.dev/docs/next/getting-started + community patterns
// [VERIFIED: official Serwist docs for core structure; CITED for RSC pattern]
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Custom runtime strategies layered BEFORE defaultCache
const customStrategies = [
  // RSC prefetch requests (triggered on link hover) — StaleWhileRevalidate for speed
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc-prefetch",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // RSC navigation requests (triggered on link click) — StaleWhileRevalidate
  {
    matcher: ({ request, url: { pathname }, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
      request.headers.get("RSC") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // Listing page document — NetworkFirst for freshness, 24h TTL as fallback (D-06, D-07)
  {
    matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin &&
      url.pathname === "/" &&
      url.searchParams.get("nakyma") === "lista",
    handler: new NetworkFirst({
      cacheName: "listing-page",
      networkTimeoutSeconds: 10,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 24 * 60 * 60,
          maxAgeFrom: "last-fetched",
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/^_rsc$/],  // D-03: ignore _rsc param on precache lookups
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...customStrategies, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }: { request: Request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

### Pattern 3: `app/manifest.ts` — Web App Manifest (Next.js file convention)

**What:** Next.js 14 App Router serves `app/manifest.ts` at `/manifest.webmanifest` automatically. TypeScript validation via `MetadataRoute.Manifest`.

**When to use:** Always for Next.js 14 App Router projects. Do NOT put the manifest in `public/` — the file convention is the idiomatic approach. [VERIFIED: nextjs.org official docs]

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
// [VERIFIED: official Next.js docs, verified 2026-05-19]
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liikuntahakemisto",
    short_name: "Liikunta",
    description: "Löydä liikuntapaikat läheltäsi",
    start_url: "/?nakyma=lista",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4F46E5",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
```

**Note on `start_url`:** Setting `/?nakyma=lista` means the installed PWA opens directly to the listing view, which is the offline-capable page. This is the correct UX choice given offline scope. [ASSUMED — architectural decision based on project constraints, not mandated by docs]

### Pattern 4: `app/layout.tsx` — `viewport` export

**What:** Next.js 14.0.0+ requires `themeColor` to be in a `viewport` export, not in `metadata`. Both cannot coexist on the same route; `viewport` is the current API. [VERIFIED: nextjs.org official docs, v14.0.0]

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
// [VERIFIED: official Next.js docs, verified 2026-05-19]
import type { Viewport } from "next";

// Add alongside existing metadata export in app/layout.tsx
export const viewport: Viewport = {
  themeColor: "#4F46E5",
};
```

The existing `export const metadata: Metadata` block stays unchanged. Add `metadata.manifest` to link the manifest file — though in Next.js App Router the manifest file convention auto-links it; the `metadata.manifest` field is for explicit overrides. [ASSUMED — needs validation that file-convention auto-link is sufficient without explicit metadata.manifest]

### Pattern 5: `scripts/generate-pwa-icons.mjs` — Icon Generation

**What:** One-shot script using pureimage (pure JS, no native deps) to generate indigo placeholder icons.

```javascript
// Source: https://github.com/joshmarinacci/node-pureimage/blob/master/README.md
// [VERIFIED: official pureimage README]
import * as PImage from "pureimage";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

async function generateIcon(size) {
  const img = PImage.make(size, size);
  const ctx = img.getContext("2d");
  ctx.fillStyle = "#4F46E5"; // indigo-600 — matches theme_color
  ctx.fillRect(0, 0, size, size);
  const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
  await PImage.encodePNGToStream(img, fs.createWriteStream(outputPath));
  console.log(`Generated ${outputPath}`);
}

await generateIcon(192);
await generateIcon(512);
```

Run once: `node scripts/generate-pwa-icons.mjs`

### Pattern 6: `tsconfig.json` — Required Changes

```json
{
  "compilerOptions": {
    "types": ["@serwist/next/typings"],
    "lib": ["dom", "dom.iterable", "esnext", "webworker"]
  },
  "exclude": ["node_modules", "public/sw.js"]
}
```

`"webworker"` must be added to `lib` — it exposes `ServiceWorkerGlobalScope`, `self`, and other SW globals. `public/sw.js` must be excluded or TypeScript will try to type-check the compiled output. [VERIFIED: official Serwist docs]

### Pattern 7: `.gitignore` — SW Output Files

```
# Serwist compiled output
public/sw.js
public/sw.js.map
public/swe-worker*
```

These are build artifacts regenerated on every `next build`. [VERIFIED: official Serwist docs]

### Anti-Patterns to Avoid

- **Putting `manifest.json` in `public/`:** Works but bypasses TypeScript validation and the Next.js file convention. Use `app/manifest.ts` instead.
- **Setting `metadata.themeColor` in `app/layout.tsx`:** Deprecated since Next.js 14.0.0. Use `export const viewport: Viewport = { themeColor: ... }` instead — they cannot coexist.
- **Using `navigationPreload: true` without awareness of the preload rejection bug:** In Serwist < 9.x, `await event.preloadResponse` rejected when offline, breaking precache fallback. The current 9.5.11 includes the fix. Keep `navigationPreload: true` (it improves performance) but be aware that the `/offline` fallback path tests for this.
- **Caching `/api/` routes:** API routes with Supabase auth set `sb-*` cookies. Caching these responses risks serving a stale auth cookie or leaking a session token. Always exclude `/api/` from all caching strategies.
- **Using `--turbo` dev flag:** Serwist's webpack plugin is incompatible with Turbopack. Use `next dev` without `--turbo` during any SW testing. [VERIFIED: Serwist docs D-04 locked]
- **Letting the `_rsc` query parameter poison the precache:** Without `ignoreURLParametersMatching: [/^_rsc$/]`, a hard-navigated page and its RSC-param variant look like different entries — the precache misses and falls through to the network. Add the option to `precacheOptions`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker compilation + precache manifest | Custom webpack plugin or manual SW | `@serwist/next` `withSerwist()` | Manifest injection, revision hashing, chunk tracking, SW registration — all handled; hand-rolling creates stale cache bugs |
| RSC request detection | Guessing URL patterns | `request.headers.get("RSC") === "1"` header check | `_rsc` URL param is ephemeral; the `RSC` header is the authoritative signal |
| Cache expiry enforcement | `setTimeout` or manual IndexedDB | `ExpirationPlugin` from `serwist` | ExpirationPlugin uses IndexedDB + LRU eviction; hand-rolled TTL logic has edge cases with quota exhaustion |
| PNG icon generation without native libs | Writing raw PNG bytes | `pureimage` | PNG format includes CRC32 checksums, deflate compression — pure-JS lib handles this correctly |
| Manifest link in `<head>` | Manual `<link rel="manifest">` | `app/manifest.ts` file convention | Next.js injects the link automatically; manual injection can double-up |

**Key insight:** Service worker caching has subtle correctness requirements (cache busting, quota management, preload race conditions). Use Serwist as the runtime and let `@serwist/next` handle build-time concerns — do not bypass either layer.

---

## Common Pitfalls

### Pitfall 1: `themeColor` in `metadata` (deprecated)

**What goes wrong:** TypeScript does not error, but Next.js 14 emits a warning and may silently ignore the value. The `<meta name="theme-color">` tag may not appear in the rendered HTML.

**Why it happens:** Next.js 14.0.0 split `themeColor` out of `Metadata` into `Viewport`. Old tutorials still show `metadata.themeColor`.

**How to avoid:** Export `viewport: Viewport` separately from `metadata`. Both exports can coexist in `app/layout.tsx`.

**Warning signs:** `Warning: themeColor is deprecated, use viewport.themeColor instead` in build output.

### Pitfall 2: Service worker not updating on rebuild

**What goes wrong:** User visits the updated app but the SW still serves old cached assets.

**Why it happens:** `skipWaiting: true` activates the new SW immediately, but if `cleanupOutdatedCaches: true` is not set in `precacheOptions`, the old precache entries persist alongside the new ones.

**How to avoid:** Always set `precacheOptions.cleanupOutdatedCaches: true`. The git-revision-based `additionalPrecacheEntries` revision ensures the `/offline` page is invalidated on each deploy.

**Warning signs:** Old content visible after a hard-refresh on a fresh deploy.

### Pitfall 3: `_rsc` query parameter creates cache mismatches

**What goes wrong:** After SW activation, user navigates to `/?nakyma=lista`. Next.js client-side navigation appends `?_rsc=<hash>` internally. The precache lookup for `/` finds no match (because `/?_rsc=abc123 !== /`) and falls through to network — no offline support.

**Why it happens:** By default Serwist only strips `utm_*` and `fbclid` from precache URL matching. The `_rsc` param is project-specific and must be explicitly ignored.

**How to avoid:** Set `precacheOptions.ignoreURLParametersMatching: [/^_rsc$/]` in the `Serwist` constructor. Also note: the main offline-cache path is the **document navigation** NetworkFirst strategy (triggered by browser navigation to `/?nakyma=lista`), not precache lookup — so this mainly matters for precached entries.

**Warning signs:** Offline test passes on direct URL entry but fails on in-app navigation back to the listing.

### Pitfall 4: SW active in development, poisoning local cache

**What goes wrong:** During development, an active SW caches responses. When you change code, the browser serves stale SW-cached content and changes don't appear.

**Why it happens:** SW registered without `disable: process.env.NODE_ENV === 'development'`.

**How to avoid:** Always include `disable: process.env.NODE_ENV === 'development'` in `withSerwistInit`. Never run `next dev --turbo` when testing SW — Serwist requires webpack.

**Warning signs:** Code changes not appearing in browser even after hard refresh; "Service Worker" shown as source in DevTools Network tab.

### Pitfall 5: `/offline` not precached → offline fallback fails

**What goes wrong:** When user goes offline and hits an uncached page, the SW's `fallbacks` handler tries to return `/offline` but `/offline` is not in the cache — throws a SerwistError, browser shows generic network error.

**Why it happens:** The fallback URL must be in `additionalPrecacheEntries` in `next.config.mjs` AND match the URL in `fallbacks.entries`. Both must be `/offline` (or whichever path is used consistently).

**How to avoid:** Set `additionalPrecacheEntries: [{ url: '/offline', revision }]` in `withSerwistInit`. Confirm `fallbacks.entries[0].url` in `sw.ts` is identical.

**Warning signs:** Offline test shows browser generic error instead of the custom `/offline` page.

### Pitfall 6: Supabase auth cookie leaks through cached pages

**What goes wrong:** A signed-in user's page response (containing `sb-*` auth cookies in `Set-Cookie`) is cached by the SW. Another user on the same device (shared device scenario) or a reused cache entry serves the wrong user's session.

**Why it happens:** Service workers cache complete HTTP responses including headers. If a page is cached while the user is signed in, the `Set-Cookie` header is stored.

**How to avoid:** The listing page (`/?nakyma=lista`) is publicly accessible without auth — no `Set-Cookie` from Supabase middleware on anonymous requests. Additionally, exclude `/api/` routes from all caching strategies. The Supabase middleware only sets cookies on routes the middleware matches; `public/sw.js` and `public/*.png` are explicitly excluded from the middleware matcher, so no auth headers flow there.

**Warning signs:** User session unexpectedly persisting after sign-out; DevTools cache showing `Set-Cookie` in cached responses.

---

## Code Examples

### ExpirationPlugin with NetworkFirst (verified pattern)

```typescript
// Source: https://serwist.pages.dev/docs/serwist/runtime-caching/plugins/expiration-plugin
// [VERIFIED: official Serwist docs]
import { NetworkFirst, ExpirationPlugin } from "serwist";

new NetworkFirst({
  cacheName: "listing-page",          // cacheName required by ExpirationPlugin
  networkTimeoutSeconds: 10,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 4,
      maxAgeSeconds: 24 * 60 * 60,   // 24 hours — matches D-07
      maxAgeFrom: "last-fetched",    // age measured from when data was fetched, not accessed
    }),
  ],
});
```

**ExpirationPlugin requirement:** `cacheName` must be set on the Strategy. Cannot use with the default runtime cache name. [VERIFIED: official Serwist docs]

### `viewport` export in `app/layout.tsx` (verified pattern)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
// [VERIFIED: official Next.js docs, lastUpdated: 2026-05-19]
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Liikuntahakemisto",
  description: "Löydä liikuntapaikat läheltäsi Tampereella",
  // manifest is auto-linked by app/manifest.ts file convention
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};
```

### SW registration (handled automatically by `@serwist/next`)

No manual `navigator.serviceWorker.register()` call is needed. `withSerwist()` injects a registration script automatically via `@serwist/window`. [VERIFIED: official Serwist docs]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-pwa` (npm) | Serwist (`@serwist/next`) | 2023 — maintainer fork + rewrite | next-pwa abandoned; Serwist is the active maintained successor |
| `metadata.themeColor` | `export const viewport: Viewport = { themeColor }` | Next.js 14.0.0 | Old approach still works but emits deprecation warnings |
| `public/manifest.json` (static) | `app/manifest.ts` (file convention) | Next.js 13.3.0 App Router | TypeScript validation, auto-linkage via framework |
| Manual `<link rel="manifest">` in `<head>` | No manual tag — file convention auto-injects | Next.js 13.3.0 App Router | Eliminates duplication; framework owns the meta tag |
| `workbox` direct import | `serwist` unified import | Serwist v9 (2024) | Serwist re-exports all Workbox strategies under its own namespace; import from `"serwist"` not `"workbox-*"` |

**Deprecated/outdated:**
- `next-pwa` and `@ducanh2912/next-pwa`: Do not use. Not maintained. (D-01 locked)
- Importing `NetworkFirst` from `"workbox-strategies"`: Use `"serwist"` instead — Serwist re-exports the entire Workbox strategy surface.
- `metadata.themeColor`: Deprecated in Next.js 14.0.0. Use `viewport.themeColor`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `start_url: "/?nakyma=lista"` is the right PWA entry point for installability | Pattern 3 (manifest) | If wrong start_url, Chrome may not show install prompt or PWA opens to wrong page; easily fixed by changing one field |
| A2 | `app/manifest.ts` file convention auto-links the manifest without `metadata.manifest` field | Pattern 4 (layout) | If auto-link is insufficient, `/manifest.webmanifest` 404s and install fails; mitigation: add explicit `metadata.manifest = '/manifest.webmanifest'` |
| A3 | The listing page (`/?nakyma=lista`) does not set `Set-Cookie` for anonymous users | Pitfall 6 | If Supabase middleware sets cookies on anonymous requests to the listing page, caching it risks auth state issues; verify in DevTools |
| A4 | `navigationPreload: true` is safe in Serwist 9.5.11 (bug fixed from earlier versions) | Pattern 2 (sw.ts) | If bug persists, offline fallback may not trigger; mitigation: set to `false` if offline tests fail unexpectedly |

---

## Open Questions (RESOLVED)

1. **`start_url` and installability**
   - What we know: Chrome requires `start_url` to be same-origin as the manifest.
   - What's unclear: Whether `/?nakyma=lista` as `start_url` satisfies Chrome's installability check — some browsers parse query strings strictly.
   - Recommendation: Use `"/?nakyma=lista"` as planned; verify in Chrome DevTools → Application → Manifest during execution.
   - RESOLVED: Use `start_url: "/?nakyma=lista"`; verify Chrome installability in DevTools → Application → Manifest during execution.

2. **`app/manifest.ts` — does Next.js auto-add `<link rel="manifest">`?**
   - What we know: The official Next.js docs show `app/manifest.ts` as the pattern without mentioning `metadata.manifest`.
   - What's unclear: Whether the framework injects the `<link>` tag automatically or requires `metadata.manifest` to point to it.
   - Recommendation: Add `metadata.manifest = '/manifest.webmanifest'` explicitly to `layout.tsx` metadata as a safety measure. It is a no-op if the framework already injects it.
   - RESOLVED: Add explicit `metadata.manifest = '/manifest.webmanifest'` as safety measure (done in Plan 03 Task 2).

3. **`appleWebApp` metadata — needed for iOS?**
   - What we know: The Serwist getting-started example shows `appleWebApp: { capable: true, statusBarStyle: 'default', title: ... }` in metadata.
   - What's unclear: Whether this meaningfully affects iOS A2HS behavior for this app; D-10 defers iOS instructions entirely.
   - Recommendation: Include `appleWebApp: { capable: true, statusBarStyle: 'default' }` as it costs nothing and enables better iOS standalone behavior.
   - RESOLVED: Include `appleWebApp: { capable: true, statusBarStyle: 'default' }` in layout.tsx metadata (done in Plan 03 Task 2).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `scripts/generate-pwa-icons.mjs` | ✓ | 24.15.0 | — |
| `next dev` (no `--turbo`) | SW testing in dev | ✓ | 14.2.35 | — |
| Git (for revision hash) | `next.config.mjs` revision calc | ✓ (assumed) | — | `crypto.randomUUID()` fallback in config |
| `pureimage` (to be installed) | icon generation script | ✗ (not yet installed) | 0.4.18 | No native fallback — must install |

**Missing dependencies with no fallback:**
- `@serwist/next`, `serwist`, `pureimage` — not yet installed; Wave 0 task must install them.

**Missing dependencies with fallback:**
- Git binary for revision: `spawnSync("git", ["rev-parse", "HEAD"])` returns `null` on failure; config has `?? crypto.randomUUID()` fallback.

---

## Validation Architecture

`nyquist_validation` is enabled (config.json: `workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 (already installed as devDependency) |
| Config file | none detected — Wave 0 must add `vitest.config.ts` if not present |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| PWA-01 | Listing page document cached offline | manual-only | — | Requires browser DevTools offline simulation; cannot automate offline SW behavior in Vitest |
| PWA-01 | `/offline` page renders correctly | smoke (manual) | — | Visual check in browser offline mode |
| PWA-02 | `app/manifest.ts` exports valid manifest shape | unit | `npx vitest run --reporter=verbose` | Can unit-test the manifest() function output |
| PWA-02 | Icon files exist at expected paths | unit | `npx vitest run` | File existence check after running generate script |
| PWA-02 | `viewport.themeColor` is `#4F46E5` | unit | `npx vitest run` | Import and assert |
| PWA-02 | Chrome installability | manual-only | — | DevTools → Application → Manifest → "Add to homescreen" test |

### Sampling Rate

- **Per task commit:** `npx vitest run` (unit tests only)
- **Per wave merge:** `npx vitest run` + manual offline smoke test in Chrome DevTools
- **Phase gate:** Full Vitest suite green + manual PWA installability check + manual offline listing check

### Wave 0 Gaps

- [ ] Vitest config file (`vitest.config.ts`) — check if present; create if missing
- [ ] `tests/pwa/manifest.test.ts` — unit tests for `manifest()` return shape (name, icons, display, theme_color)
- [ ] `tests/pwa/icons.test.ts` — file existence check for `public/icon-192x192.png` and `public/icon-512x512.png`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth flows added |
| V3 Session Management | yes (indirectly) | Service worker must not cache responses with `Set-Cookie`; `/api/` excluded from all strategies |
| V4 Access Control | no | Listing page is public; no auth gate |
| V5 Input Validation | no | SW is a client-side cache layer only |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns for Service Workers

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Caching `Set-Cookie` auth responses | Information Disclosure | Exclude `/api/` from all runtime caching strategies; verify listing page returns no `Set-Cookie` for anonymous users |
| SW scope too broad (intercepts unintended origins) | Tampering | SW scope defaults to root `/`; acceptable since all routes are same-origin |
| Stale content served to wrong user | Information Disclosure | `skipWaiting + clientsClaim` activates new SW immediately; `cleanupOutdatedCaches` removes stale entries; short TTLs |
| Icon generation script with network side-effects | Tampering | `scripts/generate-pwa-icons.mjs` is pure local file generation; no network calls, no postinstall hooks |

---

## Sources

### Primary (HIGH confidence)
- [Serwist @serwist/next Getting Started](https://serwist.pages.dev/docs/next/getting-started) — complete integration pattern, sw.ts structure, tsconfig changes, manifest example
- [Serwist — ExpirationPlugin API](https://serwist.pages.dev/docs/serwist/runtime-caching/plugins/expiration-plugin) — constructor options, cacheName requirement, TypeScript examples
- [Serwist — Serwist constructor API](https://serwist.pages.dev/docs/serwist/core/serwist) — precacheOptions, ignoreURLParametersMatching, fallbacks
- [Serwist — NavigationRoute](https://serwist.pages.dev/docs/serwist/runtime-caching/routing/navigation-route) — NavigationRoute denylist pattern
- [Serwist — NetworkFirst](https://serwist.pages.dev/docs/serwist/runtime-caching/caching-strategies/network-first) — strategy options, networkTimeoutSeconds
- [Serwist — Precaching guide](https://serwist.pages.dev/docs/serwist/guide/precaching) — ignoreURLParametersMatching, cleanupOutdatedCaches behavior
- [Serwist — cacheOnNavigation](https://serwist.pages.dev/docs/next/configuring/cache-on-navigation) — what it does, when to use it
- [Next.js — manifest.json file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) — static vs generated manifest, MetadataRoute.Manifest type (verified lastUpdated: 2026-05-19)
- [Next.js — generateViewport API](https://nextjs.org/docs/app/api-reference/functions/generate-viewport) — themeColor deprecation from metadata, Viewport type, introduced Next.js 14.0.0 (verified lastUpdated: 2026-05-19)
- [Chrome for Developers — PWA installability](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest) — required manifest fields, icon sizes
- [pureimage README](https://github.com/joshmarinacci/node-pureimage/blob/master/README.md) — `PImage.make`, `encodePNGToStream`, API pattern

### Secondary (MEDIUM confidence)
- [DEV.to: Building Offline Apps with Next.js and Serwist](https://dev.to/sukechris/building-offline-apps-with-nextjs-and-serwist-2cbj) — RSC header matching pattern, `reloadOnOnline: false` recommendation
- [locallytools.com: Build Offline App with Next.js and Serwist](https://locallytools.com/blog/build-offline-app-with-nextjs-and-serwist) — complete sw.ts with RSC strategies, offline fallback via `fallbacks.entries`
- [Serwist issue #173](https://github.com/serwist/serwist/issues/173) — `navigationPreload` offline bug report; patched in 9.x
- [Serwist discussion #194](https://github.com/serwist/serwist/discussions/194) — precache offline issue; root cause: `navigationPreload` preloadResponse rejection
- [Serwist discussion #205](https://github.com/serwist/serwist/discussions/205) — `ignoreURLParametersMatching: [/.*/]` workaround for router-based navigation

### Tertiary (LOW confidence)
- Community patterns for RSC StaleWhileRevalidate strategies — confirmed independently by multiple sources (DEV.to, locallytools, Medium) but not in official Serwist docs

---

## Metadata

**Confidence breakdown:**
- Standard stack (@serwist/next, serwist): HIGH — verified against official Serwist docs and npm registry
- Next.js manifest/viewport API: HIGH — verified against official Next.js docs (lastUpdated: 2026-05-19)
- RSC request exclusion pattern: MEDIUM — confirmed by multiple community sources, consistent with official Serwist API; not in official docs as a named pattern
- pureimage icon generation: HIGH — verified against official README
- Supabase auth + SW interaction: MEDIUM — no Serwist-specific Supabase docs; derived from general "don't cache Set-Cookie" principle

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (Serwist 9.x is stable; Next.js 14 manifest API is stable)
