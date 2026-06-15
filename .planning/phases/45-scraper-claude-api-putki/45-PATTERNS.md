# Phase 45: Scraper & Claude API -putki - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 8 (6 new, 1 modify, 1 possibly modify)
**Analogs found:** 7 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/api/business/analyze-website/route.ts` | route | request-response + async fire-and-forget | `app/api/business/onboarding/submit/route.ts` | role-match (same auth + supabaseAdmin write; different data flow: adds waitUntil) |
| `lib/branding/scraper.ts` | utility | transform (fetch → parse → structured output) | `app/api/saasuositus/route.ts` (fetch sub-function `fetchWeather`) | partial-match (same fetch-with-timeout pattern) |
| `lib/branding/analyzer.ts` | service | request-response (Claude API) | `app/api/saasuositus/route.ts` | exact (same SDK, same model, same content extraction) |
| `lib/branding/storage.ts` | utility | file-I/O (buffer → Supabase Storage) | none — first `supabaseAdmin.storage` usage | no-analog |
| `lib/branding/prompt.ts` | utility | config/constant export | `lib/buildReissuKonteksti.ts` | partial-match (pure string export from lib/) |
| `supabase/migrations/20260616000001_business_media_bucket.sql` | migration | — | `supabase/migrations/20260615000001_business_branding.sql` | role-match |
| `package.json` | config | — | existing `package.json` | exact (same JSON structure, add to `dependencies`) |
| `next.config.mjs` | config | — | existing `next.config.mjs` | exact (ESM syntax; `serverComponentsExternalPackages` if needed) |

---

## Pattern Assignments

### `app/api/business/analyze-website/route.ts` (route, request-response + waitUntil)

**Analog:** `app/api/business/onboarding/submit/route.ts` (primary) and `app/api/business/update-paikka/route.ts` (secondary)

**Imports pattern** (`onboarding/submit/route.ts` lines 1–4 + new additions):
```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
// NEW for this route:
import { waitUntil } from '@vercel/functions'
import { scrapeWebsite } from '@/lib/branding/scraper'
import { analyzeWithClaude } from '@/lib/branding/analyzer'
import { uploadLogo } from '@/lib/branding/storage'
```

**Runtime declaration** (required — sharp is Node.js native binary):
```typescript
export const runtime = 'nodejs'
```

**Auth pattern** (`onboarding/submit/route.ts` lines 11–16 — copy verbatim):
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Body validation pattern** (`update-paikka/route.ts` lines 22–31):
```typescript
let url: string
try {
  const body = await request.json()
  url = body.url
} catch {
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
}
if (!url || typeof url !== 'string') {
  return NextResponse.json({ error: 'url is required' }, { status: 400 })
}
```

**SSRF guard** (new — no existing analog; required per RESEARCH.md Security Domain):
```typescript
// Validate URL protocol — prevent SSRF to file:, localhost, AWS metadata endpoint
try {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
  }
  const hostname = parsed.hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname === '169.254.169.254'
  ) {
    return NextResponse.json({ error: 'Private addresses not allowed' }, { status: 400 })
  }
} catch {
  return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
}
```

**UPSERT to set status='analyzing'** (mirrors `onboarding/submit/route.ts` Step 4 pattern; target table is `business_branding`):
```typescript
const { error: upsertError } = await supabaseAdmin
  .from('business_branding')
  .upsert(
    {
      business_account_id: user.id,
      website_url: url,
      status: 'analyzing',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_account_id' }
  )
if (upsertError) {
  return NextResponse.json({ error: 'DB error', detail: upsertError.message }, { status: 500 })
}
```

**waitUntil fire-and-forget pattern** (new — from RESEARCH.md Pattern 1):
```typescript
waitUntil(runAnalysis(url, user.id))
return NextResponse.json({ ok: true })
```

**Background pipeline function signature** (new — orchestrates lib/branding modules):

NOTE: The snippet below reflects the corrected interface. analyzeWithClaude takes
logoBuffers (Buffer[]) NOT logoUrls (string[]). The UPSERT also includes website_url
from result.website_url (extracted by Claude) and raw_analysis stores the full result.

```typescript
async function runAnalysis(url: string, businessAccountId: string): Promise<void> {
  try {
    // 1. scrape — logoBuffers are PNG Buffer[] (parallel to logoUrls)
    const { logoUrls, logoBuffers, colors, htmlSnippet } = await scrapeWebsite(url)
    // 2. analyze — pass logoBuffers (not logoUrls); result includes prices/opening_hours/website_url
    const result = await analyzeWithClaude(logoBuffers, htmlSnippet)
    // 3. upload logo — upload the Buffer at the chosen index
    const logoUrl = result.logo_index >= 0 && result.logo_index < logoBuffers.length
      ? await uploadLogo(businessAccountId, logoBuffers[result.logo_index])
      : null
    // 4. UPSERT final result — website_url from Claude extraction; raw_analysis = full result
    await supabaseAdmin.from('business_branding').upsert({
      business_account_id: businessAccountId,
      status: 'analyzed',
      logo_url: logoUrl,
      logo_type: result.logo_type,
      colors: result.colors,
      website_url: result.website_url,
      raw_analysis: result,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_account_id' })
  } catch (err) {
    console.error('[analyze-website] pipeline error:', err)
    await supabaseAdmin.from('business_branding').upsert({
      business_account_id: businessAccountId,
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Tuntematon virhe',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_account_id' })
  }
}
```

**Error logging pattern** (`onboarding/submit/route.ts` line 106 — copy prefix convention):
```typescript
console.error('[analyze-website] virhe:', err)
```

**GET handler for status polling** (D-06 — new pattern, no existing GET on business routes):
```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('business_branding')
    .select('status, logo_url, colors, logo_type, raw_analysis, error_message, analyzed_at')
    .eq('business_account_id', user.id)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? { status: 'pending' })
}
```

---

### `lib/branding/scraper.ts` (utility, transform)

**Analog:** `app/api/saasuositus/route.ts` `fetchWeather` function (lines 26–52) for the fetch-with-error-swallow pattern; `lib/email.ts` for the server-only module header convention.

**File header convention** (`lib/email.ts` line 1):
```typescript
// Server-only. Never import in client components.
```

**Imports pattern:**
```typescript
import sharp from 'sharp'
```

**Fetch-with-timeout pattern** (`saasuositus/route.ts` lines 33–40 — adapt `AbortSignal.timeout` from D-11):
```typescript
const res = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AktiiviBot/1.0)' },
  signal: AbortSignal.timeout(10000),
})
if (!res.ok) throw new Error(`Sivua ei saatu ladattua: ${url}`)
const html = await res.text()
```

**Parallel CSS fetch pattern** (D-12 — `Promise.all` with per-item error isolation):
```typescript
const cssResults = await Promise.all(
  cssUrls.slice(0, 3).map(async (cssUrl) => {
    try {
      const r = await fetch(cssUrl, { signal: AbortSignal.timeout(5000) })
      return r.ok ? await r.text() : ''
    } catch {
      return ''
    }
  })
)
```

**CSS hex-color regex** (RESEARCH.md Code Examples):
```typescript
const rootVarRegex = /--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,6})\b/g
const themeColorRegex = /<meta\s+name=["']theme-color["']\s+content=["'](#[0-9a-fA-F]{3,6})["']/i
```

**sharp image processing pattern** (RESEARCH.md Pattern 3 — per-candidate, wrapped in try/catch per Pitfall 8):
```typescript
async function toPngBase64(imageBuffer: Buffer): Promise<string | null> {
  try {
    const pngBuffer = await sharp(imageBuffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
    return pngBuffer.toString('base64')  // NO data-URL prefix
  } catch {
    return null  // skip malformed/SVG candidates
  }
}
```

**Function signature:**
```typescript
export interface ScrapeResult {
  logoUrls: string[]       // raw image URLs (up to 5)
  logoBuffers: Buffer[]    // fetched + converted to PNG buffer (parallel to logoUrls)
  colors: string[]         // hex colors from theme-color + :root CSS vars
  htmlSnippet: string      // html.slice(0, 8000)
}

export async function scrapeWebsite(url: string): Promise<ScrapeResult>
```

---

### `lib/branding/analyzer.ts` (service, request-response)

**Analog:** `app/api/saasuositus/route.ts` — exact match. Same SDK (`@anthropic-ai/sdk`), same model (`claude-haiku-4-5-20251001`), same client instantiation, same content extraction pattern.

**Imports pattern** (`saasuositus/route.ts` line 2):
```typescript
import Anthropic from '@anthropic-ai/sdk'
```

**Client instantiation pattern** (`saasuositus/route.ts` line 8 — but use explicit apiKey for clarity in lib/):
```typescript
// In lib/ (not a route), use explicit apiKey — makes the dependency visible
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

**Claude API call pattern** (`saasuositus/route.ts` lines 67–75 + RESEARCH.md Pattern 2 for multi-image):
```typescript
const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      // Images BEFORE text — official best practice
      ...logoCandidatesBase64.map(b64 => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/png' as const,
          data: b64,   // raw base64, NO "data:image/png;base64," prefix
        }
      })),
      { type: 'text' as const, text: promptText }
    ]
  }]
})
```

**Response text extraction** (`saasuositus/route.ts` lines 75–76):
```typescript
const block = response.content[0]
const raw = block.type === 'text' ? block.text : ''
```

**Safe JSON parse** (RESEARCH.md Code Examples — Claude may wrap JSON in markdown code fences):
```typescript
function parseClaudeJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}
```

**logo_index bounds guard** (RESEARCH.md Pitfall 4 — no analog; new validation):
```typescript
const result = parseClaudeJson(raw) as { logo_index: number; logo_type: string; colors: string[] }
if (result.logo_index < 0 || result.logo_index >= candidateCount) {
  throw new Error(`Claude returned out-of-bounds logo_index: ${result.logo_index}`)
}
```

**Function signature:**
```typescript
export interface BrandingAnalysisResult {
  logo_index: number       // 0-based index into candidates passed in
  logo_type: 'icon' | 'icon_with_text' | 'text_only'
  colors: string[]         // hex colors identified by Claude
  raw_analysis: unknown    // full parsed JSON for raw_analysis column
}

export async function analyzeWithClaude(
  logoCandidatesBase64: string[],
  htmlSnippet: string
): Promise<BrandingAnalysisResult>
```

---

### `lib/branding/storage.ts` (utility, file-I/O)

**Analog:** None — this is the first `supabaseAdmin.storage` usage in the project.

**Use patterns from RESEARCH.md Pattern 4 directly.**

**Imports pattern** (`lib/supabaseAdmin.server.ts` line 3):
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
```

**File header convention** (`lib/email.ts` line 1):
```typescript
// Server-only. Never import in client components.
```

**Upload + public URL pattern** (RESEARCH.md Pattern 4 — verified against supabase.com/docs):
```typescript
const path = `branding/${businessAccountId}/logo.png`
const { error: uploadError } = await supabaseAdmin.storage
  .from('business-media')
  .upload(path, pngBuffer, {
    contentType: 'image/png',
    upsert: true,
  })
if (uploadError) throw uploadError

// getPublicUrl never returns an error field — safe to destructure directly
const { data: { publicUrl } } = supabaseAdmin.storage
  .from('business-media')
  .getPublicUrl(path)
return publicUrl
```

**Function signature:**
```typescript
export async function uploadLogo(
  businessAccountId: string,
  pngBuffer: Buffer
): Promise<string>   // returns full public URL (https://...supabase.co/storage/...)
```

---

### `lib/branding/prompt.ts` (config, constant export)

**Analog:** `lib/buildReissuKonteksti.ts` — pure server-side string utility in `lib/`. No imports needed, just an exported constant.

**Pattern** (`lib/buildReissuKonteksti.ts` lines 1–20 — adapt to constant export):
```typescript
// Versioned prompt for branding analysis — update here when prompt changes.
// Used by lib/branding/analyzer.ts.
export const BRANDING_ANALYSIS_PROMPT = `...`
```

The prompt should instruct Claude to return valid JSON with `logo_index`, `logo_type`, and `colors`. Keep the prompt file separate from `analyzer.ts` so it can be updated independently (per CONTEXT.md `<specifics>` structure).

---

### `supabase/migrations/20260616000001_business_media_bucket.sql` (migration)

**Analog:** `supabase/migrations/20260615000001_business_branding.sql` — same file naming convention (YYYYMMDDNNNNNN_name.sql), same comment header style.

**Comment header pattern** (`20260615000001_business_branding.sql` lines 1–8):
```sql
-- Phase 45: Create business-media Storage bucket for branding logos
--
-- Creates the public bucket that Phase 45 uploads logos to.
-- Path pattern: branding/{business_account_id}/logo.png
-- ON CONFLICT DO NOTHING makes this migration idempotent (safe to re-run).
```

**Bucket creation SQL** (RESEARCH.md Pattern 5):
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;
```

No RLS policies needed — the bucket is public (logos are public images). No additional SQL beyond the INSERT.

---

### `package.json` (modify — add dependencies)

**Analog:** Existing `package.json` (lines 11–28).

**Pattern — add to `dependencies` block (not devDependencies):**
```json
"sharp": "^0.35.1",
"@vercel/functions": "^3.7.1"
```

Both are runtime dependencies (used in production server routes), not dev tools. `sharp` in `devDependencies` would cause a production crash (see RESEARCH.md Pitfall 1).

**`@anthropic-ai/sdk` is already installed** at `^0.97.1` — no change needed.

---

### `next.config.mjs` (possibly modify)

**Analog:** Existing `next.config.mjs`.

**Current file** (lines 19–30) uses ESM `export default` — any additions must use ESM syntax, not `module.exports`.

**Pattern if `serverComponentsExternalPackages` is needed for sharp:**
```mjs
export default withNextIntl(withSerwist({
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  async redirects() { /* existing */ },
}));
```

RESEARCH.md Primary Recommendation states this may be needed. Since `export const runtime = 'nodejs'` is set on the route, sharp should bundle correctly — verify during execution and only add the config key if the build errors.

---

## Shared Patterns

### Authentication (JWT verification)
**Source:** `app/api/business/onboarding/submit/route.ts` lines 11–16
**Apply to:** `app/api/business/analyze-website/route.ts` (both POST and GET handlers)
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### supabaseAdmin import
**Source:** `lib/supabaseAdmin.server.ts` (full file — 8 lines)
**Apply to:** `app/api/business/analyze-website/route.ts`, `lib/branding/storage.ts`
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
```

### UPSERT with manual updated_at
**Source:** D-16 + D-15 (no existing analog uses `updated_at` manually — this is new per D-16)
**Apply to:** All `supabaseAdmin.from('business_branding').upsert(...)` calls in `route.ts`
```typescript
.upsert(
  { ..., updated_at: new Date().toISOString() },
  { onConflict: 'business_account_id' }
)
```

### Error logging prefix convention
**Source:** `app/api/business/onboarding/submit/route.ts` line 106
**Apply to:** `app/api/business/analyze-website/route.ts`, all `lib/branding/*.ts` files
```typescript
console.error('[analyze-website] description:', err)
console.error('[branding/scraper] description:', err)
console.error('[branding/analyzer] description:', err)
console.error('[branding/storage] description:', err)
```

### Claude SDK instantiation
**Source:** `app/api/saasuositus/route.ts` line 8 (adapted — use explicit apiKey in lib/)
**Apply to:** `lib/branding/analyzer.ts`
```typescript
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

### Server-only file header
**Source:** `lib/email.ts` line 1, `lib/supabaseAdmin.server.ts` line 1
**Apply to:** `lib/branding/scraper.ts`, `lib/branding/analyzer.ts`, `lib/branding/storage.ts`
```typescript
// Server-only. Never import in client components.
```

### Vitest test file pattern
**Source:** `lib/onboardingUtils.test.ts` lines 1–5
**Apply to:** `lib/branding/scraper.test.ts`, `lib/branding/analyzer.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest'
import { functionUnderTest } from './module-name'

describe('functionUnderTest', () => {
  it('description of expected behavior', () => {
    expect(functionUnderTest(input)).toEqual(expectedOutput)
  })
})
```
Config: `vitest.config.ts` already covers `lib/**/*.test.ts` — no config change needed.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `lib/branding/storage.ts` | utility | file-I/O | No `supabaseAdmin.storage` usage exists in the project — this is the first. Use RESEARCH.md Pattern 4 directly. |

---

## Metadata

**Analog search scope:** `app/api/business/`, `lib/`, `supabase/migrations/`, `package.json`, `next.config.mjs`
**Files read:** 10 source files
**Pattern extraction date:** 2026-06-15
