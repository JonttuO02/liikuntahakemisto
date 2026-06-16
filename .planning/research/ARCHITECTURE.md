# Architecture Patterns — v2.2 Onboarding-tekoälyn parannukset

**Project:** AKTIIVI — liikuntahakemisto
**Researched:** 2026-06-16
**Milestone:** v2.2 Onboarding-tekoälyn parannukset
**Confidence:** HIGH — based on direct codebase inspection (`app/business/WizardInner.tsx`, `app/api/business/analyze-website/route.ts`, `lib/branding/*`, `app/api/business/onboarding/*`, `supabase/migrations/20260606000000_onboarding.sql`, `supabase/migrations/20260615000001_business_branding.sql`)

---

## 0. Ground Truth: How `paikka_id` Actually Comes Into Existence

This is the single most important fact for this milestone, and it resolves question (d) outright.

**`paikka_id` and `business_paikka_links` are created BEFORE the onboarding wizard ever mounts — not inside it.**

Actual flow, traced through the code:

```
1. /business/rekisteroidy  → POST /api/business/register
   Creates business_accounts row ONLY. No paikka_id yet.

2. /business (dashboard, app/business/page.tsx)
   useEffect on mount:
     - if no business_paikka_links rows exist → renders <ClaimSearchForm /> inline
       (claim flow → POST /api/business/claim-paikka, or
        create flow → POST /api/business/create-paikka)
       Both routes INSERT business_paikka_links (paikka_id, business_account_id)
       atomically with the liikuntapaikat row (create-paikka) or against an
       existing one (claim-paikka). paikka_id is established HERE.
     - if a draft row already exists in onboarding_draft → router.push('/business/onboarding')
     - if links exist with no draft → shows venue list

3. /business/onboarding (app/business/onboarding/page.tsx)
   By the time this route is ever reached, business_paikka_links already has
   a row, so paikka_id is resolvable. Renders:
     'pre' phase  → <AnalysoiSivusto onConfirm={...} onSkip={...} />
     'wizard' phase → <WizardInner mode="onboarding" brandingData={...} />

4. WizardInner (OnboardingMode) resolves paikkaId on mount via:
   URL ?paikka_id= → else business_paikka_links lookup (limit 1) → else
   existingDraft.paikka_id. StepPaikka (step 1) is a READ-ONLY display of
   paikkaInfo — it does not create anything.
```

`onboarding_draft.paikka_id` is `NOT NULL REFERENCES liikuntapaikat(id)` (see `supabase/migrations/20260606000000_onboarding.sql` line 41) — a draft row physically cannot exist without a prior `liikuntapaikat` row. The wizard's `StepPaikka` component (`app/business/onboarding/StepPaikka.tsx`) has no form fields and no submit logic; it is a confirmation screen, not a creation step.

**Consequence for question (d):** Reordering `StepPaikka` before `AnalysoiSivusto` inside the onboarding page's local state machine does **not** change when `paikka_id` is created, because it was already created one screen earlier (on `/business`, via `ClaimSearchForm`). The reorder is a pure UI/UX sequencing change within an already-paikka_id-scoped context. **No draft-creation-order risk exists from this reorder.** The actual constraint to preserve is narrower: `business_branding` (analysis results) is keyed by `business_account_id` only (see §2), not `paikka_id`, so it has zero ordering dependency on `StepPaikka` either. The only thing the reorder changes is *when the user sees their own venue name* relative to *when they see the URL-analysis prompt* — purely presentational.

---

## 1. Wizard Composition: `WizardInner.tsx` Today

`app/business/WizardInner.tsx` exports a single component with two render paths selected by a discriminated union prop (`mode: 'onboarding' | 'edit'`):

- **`OnboardingMode`** — URL-step-routed (`?step=1..6`), `AnimatePresence mode="wait"` crossfade between steps, `maxReachedStep` guard against URL-skipping, draft re-fetch on `saveAndAdvance` and on entering step 6.
- **`EditMode`** — tab-bar navigation (no step gating), local state (`localHinnasto`, `localAukioloajat`, etc.) updated via `onSaveComplete`/`onSaveSuccess` callbacks from each step, has its own `PreviewModal` trigger.

Steps 2–6 (`StepMediat`, `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`, `StepEsikatselu`) are shared between both modes via an `editMode?: boolean` prop. `StepPaikka` is onboarding-only (edit mode shows a locked read-only block instead, inline in `EditMode`).

`app/business/onboarding/page.tsx` is the **actual page-level orchestrator** that sits above `WizardInner` for onboarding: it owns a local `pagePhase: 'pre' | 'wizard'` state and renders either `<AnalysoiSivusto>` or `<WizardInner mode="onboarding">`. This is the file that needs to change for the StepPaikka-before-URL-analysis reorder (see §6).

---

## 2. `business_branding` Schema: Keyed by Account, Not Venue

```sql
-- supabase/migrations/20260615000001_business_branding.sql
CREATE TABLE business_branding (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id  UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  website_url          TEXT NOT NULL,
  logo_url             TEXT,
  logo_type            TEXT CHECK (logo_type IN ('icon', 'icon_with_text', 'text_only')),
  colors               JSONB,
  raw_analysis         JSONB,
  status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'analyzed', 'failed')),
  error_message        TEXT,
  analyzed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_branding_unique_account UNIQUE (business_account_id)
);
```

Key facts:
- `UNIQUE (business_account_id)` — **one branding row per business account, period.** A business with multiple venues (multi-venue accounts are explicitly supported by `business_paikka_links`) can only ever have ONE branding analysis on file. This is already a latent multi-venue gap, separate from v2.2, but relevant because v2.2 adds *more* branding fields without addressing it. Not in scope to fix now, but should be flagged as a known limitation in any migration comment.
- `logo_type` CHECK constraint values (`'icon' | 'icon_with_text' | 'text_only'`) **do not match** the values actually written by the analyzer (`'wordmark' | 'icon' | 'combination' | 'unknown'` — see `lib/branding/analyzer.ts` line 22-23 `BrandingAnalysisResult['logo_type']`). This is a pre-existing schema/code mismatch from v2.1 — the CHECK constraint would currently reject every value the code ever writes except `'icon'`. **This must be fixed in the v2.2 migration regardless of the new features**, since any new migration touching this column should also correct the CHECK to match `prompt.ts`'s actual vocabulary, or the column would need `logo_type` to be unconstrained/widened.
- `colors JSONB` is currently a flat string array (`string[]`, hex codes, "most important first, max 5" per `lib/branding/prompt.ts`). No background/accent distinction exists today — this is exactly what feature 6 (2-color selection) needs to add.
- `logo_url TEXT` (singular) + the analyzer's `logo_index: number` (singular, picked server-side, no user choice) — this is exactly what feature 5 (multiple logo candidates) needs to change.
- `raw_analysis JSONB` already stores the *full* `BrandingAnalysisResult` object, including `prices`, `opening_hours`, `website_url`. This field is intentionally schema-flexible — new fields can be added to the JSON shape (multi-page content per page, multiple logo candidates, image list) **without an ALTER TABLE**, as long as you don't need to query/index by them. Only fields that need their own column, RLS exposure, or typed contract should get a real column.

### Schema Migration Decision (answers question a)

**Yes, a migration is required**, but it is additive, not destructive:

| New requirement | Schema approach |
|---|---|
| Multi-page scraping (feature 3) | No new column needed — `raw_analysis` JSONB already absorbs arbitrary extra structure (e.g. `pages: Array<{url, prices, opening_hours}>`). Multi-page inputs are a *pipeline* concern (scraper + prompt), not a storage concern, as long as the final merged result still fits the existing `prices`/`opening_hours`/`colors` shape. |
| General image discovery (feature 4) | New column: `image_urls JSONB` (or reuse `raw_analysis.images: string[]`) — recommend a dedicated column since Mediat step (StepMediat) needs to read this directly and it's a first-class candidate list, not an analysis byproduct. Add `image_urls JSONB` to `business_branding`. |
| Multiple logo candidates (feature 5) | New column: `logo_candidates JSONB` storing `Array<{url: string, type: string}>` (uploaded to Storage same as today, one entry per candidate) — replaces relying solely on `logo_url` singular. Keep `logo_url` as the *currently selected* logo (backward compatible with `StepEsikatselu`/`PreviewModal`/`DiagonaalKortti` consumers that only know about `logo_url`), and add `logo_candidates` as the new array the user picks from. This avoids breaking any existing read path. |
| 2-color selection (feature 6) | Schema change to `colors`: either (a) keep `colors JSONB` as the full palette array (works today, unchanged), and add two new columns `selected_background_color TEXT` + `selected_accent_color TEXT` to persist the *user's choice* of 2 colors from that palette, or (b) keep it all in `colors` and let the client always treat `colors[0]`/`colors[1]` as the selection. **Recommend (a) — explicit columns** because color selection is a user decision (made in the wizard, not by Claude), and conflating "palette Claude extracted" with "colors the user picked" in the same array is fragile (re-running analysis would clobber the user's choice). `selected_background_color`/`selected_accent_color` should be nullable, defaulting to `colors[0]`/`colors[1]` client-side until the user explicitly picks. |
| Logo CHECK constraint mismatch | Must widen/correct `logo_type` CHECK to `('wordmark', 'icon', 'combination', 'unknown')` to match `lib/branding/analyzer.ts`'s actual enum — this is a latent v2.1 bug, not new in v2.2, but any migration touching this table should fix it. |

**Recommended new migration** (e.g. `supabase/migrations/2026XXXXXXXXX_business_branding_v2.sql`):
```sql
ALTER TABLE business_branding
  DROP CONSTRAINT IF EXISTS business_branding_logo_type_check;
ALTER TABLE business_branding
  ADD CONSTRAINT business_branding_logo_type_check
    CHECK (logo_type IN ('wordmark', 'icon', 'combination', 'unknown'));

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS logo_candidates JSONB,
  ADD COLUMN IF NOT EXISTS image_urls JSONB,
  ADD COLUMN IF NOT EXISTS selected_background_color TEXT,
  ADD COLUMN IF NOT EXISTS selected_accent_color TEXT;
```
No RLS changes needed — existing policies (`auth.uid() = business_account_id`) already cover new columns on the same table.

---

## 3. Claude Prompt / Response Schema Changes (answers question b)

### Current pipeline (`lib/branding/analyzer.ts` + `lib/branding/prompt.ts`)

One Claude call (`claude-haiku-4-5-20251001`), vision + text, content array = `[...logoImageBlocks, textBlock]`. The text block is `BRANDING_ANALYSIS_PROMPT + '\n\nHTML snippet:\n' + htmlSnippet` where `htmlSnippet` is a single page's HTML sliced to 8000 chars. Response JSON shape today:

```json
{
  "logo_index": <int>,
  "logo_type": "wordmark"|"icon"|"combination"|"unknown",
  "colors": ["#hex", ...],
  "prices": [{"label","price"}],
  "opening_hours": [{"day","open","close"}],
  "website_url": "<string>"
}
```

### Required changes for multi-page input + multi-logo + 2-color (feature 3, 5, 6)

**Scraper changes (`lib/branding/scraper.ts`)** — needed before the prompt can change:
- Currently fetches exactly ONE URL. Feature 3 requires: parse `<a href>` tags from the homepage HTML, heuristically match link text/href against Finnish keywords (`hinnasto`, `hinnat`, `aukiolo`, `aukioloajat`, `yhteystiedot`, `yhteys`, `contact`, `pricing`, `hours`) — same regex-based approach already used for logo/colour extraction, no new dependency needed. Fetch up to ~3 additional pages in parallel (mirroring the existing `Promise.all` pattern used for CSS files), each capped similarly (size limit, 5-10s timeout, same stripped-HTML treatment).
- `ScrapeResult` needs a new shape: replace single `htmlSnippet: string` with `pages: Array<{ url: string; htmlSnippet: string }>` (homepage + matched subpages). Keep `logoUrls`/`logoBuffers`/`colors` extraction scoped to homepage only (these are typically only present in the `<head>`/header markup) — re-running logo/color extraction on subpages is unnecessary cost and noise. Feature 4 (general image discovery) should extend the *existing* `<img>` regex loop to also collect non-logo images (those without "logo" in src/alt/class) across the homepage AND matched subpages, capped at e.g. 10-15, deduplicated, with the same sharp-conversion pipeline (or skip conversion for non-logo images if a thumbnail isn't needed — they're just being surfaced for the user to optionally pick into Mediat, original format is fine since the Mediat upload step already does its own format handling).
- Page size/time budget: with Vercel Hobby's 10s `waitUntil` ceiling already flagged as a known limitation (`route.ts` comment, "Vercel Hobby tier... waitUntil functions time out at 10 seconds"), fetching 3-4 pages sequentially is risky. Fetch subpages in parallel (`Promise.all`, same pattern as the existing CSS-fetch step) and apply a tighter per-page timeout (e.g. 4-5s) to stay within budget. This is the most consequential pitfall of feature 3 — flag explicitly for PITFALLS.md.

**Prompt changes (`lib/branding/prompt.ts`)**:
- Text block must now describe MULTIPLE HTML snippets, each labeled with its source URL/page-type, so Claude can attribute extracted prices/hours to context (and merge/deduplicate across pages — e.g. don't double-count prices appearing on both homepage and a pricing subpage).
- `logo_index` semantics need to change from "pick the ONE best logo" to "rank/identify ALL plausible logo candidates" — since feature 5 wants the user to choose, not Claude. Recommend changing response shape to `logo_candidates: number[]` (ordered list of indices Claude considers plausible logos, best first) instead of a single `logo_index`. The scraper continues to send all logoBuffers as before; Claude's role shifts from "decide" to "rank/filter noise" (e.g. drop accidental matches like a partner-logo carousel image that matched the `logo` keyword by coincidence).
- `colors` extraction stays the same (full palette, max 5) — Claude is NOT asked to pick 2; that's a user decision in the UI (see schema §2's `selected_background_color`/`selected_accent_color`). No prompt change needed here beyond keeping the existing instruction.
- New response field needed: `image_urls: number[]` or equivalent — actually, since general images are extracted by the scraper (not vision-analyzed by Claude), Claude likely does NOT need to touch these at all. Recommend NOT sending general page images to Claude as vision input (cost/latency — only logo candidates are small enough in count to justify vision calls). Instead, `image_urls` should flow scraper → `BrandingAnalysisResult` → `business_branding.image_urls` directly, bypassing Claude entirely. This keeps the single-Claude-call architecture intact (still ONE call) while feature 4 is satisfied purely by scraper + storage changes.

### Revised response JSON shape

```json
{
  "logo_candidates": [0, 2],
  "logo_type": "wordmark"|"icon"|"combination"|"unknown",
  "colors": ["#hex", ...],
  "prices": [{"label","price"}],
  "opening_hours": [{"day","open","close"}],
  "website_url": "<string>"
}
```
(`image_urls` is NOT part of Claude's response — it's appended by the route handler from `scrapeWebsite()`'s own return value, alongside `logoBuffers`/`colors`.)

`BrandingAnalysisResult` (`lib/branding/analyzer.ts`) interface changes:
```typescript
export interface BrandingAnalysisResult {
  logo_candidates: number[]        // was: logo_index: number
  logo_type: 'wordmark' | 'icon' | 'combination' | 'unknown'
  colors: string[]
  prices: Array<{ label: string; price: string }>
  opening_hours: Array<{ day: string; open: string; close: string }>
  website_url: string
  raw_analysis: unknown
}
```
Validation logic in `analyzeWithClaude` (bounds-checking `logo_index`) becomes bounds-checking each entry of `logo_candidates` against `logoCandidatesBuffers.length`, filtering out-of-range entries rather than throwing (graceful degradation — if Claude hallucinates an index, drop it rather than fail the whole pipeline).

**`runAnalysis` in `route.ts`** changes from:
```ts
const logoPublicUrl = result.logo_index >= 0 ... ? await uploadLogo(...) : null
```
to: upload ALL of `result.logo_candidates`' buffers (each via `uploadLogo`), store the resulting URL array in `logo_candidates` JSONB column, and set `logo_url` to the FIRST uploaded candidate as a sane default (preserves backward compatibility for any consumer that only reads `logo_url`, e.g. `DiagonaalKortti`/`PaikkaKortti`/`PreviewModal` until those are updated to support selection).

**Backward compatibility note:** `GET /api/business/analyze-website` strips `logo_url` server-side unless it points to Supabase Storage (`SEC-46-02` guard in `route.ts` line 187-194) — this guard must be replicated for each URL inside the new `logo_candidates` array, not just the singular `logo_url`.

---

## 4. Live-Preview State Management (answers question c)

### The constraint

All 6 wizard steps (`StepPaikka`, `StepMediat`, `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`, `StepEsikatselu`) currently communicate upward via `onNext`/`onPrev`/`onSaveComplete` callback props, and `WizardInner.OnboardingMode` re-fetches the draft row from Supabase after each step's save (`saveAndAdvance`). There is no shared client-side store today — state flows are step-component-local until persisted, then re-read from the server.

Feature 8 (live preview reacting to every keystroke/selection across all steps, before the step is even saved) cannot use the existing "save then re-fetch" pattern — that pattern has Supabase round-trip latency and only updates on `onNext`, not on every field change. A genuinely live preview needs in-memory, cross-step state that updates synchronously as the user types/selects, independent of persistence.

### Recommended approach: React Context + reducer, scoped to the wizard tree only

Introduce a single `WizardPreviewContext` (new file, e.g. `app/business/onboarding/WizardPreviewContext.tsx`) that:
- Wraps `OnboardingMode`'s returned JSX (inside `WizardInner.tsx`, or one level up in `app/business/onboarding/page.tsx` so it also covers `AnalysoiSivusto`'s pre-step if its results should feed the preview immediately on confirm).
- Holds a single reducer-shaped state object mirroring the eventual `Liikuntapaikka` preview shape (the same shape `buildDraftAsPaikka`/`buildBrandingPreview` already construct) — e.g. `{ nimi, laji, osoite, logo_url, colors, hinta_kuvaus, aukioloajat, kuvaus, puhelin, varauslinkki, photo_urls }`.
- Exposes a `dispatch`/`updatePreview(partial)` function via context, NOT the full step data — each step calls `updatePreview({ hinta_kuvaus: computedString })` on every local field change (not just on submit), and the context re-renders only the preview pane subscriber.
- Each step component keeps its own local `useState` for form fields AS IT DOES TODAY (no rewrite of internal step logic needed) and additionally calls `updatePreview(...)` in the existing `onChange` handlers — this is an additive change to each step, not a structural rewrite.
- The preview pane component (new, e.g. `WizardLivePreview.tsx`) is the only consumer of the context's read side — it renders `CalloutCard`/`DiagonaalKortti` (per feature 1+8 combined) using the context state directly, no props from `WizardInner`.

This avoids prop-drilling (steps don't need to know about each other or about the preview pane — they only call one context function) and avoids duplicating `WizardInner` (the context wraps the *existing* tree, it doesn't replace the step-switch logic in `OnboardingMode`).

**Why Context over Zustand/Redux/URL state:**
- The state is tree-scoped (only matters inside the onboarding wizard subtree), short-lived (discarded after submit), and has a small number of consumers (6 step writers, 1 preview reader) — textbook Context use case, no need for an external state library dependency in a Next.js 14 / React 18 codebase that has no existing global client store.
- URL state (`?step=`) already exists for step routing — do not also try to encode live-preview data in the URL; it would bloat URLs and isn't shareable/bookmarkable data anyway.
- Avoid `layout`-animating the preview pane on every keystroke (per CLAUDE.md animation rules — "no `layout` animations unless absolutely required"); use plain re-render, not Framer Motion `layout` prop, for the preview content updates.

**Responsive split (desktop side-by-side, mobile toggle):**
- Implement at the layout level in `app/business/onboarding/page.tsx` (or a new wrapper), NOT inside `WizardInner`: a CSS grid/flex with `lg:grid-cols-2` showing `<WizardInner>` left + `<WizardLivePreview>` right on desktop, and on mobile a single column with a toggle button (sticky bottom, similar pattern to the existing `MutedButton`/`PrimaryButton` footer convention) that swaps between "Muokkaa" and "Esikatselu" views — reuse the project's existing `AnimatePresence mode="wait"` crossfade convention (already used in `WizardInner.OnboardingMode` step transitions) for the mobile toggle, not a new animation pattern.

**Initial seed of context state:** When `brandingData` is present (from `AnalysoiSivusto`), seed the context's initial state from `buildBrandingPreview` (already exists in `lib/branding/brandingResult.ts`) instead of starting empty — this means the live preview shows branding-derived data immediately on wizard mount, before the user touches any step, which is the expected UX once features 1+2+8 are combined (URL analysis happens after StepPaikka, but its results should populate the preview the moment `AnalysoiSivusto.onConfirm` fires).

**Where to mount the Provider:** Mount `WizardPreviewProvider` in `app/business/onboarding/page.tsx`, wrapping BOTH `AnalysoiSivusto` and `WizardInner` — this lets `AnalysoiSivusto`'s confirm step seed initial preview state via context dispatch (instead of only via the `brandingData` prop passed to `WizardInner`), unifying the data path. `WizardInner`'s `brandingData` prop can remain for the steps that need raw branding fields (prices/hours prefill, which is separate from the live-preview rendering concern) — the context is additive, not a replacement for the existing prop-drilling of `brandingData` into individual steps for prefill purposes.

---

## 5. Feature-by-Feature Integration Map

### Feature 1 — Replace step-6 preview's PaikkaKortti with CalloutCard

`StepEsikatselu.tsx` currently renders `PaikkaKortti`, `DiagonaalKortti`, `PaikkaSheet` (three sections). Swapping `PaikkaKortti` → `CalloutCard` requires resolving a type mismatch: `CalloutCard` requires `p: Liikuntapaikka & { latitude: number; longitude: number }` (non-nullable coordinates), while `draftAsPaikka` (built by `buildDraftAsPaikka`/`buildBrandingPreview`) types `latitude`/`longitude` as `number | null` (inherited from `PaikkaBase`). A new venue created via `create-paikka` has no guaranteed lat/lng (the route only requires `nimi`/`osoite`/`kaupunki` — no geocoding step exists in this codebase for business-created venues). **This must be guarded**: render `CalloutCard` only when `draftAsPaikka.latitude != null && draftAsPaikka.longitude != null`, else fall back to the current `PaikkaKortti` (or a static placeholder) — do not change `CalloutCard`'s prop type to accept nullable coords, since its production usage (map callouts) legitimately requires real coordinates. `PreviewModal.tsx` (used elsewhere for venue preview, e.g. `/business` dashboard "Esikatselu" button) is a separate consumer of `PaikkaKortti`/`DiagonaalKortti` and is NOT in scope per the milestone description (only "step 6's preview"), but note it renders the exact same trio — if `CalloutCard` swap improves StepEsikatselu, a follow-up consistency pass on `PreviewModal` may be expected later; flag but do not action without explicit scope confirmation.

### Feature 2 — Reorder StepPaikka before URL-analysis; add quick-accept shortcut

Change is entirely in `app/business/onboarding/page.tsx`: flip `pagePhase` initial value and render order so `StepPaikka` (extracted as its own phase, or kept inside `WizardInner` as step 1 but rendered before `AnalysoiSivusto` is shown) displays first, then `AnalysoiSivusto`, then the rest of the wizard (steps 2-6). Concretely: introduce a 3-phase state `'paikka' | 'pre' | 'wizard'` instead of today's 2-phase `'pre' | 'wizard'`. `StepPaikka` already requires `paikkaId`/`paikkaInfo` — both already resolvable at this point per §0, so no new data-fetching is needed, just reordering of which phase renders first. The "quick accept" shortcut is new: add a button in `AnalysoiSivusto`'s `preview` phase (next to "Jatka velhoon →") that calls a new lightweight submit path — directly POSTing the branding-derived fields straight into `liikuntapaikat` (reusing the same field-mapping logic `buildBrandingPreview` already does, but writing instead of just rendering) and routing to "pending admin review" without visiting steps 2-6. This likely needs a new Route Handler (e.g. `POST /api/business/onboarding/quick-accept`) that mirrors `submit/route.ts`'s atomic-commit-then-notify pattern but sources its data from `business_branding.raw_analysis` instead of `onboarding_draft` (no draft exists yet if the user skips steps 2-6 entirely — confirm whether a draft row needs to be synthesized first for `business_paikka_links.claim_status` reset logic to fire identically, or whether quick-accept duplicates that one `UPDATE business_paikka_links SET claim_status='pending'` call directly).

### Feature 3 — Multi-page scraping

See §3 in full. Core change: `lib/branding/scraper.ts` returns `pages: Array<{url, htmlSnippet}>` instead of single `htmlSnippet`; `lib/branding/prompt.ts` instructs Claude to read multiple labeled snippets and merge/deduplicate extracted prices/hours across them; `lib/branding/analyzer.ts`'s text block construction loops over `pages` instead of interpolating one string.

### Feature 4 — Image discovery for Mediat step

Scraper change only (no Claude involvement — see §3 reasoning). `ScrapeResult` gains `imageUrls: string[]` (general `<img>` tags, logo-keyword-excluded, deduplicated, capped ~10-15). Route handler (`route.ts`) passes this through to the `business_branding.image_urls` JSONB column (new, per §2) instead of (or alongside) `raw_analysis`. `StepMediat.tsx` needs a new prop, e.g. `brandingImageUrls?: string[]`, threaded from `WizardInner.OnboardingMode` (which already receives `brandingData` — extend `BrandingResult` client type in `lib/branding/brandingResult.ts` to include `image_urls: string[] | null`) — rendered as selectable thumbnails the user can promote into `photoFiles`/`existingPhotoUrls` state (note: these are remote URLs, not `File` objects, so `StepMediat` needs a new code path to copy a selected remote URL into Supabase Storage under the venue's own path, OR simply accept storing the external/scraped URL directly in `photo_urls` if hot-linking from the source site is acceptable — recommend copying into Storage for consistency with how all other photos are stored and to avoid the source site's image disappearing later).

### Feature 5 — Multiple logo candidates

See §2 (schema) and §3 (prompt/response). UI change: `AnalysoiSivusto`'s preview phase and/or a step in the wizard needs a logo picker (radio/grid of thumbnails) instead of the current single `<img src={brandingResult.logo_url}>` display. `BrandingResult` client type needs `logo_candidates: string[] | null` (array of Storage URLs, mirroring how `logo_url` works today). Selection writes back via a new lightweight PATCH (e.g. extend `save-step`'s `ALLOWED_FIELDS` or add a dedicated branding-update route) — recommend a dedicated `PATCH /api/business/branding` route scoped to `business_branding` rather than overloading `onboarding_draft`'s `save-step` route, since branding selection is conceptually a business_branding concern, not a draft-step concern, and `save-step`'s `ALLOWED_FIELDS` allowlist is intentionally narrow for security (T-34-05-02 mitigation already documented in that file).

### Feature 6 — 2-color selection

See §2 schema (`selected_background_color`/`selected_accent_color` columns). UI: a color-swatch picker reading from `colors` (the existing extracted palette, already rendered today in `AnalysoiSivusto`'s preview as clickable-looking swatches — currently just `<div style={{backgroundColor: hex}}>` with no click handler). Add `onClick` to mark "background" vs "accent" selection (e.g. first click = background, second = accent, or two explicit labeled slots). Persisted via the same dedicated branding-update route as feature 5. Consumers (`DiagonaalKortti brandColor` prop, currently single `colors[0]`) need updating to accept two colors once this lands — `DiagonaalKortti`'s existing `brandColor?: string` prop and `getContrastColor` YIQ utility (`lib/branding/brandingResult.ts`) already provide the contrast-text infrastructure; extend with a second `accentColor?: string` prop for whichever element (CTA, price text, etc.) should use the accent rather than background color.

### Feature 7 — Logo-on-white-background contrast bug fix

This is the YIQ-contrast logic already present (`getContrastColor` in `lib/branding/brandingResult.ts`) being applied to the WRONG surface. The bug is specifically about the *preview's white card background* clashing with a white/transparent logo — i.e., the logo image itself needs a contrast-aware container background (e.g. a subtle dark chip behind a transparent-background logo when the logo's average/edge pixel color is too close to white), NOT the existing `getContrastColor` (which computes text color against a brand color background, a different problem). This likely needs new client-side logic: either (a) sample the logo image's corner/edge pixels via Canvas API to detect near-white content and conditionally apply a `bg-[rgba(0,0,0,0.04)]` or bordered chip behind the `<img>`, or (b) simpler and more robust — always render logo previews inside a fixed light-gray chip (`bg-[rgba(0,0,0,0.03)] rounded-lg p-2`) regardless of detected color, sidestepping runtime pixel-sampling entirely. Recommend (b) for simplicity and to avoid canvas/CORS complications with Supabase Storage-hosted images (Storage URLs are same likely already permissive, but pixel-reading via canvas requires the image to be fetched with appropriate CORS headers — Supabase Storage's public bucket should be fine, but it adds a fragile runtime dependency for a cosmetic fix). This is a presentational-only change isolated to `StepEsikatselu`/`AnalysoiSivusto`/`PreviewModal`'s logo `<img>` rendering — no schema or pipeline change needed.

### Feature 8 — Live preview pane

See §4 in full.

---

## Integration Points: New vs Modified Components

### New Files

| File | Purpose |
|---|---|
| `app/business/onboarding/WizardPreviewContext.tsx` | Context + reducer holding live cross-step preview state (feature 8) |
| `app/business/onboarding/WizardLivePreview.tsx` | Preview pane component consuming the context, renders CalloutCard/DiagonaalKortti |
| `app/api/business/branding/route.ts` (PATCH) | Dedicated route for logo-candidate selection + 2-color selection writes to `business_branding` (features 5, 6) |
| `app/api/business/onboarding/quick-accept/route.ts` (POST) | Atomic commit straight from `business_branding` to `liikuntapaikat`, bypassing steps 2-6 (feature 2's quick-accept shortcut) |
| `supabase/migrations/2026XXXXXXXXX_business_branding_v2.sql` | Adds `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color`; fixes `logo_type` CHECK constraint |

### Modified Files

| File | Change | Risk |
|---|---|---|
| `lib/branding/scraper.ts` | Multi-page link-following (feature 3); general image collection (feature 4); `ScrapeResult` shape change (`htmlSnippet` → `pages[]`, add `imageUrls`) | Medium — touches SSRF-adjacent fetch logic; must apply same per-page timeout/size guards already in place for the homepage fetch |
| `lib/branding/prompt.ts` | Multi-page-aware instructions; `logo_index` → `logo_candidates` array semantics | Medium — prompt regressions are silent (bad JSON parses or wrong extraction), needs eval against current `analyzer.test.ts` fixtures plus new multi-page fixtures |
| `lib/branding/analyzer.ts` | `BrandingAnalysisResult.logo_index: number` → `logo_candidates: number[]`; bounds-check becomes a filter not a throw; text block built from `pages[]` loop | Medium — breaking type change, all call sites must update |
| `app/api/business/analyze-website/route.ts` | `runAnalysis` uploads multiple logo candidates (loop instead of single `uploadLogo` call); writes new columns (`logo_candidates`, `image_urls`, color selection defaults); `GET` handler's `SEC-46-02` Storage-origin guard must apply per-URL across the new `logo_candidates` array | Medium-High — this is the core pipeline file; waitUntil 10s budget gets tighter with multi-page fetch, needs careful timeout tuning |
| `lib/branding/brandingResult.ts` | `BrandingResult` client type gains `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color`; `buildBrandingPreview` needs to accept selected colors (not just `colors[0]`) | Low-Medium — additive type fields, but `buildBrandingPreview`'s signature/behavior changes |
| `app/business/onboarding/AnalysoiSivusto.tsx` | Logo picker UI (radio/grid instead of single img); color swatches become clickable (2-selection); add "quick accept" button in preview phase | Medium — meaningful new UI/state inside an already-complex state machine component |
| `app/business/onboarding/page.tsx` | 3-phase state (`paikka`/`pre`/`wizard`) instead of 2-phase; mounts `WizardPreviewProvider`; responsive split layout (desktop side-by-side / mobile toggle) | Medium — orchestration change, but isolated to this one file |
| `app/business/onboarding/StepEsikatselu.tsx` | `PaikkaKortti` → `CalloutCard` with nullable-coords guard/fallback; reads from `WizardPreviewContext` instead of (or in addition to) local `draftAsPaikka` computation | Medium |
| `app/business/onboarding/StepPaikka.tsx`, `StepMediat.tsx`, `StepHinnasto.tsx`, `StepAukioloajat.tsx`, `StepYhteystiedot.tsx` | Each gains a call to `updatePreview(...)` from `WizardPreviewContext` on field change, for live preview (feature 8); `StepMediat` additionally gains `brandingImageUrls` prop + "promote scraped image" flow (feature 4) | Low per-file (additive), but touches all 5 remaining step files |
| `app/components/DiagonaalKortti.tsx` | Add `accentColor?: string` prop alongside existing `brandColor?: string` (feature 6); logo contrast-chip background (feature 7) | Low |
| `app/components/CalloutCard.tsx` | No prop signature change needed — already accepts `Liikuntapaikka & {latitude:number, longitude:number}`; consumers must satisfy this, not the component itself | None (caller-side concern only) |

### Unmodified (confirmed by inspection)

`app/business/WizardInner.tsx`'s core step-switch/routing logic (`OnboardingMode`/`EditMode` split, `maxReachedStep` guard, `goToStep`) does not need structural changes — the context provider wraps around it, it doesn't replace it. `app/api/business/onboarding/save-step/route.ts` and `submit/route.ts` are unaffected (draft-scoped persistence semantics unchanged; the new quick-accept path is a parallel route, not a modification of `submit`). `EditMode` (the post-approval edit wizard) is entirely out of scope for v2.2 per the milestone description (all 8 features target onboarding, not edit) — confirm this assumption before implementation, since `StepMediat`/`StepHinnasto`/etc. are shared between both modes and any new props (e.g. `brandingImageUrls`) must default to safe no-ops in `editMode=true`.

---

## Build Order (Dependency-Aware)

```
1. supabase/migrations/2026XXXXXXXXX_business_branding_v2.sql
   (logo_type CHECK fix + logo_candidates + image_urls + selected_*_color columns)
   ↓
2. lib/branding/scraper.ts — multi-page link following + general image collection
   (ScrapeResult shape change: htmlSnippet → pages[], add imageUrls)
   ↓
3. lib/branding/prompt.ts — multi-page-aware prompt + logo_candidates array semantics
   ↓
4. lib/branding/analyzer.ts — BrandingAnalysisResult type change, bounds-check-as-filter
   (analyzer.test.ts fixtures must be updated/extended here — existing test file confirms
    a test suite already exists and must not silently break)
   ↓
5. app/api/business/analyze-website/route.ts — runAnalysis loop-uploads logo_candidates,
   writes new columns; GET handler extends SEC-46-02 guard to array
   (steps 2-5 form one deployable unit — the pipeline. Can ship and verify in isolation
    via the existing POST/GET endpoints before touching any UI.)
   ↓
6. lib/branding/brandingResult.ts — BrandingResult client type + buildBrandingPreview
   signature update (selected colors, logo_candidates, image_urls)
   ↓
7. app/business/onboarding/AnalysoiSivusto.tsx — logo picker UI, clickable color swatches,
   quick-accept button
   ↓
8. app/api/business/onboarding/quick-accept/route.ts — new route for feature 2's shortcut
   (depends on step 6's updated BrandingResult shape to know what to copy into liikuntapaikat)
   ↓
9. app/api/business/branding/route.ts (PATCH) — persists logo/color selection
   (depends on step 1's new columns existing)
   ↓
10. app/business/onboarding/WizardPreviewContext.tsx + WizardLivePreview.tsx — new context/
    preview pane (feature 8 foundation)
    ↓
11. app/business/onboarding/page.tsx — 3-phase reorder (StepPaikka before AnalysoiSivusto),
    mount WizardPreviewProvider, responsive split/toggle layout
    (depends on step 10 existing; depends on step 7's quick-accept button being wired)
    ↓
12. app/business/onboarding/StepEsikatselu.tsx — CalloutCard swap with coords guard,
    read from WizardPreviewContext
    ↓
13. StepPaikka.tsx, StepMediat.tsx, StepHinnasto.tsx, StepAukioloajat.tsx,
    StepYhteystiedot.tsx — wire updatePreview() calls into existing onChange handlers
    (can be done incrementally, one step file at a time, after step 10 lands)
    ↓
14. StepMediat.tsx — brandingImageUrls prop + promote-scraped-image flow (feature 4 UI)
    (depends on step 6's BrandingResult.image_urls existing)
    ↓
15. DiagonaalKortti.tsx — accentColor prop + logo contrast-chip background (features 6, 7)
    (can ship independently/early — has no dependency on the context/pipeline work;
     could be done in parallel with steps 2-9 if desired)
```

**Phase ordering rationale:**

The migration (step 1) must land first because every downstream pipeline change writes to the new columns. The pipeline (steps 2-6) is the highest-technical-risk, most testable-in-isolation unit — it has an existing test file (`lib/branding/analyzer.test.ts`, `lib/branding/scraper.test.ts`) and existing POST/GET Route Handler contracts, so it can be fully verified via the GET endpoint's JSON response before any UI consumes it. Do this first and verify it thoroughly; every other feature depends on its output shape.

The live-preview context (steps 10-13) is independent of the pipeline changes in principle (it's plumbing for whatever state already exists), but is sequenced after the pipeline so that `WizardLivePreview` and `buildBrandingPreview` can be built against the FINAL `BrandingResult` shape rather than being built twice.

The StepPaikka/AnalysoiSivusto reorder (step 11) is sequenced late because it is presentation-only (per §0, it carries zero data-dependency risk) and benefits from the live-preview plumbing already existing so the reordered flow can show a populated preview pane immediately, which is presumably the point of doing the reorder in the first place (UX: "see your own venue, then see AI analysis feed into a live preview, in one continuous flow").

`DiagonaalKortti`'s `accentColor`/logo-contrast-chip work (step 15) has no upstream dependency on the rest of the plan and is the lowest-risk, most isolated change — it could be done first or last without affecting sequencing of anything else; placed last here only because it's cosmetic polish, not because it's blocked.

The quick-accept route (step 8) depends on the pipeline's final response shape (step 6) since it needs to read `business_branding`'s columns to know what to copy into `liikuntapaikat` — sequenced directly after the type is finalized, before any UI wiring, so the route can be tested via direct API calls first.

---

## Architecture Decisions to Record

| Decision | Rationale |
|---|---|
| StepPaikka-before-URL-analysis reorder carries zero draft-creation-order risk | `paikka_id`/`business_paikka_links` are created on `/business` dashboard via `ClaimSearchForm`, strictly before the onboarding wizard route is ever reachable — confirmed via `app/business/page.tsx`, `claim-paikka/route.ts`, `create-paikka/route.ts` |
| `business_branding` stays keyed by `business_account_id`, not `paikka_id` | Existing `UNIQUE(business_account_id)` constraint is unchanged by v2.2 — known multi-venue limitation, out of scope to fix here |
| `image_urls` (general page images) bypass Claude entirely | Scraper-only extraction; avoids adding vision-call cost/latency for content that doesn't need AI judgment, keeps the "one Claude call" architecture intact |
| `logo_index: number` → `logo_candidates: number[]` | Claude's role shifts from "decide the one logo" to "rank/filter candidates"; final choice becomes a user decision in the UI, matching feature 5's intent |
| 2-color selection is a user action, not a Claude output | `colors` (full palette) stays Claude's job; `selected_background_color`/`selected_accent_color` are new dedicated columns set by the user via a new PATCH route — prevents conflating "what Claude extracted" with "what the user chose," which would break on re-analysis |
| Live preview uses React Context + reducer, not Zustand/Redux/URL state | Tree-scoped, short-lived, small consumer count — matches existing codebase conventions (no global client store currently exists); avoids new dependency |
| `WizardPreviewContext` wraps existing `WizardInner` tree rather than replacing it | Step components keep local `useState` + add one `updatePreview()` call each — avoids duplicating `WizardInner`'s step-switch/routing logic per the question's explicit constraint |
| `CalloutCard` swap in StepEsikatselu needs a nullable-coords guard, not a prop-type change to `CalloutCard` itself | `CalloutCard`'s production usage (map callouts) legitimately requires non-null coordinates; business-created venues have no guaranteed lat/lng (no geocoding step in `create-paikka`) |
| Logo-on-white contrast fix uses a fixed light-gray chip behind the logo, not runtime pixel sampling | Avoids Canvas/CORS fragility against Supabase Storage URLs; simpler, deterministic, no new failure mode |
| New migration also fixes the `logo_type` CHECK constraint mismatch | Pre-existing v2.1 bug (constraint values don't match `analyzer.ts`'s actual enum) — any migration touching this column should correct it rather than compound the drift |

---

## Sources

- Direct codebase inspection: `app/business/WizardInner.tsx`, `app/business/onboarding/page.tsx`, `app/business/onboarding/AnalysoiSivusto.tsx`, `app/business/onboarding/StepPaikka.tsx`, `app/business/onboarding/StepMediat.tsx`, `app/business/onboarding/StepEsikatselu.tsx`, `app/business/page.tsx`, `app/api/business/analyze-website/route.ts`, `app/api/business/claim-paikka/route.ts`, `app/api/business/create-paikka/route.ts`, `app/api/business/register/route.ts`, `app/api/business/onboarding/save-step/route.ts`, `app/api/business/onboarding/submit/route.ts`, `lib/branding/scraper.ts`, `lib/branding/analyzer.ts`, `lib/branding/prompt.ts`, `lib/branding/brandingResult.ts`, `lib/onboardingUtils.ts`, `app/components/CalloutCard.tsx`, `app/components/DiagonaalKortti.tsx`, `app/components/PreviewModal.tsx`, `supabase/migrations/20260606000000_onboarding.sql`, `supabase/migrations/20260615000001_business_branding.sql`
- `.planning/PROJECT.md` — v2.2 milestone goal and target features list; v2.1 "Validated" requirements (SCRAP-01..05, ONBOARD-08..13, PREV-01) confirming the current pipeline's exact scope before this milestone's extensions
- Confidence: HIGH for all sections — based on direct code inspection of the exact files this milestone will modify, not inference. The one area flagged MEDIUM confidence is the precise Vercel `waitUntil` 10s budget impact of multi-page fetching (feature 3) — this is a stated *existing* limitation in the codebase's own comments, but the exact safe page-count/timeout tuning needed has not been load-tested and should be validated empirically during implementation, not assumed from this research alone.
