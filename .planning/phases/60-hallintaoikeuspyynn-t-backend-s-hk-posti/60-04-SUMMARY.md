---
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
plan: "04"
subsystem: backend-api
status: complete
tags: [access-request, approve, reject, concurrency, supabaseAdmin, email]
dependency_graph:
  requires: ["60-01", "60-02"]
  provides: ["ACCESS-03-lifecycle", "ACCESS-05-decision", "ACCESS-06-venue-grant"]
  affects: ["business_access_requests", "business_accounts", "business_paikka_links"]
tech_stack:
  added: []
  patterns:
    - "Concurrency-safe UPDATE ... WHERE status='pending' + count:'exact' (mirrors admin/approve)"
    - "Venue-scoped owner authorization via business_paikka_links + business_accounts.role"
    - "On-behalf-of supabaseAdmin writes bypassing RLS (D-05, T-60-12)"
    - "Non-blocking try/catch email send with [route-name] prefix logging"
key_files:
  created:
    - app/api/business/access-request/approve/route.ts
    - app/api/business/access-request/reject/route.ts
  modified: []
decisions:
  - "Used upsert (onConflict: 'business_account_id,paikka_id') for business_paikka_links grant to handle Phase 59 composite UNIQUE constraint safely"
  - "Resolved company_id for grant from caller's own business_accounts row (not a separate lookup), since the owner and requester share the same company post-approval"
metrics:
  duration: "4 min"
  completed: "2026-06-25T19:10:42Z"
  tasks_completed: 2
  files_created: 2
---

# Phase 60 Plan 04: Approve ja Reject Route Handlerit — yhteenveto

Rakennettu ACCESS-03-elinkaaren päätöshaarukka: turvalliset, samanaikaisuudelle kestävät `approve`- ja `reject`-päätepisteet hallintaoikeuspyynnöille. Molemmat peilaavat tarkasti `admin/approve`-reittikäsittelijän `UPDATE ... WHERE status='pending' + count:'exact'` -rakennetta.

## Tehtävät

| # | Nimi | Commit | Tiedostot |
|---|------|--------|-----------|
| 1 | Approve Route Handler | de2d302 | app/api/business/access-request/approve/route.ts |
| 2 | Reject Route Handler | 042ee16 | app/api/business/access-request/reject/route.ts |

## Toteutuksen yksityiskohdat

### Approve-reittikäsittelijä (`app/api/business/access-request/approve/route.ts`)

Sekvenssi (kahdeksan vaihetta):

1. **JWT-varmistus** — `supabaseAdmin.auth.getUser(token)`, 401 epäonnistuessa
2. **`request_id`-jäsennys** — `parseInt` + `isNaN`-vartija, 400 vialliselle syötteelle
3. **Pyyntörivin haku** — `business_access_requests` → `maybeSingle()`, 404 jos ei löydy
4. **Paikkakohtainen omistaja-autorisointi** (T-60-11, A3, D-04):
   - Varmistaa `business_paikka_links`-rivin (`paikka_id = row.paikka_id AND claim_status = 'approved' AND business_account_id = user.id`)
   - Varmistaa kutsujalla `role = 'owner'` business_accounts-taulusta
   - 403 jos kumpikaan ehto ei täyty
5. **Ei-pending-vartija** — nopea 409 ennen atomiikkaa
6. **Atominen tilasiirtymä** (T-60-03) — `UPDATE ... WHERE status='pending' + { count: 'exact' }` → 409 kun `count = 0`
7. **Pääsyn myöntäminen** (D-04, D-05, T-60-12, kaikki supabaseAdminin kautta):
   - UPDATE `business_accounts` SET `company_id = callerAccount.company_id, role = 'member'` WHERE `user_id = row.requester_id`
   - UPSERT `business_paikka_links { business_account_id: requester_id, paikka_id, claim_status: 'approved', link_type: 'claim' }` (`onConflict: 'business_account_id,paikka_id'` Phase 59:n komposiitti-UNIQUEn takia)
8. **Ei-kriittinen sähköposti** — `sendAccessRequestDecisionEmail(email, { venueName, approved: true })` try/catch-lohkossa

### Reject-reittikäsittelijä (`app/api/business/access-request/reject/route.ts`)

Identtinen rakenne vaiheisiin 1–5 saakka (approve), poikkeuksilla:

- **Valinnainen `reason`** — jäsennetään bodysta, trimmataan, rajataan 500 merkkiin, null kun puuttuu (ACCESS-05)
- **Atominen tilasiirtymä** — asettaa `status: 'rejected'`, `rejection_reason: reason`, `updated_at`
- **Ei pääsyn myöntämistä** — ei kirjoituksia `business_accounts`- tai `business_paikka_links`-tauluihin
- **Sähköposti** — `sendAccessRequestDecisionEmail(email, { venueName, approved: false, reason: reason ?? undefined })`

### Samanaikaisuussuoja (T-60-03)

Kaksi samanaikaista `approve`-kutsua samalle pyynölle:
- Molemmat suorittavat `UPDATE ... WHERE id=X AND status='pending'` samanaikaisesti
- Postgres-lukitus varmistaa, että vain yksi päivittää rivit onnistuneesti
- Voittaja: `count = 1` → 200 `{ ok: true }`
- Häviäjä: `count = 0` → 409 `{ error: 'Access request already processed' }`

## Poikkeamat suunnitelmasta

Automaattikorjattu ongelma:

**[Sääntö 2 - Puuttuva kriittinen toiminto] Upsert INSERT:in sijaan Phase 59:n komposiitti-UNIQUE-rajoitteen takia**
- **Löydetty:** Tehtävä 1
- **Ongelma:** Suunnitelma sanoi "INSERT a `business_paikka_links` row", mutta Phase 59:n migraatio muutti rajoitteen `UNIQUE(paikka_id)` → `UNIQUE(business_account_id, paikka_id)`. Uuden jäsenen jolla on jo hylätty linkki samalle paikalle INSERT epäonnistuisi.
- **Korjaus:** Käytetty `supabaseAdmin.from('business_paikka_links').upsert({ ... }, { onConflict: 'business_account_id,paikka_id' })` puhtaan INSERT:in sijaan.
- **Muokatut tiedostot:** `app/api/business/access-request/approve/route.ts`
- **Commit:** de2d302

## Uhkapinta-skannaus

Ei uusia tietoturvarelevantteja pintoja suunnitelman `<threat_model>`-lohkon ulkopuolella.

## Itsetarkastus: LÄPÄISTY

- FOUND: `app/api/business/access-request/approve/route.ts`
- FOUND: `app/api/business/access-request/reject/route.ts`
- FOUND commit: de2d302
- FOUND commit: 042ee16
- `npx tsc --noEmit` läpäisty molempien tehtävien jälkeen
