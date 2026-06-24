# Phase 57: Dashboard-redirect-korjaus & Kesken-tila - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Kirjautunut yritys päätyy aina `/business`-dashboardille — ei koskaan automaattiseen onboarding-redirectiin. Kesken jäänyt onboarding (per paikka) näkyy dashboardilla omana "Kesken"-badgena ja "Jatka"-CTA:lla, joka vie `/business/onboarding?paikka_id=X`. Tili, jolla on 2+ samanaikaista kesken jäänyttä onboardingia, näkee jokaisen erillisenä rivinä. Tämä on Phase 56:n (claim/create-rework) jälkeinen viimeinen v3.0-phase — se kytkeytyy 56:n uudistettuun luo/claim-sisääntuloon, ei muuta sitä.

</domain>

<decisions>
## Implementation Decisions

### Redirect-korjaus
- **D-01:** Poista `app/business/page.tsx`:n `checkState()`-funktion ehdoton redirect-logiikka (rivit 191-200), joka tällä hetkellä lähettää käyttäjän `/business/onboarding`-sivulle aina kun *mikä tahansa* `onboarding_draft`-rivi löytyy. `/business` ei koskaan tee tätä automaattiredirectia jatkossa — dashboard renderöityy aina sen sijaan.

### Kesken-tunnistus
- **D-02:** Kesken = paikka, jolla on olemassa `onboarding_draft`-rivi (`business_account_id` + `paikka_id`) JA onboardingia ei ole suoritettu loppuun (ei pikahyväksyntää eikä lopussa lähetetty hyväksyttäväksi — submit-reitti poistaa draft-rivin, ks. `app/api/business/onboarding/submit/route.ts`). Käytännössä: draft-rivin olemassaolo = Kesken.
- **D-03:** Paikka, joka on luotu (`business_paikka_links.claim_status = 'pending'`) mutta jolla EI ole draft-riviä (käyttäjä ei ole koskaan avannut wizardia), on tavallinen **Pending**-venue — ei Kesken. Kesken edellyttää, että wizard on avattu vähintään kerran (`save-step`-kutsu on luonut draft-rivin).
- **D-04:** Status on yksi neljästä toisensa poissulkevasta arvosta per venue: `approved`, `pending`, `rejected`, `kesken`. Kesken ja pending eivät voi olla voimassa samaan aikaan samalle venuelle — kun draft on olemassa, badge on aina "Kesken" (ei "Pending"), koska claim_status on tällöin joka tapauksessa `'pending'` taustalla.

### Badge & rivin ulkoasu
- **D-05:** "Kesken"-badge korvaa `claim_status`-badgen `VenueRow`:ssa (`app/business/page.tsx` rivit 110-122), kun ko. `paikka_id`:lle löytyy `onboarding_draft`-rivi. Ei näytetä molempia badgeja rinnakkain.
- **D-06:** Kesken-badge käyttää neutraalia/harmaata väriä (esim. `bg-[rgba(17,17,17,0.08)] text-[rgba(17,17,17,0.55)]`), erottuakseen visuaalisesti amber-sävyisestä Pending-badgesta (`bg-amber-100 text-amber-700`), joka tarkoittaa "lähetetty, odottaa admin-hyväksyntää". Tämä on uusi badge-väri, ei CLAUDE.md-väritaulukossa määritelty — noudattaa samaa `text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full` -rakennetta kuin muut badget.

### StatusCard-ylätason banneri
- **D-07:** `StatusCard`-komponentti (`app/business/page.tsx` rivit 43-90) pysyy ennallaan — ei muutoksia approved/rejected/pending-logiikkaan. Kesken-tila näkyy vain per-rivi-badgena venuelistassa, ei erillisessä ylätason bannerissa.

### Jatka-painike (resume CTA)
- **D-08:** Kesken-rivillä "Muokkaa"-nappi (→ `/business/{id}`) korvataan "Jatka"-napilla, joka vie `/business/onboarding?paikka_id=X` (resume-parametri on jo tuettu `WizardInner.tsx`:ssä ja `StepPaikkaPrePhase`:ssa).
- **D-09:** "Esikatsele"-nappi piilotetaan tai disabloidaan Kesken-riveille — venue on tässä vaiheessa julkaisematon (`liikuntapaikat.published = false`), esikatselu ei ole mielekäs ennen kuin onboarding on suoritettu loppuun.

### Claude's Discretion
- Tarkka tapa hakea draft-rivit dashboard-renderöintiä varten (esim. erillinen kysely `onboarding_draft`-taulusta `paikka_id`-joukolle vs. join) — tekninen toteutustapa, ei käyttäjän päätös.
- Käännösavaimet (`statusKesken`, `jatkaCta` tms.) `next-intl`-rakenteen mukaisesti, molemmille kielille (FI/EN) — CLEAN-06/07 (Phase 52) edellyttää täyttä i18n-kattavuutta.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` §"Phase 57: Dashboard-redirect-korjaus & Kesken-tila" (rivit 309-336) — goal, success criteria, dependency on Phase 56
- `.planning/REQUIREMENTS.md` — BIZPANEL-04, BIZPANEL-05

### Onboarding & dashboard code
- `app/business/page.tsx` — dashboard-sivu; `checkState()` (rivit 171-214) sisältää korjattavan redirect-logiikan; `VenueRow` (rivit 93-159) ja `StatusCard` (rivit 43-90) ovat badge-/banneri-muutosten kohteet
- `app/business/onboarding/page.tsx` — wizard-sisäänkäynti, `paikka_id`-resoluutio (`StepPaikkaPrePhase`, rivit 43-66)
- `app/business/WizardInner.tsx` — `OnboardingMode` (rivit 89-176), `paikka_id`-resume-logiikka (rivi 96, 117-133, 145-157)
- `app/api/business/onboarding/save-step/route.ts` — luo `onboarding_draft`-rivin ensimmäisellä wizard-askelmalla (rivit 99-124), edellyttää olemassa olevan `business_paikka_links`-rivin
- `app/api/business/onboarding/submit/route.ts` — poistaa draft-rivin onboardingin valmistuessa (rivit 113-121)
- `app/api/business/create-paikka/route.ts` — luo `liikuntapaikat`- ja `business_paikka_links`-rivit (rivit 72-96) ennen kuin draft on koskaan olemassa

### Schema-historia
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_accounts`/`business_paikka_links`-relaatio (rivit 23-65)
- `supabase/migrations/20260606000000_onboarding.sql` — alkuperäinen `onboarding_completed`-sarake (poistettu myöhemmin)
- `supabase/migrations/20260611000000_drop_onboarding_completed.sql` — `onboarding_completed` pudotettu, `onboarding_draft`-taulun `UNIQUE(business_account_id, paikka_id)` (rivi 48)
- `supabase/migrations/20260617000000_renumber_onboarding_steps.sql` — wizard-askelmien uudelleennumerointi (5 askelta)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VenueRow` (`app/business/page.tsx` rivit 93-159) — badge- ja action-rivirakenne on valmis, tarvitsee vain Kesken-haaran lisäyksen ehtologiikkaan
- `paikka_id`-resume-mekanismi `/business/onboarding?paikka_id=X` on jo täysin toteutettu `WizardInner.tsx`:ssä — Jatka-CTA voi linkata suoraan sinne ilman uutta logiikkaa

### Established Patterns
- Badge-tyyli: `text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full` (claim_status-badget) — Kesken-badge noudattaa samaa rakennetta uudella värillä
- Status-haarautuminen tehdään aina `claim_status`-kentän perusteella tällä hetkellä; Kesken lisää uuden ehdon, joka tarkistetaan ENNEN claim_status-haaraa (koska draft voi olla olemassa vain pending-tilaisille venueille)

### Integration Points
- `checkState()`-funktion `business_paikka_links`-kyselyn rinnalle tarvitaan kysely `onboarding_draft`-taulusta (`business_account_id` + `paikka_id`-lista), jotta `VenueRow` osaa renderöidä Kesken-badgen rivikohtaisesti
- `business_paikka_links`-rivi luodaan aina ATOMISESTI `liikuntapaikat`-rivin kanssa `create-paikka`-reitissä, ennen kuin mitään draft-riviä on olemassa — siksi kaikki kesken-venuet ovat jo nykyisessä `business_paikka_links`-kyselyssä, ei tarvitse laajentaa hakua paikkoihin joilla ei ole linkkiä

</code_context>

<specifics>
## Specific Ideas

Ei erityisiä viittauksia tai esimerkkejä — keskustelu pysyi suoraviivaisena teknisten badge/redirect-päätösten ympärillä.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 57-Dashboard-redirect-korjaus & Kesken-tila*
*Context gathered: 2026-06-24*
