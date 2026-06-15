---
phase: 45
slug: scraper-claude-api-putki
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run lib/branding` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/branding`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| scraper | 01 | 1 | SCRAP-01 | SSRF | fetch blocks private IPs; only http/https | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ W0 | ⬜ pending |
| css-parse | 01 | 1 | SCRAP-02 | — | N/A | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ W0 | ⬜ pending |
| logo-collect | 01 | 1 | SCRAP-03 | — | N/A | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ W0 | ⬜ pending |
| sharp-convert | 01 | 1 | SCRAP-05 | — | N/A | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ W0 | ⬜ pending |
| claude-analyze | 02 | 2 | SCRAP-04 | Prompt injection | HTML truncated to 8000 chars | unit (mock) | `npx vitest run lib/branding/analyzer.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/branding/scraper.test.ts` — stubs for SCRAP-01, SCRAP-02, SCRAP-03, SCRAP-05
- [ ] `lib/branding/analyzer.test.ts` — stubs for SCRAP-04 (Claude SDK mocked)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase Storage upload succeeds and logo_url is a valid public URL | D-01–D-03 | Requires live Supabase Storage connection | POST /api/business/analyze-website with a real URL; inspect business_branding.logo_url in Supabase dashboard |
| waitUntil pipeline completes asynchronously after {ok:true} response | D-04 | Requires Vercel deployment or local test with delay | POST endpoint; verify {ok:true} immediately; poll GET endpoint until status='analyzed' |
| ANTHROPIC_API_KEY auth accepted by Haiku model | SCRAP-04 | Live API key required | Run analyzeWithClaude with a real image; verify non-empty JSON response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
