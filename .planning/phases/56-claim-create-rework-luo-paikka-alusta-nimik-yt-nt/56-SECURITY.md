# Security Audit — Phase 56: Claim/Create Rework

**Audited:** 2026-06-24
**Plans:** 56-01 (backend), 56-02 (frontend)
**ASVS Level:** 1
**Block on:** high
**Status:** SECURED — 6/6 threats closed

Verified against current (post-review-fix) state of files, including commits `f45f7aa`, `7037d51`, `c04b9bd`, which touched threat-relevant code after initial implementation.

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|--------------|--------|----------|
| T-56-01 | Spoofing / Elevation of Privilege | mitigate | CLOSED | `app/api/business/create-paikka/route.ts:12` — `user.id` obtained from `supabaseAdmin.auth.getUser(token)`; line 92 `business_account_id: user.id` (link insert); line 126 `.eq('user_id', user.id)` (company_name UPDATE). Neither write reads an identity field from the request body. |
| T-56-02 | Tampering / DoS (name length) | mitigate | CLOSED | `lib/normalizeNimi.ts:15` — `.slice(0, 200)` caps each individual field. `app/api/business/create-paikka/route.ts:67` — combined `nimi` is re-capped: `(toimipisteNimi ? \`${yritysNimi} ${toimipisteNimi}\` : yritysNimi).slice(0, 200)`. This re-cap (added in post-review-fix commit `7037d51`) was explicitly flagged for verification in the threat register and is confirmed present in the current file. osoite/kaupunki retain their pre-existing `.trim().slice(0, 500)` inline convention (lines 39-40). |
| T-56-03 | Tampering (UNIQUE constraint bypass) | mitigate | CLOSED | `app/api/business/create-paikka/route.ts:102-108` — `linkError.code === '23505'` branch returns 409 with orphan-row rollback (`liikuntapaikat.delete().eq('id', newPaikkaId)`). Rollback-failure logging (added in `7037d51`, flagged for verification) is present at lines 104-106: `console.error('[create-paikka] CRITICAL: rollback delete failed...')`. The generic-error branch (lines 109-118) has matching rollback + logging. Constraint itself untouched (no migration changes in this phase). |
| T-56-04 | Information Disclosure (raw Places data) | accept/mitigate | CLOSED | `app/api/business/create-paikka/route.ts:46-53` — latitude/longitude are allowlist-parsed with `typeof === 'number'`, `Number.isFinite`, and range checks; no `place_id`, `formatted_address`, or other Places/Geocoding field is read from `body`. Confirmed no `...body` spread exists anywhere in the route (grep clean). Unchanged by this phase as declared. |
| T-56-05 | Tampering (client-side trim bypass) | accept | CLOSED (accepted risk, documented) | `app/components/ClaimSearchForm.tsx:72-75` — client `.trim()` on `yritysNimi`/`toimipisteNimi` is sent as-is to the server; no length cap or normalization performed client-side. The disposition is `accept` because the authoritative control (`normalizeNimi`, 200-char cap, whitespace collapse) lives server-side in `create-paikka/route.ts` per T-56-02 — verified present and independent of any client-side value. This entry constitutes the accepted-risk log entry for T-56-05: client input is never trusted; server normalizes/caps all writes regardless of what the client sends. |
| T-56-06 | Information Disclosure (409 conflict copy) | mitigate | CLOSED | `messages/fi.json:127` / `messages/en.json:127` — key `errorVenueAlreadyTaken` (renamed from the plan's `errorClaimAlreadyTaken` in post-review-fix commit `f45f7aa`; copy content unchanged): "Tämä paikka on jo rekisteröity. Ota yhteyttä tukeen, jos uskot tämän olevan virhe." / "This venue is already registered. Contact support if you believe this is a mistake." No owner identity, no "someone else claimed it" detail, no venue-specific identifier in the message. `app/components/ClaimSearchForm.tsx:87-88` wires `res.status === 409` to this key. |

## Disposition Notes

- **T-56-04 (accept/mitigate):** Treated as mitigated — the allowlist parsing it depends on is present and unchanged. No new entry-points introduced into `create-paikka` that read additional body fields.
- **T-56-05 (accept):** Accepted risk formally logged above. No further action required; client-side validation is cosmetic by design, and the disposition explicitly accepts this since the server is the trust boundary.

## Unregistered Flags

None. Neither `56-01-SUMMARY.md` nor `56-02-SUMMARY.md` contains a `## Threat Flags` section. No new attack surface was reported by the executor outside the registered threat IDs.

## Key Rename Note (non-blocking)

The 409-handling i18n key was renamed from `errorClaimAlreadyTaken` (as written in both PLAN.md threat models) to `errorVenueAlreadyTaken` during the post-review-fix pass (`f45f7aa`, task WR-04). The reworded support-pointer copy itself is unchanged and still satisfies T-56-06's mitigation intent (no identity disclosure). Documented here for traceability — not a security gap.

## Accepted Risks Log

| Threat ID | Risk | Justification | Owner |
|-----------|------|----------------|-------|
| T-56-05 | Client-side `.trim()` on name fields can be bypassed/spoofed (e.g. via direct API call bypassing the form) | Server-side `normalizeNimi` (200-char cap, whitespace collapse) is the authoritative control and is applied unconditionally in `create-paikka/route.ts` regardless of what the client sends. No security decision relies on client-side trimming. | Phase 56 |

---
*Generated by gsd-secure-phase. Implementation files were not modified during this audit.*
