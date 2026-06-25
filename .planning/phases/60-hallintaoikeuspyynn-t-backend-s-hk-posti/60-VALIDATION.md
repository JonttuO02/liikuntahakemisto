---
phase: 60
slug: hallintaoikeuspyynn-t-backend-s-hk-posti
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-25
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no automated test framework exists anywhere in this codebase (no `pytest.ini`/`jest.config.*`/`vitest.config.*`). Verification is manual/conversational UAT project-wide, per `.planning/STATE.md`. |
| **Config file** | none |
| **Quick run command** | none — manual route-handler testing per task (REST client / curl against the new endpoints) |
| **Full suite command** | none — manual end-to-end walkthrough via `/gsd-verify-work` |
| **Estimated runtime** | N/A (no automated suite) |

---

## Sampling Rate

- **After every task commit:** No automated quick-run exists. Manually exercise the changed Route Handler (curl/REST client) against a dev Supabase instance.
- **After every plan wave:** Manual end-to-end walkthrough of the relevant slice (submit → email, or approve/reject → email).
- **Before `/gsd-verify-work`:** Full manual walkthrough of submit → owner email → approve/reject → requester email, plus the concurrency probe below.
- **Max feedback latency:** N/A — manual verification only, no watch-mode/automated loop in this project.

---

## Per-Task Verification Map

Task IDs are not yet assigned (planning has not run). Rows below are keyed by requirement/criterion; the planner should map each to concrete task IDs in PLAN.md.

| Req ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|--------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| ACCESS-03 | TBD | TBD | Same-company employee submits access request via invite link; row lands in `business_access_requests` as `pending` | T-60-01 | Server-side D-09/D-10 guards run before insert; JWT-verified `user.id` only, never trusts body | manual | n/a (curl/REST client against `/api/business/access-request/submit`) | ❌ Wave 0 | ⬜ pending |
| ACCESS-05 | TBD | TBD | Owner receives Resend email on submission; requester receives Resend email on decision | — | Email failures are non-critical (try/catch), never block the API response; `sub()`/`esc()` reused for header-injection/XSS safety | manual | n/a (verify via Resend dashboard/dev logs) | ❌ Wave 0 | ⬜ pending |
| ACCESS-06 | TBD | TBD | Requester sees "odottaa hyväksyntää" banner; RLS blocks management access pre-approval | T-60-02 | `business_access_requests`/`business_paikka_links` RLS denies the pending requester any row until `supabaseAdmin` performs the approval INSERT | manual + direct RLS probe | n/a — one-off script using the requester's authenticated (anon-key) client, confirming an empty/denied result, not `supabaseAdmin` | ❌ Wave 0 | ⬜ pending |
| (implicit) Success criterion 4 | TBD | TBD | Concurrent approve attempts on the same request: only one succeeds | T-60-03 | `UPDATE ... WHERE status='pending'` + `count:'exact'` atomic guard, mirroring `admin/approve` | scripted | one-off Node/curl script firing two near-simultaneous POSTs at `/api/business/access-request/approve`, asserting one 200 + one 409 | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No test framework exists in this repo at all — this is a pre-existing, project-wide gap (consistent with all prior phases per STATE.md history), not something this phase is expected to fix.
- [ ] If scripted concurrency verification for success criterion 4 is wanted, a one-off Node/curl script is the lowest-friction option given no framework exists — not a permanent test suite addition.

*Existing infrastructure (manual/UAT via `/gsd-verify-work`) covers all phase requirements at this project's established verification depth.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Access-request submission via invite link (including D-09a no-auto-company signup path and D-10 invalid/malformed link rejection) | ACCESS-03 | No test framework in repo; Route Handler logic depends on live Supabase state (RLS, auth session) | Open `/business/liity?paikka_id=X` as a fresh auth session with no `business_accounts` row; confirm signup completes without an auto-created company, then confirm the request lands as `pending`. Repeat with a malformed/no-owner `paikka_id` and confirm a friendly rejection with no orphan row. |
| Owner + requester Resend emails | ACCESS-05 | Requires live Resend send (or dev-mode log inspection); no email-mocking infra exists in this codebase | Submit a request and confirm the owner's inbox (or Resend dashboard log) receives the notification; approve/reject and confirm the requester receives the matching decision email, with rejection reason shown only when provided. |
| Pre-approval RLS block | ACCESS-06 | Requires probing actual Postgres RLS behavior under a real authenticated session, not unit-testable without a live DB | As the pending requester's session (anon/authenticated client, not `supabaseAdmin`), attempt to read `business_paikka_links` and load `/business/[id]` for the requested venue; confirm both return empty/denied before approval, and confirm CR-01 (STATE.md's pre-existing "no ownership check" gap on that page) does not allow the pending requester through some other path. |
| Concurrent approve/reject safety | Success criterion 4 | No UI trigger exists in this phase (approve/reject is backend-only); needs direct concurrent HTTP calls, not a UI click | Fire two near-simultaneous POST requests at the approve endpoint for the same request id; confirm exactly one returns 200 and the other returns 409, and that no double-grant of `business_paikka_links` occurs. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies — N/A this phase (no framework; manual verify is the established project pattern, not a gap introduced here)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify — N/A, see above
- [ ] Wave 0 covers all MISSING references — confirmed: no framework exists project-wide, nothing new to scaffold
- [ ] No watch-mode flags — confirmed, none used
- [ ] Feedback latency < N/A — manual verification only
- [ ] `nyquist_compliant: true` set in frontmatter — pending plan-checker pass

**Approval:** pending
