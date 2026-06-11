---
phase: 38-business-data-publication
verified: 2026-06-11T20:00:00Z
status: gaps_found
score: 6/8 must-haves verified
overrides_applied: 0
re_verification: false
gaps:
  - truth: "Triggeri on ainoa paikka, joka asettaa business_managed=true — kaikki ennenaikaiset kirjoitukset on poistettu"
    status: failed
    reason: "app/api/business/onboarding/submit/route.ts asettaa business_managed: true suoraan liikuntapaikat-tauluun (rivi 77) ilman admin-hyväksyntää. Phase 38-02 poisti tämän muutoksen claim-paikka- ja create-paikka-reiteistä, mutta jätti onboarding/submit-reitin käsittelemättä. Tämä kumoaa D-01:n 'triggeri on ainoa totuuden lähde' -periaatteen."
    artifacts:
      - path: "app/api/business/onboarding/submit/route.ts"
        issue: "Rivi 77: business_managed: true asetetaan liikuntapaikat.update()-kutsussa ennen admin-hyväksyntää. Onboarding-submission tekee paikan business_managed=true:ksi välittömästi kun yrittäjä täyttää lomakkeen — riippumatta siitä, hyväksyykö admin sen koskaan."
    missing:
      - "Poista business_managed: true riveiltä 66-79 onboarding/submit/route.ts:stä. Kentän arvo tulee pelkästään triggeriltä (PUB-01) admin-hyväksynnän yhteydessä."
  - truth: "npx tsc --noEmit läpäisee ilman virheitä kaikkien muutosten jälkeen"
    status: failed
    reason: "TypeScript-tarkistus ajettiin ja läpäisi (exit 0), mutta onboarding/submit-reitin business_managed-kentän semantiikka on rikki — ks. edellinen kohta. Tämä ei ole TypeScript-virhe vaan looginen virhe, joka läpäisee type-checkin."
    artifacts:
      - path: "app/api/business/onboarding/submit/route.ts"
        issue: "TypeScript ei havaitse semanttista virhettä — business_managed: true on tyypillisesti kelvollinen arvo, mutta se asetetaan väärässä kohdassa liiketoimintalogiikka-mielessä."
    missing:
      - "Poista business_managed: true onboarding/submit-reitistä (ks. yllä). Sen jälkeen tsc-tarkistus on sekä syntaktisesti että semanttisesti oikein."
---

# Phase 38: Business Data Publication — Verification Report

**Phase Goal:** Admin-hyväksyntä julkaisee paikan atomisesti ja verifikaatio-tikki näkyy kaikkialla missä paikan nimi esitetään.
**Verified:** 2026-06-11T20:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | `20260611000001_approval_trigger.sql` sisältää kelvollisen AFTER UPDATE -triggerin joka asettaa published=true ja business_managed=true atomisesti | VERIFIED | Tiedosto olemassa. CREATE OR REPLACE FUNCTION public.set_business_managed_on_approval(), RETURNS trigger, SECURITY DEFINER, UPDATE liikuntapaikat SET published = true, business_managed = true WHERE id = NEW.paikka_id, AFTER UPDATE OF claim_status ON business_paikka_links, WHEN (NEW.claim_status = 'approved'), DROP TRIGGER IF EXISTS ennen CREATE TRIGGER. |
| 2 | `claim-paikka/route.ts` sisältää vain `.update({ is_claimed: true })` — ei `business_managed: true` update-kutsussa | VERIFIED | Rivi 56: `.update({ is_claimed: true })`. Tiedostossa ei ole `business_managed: true` update-kutsuissa. |
| 3 | `create-paikka/route.ts` INSERT ei sisällä `business_managed: true` — `published: false` on edelleen mukana | VERIFIED | Rivi 38: `.insert({ nimi, osoite, kaupunki, laji: 'Muu', published: false })`. Ei `business_managed`-kenttää insert-objektissa. |
| 4 | `approve/route.ts` ei sisällä `link.link_type === 'created'` eikä `update({ published: true })` — Step 6 on poistettu kokonaan | VERIFIED | grep-tarkistus: ei osumia. Step 5 (claim_status='approved') ja Step 6 (sähköposti) ovat paikallaan. |
| 5 | `lib/types.ts` Liikuntapaikka-tyyppi sisältää sekä `is_claimed?: boolean | null` että `business_managed?: boolean | null` | VERIFIED | Rivit 22–23: molemmat kentät lisätty photo_urls:n jälkeen, optional-konventiota noudattaen. |
| 6 | `app/page.tsx` SELECT-merkkijono sisältää `is_claimed` ja `business_managed` | VERIFIED | Rivi 7: SELECT-merkkijonossa on molemmat kentät. |
| 7 | `PaikkaKortti.tsx`, `DiagonaalKortti.tsx` ja `PaikkaSheet.tsx` importoivat BadgeCheck:n ja renderöivät sen ehdollisesti kun `paikka.business_managed === true` luokalla `w-3.5 h-3.5 ml-1 inline-block align-middle` | VERIFIED | Kaikki kolme komponenttia tarkistettu. BadgeCheck importattu lucide-react:ista. Ehdollinen renderöinti `{paikka.business_managed && <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />}` löytyy PaikkaKortista (rivi 92), DiagonaalKortista (rivi 113) ja PaikkaSheetistä (rivi 174). PaikkaSheet: ikoni on `<h2 className="font-bold text-white ...">`:n sisällä. |
| 8 | Triggeri on ainoa paikka joka asettaa `business_managed=true` — kaikki ennenaikaiset kirjoitukset poistettu | FAILED | `app/api/business/onboarding/submit/route.ts` rivi 77 sisältää `business_managed: true` suoraan `liikuntapaikat.update()`-kutsussa. Tämä asetetaan kun yrittäjä lähettää onboarding-lomakkeen — ennen kuin admin on hyväksynyt hakemuksen. Phase 38-02 poisti tämän vain claim-paikka- ja create-paikka-reiteistä, mutta jätti onboarding/submit-reitin käsittelemättä. |

**Score:** 6/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `supabase/migrations/20260611000001_approval_trigger.sql` | Postgres AFTER UPDATE -triggeri (PUB-01) | VERIFIED | 27 riviä, sisältää kaikki vaadittavat SQL-lauseet |
| `app/api/business/claim-paikka/route.ts` | `.update({ is_claimed: true })` ilman business_managed (D-02) | VERIFIED | Rivi 56 vastaa suunnitelmaa |
| `app/api/business/create-paikka/route.ts` | INSERT ilman business_managed, published: false mukana (D-03) | VERIFIED | Rivi 38 vastaa suunnitelmaa |
| `app/api/admin/approve/route.ts` | Step 6 (manuaalinen published=true UPDATE) poistettu (D-06) | VERIFIED | Tiedostossa ei ole link_type-ehtoa eikä update(published:true) -kutsua |
| `lib/types.ts` | is_claimed ja business_managed optional-kentät (PUB-02) | VERIFIED | Rivit 22–23 |
| `app/page.tsx` | SELECT sisältää is_claimed ja business_managed (PUB-03) | VERIFIED | Rivi 7 |
| `app/components/PaikkaKortti.tsx` | BadgeCheck ehdollinen renderöinti (PUB-04) | VERIFIED | Rivit 5, 92–94 |
| `app/components/DiagonaalKortti.tsx` | BadgeCheck ehdollinen renderöinti (PUB-04) | VERIFIED | Rivit 6, 113–115 |
| `app/components/PaikkaSheet.tsx` | BadgeCheck h2:n sisällä hero-alueella (PUB-04) | VERIFIED | Rivit 4, 174–176 |
| `app/api/business/onboarding/submit/route.ts` | EI saa sisältää business_managed: true (D-01) | FAILED | Rivi 77: business_managed: true asetetaan onboarding-lähetyksen yhteydessä ilman admin-hyväksyntää |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| approve/route.ts Step 5 | business_paikka_links.claim_status | `.update({ claim_status: 'approved' })` | WIRED | Rivi 51: supabaseAdmin.from('business_paikka_links').update({claim_status:'approved'}).eq('id', linkId) |
| approval_trigger | liikuntapaikat | AFTER UPDATE OF claim_status WHEN approved | WIRED | SQL-tiedostossa täysi trigger-ketju. Huom: Lokaalin Supabase-instanssin Docker ei ollut käytettävissä — migraatiota ei ajeta testikantaan (SUMMARY kirjaa tämän tiedoksi) |
| page.tsx SELECT | PaikkaKortti / DiagonaalKortti / PaikkaSheet | business_managed-kenttä prop-ketjussa | WIRED | SELECT hakee business_managed → Etusivu → kortti-komponentit käyttävät paikka.business_managed |
| BadgeCheck | paikka.business_managed | ehdollinen renderöinti | WIRED | Kolme komponenttia renderöivät ikonin iff business_managed===true |
| onboarding/submit | liikuntapaikat.business_managed | suora UPDATE (väärä) | OIKOSULKU | Rivi 77 kirjoittaa business_managed=true ohittaen triggerin — tämä polku on vaihtoehtoinen reitti joka toimii ilman admin-hyväksyntää |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| PaikkaKortti | paikka.business_managed | page.tsx SELECT → Etusivu props | Kyllä — SELECT:ssä mukana, DB-sarake olemassa | FLOWING |
| DiagonaalKortti | paikka.business_managed | page.tsx SELECT → Etusivu props | Kyllä | FLOWING |
| PaikkaSheet | paikka.business_managed | page.tsx SELECT → Etusivu props | Kyllä | FLOWING |

**Huomio data-virrasta:** `app/page.tsx` ei sisällä `photo_urls` eikä `logo_url`-kenttiä SELECT-kyselyssä. DiagonaalKortti ja PaikkaSheet käyttävät molempia näitä kenttiä (logo ja kuvagalleria). Tämä tarkoittaa, että yrityspaikan logo ja kuvat eivät koskaan näy listanäkymässä — aina näytetään fallback-ikonit. Tämä on merkitty kriittiseksi varoitukseksi Code Review -raportissa (WR-01), mutta se ei ole Phase 38:n must-have-ehto.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Trigger-tiedosto on syntaktisesti ehjä | `grep -c "CREATE\|RETURNS\|UPDATE\|WHEN" supabase/migrations/20260611000001_approval_trigger.sql` | 4 osumaa | PASS |
| TypeScript-tarkistus | `npx tsc --noEmit` | exit 0, ei tulostetta | PASS |
| Approve-reitissä ei manuaalista published-kirjoitusta | `grep "link_type.*created\|update.*published.*true" app/api/admin/approve/route.ts` | ei osumia | PASS |
| onboarding/submit sisältää business_managed: true | `grep "business_managed" app/api/business/onboarding/submit/route.ts` | rivi 77: `business_managed: true,` | FAIL |

---

### Probe Execution

Phase 38 ei määrittele probe-skriptejä. Supabase-migraatiota ei voitu ajaa paikallisesti (Docker ei käytettävissä — SUMMARY.md kirjaa tämän poikkeamaksi). SKIPPED.

---

### Requirements Coverage

| Requirement | Lähdesuunnitelma | Kuvaus | Status | Näyttö |
|-------------|-----------------|--------|--------|--------|
| PUB-01 | 38-01 | Admin-hyväksyntä asettaa published=true JA business_managed=true atomisesti Postgres-triggerillä | OSITTAIN | Triggeri-SQL olemassa ja oikein kirjoitettu. Onboarding/submit kirjoittaa business_managed=true myös ilman hyväksyntää — triggerin yksinoikeus rikottu. |
| PUB-02 | 38-03 | Liikuntapaikka-tyyppi sisältää is_claimed ja business_managed -kentät | SATISFIED | lib/types.ts rivit 22–23 |
| PUB-03 | 38-03 | app/page.tsx SELECT hakee is_claimed ja business_managed | SATISFIED | page.tsx rivi 7 |
| PUB-04 | 38-03 | Verifikaatio-tikki PaikkaKortissa, DiagonaalKortissa ja PaikkaSheetissä kun business_managed=true | SATISFIED | Kaikki kolme komponenttia tarkistettu |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `app/api/business/onboarding/submit/route.ts` | 77 | `business_managed: true` update-kutsussa ilman admin-hyväksyntää | BLOCKER | Kumoaa PUB-01:n tarkoituksen: paikka saa business_managed=true status välittömästi kun yrittäjä lähettää onboarding-lomakkeen, ei vasta admin-hyväksynnän jälkeen |

**Muut koodikatselmusraportissa (38-REVIEW.md) mainitut kriittiset löydöt (CR-01 — CR-04) ovat todennetusti korjaamatta:**

| Löytö | Tiedosto | Status |
|-------|----------|--------|
| CR-01: Kuka tahansa autentikoitunut käyttäjä voi tehdä claim/create — ei business_accounts-tarkistusta | claim-paikka ja create-paikka -reitit | AVOIN |
| CR-02: is_claimed-lippua ei nollata hylkäyksessä — pysyvä dataeheys-rikko | reject/route.ts | AVOIN |
| CR-03: Email-subject-injection käyttäjäkontrolloidulla datalla | lib/email.ts | AVOIN |
| CR-04: Triggeri ei raportoi virhettä kun paikka_id ei löydy — silent no-op | approval_trigger.sql | AVOIN |

Nämä löydöt on dokumentoitu Phase 38:n Code Review -raportissa mutta ne eivät ole Phase 38:n must-have-ehtojen piirissä. Ne ovat turvallisuus- ja dataeheys-varoituksia seuraavia faaseja varten.

---

### Human Verification Required

#### 1. Migraation ajo tuotantokantaan

**Test:** Aja `npx supabase db push` (tai liitä SQL suoraan Supabase Dashboard SQL Editor -näkymään) ja tarkista `npx supabase migration list` -tulostuksesta, että `20260611000001_approval_trigger.sql` on listattu ja `applied=true`.

**Expected:** Migraatio ajautuu onnistuneesti. `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'set_business_managed_on_approval';` palauttaa yhden rivin. `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'approval_publish_trigger';` palauttaa yhden rivin.

**Why human:** Docker ei ollut käytettävissä kehitysympäristössä. Migraatiota ei voida ajaa automaattisesti tässä verifikaatioprosessissa.

#### 2. End-to-end-testi: Admin hyväksyy haemuksen → paikka näkyy tikillä

**Test:** (1) Kirjaudu sisään yritystilinä ja lähetä onboarding-lomake loppuun. (2) Kirjaudu admin-tilinä ja hyväksy hakemus `/admin`-paneelista. (3) Lataa etusivu — varmista, että paikan nimen vieressä näkyy BadgeCheck-tikki. (4) Avaa PaikkaSheet paikan kortista — varmista, että tikki näkyy myös hero-alueen h2:ssa.

**Expected:** Tikki näkyy vain ja ainoastaan business_managed=true -paikoilla. Hyväksynnän jälkeen (ei ennen) paikka näkyy julkaistuuna ja tikkiä kantavana.

**Why human:** Vaatii ajettavan Supabase-instanssin triggereineen sekä kirjautumisen kahteen eri tiliin.

---

### Gaps Summary

Phase 38 saavutti 6/8 must-have-ehdosta. Kaksi ehtoa epäonnistui saman juurisyyn vuoksi:

**Kriittinen aukko: `onboarding/submit/route.ts` asettaa `business_managed: true` ohittaen triggerin**

Phase 38-02 poisti `business_managed: true` -kirjoitukset kolmesta reitistä (`claim-paikka`, `create-paikka`, `approve`), mutta neljäs reitti — `onboarding/submit/route.ts` — jäi käsittelemättä. Tämä reitti asettaa `business_managed: true` suoraan kun yrittäjä lähettää täydennetyn onboarding-lomakkeen, ennen kuin admin on hyväksynyt hakemuksen.

Käytännön vaikutus: Onboarding-ketjussa venue saa `business_managed=true` -statuksen heti kun yrittäjä täyttää lomakkeen — ei vasta admin-hyväksynnän jälkeen. Verifikaatio-tikki voi näkyä hyväksymättömissä paikoissa. Triggeri on tarpeeton tämän polun osalta.

**Korjaustoimenpide:** Poista `business_managed: true` riviltä 77 tiedostosta `app/api/business/onboarding/submit/route.ts`. Kentän arvo tulee pelkästään triggeriltä kun admin hyväksyy hakemuksen asettamalla `claim_status = 'approved'`.

---

_Verified: 2026-06-11T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
