---
status: partial
phase: 32-yritysrekisterointi-auth
source: [32-VERIFICATION.md]
started: 2026-06-05T14:00:00.000Z
updated: 2026-06-05T14:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Happy-path registration creates auth user + business_accounts row and redirects
expected: Navigating to /business/rekisteroidy, submitting with a new email + password + company name creates an auth user and business_accounts row in Supabase, then redirects to /business
result: [pending]

### 2. Duplicate email shows errorEmailInUse inline
expected: Submitting the registration form with an already-registered email shows the Finnish/English errorEmailInUse message inline (no page reload)
result: [pending]

### 3. AuthModal sign-in with business account redirects to /business
expected: Opening AuthModal and signing in with a business account email redirects the user to /business
result: [pending]

### 4. AuthModal sign-in with regular account does NOT redirect to /business
expected: Opening AuthModal and signing in with a regular (non-business) user account stays on the current page — no /business redirect
result: [pending]

### 5. POST without Authorization header returns 401
expected: curl -X POST http://localhost:3000/api/business/register -H "Content-Type: application/json" -d '{"company_name":"Test"}' returns HTTP 401
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
