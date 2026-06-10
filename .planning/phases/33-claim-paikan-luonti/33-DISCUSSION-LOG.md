# Phase 33: Claim & paikan luonti - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 33-claim-paikan-luonti
**Areas discussed:** UI-sijoittelu & virta, Paikkahaku-UX, Uuden paikan minimikentät, Submit-jälkeinen UX

---

## UI-sijoittelu & virta

| Option | Description | Selected |
|--------|-------------|----------|
| /business korvaa stubin | Phase 33 korvaa /business-stubin claim/luonti-näkymällä; vähemmän reittejä | ✓ |
| Erillinen /business/onboarding/paikka | /business säilyy stubina ja ohjaa /business/onboarding/paikka-sivulle | |
| Erillinen /business/claim | Kokonaan erillinen sivu, /business jää stubiksi kunnes Phase 36 | |

**User's choice:** /business korvaa stubin (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| business_paikka_links -tarkistus | Jos ei rivejä → claim-UI; jos on → tilaplaceholder | ✓ |
| claim_status tarkistus | Myös claim_status; pending → odotus, approved → hallintapaneeli | |

**User's choice:** business_paikka_links -tarkistus (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Server Component | SSR tarkistus, ei loading-flikkeriä | ✓ |
| Client Component | useEffect fetch, johtaa loading-näkymään | |

**User's choice:** Server Component (Recommended)

---

## Paikkahaku-UX

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time debounced | 300ms debounce, Supabase ilike suoraan clientiltä | ✓ |
| Submit-lomake | Erillinen haku-nappi, POST API-routea | |
| Real-time server-side | Real-time mutta Route Handler -kutsu | |

**User's choice:** Real-time debounced (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nimi + kaupunki | Tekstikenttä nimelle + kaupunki-dropdown | ✓ |
| Pelkkä nimi | Yksinkertaisempi, voi palauttaa harhautuvia tuloksia | |

**User's choice:** Nimi + kaupunki (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Lista korteilla, klikki valitsee | Max 8 tulosta; nimi, osoite, laji; "Jo hallittu" -merkki claimed paikoille | ✓ |
| Autocomplete dropdown | Google-tyylinen autocomplete | |

**User's choice:** Lista korteilla, klikki valitsee (Recommended)

---

## Uuden paikan minimikentät

| Option | Description | Selected |
|--------|-------------|----------|
| Nimi + osoite + kaupunki | Minimaalinen setti; Phase 34 kerää loput | ✓ |
| Nimi + osoite + kaupunki + laji | Lisää laji-valinta dropdownina | |

**User's choice:** Nimi + osoite + kaupunki (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| published + julkinen query -suodatin | Migraatio + hae-paikat .eq('published', true) suodatin | ✓ |
| published sarake vain, query myöhemmin | Riski: published=false paikat voisivat näkyä käyttäjille | |

**User's choice:** published + julkinen query -suodatin (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| POST /api/business/create-paikka Route Handler | JWT + atominen INSERT, service role key | ✓ |
| Client-side supabaseAdmin | Service role key ei kuulu clientiin — ei mahdollista turvallisesti | |

**User's choice:** POST /api/business/create-paikka Route Handler (Recommended)

---

## Submit-jälkeinen UX

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect /business + pending-tilatieto | Server Component refetch, näyttää paikan nimen + odotusviesti | ✓ |
| Erillinen kiitossivu | Ylimääräinen reitti | |
| Inline-vahvistus | Sama sivu, toast + state muutos, ei redirect | |

**User's choice:** Redirect /business + pending-tilatieto (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sama kuin claim: redirect /business + pending-tilatieto | Yhtenäinen kokemus molemmille poluille | ✓ |
| Redirect suoraan Phase 34 onboarding-velhoon | Phase 34 ei ole vielä rakennettu Phase 33:n aikana | |

**User's choice:** Sama kuin claim (Recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Virheviesti hakutuloksessa | Claimed paikka näkyy listassa "Jo hallittu" -merkillä + disabled; estää submitin | ✓ |
| Virheviesti vasta submitissa | Huonompi UX | |

**User's choice:** Virheviesti hakutuloksessa (Recommended)

---

## Claude's Discretion

- RLS-rajoitus "Jo hallittu" -tarkistuksessa: researcher päättää sopivimman ratkaisun (`is_claimed` boolean liikuntapaikat-taulussa vai server-side tarkistus)

## Deferred Ideas

- Laji-kenttä uuden paikan luomisessa — Phase 34 onboarding-velhou kerää lajin
- Redirect suoraan Phase 34 onboarding-velhoon — toteutetaan kun Phase 34 on valmis
- `/business`-reitin middleware-suojaus — Phase 36 (sama päätös kuin Phase 32)
