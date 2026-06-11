---
status: partial
phase: 39-auth-separaatio
source: [39-VERIFICATION.md]
started: 2026-06-12T00:00:00.000Z
updated: 2026-06-12T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. sb-biz-auth-token cookie at runtime
expected: After logging in at /business/kirjaudu, DevTools Application → Cookies shows `sb-biz-auth-token` (not `sb-auth-token`). The consumer `sb-auth-token` cookie is not created or modified.
result: [pending]

### 2. Simultaneous session coexistence
expected: After logging in to both consumer (/profiili) and business (/business/kirjaudu) accounts in the same browser, DevTools shows both `sb-auth-token` and `sb-biz-auth-token` active simultaneously.
result: [pending]

### 3. Consumer routes with business-only session
expected: When only `sb-biz-auth-token` is active (no consumer session), pages `/`, `/profiili`, and listing pages render normally without auth errors or redirects.
result: [pending]

### 4. Middleware guard redirect target
expected: Unauthenticated access to `/business/paikka/123` (or any protected /business/* path) redirects to `/business/kirjaudu`, not `/`.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
