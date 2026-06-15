# Phase 45: Scraper & Claude API -putki - Research

**Researched:** 2026-06-15
**Domain:** Server-side web scraping, Claude Vision API, Supabase Storage, Vercel async functions, sharp image processing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Logo URL persistence**
- D-01: Valittu logo ladataan Supabase Storageen. Storage URL tallennetaan `business_branding.logo_url`-kenttään.
- D-02: Phase 45 luo `business-media`-bucketin Supabase-migraatiolla (julkinen bucket). Polku: `branding/{business_account_id}/logo.png`.
- D-03: `supabaseAdmin.storage.from('business-media').upload(path, buffer, { contentType: 'image/png', upsert: true })`. Julkinen URL `.getPublicUrl(path)`:lla.

**Request/response pattern**
- D-04: Async fire-and-forget `waitUntil`-mallilla. Route asettaa `status = 'analyzing'` ja palauttaa `{ok: true}` heti.
- D-05: `import { waitUntil } from '@vercel/functions'` — lisätään `@vercel/functions`-paketti.
- D-06: Phase 45 luo myös `GET /api/business/analyze-website` -endpointin joka palauttaa `business_branding`-rivin statuksen.

**Claude model & SDK**
- D-07: Malli: `claude-haiku-4-5-20251001`.
- D-08: SDK: `@anthropic-ai/sdk`.
- D-09: `max_tokens: 1024`, ei temperature-parametria.
- D-10: sharp: resize max 512px suurimman ulottuvuuden mukaan, konvertoi PNG:ksi. Max 5 logo-kandidaattia.

**Scraper-logiikka**
- D-11: `fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ...' }, signal: AbortSignal.timeout(10000) })`.
- D-12: CSS-värianalyysi: `<meta name="theme-color">` + `:root`-muuttujat. Max 3 CSS-tiedostoa rinnakkain, 5s timeout.
- D-13: Logo-kandidaatit: 1) `<link rel="icon">` / `/favicon.ico`, 2) `og:image`, 3) `<img>`-elementit joiden src/alt/class sisältää "logo".
- D-14: Virheenkäsittely: `status = 'failed'`, `error_message`.

**Tietokanta-kirjoitukset**
- D-15: UPSERT `business_branding` `business_account_id`-avaimella.
- D-16: Status-kone: `pending → analyzing → analyzed / failed`. `updated_at` manuaalisesti (ei triggeriä).

**Supabase Storage bucket**
- D-17: `INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', true) ON CONFLICT DO NOTHING`.

### Claude's Discretion
(Ei erillisiä discretion-alueita — kaikki päätökset lukittu)

### Deferred Ideas (OUT OF SCOPE)
- Logo-URL:n vanhentuminen
- Tulosten manuaalinen muokkaus (Phase 46)
- Analyysin uudelleenajo onboarding-jälkeen (post-v2.1)
- CSS-muuttujien syvempi parsinta (nested custom properties)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRAP-01 | Sovellus hakee yrityksen verkkosivun HTML:n palvelinpuolella `fetch`:llä oikealla User-Agent-headerilla | D-11 lukittu; `fetch` + `AbortSignal.timeout(10000)` + Mozilla UA |
| SCRAP-02 | Sovellus poimii brändivärit `<meta name="theme-color">`:stä ja CSS `:root`-muuttujista | D-12 lukittu; regex-pohjainen CSS-parsinta; regex pattern `--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,6})` riittää |
| SCRAP-03 | Sovellus kerää logo-kandidaatit HTML:stä: favicon, og:image, img[src/alt/class*="logo"] | D-13 lukittu; max 5 kandidaattia |
| SCRAP-04 | Yksi Claude API -kutsu analysoi logo-kandidaatit (vision) + HTML-tekstisisällön → JSON | D-07–D-09 lukittu; @anthropic-ai/sdk@0.97.1 jo asennettuna |
| SCRAP-05 | Logo-kandidaatit muunnetaan PNG:ksi `sharp`:lla ennen Claude-kutsua | D-10 lukittu; sharp ei vielä asennettu projektissa |
</phase_requirements>

---

## Summary

Phase 45 rakentaa palvelinpuolen analyysipipelinen kolmesta moduulista: `lib/branding/scraper.ts` (HTML-haku + logo/väri-poimiminen), `lib/branding/analyzer.ts` (Claude API -kutsu), ja `lib/branding/storage.ts` (Supabase Storage -upload), joita orkestroi `app/api/business/analyze-website/route.ts`. Kutsu on `waitUntil`-pohjainen: route palauttaa `{ok:true}` heti asetettuaan `status='analyzing'`, ja pipeline jatkuu taustalla.

Kaikki kriittiset tekniset valinnat on lukittu CONTEXT.md:ssä. Tutkimuksen päätehtäväksi jäi varmistaa, että lukitut valinnat ovat toteutettavissa — ja ne ovat. `@anthropic-ai/sdk` on jo asennettuna (v0.97.1) ja sen multi-image vision API toimii täsmälleen CONTEXT.md:n prototyypissä kuvatulla tavalla. `@vercel/functions waitUntil` toimii Node.js-runtimessa Next.js 14:ssa. `sharp` ei ole asennettuna projektissa mutta on rekisteröity, vanha (2013), ja vakiintunut. Supabase Storage upload API on yksinkertainen (`upload` + `getPublicUrl`). `storage.buckets` INSERT ON CONFLICT DO NOTHING toimii migraatiossa.

Yksi tärkeä löydös: Vercel suosittelee Next.js 14:ssä käyttämään `@vercel/functions waitUntil`:ia — `next/server after()` on vasta Next.js 15.1+:ssa. Koska projekti on Next.js 14.2.35, `@vercel/functions` on oikea ratkaisu (D-05 vahvistettu).

**Primary recommendation:** Rakenna pipeline CONTEXT.md:n prototyypin mukaan. Ainoa lisätyö suhteessa prototyyppiin on `export const runtime = 'nodejs'` route-tiedostossa (pakollinen sharp:lle) ja `next.config.mjs`-muutos sharp-bundlausta varten.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HTML-haku (fetch) | API / Backend (Route Handler) | — | Palvelinpuoli: CORS-ongelma eliminoitu, UA-header toimii |
| CSS-parsinta | API / Backend (lib/branding/scraper.ts) | — | Pure JS, ei DOM-tarvetta |
| Logo-kandidaattien keruu | API / Backend (lib/branding/scraper.ts) | — | Regex/string-parsinta |
| Kuvamuunnos (sharp) | API / Backend (lib/branding/scraper.ts tai analyzer.ts) | — | Node.js-only binary |
| Claude API -kutsu | API / Backend (lib/branding/analyzer.ts) | — | Server-only (API-avain) |
| Supabase Storage upload | API / Backend (lib/branding/storage.ts) | — | Service role key; server-only |
| Status-päivitys DB:hen | API / Backend (route.ts) | — | Service role key; server-only |
| Statuksen pollaus (GET) | API / Backend (route.ts) | Phase 46 client | GET-endpoint, Phase 46 lukee |

---

## Standard Stack

### Core (jo asennettu tai lisättävä)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.97.1 (installed) | Claude API -kutsu, tyypitetty vision content array | Virallinen Anthropic SDK; jo asennettuna |
| `sharp` | 0.35.1 (latest) | Kuvamuunnos PNG:ksi, resize 512px | Ainoa järkevä Node.js-kuvakirjasto; Next.js käyttää samaa itse |
| `@vercel/functions` | 3.7.1 (latest) | `waitUntil` fire-and-forget | Ainoa tapa tehdä waitUntil Next.js 14:ssä (15.1+ käyttäisi `after()`) |

### Existing (käytössä, ei muutoksia)

| Library | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | 2.105.4 | Storage upload, DB-kirjoitukset |
| `lib/supabaseAdmin.server.ts` | — | Service role client |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `sharp` | `@img/sharp-wasm32` | WASM-versio toimii ilman natiivibinääriä mutta on hitaampi ja single-threaded only; ei tarvita Vercel Node.js -ympäristössä |
| `@vercel/functions waitUntil` | `next/server after()` | `after()` on vasta Next.js 15.1+; projekti on 14.2.35, joten ei vaihtoehtoa |
| regex CSS-parsinta | `postcss-custom-properties` | Ylimitoitettu — tarvitaan vain `:root`-hex-arvot |

**Installation:**
```bash
npm install sharp @vercel/functions
```

(`@anthropic-ai/sdk` jo asennettuna)

**Version verification:**
```bash
npm view sharp version        # 0.35.1 [VERIFIED: npm registry]
npm view @vercel/functions version  # 3.7.1 [VERIFIED: npm registry]
npm view @anthropic-ai/sdk version  # 0.104.1 latest; 0.97.1 installed — OK [VERIFIED: npm registry]
```

---

## Package Legitimacy Audit

Kaikki kolme pakettia tarkistettu slopcheck-työkalulla — kaikki saivat `[OK]`.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@anthropic-ai/sdk` | npm | 2023 (3 v.) | github.com/anthropics/anthropic-sdk-typescript | [OK] | Approved |
| `sharp` | npm | 2013 (12 v.) | github.com/lovell/sharp | [OK] | Approved |
| `@vercel/functions` | npm | 2024 (2 v.) | github.com/vercel/vercel (monorepo) | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Postinstall scripts: sharp ei rekisteröi postinstall-scriptiä npm view:ssä. `@anthropic-ai/sdk` ja `@vercel/functions` eivät myöskään. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
POST /api/business/analyze-website
        │
        ▼
[JWT verify: supabaseAdmin.auth.getUser(token)]
        │
        ├── 401 → Unauthorized
        │
        ▼
[Validate body: { url: string }]
        │
        ├── 400 → Bad request
        │
        ▼
[UPSERT business_branding: status='analyzing']
        │
        ▼
[waitUntil(runAnalysis(...))] ──────────────────────────────────────────┐
        │                                                               │
        ▼                                                    (background pipeline)
[Return {ok: true}]                                                     │
                                                           ┌────────────▼────────────┐
                                                           │  scrapeWebsite(url)      │
                                                           │  ├── fetch HTML (10s TO) │
                                                           │  ├── parse theme-color   │
                                                           │  ├── fetch CSS files     │
                                                           │  │   (Promise.all, 5s TO)│
                                                           │  ├── extract :root vars  │
                                                           │  └── collect logoCandidates│
                                                           └──────────┬──────────────┘
                                                                      │
                                                           ┌──────────▼──────────────┐
                                                           │  sharp: resize + PNG     │
                                                           │  (max 5 candidates,      │
                                                           │   max 512px)             │
                                                           └──────────┬──────────────┘
                                                                      │
                                                           ┌──────────▼──────────────┐
                                                           │  analyzeWithClaude()     │
                                                           │  content: [              │
                                                           │    ...images (base64),   │
                                                           │    text: HTML snippet    │
                                                           │  ]                       │
                                                           │  → JSON: logo_index,     │
                                                           │    logo_type, colors     │
                                                           └──────────┬──────────────┘
                                                                      │
                                                           ┌──────────▼──────────────┐
                                                           │  uploadLogo()            │
                                                           │  Supabase Storage:       │
                                                           │  branding/{id}/logo.png  │
                                                           │  → logo_url (public URL) │
                                                           └──────────┬──────────────┘
                                                                      │
                                                           ┌──────────▼──────────────┐
                                                           │  UPSERT business_branding│
                                                           │  status='analyzed'       │
                                                           │  logo_url, colors,       │
                                                           │  raw_analysis            │
                                                           └─────────────────────────┘
                                                              (or status='failed' + error_message)

GET /api/business/analyze-website
        │
        ▼
[JWT verify]
        │
        ▼
[SELECT business_branding WHERE business_account_id = user.id]
        │
        ▼
[Return {status, logo_url, colors, logo_type, raw_analysis, error_message, analyzed_at}]
```

### Recommended Project Structure

```
app/api/business/analyze-website/
└── route.ts          # POST (trigger) + GET (status poll)

lib/branding/
├── scraper.ts        # scrapeWebsite(url) → { logoUrls, colors, htmlSnippet }
├── analyzer.ts       # analyzeWithClaude(logoCandidates, htmlSnippet) → BrandingResult
├── storage.ts        # uploadLogo(businessAccountId, pngBuffer) → string (public URL)
└── prompt.ts         # BRANDING_ANALYSIS_PROMPT (versionhallinnassa)

supabase/migrations/
└── 20260616000001_business_media_bucket.sql  # storage.buckets INSERT
```

### Pattern 1: waitUntil fire-and-forget (Next.js 14)

**What:** Route palauttaa heti, pipeline jatkuu taustalla
**When to use:** Kaikki operaatiot joissa käyttäjä ei tarvitse synkronista vastausta (scraping 10-30s)

```typescript
// Source: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
import { waitUntil } from '@vercel/functions'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'  // PAKOLLINEN sharp:lle

export async function POST(request: Request) {
  // ... auth + validate + aseta status='analyzing' ...
  waitUntil(runAnalysis(url, businessAccountId))
  return NextResponse.json({ ok: true })
}
```

**Tärkeää:** `@vercel/functions waitUntil` toimii sekä Node.js- että Edge-runtimessa.
`export const runtime = 'nodejs'` on pakollinen, koska `sharp` on native binary (ei Edge-yhteensopiva).

### Pattern 2: Claude Vision multi-image API

**What:** Useita kuvia + tekstiä yhdessä kutsussa
**When to use:** Logo-kandidaatit + HTML-snippet samassa Claude-kutsussa

```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision (TypeScript example)
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      // Kuvat ENNEN tekstiä — parempi suorituskyky (official best practice)
      ...logoCandidatesBase64.map(b64 => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/png' as const,
          data: b64,   // pelkkä base64-string ilman data:image/png;base64, -etuliitettä
        }
      })),
      {
        type: 'text' as const,
        text: `Analysoi yrityssivu. HTML-ote: ${htmlSnippet}`
      }
    ]
  }]
})

// Vastauksen poimiminen
const textBlock = response.content.find(b => b.type === 'text')
const raw = (textBlock as { type: 'text'; text: string }).text
const result = JSON.parse(raw)  // { logo_index, logo_type, primary_color, ... }
```

**Kriittinen yksityiskohta:** `data`-kenttä on pelkkä base64-merkkijono — ei sisällä `data:image/png;base64,`-etuliitettä. [VERIFIED: platform.claude.com/docs/en/docs/build-with-claude/vision]

### Pattern 3: sharp image resize + PNG conversion

**What:** Kuva → PNG, max 512px
**When to use:** Kaikki logo-kandidaatit ennen Claude-kutsua

```typescript
// Source: sharp official docs + npm registry
import sharp from 'sharp'

async function toPng(imageBuffer: Buffer): Promise<string> {
  const pngBuffer = await sharp(imageBuffer)
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
  return pngBuffer.toString('base64')
}
```

`fit: 'inside'` + `withoutEnlargement: true` tarkoittaa: kasvata ei koskaan, kutista niin että suurin sivu on max 512px, säilytä kuvasuhde.

### Pattern 4: Supabase Storage upload

**What:** Buffer → Storage → public URL
**When to use:** Logon tallentaminen

```typescript
// Source: https://supabase.com/docs/guides/storage/uploads/standard-uploads
const path = `branding/${businessAccountId}/logo.png`
const { data, error } = await supabaseAdmin.storage
  .from('business-media')
  .upload(path, pngBuffer, {
    contentType: 'image/png',
    upsert: true,
  })
if (error) throw error

const { data: { publicUrl } } = supabaseAdmin.storage
  .from('business-media')
  .getPublicUrl(path)
// publicUrl on täydellinen https://...supabase.co/storage/v1/object/public/business-media/branding/...
```

**Huom:** `getPublicUrl` palauttaa aina `{ data: { publicUrl } }` — ei `error`-kenttää. [VERIFIED: supabase.com/docs]

### Pattern 5: Storage bucket migraatio

**What:** Luo bucket SQL-migraatiolla
**When to use:** Phase 45 bucket-luonti

```sql
-- Source: Supabase storage internals + community verification
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;
```

SQL-INSERT `storage.buckets`-tauluun toimii — se on sama operaatio, jonka Storage API suorittaa kutsuttaessa create-bucket-endpointtia. `ON CONFLICT (id) DO NOTHING` tekee migraatiosta idempotentin. [MEDIUM confidence — toimii Supabase-hostedilla, dokumentaatio ei mainitse nimenomaisesti mutta community on vahvistanut]

### Pattern 6: JWT auth (replikaatio olemassaolevasta)

```typescript
// Source: app/api/business/onboarding/submit/route.ts (rivit 11-16)
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Anti-Patterns to Avoid

- **Edge Runtime + sharp:** `export const runtime = 'edge'` kaataa deploymentin — sharp on native binary, ei toimi Edge:ssä. Käytä aina `'nodejs'`.
- **base64 data-URL prefixin lähettäminen Claudelle:** `data`-kenttä EI saa alkaa `data:image/png;base64,` — vain raw base64-merkkijono.
- **Synkroninen pipeline:** Scraping + Claude-kutsu kestää 10–30s. EI saa tehdä synkronisesti — käyttäjä aikakatkaistaan.
- **base64 Supabaseen:** Tallenna base64-merkkijono suoraan tietokantaan. Käytä Storage-buketia.
- **logo_index out-of-bounds:** Claude voi palauttaa indeksin joka on >= kandidaattien lukumäärä. Validoi ennen arrayn indeksointia.
- **CSS-parsinta `--` -muuttujilla joissa arvo on muuta kuin hex:** Regex poimii vain `#`-alkuiset arvot — jättää muut huomiotta. Tämä on tarkoituksellista.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Kuvamuunnos PNG:ksi | Custom canvas/binary parser | `sharp` | AVIF/WebP/SVG-muunnos on monimutkainen; sharp käsittelee kaikki |
| Claude API -kutsu | `fetch('https://api.anthropic.com/...')` | `@anthropic-ai/sdk` | SDK tarjoaa TypeScript-tyypit content array -rakenteelle; vähentää virheitä |
| Fire-and-forget | `setImmediate` / erillinen worker | `@vercel/functions waitUntil` | `waitUntil` integroi oikein Vercel-runtimeen (Fluid Compute); muut tavat voivat katketa |
| Storage upload | Supabase REST API suoraan | `supabaseAdmin.storage.from()...upload()` | SDK käsittelee multipart, auth, retry |

**Key insight:** Sharp on ainoa komponentti joka tarvitsee natiivibinäärin. Kaikki muu on pure JS/TypeScript.

---

## Common Pitfalls

### Pitfall 1: Sharp puuttuu node_modules:sta

**What goes wrong:** `Error: Cannot find module 'sharp'` ajonaikaisesti
**Why it happens:** `sharp` on listattuna vain `package.json`-deviDependencies-ssa (ei production deps)
**How to avoid:** `npm install sharp` (production dependency, ei --save-dev)
**Warning signs:** `node_modules` ei sisällä `sharp`-hakemistoa

Nykyisessä `package.json`:ssa sharp ei ole lainkaan (ei dev eikä prod). Se on lisättävä production dependencynä.

### Pitfall 2: Edge Runtime + sharp

**What goes wrong:** Build error / runtime crash Vercelissä
**Why it happens:** `sharp` on native binary (libvips), ei toimi Edge Runtimessa
**How to avoid:** Lisää `export const runtime = 'nodejs'` route-tiedostoon
**Warning signs:** Build warning "Module not found: Can't resolve 'sharp'" tai runtime crash

### Pitfall 3: Base64 data-URL prefix Claudelle

**What goes wrong:** Claude saa malformed imagen, vastaa virheellä tai outoa
**Why it happens:** Kehittäjä lisää `data:image/png;base64,`-etuliitteen data-kenttään
**How to avoid:** `pngBuffer.toString('base64')` — ei etuliitettä. SDK ei lisää sitä automaattisesti.
**Warning signs:** Anthropic API palauttaa `invalid_request_error`

### Pitfall 4: Claude palauttaa logo_index >= kandidaattien lukumäärä

**What goes wrong:** `logoCandidates[logoIndex]` on `undefined` → Storage upload failaa
**Why it happens:** Hallusinointi tai "en löydä logoa" -tilanne
**How to avoid:** Validoi: `if (logoIndex < 0 || logoIndex >= candidates.length)` → status='failed'
**Warning signs:** TypeScript ei varoita tästä automaattisesti

### Pitfall 5: UPSERT business_branding ilman updated_at

**What goes wrong:** `updated_at` jää vanhentuneeksi, Phase 46 ei näe oikeaa aikaleimaa
**Why it happens:** D-16 sanoo: ei triggeriä, `updated_at` manuaalisesti joka kirjoituksessa
**How to avoid:** Sisällytä `updated_at: new Date().toISOString()` jokaiseen UPSERT-kutsuun
**Warning signs:** `updated_at` on sama kuin `created_at` vaikka analyysi on ajettu

### Pitfall 6: storage.buckets INSERT migraatio ja squash

**What goes wrong:** `supabase migration squash` poistaa bucket-luonnin
**Why it happens:** Dokumentoitu Supabase CLI bug (#3352)
**How to avoid:** Älä aja migration squash ennen kuin bucket on varmasti olemassa. Tai tarkista bucket manuaalisesti Supabase dashboardilta.
**Warning signs:** `storage.buckets`-taulusta puuttuu `business-media`-rivi

### Pitfall 7: HTML-snippet liian suuri Claude-kutsuun

**What goes wrong:** Hidas vastaus, korkeat tokenikulut, tai timeout
**Why it happens:** Koko sivun HTML voi olla 100–500 kt
**How to avoid:** Trunkoi HTML: `htmlSnippet = html.slice(0, 8000)` — ensimmäiset 8k merkkiä sisältävät `<head>` ja `<body>`-alun, jossa brändidata on
**Warning signs:** Claude-kutsu kestää >10s

### Pitfall 8: Favicon SVG-muoto

**What goes wrong:** `sharp` kaatuu SVG-tiedostoon joka on suojattu tai invalid
**Why it happens:** Jotkut favicon.svg-tiedostot käyttävät namespace-ominaisuuksia joita sharp ei tue
**How to avoid:** Ympäröi jokainen sharp-muunnos try/catch. Virheellinen kandidaatti jätetään pois listasta.
**Warning signs:** `Error: Input file is missing`

---

## Code Examples

### Verified: Claude Vision TypeScript SDK

```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: base64StringWithoutPrefix,  // EI "data:image/png;base64,"
        }
      },
      { type: 'text', text: 'Analysoi tämä logo.' }
    ]
  }]
})
```

### Verified: CSS :root hex-väriarvojen regex

```typescript
// :root-muuttujat joiden arvo on hex-väri
const rootVarRegex = /--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,6})\b/g
const matches = [...cssText.matchAll(rootVarRegex)]
const hexColors = matches.map(m => m[1])

// theme-color meta-tagista
const themeColorMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["'](#[0-9a-fA-F]{3,6})["']/i)
const themeColor = themeColorMatch?.[1]
```

### Verified: sharp resize + PNG

```typescript
// Source: sharp docs (sharp.pixelplumbing.com)
import sharp from 'sharp'

const pngBuffer = await sharp(inputBuffer)
  .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
  .png()
  .toBuffer()

const base64 = pngBuffer.toString('base64')  // Pelkkä base64, ei data-URL-etuliitettä
```

### Verified: waitUntil Next.js 14

```typescript
// Source: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
import { waitUntil } from '@vercel/functions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // ... set status='analyzing' ...
  waitUntil(runAnalysis(url, businessAccountId))
  return NextResponse.json({ ok: true })
}
```

### Verified: Supabase Storage upload + public URL

```typescript
// Source: supabase.com/docs/guides/storage
const { error: uploadError } = await supabaseAdmin.storage
  .from('business-media')
  .upload(`branding/${businessAccountId}/logo.png`, pngBuffer, {
    contentType: 'image/png',
    upsert: true,
  })
if (uploadError) throw uploadError

const { data: { publicUrl } } = supabaseAdmin.storage
  .from('business-media')
  .getPublicUrl(`branding/${businessAccountId}/logo.png`)
```

### Verified: JSON-vastauksen turvallinen parsinta

```typescript
// Claude voi palauttaa markdown-koodiblokin ympärillä
function parseClaudeJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `context.waitUntil` (experimental) | `@vercel/functions waitUntil` | 2024 (Vercel Functions) | Stabiilit API, samat semantiikat |
| `next/server after()` | N/A — vasta 15.1+ | 2025 (Next.js 15.1) | Projekti on 14.2.35 — käytä `@vercel/functions` |
| Screenshot-pohjainen analyysi | CSS-parsinta + vision (logo vain) | v2.1 suunnittelu | Ei Chromium-riippuvuutta, Vercel-yhteensopiva |

**Deprecated/outdated:**
- Playwright scraping: korvattu `fetch`:llä (Vercel/serverless yhteensopivuus)
- `next/server after()`: Ei saatavilla Next.js 14:ssä

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `storage.buckets` INSERT ON CONFLICT toimii Supabase-hostedilla migraatioissa | Pitfall 6, Pattern 5 | Bucket-luonti failaa; fallback: manuaalinen luonti dashboardilla |
| A2 | `claude-haiku-4-5-20251001` -malli on saatavilla ja tukee vision | Standard Stack | API-kutsu failaa; käytä model discovery tai vaihda malliin |

---

## Open Questions (RESOLVED)

1. **ANTHROPIC_API_KEY ympäristömuuttuja** — RESOLVED: Avain lisätään `.env.local`:iin ja Verceliin Wave 0:n yhteydessä. Plan 04-Task2 (human checkpoint) varmistaa avaimen olemassaolon ennen live-testausta.

2. **Vercel function timeout** — RESOLVED: Hyväksytty rajoitus. `waitUntil`-lupaus voi katketa Hobby-tierin 10s timeoutissa ennen catch-blokin suoritusta — status voi jäädä `analyzing` -tilaan. Plan 04-Task1 dokumentoi tämän koodissa kommentilla. Phase 46 polling-logiikka käsittelee stuck-analyzing -tilan erillisellä timeout-tarkistuksella.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | sharp, waitUntil | ✓ | v24.15.0 | — |
| `@anthropic-ai/sdk` | SCRAP-04 | ✓ (installed) | 0.97.1 | — |
| `sharp` | SCRAP-05 | ✗ (not installed) | 0.35.1 (npm) | Ei fallbackia — pakollinen |
| `@vercel/functions` | D-04, D-05 | ✗ (not installed) | 3.7.1 (npm) | Ei fallbackia Next.js 14:ssä |
| `ANTHROPIC_API_KEY` | Claude API | Unknown | — | Manuaalinen syöttö |
| Supabase `business-media` bucket | D-02 | ✗ (created in migration) | — | Migraatio luo sen |

**Missing dependencies with no fallback:**
- `sharp` — asennettava production dependencynä (`npm install sharp`)
- `@vercel/functions` — asennettava (`npm install @vercel/functions`)

**Missing dependencies with fallback:**
- Supabase bucket — luodaan migraatiolla (Wave 0)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vitest.config.ts` (juuressa) |
| Quick run command | `npx vitest run lib/branding` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRAP-01 | fetch palauttaa HTML oikealla User-Agentilla | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ Wave 0 |
| SCRAP-02 | CSS :root hex-arvot poimitaan oikein | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ Wave 0 |
| SCRAP-03 | Logo-kandidaatit kerätään oikeassa järjestyksessä | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ Wave 0 |
| SCRAP-04 | analyzeWithClaude palauttaa strukturoidun JSON:n | unit (mock) | `npx vitest run lib/branding/analyzer.test.ts` | ❌ Wave 0 |
| SCRAP-05 | sharp muuntaa kuvan PNG:ksi max 512px | unit | `npx vitest run lib/branding/scraper.test.ts` | ❌ Wave 0 |

**Test pattern (vitest.config.ts:n mukaan):** testit hakemistossa `lib/**/*.test.ts` tai `app/**/__tests__/*.test.ts`.

### Wave 0 Gaps

- [ ] `lib/branding/scraper.test.ts` — kattaa SCRAP-01, SCRAP-02, SCRAP-03, SCRAP-05
- [ ] `lib/branding/analyzer.test.ts` — kattaa SCRAP-04 (Claude mockataan)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `supabaseAdmin.auth.getUser(token)` — olemassaoleva pattern |
| V3 Session Management | no | Ei sessioita tässä routessa |
| V4 Access Control | yes | Vain oma `business_account_id` — UPSERT suojattu JWT:llä |
| V5 Input Validation | yes | URL-validaatio ennen fetch-kutsua (protocol whitelist: http/https) |
| V6 Cryptography | no | Ei kryptografiaa |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF (Server-Side Request Forgery) | Tampering | Validoi URL-protocol: vain `http:` / `https:`. Hylkää `file:`, `localhost`, `127.*`, `192.168.*`, `10.*`, `::1`. |
| XSS via logo_url | Tampering | Tallennetaan vain Storage public URL (supabase.co domain) — ei käyttäjän antama URL |
| Prompt injection via HTML | Tampering | HTML-ote lähetetään user-viestissä, ei system-promptissa. Haiku ei ole agentti — riski matala. Trunkoi HTML ennen lähetystä. |
| Denial of service (iso sivu) | DoS | AbortSignal.timeout(10000) HTML:lle, 5s CSS:lle. Max 5 logo-kandidaattia. HTML-ote trunkoidaan 8000 merkkiin. |

**SSRF on tärkein uhka:** Käyttäjä voi yrittää syöttää sisäisiä osoitteita kuten `http://169.254.169.254/` (AWS metadata). Lisää IP-range tarkistus tai vähintään protokolla- ja hostname-validaatio ennen fetch-kutsua.

---

## Project Constraints (from CLAUDE.md)

- Supabase writes: service role key only — käytä `supabaseAdmin` kaikkiin kirjoituksiin
- JWT verification: `supabaseAdmin.auth.getUser(token)` joka Route Handler -rajalla
- Middleware: ei DB-kyselyitä middleware:sta (Edge Runtime) — ei relevantti tässä phasessa
- AI widget (saasuositus): never SSR — ei relevantti; tämä pipeline on server-only
- Tailwind v3: ei relevantti (tämä on server-side only phase)
- `next.config.mjs` on ESM (`.mjs`-pääte) — jos lisätään externals, käytetään ESM-syntaksia

---

## Sources

### Primary (HIGH confidence)

- `platform.claude.com/docs/en/docs/build-with-claude/vision` — multi-image base64 content array TypeScript syntax, image limits (100 per request, 10 MB max, supported formats)
- `vercel.com/docs/functions/functions-api-reference/vercel-functions-package` — `waitUntil` import, Node.js runtime support, Next.js 14 vs 15.1 guidance
- `supabase.com/docs/guides/storage/uploads/standard-uploads` — upload method signature, upsert, contentType options, getPublicUrl
- `npmjs.com` (via npm view) — verified versions: sharp@0.35.1, @vercel/functions@3.7.1, @anthropic-ai/sdk@0.104.1
- `sharp.pixelplumbing.com/install` — serverless deployment notes, WASM option
- Slopcheck — kaikki kolme pakettia [OK]
- `app/api/business/onboarding/submit/route.ts` — JWT auth pattern (koodipohja)
- `supabase/migrations/20260615000001_business_branding.sql` — business_branding taulun skeema

### Secondary (MEDIUM confidence)

- `github.com/orgs/supabase/discussions/3528` — storage.buckets SQL INSERT toimii Supabase-hostedilla
- `github.com/supabase/cli/issues/3352` — migration squash poistaa bucket INSERTin (known bug)

### Tertiary (LOW confidence)

Ei LOW-confidence lähteitä tässä tutkimuksessa.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — paketit npm-rekisteristä vahvistettu, @anthropic-ai/sdk jo asennettuna
- Architecture: HIGH — lukittu CONTEXT.md:ssä, olemassaolevat patternat löydetty koodipohjasta
- Pitfalls: HIGH — peräisin virallisista docs:eista ja tunnetuista Vercel/Supabase-ongelmista
- Storage bucket migration: MEDIUM — SQL INSERT toimii, mutta migration squash voi poistaa sen

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (Anthropic API stable; Vercel SDK stable; sharp stable)
