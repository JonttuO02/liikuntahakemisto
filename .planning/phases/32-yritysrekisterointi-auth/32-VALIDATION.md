---
phase: 32
slug: yritysrekisterointi-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — no jest.config, no vitest.config, no test/ directory |
| **Config file** | none |
| **Quick run command** | N/A |
| **Full suite command** | N/A |
| **Estimated runtime** | N/A |

---

## Sampling Rate

- **After every task commit:** Manual browser test of the affected path
- **After every plan wave:** Manual end-to-end flow verification
- **Before `/gsd:verify-work`:** Full manual checklist below
- **Max feedback latency:** manual

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | BIZ-01 | — | /business/rekisteroidy renders with 3 fields | manual | — | N/A | ⬜ pending |
| 32-01-02 | 01 | 1 | BIZ-01 | T-32-01 | POST /api/business/register verifies JWT before accepting user_id | manual | — | N/A | ⬜ pending |
| 32-01-03 | 01 | 1 | BIZ-01 | T-32-02 | Atomicity: deleteUser called if business_accounts INSERT fails | manual | — | N/A | ⬜ pending |
| 32-02-01 | 02 | 1 | BIZ-03 | — | Business user redirected to /business after AuthModal sign-in | manual | — | N/A | ⬜ pending |
| 32-02-02 | 02 | 1 | BIZ-03 | — | Regular user NOT redirected to /business after AuthModal sign-in | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None applicable — no test infrastructure exists project-wide; Phase 32 follows the existing pattern of manual verification. Out of scope for this phase.

*Existing infrastructure: none — all verifications are manual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/business/rekisteroidy` renders form with yritysnimi + sähköposti + salasana fields | BIZ-01 | No test framework | Navigate to /business/rekisteroidy; confirm 3 inputs + submit button |
| Successful registration: new user created + business_accounts row inserted | BIZ-01 | Requires live Supabase | Register new email; check Supabase Auth dashboard + business_accounts table |
| Atomicity: if business_accounts INSERT fails, auth user is deleted | BIZ-01 | Requires simulated DB error | Manually trigger INSERT failure (e.g., drop constraint briefly) and verify no orphan auth user |
| Business redirect: signing in with business account goes to /business | BIZ-03 | Requires live auth session | Sign in with registered business email; confirm redirect to /business |
| Regular user not redirected: normal user sign-in stays on current page | BIZ-03 | Requires live auth session | Sign in with non-business email; confirm no redirect to /business |
| JWT verification: /api/business/register rejects requests without valid Authorization header | Security | Requires curl/Postman | POST to /api/business/register without Authorization header; expect 401 |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < manual
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
