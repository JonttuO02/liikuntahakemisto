# Phase 57: Dashboard-redirect-korjaus & Kesken-tila - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 57-Dashboard-redirect-korjaus & Kesken-tila
**Areas discussed:** Kesken-tunnistus, Badge & rivin ulkoasu, StatusCard-ylätason banneri, Jatka-painikkeen sijainti & teksti

---

## Kesken-tunnistus

| Option | Description | Selected |
|--------|-------------|----------|
| Vain draft-rivi olemassa | Kesken = onboarding_draft-rivi olemassa; venue luotu mutta wizardia ei avattu näytetään tavallisena Pending-venuena | (lähellä, ks. notes) |
| Draft TAI pending-linkki ilman draftia | Laajempi tulkinta — sisältää myös venuet joissa wizardia ei avattu ollenkaan | |

**User's choice:** Vapaateksti — "Kesken = Paikka, joka on luotu eli draft on olemassa, mutta onboardingia ei ole koskaan suoritettu loppuun eli onboardingissa ei ole valittu pikahyväksyntää tai onboardingin lopussa lähetetty hyväksyttäväksi"
**Notes:** Käytännössä vastaa ensimmäistä vaihtoehtoa (draft-rivin olemassaolo) tarkennettuna: "suoritettu loppuun" = submit-reitti on ajettu, joka poistaa draft-rivin. Ei tarvinnut laajentaa pending-linkkeihin joilla ei ole draftia — ne pysyvät tavallisina Pending-riveinä.

---

## Badge & rivin ulkoasu

| Option | Description | Selected |
|--------|-------------|----------|
| Kesken korvaa Pending-badgen | Neutraali/harmaa väri erottuakseen amber Pending-badgesta | ✓ (vahvistettu rationaalilla) |
| Kesken claim_status-badgen lisäksi | Molemmat badget rinnakkain | |

**User's choice:** "Status = approved, pending, rejected tai kesken. Koska status ei voi olla samaan aikaan kesken ja pending"
**Notes:** Käyttäjä vahvisti loogisen perusteen suositukselle: nelitilainen status (approved/pending/rejected/kesken) on toisensa poissulkeva, ei päällekkäinen badge-näyttö tarpeen.

---

## StatusCard-ylätason banneri

| Option | Description | Selected |
|--------|-------------|----------|
| Ei muutosta StatusCardiin | Pysyy ennallaan, Kesken näkyy vain per-rivi-badgena | ✓ |
| Lisää erillinen Kesken-banneri | Oma banneri kun 1+ kesken-venue | |

**User's choice:** Ei muutosta StatusCardiin (Recommended)
**Notes:** Yksinkertaisin muutos, ei riko olemassa olevaa hyväksyntä-viestintää.

---

## Jatka-painikkeen sijainti & teksti

| Option | Description | Selected |
|--------|-------------|----------|
| Jatka korvaa Muokkaa-napin | Esikatsele piilotetaan/disabloidaan kesken-riveille (julkaisematon venue) | ✓ |
| Jatka lisätään Muokkaa-napin rinnalle | Esikatsele+Muokkaa+Jatka kaikki näkyvissä | |

**User's choice:** Jatka korvaa Muokkaa-napin (Recommended)
**Notes:** Esikatselu ei mielekäs ennen onboardingin valmistumista (published: false).

---

## Claude's Discretion

- Tarkka tapa hakea draft-rivit dashboard-renderöintiä varten (erillinen kysely vs. join) — tekninen toteutustapa.
- Käännösavainten nimeäminen next-intl-rakenteen mukaisesti (FI/EN), CLEAN-06/07-vaatimuksen mukaisesti.

## Deferred Ideas

None — discussion stayed within phase scope.
