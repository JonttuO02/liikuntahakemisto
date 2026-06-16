# Phase 47: Skeema & monisivuinen scraper-putki - Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 9 (6 modified, 3 new code files, 1 new migration)
**Analogs found:** 9 / 9 (all files have a same-codebase analog; none fall back to RESEARCH.md-only patterns)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `lib/branding/ssrfGuard.ts` (new) | utility | request-response (validator) | `app/api/business/analyze-website/route.ts` lines 103-133 (inline check to extract) | exact (verbatim extraction) |
| `lib/branding/fetchSafe.ts` (new, or inline in scraper.ts) | utility | streaming/file-I/O (HTTP fetch wrapper) | `lib/branding/scraper.ts` lines 42-97 (existing fetch+timeout idiom) | role-match |
| `lib/branding/scraper.ts` (modify) | service | CRUD-like extraction / file-I/O | itself (extend in place) — same file is its own analog for style continuity | exact |
| `lib/branding/screenshot.ts` (new) | service | file-I/O (binary capture) | `lib/branding/scraper.ts` `toPngBase64()` lines 13-28 (closest existing "produce a binary asset, fail soft" pattern) | role-match |
| `lib/branding/analyzer.ts` (modify) | service | request-response (Claude API call) | itself (extend in place) | exact |
| `lib/branding/prompt.ts` (modify) | config | n/a (string constant) | itself (full replacement, verbatim text given in CONTEXT.md) | exact |
| `lib/branding/brandingResult.ts` (modify, additive only — out of phase scope to redesign) | utility/type | transform | itself (extend in place) | exact |
| `lib/branding/storage.ts` (modify — add gallery upload) | service | file-I/O (Supabase Storage upload) | `lib/branding/storage.ts` `uploadLogo()` lines 10-31 (existing analog in the same file) | exact |
| `app/api/business/analyze-website/route.ts` (modify) | route/controller | request-response + event-driven (waitUntil background job) | itself (extend in place) | exact |
| `supabase/migrations/2026XXXXXXXXXX_business_branding_plural_and_paikka_scoping.sql` (new) | migration | batch (DDL + backfill UPDATE) | `supabase/migrations/20260606000000_onboarding.sql` (composite UNIQUE + FK-to-liikuntapaikat precedent) | exact |

## Pattern Assignments

### `lib/branding/ssrfGuard.ts` (utility, request-response validator)

**Analog:** `app/api/business/analyze-website/route.ts` lines 103-133 (inline check — this IS the source to extract, not just a style reference)

**Current inline pattern to extract verbatim** (lines 106-133):
```typescript
try {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
  }
  const hostname = parsed.hostname.toLowerCase()
  const parts = hostname.split('.')
  const oct1 = parseInt(parts[0] ?? '', 10)
  const oct2 = parseInt(parts[1] ?? '', 10)
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::]' ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('fd') ||   // IPv6 ULA fd00::/8
    hostname.startsWith('fc') ||   // IPv6 ULA fc00::/8
    (oct1 === 172 && oct2 >= 16 && oct2 <= 31) ||   // 172.16.0.0/12
    (oct1 === 100 && oct2 >= 64 && oct2 <= 127)      // 100.64.0.0/10 (CGNAT/Tailscale)
  if (isPrivate) {
    return NextResponse.json({ error: 'Private addresses not allowed' }, { status: 400 })
  }
} catch {
  return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
}
```

**Refactor target shape (pure function, no NextResponse coupling)** — note the original throws/returns HTTP responses; the extracted version must return a boolean or throw a plain Error so it's reusable from `scraper.ts` (no `next/server` import there):
```typescript
// lib/branding/ssrfGuard.ts
// Server-only. Never import in client components.
// Extracted verbatim (logic unchanged) from app/api/business/analyze-website/route.ts lines 106-133.
// D-08/D-09: shared validator used by route.ts (entry URL), scraper.ts (every discovered
// subpage link), and the redirect-following wrapper (every Location header hop).

export function isUrlSafe(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()
  const parts = hostname.split('.')
  const oct1 = parseInt(parts[0] ?? '', 10)
  const oct2 = parseInt(parts[1] ?? '', 10)
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::]' ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fc') ||
    (oct1 === 172 && oct2 >= 16 && oct2 <= 31) ||
    (oct1 === 100 && oct2 >= 64 && oct2 <= 127)
  return !isPrivate
}
```

**Caller update in route.ts** — replace the inline try/catch block (lines 106-133) with:
```typescript
import { isUrlSafe } from '@/lib/branding/ssrfGuard'
// ...
if (!isUrlSafe(url)) {
  return NextResponse.json({ error: 'Invalid or private URL' }, { status: 400 })
}
```

**Known limitation carried forward (do not silently "fix" in this phase):** hostname-string checks run pre-DNS-resolution — DNS rebinding is not caught. This is documented as `P45-DNS` in STATE.md and is explicitly out of scope per RESEARCH.md.

---

### `lib/branding/fetchSafe.ts` (new, utility — manual redirect + hop cap wrapper)

**Analog:** `lib/branding/scraper.ts` lines 42-49 (existing fetch+timeout+User-Agent idiom) and lines 76-86 (`Promise.all` parallel-fetch-with-fallback idiom)

**Existing fetch idiom to match style with** (`scraper.ts` lines 44-49):
```typescript
const res = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AktiiviBot/1.0)' },
  signal: AbortSignal.timeout(10000),
})
if (!res.ok) throw new Error(`Sivua ei saatu ladattua: ${url}`)
```

**Existing "fail soft, return empty string" idiom for parallel fetches** (`scraper.ts` lines 77-86):
```typescript
const cssResults = await Promise.all(
  cssUrls.map(async (cssUrl) => {
    try {
      const r = await fetch(cssUrl, { signal: AbortSignal.timeout(5000) })
      return r.ok ? await r.text() : ''
    } catch {
      return ''
    }
  })
)
```

**New wrapper to build, following the same User-Agent + timeout conventions, per RESEARCH.md Pattern 2:**
```typescript
// lib/branding/fetchSafe.ts
// Server-only. Never import in client components.
import { isUrlSafe } from './ssrfGuard'

const MAX_REDIRECT_HOPS = 2

export async function fetchWithSsrfGuard(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let currentUrl = url
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    if (!isUrlSafe(currentUrl)) {
      throw new Error(`SSRF guard rejected URL: ${currentUrl}`)
    }
    const res = await fetch(currentUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AktiiviBot/1.0)' },
      ...init,
      redirect: 'manual',
    })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new Error('Redirect with no Location header')
      currentUrl = new URL(location, currentUrl).href
      continue
    }
    return res
  }
  throw new Error(`Exceeded ${MAX_REDIRECT_HOPS} redirect hops`)
}
```
**Pitfall flagged by RESEARCH.md (Assumption A1):** Node/undici `redirect: 'manual'` semantics for server-side fetch should expose `status`/`headers.get('location')` directly (no browser-style opaque redirect), but this should be smoke-tested against the actual Vercel Node runtime, not just assumed from local Node v24 behavior.

---

### `lib/branding/scraper.ts` (modify — extend with crawl, subpage discovery, gallery extraction)

**Analog:** itself — extend in place using the file's own established regex idioms.

**Existing regex idiom to copy for new link-discovery / image-extraction logic** (`scraper.ts` lines 138-167, the `img[*=logo]` detection loop — this is the direct template for both subpage-link discovery and gallery-image extraction):
```typescript
const imgTagRegex = /<img[^>]+>/gi
let imgMatch: RegExpExecArray | null
while ((imgMatch = imgTagRegex.exec(html)) !== null && logoCandidates.length < 10) {
  const tag = imgMatch[0]
  const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(tag)
  const altMatch = /\balt=["']([^"']*)["']/i.exec(tag)
  const classMatch = /\bclass=["']([^"']*)["']/i.exec(tag)
  const src = srcMatch?.[1] ?? ''
  const alt = altMatch?.[1] ?? ''
  const cls = classMatch?.[1] ?? ''
  if (/logo/i.test(src) || /logo/i.test(alt) || /logo/i.test(cls)) {
    if (src) {
      try {
        const absUrl = new URL(src, url).href
        if (!logoCandidates.includes(absUrl)) logoCandidates.push(absUrl)
      } catch { /* skip */ }
    }
  }
}
```

**CR-05 caveat to preserve in new code** (regex with `/g` flag retains `lastIndex` across reuse — comment at lines 89-90):
```typescript
// CR-05: regex must be re-created per CSS file — a shared /g regex retains lastIndex
// across files and silently drops matches from the 2nd and 3rd stylesheet.
```
Apply the same discipline (fresh regex literal per `exec` loop invocation) to the new `discoverSubpages()` and `extractGalleryImages()` functions — both are concrete code examples already drafted in RESEARCH.md "Pattern 3" and "Gallery image noise-filtering" sections; copy those almost verbatim, they already follow this file's idiom.

**WR-01 size-guard pattern to replicate for each subpage fetch** (line 52):
```typescript
if (html.length > 5 * 1024 * 1024) throw new Error('Response too large (>5MB)')
```

**Existing "strip comments/script/style before sending to Claude" pattern (CR-03 partial mitigation)** to apply per-page when building labeled sections (lines 199-203):
```typescript
const strippedHtml = html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
```

**Test file analog:** `lib/branding/scraper.test.ts` — mock-`fetch` style (`vi.stubGlobal('fetch', mockFetch)`, `mockFetch.mockResolvedValueOnce(makeHtmlResponse(html))`) to extend for SCRAP-06/SCRAP-09 tests; see Shared Patterns below.

---

### `lib/branding/screenshot.ts` (new — Playwright + @sparticuz/chromium homepage capture)

**Analog:** `lib/branding/scraper.ts` `toPngBase64()` lines 13-28 — closest existing precedent for "attempt a binary-producing operation, catch all errors, return null on failure, log via `console.error` with the same `[branding/X]` prefix convention, and let the caller treat null as a non-fatal skip":
```typescript
async function toPngBase64(buffer: Buffer): Promise<Buffer | null> {
  try {
    const pngBuffer = await sharp(buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
    return pngBuffer
  } catch (err) {
    console.error('[branding/scraper] toPngBase64 error:', err)
    return null
  }
}
```

**New file should follow this exact fail-soft shape** (RESEARCH.md already drafted the concrete implementation — copy verbatim, it already matches the established error-logging convention):
```typescript
// lib/branding/screenshot.ts
import chromium from '@sparticuz/chromium'
import { chromium as playwrightChromium } from 'playwright-core'

export async function captureHomepageScreenshot(url: string): Promise<Buffer | null> {
  let browser
  try {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    const buffer = await page.screenshot({ type: 'png', fullPage: false })
    return buffer
  } catch (err) {
    console.error('[branding/screenshot] capture error:', err)
    return null
  } finally {
    await browser?.close()
  }
}
```
**Comment convention to match:** every `lib/branding/*.ts` file opens with `// Server-only. Never import in client components.` — add this header line to `screenshot.ts` too.

---

### `lib/branding/analyzer.ts` (modify — array-based logos/colors, screenshot content block)

**Analog:** itself — extend the existing `analyzeWithClaude` function in place; the runtime-validation idioms already established here are the direct template for the new per-entry validation (`type`, `role`, `source_page`).

**Imports pattern** (lines 1-6, unchanged):
```typescript
// Server-only. Never import in client components.
import Anthropic from '@anthropic-ai/sdk'
import { BRANDING_ANALYSIS_PROMPT } from './prompt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

**Markdown-fence stripping pattern to keep unchanged** (lines 12-18):
```typescript
function parseClaudeJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
  return JSON.parse(cleaned)
}
```

**Content-array assembly pattern to extend with a screenshot block** (lines 38-53) — currently images-before-text; the new screenshot block should be inserted using the same `type: 'image'` / `source: { type: 'base64', media_type, data }` shape, before the text block, consistent with "official best practice: images BEFORE text" comment already in the file:
```typescript
const imageItems = base64Images.map((b64) => ({
  type: 'image' as const,
  source: { type: 'base64' as const, media_type: 'image/png' as const, data: b64 },
}))
const textItem = {
  type: 'text' as const,
  text: BRANDING_ANALYSIS_PROMPT + '\n\nHTML snippet:\n' + htmlSnippet,
}
const contentArray = [...imageItems, textItem]
```

**Runtime validation pattern to replicate for new array fields** (lines 87-100 — this is the exact template referenced by CONTEXT.md's "see CR-02/WR-04 runtime-validation patterns already in the file"):
```typescript
const VALID_LOGO_TYPES: BrandingAnalysisResult['logo_type'][] = ['wordmark', 'icon', 'combination', 'unknown']
const rawLogoType = result.logo_type
const logo_type: BrandingAnalysisResult['logo_type'] =
  VALID_LOGO_TYPES.includes(rawLogoType as BrandingAnalysisResult['logo_type'])
    ? (rawLogoType as BrandingAnalysisResult['logo_type'])
    : 'unknown'

// CR-02: guard against non-string website_url (Claude may return null or number)
const website_url = typeof result.website_url === 'string' ? result.website_url : ''

// WR-04: filter colors to only valid hex strings
const colors = Array.isArray(result.colors)
  ? result.colors.filter((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{3,6}$/.test(c))
  : []
```
Apply the identical defensive style to the new array-of-objects shapes: for each `logos[]` entry validate `index` is in-bounds + `type` is one of `VALID_LOGO_TYPES`; for each `colors[]` entry validate `hex` matches the existing hex regex and `role` is one of the 6 allowed role strings (default to `'unknown'` if not, mirroring the `logo_type` fallback above); for `prices[]`/`opening_hours[]` entries validate `source_page` is a string (default `''`), same guard style as `website_url`.

**Error handling pattern to keep unchanged** (lines 111-114):
```typescript
} catch (err) {
  console.error('[branding/analyzer] error:', err)
  throw err
}
```

**Test analog:** `lib/branding/analyzer.test.ts` — `vi.mock('@anthropic-ai/sdk', ...)` factory pattern with a `_mockCreate` spy attached to the mock constructor; extend `makeOkResponse()` to emit the new array-based JSON shape for SCRAP-08 tests.

---

### `lib/branding/prompt.ts` (modify — full replacement)

**Analog:** itself. Current file is a single exported `const BRANDING_ANALYSIS_PROMPT: string = \`...\`` — replace the entire template-literal body with the verbatim text supplied in CONTEXT.md `<specifics>`. Keep the existing header comment style (`// Versioned prompt for branding analysis — update here when prompt changes. // Used by lib/branding/analyzer.ts.`) and append the HUOM-comment block from CONTEXT.md above the export.

---

### `lib/branding/storage.ts` (modify — add gallery image upload)

**Analog:** `uploadLogo()` in the same file, lines 10-31 — exact template for the new gallery-upload function.

**Full existing function to mirror:**
```typescript
export async function uploadLogo(
  businessAccountId: string,
  pngBuffer: Buffer
): Promise<string> {
  const path = 'branding/' + businessAccountId + '/logo.png'

  const { error: uploadError } = await supabaseAdmin.storage
    .from('business-media')
    .upload(path, pngBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('[branding/storage] upload error:', uploadError)
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('business-media').getPublicUrl(path)

  return publicUrl + '?t=' + Date.now()
}
```
**New gallery upload function should follow the identical shape** — path pattern `branding/{businessAccountId}/gallery/{index}.png` (or similar), same `upsert: true`, same error-log-and-throw convention, same `?t=Date.now()` cache-busting suffix on the returned public URL. If uploading multiple logo candidates (per D-12's `logo_candidates` plural), consider a parameterized path (`branding/{businessAccountId}/logo-{index}.png`) using the same template literal style as line 14.

---

### `app/api/business/analyze-website/route.ts` (modify — paikka_id scoping, ssrfGuard import, onConflict update)

**Analog:** itself — this is the file CONTEXT.md/RESEARCH.md describe as needing in-place modification, not a separate analog file.

**POST handler auth pattern to keep unchanged** (lines 84-89):
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Existing UPSERT + onConflict pattern that must change** (lines 146-159 — status='analyzing' UPSERT; and lines 37-63, 65-78 — two more UPSERTs in `runAnalysis`'s try/catch). All three currently use:
```typescript
{ onConflict: 'business_account_id' }
```
**Must become** (per D-16/RESEARCH.md Pitfall 4 — grep for every `onConflict:` occurrence touching `business_branding` before considering the change complete; there are exactly 3 call sites in this file):
```typescript
{ onConflict: 'business_account_id,paikka_id' }
```
And every `.eq('business_account_id', ...)` filter (GET handler, line 180) must become `.eq('business_account_id', ...).eq('paikka_id', paikkaId)`.

**New ownership-check pattern needed (IDOR mitigation flagged by RESEARCH.md Security Domain table)** — model this on the existing CR-04 business-account check (lines 136-143):
```typescript
// CR-04: verify caller has a business account — prevents cost abuse from consumer accounts
const { data: bizAccount } = await supabaseAdmin
  .from('business_accounts')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle()
if (!bizAccount) {
  return NextResponse.json({ error: 'Business account required' }, { status: 403 })
}
```
New `paikka_id` ownership check should follow the identical `.select(...).eq(...).maybeSingle()` + 403-on-null shape, querying `business_paikka_links` for `(business_account_id = user.id, paikka_id = paikkaId, claim_status = 'approved')`.

**`paikka_id` param convention:** RESEARCH.md confirms the project's established convention (PROJECT.md Phase 36 decision) is `paikka_id` as a URL/request parameter in onboarding/edit-wizard routes — follow whichever of body-field or query-param is most consistent with sibling business routes (Claude's Discretion per CONTEXT.md); POST already reads `url` from a JSON body (line 94-95: `const body = await request.json(); url = body?.url`), so adding `paikkaId = body?.paikka_id` in the same destructuring is the lowest-friction match. GET currently has no body, so `paikka_id` there should be a query param (`new URL(request.url).searchParams.get('paikka_id')`) — there is no existing GET-with-query-param analog in this exact file, but this is standard Next.js Route Handler practice already used by sibling routes per RESEARCH.md.

**Background pipeline (`runAnalysis`) signature change:** currently `runAnalysis(url: string, businessAccountId: string)` (line 20) — must become `runAnalysis(url: string, businessAccountId: string, paikkaId: number)`, threading `paikkaId` into all 3 UPSERT call sites' `.upsert({ business_account_id: ..., paikka_id: paikkaId, ... })` payload bodies.

**SSRF guard call site to replace** — see `ssrfGuard.ts` section above; the inline try/catch at lines 106-133 becomes a single `isUrlSafe(url)` call importing from `@/lib/branding/ssrfGuard`.

---

### `supabase/migrations/2026XXXXXXXXXX_business_branding_plural_and_paikka_scoping.sql` (new)

**Analog:** `supabase/migrations/20260606000000_onboarding.sql` — exact precedent for the composite-key shape this migration needs (UUID business account + BIGINT paikka_id FK + composite UNIQUE).

**Exact shape to mirror** (`20260606000000_onboarding.sql` lines 38-49):
```sql
CREATE TABLE IF NOT EXISTS onboarding_draft (
  id                   BIGSERIAL PRIMARY KEY,
  business_account_id  UUID    NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  paikka_id            BIGINT  NOT NULL REFERENCES liikuntapaikat(id)          ON DELETE CASCADE,
  ...
  CONSTRAINT onboarding_draft_unique_business_paikka UNIQUE (business_account_id, paikka_id)
);
```
Applied to `business_branding`, the new migration needs (in this order, since `paikka_id` must be backfilled before the old single-column UNIQUE can be dropped and the new composite one added):
```sql
-- 1. Add paikka_id column (nullable first — required for backfill UPDATE to run)
ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS paikka_id BIGINT REFERENCES liikuntapaikat(id) ON DELETE CASCADE;

-- 2. Backfill from business_paikka_links (D-15) — deterministic tie-break via created_at
--    per RESEARCH.md Assumption A4 (no ORDER BY specified in CONTEXT.md; pick earliest link)
UPDATE business_branding bb
SET paikka_id = (
  SELECT bpl.paikka_id
  FROM business_paikka_links bpl
  WHERE bpl.business_account_id = bb.business_account_id
  ORDER BY bpl.created_at ASC
  LIMIT 1
)
WHERE bb.paikka_id IS NULL;

-- 3. Make paikka_id NOT NULL now that backfill has run
ALTER TABLE business_branding
  ALTER COLUMN paikka_id SET NOT NULL;

-- 4. Re-key UNIQUE constraint (D-14) — drop old single-column, add composite
ALTER TABLE business_branding
  DROP CONSTRAINT IF EXISTS business_branding_unique_account;

ALTER TABLE business_branding
  ADD CONSTRAINT business_branding_unique_account_paikka UNIQUE (business_account_id, paikka_id);
```

**`colors jsonb` column pattern (D-12) to reuse verbatim for `logo_candidates`/`image_urls`** — original column declaration (`20260615000001_business_branding.sql` line 15):
```sql
colors               JSONB,
```
New columns follow the same bare-`JSONB`-nullable style (no default, no CHECK — validation happens app-side per the existing `colors` precedent):
```sql
ALTER TABLE business_branding ADD COLUMN IF NOT EXISTS logo_candidates JSONB;
ALTER TABLE business_branding ADD COLUMN IF NOT EXISTS image_urls JSONB;
ALTER TABLE business_branding ADD COLUMN IF NOT EXISTS selected_background_color TEXT;
ALTER TABLE business_branding ADD COLUMN IF NOT EXISTS selected_accent_color TEXT;
```

**BRDDB-04 — verification-only, NOT a new migration task.** `20260615000002_fix_logo_type_constraint.sql` already ships the exact constraint CONTEXT.md's D-13 asks for:
```sql
ALTER TABLE business_branding
  DROP CONSTRAINT IF EXISTS business_branding_logo_type_check;
ALTER TABLE business_branding
  ADD CONSTRAINT business_branding_logo_type_check
    CHECK (logo_type IN ('wordmark', 'icon', 'combination', 'unknown'));
```
Per RESEARCH.md "Don't Hand-Roll" and "Open Question 1" — the planner should add a verification task (query `pg_get_constraintdef` against the live Supabase project) rather than a redundant migration. Re-running an idempotent `DROP CONSTRAINT IF EXISTS` + re-`ADD CONSTRAINT` with identical values is harmless if included defensively in the new migration file, but is not required net-new work.

**Header comment convention to follow** (style copied from `20260606000000_onboarding.sql` lines 1-19 — "Analog sources" + "Decision log" + "NOT included" comment block):
```sql
-- Phase 47: extend business_branding for multi-page scraper pipeline + paikka_id scoping
-- Analog source: supabase/migrations/20260606000000_onboarding.sql
--   (composite UNIQUE(business_account_id, paikka_id) pattern, BIGINT FK to liikuntapaikat)
--
-- Decision log:
--   D-12: logo_candidates/image_urls JSONB columns — same bare-JSONB style as existing `colors` column.
--   D-14: re-key UNIQUE(business_account_id) -> UNIQUE(business_account_id, paikka_id).
--   D-15: backfill paikka_id from business_paikka_links (earliest created_at wins for multi-venue accounts).
--   D-13/BRDDB-04: logo_type CHECK constraint already fixed in 20260615000002 — not touched here.
```

---

## Shared Patterns

### SSRF validation (applies to: route.ts, scraper.ts, fetchSafe.ts)
**Source:** extracted from `app/api/business/analyze-website/route.ts` lines 106-133 into `lib/branding/ssrfGuard.ts`
**Apply to:** every outbound fetch in the pipeline — entry URL (route.ts), every discovered subpage link (scraper.ts), every redirect `Location` header (fetchSafe.ts)
```typescript
export function isUrlSafe(url: string): boolean { /* see Pattern Assignments above for full body */ }
```

### Server-only file header (applies to: all lib/branding/*.ts files, new and modified)
**Source:** every existing file in `lib/branding/` (`scraper.ts` line 1, `analyzer.ts` line 1, `storage.ts` line 1)
**Apply to:** `ssrfGuard.ts`, `fetchSafe.ts`, `screenshot.ts` (the 3 new files)
```typescript
// Server-only. Never import in client components.
```

### `console.error` log-prefix convention (applies to: all lib/branding/*.ts catch blocks)
**Source:** `scraper.ts` line 25 (`'[branding/scraper] toPngBase64 error:'`), `analyzer.ts` line 112 (`'[branding/analyzer] error:'`), `storage.ts` line 21 (`'[branding/storage] upload error:'`)
**Apply to:** new files use `'[branding/ssrfGuard]'`, `'[branding/fetchSafe]'`, `'[branding/screenshot]'` prefixes respectively, consistent with the `[branding/{filename}] {context} error:` shape already established.

### UPSERT + onConflict scoping (applies to: route.ts, any future business_branding writer)
**Source:** `app/api/business/analyze-website/route.ts` — 3 existing call sites, all currently `{ onConflict: 'business_account_id' }`
**Apply to:** all 3 must change to `{ onConflict: 'business_account_id,paikka_id' }` once the composite UNIQUE migration lands (RESEARCH.md Pitfall 4 — grep for every occurrence before considering route.ts changes complete).

### Mock-fetch test convention (applies to: scraper.test.ts extensions, new ssrfGuard.test.ts)
**Source:** `lib/branding/scraper.test.ts` lines 1-37
```typescript
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
// ...
beforeEach(() => { mockFetch.mockReset() })
```
**Apply to:** `lib/branding/ssrfGuard.test.ts` (new file per RESEARCH.md Wave 0 Gaps) should reuse this exact `vi.stubGlobal('fetch', ...)` + `mockResolvedValueOnce` idiom for testing the redirect-following hop-cap loop.

### Mock-Anthropic test convention (applies to: analyzer.test.ts extensions)
**Source:** `lib/branding/analyzer.test.ts` lines 7-35 (`vi.mock('@anthropic-ai/sdk', ...)` factory + `_mockCreate` spy attached to the mock constructor)
**Apply to:** extending tests for the new array-based `logos`/`colors` shape — reuse `makeOkResponse()`-style helper, just change the JSON payload shape.

### Composite UNIQUE + FK migration shape (applies to: the new BRDDB-05 migration)
**Source:** `supabase/migrations/20260606000000_onboarding.sql` lines 38-49 — `UUID ... REFERENCES business_accounts(user_id) ON DELETE CASCADE` + `BIGINT ... REFERENCES liikuntapaikat(id) ON DELETE CASCADE` + `CONSTRAINT ... UNIQUE (business_account_id, paikka_id)`.

## No Analog Found

None — every file in scope has at least a role-match analog within `lib/branding/` or `supabase/migrations/`. `screenshot.ts` is the most novel capability (no headless-browser code exists anywhere in this codebase), so its analog (`toPngBase64`'s fail-soft binary-producing shape) is a structural match only, not a literal precedent — the actual Playwright/Chromium implementation must come from RESEARCH.md's verified Code Examples section, not from codebase analogs.

## Metadata

**Analog search scope:** `lib/branding/` (all files read in full), `app/api/business/analyze-website/route.ts` (read in full), `supabase/migrations/*.sql` (3 targeted reads: business_branding original, fix_logo_type_constraint, onboarding composite-UNIQUE precedent), `supabase/migrations/20260605000000_business_accounts.sql` (business_paikka_links schema for backfill query), `lib/branding/scraper.test.ts` + `lib/branding/analyzer.test.ts` (test convention extraction)
**Files scanned:** 11
**Pattern extraction date:** 2026-06-16
