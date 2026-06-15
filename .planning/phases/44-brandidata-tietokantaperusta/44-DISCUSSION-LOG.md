# Phase 44: Brändidatan tietokantaperusta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 44-brandidata-tietokantaperusta
**Areas discussed:** Rivin yksilöllisyys, Lisäkolumnit, RLS-politiikkojen laajuus

---

## Rivin yksilöllisyys

| Option | Description | Selected |
|--------|-------------|----------|
| Yksi rivi per yritys | UNIQUE(business_account_id) — Faasi 45 tekee UPSERTin. Yksinkertaisin malli MVP-virtaan. | ✓ |
| Useita rivejä per yritys | Ei UNIQUE-rajoitetta — jokainen analyysi luo uuden rivin. Joustonvaraa historialle, mutta vaatii "aktiivinen rivi" -logiikan. | |

**User's choice:** Yksi rivi per yritys (UNIQUE constraint)
**Notes:** MVP-faasin yksinkertaisin malli. Re-analyysit (edit-flow) ovat out of scope tässä milestonessa.

---

## Lisäkolumnit

| Option | Description | Selected |
|--------|-------------|----------|
| Lisätään molemmat | `error_message text` + `analyzed_at timestamptz` toteutusohjeesta, vaikka ROADMAPissa ei mainittu. | ✓ |
| Vain ROADMAP-määrittely | Tarkka ROADMAP-skeema ilman lisäkolumneja. | |

**User's choice:** Lisätään molemmat
**Notes:** `error_message` helpottaa debuggausta virhetilanteissa. `analyzed_at` kertoo milloin viimeisin analyysi ajettiin.

---

## RLS-politiikkojen laajuus

| Option | Description | Selected |
|--------|-------------|----------|
| SELECT + INSERT + UPDATE | Tasan BRDDB-02:n vaatimus. Poistaminen service role -avaimella. | ✓ |
| Lisätään myös DELETE | Yritys voisi poistaa oman brändidatansa suoraan. Ei tarpeen Faasien 45–46 virtaan. | |

**User's choice:** SELECT + INSERT + UPDATE
**Notes:** Noudattaa BRDDB-02:n tarkasti. Delete-operaatiot hoidetaan service role -avaimella kuten muutkin admin-operaatiot.

---

## Claude's Discretion

- Indeksin lisääminen `business_account_id`-sarakkeelle — standardikäytäntö FK-sarakkeille, ei erikseen kysytty
- Migraatiotiedoston nimeäminen (`20260615000001_business_branding.sql`) — noudattaa projektin konventiota

## Deferred Ideas

- `approved`-status (yrittäjä hyväksyy analyysin) — ei kuulu tähän milestoneen
- DELETE-politiikka branding-taululle — service role hoitaa tarvittaessa
- `card_image_url` hero-kuville — toteutusohjeessa mainittu mutta Faasiin 46 saakka
