---
phase: 06
slug: ui-polish-and-data-foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 6 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser ↔ Next.js server | Page requests, RSC streaming | paikat array (public), filter state (ephemeral client) |
| Next.js server ↔ Supabase | SELECT queries via anon key | Venue records including `featured` boolean, `kaupunki`, `varauslinkki`, price fields |
| Browser ↔ External booking sites | `varauslinkki` hrefs (isSafeUrl guard) | URL only — no session tokens, no cookies forwarded |
| Browser ↔ Open-Meteo API | Weather fetch via `/api/saasuositus` Route Handler | Temperature + weather code (no user data) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-06-01 | Tampering | `featured` column via anon key | accept | RLS `public_read` policy is SELECT-only; anon role cannot UPDATE. Verified in RESEARCH.md Security Domain. | closed |
| T-06-02 | Information Disclosure | `featured` boolean exposed to all clients | accept | Marketing flag, not PII or sensitive data. Intentional — renders as Sponsoroitu badge to all users (ADS-02). | closed |
| T-06-03 | Tampering (XSS) | GDPR prose page `/tietosuoja` | mitigate | Pure server component, no `'use client'`, no `dangerouslySetInnerHTML`. All string content escaped by React. Verified in 06-02-SUMMARY.md. | closed |
| T-06-04 | Information Disclosure | Placeholder tokens in privacy page | accept | `[Rekisterinpitäjä]` and `[yhteyssähköposti@esimerkki.fi]` replaced with real values (`Liikuntahakemisto`, `joona.orava@gmail.com`) by code review fix WR-03. No PII at this stage. | closed |
| T-06-05 | Tampering (tabnabbing) | External booking link on profile page | mitigate | Anchor enforces `rel="noopener noreferrer"` + `target="_blank"`. Verified in 06-03-SUMMARY.md. | closed |
| T-06-06 | Tampering (XSS via javascript: URL) | `varauslinkki` rendered as `href` | mitigate | Code review CR-02 added `isSafeUrl()` in `lib/urlUtils.ts` — only `http:` and `https:` protocols allowed. Both `app/paikat/[id]/page.tsx` and `app/components/Etusivu.tsx` gated on `isSafeUrl(varauslinkki)`. Stronger than original plan disposition. | closed |
| T-06-07 | Tampering | DB-supplied `kaupunki` strings in filter | accept | RLS restricts writes to service role. `deriveKaupungit` treats input as opaque strings; React auto-escapes option text and value bindings. | closed |
| T-06-08 | Denial of Service | Large `paikat` arrays in `deriveKaupungit` | accept | O(n log n) sort; current data scale (~hundreds of rows) is trivial. No mitigation needed at this scale. | closed |
| T-06-09 | Tampering (XSS) | `hinta_kuvaus` rendered into multi-line price spans | mitigate | React text nodes auto-escape; `<span>{line}</span>` never uses `dangerouslySetInnerHTML`. Verified in 06-05-SUMMARY.md. | closed |
| T-06-10 | Tampering | `paikka.featured` boolean controls amber badge | accept | Conditional render only — flips badge visibility, grants no privileges. RLS keeps anon role read-only. | closed |
| T-06-11 | Tampering (XSS) | `kaupunki` strings as `<option>` text and value | mitigate | React escapes text nodes and attribute values for option/value bindings. No `dangerouslySetInnerHTML`. Verified in 06-06-SUMMARY.md. | closed |
| T-06-12 | Information Disclosure | `/tietosuoja` route publicly accessible | accept | Intentional — LEGAL-01 requires public access to GDPR page before auth ships. | closed |
| T-06-13 | Spoofing | City/sport filter state is client-only (no URL) | accept | Ephemeral state per CLAUDE.md design decision. Only `?nakyma=` is URL-encoded. No auth boundary crossed. | closed |
| T-06-14 | Tampering (XSS) | `WEATHER_CITY` constant rendered in JSX | mitigate | Compile-time string literal (`'Tampere'`); React text node auto-escapes. No user input on this path. Verified in 06-07-SUMMARY.md. | closed |
| T-06-15 | Tampering | `valittu.featured` controls bottom-sheet badge | accept | Boolean flag; RLS keeps anon role read-only; no privilege granted by badge visibility. | closed |
| T-06-16 | Information Disclosure | Featured venues visible to anonymous map users | accept | Intentional — ADS-02 explicitly requires public visibility of sponsored badges. | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-01 | RLS is the enforcement layer — anon key is SELECT-only per v1.0 RLS policy | Joona Orava | 2026-05-22 |
| AR-06-02 | T-06-02 | `featured` is a non-sensitive marketing flag; public exposure is the intended design (ADS-02) | Joona Orava | 2026-05-22 |
| AR-06-04 | T-06-04 | Placeholder tokens replaced with real values before UAT; GDPR compliance met | Joona Orava | 2026-05-22 |
| AR-06-07 | T-06-07 | RLS + React auto-escape is the combined control; no additional sanitization needed for city strings | Joona Orava | 2026-05-22 |
| AR-06-08 | T-06-08 | DoS surface is trivial at current data scale; revisit at 10k+ venues | Joona Orava | 2026-05-22 |
| AR-06-10 | T-06-10 | Badge visibility is cosmetic only — no privilege escalation path exists | Joona Orava | 2026-05-22 |
| AR-06-12 | T-06-12 | LEGAL-01 mandates public GDPR page; this is intentional architecture | Joona Orava | 2026-05-22 |
| AR-06-13 | T-06-13 | Ephemeral client filter state per CLAUDE.md; no session or auth data involved | Joona Orava | 2026-05-22 |
| AR-06-15 | T-06-15 | Same as AR-06-10 — boolean badge, no privilege path | Joona Orava | 2026-05-22 |
| AR-06-16 | T-06-16 | ADS-02 design intent; sponsored badges are public marketing | Joona Orava | 2026-05-22 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 16 | 16 | 0 | Claude (gsd-security-auditor, short-circuit — plan-time register, all threats closed) |

**Notes:**
- T-06-06 mitigation was strengthened beyond the plan disposition: original plan accepted "href is opaque to renderer + anon read-only", but code review CR-02 identified `javascript:` XSS risk and added `lib/urlUtils.ts::isSafeUrl()` as an allowlist guard for `http:`/`https:` only. Both render sites updated.
- T-06-04 placeholder tokens were filled with real values (`Liikuntahakemisto`, `joona.orava@gmail.com`) as part of code review WR-03 fix — no longer a compliance gap.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-22
