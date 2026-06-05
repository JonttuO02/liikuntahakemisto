---
phase: 31
slug: db-skeema-storage-perusta
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.7 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual Supabase SQL verification checklist
- **Max feedback latency:** ~10 seconds (automated); manual DB checks ~2 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| business_accounts migration | 01 | 1 | BIZ-02 | T-31-01 | anon cannot read other businesses' accounts | manual | Supabase SQL: `SELECT * FROM information_schema.tables WHERE table_name = 'business_accounts'` | N/A | ⬜ pending |
| business_paikka_links migration | 01 | 1 | BIZ-02 | T-31-02 | anon cannot read other businesses' links | manual | Supabase SQL: `SELECT * FROM information_schema.tables WHERE table_name = 'business_paikka_links'` | N/A | ⬜ pending |
| business_managed column | 02 | 2 | DATA-09 | T-31-03 | sync skips business_managed=true venues | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| sync-paikat filter | 02 | 2 | DATA-09 | T-31-03 | managed venues not overwritten by sync | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| profiles is_admin column | 03 | 2 | DATA-09 infra | T-31-04 | users cannot self-elevate to admin | manual | Supabase SQL: `SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin'` | N/A | ⬜ pending |
| business-media bucket + RLS | 04 | 3 | DATA-10 | T-31-05 | business cannot write to another business's path | manual | Supabase Storage tab + test upload with non-owner credentials | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/api/admin/__tests__/sync-paikat-filter.test.ts` — unit test for `business_managed` pre-filter logic (covers DATA-09 automated portion): test that managed place_ids are excluded from the upsert batch

*If existing `npx vitest run` passes, Wave 0 is complete for all non-unit items.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `business_accounts` table exists with correct FK chain | BIZ-02 | Requires live Supabase connection | SQL: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('business_accounts', 'business_paikka_links') ORDER BY table_name, ordinal_position` |
| RLS blocks anon reads on business_accounts | BIZ-02, D-16 | Requires live Supabase + anon client test | Use anon Supabase client to attempt SELECT on business_accounts — expect 0 rows |
| `business-media` bucket exists and is public | DATA-10 | Requires Supabase Storage tab | Check Supabase dashboard → Storage → business-media bucket listed as public |
| Storage RLS blocks cross-business writes | DATA-10, D-12 | Requires two authenticated users | Upload file as user A to user B's path (`{uid_b}/logo/logo.jpg`) — expect 403 |
| `is_admin` defaults to false on new profiles | D-14 | Requires live Supabase | Create new user — verify profiles row has `is_admin = false` |
| `is_admin = true` set for joona.orava@gmail.com | D-15 | Manual SQL operation | SQL: `SELECT is_admin FROM profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joona.orava@gmail.com')` — expect `true` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (automated) or documented manual steps
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
