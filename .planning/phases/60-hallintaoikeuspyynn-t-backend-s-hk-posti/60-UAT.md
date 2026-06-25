---
status: complete
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
source: [60-01-SUMMARY.md, 60-02-SUMMARY.md, 60-03-SUMMARY.md, 60-04-SUMMARY.md, 60-05-SUMMARY.md, 60-06-SUMMARY.md]
started: 2026-06-25T00:00:00Z
updated: 2026-06-26T00:00:00Z
gap_closure: "60-06 (middleware liity fix) committed 0f0553c — all affected items re-tested and passed"
---

## Current Test

[testing complete]

## Tests

### 1. Kopioi kutsulinkki -painike approved-tilaisella liikuntapaikalla
expected: Hyväksytyn liikuntapaikan rivillä näkyy "Kopioi kutsulinkki" -painike. Klikkaus kopioi /business/liity?paikka_id=X leikepöydälle ja painikkeen teksti muuttuu hetkeksi "Linkki kopioitu".
result: pass

### 2. /business/liity -sivu — kirjautumaton käyttäjä ohjataan rekisteröintiin
expected: Avaa /business/liity?paikka_id=1 kirjautumattomana. Sivu ohjaa /business/rekisteroidy?paikka_id=1 -osoitteeseen.
result: pass

### 3. /business/liity -sivu — submit-lomake autentoituneelle kutsulinkki-käyttäjälle
expected: Kirjaudu sisään kutsulinkki-käyttäjänä (company_id=NULL). Avaa /business/liity?paikka_id=X. Sivu näyttää "Pyydä pääsyä" -lomakkeen. Lähetyksen jälkeen sivu näyttää "Pyyntösi odottaa hyväksyntää" -tilan.
result: pass

### 4. D-08 idempotenttisuus — kaksoislähetys palauttaa pending-tilan eikä virhettä
expected: Lähetä sama pyyntö uudelleen (sama kutsulinkki, sama paikka_id). Sivu näyttää pending-tilan (ei 500-virhettä tai "Pyyntö hylätty").
result: pass

### 5. D-09 suojaus — jo yrityksen jäsen ei voi lähettää pyyntöä
expected: Kirjaudu yritystilillä, jolla on company_id asetettu. Avaa /business/liity?paikka_id=X. Sivu näyttää virheen "Olet jo yrityksen jäsen" (tai vastaava) eikä näytä submit-lomaketta.
result: pass

### 6. Pending-banneri /business-sivulla
expected: Kirjaudu käyttäjänä, jolla on pending-tila business_access_requests-taulussa. Avaa /business. Sivulla näkyy "Pyyntösi odottaa hyväksyntää" -tyyppinen banneri.
result: skipped
reason: Ei testidataa saatavilla.

### 7. Hyväksy-toiminto (approve) myöntää pääsyn
expected: Omistajan tililtä POST /api/business/access-request/approve (paikka_id + requester_id). Vastaus 200. Tarkista Supabase-dashboardista: requester sai company_id + role='member' ja business_paikka_links-rivi on olemassa.
result: skipped
reason: Ei pending-testidataa saatavilla.

### 8. Hylkää-toiminto (reject) asettaa rejected-tilan
expected: POST /api/business/access-request/reject (paikka_id + requester_id + valinnainen rejection_reason). Vastaus 200. business_access_requests-rivin status on 'rejected'.
result: skipped
reason: Ei pending-testidataa saatavilla.

## Summary

total: 8
passed: 5
issues: 0
pending: 0
skipped: 3
blocked: 0

## Gaps

[none]
