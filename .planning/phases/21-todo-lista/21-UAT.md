---
status: complete
phase: 21-todo-lista
source:
  - .planning/phases/21-todo-lista/21-01-SUMMARY.md
  - .planning/phases/21-todo-lista/21-02-SUMMARY.md
started: 2026-05-31T00:00:00Z
updated: 2026-05-31T10:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Bookmark-ikoni paikkaprofiilisivulla
expected: |
  Avaa jonkin paikan profiilisivu (/paikat/[id]).
  Sivulla pitäisi näkyä kirjanmerkkipainike (Bookmark-ikoni) sydämen sijaan.
  Kun et ole lisännyt paikkaa TO DO -listalle: pelkkä Bookmark-ääriviiva, harmaa.
  Kun olet lisännyt: BookmarkCheck täytetty mustana.
result: pass

### 2. Bookmark-ikoni PaikkaSheetissä (kartan bottomsheet)
expected: |
  Avaa karttanäkymä, klikkaa jotain paikkaa — bottomsheet avautuu.
  Paikan tietopaneelin oikeassa yläkulmassa pitäisi näkyä Bookmark-ikoni (ei sydän).
  Klikkaus vaihtaa tilaa: harmaa Bookmark ↔ musta BookmarkCheck.
result: pass

### 3. /suosikit kirjautuneena, paikkoja listalla
expected: |
  Kirjaudu sisään ja lisää vähintään yksi paikka TO DO -listalle (bookmark-napista).
  Mene osoitteeseen /suosikit.
  Sivun pitäisi näyttää DiagonaalKortti-kortit (vinoneliötyyli, kuva vasemmalla).
  Jokaisen kortin oikealla puolella on BookmarkCheck-poistonappi.
  Sivun otsikko on "TO DO -lista".
result: pass

### 4. Poistonappi — optimistinen poisto
expected: |
  /suosikit-sivulla (kirjautuneena, paikkoja listalla):
  Klikkaa jonkin paikan poistonappia (BookmarkCheck-ikoni kortin vieressä).
  Kortti katoaa listalta välittömästi ilman latausta.
  Sivua päivittämällä paikka on edelleen poissa.
result: pass

### 5. Pin-nappi — navigoi kartalle
expected: |
  /suosikit-sivulla: klikkaa jonkin DiagonaalKortti-kortin pin-nappia (vasemmassa alakulmassa).
  Sivu siirtyy etusivulle (/) ja kartta kohdistuu kyseiseen paikkaan.
  Paikan callout-kortti avautuu tai paikka on kartalla näkyvissä.
result: pass

### 6. /suosikit kirjautuneena, lista tyhjä
expected: |
  Kirjaudu sisään tilillä, jolla ei ole yhtään TO DO -paikkaa (tai poista kaikki edellisessä testissä).
  Mene /suosikit.
  Pitäisi näkyä: Bookmark-ikoni (harmaa), otsikko "Ei vielä TO DO -paikkoja",
  teksti "Selaa hakemistoa ja lisää kirjanmerkillä.", linkki "Selaa hakemistoa".
result: pass

### 7. /suosikit kirjautumattomana
expected: |
  Kirjaudu ulos ja mene osoitteeseen /suosikit.
  Pitäisi näkyä: Bookmark-ikoni, otsikko "TO DO -lista vaatii kirjautumisen",
  kuvaus "Tallenna liikuntapaikkoja TO DO -listalle...",
  nappi "Kirjaudu sisään" ja linkki "Takaisin hakemistoon".
result: pass

### 8. NavPill — Bookmark + "TO DO"
expected: |
  Kirjaudu sisään. Klikkaa oikeassa yläkulmassa olevaa NavPill-nappulaa (•••).
  Avautuvassa valikossa pitäisi näkyä Bookmark-ikoni ja teksti "TO DO" (ei sydän eikä "Suosikit").
  Klikkaus vie osoitteeseen /suosikit.
result: pass

### 9. NavBar — Bookmark + "TO DO"
expected: |
  Kirjaudu sisään. Klikkaa vasemmassa yläkulmassa olevaa NavBar-valikkonappulaa (☰).
  Avautuvassa valikossa pitäisi näkyä Bookmark-ikoni ja teksti "TO DO" (ei sydän eikä "Suosikit").
  Haku-linkki (suurennuslasi, "Haku") on edelleen paikallaan muuttumattomana.
result: pass

## Summary

total: 9
passed: 9
issues: 0
skipped: 0
pending: 0

## Gaps

[none yet]
