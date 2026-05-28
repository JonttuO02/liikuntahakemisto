---
phase: 15
slug: arvostelut
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-28
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (root, `include: ['lib/**/*.test.ts']`) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | REVIEW-01 | T-15-01 | `UNIQUE(user_id, paikka_id)` enforces one review per user per venue | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | REVIEW-02 | T-15-02 | `is_anonymous=true` resolves display name to "Anonyymi", never exposes user_id | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | REVIEW-03 | — | `visit_date` stored as YYYY-MM-DD; `crowd_rating` constrained to enum values | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 2 | REVIEW-04 | — | `computeAvgRating([5,3,4])` returns 4.0; empty array returns null | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 3 | REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04 | T-15-01, T-15-02 | Auth gate, submit, edit, anonymous display, list render | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/reviewUtils.ts` — pure functions: `resolveDisplayName()`, `computeAvgRating()`, `formatCrowdRating()`, crowd rating enum validation
- [ ] `lib/reviewUtils.test.ts` — unit tests covering REVIEW-01 through REVIEW-04 behaviors

*Existing vitest infrastructure (`vitest.config.ts`) already installed and configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Star hover preview fills stars 1–N on mouse enter | REVIEW-01 | vitest excludes component files (`include: lib/**/*.test.ts`) | Hover over each star; confirm amber fill cascades left to right |
| Logged-out user sees locked form with "Kirjaudu arvostellaksesi" CTA | REVIEW-01 | Auth state UI — browser interaction required | Log out, open `/paikat/[id]`; verify form is greyed with CTA visible |
| Existing review pre-fills form and shows "Muokkaa arvostelu" button | REVIEW-01 | Requires real DB row | Submit one review; reload page; verify edit mode triggers |
| "Näytä kaikki" button appears when venue has > 5 reviews and reveals all | REVIEW-04 | Requires real DB state | Seed > 5 reviews; verify truncation and expand button |
| `router.refresh()` updates star average after submit | REVIEW-04 | Server component revalidation — browser only | Submit review; verify avg updates without manual reload |
| CrowdRatingPills deselect on second tap | REVIEW-03 | Mobile tap interaction | Tap "Sopivasti", tap again; verify pill returns to inactive state |
| AnonymousToggle default is "Näytä nimeni" | REVIEW-02 | UI state — visual check | Open ReviewForm as logged-in user; confirm "Näytä nimeni" is active |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
