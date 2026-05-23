---
status: complete
phase: 09-auth-and-favorites
source:
  - .planning/phases/09-auth-and-favorites/09-01-SUMMARY.md
  - .planning/phases/09-auth-and-favorites/09-02-SUMMARY.md
  - .planning/phases/09-auth-and-favorites/09-03-SUMMARY.md
  - .planning/phases/09-auth-and-favorites/09-04-SUMMARY.md
started: 2026-05-23T12:45:00Z
updated: 2026-05-23T13:00:00Z
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. NavBar näyttää kirjautumistilan
expected: Hamburger-valikosta (☰) löytyy User-ikoninen nappi joka avaa AuthModal-kirjautumisikkunan. NavBar on sticky-yläpalkissa eikä auth-modaali katoa headerin taakse.
result: pass

### 2. AuthModal avautuu ja sisältää oikeat kentät
expected: User-nappia painaessa avautuu glass-modaali mustalla taustahäivytyksellä. Modaalissa on Google OAuth -nappi ("Jatka Googlella"), "TAI"-erotinrivi, sähköposti- ja salasanakentät sekä lähetysnappi. Modaalin saa suljettua taustaklikkaamalla tai X-napilla.
result: pass

### 3. Sähköposti/salasana-kirjautuminen toimii
expected: Kirjautuminen onnistuu: modaali sulkeutuu, NavBar hamburger-valikossa näkyy lyhennetty sähköpostiosoite ja LogOut-nappi.
result: issue
reported: "Jäi jumiin tilaan 'kirjaudutaan', päivittämällä sivun pääsin pois ja olin kirjautuneena. Kirjaudu ulos -painike löytyy, mutta lyhennettyä sähköpostia ei näy. Nappeihin täytyisi lisätä teksti joka kertoo mikä nappi on kyseessä."
severity: major

### 4. Uloskirjautuminen toimii
expected: NavBar hamburger-valikosta LogOut-nappia painamalla kirjaudutaan ulos. NavBar palaa kirjautumattomaan tilaan välittömästi.
result: issue
reported: "Kirjaudu ulos ei toimi heti, vaan vasta kun sivu päivitetään manuaalisesti."
severity: major

### 5. Sydännappi listakorteissa (kirjautumaton)
expected: Listakorteissa (/?nakyma=lista) näkyy sydännappi. Kirjautumattomana sydäntä painamalla avautuu AuthModal.
result: issue
reported: "Sydännappia painamalla ei tapahdu mitään"
severity: major

### 6. Sydännappi listakorteissa (kirjautunut)
expected: Kirjautuneena sydäntä painamalla sydän täyttyy välittömästi (optimistinen päivitys). Toistamalla painaminen poistaa suosikin. Päivitys tallentuu — sivua päivittämällä sydän pysyy tilassaan.
result: issue
reported: "Sydännapista ei tapahdu mitään vaikka ollaan kirjautuneena sisään"
severity: major

### 7. Sydännappi kartalla (Etusivu bottom sheet)
expected: Kartalla paikkaa klikkaamalla avautuu bottom sheet, jossa näkyy sydännappi. Kirjautuneena sydäntä painamalla suosikki tallentuu/poistuu. Kirjautumattomana avautuu AuthModal.
result: issue
reported: "Ei toimi. Kirjaudu ulos -nappi ei myöskään toimi."
severity: major

### 8. Sydännappi profiilisivulla
expected: Paikan profiilisivulla (/paikat/[id]) nimen vieressä on sydännappi. Kirjautuneena toimii kuten muut sydämet. Kirjautumattomana avaa AuthModal.
result: issue
reported: "Näkyy mutta ei toimi"
severity: major

### 9. Suosikit-sivu kirjautumattomana
expected: /suosikit-sivulla näkyy teksti joka kertoo kirjautumisen olevan tarpeen ("Suosikit vaativat kirjautumisen" tms.) sekä nappi/linkki kirjautumiseen.
result: pass

### 10. AI-suositus personalisoituu suosikkien mukaan
expected: Kirjautuneena ilman suosikkeja AI-widgetti toimii normaalisti (GET). Tallenna vähintään yksi suosikki ja avaa Etusivu uudelleen — AI-widgetti latautuu ja tekstin pitäisi viitata lisättyyn suosikkiin.
result: skipped
reason: Sydännappi ei toimi — suosikkeja ei voi tallentaa, personalisointi ei testattavissa.

## Summary

total: 10
passed: 3
issues: 6
pending: 0
skipped: 1

## Gaps

- truth: "Kirjautuminen sulkee modaalin välittömästi ja NavBar päivittyy ilman manuaalista sivun päivitystä"
  status: failed
  reason: "User reported: Jäi jumiin 'kirjaudutaan'-tilaan, modaali ei sulkeutunut. Myös uloskirjautuminen vaatii manuaalisen sivun päivityksen NavBarin päivittymiseksi."
  severity: major
  test: 3
  root_cause: "router.refresh() ei päivitä Next.js App Routerin root layoutia (layout.tsx). NavBar on client-komponentti joka saa userEmail-propin SSR:stä — prop ei päivity router.refresh()-kutsulla koska root layout on cachessa. Fix: lisää onAuthStateChange-kuuntelija NavBariin päivittämään auth-tila client-puolella."
  artifacts:
    - app/components/NavBar.tsx
    - app/layout.tsx
  missing:
    - client-side auth state management in NavBar via onAuthStateChange

- truth: "NavBar hamburger-valikossa näkyy kirjautuneen käyttäjän sähköposti lyhennettynä kaikissa näkymissä"
  status: failed
  reason: "User reported: Email näkyy toolbarissa lista-näkymässä mutta ei etusivulla/kartalla"
  severity: major
  test: 3
  root_cause: "Sama syy kuin yllä — NavBar käyttää SSR-proppia. Lista-näkymässä email näkyy koska LiikuntapaikatLista renderöidään eri routella jossa layout uudelleenhaetaan. Fix: NavBarin client-side onAuthStateChange hoitaa tämän."
  artifacts:
    - app/components/NavBar.tsx
  missing: []

- truth: "NavBar auth-painikkeilla on tekstiset selitteet (ei pelkkiä ikoneita)"
  status: failed
  reason: "User reported: Nappeihin täytyisi lisätä teksti joka kertoo mikä nappi on kyseessä"
  severity: minor
  test: 3
  root_cause: "NavBar hamburger-valikossa olevat napit (Search, Heart, User, LogOut) ovat pelkkiä ikoneita ilman tekstiä. Fix: lisää tekstitunnisteet nappeihin."
  artifacts:
    - app/components/NavBar.tsx
  missing: []

- truth: "Sydännapit toimivat — avaa AuthModal kirjautumattomalle, tallentaa suosikin kirjautuneelle"
  status: failed
  reason: "User reported: Sydännappia painamalla ei tapahdu mitään (kirjautunut tai kirjautumaton)"
  severity: major
  test: 5
  root_cause: "KAKSI juurisyytä: (1) suosikit-taulu ei ole luotu Supabase-dashboardissa — SQL-migraatio on kirjoitettu tiedostoon supabase/migrations/20260523_suosikit.sql mutta se pitää ajaa manuaalisesti. INSERT/DELETE epäonnistuu, optimistinen päivitys peruutetaan välittömästi → näyttää 'ei tapahdu mitään'. (2) Jos käyttäjä luulee olevansa kirjautumaton mutta NavBar on vanhentunut (root layout cache), supabase.auth.getUser() palauttaa edelleen käyttäjän → sydän yrittää tallentaa → epäonnistuu (taulu puuttuu) → peruuttaa."
  artifacts:
    - supabase/migrations/20260523_suosikit.sql
    - app/components/LiikuntapaikatLista.tsx
    - app/components/Etusivu.tsx
    - app/components/HeartButton.tsx
  missing:
    - suosikit table in Supabase (migration not run)
