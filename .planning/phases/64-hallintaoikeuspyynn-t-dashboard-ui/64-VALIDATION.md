---
phase: 64
slug: hallintaoikeuspyynn-t-dashboard-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-02
---

# Phase 64 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest.config.ts`, `environment: 'node'`) |
| **Config file** | `vitest.config.ts` (repo root) |
| **Quick run command** | `npx vitest run tests/api/<new-file>.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run tests/api/<file>.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Plans not yet created — mapped by requirement per RESEARCH.md's "Phase Requirements → Test Map". The planner must assign these to concrete Task IDs when writing PLAN.md files.*

| Requirement | Secure/Expected Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|--------------------------|-----------|--------------------|-------------|--------|
| ACCESS-04 | Owner reads pending requests for owned venue via new list endpoint | unit (Route Handler) | `npx vitest run tests/api/access-request-list.test.ts -t "returns pending requests"` | ❌ Wave 0 | ⬜ pending |
| ACCESS-04 | Non-owner (no approved link to this venue) cannot read the list (403) | unit (Route Handler) | `npx vitest run tests/api/access-request-list.test.ts -t "forbidden"` | ❌ Wave 0 | ⬜ pending |
| ACCESS-04 | Approve/Reject buttons call the existing, unmodified endpoints | integration (existing coverage) | check existing `tests/api/` approve/reject coverage before assuming a gap | check first | ⬜ pending |
| ACCESS-07 | Owner removes a sub-manager's access (happy path) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "removes member"` | ❌ Wave 0 | ⬜ pending |
| ACCESS-07 | Non-owner cannot remove any member (403) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "forbidden non-owner"` | ❌ Wave 0 | ⬜ pending |
| ACCESS-07 | Owner cannot remove themselves (hard block, server-enforced regardless of UI state) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "self-removal blocked"` | ❌ Wave 0 | ⬜ pending |
| ACCESS-07 | Removal is venue-scoped (owner of Venue A cannot remove a member from Venue B) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "venue-scoped"` | ❌ Wave 0 | ⬜ pending |
| ACCESS-07 | Concurrent double-removal only succeeds once (count guard) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "concurrency"` | ❌ Wave 0 | ⬜ pending |
| D-05 (support) | `display_name` is written correctly at invite-path registration | unit (extends existing `register.test.ts`) | `npx vitest run tests/api/register.test.ts -t "display_name"` | ❌ extend existing file | ⬜ pending |
| D-15 (support) | Invite-link signup wiring passes `paikka_id` + `invite:true` and redirects back to `/business/liity?paikka_id=X` | unit (extends existing `register.test.ts`) | `npx vitest run tests/api/register.test.ts -t "invite"` | ❌ extend existing file | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/access-request-list.test.ts` — covers ACCESS-04's new list endpoint (owner read, non-owner 403, identity resolution)
- [ ] `tests/api/access-request-remove.test.ts` — covers ACCESS-07's new removal endpoint (happy path, non-owner 403, self-removal block, venue-scoping, concurrency)
- [ ] Extend `tests/api/register.test.ts` — covers `display_name` persistence and invite-flow wiring (D-15) on the invite path
- [ ] Framework install: none — Vitest is already configured and used project-wide

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Team-management icon appears on `DiagonaalKortti` only when pending requests and/or non-owner team members exist | ACCESS-04, ACCESS-07 (D-02) | No component test harness exists for `DiagonaalKortti` in this repo (established convention: manual/UAT for visual components) | Open `/business`, confirm the icon only renders for venues with relevant state; confirm it opens the combined popup with "Pending requests" + "Current team" sections |
| Owner's own row is visible but its remove control is disabled/grayed out in "Current team" | ACCESS-07 (D-14) | Visual UI state, no snapshot-testing convention in this codebase | Open the popup as the owner; confirm own row shows a disabled remove icon, not omitted from the list |
| Removal requires a confirm-dialog step before the DELETE fires | ACCESS-07 (D-10) | Interactive click-through, no UI test harness | Click remove on a sub-manager row; confirm a confirm dialog appears and the DELETE only fires after explicit confirmation |
| Invite-link signup (`/business/liity?paikka_id=X` → `rekisteroidy` → back to `liity`) ends with the new user as a pending member of the correct company, not owner of a new one | D-15 | End-to-end flow spanning redirects + Supabase state, no e2e harness in this repo | Manually walk an invite link as a fresh (unauthenticated) test account through signup; confirm resulting `business_accounts.company_id`/`role` and `business_access_requests` row match the inviting venue's company |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — plans not yet created
