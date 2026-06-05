---
phase: 34
slug: onboarding-velhou
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-06
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.7 |
| **Config file** | none — Wave 0 creates vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run` + manual smoke test in browser
- **Before `/gsd:verify-work`:** Full suite must be green + manual full wizard flow
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 34-migration | DB migration | 1 | ONBOARD-01 | — | N/A | manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 34-pricing-validation | StepHinnasto | any | ONBOARD-04 | — | "Seuraava" disabled until ≥1 price row filled | unit | `npx vitest run tests/onboarding-pricing.test.ts` | ❌ W0 | ⬜ pending |
| 34-hours-prefill | StepAukioloajat | any | ONBOARD-05 | — | Google Places aukioloajat populates toggles with correct day keys | unit | `npx vitest run tests/onboarding-hours.test.ts` | ❌ W0 | ⬜ pending |
| 34-contact-maxlength | StepYhteystiedot | any | ONBOARD-06 | — | description capped at 300 chars, counter turns red at limit | unit | `npx vitest run tests/onboarding-contact.test.ts` | ❌ W0 | ⬜ pending |
| 34-draft-mapping | StepEsikatselu | any | ONBOARD-07 | — | buildDraftAsPaikka() maps all draft fields to Liikuntapaikka type | unit | `npx vitest run tests/onboarding-draft-map.test.ts` | ❌ W0 | ⬜ pending |
| 34-onboarding-gate | business/page.tsx | any | ONBOARD-01 | — | onboarding_completed=false → redirect to /business/onboarding | manual-only | — | N/A | ⬜ pending |
| 34-upload-flow | StepMediat | any | ONBOARD-03 | A3 | Storage upload stores at correct path; URLs saved to draft | manual-only | — | N/A | ⬜ pending |
| 34-step1-prefill | StepPaikka | any | ONBOARD-02 | — | Venue name/address displayed from business_paikka_links join | manual-only | — | N/A | ⬜ pending |
| 34-submit-atomic | submit route | any | ONBOARD-07 | T-01 | Verify business_paikka_links before updating liikuntapaikat | manual-only | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — no vitest config found in codebase; needs creation before tests run
- [ ] `tests/onboarding-pricing.test.ts` — pricing validation unit test (ONBOARD-04)
- [ ] `tests/onboarding-hours.test.ts` — aukioloajat pre-fill unit test with mock liikuntapaikat row (ONBOARD-05)
- [ ] `tests/onboarding-contact.test.ts` — description maxLength=300 unit test (ONBOARD-06)
- [ ] `tests/onboarding-draft-map.test.ts` — buildDraftAsPaikka() mapping unit test (ONBOARD-07)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/business` redirects to `/business/onboarding` when `onboarding_completed = false` | ONBOARD-01 | Requires live Supabase session + DB state | Log in as new business, visit /business, confirm redirect |
| Step 1 displays correct venue name/address | ONBOARD-02 | Requires DB join (business_paikka_links + liikuntapaikat) | Complete Phase 33 claim/create, proceed to wizard Step 1 |
| Storage upload stores file at correct path with correct RLS | ONBOARD-03 | Requires live Storage bucket + RLS policy (A3 assumption) | Upload logo + 2 images in Step 2, verify in Supabase dashboard |
| Step 4 Google Places pre-fill loads aukioloajat from liikuntapaikat | ONBOARD-05 | Requires DB row with existing aukioloajat JSONB | Claim a venue that has opening hours data, proceed to Step 4 |
| Step 6 submit atomically copies draft to liikuntapaikat and deletes draft | ONBOARD-07 | Requires full wizard flow + DB verification | Complete all 6 steps, submit, check liikuntapaikat row updated + onboarding_draft deleted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
