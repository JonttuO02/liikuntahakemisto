---
phase: 40-wizard-konsolidointi-cleanup
verified: 2026-06-12T10:30:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Tarkista Supabase Dashboardista että business_accounts- ja auth.users-tauluissa ei ole testitilirivejä"
    expected: "business_accounts on tyhjä; vastaavat auth.users-rivit on poistettu"
    why_human: "Migraatio 20260612000000_cleanup_test_accounts.sql on luotu mutta vaatii manuaalisen ajamisen Supabase Dashboardissa tai supabase db push -komennolla — verifikaattori ei voi ajaa SQL:ää tietokantaan"
---

# Vaihe 40: Wizard-konsolidointi & Cleanup — Verifiointiraportti

**Vaiheen tavoite:** Wizard-duplikaatti poistetaan, API-bugit korjataan ja kuollut koodi siistitään — codebase on tiiviimpi ja business-käyttäjä voi muokata kaikkia paikkojaan riippumatta claim-statuksesta
**Verifioitu:** 2026-06-12T10:30:00Z
**Status:** human_needed
**Uudelleenverifiointi:** Ei — ensimmäinen verifiointi

---

## Tavoitteen saavuttaminen

### Havainnoitavat totuudet (ROADMAP Success Criteria)

| #  | Totuus | Status | Todiste |
|----|--------|--------|---------|
| 1 | Yhteinen `WizardInner`-komponentti `mode: 'onboarding' \| 'edit'` — erilliset tiedostot poistettu | VERIFIED | `app/business/WizardInner.tsx` on olemassa (421 riviä), sisältää `OnboardingMode` ja `EditMode` private sub-komponentit. `OnboardingWizardInner.tsx` ja `EditWizardInner.tsx` eivät ole olemassa. |
| 2 | Yritys pystyy muokkaamaan paikkoja riippumatta `claim_status`-arvosta | VERIFIED | `app/api/business/update-paikka/route.ts` rivi 39–44: ownership-kysely käyttää vain `business_account_id` + `paikka_id` — ei yhtään `claim_status`-filteriä koko tiedostossa |
| 3 | `?step=N` ei voi hypätä ohi tekemättömien vaiheiden | VERIFIED | `WizardInner.tsx` rivit 168–173: `useEffect` tarkistaa `step > maxReachedStep + 1` ja ohjaa takaisin `maxReachedStep + 1` -askeleelle; ehto `if (loading) return` suojaa latausvaiheen |
| 4 | `/api/business/onboarding/submit` ei kirjoita `onboarding_completed`-kolumniin | VERIFIED | Grep `onboarding_completed` koko `app/api/business/`-hakemistosta — nolla osumaa. Migraatio `20260611000000_drop_onboarding_completed.sql` sisältää `ALTER TABLE business_accounts DROP COLUMN onboarding_completed` |
| 5 | Supabase Dashboardissa ei ole testitilirivejä | UNCERTAIN — VAATII IHMISEN | Migraatio `20260612000000_cleanup_test_accounts.sql` on luotu oikealla `DELETE FROM auth.users WHERE id IN (SELECT user_id FROM business_accounts)` -lauseella, mutta migraatiota ei ole vielä ajettu tietokantaan — se vaatii manuaalisen toimenpiteen |

**Pistemäärä:** 4/5 totuutta verifioitu (1 vaatii ihmisen)

---

### Tarvittavat artefaktit

| Artefakti | Odotus | Status | Yksityiskohdat |
|-----------|--------|--------|----------------|
| `app/business/WizardInner.tsx` | Yhtenäinen wizard-komponentti | VERIFIED | Olemassa, 421 riviä, oikea rakenne |
| `app/business/onboarding/page.tsx` | Käyttää WizardInneria | VERIFIED | Importtaa `WizardInner from '../WizardInner'`, renderöi `<WizardInner mode="onboarding" />` |
| `app/business/[id]/page.tsx` | Käyttää WizardInneria | VERIFIED | Importtaa `WizardInner from '../WizardInner'`, renderöi `<WizardInner mode="edit" paikka={paikka} paikkaId={paikkaId} />` |
| `supabase/migrations/20260612000000_cleanup_test_accounts.sql` | Testitilien poisto-migraatio | VERIFIED (tiedosto) / UNCERTAIN (ajettu) | Tiedosto olemassa oikealla sisällöllä; ajaminen vaatii ihmisen |
| `app/business/onboarding/OnboardingWizardInner.tsx` | EI SAA OLLA | VERIFIED (poistettu) | Tiedostoa ei ole olemassa |
| `app/business/[id]/EditWizardInner.tsx` | EI SAA OLLA | VERIFIED (poistettu) | Tiedostoa ei ole olemassa |

---

### Avainyhteyksien verifiointi

| Lähde | Kohde | Yhteys | Status | Yksityiskohdat |
|-------|-------|--------|--------|----------------|
| `app/business/onboarding/page.tsx` | `app/business/WizardInner.tsx` | `import WizardInner from '../WizardInner'` | WIRED | Import löytyy rivi 2; `<WizardInner mode="onboarding" />` rivi 13 |
| `app/business/[id]/page.tsx` | `app/business/WizardInner.tsx` | `import WizardInner from '../WizardInner'` | WIRED | Import löytyy rivi 4; `<WizardInner mode="edit" .../>` rivi 30 |
| `app/api/business/update-paikka/route.ts` | `business_paikka_links` | Ownership-tarkistus ilman claim_status-filteriä | WIRED | Rivit 39–51: `.eq('business_account_id', user.id).eq('paikka_id', paikka_id)` |
| `WizardInner.tsx` `OnboardingMode` | Step-komponentit `./onboarding/Step*` | Import-polut | WIRED | Kaikki 6 step-importtia käyttävät `'./onboarding/'`-prefiksiä (oikea sijainti `app/business/`-tasolta) |

---

### Vaatimusten kattavuus

| Vaatimus-ID | Suunnitelma | Kuvaus | Status | Todiste |
|-------------|-------------|--------|--------|---------|
| CLEAN-01 | 40-02 | Testitilien poisto migraatiolla | PARTIAL — migraatio luotu, ei ajettu | `20260612000000_cleanup_test_accounts.sql` olemassa; ajaminen vaatii ihmisen |
| CLEAN-02 | 40-03 | OnboardingWizardInner + EditWizardInner → WizardInner | SATISFIED | `WizardInner.tsx` olemassa, vanhat tiedostot poistettu, sivut päivitetty |
| CLEAN-03 | 40-01 | update-paikka hyväksyy kaikki claim_status-arvot | SATISFIED | Ownership-kysely käyttää vain business_account_id + paikka_id |
| CLEAN-04 | 40-01 | Onboarding step-forward-suoja | SATISFIED | maxReachedStep-guard rivit 168–173 WizardInner.tsx:ssä |
| CLEAN-05 | 40-01 | submit-reitti ei kirjoita onboarding_completed | SATISFIED | Nolla osumaa koko `app/api/business/`-puussa |

**Kaikki 5 CLEAN-vaatimusta ovat plan-frontmattereissa edustettuina.** REQUIREMENTS.md:ssä määriteltyihin ID:ihin (CLEAN-01…CLEAN-05) ei jää orpoja.

---

### Antipatternit

| Tiedosto | Rivi | Patterni | Vakavuus | Vaikutus |
|----------|------|---------|----------|---------|
| — | — | — | — | Ei antipatterneja |

Tarkastetut tiedostot (`WizardInner.tsx`, `update-paikka/route.ts`, `onboarding/submit/route.ts`, `cleanup_test_accounts.sql`) eivät sisällä TBD/FIXME/XXX-merkintöjä, tyhjästi toteutettuja handlereitä tai placeholder-palautuksia.

---

### TypeScript-puhtaus

`npx tsc --noEmit` ajettiin — nolla virhettä (tyhjä output). Wizard-merge on TypeScript-puhdas.

---

### Ihmisverifiointi vaaditaan

#### 1. Testitilien poisto Supabase Dashboardista

**Testi:** Aja `supabase db push` tai aja seuraava SQL Supabase Dashboard SQL Editorissa:
```sql
DELETE FROM auth.users
WHERE id IN (SELECT user_id FROM business_accounts);
```

**Odotettu tulos:**
- `business_accounts`-taulu on tyhjä
- Vastaavat `auth.users`-rivit (business-testitunnukset) ovat poistuneet
- `business_paikka_links`- ja `onboarding_draft`-taulut ovat myös tyhjentyneet (ON DELETE CASCADE)

**Miksi ihminen:** Migraatiotiedosto on olemassa oikealla sisällöllä, mutta SQL-migraation ajaminen Supabase-tietokantaan vaatii manuaalisen toimenpiteen — verifikaattori ei voi tehdä kantaan kirjoittavia operaatioita.

---

### Yhteenveto aukoista

CLEAN-01 on teknisesti valmis koodipuolella (migraatiotiedosto on luotu oikein), mutta vaatii manuaalisen ajamisen Supabase-ympäristöön ennen kuin success criterion 5 ("Dashboardissa ei ole testitilirivejä") on todistettavasti tosi. Tämä on tyypillinen migraatiovaiheen tila — koodi on valmis, data-operaatio odottaa sovellusta.

Kaikki muut neljä vaatimusta (CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05) ovat täysin verifioituja koodikannassa.

---

_Verifioitu: 2026-06-12T10:30:00Z_
_Verifikaattori: Claude (gsd-verifier)_
