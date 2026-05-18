# Liikuntahakemisto

## What This Is

Suomalainen liikuntapalveluiden hakemisto ja löytämisalusta. Kokoaa kaikki liikunta-alan palvelut ja mahdollisuudet yhteen sovellukseen — inspiraatioksi lajin etsijälle ja käytännön apuvälineeksi matkailijalle, joka etsii läheltä salin kertakäyntiä. Aloitetaan Tampereelta, laajennetaan myöhemmin.

## Core Value

Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.

## Requirements

### Validated

<!-- Toimiva pohja on rakennettu — nämä toimivat jo codebasessa -->

- ✓ Liikuntapaikkojen listausnäkymä lajifiltterillä — existing
- ✓ Karttatoggle (lista ↔ kartta) — existing
- ✓ Google Maps -karttakomponentti pineineen — existing
- ✓ Paikan profiilisivu (detail view) — existing
- ✓ Supabase-backend paikkatiedoille — existing
- ✓ Google Places API -integraatio automaattiseen datahakuun — existing
- ✓ PaikkaKortti-komponentti (nimi, laji, osoite, CTA) — existing
- ✓ Mobiilinavigaatio (BottomNav + NavBar) — existing
- ✓ Framer Motion -animaatiot (scroll, card hover, filter) — existing

### Active

<!-- Tavoite v1:lle — rakennetaan tähän -->

- [ ] GPS-pohjainen "lähellä sinua" -sijaintitunnistus kartalla
- [ ] Kertakäyntihinta näkyy palvelukortilla ja profiilisivulla
- [ ] Aukioloajat näkyy palvelukortilla ja profiilisivulla
- [ ] Sääpohjainen AI-suosittelu-widget etusivulla (Open-Meteo + Claude API)
- [ ] Tampere-kattava datakanta: automaatti (Google) + manuaalinen yrityksiltä
- [ ] Etusivun kartta on pääominaisuus — GPS-sijainnin näyttävä, scrollatessa laajeneva
- [ ] Mainostila liikunta-alan palveluille etusivulla (placeholder → myöhemmin toimiva)
- [ ] Palvelun datamallin täydennys: hinta + aukioloajat + lajikategoria Supabasessa
- [ ] Mobiilioptimitu UX vastaa design-tavoitetta (Wolt/Ryde/Mobilepay -taso)

### Out of Scope

- Käyttäjätilit v1:ssä — matalakynnyksinen käyttö ilman rekisteröintiä ensin
- Tampere ulkopuolinen data v1:ssä — fokus ensin yhteen kaupunkiin
- Varausjärjestelmä — viitataan palveluntarjoajan omaan sivuun
- Sosiaalinen jakaminen / arvostelut — lisätään kun käyttäjäkunta on
- Mobiiliappi (iOS/Android) — PWA tai web-first ensin

## Context

**Nykyinen tila:** Pohja on rakennettu (listaustoiminto, kartta, profiilisivu, Supabase, Google Places), mutta visuaalinen ilme ja käyttökokemus eivät vielä vastaa tavoitetta. Animaatiot ovat olemassa mutta kokonaisuus ei tunnu Wolt-tasoiselta.

**Data-arkkitehtuuri:** Google Places API hakee automaattisesti paikkatietoja → upsertit Supabaseen. Kertakäyntihinnat ja aukioloajat eivät tule Googlesta kattavasti — täydennetään manuaalisesti yrityksiltä.

**Design-referenssit:** Wolt, Ryde, Mobilepay — minimalistinen, modernit animaatiot, selkeä hierarkia, mobiilifirst.

**Tekninen ympäristö:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind v3, Framer Motion, Supabase (Postgres), Google Maps/Places API, Open-Meteo (sää), Base UI + shadcn/ui.

**Maantiede:** Tampere v1. Laajentuminen muihin kaupunkeihin on suunniteltu mutta ei v1-scope.

**Bisnes:** Mainostila liikunta-alan palveluille — malli tarkentuu käytön myötä. Ei maksumuureja käyttäjälle.

## Constraints

- **Stack**: Next.js 14 + Supabase + Tailwind v3 — ei vaihdeta runkoa kesken
- **Design**: Indigo-väripaletti (CLAUDE.md-ohje), Emil Kowalski -animaatiofilosofia
- **Data**: Google Places API (GOOGLE_PLACES_API_KEY server-only), kartta client-side (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
- **Kirjautuminen**: Ei pakollisena v1:ssä — kaikki toimii anonyymisti
- **Aikataulu**: Muutama kuukausi — laatu edellä, ei kiire

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router + Supabase | Nopea kehitys, skaalautuva, hyvä SSR-tuki | — Pending |
| Kartta etusivun pääominaisuus | GPS-pohjainen löytäminen on ydinkokemus | — Pending |
| Ei kirjautumista v1:ssä | Matala kynnys, nähdään käyttö ennen pakottamista | — Pending |
| Tampere-first | Fokus ensin, skaalaus myöhemmin | — Pending |
| Sääpohjainen AI-suosittelu | Erilaistava ominaisuus, Open-Meteo ilmainen | — Pending |
| Mainostila bisnesmalliksi | Käyttäjille ilmainen, liikunta-ala kohderyhmä | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-19 after initialization*
