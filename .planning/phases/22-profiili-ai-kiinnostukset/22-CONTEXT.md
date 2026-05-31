# Phase 22: Profiili & AI-kiinnostukset - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 22 lisää kirjautuneelle käyttäjälle mahdollisuuden valita lajikiinnostukset (monivalinta `lib/lajit.ts`-lajeista) `/profiili`-sivulle, tallentaa ne Supabaseen `profiles`-tauluun, ja lähettää ne `/api/saasuositus` POST-pyyntöön jossa ne huomioidaan AI-promptissa. Riippuu Phase 21:stä (v1.4 complete).

</domain>

<decisions>
## Implementation Decisions

### Kiinnostus-UI (/profiili)
- **D-01:** Lajikiinnostukset esitetään **neutraaleina mustina pillinä** — ei sport-värejä, ei lajit.ts-värejä profiilisivulla. Yhteneväinen glassmorphism-design systeemi (sama kuin filter-pill toolbarissa).
- **D-02:** Kiinnostukset sijoitetaan **omaan `.glass rounded-2xl` -korttiin** kotikaupunki-kortin alapuolelle. Oma otsikko ("Kiinnostuksen kohteet", label-tyyli: `text-[10px] font-bold uppercase tracking-widest`).
- **D-03:** Kaikki 9 lajia `lib/lajit.ts`:stä (padel, tennis, jooga, kuntosali, uinti, kiipeily, jääkiekko, liikuntahalli, liikunta) esitetään pilleinä `flex-wrap`-layoutissa.

### Tallenna-nappi
- **D-04:** Kiinnostukset-kortilla on **oma "Tallenna"-nappi** (`handleSaveKiinnostukset`) — kotikaupunki-kortti tallentaa erikseen (`handleSaveKotikaupunki`). Kumpikin tekee oman profiles-upsertin eri kentillä.
- **D-05:** Tallennusonnistuminen näytetään **inline-tekstinä** kiinnostukset-kortin sisällä ("Kiinnostukset tallennettu"), häipyy 2,5 sekunnissa. Sama pattern kuin kotikaupungin tallennuspalautteessa.
- **D-06:** `handleSaveKiinnostukset` upsertaa `{ user_id, kiinnostukset: string[], updated_at }` — `onConflict: 'user_id'` kuten kotikaupungillakin.

### Supabase-schema
- **D-07:** `profiles`-tauluun lisätään `kiinnostukset text[]` -sarake **uudella migraatiotiedostolla** (`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kiinnostukset text[] DEFAULT '{}'`). Ei muutoksia olemassa olevaan `kotikaupunki`-kenttään eikä RLS-politiikkoihin (UPDATE-politiikka kattaa jo kaikki profiilin kentät).
- **D-08:** `ProfiiliClient.tsx`:n `loadProfile`-haussa lisätään `kiinnostukset` select-kenttään: `.select('kotikaupunki, kiinnostukset')`. Jos rivi puuttuu tai `kiinnostukset` on null, käytetään `[]` oletuksena.

### AI-konteksti
- **D-09:** Luodaan `lib/buildKiinnostuksetKonteksti.ts` — sama pattern kuin `buildReissuKonteksti`. Funktio palauttaa `''` jos kiinnostukset on tyhjä array, muuten lisää kontekstin promptiin.
- **D-10:** Kiinnostukset lähetetään POST-bodyssa `kiinnostukset: string[]`-kentässä (`kotikaupunki`-kentän kaltaisesti). Etusivu.tsx lataa ne `subscribeToAuthUser`-callbackissa profiles-haun yhteydessä (`kotikaupunki`-haun rinnalla), tallentaa `useState<string[]>([])`-tilaan.
- **D-11:** Route Handler laajenee: `body.kiinnostukset?: string[]` — sanitoitaan (slice(10), jokainen string filter+map kuten suosikit), lisätään `kiinnostuksetKonteksti` promptiin `reissuKonteksti`-lohkon jälkeen.
- **D-12:** Promptin rakenne (POST): `...sääkuvaus...${suosikkiLista}${reissuKonteksti}${kiinnostuksetKonteksti}`.
- **D-13:** **Cache-avain ei muutu** — päiväkohtainen, ei kiinnostusperustainen. Kiinnostusten muutos näkyy seuraavana päivänä (sama politiikka kuin kotikaupungilla).

### Claude's Discretion
- Pillin valittu/valitsematon tila — esim. `bg-[#111111] text-white` vs. `border border-[rgba(0,0,0,0.12)] text-[#111111]`; Claude valitsee mikä toimii visuaalisesti `.glass`-kortissa
- Täsmällinen suomenkielinen muotoilu `buildKiinnostuksetKonteksti`-funktion palauttamassa tekstissä (esim. "Käyttäjä on kiinnostunut lajeista: padel, tennis.")
- Pillien tarkka koko (padding, font-size) — noudata CLAUDE.md:n 4-size/2-weight-sääntöä

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities (`.glass`, `.glass-btn`), color system, typography (4 sizes, 2 weights), animation principles, Finnish UI vocabulary, Tailwind v3

### Requirements
- `.planning/REQUIREMENTS.md` §PROFILE-01, PROFILE-02 — vaatimusten tarkka teksti ja success criteria
- `.planning/ROADMAP.md` §Phase 22 — success criteria (3 must be TRUE)

### Key files to modify
- `app/profiili/ProfiiliClient.tsx` — lisätään kiinnostukset-kortti, handleSaveKiinnostukset, loadProfile-query laajenee
- `app/components/Etusivu.tsx` — subscribeToAuthUser-callback: kiinnostukset-haku rinnalle; POST body laajenee `kiinnostukset`-kentällä
- `app/api/saasuositus/route.ts` — POST handler: `kiinnostukset?: string[]` body-kentäksi; buildKiinnostuksetKonteksti promptiin
- `lib/buildKiinnostuksetKonteksti.ts` — **uusi** tiedosto, sama pattern kuin buildReissuKonteksti

### Database
- `supabase/migrations/20260528083110_profiles.sql` — nykyinen schema (kotikaupunki); uusi migraatio ADD COLUMN kiinnostukset text[]
- RLS-politiikat kattavat jo UPDATE kaikille kentille — **ei tarvita uusia politiikkoja**

### Reference patterns (read before implementing)
- `lib/buildReissuKonteksti.ts` — **tärkein referenssimalli** buildKiinnostuksetKonteksti:lle
- `app/profiili/ProfiiliClient.tsx` — olemassa oleva handleSave + inline-palaute + loadProfile-pattern
- `lib/lajit.ts` — lajien avaimet (padel, tennis, jooga, kuntosali, uinti, kiipeily, jääkiekko, liikuntahalli, liikunta) ja LAJIT_FILTTERI-lista

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProfiiliClient.tsx` `handleSave` + inline-palaute (`saved`-state, setTimeout 2500ms) — kopioi/laajenna `handleSaveKiinnostukset`:iin
- `createBrowserSupabase()` — profiles-luku ja upsert
- `subscribeToAuthUser(cb)` — Etusivu.tsx:ssä jo käytössä; kiinnostukset ladataan samassa profiles-haussa kuin kotikaupunki
- `lib/lajit.ts` `lajiKonfig` — avaimet pillien renderöintiin; `Object.keys(lajiKonfig)` antaa kaikkien lajien lista
- `lib/buildReissuKonteksti.ts` — 1:1 kopiomalli uudelle buildKiinnostuksetKonteksti-funktiolle

### Established Patterns
- **Profiles upsert**: `supabase.from('profiles').upsert({ user_id, ...fields, updated_at }, { onConflict: 'user_id' })` — sama pattern uudelle kentälle
- **POST body sanitointi** (`route.ts`): array.slice(10).filter(string).map(replace regex) — käytä samaa kiinnostuksille kuin suosikeille
- **Inline success feedback**: `setSaved(true)` → teksti → `setTimeout(() => setSaved(false), 2500)` — copy-paste kotikaupunki-logiikasta
- **AI prompt ketju**: `${suosikkiLista}${reissuKonteksti}` → laajenee `${kiinnostuksetKonteksti}`:llä

### Integration Points
- `Etusivu.tsx` subscribeToAuthUser-callback (rivi ~225): lisätään `kiinnostukset`-kenttä profiles-hakuun rinnalle; uusi tila `const [kiinnostukset, setKiinnostukset] = useState<string[]>([])`
- `Etusivu.tsx` AI-fetch (POST body, rivi ~267): lisätään `kiinnostukset`-kenttä
- `/api/saasuositus` POST handler: lisätään `body.kiinnostukset` sanitointi + `buildKiinnostuksetKonteksti`-kutsu

</code_context>

<specifics>
## Specific Ideas

- Pillirakenne per laji: `<button onClick={() => toggleKiinnostus(key)}>laji.label</button>` — `toggleKiinnostus` lisää/poistaa key:n `selectedKiinnostukset`-arraystä
- Kiinnostukset-kortin layout: `.glass rounded-2xl p-4 flex flex-col gap-3` (sama kuin kotikaupunki-kortti)
- Pillien flex-wrap: `flex flex-wrap gap-2` sisäkontaineriin
- buildKiinnostuksetKonteksti palauttaa esim. `" Käyttäjä on kiinnostunut lajeista: padel, tennis."` (johtava välilyönti kuten buildReissuKonteksti)

</specifics>

<deferred>
## Deferred Ideas

- Kiinnostuskohteiden push-notifikaatiot — ei ilmoitusjärjestelmää (v1.4 out of scope)
- Kiinnostusten vahvempi ohjaus (esim. suodattaa paikat kiinnostuksen mukaan) — eri phase
- Sport-väriset pillit profiilisivulla — käyttäjä valitsi neutraalin tyylin

</deferred>

---

*Phase: 22-profiili-ai-kiinnostukset*
*Context gathered: 2026-05-31*
