---
phase: 36
slug: hallintapaneeli
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
---

# Phase 36 — Validation Strategy

> Per-phase validation contract. Route Handler covered by Vitest unit tests; UI flows are manual-only (Playwright E2E not yet configured for this project).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.7 |
| **Config file** | `vitest.config.ts` (updated: added `resolve.alias` for `@/` path mapping) |
| **Quick run command** | `npx vitest run tests/api/update-paikka.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~200 ms |

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/api/update-paikka.test.ts`
- **After every plan wave:** `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** < 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 36-01-01 | 01 | 1 | BIZPANEL-01/02/03 | — | i18n keys present in fi.json + en.json | manual | — | ✅ verified (plan self-check) |
| 36-02-01 | 02 | 1 | BIZPANEL-02 | S-01 | No auth header → 401 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-02 | 02 | 1 | BIZPANEL-02 | S-01 | Invalid token → 401 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-03 | 02 | 1 | BIZPANEL-02 | D-02 | Body > 64 KB → 413 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-04 | 02 | 1 | BIZPANEL-02 | — | Malformed JSON → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-05 | 02 | 1 | BIZPANEL-02 | — | Invalid paikka_id → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-06 | 02 | 1 | BIZPANEL-02 | E-01 | Non-approved claimant → 403 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-07 | 02 | 1 | BIZPANEL-02 | — | photo_urls > 5 → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-08 | 02 | 1 | BIZPANEL-02 | T-03 | Non-string photo_urls item → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-09 | 02 | 1 | BIZPANEL-02 | T-02 | aukioloajat as array → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-10 | 02 | 1 | BIZPANEL-02 | T-02 | aukioloajat entry missing open/close → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-11 | 02 | 1 | BIZPANEL-02 | T-04 | `javascript:` varauslinkki → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-12 | 02 | 1 | BIZPANEL-02 | T-04 | Invalid URL varauslinkki → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-13 | 02 | 1 | BIZPANEL-02 | — | Unknown section → 400 | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-02-14 | 02 | 1 | BIZPANEL-02 | — | Valid mediat save → 200 `{ ok: true }` | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ green |
| 36-03-01 | 03 | 2 | BIZPANEL-01/03 | — | PreviewModal renders venue data | manual | — | see Manual-Only |
| 36-03-02 | 03 | 2 | BIZPANEL-01/03 | — | Backdrop click closes modal | manual | — | see Manual-Only |
| 36-04-01 | 04 | 2 | BIZPANEL-01/02 | — | /business/[id] unauthenticated → redirect | manual | — | see Manual-Only |
| 36-04-02 | 04 | 2 | BIZPANEL-01/02 | — | Tab bar switches steps via ?step=N | manual | — | see Manual-Only |
| 36-05-01 | 05 | 3 | BIZPANEL-02 | — | StepMediat editMode: existing photos shown + deletable | manual | — | see Manual-Only |
| 36-05-02 | 05 | 3 | BIZPANEL-02 | — | Max-5 cap disables upload zone | manual | — | see Manual-Only |
| 36-06-01 | 06 | 4 | BIZPANEL-02 | — | StepHinnasto/Aukioloajat/Yhteystiedot Tallenna saves | manual | — | see Manual-Only |
| 36-07-01 | 07 | 5 | BIZPANEL-03 | — | "Näytä esikatselu" in EditWizardInner opens PreviewModal | manual | — | see Manual-Only |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. `vitest.config.ts` updated to add `@/` path alias.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PreviewModal renders PaikkaKortti + DiagonaalKortti + PaikkaSheet | BIZPANEL-03 | Requires browser + live Supabase data | Open `/business`, click "Esikatselu" on any venue — verify 3 preview sections render |
| PreviewModal closes on backdrop click and × button | BIZPANEL-03 | Browser interaction | With modal open, click outside panel — confirm modal fades out |
| "Muokkaa" navigates to /business/[id] | BIZPANEL-01 | Browser navigation | Click "Muokkaa" — confirm route changes to `/business/<paikka_id>` |
| /business/[id] unauthenticated redirects to /business/rekisteroidy | BIZPANEL-02 | Requires auth state manipulation | Open incognito, visit `/business/1` — confirm redirect |
| Tab bar switches steps via ?step=N | BIZPANEL-02 | Browser URL state | Click each tab — confirm URL gains `?step=N` and correct step content renders |
| StepMediat editMode: existing photo thumbnails shown, × deletes | BIZPANEL-02 | Requires Storage + live data | In step 2, verify uploaded photos appear as thumbnails; click × and verify removal |
| Max-5 photo cap disables upload zone | BIZPANEL-02 | Requires 5 photos in DB | With 5 photos, verify drop zone shows `pointer-events-none opacity-60` |
| StepHinnasto Tallenna calls update-paikka with section=hinnasto | BIZPANEL-02 | Browser network inspection | In step 3, enter price, click Tallenna — check Network tab for POST to `/api/business/update-paikka` |
| StepAukioloajat pre-fills from paikka data, Tallenna saves | BIZPANEL-02 | Requires live paikka data | In step 4, verify opening hours pre-filled; click Tallenna and verify success message |
| StepYhteystiedot pre-fills puhelin/varauslinkki/kuvaus, Tallenna saves | BIZPANEL-02 | Requires live paikka data | In step 5, verify fields pre-filled; update and save |
| "Näytä esikatselu" in EditWizardInner tab bar opens PreviewModal | BIZPANEL-03 | Browser interaction | On `/business/[id]`, click "Näytä esikatselu" — verify PreviewModal opens |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only rationale
- [x] Sampling continuity: Route Handler tasks (36-02, 14 cases) fully automated; UI tasks documented manual-only
- [x] Wave 0 complete — vitest.config.ts updated, test file created
- [x] No watch-mode flags in any command
- [x] Feedback latency < 1s for automated suite
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-11
