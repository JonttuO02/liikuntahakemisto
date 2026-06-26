---
status: diagnosed
phase: 61-onboarding-vaiheiden-uudelleenj-rjestys
source: [61-01-SUMMARY.md, 61-02-SUMMARY.md, 61-03-SUMMARY.md, 61-04-SUMMARY.md]
started: 2026-06-26T07:00:00Z
updated: 2026-06-26T07:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. ClaimSearchForm vaatii vain nimen (ei sijaintia)
expected: Avaa uuden paikan luontilomake (ClaimSearchForm). Täytä vain yrityksen nimi ilman osoitetta tai koordinaatteja. CTA-painike aktivoituu heti kun nimi on täytetty — lomake ei pyydä sijaintia lainkaan. Klikkaamalla Luo paikka -painiketta luonti onnistuu.
result: pass

### 2. Onboarding alkaa StepNimiJaURL-askeleella
expected: Kun onboarding käynnistyy uudelle paikalle, ensimmäinen askel näyttää paikan nimen vain-luku-tilassa ja valinnaisen VERKKO-OSOITE-kentän. Paikan nimi ei ole editoitavissa, URL-kenttä on valinnainen. CTA on aktiivinen heti (URL ei vaadita).
result: pass
note: "UX-ehdotus: verkko-osoitekenttä voitaisiin siirtää ClaimSearchFormiin ja StepNimiJaURL poistaa kokonaan"

### 3. StepSijainti kerää sijainnin ennen wizardia
expected: Klikkaamalla Seuraava StepNimiJaURL-askeleella pääsee StepSijainti-askeleelle. Askel näyttää sijaintikartan/sijaintipickerin. Jatka-painike on disabled kunnes koordinaatit on valittu. Kun sijainti on valittu, painike aktivoituu ja klikkaaminen etenee onboardingissa.
result: issue
reported: "Toiminnallisuus OK, mutta kartan visuaalisuus poikkeaa muusta sovelluksesta: vakiopin pitää korvata sovelluksen omalla AdvancedMarkerilla, ja ylimääräiset Google Maps -painikkeet (satelliitti, kokonäyttö) pitää piilottaa kuten muissakin sovelluksen kartoissa."
severity: minor

### 4. Onboarding-virta: nimi-url → sijainti → analyze/laji-skip → wizard
expected: Suorita koko onboarding-virta alusta. Järjestys on: (1) NimiJaURL-askel, (2) Sijainti-askel, (3) AI-analyysi tai laji-skip, (4) wizard. Vanha Paikka-askel (StepPaikka) ei enää näy missään kohdassa virtaa.
result: issue
reported: "AI-analyysi käynnistyy taustalla oikein URL-syötöllä, mutta virta menee silti erilliseen 'analyze'-vaiheeseen käyttäjälle näkyvänä askeleena. Oikea käyttäytyminen: analyysi käynnistyy taustalla NimiJaURL-vaiheessa, virta menee suoraan wizardiin ilman erillistä analyze-vaihetta, ja AI-tulokset ovat wizardissa valmiina."
severity: major

### 5. ProgressBar näyttää "Lähetys" viimeisenä virstanpylväänä
expected: Wizard-vaiheessa ProgressBar näyttää 4 askelta. Viimeinen virstanpylväs on nimetty "Lähetys" (ei "Esikatselu"). Erillistä esikatselu-askelta ei ole.
result: pass

### 6. Submit tapahtuu StepYhteystiedot-askeleelta
expected: Täytä wizard loppuun saakka yhteystiedot-askeleelle (viimeinen vaihe). Onboarding-tilassa näkyy "Lähetys"-CTA (ei "Seuraava" eikä erillinen esikatselu-askel). Klikkaamalla CTA näytetään latausspinner, ja onnistuneen lähetyksen jälkeen käyttäjä ohjataan /business-sivulle.
result: pass

### 7. Verkkosivun URL käynnistää taustatoiminnot
expected: Kun StepNimiJaURL-askeleella syötetään verkkosivun URL ja klikataan Seuraava, selain etenee sijainti-askeleelle välittömästi (ei odota AI:ta). Taustalla käynnistyy AI-analyysi (ei näy käyttäjälle). Jos paikalle myöhemmin tulee AI-data, se näkyy wizardissa.
result: pass

## Summary

total: 7
passed: 5
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Onboarding-virta menee suoraan sijainti-askeleelta wizardiin ilman erillistä analyze-vaihetta; AI-analyysi käynnistyy taustalla NimiJaURL-vaiheessa ja tulokset ovat wizardissa valmiina"
  status: failed
  reason: "User reported: AI-analyysi käynnistyy taustalla oikein URL-syötöllä, mutta virta menee silti erilliseen 'analyze'-vaiheeseen käyttäjälle näkyvänä askeleena. Virta pitää mennä suoraan wizardiin."
  severity: major
  test: 4
  root_cause: "page.tsx rivi 371: sijainti-askeleen onNext kutsuu setPagePhase('analyze') kun websiteUrl on asetettu, vaikka AI-kutsu on jo käynnistetty taustalla handleNimiUrlNext:ssä (rivit 317-332). Myös rivi 313 fast-forward-polulla reitittää 'analyze'-vaiheeseen."
  artifacts:
    - path: "app/business/onboarding/page.tsx"
      issue: "Rivi 371: onNext={() => (websiteUrl ? setPagePhase('analyze') : handleSkip())} — pitää olla setPagePhase('wizard')"
    - path: "app/business/onboarding/page.tsx"
      issue: "Rivi 313: setPagePhase(url ? 'analyze' : 'laji-skip') — pitää olla setPagePhase(url ? 'wizard' : 'laji-skip')"
  missing:
    - "Muuta rivi 371: setPagePhase('analyze') → setPagePhase('wizard')"
    - "Muuta rivi 313: setPagePhase(url ? 'analyze' : ...) → setPagePhase(url ? 'wizard' : ...)"
    - "Tarkista handleBackToPrePhase (rivi 351-353) — 'analyze' back-navigationin tarve wizardista"
  debug_session: .planning/debug/analyze-phase-visible.md

- truth: "StepSijainti-kartan visuaalisuus vastaa muita sovelluksen karttoja: AdvancedMarker + karkeistetut kontrollit (ei satelliitti/kokonäyttö)"
  status: failed
  reason: "User reported: vakiopin pitää korvata AdvancedMarkerilla, ja ylimääräiset Google Maps -painikkeet (satelliitti, kokonäyttö) pitää piilottaa kuten muissakin sovelluksen kartoissa"
  severity: minor
  test: 3
  root_cause: "SijaintiPicker.tsx:ssä kaksi puutetta: (1) rivi 116: <Map>-komponentilta puuttuu disableDefaultUI-prop joka piilottaisi satelliitti/kokonäyttö-kontrollit kuten muissa sovelluksen kartoissa; (2) rivi 125: <AdvancedMarker> on self-closing ilman lapsia, joten SDK renderöi vakio Google-punaisen pinin — muut sovelluksen AdvancedMarkerit käärivät custom-lapsen (SportPin tai CalloutCard)."
  artifacts:
    - path: "app/components/SijaintiPicker.tsx"
      issue: "Rivi 116: <Map> puuttuu disableDefaultUI prop"
    - path: "app/components/SijaintiPicker.tsx"
      issue: "Rivi 125: <AdvancedMarker> self-closing ilman custom-lapsia → vakio Google-pin"
  missing:
    - "Lisää disableDefaultUI <Map>-komponentille riville 116"
    - "Lisää custom-lapsi <AdvancedMarker>:lle: pieni musta sijaintipinni (SVG tai SportPin-analogia) position:relative; width:0; height:0 -ankkuridivissä"
  debug_session: .planning/debug/sijainti-map-visual.md
