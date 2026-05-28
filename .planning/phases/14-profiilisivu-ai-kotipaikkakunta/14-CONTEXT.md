# Phase 14: Profiilisivu & AI-kotipaikkakunta - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 toteuttaa `/profiili`-sivun kirjautuneille käyttäjille (sähköposti + kotipaikkakunta-tekstikenttä), luo `profiles`-Supabase-taulun kotikaupunkitiedolle, laajentaa `/api/saasuositus`-reitin ottamaan kotikaupunkikontekstin huomioon AI-promptissa, ja lisää Profiili-linkin NavBar-hamburger-dropdowniin. Phase riippuu Phase 11:stä — voidaan ajaa rinnakkain Phase 12:n ja 13:n kanssa.

</domain>

<decisions>
## Implementation Decisions

### Profiles-taulun kirjoitusarkkitehtuuri
- **D-01:** Kotikaupunki-upsert toteutetaan **browser client + RLS** — sama arkkitehtuuri kuin `suosikit`-taulussa. Ei uutta Route Handleria. RLS-politiikka pakottaa `auth.uid() = user_id`.
- **D-02:** Minimaalinen schema: `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `kotikaupunki text`, `updated_at timestamptz DEFAULT now()`. Ei muita kenttiä tässä vaiheessa.
- **D-03:** Profiles-rivi luodaan **upsert save-painikkeella** — ei DB-triggeriä rekisteröinnissä. Jos käyttäjä ei ole koskaan tallentanut kotikaupunkia, taulua ei rivejä kyseiselle käyttäjälle.
- **D-04:** Tallennuksen onnistuminen näytetään **inline-tekstinä** kortin sisällä ("Kotikaupunki tallennettu"), joka häipyy 2–3 sekunnissa. Ei toast-kirjastoa.

### Kotikaupunki → AI-widget
- **D-05:** Kotikaupunki ladataan **Etusivussa** `subscribeToAuthUser`-callbackissa kirjautumisen yhteydessä — samaan aikaan kuin suosikit-haku. Tallennetaan `useState<string>('')`-tilaan Etusivussa.
- **D-06:** **Kirjautunut käyttäjä lähettää aina POST** `/api/saasuositus`:lle (myös ilman suosikkeja tai kotikaupunkia). GET-kutsu on vain anonyymille käyttäjälle. Tämä korvaa nykyisen logiikan (POST vain kun suosikitIds.size > 0).
- **D-07:** POST body laajenee: `{ suosikit: string[], kaupunki: string, kotikaupunki?: string }`. `kotikaupunki` jätetään pois tai asetetaan `undefined`:ksi jos ei asetettu.
- **D-08:** Route Handler jättää kotikaupunkikontekstin **kokonaan pois promptista** jos `kotikaupunki` on tyhjä tai puuttuu body:stä.

### Navigointi /profiiliin
- **D-09:** **NavBar hamburger-dropdown** saa "Profiili"-linkin — näkyy **kaikille** (kirjautumaton näkee kirjautumis-CTA:n profiilisivulla, kuten suosikit-sivulla).
- **D-10:** "Profiili"-linkki sijoitetaan **Suosikit-linkin yläpuolelle** dropdownissa.

### AI-promptin kotikaupunkikonteksti
- **D-11:** Cache-avain **ei sisällä kotikaupunkia** — päivävaihdos invalidoi cache:n. Kotikaupungin muutos näkyy AI-suosituksessa seuraavana päivänä.
- **D-12:** Kotikaupunkikonteksti lisätään promptiin **vain reissussa-skenaariossa** (kotikaupunki != nykyinen kaupunki). Jos käyttäjä on kotikaupungissaan, ei lisäkontekstia. Claude päättää sanamuodon (ei eksplisiittistä "reissussa"-tekstiä käyttäjälle).

### Claude's Discretion
- Route Handler -prompting: miten muotoillaan reissussa-konteksti (esim. "Käyttäjä vierailee X:ssä — hänen kotikaupunkinsa on Y")
- ProfiiliClient-komponentin visuaalinen layout — noudattaa `.glass`-kortti-rakennetta (kuten SuosikitClient)
- Etusivun kotikaupunki-staten tarkka nimi ja missä kohtaa subscribeToAuthUser-callbackia haku tehdään

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities (`.glass`, `.glass-btn`), color system, typography (4 sizes, 2 weights), animation principles, Finnish UI vocabulary, Tailwind v3

### Requirements
- `.planning/REQUIREMENTS.md` §AUTH-04 — profiilisivu: sähköposti + kotipaikkakunta tekstikenttä, tallentuu Supabaseen
- `.planning/REQUIREMENTS.md` §AI-05 — kotikaupunki profiiliin; AI-prompt saa kotikaupunki + sijaintikaupunki kontekstin
- `.planning/ROADMAP.md` §Phase 14 — success criteria (3 must be TRUE)

### Key files to modify
- `app/components/NavBar.tsx` — hamburger-dropdown rakenne; lisätään Profiili-linkki Suosikit-linkin yläpuolelle
- `app/components/Etusivu.tsx` — subscribeToAuthUser-callback (lisätään profiles-haku); POST vs. GET -logiikka (aina POST kirjautuneena); kotikaupunki-state
- `app/api/saasuositus/route.ts` — POST handler laajenee ottamaan `kotikaupunki`-parametrin; prompt-logiikka reissussa-kontekstille

### Reference patterns (read before implementing)
- `app/suosikit/SuosikitClient.tsx` — **tärkein referenssimalli**: authState-kone ('loading' | 'unauthenticated' | 'authenticated'), subscribeToAuthUser-käyttö, kirjautumis-CTA-layout
- `supabase/migrations/20260523_suosikit.sql` — referenssi RLS-migraatiolle (politiikkojen rakenne user_id-pohjaiselle tauluille)
- `lib/supabaseSSR.ts` — createBrowserSupabase(), subscribeToAuthUser() — auth-singleton-pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `subscribeToAuthUser(cb)` — kutsuu `cb` heti nykyisellä auth-tilalla + muutosten yhteydessä. Palauttaa unsubscribe-funktion. Käytetään ProfiiliClientissa samoin kuin SuosikitClientissa.
- `createBrowserSupabase()` — singleton browser-client. Käytetään profiles-lukuun ja -upsertiin.
- `SuosikitClient.tsx` `authState`-kone (`'loading' | 'unauthenticated' | 'authenticated'`) — kopioi suoraan ProfiiliClientiin.
- NavBar hamburger-dropdown rakenne — lisätään yksi `<Link href="/profiili">` Suosikit-linkin yläpuolelle.

### Established Patterns
- **Page pattern**: `app/profiili/page.tsx` (thin server shell, `NavPill` wrapper) + `app/profiili/ProfiiliClient.tsx` (`'use client'`). Sama kuin `/suosikit`.
- **RLS migration**: `supabase/migrations/{timestamp}_profiles.sql` — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + SELECT/INSERT/UPDATE -politiikat `auth.uid() = user_id` -ehdolla.
- **Inline success feedback**: yksinkertainen `useState<boolean>` → teksti näkyy kun `saved === true`, häipyy `setTimeout(2500)`:lla.
- **AI widget POST**: nykyinen `suosikitIds.size > 0` -ehto → muutetaan `user !== null` -ehdoksi.

### Integration Points
- `Etusivu.tsx` subscribeToAuthUser-callback (rivi ~225): profiles-haku lisätään suosikit-haun rinnalle. Uusi tila: `const [kotikaupunki, setKotikaupunki] = useState<string>('')`.
- `Etusivu.tsx` AI-fetch logiikka (rivi ~267): `suosikitIds.size > 0` → `user !== null`; POST body laajenee kotikaupunki-kentällä.
- `/api/saasuositus` POST handler: `body.kotikaupunki?: string` — lisätään prompt-logiikka reissussa-kontekstille (`kotikaupunki && kotikaupunki !== kaupunki`).
- NavBar hamburger-dropdown: tarkka sijainti tulee lukemalla `app/components/NavBar.tsx`.

</code_context>

<specifics>
## Specific Ideas

- NavBar dropdown -järjestys: Profiili → Suosikit (→ muut linkit)
- AI-prompt reissussa: konteksti lisätään vain kun `kotikaupunki && kotikaupunki.trim() !== kaupunki.trim()` — case-insensitive vertailu turvallisempaa
- Profiilisivu: "Profiili"-otsikko (`font-serif text-2xl font-bold`) + sähköposti-rivi (muted) + `.glass` -kortti kotikaupunki-kentälle + tallenna-nappi + inline success
- Cache-avain pysyy: `saasuositus-${date}-(suosikitIds.size > 0 ? '-' + suosikitIds.size : '')`

</specifics>

<deferred>
## Deferred Ideas

- Laaja käyttäjäprofiili (display_name, bio, profiilikuva) — v2.0
- Kirjaudu ulos -nappi profiilisivulla — ei ole Phase 14:n scope; käyttäjä voi kirjautua ulos NavBar-modaalin kautta
- Kotikaupunki-autocomplete (SUOMI_KAUPUNGIT-lista ehdotuksina) — voidaan lisätä myöhemmin, free text riittää nyt

</deferred>

---

*Phase: 14-profiilisivu-ai-kotipaikkakunta*
*Context gathered: 2026-05-28*
