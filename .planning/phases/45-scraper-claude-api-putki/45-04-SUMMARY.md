---
phase: 45-scraper-claude-api-putki
plan: "04"
subsystem: api
tags: [nextjs, route-handler, vercel-functions, waitUntil, supabase, ssrf, jwt]

# Dependency graph
requires:
  - phase: 45-scraper-claude-api-putki
    plan: "03"
    provides: "lib/branding/analyzer.ts (analyzeWithClaude), lib/branding/storage.ts (uploadLogo), lib/branding/scraper.ts (scrapeWebsite)"
provides:
  - "POST /api/business/analyze-website — triggers fire-and-forget scraper+Claude pipeline"
  - "GET /api/business/analyze-website — polls business_branding row status"
  - "runAnalysis background function: scrapeWebsite → analyzeWithClaude(logoBuffers) → uploadLogo → UPSERT"
affects:
  - phase-46 (consumes GET endpoint and raw_analysis jsonb for prices/opening_hours)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "waitUntil fire-and-forget: POST returns {ok:true} immediately; background function runs after response"
    - "SSRF guard: protocol whitelist + hostname blocklist before any external fetch"
    - "Status machine: 'analyzing' (before waitUntil) → 'analyzed' or 'failed' (in runAnalysis)"
    - "GET polling: maybeSingle() + data ?? {status:'pending'} pattern"

key-files:
  created:
    - app/api/business/analyze-website/route.ts
  modified: []

key-decisions:
  - "export const runtime = 'nodejs' required for sharp (Edge Runtime incompatible with native binaries)"
  - "analyzeWithClaude receives logoBuffers (Buffer[]) not logoUrls — matches Plan 03 interface"
  - "raw_analysis stores full BrandingAnalysisResult so Phase 46 can read prices+opening_hours without extra columns"
  - "Vercel Hobby 10s waitUntil timeout documented as accepted limitation — status stays 'analyzing' on timeout"
  - "runAnalysis NOT exported — module-internal only, only reachable via waitUntil"

patterns-established:
  - "Pattern: waitUntil(runAnalysis(url, user.id)) — fire-and-forget with immediate {ok:true} response"
  - "Pattern: SSRF guard before any external HTTP call — protocol + hostname checks in POST handler"

requirements-completed:
  - SCRAP-01
  - SCRAP-02
  - SCRAP-03
  - SCRAP-04
  - SCRAP-05

# Metrics
duration: 15min
completed: 2026-06-15
---

# Phase 45 Plan 04: analyze-website Route Handler Summary

**POST/GET Route Handler toteuttaa koko branding-putken: waitUntil-pohjainen fire-and-forget (scrapeWebsite → analyzeWithClaude(logoBuffers) → uploadLogo → UPSERT) ja GET-statuskysely {status:'pending'} fallbackilla**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-15T17:40:00Z
- **Completed:** 2026-06-15T17:55:00Z
- **Tasks:** 1 of 2 auto-completed (Task 2 = human-verify checkpoint)
- **Files modified:** 1

## Accomplishments
- `app/api/business/analyze-website/route.ts` luotu: POST + GET handler + `runAnalysis` sisäinen funktio
- SSRF-suojaus: protokollavalidointi + yksityisten IP-osoitteiden esto (localhost, 127.0.0.1, ::1, 192.168.*, 10.*, 169.254.169.254)
- `waitUntil(runAnalysis(...))` fire-and-forget -patterni: POST palaa `{ok:true}` heti, putki jatkuu taustalla
- Status machine: `'analyzing'` (ennen waitUntilia) → `'analyzed'` tai `'failed'` (runAnalysis:ssa)
- `raw_analysis: result` tallentaa koko `BrandingAnalysisResult`-olion (sisältää `prices` ja `opening_hours`) Faasi 46:ta varten
- GET handler: `.maybeSingle()` + `data ?? { status: 'pending' }` — palauttaa pending-tilan kun riviä ei ole
- TypeScript: ei virheitä (`npx tsc --noEmit`)
- Testit: 131/131 vihreää (`npx vitest run`)

## Task Commits

1. **Task 1: Create app/api/business/analyze-website/route.ts** - `b30332d` (feat)
2. **Task 2: Human-verify checkpoint** - ei commitia (odottaa manuaalista testausta)

**Plan metadata:** (lisätään orchestratorin toimesta)

## Files Created/Modified
- `app/api/business/analyze-website/route.ts` — POST (trigger) + GET (status poll) + `runAnalysis` (background pipeline)

## Decisions Made
- `export const runtime = 'nodejs'` vaaditaan koska sharp on Node.js-natiivi binääri — Edge Runtime ei tue sitä
- `analyzeWithClaude` saa `logoBuffers` (Buffer[]) eikä `logoUrls` — vastaa Plan 03:n toteutusta
- `raw_analysis` tallentaa koko `BrandingAnalysisResult`-olion niin että Faasi 46 voi lukea `prices` ja `opening_hours` suoraan ilman lisäkolumneja
- Vercel Hobby -tierin 10 sekunnin `waitUntil`-timeout dokumentoitu koodikommenttina hyväksyttynä rajoituksena

## Deviations from Plan

None — suunnitelma toteutettiin täsmälleen kirjoitetun mukaisesti.

## Issues Encountered

None.

## Human Verification Checkpoint (Task 2)

**Tila:** Odottaa manuaalista testausta

### Esiehdot

1. `ANTHROPIC_API_KEY` pitää olla asetettu `.env.local`:ssa
2. Aja kehityspalvelin: `npm run dev`
3. Tarvitset validi JWT-tokenin liiketoimintatililtä (business account). Hanki se kirjautumalla sisään sovelluksen kautta ja kopioimalla Authorization Bearer -token selaimen DevToolsista tai Supabase-sessionista.

### Testausvaiheet

**Aseta muuttuja:** Korvaa `<valid-business-JWT>` oikealla tokenilla kaikissa curl-komennoissa.

**Vaihe 1 — SSRF-suojaus (odotettu: 400):**
```bash
curl -s -X POST http://localhost:3000/api/business/analyze-website \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-business-JWT>" \
  -d '{"url":"http://169.254.169.254/metadata"}'
```
Odotettu vastaus: `{"error":"Private addresses not allowed"}`

**Vaihe 2 — Analyysin käynnistys (odotettu: {ok:true} alle 1 sekunnissa):**
```bash
curl -s -X POST http://localhost:3000/api/business/analyze-website \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-business-JWT>" \
  -d '{"url":"https://www.liikuntakeskus.fi"}'
```
Odotettu vastaus: `{"ok":true}` — palautuu välittömästi (fire-and-forget)

**Vaihe 3 — Statuskysely heti (odotettu: 'analyzing'):**
```bash
curl -s http://localhost:3000/api/business/analyze-website \
  -H "Authorization: Bearer <valid-business-JWT>"
```
Odotettu vastaus: `{"status":"analyzing",...}`

**Vaihe 4 — Statuskysely 30 sekunnin jälkeen (odotettu: 'analyzed' tai 'failed'):**
```bash
curl -s http://localhost:3000/api/business/analyze-website \
  -H "Authorization: Bearer <valid-business-JWT>"
```
Odotettu vastaus (onnistuminen):
```json
{
  "status": "analyzed",
  "logo_url": "https://...supabase.co/storage/...",
  "colors": ["#...", ...],
  "logo_type": "wordmark",
  "raw_analysis": {
    "logo_index": 0,
    "prices": [...],
    "opening_hours": [...],
    "website_url": "https://..."
  },
  "analyzed_at": "..."
}
```
Tarkista että `raw_analysis` sisältää `prices`- ja `opening_hours`-avaimet (voivat olla tyhjiä taulukoita).

TAI virhetilassa: `{"status":"failed","error_message":"..."}`

**Vaihe 5 — Supabase-dashboard:**
Avaa Supabase → Table Editor → `business_branding`. Tarkista että rivi on olemassa `business_account_id`-kentällä:
- `status` = `'analyzed'` (tai `'failed'`)
- `logo_url` = URL joka osoittaa `business-media`-storageen
- `website_url` = täytetty (tai tyhjä merkkijono)
- `raw_analysis` = JSONB-objekti jossa `prices` ja `opening_hours`

**Vaihe 6 — Valtuuttamaton pääsy (odotettu: 401):**
```bash
curl -s -X POST http://localhost:3000/api/business/analyze-website \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```
Odotettu vastaus: `{"error":"Unauthorized"}`

### Hyväksymissignaali

Kun kaikki vaiheet on testattu, kirjoita vastauksesi:
- **"approved"** — kaikki vaiheet läpäisivät
- **Kuvaus epäonnistumisesta** — sisällytä curl-tuloste ja mikä meni pieleen

## Threat Surface Scan

Tiedosto `app/api/business/analyze-website/route.ts` luo uuden verkkopalvelupisteen (POST + GET endpoints). Kaikki uhkat on käsitelty suunnitelman `<threat_model>`-osiossa:
- T-45-04-SSRF: SSRF-suojaus toteutettu (protokolla + hostname-esto)
- T-45-04-01: JWT-autentikaatio molemmissa handlereissa
- T-45-04-02: UPSERT käyttää `user.id` JWT:stä — käyttäjä voi kirjoittaa vain omalle rivilleen
- T-45-04-03: AbortSignal.timeout scraper.ts:ssä (10s HTML, 5s CSS/logo)
- T-45-04-04: GET-handler vaatii JWT:n — vain oma business_branding-rivi näkyy

Ei uusia uhkia jotka eivät olisi suunnitelmassa.

## Next Phase Readiness

Faasi 46 voi nyt:
- Kutsua `POST /api/business/analyze-website` käynnistääkseen analyysin
- Pollata `GET /api/business/analyze-website` statuksen seuraamista varten
- Lukea `raw_analysis.prices` ja `raw_analysis.opening_hours` ilman lisätietokantakyselyjä

Hyväksytyn human-verify-checkpointin jälkeen Faasi 46 voidaan aloittaa.

---
*Phase: 45-scraper-claude-api-putki*
*Completed: 2026-06-15*
