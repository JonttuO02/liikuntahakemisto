# Phase 62: Venuepage-konsolidaatio - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Erillinen paikkasivu (`app/paikat/[id]`) poistetaan kokonaan. Sen ainutlaatuinen sisältö (ennen kaikkea "Näytä kartalla" -toiminto) siirretään PaikkaSheetiin ennen poistoa. Kaikki sovelluksen sisäiset navigointipolut, jotka aiemmin avasivat erillisen paikkasivun, avataan nyt PaikkaSheet-bottomsheetinä. Poistettu reitti palauttaa 404 ilman redirectiä.

</domain>

<decisions>
## Implementation Decisions

### "Näytä kartalla" -linkin kohtalo (VENUEPAGE-02)
- **D-01:** "Näytä kartalla" -linkki migroidaan PaikkaSheetiin eikä poisteta. Vanha sivu käytti linkkiä `/?id=X` (keskittää kartan paikkaan, avaa listasheet). PaikkaSheet saa uuden SheetRow-rivin tällä toiminnolla.
- **D-02:** SheetRow sijoitetaan sheet-sisällön sekaan — samaan tyyliin kuin Phone/Hours/Description-rivit (ikoni + label + linkki). Ei hero-alueen oikeaan yläkulmaan.
- **D-03:** "Näytä kartalla" -rivi näytetään VAIN kun paikalla on koordinaatit (`paikka.latitude != null && paikka.longitude != null`). Sama ehto kuin vanhalla sivulla.

### DiagonaalKortti — card-to-sheet wiring (VENUEPAGE-03)
- **D-04:** DiagonaalKorttiin lisätään `onOpen?: (paikka: Liikuntapaikka) => void` -prop. Etusivulla (`Etusivu.tsx`) tämä prop saa arvon `(p) => setValittu(p)`, joka avaa PaikkaSheetin ilman sivunavigaatiota.
- **D-05:** Jos `onOpen`-propia ei ole annettu (preview-kontekstit: PreviewModal, LivePreviewPane, admin/[id]), näkymätön overlay-linkki muutetaan no-op-elementiksi (ei `<Link href>`, ei navigointia). Preview-kortit ovat puhtaasti visuaalisia.
- **D-06:** Nykyinen `handleCardClick`-scrollstate-tallennus sessionStorageen integroidaan tai poistetaan osana wiring-muutosta — koska kortit eivät enää navigoi pois sivulta, scroll-restorointilogiikka ei ole tarpeellinen.

### PaikkaKortti (VENUEPAGE-03 rajaus)
- **D-07:** PaikkaKortille ei tehdä vastaavaa muutosta tässä vaiheessa. Phase 63 poistaa PaikkaKortin PreviewModalista (PREV-04). Broken `/paikat`-linkki PreviewModalissa on hyväksyttävä tilapäisesti — business-side only, ei consumer-facing.

### 404-toteutus (VENUEPAGE-04)
- **D-08:** `app/paikat/[id]/` -hakemisto poistetaan kokonaan. Next.js palauttaa automaattisesti 404 tuolle reitille. Ei redirectiä, ei `notFound()` -palautusta jätettyyn tiedostoon.

### Claude's Discretion
- Tarkka `SheetRow`-rivin labeli ja ikoni "Näytä kartalla" -riville (esim. `MapPin` ikonilla, samaan tapaan kuin vanhalla sivulla).
- `onOpen`-propin nimeäminen — `onOpen`, `onSelect`, `onOpenSheet` tms. — planner valitsee johdonmukaisimman nimen olemassa olevien proppien (onShowMap, onCardClick, onToggleTodo) perusteella.
- Sessionstorage-siivoustapu: poistetaan kokonaan vai jätetään harmittomana kuolleena koodina.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pääkomponentit (muokattavat)
- `app/paikat/[id]/page.tsx` — Poistettava sivu; lue ennen poistoa ymmärtääksesi kaikki siirrettävät elementit (erityisesti "Näytä kartalla" -logiikka riveillä 90–99)
- `app/components/PaikkaSheet.tsx` — PaikkaSheet; tähän migroidaan "Näytä kartalla" SheetRow (D-01–D-03)
- `app/components/DiagonaalKortti.tsx` — Invisible overlay -linkki (rivi 91) muutetaan `onOpen`-callbackiksi (D-04–D-05)
- `app/components/Etusivu.tsx` — `setValittu` (rivi 386, 916) on mekanismi PaikkaSheetin avaamiseen; `handleCardClick` (rivi 492) on scroll-state-tallennus joka jää tarpeettomaksi (D-06)

### Kontekstikomponentit (ei muokattavia tässä vaiheessa)
- `app/components/PaikkaKortti.tsx` — Sisältää `/paikat`-linkit (rivit 90, 185); EI muuteta Phase 62:ssa (D-07)
- `app/components/PreviewModal.tsx` — Käyttää PaikkaKorttia + DiagonaalKorttia; DiagonaalKortti saa no-op-käsittelyn, PaikkaKortti jätetään Phase 63:lle
- `app/business/onboarding/LivePreviewPane.tsx` — Käyttää DiagonaalKorttia preview-moodissa; no-op riittää (D-05)
- `app/admin/[id]/page.tsx` — Käyttää DiagonaalKorttia admin-preview-moodissa; no-op riittää (D-05)

### Projekti-tason rajoitteet
- `CLAUDE.md` — Design guidelines (glassmorphism, SheetRow-tyyli, ikonikonventiot)
- `.planning/REQUIREMENTS.md` — VENUEPAGE-01..04 vaatimukset

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SheetRow` (PaikkaSheet.tsx, rivi 322–333): Olemassa oleva alikomponentti `{ icon, label, children }` — käytä tätä "Näytä kartalla" -riville, älä luo uutta
- `MapPin` (lucide-react): Jo importattu vanhalla sivulla "Näytä kartalla" -ikonina — käytä samaa

### Established Patterns
- PaikkaSheet: Condition-based rows — kaikki rivit (Phone, Hours, Price, jne.) ovat conditionaalisia (`{paikka.puhelin && ...}`). "Näytä kartalla" seuraa samaa kaavaa.
- DiagonaalKortti: `onCardClick?: () => void` on jo olemassa (rivi 33) — `onOpen` lisätään samaan tyyliin
- `valittu`/`setValittu` state Etusivussa: Ainoa keino avata PaikkaSheet ohjelmallisesti. Calloutcard-klikkaus käyttää tätä (rivi 916).

### Integration Points
- DiagonaalKortti (Etusivu, rivi 1460): tällä hetkellä `onCardClick={handleCardClick}` — muutetaan `onOpen={(p) => setValittu(p)}`
- DiagonaalKortti (Etusivu, rivi 1074, TO DO -overlay): tarkista tarvitseeko myös `onOpen`
- `/?id=X` URL-parametri: jo olemassa oleva mekanismi kartan keskittämiseen (Etusivu, rivit 431–758) — "Näytä kartalla" -linkki käyttää tätä

</code_context>

<specifics>
## Specific Ideas

- "Näytä kartalla" -SheetRow sijoitetaan Description-rivin jälkeen (tai ennen Reviews-osiota) — luonnollinen paikka sisällön alapuolella, missä vanha sivukin sen näytti (sijainti-osio oli ensimmäinen rivi)
- PaikkaSheetin `preview=true` moodissa "Näytä kartalla" -rivi voidaan piilottaa (sama kuin bookmark-napit) koska preview-kontekstissa navigointi ei ole relevanttia

</specifics>

<deferred>
## Deferred Ideas

- **PaikkaKortti `/paikat`-linkkien korjaus** — Siirretty Phase 63:een (PREV-04 poistaa PaikkaKortin PreviewModalista kokonaan)
- **Scroll-state sessionStorage -siivous** — Claude's discretion; poistetaan tai jätetään harmittomana kuolleena koodina
- **"Block business accounts from logging into customer site"** (todo) — Auth-aihe, ei kuulu tähän vaiheeseen

</deferred>

---

*Phase: 62-venuepage-konsolidaatio*
*Context gathered: 2026-07-01*
