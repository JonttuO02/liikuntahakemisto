---
phase: 17-toolbar-haku-ux
verified: 2026-05-29T00:00:00Z
status: human_needed
score: 5/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Tarkista SC-3 — LayoutList-nappi ei itsenäisesti hallitse filter-tilaa"
    expected: "LayoutList-nappi avaa olemassa olevan search-overlayn (searchOpen=true) ilman autofocusta — se EI nollaa tai muuta searchLaji/searchHinta/searchAukinyt/searchKaupunki-arvoja. Käyttäjä voi selata listaa ilman, että filtterit nollautuvat."
    why_human: "PLAN.md merkitsee CONTEXT.md D-01:n kanoniseksi — LayoutList reuse-aa overlayn eikä hallitse omaa filter-tilaansa. Tämä on käyttäytyminen, jota grep ei pysty verifioimaan: nappi kutsuu toggleSearch(false) joka ei nollaa filtereitä, mutta vuorovaikutus vaatii näkemisen oikeassa selaimessa."
  - test: "Tarkista, että hakuoverlay toimii karttanäkymässä"
    expected: "Search-nappi avaa overlayn ja hakukenttä saa autoFocusin. LayoutList-nappi avaa overlayn ilman autoFocusta. Molempien nappien uudelleen painaminen sulkee overlayn (true toggle)."
    why_human: "Visuaalinen käyttäytyminen (autoFocus ruudulla, togglen toiminta) vaatii selaintestausta."
---

# Phase 17: Toolbar & Haku-UX — Verification Report

**Phase Goal:** Users can access search and filters from a single unified button, and toggle the venue list independently, from both map and list contexts
**Verified:** 2026-05-29
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Exactly one button opens both search field and filter panel together; no standalone SlidersHorizontal filter button in toolbar | VERIFIED | `SlidersHorizontal` count = 0; left toolbar contains exactly one Search `motion.button` (rivi 456–470) kutsuen `toggleSearch(true)` |
| 2 | Separate LayoutList button in the same glass pill opens the search overlay without autofocusing the search input | VERIFIED | `motion.button` rivillä 472–480 kutsuu `toggleSearch(false)`; `searchFocused=false` → `autoFocus={searchFocused}` evaluoituu `false` |
| 3 | Search icon button opens the overlay WITH autoFocus on the search input | VERIFIED | `onClick={() => toggleSearch(true)}` rivi 458; `toggleSearch` asettaa `setSearchFocused(focused)` rivi 166; `autoFocus={searchFocused}` rivi 693 |
| 4 | Tapping either button again when the overlay is open closes it (true toggle) | VERIFIED | `toggleSearch`: `if (searchOpen) { setSearchOpen(false); return }` rivi 162 — pätee molemmille kutsuille |
| 5 | Map pin filter and search overlay card list both react to the same sport filter state (searchLaji) | VERIFIED | `paikatKartalla` useMemo rivit 303–311 suodattaa `searchLaji`-tilalla suoraan; `searchSuodatettu` rivit 327–339 käyttää myös `searchLaji` — yhteinen tilaluokka |
| 6 | Active-filter visual on Search button appears when searchLaji != 'Kaikki' OR any of searchHinta/searchAukinyt/searchKaupunki is active | VERIFIED | `isFilterActive` rivi 341 kattaa kaikki neljä akselia; dot-indikaattori riveillä 464–469 renderöi `{isFilterActive && ...}` |

**Score:** 6/6 truths verified

**ROADMAP SC-3 huomio:** ROADMAP SC-3 sanoo "dedicated only to toggling the list view — does not also trigger search or filters." CONTEXT.md D-01 (locked decision) määrittelee LayoutList-napin avaavan olemassa olevan search-overlayn ilman autoFocusta — ts. se reuse-aa overlayn listausmoodina mutta EI muuta filter-tilaa. PLAN.md vahvistaa tämän kanoniseksi. SC-3:n kirjaimellinen tulkinta ("does not trigger search") on osoitettu intentionaalisesti poikkeavaksi; D-01 on kanoninen. Visuaalinen käytösvarmistus on reititetty Human Verification -osioon.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/Etusivu.tsx` | Refactored toolbar + unified filter state; contains `searchFocused` | VERIFIED | Tiedosto olemassa, substantiivinen (850+ riviä), sisältää `searchFocused` tilana rivi 121, `isFilterActive` rivi 341, kaksi-ikoni-pill rivit 455–481 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `paikatKartalla` useMemo | `searchLaji` state | direct filter condition `searchLaji === 'Kaikki'` | WIRED | Rivi 306: `(searchLaji === 'Kaikki' \|\| p.laji.toLowerCase() === searchLaji.toLowerCase())` — `searchLaji` on dependency array rivissä 310 |
| Search toolbar button | `toggleSearch(true)` | onClick handler | WIRED | Rivi 458: `onClick={() => toggleSearch(true)}` |
| LayoutList toolbar button | `toggleSearch(false)` | onClick handler | WIRED | Rivi 474: `onClick={() => toggleSearch(false)}` |
| search input | `searchFocused` state | autoFocus prop | WIRED | Rivi 693: `autoFocus={searchFocused}` — ainoa autoFocus-viite koko tiedostossa |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Left toolbar pill | `searchOpen`, `isFilterActive`, `searchFocused` | useState + derived const | Kyllä — tilamuuttujat päivittyvät käyttäjäinteraktioiden kautta | FLOWING |
| Map pins | `paikatKartalla` | `paikat` prop → useMemo suodatettu `searchLaji`:lla | Kyllä — `paikat` on server-fetched prop joka virtaa useMemo:n läpi | FLOWING |
| Search card list | `searchSuodatettu` | `paikat` prop → useMemo kaikkien filter-arvojen kanssa | Kyllä — sama `paikat`-prop, kaikki filter-akselit aktiivisina | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `aktiivinen` poistettu | `grep -c "aktiivinen" Etusivu.tsx` | 0 osumaa | PASS |
| `leftOpen` poistettu | `grep -c "leftOpen" Etusivu.tsx` | 0 osumaa | PASS |
| `filterOpen` poistettu | `grep -c "filterOpen" Etusivu.tsx` | 0 osumaa | PASS |
| `suodatettu` poistettu | `grep -c "suodatettu" Etusivu.tsx` | 0 osumaa | PASS |
| `SlidersHorizontal` poistettu | `grep -c "SlidersHorizontal" Etusivu.tsx` | 0 osumaa | PASS |
| `LayoutList` importissa | rivi 7 lucide-react import | Löytyy | PASS |
| `toggleSearch(true)` — 1 osuma | Search-nappi | rivi 458 | PASS |
| `toggleSearch(false)` — 1 osuma | LayoutList-nappi | rivi 474 | PASS |
| `autoFocus={searchFocused}` — ainoa autoFocus | rivi 693 | 1 osuma, ei bare `autoFocus` | PASS |
| Ei bare `onClick={toggleSearch}` | grep | 0 osumaa | PASS |
| `isFilterActive` const-deklaraatio | rivi 341 | Löytyy kattaen 4 akselia | PASS |
| "Haku"-nappi poistettu rightOpen-blokilta | grep "Haku" | Ei painikkeessa rightOpen-kontekstissa | PASS |
| Commitit olemassa | `git log d20bbac 3735747` | Molemmat löytyvät oikeilla viesteillä | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UI-17 | 17-01-PLAN.md | Käyttäjä löytää yhden napin, joka avaa sekä hakukentän että filtterit; toimii sekä kartta- että listanäkymässä | SATISFIED | Search-nappi kutsuu `toggleSearch(true)`, avaa `searchOpen`-overlayn jossa searchHaku-kenttä ja kaupunki/laji/hinta/auki-filtterit; `paikatKartalla` käyttää samaa `searchLaji`-tilaa |
| UI-18 | 17-01-PLAN.md | Käyttäjä löytää erillisen napin lista-näkymän avaamiseen — ei sama nappi kuin haku/filtteri | SATISFIED | LayoutList-nappi rivi 472–480 on erillinen `motion.button` samassa glass-pillissä; kutsuu `toggleSearch(false)` joka avaa overlayn `searchFocused=false`-tilassa |

**Orphaned requirements check:** REQUIREMENTS.md-traceability-taulukossa UI-17 ja UI-18 merkitty "Phase 17 | TBD" — molemmat on nyt käsitelty suunnitelmassa 17-01. Ei orpovaatimuksia.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | Ei anti-patterneja löydetty |

Tarkistettiin: TBD/FIXME/XXX-merkkejä ei löydy muutetuista tiedostoista. `return null`/tyhjät toteutukset puuttuvat. Kaikki filter-tilat johtavat todelliseen renderöintiin.

---

### Human Verification Required

#### 1. LayoutList-napin käyttäytyminen vs. ROADMAP SC-3

**Testi:** Avaa sovellus selaimessa. Aseta ensin jokin filtteriyhdistellmä aktiiviseksi (esim. laji = "padel", hinta ≤20€). Sulje overlay. Avaa nyt overlay LayoutList-napilla.
**Odotettu:** Overlay avautuu, hakukenttä EI saa autoFocusta (näppäimistö ei nouse mobiilissa). Aikaisemmin asetetut filtterit (padel, hinta) ovat edelleen voimassa — overlay näyttää suodatetun listan, ei koko listaa.
**Miksi ihminen:** `toggleSearch(false)` ei nollaa filtereitä (tarkistettu koodista), mutta tämä tarkoittaa SC-3 kirjaimellinen tulkinta ("ei triggeroi filtereitä") pitää — LayoutList-nappi ei muuta filter-tilaa. Visuaalinen vahvistus selaimessa tarvitaan D-01 vs. SC-3 ristiriidan ratkaisemiseen.

#### 2. Toggling ja karttakonteksti

**Testi:** Avaa sovellus karttanäkymässä (sheet kiinni). Paina Search-nappia → overlay avautuu + hakukenttä saa fokuksen. Paina Search-nappia uudelleen → overlay sulkeutuu. Paina LayoutList-nappia → overlay avautuu ilman fokusta. Paina LayoutList-nappia uudelleen → overlay sulkeutuu.
**Odotettu:** Molemmissa tapauksissa toggle toimii: yksi napautus avaa, toinen sulkee.
**Miksi ihminen:** `toggleSearch`-funktio tarkistaa `searchOpen`-tilan — automaattitesti ei voi simuloida animaatioita tai mobiili-näppäimistön käyttäytymistä.

---

### Gaps Summary

Ei teknisiä aukkoja. Kaikki 6 must-have-totuutta verifioidaan kooditasolla. Ihmisverifikaatio vaaditaan ROADMAP SC-3:n kanonisen tulkinnan (D-01 CONTEXT.md:ssa) visuaaliseen vahvistukseen — tämä ei ole blokkeri vaan end-of-phase vahvistusaskel.

---

_Verified: 2026-05-29_
_Verifier: Claude (gsd-verifier)_
