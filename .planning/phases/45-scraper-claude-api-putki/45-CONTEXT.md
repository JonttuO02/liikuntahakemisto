# Phase 45: Scraper & Claude API -putki - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Palvelinpuolen pipeline: `POST /api/business/analyze-website` ottaa URL:n, hakee HTML:n `fetch`:llä, poimii CSS-värit ja logo-kandidaatit, muuntaa kuvat PNG:ksi `sharp`:lla, kutsuu Claude API:a (yksi kutsu), tallentaa tuloksen `business_branding`-tauluun ja logon Supabase Storageen. Kutsu on asynkroninen (`waitUntil`) — route palauttaa `{ok:true}` välittömästi ja pipeline jatkuu taustalla. Phase 46 pollaa statusta.

</domain>

<decisions>
## Implementation Decisions

### Logo URL persistence
- **D-01:** Valittu logo ladataan Supabase Storageen. Storage URL tallennetaan `business_branding.logo_url`-kenttään (ei source URL, ei base64).
- **D-02:** Phase 45 luo `business-media`-bucketin Supabase-migraatiolla (julkinen bucket, logoille ei RLS-tarvetta — ne ovat julkisia kuvia). Polku: `branding/{business_account_id}/logo.png`.
- **D-03:** Server-side upload: `supabaseAdmin.storage.from('business-media').upload(path, buffer, { contentType: 'image/png', upsert: true })`. Julkinen URL haetaan `.getPublicUrl(path)`.

### Request/response pattern
- **D-04:** Async fire-and-forget `waitUntil`-mallilla. Route asettaa `status = 'analyzing'` ja palauttaa `{ok: true}` heti. Pipeline jatkuu `waitUntil(runAnalysis(...))`:ssa.
- **D-05:** `import { waitUntil } from '@vercel/functions'` — lisätään `@vercel/functions`-paketti. Turvallinen Vercel-ympäristössä, ei Vercel-timeout-ongelmaa.
- **D-06:** Phase 45 luo myös `GET /api/business/analyze-website` -endpointin joka palauttaa `business_branding`-rivin nykyisen statuksen (`{status, logo_url, colors, raw_analysis, error_message}`). Phase 46 pollaa tätä.

### Claude model & SDK
- **D-07:** Malli: `claude-haiku-4-5-20251001` (nopein, halvin, vision-laatu riittää logo-tunnistukseen ja hex-värianalyysiin).
- **D-08:** SDK: `@anthropic-ai/sdk` (npm install). Ei raw fetch — tyypitetty SDK helpottaa vision content array -rakennetta.
- **D-09:** `max_tokens: 1024`. Lämpötila: default (ei aseta temperature-parametria — Haiku defaulti on fine).
- **D-10:** Kuvien esikäsittely `sharp`:lla: resize max 512px suurimman ulottuvuuden mukaan, konvertoi PNG:ksi. Max 5 logo-kandidaattia Claude-kutsuun (enemmän ei paranna tulosta, lisää vain tokeneita).

### Scraper-logiikka (fetch-pohjainen)
- **D-11:** HTML-haku: `fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ...' }, signal: AbortSignal.timeout(10000) })`. 10s timeout per haku.
- **D-12:** CSS-värianalyysi: poimitaan `<meta name="theme-color">` ja `<link rel="stylesheet">` -tiedostoista `:root`-muuttujat. Max 3 ulkoista CSS-tiedostoa noudetaan rinnakkain `Promise.all`:lla, 5s timeout per CSS-tiedosto.
- **D-13:** Logo-kandidaatit järjestyksessä: 1) `<link rel="icon">` / `/favicon.ico`, 2) `og:image`, 3) `<img>`-elementit joiden src/alt/class sisältää "logo" (case-insensitive). Max 5 kandidaattia.
- **D-14:** Virheenkäsittely: jos URL ei vastaa tai antaa >= 400, asetetaan `status = 'failed'` ja `error_message = 'Sivua ei saatu ladattua: {url}'`. Claude-virhe → `status = 'failed'`, `error_message = virhe.message`.

### Tietokanta-kirjoitukset
- **D-15:** UPSERT `business_branding` `business_account_id`-avaimella: `supabaseAdmin.from('business_branding').upsert({...}, { onConflict: 'business_account_id' })`.
- **D-16:** Status-kone: `pending` (initial/idle) → `analyzing` (pipeline käynnissä) → `analyzed` (valmis) / `failed` (virhe). `updated_at = new Date().toISOString()` asetetaan joka kirjoituksessa (WR-01 code review finding — ei triggeriä, tehdään manuaalisesti).

### Supabase Storage bucket
- **D-17:** Migraatio luo `business-media`-bucketin: `INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', true)`. Jos bucket on jo olemassa (manual creation), `INSERT ... ON CONFLICT DO NOTHING`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimusmäärittely
- `.planning/REQUIREMENTS.md` §SCRAP-01–05 — tarkka vaatimusteksti scraper- ja analyysiputkelle
- `.planning/ROADMAP.md` §"Phase 45: Scraper & Claude API -putki" — success criteria ja phase goal

### Toteutusohje (sovellettavin osin)
- `brandianalyysi-toteutusohje.md` §"Vaihe 2: Scraper-moduuli" ja §"Vaihe 3: Vision-analyysi" — pohjarakenne. **HUOM:** Playwright-osuudet korvattu `fetch`:llä. `businesses`-tauluviittaukset korvattu `business_accounts`-viittauksilla. Storage upload (Vaihe 4) toteutetaan tässä faasin, mutta `business_id` → `business_account_id`.

### Olemassa olevat Route Handlerit (auth-malli)
- `app/api/business/onboarding/submit/route.ts` — JWT-verifikaatio `supabaseAdmin.auth.getUser(token)`, Authorization-header-pattern, virhekäsittely
- `app/api/business/update-paikka/route.ts` — toinen esimerkki samasta auth-mallista

### Tietokantaskeema
- `supabase/migrations/20260615000001_business_branding.sql` — `business_branding`-taulun DDL, kolumnit, RLS

### Claude API
- `@anthropic-ai/sdk` npm-paketti — lisätään Phase 45:ssa. Ympäristömuuttuja: `ANTHROPIC_API_KEY` (server-only, ei NEXT_PUBLIC_-etuliitettä).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabaseAdmin.server.ts` — exportoi `supabaseAdmin` (service role client). Käytetään kaikissa kirjoitusoperaatioissa ja JWT-verifikaatiossa.
- `app/api/business/onboarding/submit/route.ts` — kopioi JWT-verifikaatiolohko suoraan (rivit 11–16).

### Established Patterns
- Auth: `supabaseAdmin.auth.getUser(token)` → `if (authError || !user) return 401`. Kaikki business API -reitit noudattavat tätä.
- UPSERT: `.upsert({...}, { onConflict: 'column' })` — käytetty muissa business-reiteissä.
- Virhekäsittely: `console.error('[route-name] virhe:', err)` + palauta `NextResponse.json({ error }, { status })`.
- **Supabase Storage upload-pattern ei ole olemassa** — Phase 45 luo ensimmäisen `supabaseAdmin.storage`-käytön projektissa.

### Integration Points
- `business_branding`-taulun `status`-kenttä: Phase 46 lukee tätä pollatessaan analyysitulosta.
- `GET /api/business/analyze-website` vastauksen shape: `{ status, logo_url, colors, logo_type, raw_analysis, error_message, analyzed_at }` — Phase 46 käyttää näitä esikatselunäkymässä.
- `@vercel/functions` — uusi paketti, lisätään `package.json`:iin.
- `sharp` — todennäköisesti ei vielä paketti.json:issa. Lisätään.

</code_context>

<specifics>
## Specific Ideas

- Route: `POST /api/business/analyze-website` body: `{ url: string }`
- Response (välitön): `{ ok: true }` (200) tai `{ error: string }` (401/400)
- Status-polling route: `GET /api/business/analyze-website` → `{ status, logo_url, colors, logo_type, error_message }`
- Claude-kutsu rakenteen prototyyppi (SDK):
  ```ts
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        ...logoCandidates.map(b64 => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } })),
        { type: 'text', text: `Analysoi yrityssivu. HTML: ${htmlSnippet}` }
      ]
    }]
  })
  ```
- Tiedostorakenne:
  - `app/api/business/analyze-website/route.ts` — POST + GET handlers
  - `lib/branding/scraper.ts` — `scrapeWebsite(url)` → `{ logoUrls, colors, htmlSnippet }`
  - `lib/branding/analyzer.ts` — `analyzeWithClaude(logoCandidates, htmlSnippet)` → structured result
  - `lib/branding/storage.ts` — `uploadLogo(userId, pngBuffer)` → Storage URL

</specifics>

<deferred>
## Deferred Ideas

- Logo-URL:n vanhentuminen (jos source URL muuttuu): ei relevanttia, koska logo ladataan Storageen (D-01).
- Tulosten manuaalinen muokkaus (värien korjaus, logon vaihto): Phase 46 scope.
- Analyysin uudelleenajo onboarding-jälkeen (edit-flow): deferred post-v2.1.
- CSS-muuttujien syvempi parsinta (nested custom properties): deferred — riittää `theme-color` + `:root`-taso.

</deferred>

---

*Phase: 45-Scraper & Claude API -putki*
*Context gathered: 2026-06-15*
