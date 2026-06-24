---
created: 2026-06-24T20:49:35.048Z
title: Block business accounts from logging into customer site
area: auth
files:
  - middleware.ts:7,17,42-59
  - lib/supabaseSSR.ts:22-28
  - lib/supabase-business.ts
  - app/components/AuthModal.tsx:91,107
  - app/components/BusinessKirjauduClient.tsx:26
---

## Problem

A business account (an account tied to a `business_accounts` row / claimed venue) can currently sign in through the regular customer-facing `AuthModal` on the main site, not just through `/business/*`. There is no check anywhere — login, middleware, or otherwise — that looks up `business_accounts` membership before allowing a sign-in to succeed on the consumer surface.

The `/business/*` vs consumer split today is implemented as **separate cookie namespaces only** (`sb-biz-*` via `middleware.ts` cookieOptions for `/business/*`, default `sb-*` namespace elsewhere), which is a session-isolation/UX mechanism, not an access-control gate. The same Supabase Auth user record (same email/password) authenticates successfully on both surfaces — a business owner can log into the customer-facing site with their business credentials and land in a normal "logged in customer" session. The consumer UI just never queries `business_accounts`, so nothing surfaces, but the login itself is not blocked.

No `.planning/` doc (ROADMAP, REQUIREMENTS, ADRs, SECURITY.md from the Phase 36 STRIDE audit) documents this as a decided requirement — it appears to be an unconsidered gap, not a deferred one. Surfaced during the Phase 58 (admin venue-map) checkpoint review by the user, who recalled this was earlier agreed to not be possible.

## Solution

TBD — needs its own discussion/phase. Options to consider when picked up: check `business_accounts` membership at sign-in time on the consumer `AuthModal` path and reject/redirect, or add an explicit account-type guard in middleware for the consumer route group. Confirm with the user what the originally agreed-upon behavior was supposed to be (reject login outright vs. redirect to `/business`) before implementing.
