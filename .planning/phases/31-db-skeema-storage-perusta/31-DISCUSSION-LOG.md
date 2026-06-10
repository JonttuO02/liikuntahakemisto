# Phase 31: DB-skeema & Storage-perusta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 31-db-skeema-storage-perusta
**Areas discussed:** business_accounts schema, business_paikka_links rakenne, Storage-polkurakenne, is_admin profiles-taulussa

---

## business_accounts schema

| Option | Description | Selected |
|--------|-------------|----------|
| Lisätään approval_status nyt | Perustamisvaiheessa helpoin aika. Phase 35 voi heti käyttää ilman erillistä migraatiota. | ✓ |
| Siirretään Phase 35:een | YAGNI — Phase 35 lisää sarakkeen oman migraation yhteydessä. | |

**User's choice:** Lisätään nyt

| Option | Description | Selected |
|--------|-------------|----------|
| pending / approved / rejected | 3-tila: hylkeis tallennetaan, näkyy yritykselle. Vastaa ADMIN-03/ADMIN-04. | ✓ |
| pending / approved (rejected = poistetaan) | Yksinkertaisempi, mutta yritys ei näe hylkäyssyytä. | |

**User's choice:** pending / approved / rejected

| Option | Description | Selected |
|--------|-------------|----------|
| Minimaalinen: user_id, company_name, approval_status, created_at | Kaikki muu kerätään onboarding-velhossa. | ✓ |
| + rejection_reason ja approved_at | Hylkäyssyy suoraan taulussa + aikaleima. | |

**User's choice:** Minimaalinen

**Notes:** rejection_reason lisätään Phase 35:n migraatiolla kun admin-hyväksyntäjärjestelmä rakennetaan.

---

## business_paikka_links rakenne

| Option | Description | Selected |
|--------|-------------|----------|
| Claim-status tässä liitostaaulussa | Per-paikka status (pending/approved/rejected). Phase 33 ja 35 käyttävät suoraan. | ✓ |
| Vain tilin tason status | Vain account-tason approval_status business_accounts:ssa. Rajoittaa tulevaisuutta. | |

**User's choice:** Claim-status tässä liitostaaulussa

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä, UNIQUE paikka_id:lle | Yksi paikka = yksi yritys. Ketjuadmin siirretty tulevaisuuteen. | ✓ |
| Ei rajoitetta, useita omistajia | Joustavampi mutta ristiriidassa siirretyn vaatimuksen kanssa. | |

**User's choice:** UNIQUE paikka_id:lle

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä, link_type 'claim' \| 'created' | Phase 35 admin-UI näkee suoraan minkä tyypin hakemus. | ✓ |
| Ei, johdetaan muualta | Päätellään esim. business_managed-lipusta. | |

**User's choice:** link_type-sarake

---

## Storage-polkurakenne

| Option | Description | Selected |
|--------|-------------|----------|
| {business_id}/{paikka_id}/images/ | Heijastaa omistusketjua. RLS selkeä. | ✓ |
| {paikka_id}/images/ | Yksinkertaisempi polku, mutta RLS yhtä monimutkainen. | |

**User's choice:** {business_id}/{paikka_id}/images/

| Option | Description | Selected |
|--------|-------------|----------|
| Per-yritys: {business_id}/logo/ | Yksi logo per yritys riippumatta paikkojen määrästä. | ✓ |
| Per-paikka: {business_id}/{paikka_id}/logo/ | Jokaisella paikalla oma logo. | |

**User's choice:** Per-yritys logo

---

## is_admin profiles-taulussa

| Option | Description | Selected |
|--------|-------------|----------|
| Lisätään nyt | Perusinfrana, Phase 35 voi heti käyttää. | ✓ |
| Siirretään Phase 35:een | Lisätään vasta kun tarvitaan. | |

**User's choice:** Lisätään nyt

**Notes:** Asetetaan is_admin = true manuaalisesti SQL-editorissa joona.orava@gmail.com:lle migraation jälkeen.

---

## Claude's Discretion

- Storage bucket RLS kirjoituspoliitiikan tarkat SQL-lausekkeet (storage.objects-taulu)
- Indeksit: tarvitaanko erikseen indeksi `business_paikka_links(paikka_id)` vai riittääkö UNIQUE constraint (luo indeksin automaattisesti)

## Deferred Ideas

- `published BOOLEAN` liikuntapaikat-tauluun — Phase 33 lisää migraatiolla
- `rejection_reason TEXT` business_accounts-tauluun — Phase 35 lisää migraatiolla
- Ketjuadmin (yksi yritystili, useita toimipisteitä) — tulevaisuuteen
