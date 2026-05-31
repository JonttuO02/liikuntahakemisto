---
phase: 21
slug: todo-lista
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-31
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Not detected — no jest.config, vitest.config, or pytest.ini found |
| **Config file** | None |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** TypeScript must compile clean; manual visual inspection required
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-T1 | 01 | 1 | TODO-01 | — | N/A | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 21-01-T2 | 01 | 1 | TODO-01 | — | N/A | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 21-02-T1 | 02 | 1 | TODO-02 | — | N/A | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 21-02-T2 | 02 | 1 | TODO-01 | — | N/A | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No Wave 0 required — this project has no test infrastructure and none is in scope for Phase 21. All verification is manual visual inspection against success criteria in ROADMAP.md §Phase 21.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Heart icon replaced by Bookmark everywhere | TODO-01 | No test infrastructure; visual audit | After execution, grep for `Heart` in modified files — expect zero matches; visually inspect BookmarkButton, NavPill, NavBar |
| All "Suosikit" labels read "TO DO" | TODO-01 | No test infrastructure; visual audit | Visually inspect NavPill, NavBar, page headings; check aria-labels in rendered HTML |
| /suosikit shows TO DO list for logged-in user | TODO-02 | Requires Supabase data + auth session | Log in, add a venue via BookmarkButton, navigate to /suosikit — venue card appears with remove button |
| /suosikit shows login prompt for logged-out user | TODO-02 | Requires auth state | Log out, navigate to /suosikit — unauthenticated state renders with "Kirjaudu sisään" button |
| Optimistic remove works + rolls back on error | TODO-02 | Requires Supabase error simulation | Tap remove button — card disappears immediately; on simulated error, card reappears |

---

## Validation Sign-Off

- [x] All tasks have `npx tsc --noEmit` as automated gate (no test framework available)
- [x] Sampling continuity: TypeScript runs after every task
- [x] Wave 0: not required — no new test stubs needed
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
