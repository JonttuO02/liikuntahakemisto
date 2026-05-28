# Phase 14: Profiilisivu & AI-kotipaikkakunta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 14-profiilisivu-ai-kotipaikkakunta
**Areas discussed:** Profiles-taulun kirjoitus, Kotikaupunki → AI-widgettiin, Navigointi /profiiliin, AI cache key + kotikaupunki

---

## Profiles-taulun kirjoitus

| Option | Description | Selected |
|--------|-------------|----------|
| Browser client + RLS | Sama kuin suosikit: upsert suoraan createBrowserSupabase():lla | Claude's choice |
| API Route Handler + service role | Uusi /api/profiili Route Handler, service role key kirjoituksiin | |
| You decide | Claude valitsee arkkitehtuurin | ✓ |

**User's choice:** You decide
**Notes:** Claude valitsi browser client + RLS — seuraa suosikit-arkkitehtuuria, yksinkertaisempi, RLS riittää turvaksi.

| Option | Description | Selected |
|--------|-------------|----------|
| Minimaalinen schema | user_id, kotikaupunki, updated_at | ✓ |
| Laajempi schema | display_name tai bio-kenttä jo nyt | |

**User's choice:** Minimaalinen

| Option | Description | Selected |
|--------|-------------|----------|
| Upsert save-painikkeella | Rivi luodaan vasta tallennuksessa | ✓ |
| Auth trigger Supabasessa | DB trigger luo rivin rekisteröinnissä | |

**User's choice:** Upsert save-painikkeella

| Option | Description | Selected |
|--------|-------------|----------|
| Inline teksti kortissa | "Kotikaupunki tallennettu", 2-3s | ✓ |
| You decide | Claude valitsee UX-ratkaisun | |

**User's choice:** Inline teksti kortissa

---

## Kotikaupunki → AI-widgettiin

| Option | Description | Selected |
|--------|-------------|----------|
| Etusivu lataa kirjautuessa | subscribeToAuthUser-callback, rinnakkain suosikit-haun kanssa | ✓ |
| AI-widget hakee itse mountissa | Erillinen profiles-haku widgetissä | |
| You decide | Claude valitsee | |

**User's choice:** Etusivu lataa kirjautuessa

| Option | Description | Selected |
|--------|-------------|----------|
| POST body — uusi kenttä | { suosikit, kaupunki, kotikaupunki } | |
| Aina POST kirjautuneena | Kirjautunut → aina POST (myös ilman suosikkeja), GET vain anonyymille | ✓ |

**User's choice:** Aina POST kirjautuneena
**Notes:** Muutos nykyiseen logiikkaan: aiemmin POST vain kun suosikitIds.size > 0.

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt ilman kotikaupunkikontekstia | Jos kotikaupunki tyhjä, lähetetään POST ilman sitä | ✓ |
| Ei lähetetä kotikaupunkia ollenkaan | Sama asia — kenttä jätetään pois body:stä | |

**User's choice:** Prompt ilman kotikaupunkikontekstia

---

## Navigointi /profiiliin

| Option | Description | Selected |
|--------|-------------|----------|
| NavBar dropdown, kirjautuneena | Profiili-linkki vain kirjautuneille | |
| NavBar dropdown, aina näkyvissä | Näkyy kaikille, kirjautumaton näkee CTA:n profiilisivulla | ✓ |
| Vain suora URL | Ei NavBar-muutoksia tässä vaiheessa | |

**User's choice:** NavBar dropdown, aina näkyvissä

| Option | Description | Selected |
|--------|-------------|----------|
| "Profiili" Suosikit-linkin yläpuolelle | Järjestys: Profiili → Suosikit | ✓ |
| "Profiili" Suosikit-linkin alapuolelle | Järjestys: Suosikit → Profiili | |
| You decide | Claude valitsee järjestyksen | |

**User's choice:** Profiili Suosikit-linkin yläpuolelle

---

## AI cache key + kotikaupunki

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä, lisätään kotikaupunki cache-avaimeen | date + suosikitIds.size + kotikaupunki | |
| Ei, vanha logiikka riittää | Kotikaupungin muutos näkyy seuraavana päivänä | ✓ |

**User's choice:** Vanha logiikka riittää

| Option | Description | Selected |
|--------|-------------|----------|
| Molemmat kaupungit promptiin | Aina kun kotikaupunki asetettu | |
| Vain kun eri kaupungit | Konteksti vain reissussa-skenaariossa | ✓ |

**User's choice:** Vain kun eri kaupungit (reissussa)
**Notes:** Claude päättää sanamuodon promptissa.

---

## Claude's Discretion

- Profiles write path: browser client + RLS (valittu vs. Route Handler)
- AI-promptin sanamuoto reissussa-kontekstille
- ProfiiliClient-komponentin visuaalinen layout (noudattaa SuosikitClient-rakennetta)
- Etusivu-muutoksissa kotikaupunki-staten tarkka nimi

## Deferred Ideas

- Laaja käyttäjäprofiili (display_name, bio, profiilikuva) — v2.0
- Kirjaudu ulos -nappi profiilisivulla — käyttäjä voi kirjautua ulos NavBar-modaalin kautta
- Kotikaupunki-autocomplete (SUOMI_KAUPUNGIT-lista ehdotuksina) — free text riittää nyt
