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
