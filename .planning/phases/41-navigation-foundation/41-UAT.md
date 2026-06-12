---
status: complete
phase: 41-navigation-foundation
source: 41-01-SUMMARY.md, 41-02-SUMMARY.md
started: 2026-06-12T10:15:00Z
updated: 2026-06-12T10:45:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. BusinessNav visible on /business pages
expected: Navigate to any /business/* page while logged in (e.g. /business). You should see: "AKTIIVI Business" text link at top-left, a glass pill at top-right containing "Profiili" and "Kirjaudu ulos" links, and a small circular map icon button at bottom-left. The nav should have the glass background style (frosted / translucent), not the solid indigo consumer bar.
result: pass

### 2. Consumer NavBar absent on /business pages
expected: On the same /business/* page, the consumer NavBar (solid indigo bar at the very top with "AKTIIVI" logo on the left linking to "/") should be completely absent — no double navigation visible at any breakpoint, both desktop and mobile.
result: pass

### 3. BusinessNav active route highlight
expected: Navigate between /business and /business/profiili using the nav links. The link corresponding to the current page should appear visually highlighted or distinct (e.g. filled/active style) compared to the inactive links.
result: skipped
reason: /business/profiili is a 404 (Phase 43 not yet built) — 404 lands outside business layout so BusinessNav disappears; /business has no pill button to highlight. No testable scenario until Phase 43 ships.

### 4. Post-login redirect to /business
expected: Log out of the business area, then log back in at /business/kirjaudu with valid credentials. After a successful login, you should automatically land on /business (the dashboard/home), not remain on the login page.
result: pass

### 5. Already-logged-in redirect from kirjaudu
expected: While already logged in as a business user, navigate directly to /business/kirjaudu in the browser. You should be immediately redirected to /business without ever seeing the login form — it should feel instant, no flash of the login UI.
result: pass

### 6. Sign-out from BusinessNav
expected: Click "Kirjaudu ulos" in the top-right glass pill. You should be redirected to /business/kirjaudu (the business login page) and the sb-biz-* session should be cleared. Opening /business in a new tab should redirect back to /business/kirjaudu (not show the dashboard).
result: pass

### 7. Consumer session unaffected by business sign-out
expected: While logged in to both the consumer area (/ with sb-* cookies) and the business area (/business with sb-biz-* cookies), sign out from BusinessNav. Your consumer session should still be active — visiting / should still show you as logged in (favorites, profile accessible).
result: pass

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

[none yet]
