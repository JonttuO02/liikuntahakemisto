---
phase: 47
slug: skeema-monisivuinen-scraper-putki
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-16
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.7` |
| **Config file** | `vitest.config.ts` (`include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts']`) |
| **Quick run command** | `npx vitest run lib/branding/scraper.test.ts lib/branding/analyzer.test.ts lib/branding/ssrfGuard.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/branding/` (scoped to the branding module under active change)
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green, plus manual SQL verification checklist for BRDDB-03/04/05
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 47-03 Task 1/2 | 03 | 2 | SCRAP-06 | — | Same-origin subpage discovery + 3-5 page cap | unit | `npx vitest run lib/branding/scraper.test.ts -t "SCRAP-06"` | ❌ W0 | ⬜ pending |
| 47-02 Task 1/2 | 02 | 1 | SCRAP-07 | T-47-09 (SSRF via CSS/logo) | SSRF re-validation on every link/redirect; manual redirect hop cap | unit | `npx vitest run lib/branding/ssrfGuard.test.ts` | ❌ W0 | ⬜ pending |
| 47-04 Task 3 | 04 | 1 | SCRAP-08 | — | Labeled multi-page prompt sections with per-page truncation | unit | `npx vitest run lib/branding/analyzer.test.ts -t "SCRAP-08"` | ❌ W0 | ⬜ pending |
| 47-03 Task 1/2 | 03 | 2 | SCRAP-09 | — | Gallery image extraction + noise filtering | unit | `npx vitest run lib/branding/scraper.test.ts -t "SCRAP-09"` | ❌ W0 | ⬜ pending |
| 47-01 Task 1/2 | 01 | 1 | BRDDB-03 | — | New columns exist with correct types/defaults | manual | `supabase db push` + SQL editor `information_schema` query | N/A | ⬜ pending |
| 47-01 Task 3 | 01 | 1 | BRDDB-04 | — | `logo_type` CHECK constraint matches analyzer enum (verify-only — already shipped per research) | manual | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'business_branding_logo_type_check'` | N/A | ⬜ pending |
| 47-01 Task 1/3, 47-05 Task 2 | 01, 05 | 1, 3 | BRDDB-05 | T-IDOR-paikka | Composite UNIQUE prevents cross-venue overwrite; backfill correctness; route ownership check | manual | Insert two rows same `business_account_id` different `paikka_id`; attempt duplicate; assert backfill populated `paikka_id` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs reference the named tasks inside each plan file (e.g. "47-03 Task 2" = `47-03-PLAN.md`'s "Task 2: Rewire scrapeWebsite...").*

---

## Wave 0 Requirements

- [ ] `lib/branding/ssrfGuard.test.ts` — new file, covers SCRAP-07 (extracted validator + redirect-hop-cap loop); mock `fetch` the same way `scraper.test.ts` already does
- [ ] Extend `lib/branding/scraper.test.ts` — covers SCRAP-06 (subpage discovery/cap) and SCRAP-09 (gallery extraction/noise filtering)
- [ ] Extend `lib/branding/analyzer.test.ts` — covers SCRAP-08 (labeled multi-page input shape) and array-based `logos`/`colors` parsing/validation
- [ ] No automated test for `lib/branding/screenshot.ts` — recommend a smoke-test-only approach (mock `playwright-core`'s `chromium.launch`) since real Chromium launches in Vitest would be slow/flaky
- [ ] Manual SQL verification checklist for BRDDB-03/04/05 — no Vitest equivalent exists in this codebase's conventions for schema/migration assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| New `business_branding` columns exist with correct types | BRDDB-03 | No automated migration-assertion harness exists in this repo | After `supabase db push`, query `information_schema.columns` for `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color` |
| `logo_type` CHECK constraint matches analyzer enum | BRDDB-04 | Verify-only task against a live/deployed constraint, not new code | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'business_branding_logo_type_check'` — confirm it allows exactly `('wordmark','icon','combination','unknown')` |
| Composite UNIQUE + backfill correctness | BRDDB-05 | DB-level constraint and data-migration behavior, no test harness for migrations in this repo | Insert/attempt-duplicate test via SQL editor; confirm backfill populated `paikka_id` for all pre-existing rows |
| Homepage screenshot capture on deployed Vercel Pro | SCRAP-08 (D-02/D-03) | Requires real Vercel Pro `maxDuration` + real Chromium binary in deployed serverless environment — cannot be exercised in local Vitest | Manually trigger `analyze-website` against a known business URL post-deploy; confirm screenshot buffer is non-null and passed to Claude |
| Node `fetch` `redirect: 'manual'` Location-header readability on Vercel's runtime | SCRAP-07 (Assumption A1) | Undici/runtime-specific behavior not verifiable via unit test mocks alone | Smoke-test against a real redirecting URL in a preview deployment; confirm `res.headers.get('location')` is non-null |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-16 (gsd-plan-checker VERIFICATION PASSED, revision iteration 1)
