---
phase: 46-pre-vaihe-ui-velhointegraatio
secured: 2026-06-16
auditor: Claude (gsd-security-auditor)
source: threat models from 46-01-PLAN.md through 46-05-PLAN.md + 46-REVIEW.md
status: closed
open_count: 0
---

# Phase 46 — Security Audit

## Summary

Phase 46 introduced the "Analysoi sivusto" pre-step UI (AnalysoiSivusto), wizard
branding pre-fill (WizardInner → steps 3–5), and DiagonaalKortti brand-color rendering.
The attack surface is client-only: no new Route Handlers were added. The existing
`/api/business/analyze-website` endpoint (introduced in Phase 45) carries all
server-side risk and its mitigations were verified as still in place.

All four "mitigate" dispositions from the threat model are verified in code.
Two security-relevant findings from the code review remain open.

---

## Threat Register

| Threat ID | STRIDE | Component | Disposition | Verification |
|-----------|--------|-----------|-------------|--------------|
| T-46-01-01 | Tampering | `BrandingResult.raw_analysis` shape | ACCEPT | Client treats as read-only; server validates before writing to `business_branding` |
| T-46-01-02 | Info Disclosure | `logo_url` in BrandingResult | ACCEPT | Supabase Storage public URL for the business's own uploaded logo — no PII |
| T-46-02-01 | Tampering | `brandColor` prop → CSS `backgroundColor` | ACCEPT | React serializes inline style values — CSS injection via a hex string has no XSS vector |
| T-46-02-02 | Info Disclosure | `logo_url` in preview | ACCEPT | Same as T-46-01-02 |
| T-46-03-01 | Tampering | Branding pre-fill overwriting user edits | MITIGATE | **VERIFIED** — draft-priority chains in all three steps (see below) |
| T-46-03-02 | Info Disclosure | `website_url` from branding in StepYhteystiedot | ACCEPT | Business's own website URL submitted by the user — no PII |
| T-46-04-01 | Tampering | URL input before POST | MITIGATE | **VERIFIED** — client auto-prepends `https://`; server SSRF guard validates protocol and blocks private IPs |
| T-46-04-02 | Denial of Service | Poll loop running indefinitely | MITIGATE | **VERIFIED** — `tryCountRef.current > 30` cap at `AnalysoiSivusto.tsx:158`; interval cleared on timeout |
| T-46-04-03 | Elevation of Privilege | Missing auth token on GET/POST | MITIGATE | **VERIFIED** — `Authorization: Bearer ${token}` on every fetch call; server returns 401 if token missing or invalid |
| T-46-04-04 | Info Disclosure | `brandingResult.logo_url` in preview | ACCEPT | Same as T-46-01-02 |
| T-46-05-01 | Elevation of Privilege | `page.tsx` converted to `'use client'` | ACCEPT | RSC auth guard in `app/business/onboarding/layout.tsx` runs before `page.tsx` in Next.js render pipeline |
| T-46-05-02 | Tampering | `brandingData` prop passed to WizardInner | ACCEPT | Prop is read-only; only pre-fills form fields the user can override; no server mutations originate from this data |

---

## Mitigation Verification Details

### T-46-03-01 — Draft-priority chains (VERIFIED)

All three step components implement the documented priority chain. Verified in code:

| Step | Priority chain | File:line |
|------|---------------|-----------|
| StepHinnasto | `draftSource → brandSource → 4 fixed rows` | `StepHinnasto.tsx:67-80` |
| StepAukioloajat | `initialDraftAukioloajat ?? initialBrandingAukioloajat ?? existingAukioloajat` | `StepAukioloajat.tsx:71` |
| StepYhteystiedot | `initialYhteystiedot?.website ?? initialBrandingWebsite ?? ''` | `StepYhteystiedot.tsx:41` |

### T-46-04-01 — URL input validation (VERIFIED)

Client (`AnalysoiSivusto.tsx:219-222`): auto-prepends `https://` when no protocol prefix is present.

Server (`app/api/business/analyze-website/route.ts:106-133`):
- Rejects any protocol other than `http:` / `https:`
- Blocks `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `169.254.169.254`, private IPv4 ranges
  (`10.x`, `192.168.x`, `172.16.0.0/12`, `100.64.0.0/10`)
- Blocks IPv6 ULA ranges (`fd00::/8`, `fc00::/8`)

### T-46-04-02 — Poll loop cap (VERIFIED)

`AnalysoiSivusto.tsx:149-207`: polling effect runs `setInterval(poll, 2000)`.
`poll()` increments `tryCountRef.current`; when `> 30`, clears the interval and
sets phase to `'timeout'`. Cleanup on unmount via effect return.

### T-46-04-03 — Auth on all fetch calls (VERIFIED)

- Mount check GET (`AnalysoiSivusto.tsx:110-111`): `Authorization: Bearer ${token}`
- Poll GET (`AnalysoiSivusto.tsx:169`): `Authorization: Bearer ${token}`
- URL submit POST (`AnalysoiSivusto.tsx:229-231`): `Authorization: Bearer ${token}`

Server verifies `supabaseAdmin.auth.getUser(token)` on both GET and POST routes
(`route.ts:84-89`, `route.ts:169-172`) and returns 401 on failure.

### T-46-05-01 — RSC auth guard (VERIFIED)

`app/business/onboarding/layout.tsx`:
```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/business/kirjaudu')
```
Uses `createBusinessServerClient(cookies())` — not a client method. Runs before
`page.tsx` in the Next.js App Router pipeline regardless of `page.tsx`'s client/server mode.

---

## Findings (Resolved)

### SEC-46-01 — `console.error` leaks server error JSON in production (WR-04)

**Severity:** Low — **RESOLVED** (already fixed during UAT session, prior to this audit)  
**File:** `app/business/onboarding/StepEsikatselu.tsx:79`  
**Fix applied:** `process.env.NODE_ENV !== 'production'` gate already present at line 79.

---

### SEC-46-02 — Logo rendered from unvalidated URL origin (IN-02)

**Severity:** Low — **RESOLVED** (`app/api/business/analyze-website/route.ts`)  
**Fix applied:** GET endpoint now strips `logo_url` when it does not start with
`NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/'` before returning the response:
```ts
if (data?.logo_url) {
  const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/'
  if (!data.logo_url.startsWith(storageBase)) {
    data.logo_url = null
  }
}
```
A compromised analysis pipeline can no longer cause the client to render images
from arbitrary origins.

---

## Carry-Forward from Phase 45

These items were documented in Phase 45's threat model and remain accepted limitations:

| ID | Location | Issue | Status |
|----|----------|-------|--------|
| P45-WR-05 | `lib/branding/storage.ts` — `uploadLogo` | No UUID format assertion on `businessAccountId`; path traversal possible if call site changes | Accepted for v2.1 — call site is controlled by Route Handler auth check |
| P45-DNS | `app/api/business/analyze-website/route.ts:103-133` | SSRF guard checks hostname before DNS resolution — DNS rebinding bypasses it | Accepted for v2.1; post-DNS IP validation adds latency; business-account FK reduces abuse surface |

---

## Pre-existing Issues (not introduced by Phase 46)

| ID | Location | Issue |
|----|----------|-------|
| CR-01 | `app/business/[id]/page.tsx` | Reads venue data without ownership check — pre-existing since Phase 38 |
| CR-02 | `app/business/onboarding/submit/route.ts` | Does not filter by `paikka_id` — pre-existing since Phase 38 |
