---
phase: 43-business-profile
uat_date: "2026-06-15"
status: passed
tester: user
---

# UAT — Phase 43: Business Profile

## Result: PASSED (5/5)

| # | Requirement | Test | Result |
|---|-------------|------|--------|
| 1 | BIZPRO-01 | Read-only display: company name, email, Yritystili badge visible at /business/profiili | PASS |
| 2 | BIZPRO-02 | Phone save: enter number, Tallennettu feedback appears ~2.5s, persists after reload | PASS |
| 3 | BIZPRO-03 | Language toggle: UI strings update immediately FI↔EN, toggles back correctly | PASS |
| 4 | BIZPRO-04 | Sign-out: redirects to /business/kirjaudu; consumer session in separate tab unaffected | PASS |
| 5 | Auth guard | Unauthenticated direct navigation to /business/profiili redirects to /business/kirjaudu | PASS |

## Notes

- BIZPRO-02 was scoped to phone only (contact_phone) per D-01/D-02 — email and website are managed per-venue via WizardInner
- All requirements verified against live dev server by user
