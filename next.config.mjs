import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from 'next-intl/plugin'

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  additionalPrecacheEntries: [{ url: "/offline", revision }],
});

export default withNextIntl(withSerwist({
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
    outputFileTracingIncludes: {
      'app/api/business/analyze-website/route': ['./node_modules/@sparticuz/chromium/bin/**'],
    },
  },
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'query', key: 'nakyma', value: 'lista' }],
        destination: '/',
        permanent: true,
      },
    ]
  },
}));
