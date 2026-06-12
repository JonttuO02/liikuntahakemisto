# SECURITY.md — Phase 36: Hallintapaneeli

**Audit date:** 2026-06-11
**Auditor:** Retroactive-STRIDE (automated)
**Phase:** 36 — Hallintapaneeli (Business Admin Panel)
**ASVS Level:** L1
**Audit mode:** Retroactive (no formal threat model existed at plan time)

---

## Threat Register

| threat_id | category | component | description | severity | status | evidence |
|-----------|----------|-----------|-------------|----------|--------|---------|
| S-01 | Spoofing | `POST /api/business/update-paikka` | Attacker sends a forged or replayed JWT to impersonate a legitimate business user | HIGH | CLOSED | `route.ts:9` — `supabaseAdmin.auth.getUser(token)` validates JWT cryptographic signature server-side |
| S-02 | Spoofing | `app/business/page.tsx` | Attacker manipulates `business_account_id` in a query by crafting a request with a different user's session | HIGH | CLOSED | `page.tsx:83` — query uses `.eq('business_account_id', user.id)` where `user.id` comes from the verified session, never from the request body |
| S-03 | Spoofing | `EditWizardInner` client auth check | Client-side auth check could be bypassed in-browser (JS disabled, DOM manipulation) | MEDIUM | ACCEPTED | Architectural constraint — see Accepted Risks §1. All writes are gated by server-side JWT+ownership check in the Route Handler. |
| T-01 | Tampering | `POST /api/business/update-paikka` | Authenticated business user edits a venue they do not own by supplying a foreign `paikka_id` | CRITICAL | CLOSED | `route.ts:33-45` — ownership verified via `business_paikka_links` lookup tying `user.id` to `paikka_id` before any write |
| T-02 | Tampering | `POST /api/business/update-paikka` (section: aukioloajat) | Attacker sends an arbitrarily large or deeply nested JSON object as `data` for `aukioloajat`, potentially overloading DB or schema | MEDIUM | OPEN | `route.ts:81-83` — `data` is passed directly to `updatePayload` with zero structural validation. No key whitelist, no depth/size check, no type guards on nested values. See Findings §T-02. |
| T-03 | Tampering | `POST /api/business/update-paikka` (section: mediat) | Attacker injects arbitrary non-URL strings (e.g. `javascript:` scheme, SQL, script tags) into `logo_url` or `photo_urls` array items | MEDIUM | OPEN | `route.ts:51-59` — `logo_url` accepted as `string | null` with no URL format or scheme validation. `photo_urls` items are not type-checked as strings. See Findings §T-03. |
| T-04 | Tampering | `POST /api/business/update-paikka` (section: yhteystiedot) | Attacker stores a `javascript:` or `data:` URI in `varauslinkki` (booking URL), which renders as a link in the public profile page | MEDIUM | OPEN | `route.ts:87` — `varauslinkki` is trimmed but not validated as a safe URL scheme. No `http`/`https` allowlist. See Findings §T-04. |
| T-05 | Tampering | `POST /api/business/update-paikka` (section: hinnasto) | Attacker sends extremely large floats (Infinity, NaN) or negative prices for `hinta_min`/`hinta_max` | LOW | CLOSED | `route.ts:67-75` — type-checks `typeof !== 'number'` reject non-numeric values. JavaScript `Infinity`/`NaN` are technically `typeof 'number'` but Supabase's numeric column will reject them at the DB layer. Accepted residual at L1. |
| R-01 | Repudiation | All write operations | No audit trail of which user changed which field at what time | LOW | ACCEPTED | See Accepted Risks §2. Supabase does not automatically log field-level changes; no logging middleware is in scope for this phase at L1. |
| I-01 | Information Disclosure | `app/business/[id]/page.tsx` | Server component fetches full `liikuntapaikat` row (including `puhelin`, `varauslinkki`, `kuvaus`) and passes it to the client component, making it available in the HTML even before auth is confirmed | LOW | ACCEPTED | See Accepted Risks §3. All fetched fields are public information already exposed on `/paikat/[id]`. Service role key is server-only; it is not transmitted to the client. |
| I-02 | Information Disclosure | `supabaseAdmin.server.ts` | Service role key exposure if imported into a client component | CRITICAL | CLOSED | `supabaseAdmin.server.ts:1` — comment + `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) prevents bundling into client. Verified no client components import this module. |
| I-03 | Information Disclosure | Route Handler error responses | `detail: linkError.message` and `detail: updateError.message` in 500 responses leak internal Supabase error strings to callers | LOW | ACCEPTED | See Accepted Risks §4. L1 product, authenticated endpoint — acceptable for debuggability. |
| D-01 | Denial of Service | `POST /api/business/update-paikka` | No rate limiting — authenticated user can flood the endpoint with rapid repeated writes | LOW | ACCEPTED | See Accepted Risks §5. No rate-limiting middleware is present. Supabase connection pooling provides a soft floor. Not in scope at L1. |
| D-02 | Denial of Service | `POST /api/business/update-paikka` (section: aukioloajat) | Extremely large payload (e.g. multi-MB JSON body) accepted without body size guard | LOW | OPEN | Next.js default body limit is 4 MB; no explicit limit set. Combined with T-02 (no structural validation on `aukioloajat`), oversized payloads can reach the DB. Lower severity than T-02 because Next.js platform limit provides a floor. |
| E-01 | Elevation of Privilege | `POST /api/business/update-paikka` | Authenticated user with a `business_paikka_links` row for `paikka_id` X can update venue data even if their claim has `claim_status = 'pending'` or `'rejected'` | MEDIUM | OPEN | `route.ts:33-45` — ownership check queries only `business_account_id` and `paikka_id`, with no `claim_status = 'approved'` filter. See Findings §E-01. |
| E-02 | Elevation of Privilege | `app/business/[id]/EditWizardInner.tsx` | Client-side auth checks `business_accounts` membership but does NOT verify that the authenticated user owns this specific `paikka_id` | LOW | CLOSED | This is intentional and safe by design — the client check is a UX gate only. The server-side ownership check in the Route Handler (`T-01` / `route.ts:33-45`) is the actual enforcement layer. Confirmed by design comment in `page.tsx:8-9`. |

---

## Findings

### T-02 — `aukioloajat` section: no structural validation (OPEN)

**File:** `app/api/business/update-paikka/route.ts`, line 81–83

**Code:**
```typescript
} else if (section === 'aukioloajat') {
  updatePayload = { aukioloajat: data }
```

The `data` value is passed directly into the DB update payload without any validation. A malicious authenticated user can send:
- Arbitrarily nested objects (no depth limit)
- Non-standard keys outside the expected day-name set (`monday`–`sunday`)
- Arrays, numbers, or other types instead of `{ open: string, close: string }` values

All other sections (`hinnasto`, `yhteystiedot`, `mediat`) apply explicit field extraction and type guards before building `updatePayload`. `aukioloajat` is the only section that does not.

**Impact:** An approved business user could store malformed JSONB in the `aukioloajat` column, potentially breaking rendering logic that consumes this field, or storing excessively large payloads.

**Recommended fix (implementation team):** Extract only whitelisted day keys and validate the shape:
```typescript
const VALID_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const d = data as Record<string, unknown>
const validated: Record<string, { open: string; close: string }> = {}
for (const day of VALID_DAYS) {
  const v = d[day]
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const entry = v as Record<string, unknown>
    if (typeof entry.open === 'string' && typeof entry.close === 'string') {
      validated[day] = { open: entry.open.slice(0, 5), close: entry.close.slice(0, 5) }
    }
  }
}
updatePayload = { aukioloajat: validated }
```

---

### T-03 — `mediat` section: URL values not validated (OPEN)

**File:** `app/api/business/update-paikka/route.ts`, lines 51–59

`logo_url` is accepted as `string | null` with no URL format check. The `photo_urls` array is validated for length (`> 5` check) but individual items are not checked to be strings, nor validated as `https://` URLs.

An authenticated user can store arbitrary strings — including `javascript:` scheme URIs, empty strings, or extremely long strings — in these fields. These values propagate to public-facing components (`PaikkaKortti`, `DiagonaalKortti`, `PaikkaSheet`) where they appear as `img src` attributes.

**Recommended fix:** Add a URL allowlist check per item:
```typescript
function isValidMediaUrl(u: unknown): u is string {
  if (typeof u !== 'string') return false
  try { const p = new URL(u); return p.protocol === 'https:' } catch { return false }
}
```
Apply to `logo_url` (when non-null) and each element of `photo_urls`.

---

### T-04 — `varauslinkki` not scheme-validated (OPEN)

**File:** `app/api/business/update-paikka/route.ts`, line 87

`varauslinkki` (booking URL) is trimmed but not validated for scheme. Any string value, including `javascript:alert(1)` or `data:text/html,...`, is accepted and stored. This URL is rendered as an anchor (`<a href={paikka.varauslinkki}>`) on the public `/paikat/[id]` profile page.

**Impact:** XSS via `javascript:` scheme link on a public page visible to all visitors. Severity is elevated because this affects unauthenticated public users, not just the business user who set the value.

**Recommended fix:**
```typescript
const varauslinkki = (() => {
  const v = typeof d.varauslinkki === 'string' ? d.varauslinkki.trim() : undefined
  if (!v) return undefined
  try { const p = new URL(v); return (p.protocol === 'https:' || p.protocol === 'http:') ? v : undefined }
  catch { return undefined }
})()
```

---

### E-01 — Ownership check does not enforce `claim_status = 'approved'` (OPEN)

**File:** `app/api/business/update-paikka/route.ts`, lines 33–45

The ownership check verifies that a row exists in `business_paikka_links` for `(business_account_id, paikka_id)` but does not filter by `claim_status`. This means a business user whose claim is `'pending'` review or has been `'rejected'` can still call the edit endpoint and modify venue data.

The admin approval workflow (phases 35) is intended to gate edit access to approved businesses only. The current implementation allows pending and rejected claimants to modify live venue data, which bypasses the approval control entirely.

**Recommended fix:**
```typescript
.eq('claim_status', 'approved')
```
Add this filter to the `business_paikka_links` query at `route.ts:37`.

---

## Accepted Risks

### 1 — Client-side auth guard (S-03)

The `/business/[id]` server component does not perform server-side auth because the app uses localStorage-based sessions (not cookies). Auth is enforced client-side in `EditWizardInner` via `createBrowserSupabase().auth.getUser()`. An unauthenticated visitor who disables JavaScript will see a spinner that never resolves (not a security bypass, but a UX gap). All state-mutating writes are protected server-side by JWT verification in the Route Handler. This is an architectural constraint documented in `app/business/[id]/page.tsx:8-9`.

### 2 — No field-level audit log (R-01)

There is no audit trail recording which user changed which venue field at what time. At ASVS L1 for an MVP product, this is accepted. A future phase could add a `venue_edit_log` table populated by a Supabase trigger.

### 3 — Venue data pre-fetched before client auth confirmation (I-01)

The server component at `/business/[id]/page.tsx` fetches full venue data (including phone number and booking URL) before client-side auth is confirmed. All fetched fields are already public on `/paikat/[id]`, so this does not constitute a data exposure beyond what is already public. The `supabaseAdmin` key used for this fetch is server-only and never reaches the client.

### 4 — Supabase error details in 500 responses (I-03)

`detail: linkError.message` and `detail: updateError.message` are included in HTTP 500 error bodies. These are Supabase-level error messages that may include table or column names. The endpoint requires a valid JWT to reach error paths, limiting exposure to authenticated users. Accepted at L1.

### 5 — No rate limiting on write endpoint (D-01)

`POST /api/business/update-paikka` has no rate limiting. An authenticated user can issue rapid repeated writes. Supabase connection pooling (PgBouncer) provides a soft floor. Deploying behind Vercel's edge network provides some protection. Formal rate limiting is deferred to a future hardening phase.

---

## Summary

| status | count |
|--------|-------|
| CLOSED | 7 |
| OPEN | 5 |
| ACCEPTED | 5 |
| **TOTAL** | **17** |

**Open threats requiring implementation fix before production hardening:**
- T-02 — `aukioloajat` data passed to DB without structural validation
- T-03 — Media URLs not validated for scheme or string type
- T-04 — `varauslinkki` not scheme-validated (public XSS vector)
- E-01 — Ownership check does not enforce `claim_status = 'approved'`
- D-02 — No explicit request body size limit on `aukioloajat` path
