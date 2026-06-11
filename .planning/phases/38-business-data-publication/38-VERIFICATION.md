---
phase: 38-business-data-publication
verified: 2026-06-11T21:00:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "Triggeri on ainoa paikka joka asettaa business_managed=true — onboarding/submit/route.ts rivi 77 poistettu"
    - "npx tsc --noEmit läpäisee ilman virheitä — semanttinen virhe korjattu yhdessä aukkokorjauksen kanssa"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Aja supabase db push tai liitä SQL Supabase Dashboard SQL Editoriin ja tarkista npx supabase migration list"
    expected: "Migraatio 20260611000001_approval_trigger.sql näkyy listalla applied=true. SELECT routine_name FROM information_schema.routines WHERE routine_name = 'set_business_managed_on_approval' palauttaa yhden rivin. SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'approval_publish_trigger' palauttaa yhden rivin."
    why_human: "Docker ei ollut käytettävissä kehitysympäristössä. Migraatiota ei voida ajaa automaattisesti tässä verifikaatioprosessissa."
  - test: "End-to-end: kirjaudu yritystilinä, täytä onboarding loppuun. Kirjaudu admin-tilinä, hyväksy hakemus /admin-paneelista. Lataa etusivu."
    expected: "Paikan nimen vieressä näkyy BadgeCheck-tikki etusivulla vain hyväksynnän jälkeen (ei ennen). Avaa PaikkaSheet — tikki näkyy myös hero-alueen h2:ssa. Tarkista DB: SELECT business_managed FROM liikuntapaikat WHERE id = <paikka_id> — arvo true vasta hyväksynnän jälkeen."
    why_human: "Vaatii ajettavan Supabase-instanssin triggereineen sekä kirjautumisen kahteen eri tiliin."
---

# Phase 38: Business Data Publication — Verification Report

**Phase Goal:** Admin-hyväksyntä julkaisee paikan atomisesti ja verifikaatio-tikki näkyy kaikkialla missä paikan nimi esitetään.
**Verified:** 2026-06-11T21:00:00Z
**Status:** human_needed
**Re-verification:** Kyllä — aukkokorjauksen jälkeen (edellinen tila: gaps_found 6/8)

---

## Re-verification Summary

Edellisessä verifioinnissa tunnistettiin yksi kriittinen aukko: `app/api/business/onboarding/submit/route.ts` riviltä 77 löytyi `business_managed: true` -kirjoitus, joka ohitti triggerin ja asetti kentän ennen admin-hyväksyntää. Aukko on nyt korjattu.

**Suljetut aukot:**
- `onboarding/submit/route.ts`: `business_managed: true` poistettu `.update()`-kutsusta. Tiedoston riveillä 66-77 on nyt pelkästään media/yhteystieto-kentät ilman `business_managed`-kenttää.
- `npx tsc --noEmit` läpäisee edelleen (exit 0, ei tulostetta).

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Todiste |
|---|-------|--------|---------|
| 1 | `20260611000001_approval_trigger.sql` sisältää kelvollisen AFTER UPDATE -triggerin joka asettaa published=true ja business_managed=true atomisesti | VERIFIED | Tiedosto olemassa 27 riviä. Sisältää: `CREATE OR REPLACE FUNCTION public.set_business_managed_on_approval()`, `RETURNS trigger`, `SECURITY DEFINER`, `UPDATE liikuntapaikat SET published = true, business_managed = true WHERE id = NEW.paikka_id`, `AFTER UPDATE OF claim_status ON business_paikka_links`, `WHEN (NEW.claim_status = 'approved')`, `DROP TRIGGER IF EXISTS approval_publish_trigger` ennen `CREATE TRIGGER`. |
| 2 | `claim-paikka/route.ts` sisältää vain `.update({ is_claimed: true })` — ei `business_managed: true` update-kutsussa | VERIFIED | Rivi 56: `.update({ is_claimed: true })`. Tiedostossa ei ole `business_managed`-kenttää missään muuttavassa kutsussa. |
| 3 | `create-paikka/route.ts` INSERT ei sisällä `business_managed: true` — `published: false` on edelleen mukana | VERIFIED | Rivi 38: `.insert({ nimi, osoite, kaupunki, laji: 'Muu', published: false })`. Ei `business_managed`-kenttää. Rivi 35 on pelkkä kommentti jossa selitetään triggerin rooli. |
| 4 | `approve/route.ts` ei sisällä `link.link_type === 'created'` eikä `update({ published: true })` — Step 6 on poistettu kokonaan | VERIFIED | grep ei löydä `link_type.*created`, `update.*published.*true` eikä `published.*true` -osumia. Step 5 (`claim_status: 'approved'`) ja Step 6 (sähköposti) ovat paikallaan. |
| 5 | `lib/types.ts` Liikuntapaikka-tyyppi sisältää sekä `is_claimed?: boolean \| null` että `business_managed?: boolean \| null` | VERIFIED | Rivit 22–23: molemmat kentät lisätty `photo_urls`:n jälkeen optional-konventiota noudattaen. |
| 6 | `app/page.tsx` SELECT-merkkijono sisältää `is_claimed` ja `business_managed` | VERIFIED | Rivi 7: SELECT sisältää `is_claimed, business_managed`. |
| 7 | `PaikkaKortti.tsx`, `DiagonaalKortti.tsx` ja `PaikkaSheet.tsx` importoivat BadgeCheck:n ja renderöivät sen ehdollisesti kun `paikka.business_managed === true` luokalla `w-3.5 h-3.5 ml-1 inline-block align-middle` | VERIFIED | PaikkaKortti rivi 5 import, rivit 92–93 ehdollinen renderöinti. DiagonaalKortti rivi 6 import, rivit 113–114. PaikkaSheet rivi 4 import, rivit 174–175. Kaikissa `className="w-3.5 h-3.5 ml-1 inline-block align-middle"` ilman erillistä väriluokkaa. |
| 8 | Triggeri on ainoa paikka joka asettaa `business_managed=true` — kaikki ennenaikaiset kirjoitukset poistettu | VERIFIED | `onboarding/submit/route.ts`: `business_managed`-kenttää ei löydy `.update()`-kutsusta (rivit 66–77 sisältävät vain media/yhteystieto-kentät). Grep `business_managed` API-hakemistossa: osumia vain `create-paikka`-kommentissa (ei kirjoitus), `sync-paikat`-suodatuksessa (luku, ei kirjoitus) ja testissä. |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Odotettu | Status | Tiedot |
|----------|---------|--------|--------|
| `supabase/migrations/20260611000001_approval_trigger.sql` | Postgres AFTER UPDATE -triggeri (PUB-01) | VERIFIED | 27 riviä, kaikki vaadittavat SQL-lauseet paikallaan |
| `app/api/business/claim-paikka/route.ts` | `.update({ is_claimed: true })` ilman business_managed (D-02) | VERIFIED | Rivi 56 vastaa suunnitelmaa |
| `app/api/business/create-paikka/route.ts` | INSERT ilman business_managed, published: false mukana (D-03) | VERIFIED | Rivi 38 vastaa suunnitelmaa; rivi 35 on informatiivinen kommentti |
| `app/api/admin/approve/route.ts` | Step 6 (manuaalinen published=true UPDATE) poistettu (D-06) | VERIFIED | Ei link_type-ehtoa eikä update(published:true) -kutsua |
| `lib/types.ts` | is_claimed ja business_managed optional-kentät (PUB-02) | VERIFIED | Rivit 22–23 |
| `app/page.tsx` | SELECT sisältää is_claimed ja business_managed (PUB-03) | VERIFIED | Rivi 7 |
| `app/components/PaikkaKortti.tsx` | BadgeCheck ehdollinen renderöinti (PUB-04) | VERIFIED | Rivit 5, 92–93 |
| `app/components/DiagonaalKortti.tsx` | BadgeCheck ehdollinen renderöinti (PUB-04) | VERIFIED | Rivit 6, 113–114 |
| `app/components/PaikkaSheet.tsx` | BadgeCheck h2:n sisällä hero-alueella (PUB-04) | VERIFIED | Rivit 4, 174–175 |
| `app/api/business/onboarding/submit/route.ts` | EI saa sisältää business_managed: true (D-01) | VERIFIED | Korjattu: business_managed poistettu. Rivit 66–77 sisältävät vain media/yhteystieto-kentät. |

---

### Key Link Verification

| From | To | Via | Status | Tiedot |
|------|----|-----|--------|--------|
| approve/route.ts Step 5 | business_paikka_links.claim_status | `.update({ claim_status: 'approved' })` | WIRED | Rivi 51: supabaseAdmin.from('business_paikka_links').update({claim_status:'approved'}).eq('id', linkId) |
| approval_trigger | liikuntapaikat | AFTER UPDATE OF claim_status WHEN approved | WIRED (koodi) | SQL-tiedostossa täysi trigger-ketju. Lokaalin Supabase-instanssin Docker ei ollut käytettävissä — migraatiota ei ajeta testikantaan (human_verification #1) |
| page.tsx SELECT | PaikkaKortti / DiagonaalKortti / PaikkaSheet | business_managed-kenttä prop-ketjussa | WIRED | SELECT hakee business_managed → Etusivu → kortti-komponentit käyttävät paikka.business_managed |
| BadgeCheck | paikka.business_managed | ehdollinen renderöinti | WIRED | Kaikki kolme komponenttia renderöivät ikonin iff business_managed===true |
| onboarding/submit | liikuntapaikat | UPDATE (media/yhteystieto) | PUHDAS | Ei business_managed-kirjoitusta — triggeri on ainoa totuuden lähde |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Lähde | Tuottaa oikeaa dataa | Status |
|----------|--------------|-------|---------------------|--------|
| PaikkaKortti | paikka.business_managed | page.tsx SELECT → Etusivu props | Kyllä — SELECT:ssä mukana, DB-sarake olemassa | FLOWING |
| DiagonaalKortti | paikka.business_managed | page.tsx SELECT → Etusivu props | Kyllä | FLOWING |
| PaikkaSheet | paikka.business_managed | page.tsx SELECT → Etusivu props | Kyllä | FLOWING |

**Aiempi varoitus (edelleen voimassa):** `app/page.tsx` ei sisällä `photo_urls` eikä `logo_url`-kenttiä SELECT-kyselyssä. DiagonaalKortti ja PaikkaSheet käyttävät näitä kenttiä. Tämä ei ole Phase 38:n must-have-ehto.

---

### Behavioral Spot-Checks

| Behavior | Komento | Tulos | Status |
|----------|---------|-------|--------|
| Trigger-tiedosto on syntaktisesti ehjä | Luettu suoraan — `CREATE OR REPLACE FUNCTION`, `RETURNS trigger`, `UPDATE`, `WHEN` löytyvät | Kaikki neljä lausetta läsnä | PASS |
| TypeScript-tarkistus | `npx tsc --noEmit` | exit 0, ei tulostetta | PASS |
| approve-reitissä ei manuaalista published-kirjoitusta | grep `link_type.*created\|update.*published.*true\|published.*true` approve/route.ts | ei osumia | PASS |
| onboarding/submit ei sisällä business_managed-kirjoitusta | grep `business_managed` app/api/business/onboarding/submit/route.ts | ei osumia | PASS |
| API-reitit: business_managed:true kirjoituksia etsitty koko api-hakemistosta | grep `business_managed` app/api/ | vain kommentti (create-paikka rivi 35), suodatusluku (sync-paikat rivit 158,163) ja testi — ei muuttavia kutsuja | PASS |

---

### Probe Execution

Phase 38 ei määrittele probe-skriptejä. SKIPPED.

---

### Requirements Coverage

| Vaatimus | Lähdesuunnitelma | Kuvaus | Status | Todiste |
|----------|-----------------|--------|--------|---------|
| PUB-01 | 38-01, 38-02 | Admin-hyväksyntä asettaa published=true JA business_managed=true atomisesti Postgres-triggerillä; kaikki ennenaikaiset kirjoitukset poistettu | SATISFIED | Triggeri-SQL olemassa ja oikein kirjoitettu. onboarding/submit-reitti ei enää kirjoita business_managed. |
| PUB-02 | 38-03 | Liikuntapaikka-tyyppi sisältää is_claimed ja business_managed -kentät | SATISFIED | lib/types.ts rivit 22–23 |
| PUB-03 | 38-03 | app/page.tsx SELECT hakee is_claimed ja business_managed | SATISFIED | page.tsx rivi 7 |
| PUB-04 | 38-03 | Verifikaatio-tikki PaikkaKortissa, DiagonaalKortissa ja PaikkaSheetissä kun business_managed=true | SATISFIED | Kaikki kolme komponenttia tarkistettu |

---

### Anti-Patterns Found

| Tiedosto | Rivi | Patterni | Vakavuus | Vaikutus |
|----------|------|---------|---------|--------|
| — | — | — | — | Ei blocker-tason anti-patterneita. Aukko suljettu. |

**Aiemmassa verifioinnissa mainitut CR-01–CR-04 (code review -löydöt) ovat edelleen avoimia mutta eivät ole Phase 38:n must-have-ehtojen piirissä.** Ne ovat turvallisuus- ja dataeheys-varoituksia seuraavia faaseja varten.

---

### Human Verification Required

#### 1. Migraation ajo tuotantokantaan

**Test:** Aja `npx supabase db push` (tai liitä SQL suoraan Supabase Dashboard SQL Editor -näkymään) ja tarkista `npx supabase migration list` -tulostuksesta, että `20260611000001_approval_trigger.sql` on listattu applied-tilassa.

**Expected:** Migraatio ajautuu onnistuneesti. `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'set_business_managed_on_approval';` palauttaa yhden rivin. `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'approval_publish_trigger';` palauttaa yhden rivin.

**Why human:** Docker ei ollut käytettävissä kehitysympäristössä. Migraatiota ei voida ajaa automaattisesti tässä verifikaatioprosessissa.

#### 2. End-to-end-testi: Admin hyväksyy hakemuksen → paikka näkyy tikillä vasta hyväksynnän jälkeen

**Test:** (1) Kirjaudu sisään yritystilinä ja täytä onboarding-lomake loppuun. (2) Tarkista DB ennen hyväksyntää: `business_managed` on false/null. (3) Kirjaudu admin-tilinä ja hyväksy hakemus `/admin`-paneelista. (4) Lataa etusivu — varmista, että paikan nimen vieressä näkyy BadgeCheck-tikki. (5) Avaa PaikkaSheet paikan kortista — tikki näkyy myös hero-alueen h2:ssa. (6) Tarkista DB hyväksynnän jälkeen: `SELECT business_managed, published FROM liikuntapaikat WHERE id = <paikka_id>` — molemmat true.

**Expected:** Tikki näkyy vain ja ainoastaan `business_managed=true` -paikoilla. Hyväksynnän jälkeen (ei ennen) paikka näkyy julkaistuna ja tikkiä kantavana. Triggeri asettaa molemmat kentät atomisesti.

**Why human:** Vaatii ajettavan Supabase-instanssin triggereineen sekä kirjautumisen kahteen eri tiliin.

---

### Gaps Summary

Kaikki 8/8 must-havea on todennettavissa koodista. Aukko (`onboarding/submit/route.ts` — `business_managed: true` ennenaikaisesti) on suljettu. Kooditason verifiointi läpäistty täydellisesti.

Ainoa estävä tekijä etenemiselle on migraation ajo tuotantokantaan (human_verification #1) ja end-to-end-testi todellisella Supabase-instanssilla (#2).

---

_Verified: 2026-06-11T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
