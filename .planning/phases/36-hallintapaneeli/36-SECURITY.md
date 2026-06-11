---
phase: 36
slug: hallintapaneeli
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-11
---

# Phase 36 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → Route Handler | Authenticated business user submits venue edits via `POST /api/business/update-paikka` | JWT Bearer token, paikka_id, section name, field values |
| Server Component → Supabase | `app/business/[id]/page.tsx` fetches venue data via supabaseAdmin (service role) | Public venue fields (same data shown on `/paikat/[id]`) |
| Client → Supabase (browser) | `app/business/page.tsx` queries `business_paikka_links` via RLS-enforced anon client | Business account's own link rows only |
| Supabase Storage → Client | Photo and logo uploads sent directly from browser to `business-media` bucket | Binary media files |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| S-01 | Spoofing | `POST /api/business/update-paikka` | mitigate | JWT Bearer auth via `supabaseAdmin.auth.getUser(token)` — returns 401 if missing/invalid | closed |
| S-02 | Spoofing | `app/business/page.tsx` (dashboard query) | mitigate | Browser client uses RLS; `business_paikka_links` filtered by `user.id` from verified session | closed |
| S-03 | Spoofing | `app/business/[id]/page.tsx` (server component) | accept | See Accepted Risks AR-01 | closed |
| T-01 | Tampering | `POST /api/business/update-paikka` — cross-user write | mitigate | `business_paikka_links` ownership check: `eq('business_account_id', user.id).eq('paikka_id', paikka_id)` | closed |
| T-02 | Tampering | `POST /api/business/update-paikka` — aukioloajat JSONB | mitigate | Structural validation: must be object, max 14 keys, each entry requires `{ open: string, close: string }` shape; values capped at 10 chars | closed |
| T-03 | Tampering | `POST /api/business/update-paikka` — mediat photo_urls | mitigate | Array length ≤ 5 checked; each item validated as `typeof string` | closed |
| T-04 | Tampering / XSS | `POST /api/business/update-paikka` — varauslinkki | mitigate | `new URL()` parse + `http:`/`https:` protocol allowlist; `javascript:` and other schemes return 400 | closed |
| T-05 | Tampering | `POST /api/business/update-paikka` — hinnasto numeric fields | mitigate | Type guards reject non-numeric values for `hinta_min`/`hinta_max`; DB numeric column rejects IEEE specials | closed |
| E-01 | Elevation of Privilege | `POST /api/business/update-paikka` — pending/rejected claimants | mitigate | Ownership check requires `.eq('claim_status', 'approved')` — pending and rejected claimants blocked at API layer | closed |
| E-02 | Elevation of Privilege | `app/business/[id]/EditWizardInner.tsx` client auth | accept | See Accepted Risks AR-01 — writes still gated by Route Handler JWT check | closed |
| I-01 | Information Disclosure | `app/business/[id]/page.tsx` SSR fetch | accept | See Accepted Risks AR-02 | closed |
| I-02 | Information Disclosure | `supabaseAdmin.server.ts` service role key | mitigate | Key stored in server-only env var (no `NEXT_PUBLIC_` prefix); never imported in client components | closed |
| I-03 | Information Disclosure | `POST /api/business/update-paikka` — 500 error body | accept | See Accepted Risks AR-03 | closed |
| D-01 | Denial of Service | `POST /api/business/update-paikka` — rate limiting | accept | See Accepted Risks AR-04 | closed |
| D-02 | Denial of Service | `POST /api/business/update-paikka` — body size | mitigate | Content-Length header checked; bodies > 64 KB rejected with 413; T-02 aukioloajat structural validation further caps valid payload size | closed |
| R-01 | Repudiation | `liikuntapaikat` write history | accept | See Accepted Risks AR-05 | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | S-03, E-02 | App uses localStorage-based sessions (not cookies). Server components cannot access the auth token at SSR time — this is an architectural constraint. The `/business/[id]` server page cannot verify the session server-side. Mitigation: the client `EditWizardInner` redirects unauthenticated users before rendering any inputs, and all writes are blocked server-side by the Route Handler JWT check. | gsd-security-auditor | 2026-06-11 |
| AR-02 | I-01 | `/business/[id]/page.tsx` fetches venue data via supabaseAdmin before client auth resolves. All fetched fields (`nimi`, `laji`, `osoite`, `puhelin`, `kuvaus`, etc.) are already public — the same fields are rendered on the public `/paikat/[id]` page. No confidential data is exposed. | gsd-security-auditor | 2026-06-11 |
| AR-03 | I-03 | Supabase error messages are included in 500 response bodies. This path requires a valid JWT to reach; no anonymous information disclosure. Accepted at ASVS L1. | gsd-security-auditor | 2026-06-11 |
| AR-04 | D-01 | No per-user rate limiting on the Route Handler. Accepted at ASVS L1 — deferred to a future hardening phase. The 64 KB body cap (D-02) and Supabase connection pooling provide partial protection. | gsd-security-auditor | 2026-06-11 |
| AR-05 | R-01 | No field-level audit log for venue edits. Changes are applied directly to `liikuntapaikat` with no write history. Accepted at ASVS L1 for MVP. | gsd-security-auditor | 2026-06-11 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-11 | 16 | 16 | 0 | gsd-security-auditor (retroactive-STRIDE) |

**Fixes applied during audit (2026-06-11):**
- `E-01` — Added `.eq('claim_status', 'approved')` to `business_paikka_links` ownership check (`route.ts:43`)
- `T-04` — Added `new URL()` + `http:`/`https:` allowlist for `varauslinkki` (`route.ts:112-122`)
- `T-02` — Added structural validation for `aukioloajat` JSONB (type, key count, shape) (`route.ts:85-101`)
- `T-03` — Added `typeof string` check on each `photo_urls` item (`route.ts:62-64`)
- `D-02` — Added `Content-Length > 64 KB` rejection at handler entry (`route.ts:6-9`)

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-11
