---
status: testing
phase: 59-multi-company-skeemamigraatio
source: [59-VERIFICATION.md]
started: 2026-06-25T15:05:00Z
updated: 2026-06-25T15:05:00Z
---

## Current Test

number: 1
name: D-13 manual login regression
expected: |
  After Wave 2 app code is deployed (per 59-DEPLOY-RUNBOOK.md "Next action"), log in as 2-3 real
  business accounts in production. Same paikat (venues) visible as before the migration;
  /business/profiili resolves correctly without redirecting to /business; no
  "permission denied for function current_company_id" errors in Supabase logs; admin
  application list/detail pages show the correct company name for each application.
awaiting: user response

## Tests

### 1. D-13 manual login regression
expected: Same paikat visible; profiili resolves (no redirect to /business); no permission-denied
  errors for current_company_id in Supabase logs; admin views show correct company names.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
