import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
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

// Custom runtime strategies — order matters, first match wins
const customStrategies = [
  // Entry 1: RSC prefetch (link hover) — StaleWhileRevalidate for speed
  {
    matcher: ({
      request,
      url: { pathname },
      sameOrigin,
    }: {
      request: Request;
      url: URL;
      sameOrigin: boolean;
    }) =>
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc-prefetch",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24h
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // Entry 2: RSC navigation (link click) — StaleWhileRevalidate
  {
    matcher: ({
      request,
      url: { pathname },
      sameOrigin,
    }: {
      request: Request;
      url: URL;
      sameOrigin: boolean;
    }) =>
      request.headers.get("RSC") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24h
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // Entry 3: Listing page document — NetworkFirst, 24h TTL (D-05, D-06, D-07)
  // NOTE: /api/ routes are explicitly excluded — Supabase auth cookies must flow unimpeded
  {
    matcher: ({
      url,
      sameOrigin,
    }: {
      url: URL;
      sameOrigin: boolean;
    }) =>
      sameOrigin &&
      url.pathname === "/" &&
      url.searchParams.get("nakyma") === "lista",
    handler: new NetworkFirst({
      cacheName: "listing-page",
      networkTimeoutSeconds: 10,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 24 * 60 * 60, // 24h — D-07
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
    ignoreURLParametersMatching: [/^_rsc$/], // D-03: ignore _rsc param on precache lookups
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
