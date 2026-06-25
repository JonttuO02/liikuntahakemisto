---
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
plan: "02"
subsystem: email
tags: [email, resend, access-requests, security]
status: complete

dependency_graph:
  requires: []
  provides:
    - sendAccessRequestNotificationEmail (lib/email.ts)
    - sendAccessRequestDecisionEmail (lib/email.ts)
  affects:
    - app/api/business/access-request/submit/route.ts (wave 2 — calls notification email)
    - app/api/business/access-request/approve/route.ts (wave 2 — calls decision email)
    - app/api/business/access-request/reject/route.ts (wave 2 — calls decision email)

tech_stack:
  added: []
  patterns:
    - Resend transactional email via existing lib/email.ts conventions
    - sub() header-injection defense on all subject interpolations
    - esc() XSS defense on all HTML body interpolations

key_files:
  modified:
    - lib/email.ts

decisions:
  - "Rejected-decision body omits /business link (plan spec) — matches research code example; owner-approved body includes it"
  - "reason line rendered with esc() only when params.reason is truthy (conditional template literal)"
  - "No new file created — functions appended to existing lib/email.ts per plan objective"

metrics:
  duration: "~5 minutes"
  completed: "2026-06-25T15:47:49Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 60 Plan 02: Sähköpostifunktiot hallintaoikeuspyynnöille Summary

**One-liner:** Kaksi uutta Resend-sähköpostifunktiota hallintaoikeuspyynnoille — omistajailmoitus saapuvasta pyynnöstä ja päätösilmoitus pyytäjälle — käyttäen sub()/esc()-suojauksia (T-60-05/T-60-06).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add sendAccessRequestNotificationEmail and sendAccessRequestDecisionEmail | 0fe2544 | lib/email.ts |

## What Was Built

`lib/email.ts` sai kaksi uutta vietävää funktiota:

### `sendAccessRequestNotificationEmail(to, { requesterName, venueName, requestId })`
- Lähetetään liikuntapaikan omistajalle, kun uusi hallintaoikeuspyyntö saapuu
- Subject: `[Aktiivi] Uusi hallintaoikeuspyyntö — ${sub(venueName)}`
- HTML: `<h2>Uusi hallintaoikeuspyyntö</h2>` + Pyytäjä-rivi + Paikka-rivi + linkki `/business`
- Kaikki interpolaatiot suojattu: `sub(venueName)` subjectissa, `esc(requesterName)` ja `esc(venueName)` bodyssä

### `sendAccessRequestDecisionEmail(to, { venueName, approved, reason? })`
- Lähetetään pyytäjälle, kun pyyntö hyväksytään tai hylätään
- Subject: hyväksytty → `[Aktiivi] Hallintaoikeuspyyntösi on hyväksytty — ${sub(venueName)}`, hylätty → vastaava
- Hyväksytty-body: `<h2>Pyyntösi on hyväksytty!</h2>` + paikan nimi + linkki `/business`
- Hylätty-body: `<h2>Pyyntösi on hylätty</h2>` + paikan nimi + valinnainen `Syy:`-rivi (`esc(reason)`) vain kun `params.reason` on truthy
- Kaikki interpolaatiot suojattu: `sub(venueName)` subjectissa, `esc(venueName)` ja `esc(reason)` bodyssä

## Verification

```
grep -q "export async function sendAccessRequestNotificationEmail" lib/email.ts  ✓
grep -q "export async function sendAccessRequestDecisionEmail" lib/email.ts       ✓
npx tsc --noEmit                                                                  ✓ (no output = clean)
```

Kaikki subject-interpolaatiot kulkevat `sub()`:n kautta, kaikki body-interpolaatiot `esc()`:n kautta.

## Deviations from Plan

None — suunnitelma toteutettiin täsmälleen sellaisenaan.

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|-----------|---------|
| T-60-05 | `sub()` wraps every interpolated subject string in both new functions | Yes — lines 83, 100, 101 in lib/email.ts |
| T-60-06 | `esc()` wraps every interpolated HTML body string in both new functions | Yes — lines 86, 87, 105, 110, 111 in lib/email.ts |
| T-60-SC | Zero new packages installed | Yes — reuses existing `resend` dependency |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `lib/email.ts` exists | FOUND |
| Commit 0fe2544 exists | FOUND |
| `60-02-SUMMARY.md` exists | FOUND |
