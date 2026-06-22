---
status: complete
phase: 52-cleanup-i18n-merkkijonot-authmodal-bugi
source: [.planning/phases/52-cleanup-i18n-merkkijonot-authmodal-bugi/52-01-SUMMARY.md]
started: 2026-06-22T12:47:54Z
updated: 2026-06-22T12:52:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Weak Password Error (AuthModal)
expected: Open the sign-up form (AuthModal), enter an email and a password under 6 characters, submit. You should see a specific "password too short" style message, not a generic error.
result: pass

### 2. Weak Password Error (Business Signup)
expected: On /business/rekisteroidy, enter a password under 6 characters and submit. You should see the same specific "password too short" message, not a generic error.
result: pass

### 3. EN-locale AuthModal Text
expected: Switch the site locale to English, open the sign-up/sign-in modal (AuthModal). All visible labels and buttons (e.g. "Sign in", "Create account", "or", "Continue with Google") should be in English, not Finnish.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
