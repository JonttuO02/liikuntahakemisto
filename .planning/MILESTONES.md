# Milestones — Liikuntahakemisto

## v1.0 MVP — 2026-05-21

**Shipped:** 2026-05-21
**Phases:** 5 | **Plans:** 25
**Timeline:** 2026-05-18 → 2026-05-21 (3 days)
**Files changed:** 48 | **Lines:** +6640 / -580

### What Shipped

1. **Turvallinen perusta** — RLS-politiikat, API-autentikaatio, yhtenäinen URL-routaus, virhesivut
2. **Interaktiivinen GPS-kartta** — @vis.gl/react-google-maps, 3D preview → fullscreen, sport pins, käyttäjän sijaintimerkki
3. **Datakanta** — aukioloajat Google Places -haulla, hinnat manuaalisesti, 7+ lajikategoriaa
4. **Aukioloajat & hinnat UI** — lib/aukiolo.ts, "Auki nyt" badge + filter, HoursTable.tsx, profiilisivu
5. **AI-sääsuositus-widget** — Claude Haiku + Open-Meteo, ei-blokkaava, sessionStorage-cache

### Known Deferred Items at Close

- UAT testi 4 (AI sääkonteksti) ohitettu — vaatii Claude API -krediittejä
- Data ops manuaaliset: sync-paikat + seed-hinnat ei automatisoitu

### Archives

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

---

## v1.1 Käyttäjät, Kartta & Laatu — 2026-05-27

**Shipped:** 2026-05-27
**Phases:** 6 (phases 6–11) | **Plans:** 23
**Timeline:** 2026-05-21 → 2026-05-27 (6 days)
**Commits:** ~194

### What Shipped

1. **UI-polish & kaupunkifiltteri** — Sponsoroitu-badge, hinta kortin yläosaan, "Varaa aika" pois listalta, "vain jäsenyys" -teksti, lajifiltteri pudotusvalikko, kaupunkifiltteri, GDPR-tietosuojasivu, AI-widget kaupunki-label
2. **AdvancedMarker-migraatio + kartta-infra** — AdvancedMarker kaikilla karttoilla, day/night mapId -vaihto, RecenterButton
3. **Karttaominaisuudet + bottom sheet -arkkitehtuuri** — GPS-tarkkuusrengas, zoom-perusteinen pin→info-kortti, /?id=<paikka_id> syvälinkki, Etusivu refaktoroitu sheetPhase-tilakoneeella
4. **Käyttäjätilit & suosikit** — Supabase Auth (email + Google OAuth), HeartButton + favorites engine, AI-personointi suosikkien perusteella
5. **Kaupunkilaajennus** — Helsinki + Turku sync-reitin kaupunki-parametrisoinnilla, nearestKaupunki-geoutility, city-aware AI-widget map-pan-debounssilla
6. **PWA** — Serwist service worker offline-välimuistilla, Web App Manifest, offline-fallback-sivu, kotinäyttöön-asennus

### Known Deferred Items at Close

- /suosikit-sivu (Suosikkipaikat kirjautuneelle) — siirretty v1.2
- Sydän-nappi session edge cases — siirretty v1.2
- Google OAuth callback URL — vaatii manuaalisen Google Cloud Console + Supabase dashboard -konfiguroinnin

### Archives

- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`
- `.planning/milestones/v1.1-phases/` (phase directories archived)
