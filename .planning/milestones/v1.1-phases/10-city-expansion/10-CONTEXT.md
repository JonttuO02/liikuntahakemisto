# Phase 10: City Expansion - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Helsinki- ja Turku-alueen liikuntapaikat haetaan Google Places -synkronoinnilla tietokantaan ja ovat löydettävissä kaupunkifiltterin kautta. Samalla AI-sääwidget muuttuu karttakeskipiste-tietoiseksi: se näyttää lähimmän suomalaisen suurkaupungin sään kun käyttäjä liikkuu kartalla.

Requirements: DATA-05, DATA-06.

**Out of scope:** Muiden kaupunkien kuin Helsinki/Turku synkronointi (vaikka infra tukisi niitäkin), kartan automaattinen siirtyminen valittuun kaupunkiin city-filtterin vaihtuessa.

</domain>

<decisions>
## Implementation Decisions

### Sync-parametrisointi
- **D-01:** Olemassa oleva `/api/admin/sync-paikat` -reitti laajennetaan `?kaupunki=<nimi>` -query-parametrilla. Ei uusia reittejä.
- **D-02:** Kaupunki-parametri ohjaa kolmea kovakoodattua kohtaa: hakukyselyjen kaupungin nimi (`'padel Tampere'` → `'padel Helsinki'`), Google Places `location`-koordinaatit, sekä tietokantaan kirjoitettava `kaupunki`-sarake.
- **D-03:** `parseOsoite` saa kaupunki-parametrin ja suodattaa sen osoitteesta dynaamisesti (ei enää kovakoodattua `/tampere/i`-regex-suodatinta).
- **D-04:** Upsert käyttää edelleen `onConflict: 'place_id'` — Google Places ID on globaalisti uniikki, Helsinki/Turku-data ei ylikirjoita Tampere-dataa.
- **D-05:** `SPORT_QUERIES` muuttuu `SPORT_LAJIT`-listaksi (vain laji-kentät ilman kaupunkia); route rakentaa hakukyselyt dynaamisesti `${laji} ${kaupunki}`.

### AI-sääwidget — karttakeskipiste-tietoisuus
- **D-06:** `lib/constants.ts` saa uuden `SUOMI_KAUPUNGIT`-listan (~25 suurinta suomalaiskaupunkia, väestö > 30 000). Jokaisella: `{ nimi: string; lat: number; lng: number }`.
- **D-07:** Uusi `nearestKaupunki(lat, lng): string` -funktio `lib/geo.ts`:ään — käyttää olemassa olevaa `haversineKm`-funktiota, palauttaa lähimmän kaupungin nimen `SUOMI_KAUPUNGIT`-listasta.
- **D-08:** `Etusivu.tsx`:ään lisätään `mapCenter`-tila (koordinaatit) joka päivittyy `onCameraChanged`-callbackissa. Debounce 3 sekuntia — ref-pohjainen `setTimeout`/`clearTimeout`.
- **D-09:** Kun debounce laukeaa ja `nearestKaupunki(mapCenter)` palauttaa eri kaupungin kuin nykyinen `weatherKaupunki`-tila, triggeröidään uusi AI/sää-haku.
- **D-10:** `/api/saasuositus` GET- ja POST-endpointit hyväksyvät `kaupunki`-parametrin: GET `?kaupunki=Helsinki`, POST body `{ ..., kaupunki: 'Helsinki' }`. Fallback: `'Tampere'`.
- **D-11:** `fetchWeather(lat, lng)` saa koordinaattiparametrit kovakoodatun Tampere-URLin sijaan. Serveri hakee `SUOMI_KAUPUNGIT`-listasta koordinaatit kaupungin nimen perusteella.
- **D-12:** Claude Haiku -prompti käyttää kaupungin nimeä dynaamisesti: `Tänään on ${day} ${kaupunki}ssa/lla...` (kaupunki-kohtainen taivutus tai yksinkertaistettu muoto).

### Kartan käyttäytyminen city-filtterillä
- **D-13:** Kaupunki-filtteri listanäkymässä ei liikuta karttaa. Käyttäjä navigoi kartalla manuaalisesti. Kartan defaultCenter pysyy Tampereessa.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sync-reitti
- `app/api/admin/sync-paikat/route.ts` — olemassa oleva reitti jota laajennetaan; KAIKKI muutokset tähän tiedostoon
- `lib/constants.ts` — lisätään `SUOMI_KAUPUNGIT` ja Helsinki/Turku koordinaatit tänne
- `lib/supabaseAdmin.server.ts` — supabaseAdmin-client (ei muutoksia)

### AI-widget ja sää
- `app/api/saasuositus/route.ts` — `fetchWeather()` parametrisoitava, GET/POST kaupunki-aware
- `app/components/Etusivu.tsx` — karttakeskipiste-tracking, debounce, weatherKaupunki-tila
- `lib/geo.ts` — `haversineKm` jo olemassa; `nearestKaupunki` lisätään tänne

### Vaatimukset
- `.planning/REQUIREMENTS.md` — DATA-05, DATA-06
- `.planning/ROADMAP.md` — Phase 10 success criteria

### Design system
- `CLAUDE.md` — glassmorphism-utilities, ei UI-muutoksia tässä vaiheessa

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `haversineKm(lat1, lng1, lat2, lng2)` `lib/geo.ts` — käytetään `nearestKaupunki()`-funktiossa suoraan
- `TAMPERE` `lib/constants.ts` — malli SUOMI_KAUPUNGIT-rakenteelle
- `onCameraChanged` `Etusivu.tsx` — jo käytössä zoom-trackaukseen; lisätään center-trackaus samaan callbackiin

### Established Patterns
- Sync-reitti: `upsert(rivit, { onConflict: 'place_id' })` — toimii multi-city datalle ilman muutoksia
- Admin-autentikointi: `Authorization: Bearer ${ADMIN_SECRET}` header — pysyy samana
- `fetchWeather()` palauttaa `{ temp, code, day, weatherDesc }` — laajennetaan parametreilla, ei muuteta paluuarvoa

### Integration Points
- `Etusivu.tsx` → `/api/saasuositus` — `kaupunki`-parametri lisätään sekä GET-urliin että POST-bodyyn
- `lib/constants.ts` → `lib/geo.ts` ja `app/api/saasuositus/route.ts` — molemmat importoivat `SUOMI_KAUPUNGIT`

</code_context>

<specifics>
## Specific Ideas

### SUOMI_KAUPUNGIT rakenne (lib/constants.ts)
```ts
export const SUOMI_KAUPUNGIT: { nimi: string; lat: number; lng: number }[] = [
  { nimi: 'Helsinki',      lat: 60.1699, lng: 24.9384 },
  { nimi: 'Espoo',         lat: 60.2052, lng: 24.6522 },
  { nimi: 'Tampere',       lat: 61.4978, lng: 23.7610 },
  { nimi: 'Vantaa',        lat: 60.2941, lng: 25.0378 },
  { nimi: 'Oulu',          lat: 65.0121, lng: 25.4651 },
  { nimi: 'Turku',         lat: 60.4518, lng: 22.2666 },
  { nimi: 'Jyväskylä',     lat: 62.2426, lng: 25.7473 },
  { nimi: 'Lahti',         lat: 60.9827, lng: 25.6612 },
  { nimi: 'Kuopio',        lat: 62.8924, lng: 27.6780 },
  { nimi: 'Pori',          lat: 61.4851, lng: 21.7975 },
  { nimi: 'Joensuu',       lat: 62.6010, lng: 29.7636 },
  { nimi: 'Lappeenranta',  lat: 61.0587, lng: 28.1870 },
  { nimi: 'Hämeenlinna',   lat: 60.9960, lng: 24.4641 },
  { nimi: 'Vaasa',         lat: 63.0960, lng: 21.6158 },
  { nimi: 'Seinäjoki',     lat: 62.7900, lng: 22.8400 },
  { nimi: 'Rovaniemi',     lat: 66.5039, lng: 25.7294 },
  { nimi: 'Mikkeli',       lat: 61.6882, lng: 27.2752 },
  { nimi: 'Kotka',         lat: 60.4660, lng: 26.9458 },
  { nimi: 'Salo',          lat: 60.3845, lng: 23.1294 },
  { nimi: 'Porvoo',        lat: 60.3923, lng: 25.6650 },
  { nimi: 'Kokkola',       lat: 63.8376, lng: 23.1307 },
  { nimi: 'Hyvinkää',      lat: 60.6290, lng: 24.8603 },
  { nimi: 'Lohja',         lat: 60.2490, lng: 24.0650 },
  { nimi: 'Rauma',         lat: 61.1281, lng: 21.5115 },
  { nimi: 'Kouvola',       lat: 60.8684, lng: 26.7042 },
]
```

### nearestKaupunki (lib/geo.ts)
```ts
export function nearestKaupunki(lat: number, lng: number): string {
  let best = SUOMI_KAUPUNGIT[0]
  let bestDist = Infinity
  for (const city of SUOMI_KAUPUNGIT) {
    const d = haversineKm(lat, lng, city.lat, city.lng)
    if (d < bestDist) { bestDist = d; best = city }
  }
  return best.nimi
}
```

### Sync URL esimerkkejä
```
GET /api/admin/sync-paikat?kaupunki=Helsinki
GET /api/admin/sync-paikat?kaupunki=Turku
GET /api/admin/sync-paikat  (fallback → Tampere)
```

</specifics>

<deferred>
## Deferred Ideas

- Muiden kaupunkien (Oulu, Jyväskylä jne.) synkronointi tietokantaan — infra tukee, mutta ei Phase 10 scopessa
- Kartan automaattinen panning kun kaupunkifiltteriä vaihdetaan listanäkymässä
- Kaupunki-tietoinen suosikkisuodatus (suosikit per kaupunki)

</deferred>

---

*Phase: 10-city-expansion*
*Context gathered: 2026-05-27*
