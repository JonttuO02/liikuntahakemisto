---
phase: 41
slug: navigation-foundation
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-06-12
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser walkthrough of all 4 success criteria
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| i18n keys | 01 | 1 | BIZNAV-01 | — | N/A | manual | — | ✅ | ⬜ pending |
| BusinessNav.tsx | 01 | 1 | BIZNAV-01 | — | BusinessNav uses createBusinessBrowserClient (sb-biz-*), never consumer client | manual | — | ❌ new | ⬜ pending |
| layout.tsx update | 01 | 1 | BIZNAV-01, BIZNAV-02 | — | Layout stays RSC; BusinessNav client boundary inside component | manual | — | ✅ | ⬜ pending |
| kirjaudu RSC wrapper | 01 | 1 | BIZUX-02 | — | RSC redirect fires before rendering login form (no flash) | manual | — | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — all three requirements involve client-side rendering and authenticated navigation flows that require a running Next.js server with a real Supabase session.

`npx vitest run` (existing `tests/api/update-paikka.test.ts`) serves as regression guard only.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| BusinessNav appears on all /business/* pages | BIZNAV-01 | React component rendering requires browser | Navigate to /business, /business/profiili — verify pill top-right and map button bottom-left |
| Consumer NavBar absent from /business/* pages | BIZNAV-02 | Layout-level rendering requires browser | Navigate to /business/* — verify no consumer NavPill visible at any breakpoint |
| Post-login redirect to /business | BIZUX-02 (SC-3) | Requires real Supabase auth session | Log in at /business/kirjaudu — verify landing on /business dashboard |
| Already-logged-in redirect from /business/kirjaudu | BIZUX-02 (SC-4) | Requires real authenticated session | While logged in, navigate directly to /business/kirjaudu — verify immediate redirect to /business |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Wave 0: existing infrastructure covers all phase requirements (no new test files)
- [ ] Sampling continuity: `npx vitest run` after each commit
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] Manual browser walkthrough of all 4 success criteria complete
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
