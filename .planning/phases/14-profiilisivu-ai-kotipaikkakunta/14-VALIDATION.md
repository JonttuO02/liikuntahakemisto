---
phase: 14
slug: profiilisivu-ai-kotipaikkakunta
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-28
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.7 |
| **Config file** | `vitest.config.ts` (include: `lib/**/*.test.ts`) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | AUTH-04 | — | Migration SQL creates profiles table with user_id PK, kotikaupunki text, RLS enabled (INSERT+UPDATE+SELECT policies with auth.uid()=user_id) | manual (migration inspect) | `grep "CREATE TABLE.*profiles" supabase/migrations/*_profiles.sql` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | AI-05 | prompt-injection | buildReissuKonteksti returns context string only when cities differ (case-insensitive); returns empty string when cities match or kotikaupunki is empty | unit | `npx vitest run lib/saasuositus.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | AUTH-04 | — | NavPill contains Profiili link with href="/profiili" placed before Suosikit link | manual | Open app, click nav pill, verify Profiili appears above Suosikit | ✅ (tsc) | ⬜ pending |
| 14-02-02 | 02 | 1 | AUTH-04 | — | Etusivu inline pill contains Profiili link with href="/profiili" placed before Suosikit | manual | Open / route, click inline pill, verify Profiili appears above Suosikit | ✅ (tsc) | ⬜ pending |
| 14-03-01 | 03 | 2 | AUTH-04 | — | /profiili page.tsx renders NavPill + ProfiiliClient server shell | manual | `npx tsc --noEmit` exits 0; /profiili route exists | ✅ (tsc) | ⬜ pending |
| 14-03-02 | 03 | 2 | AUTH-04 | — | Authenticated user sees email + kotikaupunki text field + Tallenna button; unauthenticated user sees CTA | manual | Log in, visit /profiili, verify form visible; log out, visit /profiili, verify CTA | ✅ (tsc) | ⬜ pending |
| 14-04-01 | 04 | 2 | AI-05 | — | Etusivu subscribeToAuthUser callback fetches profiles.kotikaupunki; AI fetch uses user !== null condition | unit (tsc) | `npx tsc --noEmit` exits 0 | ✅ (tsc) | ⬜ pending |
| 14-04-02 | 04 | 2 | AI-05 | prompt-injection | route.ts POST handler sanitizes kotikaupunki (same regex as suosikit); uses buildReissuKonteksti for prompt extension | unit | `npx vitest run lib/saasuositus.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/saasuositus.test.ts` — unit tests for `buildReissuKonteksti(kotikaupunki, kaupunki)`:
  - returns non-empty string when `kotikaupunki='Tampere'` and `kaupunki='Helsinki'` (cities differ)
  - returns `''` when `kotikaupunki='Tampere'` and `kaupunki='Tampere'` (same city)
  - returns `''` when `kotikaupunki='tampere'` and `kaupunki='TAMPERE'` (case-insensitive match)
  - returns `''` when `kotikaupunki=undefined`
  - returns `''` when `kotikaupunki=''`
- [ ] `lib/buildReissuKonteksti.ts` — pure helper function extracted from route.ts (created in Plan 14-01 Task 2)

*Vitest config already covers `lib/**/*.test.ts` — no test framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Profile page shows authenticated user's email | AUTH-04 | No jsdom environment in vitest config | Log in, navigate to /profiili, verify email displayed |
| kotikaupunki persists after save + page reload | AUTH-04 | Requires live Supabase DB interaction | Enter city, click Tallenna, reload page, verify field still shows city |
| Unauthenticated user sees CTA not form | AUTH-04 | Auth state requires browser environment | Log out, navigate to /profiili, verify sign-in CTA visible |
| reissussa context appears in AI widget when visiting different city | AI-05 | Requires weather API + AI API + live profile data | Set kotikaupunki='Tampere', navigate while city filter is 'Helsinki', verify AI response reflects travel context |
| "Kotikaupunki tallennettu" success text appears then fades | AUTH-04 | Timer-based UI behavior | Click Tallenna, verify success text appears ~2.5s then disappears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (lib/saasuositus.test.ts, lib/buildReissuKonteksti.ts)
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
