---
phase: 11-pwa
reviewed: 2026-05-27T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - app/sw.ts
  - app/manifest.ts
  - app/offline/page.tsx
  - app/layout.tsx
  - next.config.mjs
  - tsconfig.json
  - scripts/generate-pwa-icons.mjs
  - .gitignore
  - app/components/Etusivu.tsx
  - lib/geo.test.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-27
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 11 adds Serwist service worker, Web App Manifest, offline fallback page, and PWA icon generation. The core architecture is sound and the security intent is correct — `/api/` exclusions are present in the custom strategies. However, a critical gap exists: the `defaultCache` imported from `@serwist/next/worker` contains its **own** `/api/` rule that caches same-origin GET requests under a `"apis"` cache with a 24-hour TTL. This rule fires **after** the custom strategies but still intercepts any `/api/` GET request not matched earlier, directly undermining the stated security invariant that Supabase auth cookies must flow unimpeded. A second critical issue is that the `tsconfig.json` `"webworker"` lib entry globally applies service-worker types to the entire project, polluting `ServiceWorkerGlobalScope` into all app-level TypeScript files.

Three warnings cover the manifest `start_url` mismatch with project routing conventions, a missing `"any"` purpose icon, and a fragile `git rev-parse` call in `next.config.mjs` that silently produces an empty revision string in CI. One warning also flags the icon script's lack of error handling around `fs.createWriteStream`, which will produce a misleading success log if the public directory does not exist.

---

## Critical Issues

### CR-01: `defaultCache` caches `/api/` GET requests — auth cookie security invariant violated

**File:** `app/sw.ts:107`
**Issue:** The file spreads `defaultCache` from `@serwist/next/worker` into `runtimeCaching` after the custom strategies. Inspection of the installed package (`node_modules/@serwist/next/dist/index.worker.mjs`) reveals that `defaultCache` contains this rule in production mode:

```js
{
  matcher: ({ sameOrigin, url: { pathname } }) =>
    sameOrigin && pathname.startsWith("/api/"),
  method: "GET",
  handler: new NetworkFirst({
    cacheName: "apis",
    plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 1440 * 60 })],
    networkTimeoutSeconds: 10
  })
}
```

Because Serwist evaluates runtime strategies in order and the custom strategies exclude `/api/` (correctly), none of them match `/api/` requests. The request then falls through to `defaultCache` where this rule **does** match and caches it. Any GET to `/api/saasuositus`, `/api/auth/callback`, or any future route is cached for 24 hours. Cached auth responses can contain stale session data; cached auth cookies are not re-sent on cache hits; and a user whose session is invalidated server-side will continue receiving cached 200 responses from a now-invalid session. The in-code comment ("NOTE: /api/ routes are explicitly excluded") is factually incorrect — exclusion only applies to the three custom entries, not to the inherited default cache.

**Fix:** Filter `defaultCache` before merging it, removing the `/api/` entry:

```ts
import { defaultCache } from "@serwist/next/worker";

// Strip the built-in /api/ caching rule — auth cookies must never be cached.
const safeDefaultCache = defaultCache.filter(entry => {
  if (typeof entry.matcher === "function") {
    // Test the matcher with a synthetic /api/ request to detect the offending entry.
    // More robustly, exclude by recognizing the cacheName "apis".
    const handler = (entry as { handler?: { cacheName?: string } }).handler;
    if (handler && (handler as { cacheName?: string }).cacheName === "apis") return false;
  }
  return true;
});

// Then use safeDefaultCache instead of defaultCache:
runtimeCaching: [...customStrategies, ...safeDefaultCache],
```

Alternatively, add an explicit `NetworkOnly` rule for `/api/` as the last custom strategy before `defaultCache`, which will win because first-match-wins order applies:

```ts
import { NetworkOnly } from "serwist";

const customStrategies = [
  // ... existing entries 1–3 ...

  // Entry 4: Block ALL /api/ routes from being cached by defaultCache's "apis" rule.
  {
    matcher: ({ url: { pathname }, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin && pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
];
```

This second approach is more defensive because it is order-independent with respect to any future `defaultCache` updates.

---

### CR-02: `"webworker"` in `tsconfig.json` `lib` poisons app-level TypeScript with SW globals

**File:** `tsconfig.json:3`
**Issue:** Adding `"webworker"` to the root `tsconfig.json` `lib` array means every `.ts` and `.tsx` file in the project — React components, server actions, API routes — receives the `ServiceWorkerGlobalScope`, `Cache`, `CacheStorage`, and all other service-worker global types. This creates two concrete problems:

1. **Type collisions:** `ServiceWorkerGlobalScope` declares `self` as `ServiceWorkerGlobalScope`, conflicting with `Window.self` in components. TypeScript may silently resolve the collision or produce confusing errors.
2. **False safety:** App code can reference SW-only globals (e.g., `caches`, `clients`) without a type error, allowing accidental service-worker API usage in React components that will crash at runtime in the browser main thread.

The `"webworker"` lib is needed only for `app/sw.ts`, not for the whole project.

**Fix:** Remove `"webworker"` from the root `tsconfig.json` and create a dedicated `app/sw.tsconfig.json` (or `tsconfig.sw.json`) that extends the root but overrides `lib` and `include`:

```json
// tsconfig.sw.json  (SW-specific, not the root tsconfig)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["esnext", "webworker"],
    "types": ["@serwist/next/typings"]
  },
  "include": ["app/sw.ts"]
}
```

Then remove `"webworker"` and `"@serwist/next/typings"` from the root `tsconfig.json` `lib`/`types` arrays. Serwist's Next.js build integration needs to be pointed at the SW-specific tsconfig; the Serwist webpack plugin respects the TypeScript config it finds for the SW entry file, so no `next.config.mjs` changes are needed for type-checking. The `declare const self: ServiceWorkerGlobalScope` in `app/sw.ts` provides the local override that makes the SW file compile correctly even without the global lib entry.

---

## Warnings

### WR-01: Manifest `start_url` violates project routing convention

**File:** `app/manifest.ts:8`
**Issue:** `start_url` is set to `"/?nakyma=lista"`. Per `CLAUDE.md`, `?nakyma=kartta` is documented as a dead parameter and the map view is the homepage at `/`. The list view is `/?nakyma=lista`. For a sports venue discovery app, launching into the list view when installed as a PWA may be intentional — but the `?nakyma=lista` parameter is functional, not dead. However, if the product intent is that the PWA should open to the map (the primary view), the `start_url` is wrong. More importantly: because `/?nakyma=lista` is not precached (only `/offline` is in `additionalPrecacheEntries`), the start URL will not be available when the device is offline and the user taps the installed PWA icon. The offline fallback fires for document requests, so the user sees the offline page immediately on cold-start — a confusing experience for an installed app.

**Fix:** Either:
- Change `start_url` to `"/"` (map view, which is precached by Serwist as the root document), or
- Add `/?nakyma=lista` to `additionalPrecacheEntries` in `next.config.mjs` alongside `/offline`.

---

### WR-02: Only `maskable` icon defined — no `"any"` purpose icon

**File:** `app/manifest.ts:13-23`
**Issue:** Both icon entries either explicitly set `purpose: "maskable"` (192px) or have no `purpose` field (512px). The W3C Web App Manifest spec treats an omitted `purpose` as equivalent to `"any"`. However, the 192px icon — which is the size browsers prefer for home-screen icons and splash screens — is declared `maskable` only. A `maskable` icon is designed to be clipped inside a "safe zone" mask shape; browsers that do not apply a mask (most desktop browsers, older Android versions) will display it as-is, but the intent is ambiguous. The real risk: if the generated icon has important content outside the inner 80% safe zone, it will be visually cropped on Android adaptive-icon devices. The current placeholder is a solid fill so cropping is harmless, but once real art is added the single `maskable` declaration for 192px will clip logos that bleed to the edge.

**Fix:** Add a dedicated `"any"` purpose entry for 192px alongside the maskable one:

```ts
icons: [
  {
    src: '/icon-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',          // unmasked, for browsers that don't use adaptive icons
  },
  {
    src: '/icon-192x192-maskable.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'maskable',     // safe-zone art for Android adaptive icons
  },
  {
    src: '/icon-512x512.png',
    sizes: '512x512',
    type: 'image/png',
  },
],
```

---

### WR-03: `spawnSync("git", ...)` in `next.config.mjs` produces empty revision on shallow clones / detached HEAD

**File:** `next.config.mjs:4-6`
**Issue:** The revision for the `/offline` precache entry is computed by running `git rev-parse HEAD`. In CI environments using shallow clones (`--depth 1`) or detached HEAD state (common in GitHub Actions, Vercel build runners), this command may return an empty string. The fallback `?? crypto.randomUUID()` only fires when `.stdout` is `null` or `undefined` — but `spawnSync` always populates `.stdout` on a non-null result; if `git` is not available or the command fails, `.stdout` is `null`, but if it exits with error code 1 (e.g., not a git repo), `.stdout` is an empty string `""`. `"".trim()` is `""`, which is falsy via `??` semantics — wait, `??` only checks for `null`/`undefined`, not empty string. Therefore `revision` becomes `""` (empty string) when `git rev-parse HEAD` fails with a non-null stdout. Serwist uses `revision` to build the precache URL; an empty string revision means the precache entry for `/offline` is `{ url: "/offline", revision: "" }` — which Serwist will treat as a pinned entry that never expires and is never updated, defeating the purpose of the revision hash.

**Fix:**

```js
const gitOut = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim();
const revision = (gitOut && gitOut.length > 0) ? gitOut : crypto.randomUUID();
```

---

### WR-04: Icon generation script has no error handling — silent partial output if `public/` missing

**File:** `scripts/generate-pwa-icons.mjs:21-23`
**Issue:** `fs.createWriteStream(outputPath)` throws synchronously if the parent directory (`public/`) does not exist. The `await PImage.encodePNGToStream(...)` call does not have a `.catch()` and the `generateIcon` function has no try/catch. An unhandled rejection will crash the Node process, but because each size is awaited sequentially (`await generateIcon(192); await generateIcon(512)`), a crash on the 192px write will produce no output yet log nothing — the script exits with a non-zero code but leaves no diagnostic message identifying which path failed.

Additionally, `PImage.encodePNGToStream` returns a Promise but the stream errors (`error` event on `fs.createWriteStream`) are not captured. Stream errors can fire after the Promise resolves, meaning a corrupt write is silently swallowed.

**Fix:**

```js
async function generateIcon(size) {
  const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true }); // ensure dir
  const img = PImage.make(size, size);
  const ctx = img.getContext("2d");
  ctx.fillStyle = "#4F46E5";
  ctx.fillRect(0, 0, size, size);
  const writeStream = fs.createWriteStream(outputPath);
  await new Promise((resolve, reject) => {
    writeStream.on("error", reject);
    PImage.encodePNGToStream(img, writeStream).then(resolve, reject);
  });
  console.log(`Generated ${outputPath}`);
}
```

---

## Info

### IN-01: Offline page uses `text-2xl` — deviates from 4-size typography system

**File:** `app/offline/page.tsx:10`
**Issue:** The `h1` uses `text-2xl font-bold` — but per `CLAUDE.md`, the project allows exactly four font sizes: `text-[10px]` (micro), `text-sm` (body), `text-xl` (subheading), and `text-3xl sm:text-4xl` (display). `text-2xl` is not in that set.

**Fix:** Change to `text-xl font-bold font-serif` (subheading tier) or `text-3xl font-bold font-serif` (display tier) depending on design intent. The serif font is appropriate for headings per project convention.

---

### IN-02: `app/layout.tsx` missing `<meta name="apple-mobile-web-app-capable">` via viewport export

**File:** `app/layout.tsx:15`
**Issue:** The metadata object sets `other: { 'mobile-web-app-capable': 'yes' }` (Chrome/Android) but not the Apple equivalent. `appleWebApp: { statusBarStyle: 'default' }` is set, which Next.js renders as `<meta name="apple-mobile-web-app-status-bar-style">`, but the `apple-mobile-web-app-capable` meta tag (`<meta name="apple-mobile-web-app-capable" content="yes">`) is not emitted. Without it, iOS Safari does not treat the app as a web app when added to the home screen and will show browser chrome (address bar, navigation bar) even after installation.

**Fix:**

```ts
export const metadata: Metadata = {
  // ...existing fields...
  appleWebApp: {
    capable: true,           // emits <meta name="apple-mobile-web-app-capable" content="yes">
    statusBarStyle: 'default',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}
```

---

### IN-03: `public/sw.js` is git-ignored but `public/sw.js.map` source map is also ignored — no source map in production

**File:** `.gitignore:39-41`
**Issue:** Both `public/sw.js` and `public/sw.js.map` are correctly excluded from git (they are build artifacts). However, if the deployment pipeline relies on the git checkout to populate `public/`, the source map will be absent in production. This is not a bug in itself, but it means SW errors in production Sentry / DevTools will show minified stack traces with no resolution path. This is an operational quality issue.

**Fix:** Ensure the CI/CD build step runs before asset upload (standard for Vercel/Next.js deploys — Vercel builds from source, so this is typically a non-issue). No code change needed; document in deployment runbook.

---

_Reviewed: 2026-05-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
