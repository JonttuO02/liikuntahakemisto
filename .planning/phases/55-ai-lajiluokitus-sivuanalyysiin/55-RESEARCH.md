# Phase 55: AI-lajiluokitus sivuanalyysiin - Research

**Researched:** 2026-06-23
**Domain:** Additive feature on existing Claude API branding-analysis pipeline (Next.js/Supabase) — sport-category suggestion + user confirmation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** In `AnalysoiSivusto.tsx`'s `preview` phase (`PreviewPhaseContent`/`editContent`), add a distinct suggestion card — separate from the logo/color/gallery pickers — showing "Ehdotettu laji: {label}" with two explicit actions: **Vahvista** (accept the AI's pick) and **Vaihda** (opens the category picker). This is a new interaction pattern on this screen (logo/colors use pre-selected-and-changeable pills/swatches instead), chosen deliberately because the ROADMAP calls for an "erottuva ehdotus-elementti" (a distinguishable suggestion element), not a blended pre-filled control.
- **D-02:** "Vaihda" opens a picker listing all 9 `lib/lajit.ts` taxonomy categories (padel, tennis, jooga, kuntosali, uinti, kiipeily, jääkiekko, liikuntahalli, liikunta) **plus a free-text input** for categories not on the list. The free-text path is a user-facing escape hatch only — see D-07, Claude's own suggestion must never be free text.
- **D-03 (fallback):** If Claude's analysis omits `laji`, returns a value outside the 9 taxonomy keys, or the site gives no sport-specific signal, the suggestion card does NOT show a pre-confirmed pick — render it in an "unconfirmed" state (no taxonomy label, no "Vahvista" target) that forces the user into the Vaihda picker (taxonomy list + free text) before they can continue. Never silently default to `'liikunta'`/`'liikuntahalli'`/`'Muu'`.
- **D-07:** `lib/branding/prompt.ts`'s `BRANDING_ANALYSIS_PROMPT` gets a new `laji` field added to its JSON schema, with the prompt enumerating the exact 9 `lib/lajit.ts` keys as the only valid values (or `null`/omitted if uncertain) — mirrors the existing `type`/`role` enum-constrained fields for `logos`/`colors`. `lib/branding/analyzer.ts`'s `analyzeWithClaude` validates the returned value against the same 9-key allowlist (same pattern as `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES`), discarding anything that doesn't match rather than passing through arbitrary text — satisfies AI-06/criterion 1 ("ei vapaata tekstiä"). `BrandingAnalysisResult`/`BrandingResult` gain a `suggested_laji: string | null` field (analogous to `logo_type`).
- **D-04:** `laji` is added to `app/api/business/onboarding/save-step/route.ts`'s `ALLOWED_FIELDS` (alongside `media_urls`/`hinnasto`/`aukioloajat`/`yhteystiedot`) and to `app/api/business/onboarding/submit/route.ts`'s `liikuntapaikat` UPDATE — same deferred-to-submit pattern as every other onboarding field. No immediate autosave PATCH — confirming/changing laji in the UI writes to `onboarding_draft` via `save-step`, and only lands in `liikuntapaikat.laji` when the user finishes the whole flow via `submit`. This satisfies success criterion 3 by construction.
  - Both the quick-accept path (`AnalysoiSivusto.handleQuickAccept`'s `fieldsToWrite`) and the "Jatka velhoon" full-wizard path need the confirmed `laji` value included in their `save-step` writes.
- **D-05:** "Analysoi uudelleen" resets the confirmed/unconfirmed laji selection exactly like it already resets `selectedLogoUrl`/`bgColor`/`accentColor` (see `onReanalyze`'s reset block) — a fresh analysis re-suggests from scratch rather than preserving a stale pick across re-runs.
- **D-06:** The "Ohita" (skip analysis entirely) path also needs a manual category picker — otherwise `laji` stays permanently `'Muu'` with zero way to fix it anywhere in the app. Reuse the same Vaihda picker UI (9 taxonomy categories + free text) without an AI suggestion badge. Exact placement is left to the planner (Claude's Discretion).

### Claude's Discretion

- Exact placement/component for the skip-path manual picker (D-06) — must reuse the same taxonomy-list-plus-free-text UI as the Vaihda picker, must write through the same `laji` `save-step` field, and must be presented before final submit. Whether it's a new small step component or an addition to an existing one is an implementation choice.
- Exact wiring of the full-wizard path's `laji` write (which component/handler calls `save-step` with `field: 'laji'` when the user clicks "Jatka velhoon →") — likely `page.tsx`'s `handleConfirm`, following the existing `media_urls` write's await-before-navigate pattern, but left to the planner.
- Visual styling of the suggestion card and the Vaihda picker (badge shape, picker as modal/dropdown/inline pill list) — follow CLAUDE.md's glassmorphism system and existing `editContent` patterns (LabelCaps, PrimaryButton/MutedButton) in `AnalysoiSivusto.tsx`; no new visual language.
- Whether `suggested_laji` validation happens entirely in `analyzeWithClaude` (server) or also re-validated client-side before persisting — server-side allowlist validation is required (D-07); client-side defense-in-depth is optional.

### Deferred Ideas (OUT OF SCOPE)

None — the skip-path manual picker (D-06) was initially flagged as a possible scope-creep candidate but the user explicitly chose to include it.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-06 | AI-sivuanalyysi ehdottaa lajikategoriaa paikan verkkosivun perusteella; käyttäjä vahvistaa tai vaihtaa sen onboardingissa | Exact prompt/schema location (`lib/branding/prompt.ts`), validation pattern (`analyzer.ts` steps 6-7), exact persistence wiring (`save-step`/`submit` routes), exact UI insertion points (`AnalysoiSivusto.tsx`, `page.tsx handleConfirm`, `StepPaikka.tsx`/skip path) all confirmed below with line-accurate current state. |

</phase_requirements>

## Summary

This phase is purely additive work on an existing, working Claude Haiku branding-analysis pipeline (built in Phases 44-46, extended in 47-51). No new libraries, no new AI framework, no new architecture — every piece of plumbing this phase needs (allowlist validation, JSONB draft staging, deferred-to-submit persistence, autosave-vs-defer pattern split) already exists in the codebase and just needs one more field threaded through it.

The work spans exactly six files plus two small migrations: `lib/branding/prompt.ts` (add `laji` to the JSON schema), `lib/branding/analyzer.ts` (validate against the 9-key allowlist, same pattern as `VALID_LOGO_TYPES`), `lib/branding/brandingResult.ts` (add `suggested_laji` to the client-safe type), `app/api/business/analyze-website/route.ts` (persist `suggested_laji` to `business_branding`, add to GET `.select()`), `app/api/business/onboarding/save-step/route.ts` (add `'laji'` to `ALLOWED_FIELDS`), `app/api/business/onboarding/submit/route.ts` (read `draft.laji` into the `liikuntapaikat` UPDATE, guarding against null-overwrite), `app/business/onboarding/AnalysoiSivusto.tsx` (new suggestion card + Vaihda picker + reanalyze reset + quick-accept field), `app/business/onboarding/page.tsx` (`handleConfirm` laji write + skip-path picker), and `app/business/onboarding/StepPaikka.tsx` or a new step (skip-path picker placement, planner's discretion).

**Primary recommendation:** Follow the exact allowlist-and-filter pattern already used for `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES` in `analyzer.ts` for `suggested_laji`, derive the allowlist from `Object.keys(lajiKonfig)` (not a hardcoded array) so the taxonomy never drifts out of sync, and route every laji write through the existing `save-step`-then-`submit` deferred pattern — never an immediate PATCH like logo/colors use, since D-04 requires the unconfirmed-until-submit invariant.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Claude prompt schema (suggest a laji) | API / Backend | — | `lib/branding/prompt.ts` is server-only, sent to Anthropic API from a Route Handler |
| Suggestion validation (9-key allowlist) | API / Backend | — | `analyzer.ts`'s `analyzeWithClaude` runs server-side; must never trust raw Claude output |
| Suggestion persistence (`suggested_laji`) | Database / Storage | API / Backend | New `business_branding.suggested_laji` column; written by the `runAnalysis` background pipeline via `supabaseAdmin` |
| Suggestion display + confirm/change UI | Browser / Client | — | `AnalysoiSivusto.tsx` `'use client'` component renders the card/picker |
| Confirmed value staging (`onboarding_draft.laji`) | Database / Storage | API / Backend | New nullable column; written via existing `save-step` Route Handler pattern |
| Confirmed value commit (`liikuntapaikat.laji`) | API / Backend | Database / Storage | `submit/route.ts`'s atomic UPDATE — the only path that may ever write `liikuntapaikat.laji` post-creation |
| Skip-path manual picker | Browser / Client | API / Backend | Same picker UI as Vaihda; same `save-step` write target |

## Standard Stack

This phase introduces **no new dependencies**. It extends:

### Core (existing, unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.97.1` [VERIFIED: package.json] | Claude API client used by `analyzer.ts` | Already the project's locked AI integration; no change needed |
| `next` | (project's existing Next.js version) | App Router, Route Handlers | Existing onboarding API routes already use this pattern |
| `@supabase/supabase-js` (via `supabaseAdmin`) | (existing) | DB writes | Existing service-role write pattern |

### Supporting
No new supporting libraries required. `lib/lajit.ts`'s existing `lajiKonfig` export is the taxonomy source of truth — no new taxonomy/config library needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hardcoding the 9-key allowlist as a literal array in `analyzer.ts` | `Object.keys(lajiKonfig)` from `lib/lajit.ts` | Importing the live keys avoids drift if `lib/lajit.ts` ever gains/loses a category — server-only `analyzer.ts` can safely import a non-server-only module |

**Installation:** None — no new packages.

## Package Legitimacy Audit

Not applicable — this phase installs zero external packages. All work extends existing first-party code and existing dependencies already vetted in prior phases (44-51).

## Architecture Patterns

### System Architecture Diagram

```
[User enters URL] → AnalysoiSivusto.handleSubmit
        │
        ▼
POST /api/business/analyze-website  (route.ts)
        │  waitUntil(runAnalysis(...))  — fire-and-forget background pipeline
        ▼
runAnalysis: scrapeWebsite → captureScreenshot → analyzeWithClaude(prompt+images+html)
        │
        ▼
analyzeWithClaude (analyzer.ts)
   - calls Anthropic API with BRANDING_ANALYSIS_PROMPT (+ new `laji` field instructions)
   - parses JSON response
   - [NEW] validates result.laji against Object.keys(lajiKonfig) → suggested_laji: string|null
        │
        ▼
business_branding UPSERT  (status='analyzed', ...existing columns..., suggested_laji)
        │
        ▼
GET /api/business/analyze-website  →  BrandingResult { ..., suggested_laji }
        │
        ▼
AnalysoiSivusto preview phase (PreviewPhaseContent/editContent)
   - [NEW] Suggestion card: shows suggested_laji label, or "unconfirmed" state if null/invalid (D-03)
   - [NEW] Vahvista → confirmedLaji = suggested_laji
   - [NEW] Vaihda → picker (9 taxonomy keys + free text) → confirmedLaji = picked value
        │
        ├─→ "Jatka velhoon →" (handleConfirm in page.tsx)
        │       └─→ POST save-step { field: 'laji', value: confirmedLaji }  (await before navigate)
        │
        └─→ "Hyväksy ja lähetä" (handleQuickAccept)
                └─→ fieldsToWrite += { field: 'laji', value: confirmedLaji }
                        │
                        ▼
                POST save-step (ALLOWED_FIELDS includes 'laji') → onboarding_draft.laji = confirmedLaji
                        │
                        ▼
                POST submit  → liikuntapaikat.laji = draft.laji ?? <unchanged> → DELETE draft row

[Skip path] AnalysoiSivusto onSkip → page.tsx handleSkip → wizard
   - [NEW] manual picker (reuse Vaihda UI) inserted somewhere before final submit (planner's choice
     of placement) → also writes through save-step field:'laji'
```

### Recommended Project Structure

No new directories. All changes are edits to existing files:
```
lib/branding/
├── prompt.ts          # add laji field to BRANDING_ANALYSIS_PROMPT JSON schema + field rules
├── analyzer.ts         # add suggested_laji to BrandingAnalysisResult; validate via allowlist
└── brandingResult.ts   # add suggested_laji to BrandingResult type

app/api/business/
├── analyze-website/route.ts          # persist + select suggested_laji
└── onboarding/
    ├── save-step/route.ts            # add 'laji' to ALLOWED_FIELDS (+ optional validator)
    └── submit/route.ts               # read draft.laji into liikuntapaikat UPDATE

app/business/onboarding/
├── AnalysoiSivusto.tsx   # suggestion card, Vaihda picker, reanalyze reset, quick-accept field
├── page.tsx              # handleConfirm laji write; skip-path picker wiring
└── StepPaikka.tsx        # candidate location for skip-path picker (planner's discretion)

supabase/migrations/
├── <timestamp>_business_branding_suggested_laji.sql
└── <timestamp>_onboarding_draft_add_laji.sql
```

### Pattern 1: Allowlist-and-filter validation (existing pattern, extend for laji)
**What:** Claude's raw JSON response is never trusted as-is — every enum-like field is filtered against a `VALID_*` allowlist constant, with invalid/missing values defaulted (not passed through).
**When to use:** Any field where Claude returns a value that must match a closed taxonomy.
**Example:**
```typescript
// Source: lib/branding/analyzer.ts (existing pattern, lines 41-42 and steps 6-7)
const VALID_LOGO_TYPES: LogoType[] = ['wordmark', 'icon', 'combination', 'unknown']
// ...
type: VALID_LOGO_TYPES.includes(l.type as LogoType) ? (l.type as LogoType) : 'unknown',

// NEW pattern for suggested_laji — note the DISCARD-not-default behavior required by D-03:
// unlike logo type (which defaults to 'unknown'), laji must become `null` when invalid,
// because the UI's "unconfirmed" state (D-03) is keyed on `suggested_laji === null`,
// not on a sentinel string.
import { lajiKonfig } from '@/lib/lajit'
const VALID_LAJI_KEYS = Object.keys(lajiKonfig)
const rawLaji = typeof result.laji === 'string' ? result.laji : null
const suggested_laji: string | null =
  rawLaji && VALID_LAJI_KEYS.includes(rawLaji) ? rawLaji : null
```

### Pattern 2: Deferred-to-submit persistence (existing pattern, D-04 reuses it exactly)
**What:** Two persistence patterns coexist on the AnalysoiSivusto preview screen: (a) immediate autosave PATCH for logo/colors/gallery (`patchBranding` → `PATCH /api/business/branding`), and (b) deferred draft-then-submit for prices/hours/contact (`save-step` → `onboarding_draft`, committed only at `submit`). D-04 places `laji` firmly in bucket (b) — confirmation never writes to `liikuntapaikat` directly; it stages in `onboarding_draft.laji` and only lands at final submit.
**When to use:** Any field where "never write without final explicit confirmation" (success criterion 3) must hold by construction, not by a runtime guard.
**Example:**
```typescript
// Source: app/business/onboarding/AnalysoiSivusto.tsx, handleQuickAccept (existing, lines 705-734)
const fieldsToWrite: Array<{ field: 'hinnasto' | 'aukioloajat' | 'yhteystiedot' | 'media_urls'; value: unknown }> = [
  { field: 'hinnasto', value: hinnasto },
  { field: 'aukioloajat', value: aukioloajat },
  { field: 'yhteystiedot', value: yhteystiedot },
  { field: 'media_urls', value: media_urls },
]
// NEW: add a 'laji' entry — widen the field union type to include 'laji'
// { field: 'laji', value: confirmedLaji }
```

### Pattern 3: Sequential idempotent UPSERT writes (existing pattern — laji write inherits it for free)
**What:** `handleQuickAccept`'s `fieldsToWrite` loop is explicitly documented as "RECOVERABLE by design" — each `save-step` call is an idempotent UPSERT keyed on `(business_account_id, paikka_id)`. Adding a `laji` entry to the array needs zero new error handling.
**When to use:** Any additional draft field written during quick-accept.

### Anti-Patterns to Avoid
- **Hardcoding the laji prompt enum as a separate literal array from `lib/lajit.ts`'s keys:** drifts silently if a category is renamed/added. Generate the prompt's enum text and the validator's allowlist from the same `Object.keys(lajiKonfig)` source (prompt.ts is client-importable-safe since it's just a string template — but the literal enum values inside the template string must be kept in sync with `lib/lajit.ts` manually since template strings can't interpolate at module-eval boundary the same way; safest approach: build the prompt string with a template literal that interpolates `Object.keys(lajiKonfig).join(' | ')` at module load time, since `prompt.ts` has no "client-safe" constraint — only `analyzer.ts`/`brandingResult.ts` matter for client purity, and `prompt.ts` is imported only by server-only `analyzer.ts`).
- **Writing `laji` via an immediate PATCH like logo/colors:** violates D-04/success-criterion-3 — would let an unconfirmed AI suggestion leak into the database before the user explicitly confirms.
- **Defaulting unmatched/missing Claude `laji` to `'liikunta'`, `'liikuntahalli'`, or `'Muu'`:** explicitly forbidden by D-03. Must be `null` so the UI renders the unconfirmed state, not a silently-wrong category.
- **`submit/route.ts` overwriting `liikuntapaikat.laji` with `null`/`undefined` when the draft never set it:** would silently revert venues that bypassed the picker (e.g. very old drafts, or a future flow) back to a falsy/`Muu` value. Must use `draft.laji ?? undefined` so an absent draft field is genuinely omitted from the UPDATE payload, not coerced to `null` (Supabase's `.update()` only writes keys present in the object — but if the planner spreads `draft.laji` directly with the key always present, an explicit `null` WILL overwrite. Use conditional object spread: `...(draft.laji ? { laji: draft.laji } : {})`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Sport taxonomy enum source-of-truth | A second hardcoded list of the 9 categories anywhere | `Object.keys(lajiKonfig)` from `lib/lajit.ts` | Single source of truth already exists; a second list will drift |
| Allowlist validation of an AI-returned enum field | A new validation utility/library | The existing `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES` filter-and-default-or-null pattern in `analyzer.ts` | Identical shape problem already solved twice in this file |
| Draft-then-commit two-phase persistence | A new state machine or transaction wrapper | The existing `onboarding_draft` → `submit` atomic-copy-then-delete pattern | Already handles the "never partially commit" requirement for every other onboarding field |

**Key insight:** Every primitive this phase needs (allowlist validation, deferred persistence, idempotent retry, reset-on-reanalyze) already has a working precedent in this exact file set. The risk is not technical complexity — it's accidentally diverging from an established pattern (e.g. using PATCH instead of save-step) and breaking the criterion-3 guarantee.

## Runtime State Inventory

Not applicable — this is a net-new additive feature phase, not a rename/refactor/migration of existing identifiers. (Two schema migrations are needed, see below, but they add new nullable columns, not rename/move existing data.)

## Migration Pattern (verified against actual prior files)

**`business_branding.suggested_laji` migration** — directly analogous to `20260616110000_business_branding_selected_logo_url.sql` [VERIFIED: supabase/migrations/], which is the most recent single-column additive migration on this exact table:

```sql
-- supabase/migrations/<new-timestamp>_business_branding_suggested_laji.sql
-- Phase 55 Task N: additive column for Claude's raw laji suggestion (AI-06).
-- Analog source: 20260616110000_business_branding_selected_logo_url.sql
-- (selected_logo_url was added the same way — bare nullable TEXT, no default).
--
-- This column is written by the runAnalysis background pipeline
-- (app/api/business/analyze-website/route.ts) after analyzeWithClaude validates
-- Claude's raw laji output against lib/lajit.ts's 9-key allowlist. It holds the
-- AI's UNCONFIRMED suggestion — the user-confirmed value lives separately in
-- onboarding_draft.laji (D-04) and is never read from this column.

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS suggested_laji TEXT;
```

**`onboarding_draft.laji` migration** — `onboarding_draft` has **no spare/unused column** today [VERIFIED: supabase/migrations/20260606000000_onboarding.sql — current columns are `id, business_account_id, paikka_id, media_urls, hinnasto, aukioloajat, yhteystiedot, current_step, updated_at`]. A new column is required. Style matches the table's own original `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` idiom used for `business_accounts.onboarding_completed` in the same file:

```sql
-- supabase/migrations/<new-timestamp>_onboarding_draft_add_laji.sql
-- Phase 55 Task N: additive column for the user-confirmed sport category (AI-06, D-04).
-- Analog source: 20260606000000_onboarding.sql's own
-- "ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS onboarding_completed" pattern,
-- and 20260616110000_business_branding_selected_logo_url.sql's bare-nullable-TEXT style.
--
-- Holds the CONFIRMED laji value only — written exclusively via POST /api/business/
-- onboarding/save-step (field: 'laji') after explicit user Vahvista/Vaihda action.
-- submit/route.ts copies this into liikuntapaikat.laji atomically and deletes the draft.

ALTER TABLE onboarding_draft
  ADD COLUMN IF NOT EXISTS laji TEXT;
```

**Naming convention observed across all migrations:** `YYYYMMDDHHMMSS_description.sql`, header comment block with `-- Phase N Task M: <summary> (REQ-ID)`, `-- Analog source: <file>`, then the DDL. Always `ADD COLUMN IF NOT EXISTS` for additive columns — never a bare `ADD COLUMN` (idempotency under retried migration runs).

## Current Schema Confirmation

### `onboarding_draft` columns today [VERIFIED: supabase/migrations/20260606000000_onboarding.sql + save-step/route.ts ALLOWED_FIELDS]
```
id                   BIGSERIAL PRIMARY KEY
business_account_id  UUID NOT NULL REFERENCES business_accounts(user_id)
paikka_id            BIGINT NOT NULL REFERENCES liikuntapaikat(id)
media_urls           JSONB
hinnasto             JSONB
aukioloajat          JSONB
yhteystiedot         JSONB
current_step         INT NOT NULL DEFAULT 1
updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```
`ALLOWED_FIELDS = ['media_urls', 'hinnasto', 'aukioloajat', 'yhteystiedot']` in `save-step/route.ts` line 6 — `laji` is not yet a member; must be added to both the schema (new column) and this array.

### `lib/lajit.ts` exact taxonomy [VERIFIED: lib/lajit.ts]
```typescript
export interface LajiKonfig { label: string; badgeTw: string; accentBg: string; color: string }
export const lajiKonfig: Record<string, LajiKonfig> = {
  padel: {...}, tennis: {...}, jooga: {...}, kuntosali: {...}, uinti: {...},
  kiipeily: {...}, jääkiekko: {...}, liikuntahalli: {...}, liikunta: {...},
}
```
Exactly 9 keys, exported as `lajiKonfig` (a `Record<string, LajiKonfig>`, not an array). No `'Muu'` key exists in this taxonomy. The planner/prompt schema should reference `Object.keys(lajiKonfig)` directly rather than re-typing the 9 strings, to stay in sync automatically.

## `page.tsx handleConfirm` — exact current shape [VERIFIED: app/business/onboarding/page.tsx lines 171-212]

```typescript
async function handleConfirm(
  result: BrandingResult,
  selections: { logoUrl: string | null; gallery: string[] }
) {
  setBrandingData(result)

  // AWAIT the media_urls save-step write BEFORE navigating into the wizard.
  if (paikkaId !== null) {
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 0,
          field: 'media_urls',
          value: { logo: selections.logoUrl, photos: selections.gallery },
        }),
      })
    } catch {
      // Non-blocking: if the write fails, still allow navigation.
    }
  }

  setPagePhase('wizard')
}
```

**Insertion point for the planner:** the confirmed `laji` value must travel from `AnalysoiSivusto`'s `onConfirm` call (currently `onConfirm(brandingData, selections)` with `selections: { logoUrl, gallery }`) into `handleConfirm`. The cleanest minimal-diff approach: widen `selections` to also carry `laji: string` (e.g. `selections: { logoUrl: string | null; gallery: string[]; laji: string }`), since `onConfirm`'s call site in `AnalysoiSivusto.tsx` (`PreviewPhaseContent`'s "Jatka velhoon →" button, lines 460-474) already constructs both arguments inline and has `confirmedLaji` in local scope at that point. Then add a second `await fetch('/api/business/onboarding/save-step', ...)` call inside `handleConfirm`, either sequentially after the `media_urls` write (simplest, follows the existing single-try/catch block precedent) or as a second independent try/catch (more granular failure reporting — planner's choice, both are non-blocking by the existing design). The two writes are independent fields (`media_urls` vs `laji`) on the same UPSERT-based route, so they can safely run sequentially without a race.

**Important:** `onConfirm`'s type signature is declared in three places — `AnalysoiSivustoProps.onConfirm` (AnalysoiSivusto.tsx line 21-24), `PrePhase`'s `onConfirm` prop type (page.tsx lines 109-112), and the actual `handleConfirm` function signature (page.tsx line 171-174). All three must be updated consistently if `selections` gains a `laji` field, or alternatively pass `laji` as a separate third parameter to `onConfirm` — either works, but the three declarations must stay in sync.

## `AnalysoiSivusto.tsx` — exact current structure confirmed [VERIFIED: app/business/onboarding/AnalysoiSivusto.tsx]

- `PreviewPhaseContent`'s `editContent` JSX block runs lines 187-484. It currently renders, in order: heading, Logo picker block (191-233), Brändivärit block (235-353), Galleria block (355-407), Hinnat block (409-423), Aukioloajat block (425-440), quickError (442-447), Footer (449-483).
- **Insertion point for the suggestion card:** between the Galleria block (ends line 407) and the Hinnat block (starts line 409) is the most natural slot — keeps it grouped with the other AI-extracted/user-confirmable fields (logo/colors/gallery) rather than the read-only Hinnat/Aukioloajat display blocks. Alternatively right after Logo (line 233) if the planner wants laji confirmation to be the first action in the list — both are reasonable; no existing precedent dictates ordering beyond "AI-extracted-and-confirmable fields cluster together before the read-only display fields."
- `handleQuickAccept`'s `fieldsToWrite` array is declared at lines 705-710 with type `Array<{ field: 'hinnasto' | 'aukioloajat' | 'yhteystiedot' | 'media_urls'; value: unknown }>` — the union type must be widened to include `'laji'` and a `{ field: 'laji', value: confirmedLaji }` entry added.
- `onReanalyze` (lines 955-972, inline arrow function passed as a prop) currently resets: `selectionInitialisedRef.current = false`, `selectedLogoUrl`, `bgColor`/`bgSource`, `accentColor`/`accentSource`, `armedSlot`, `selectedGallery`, `brandingResult`, then `setPhase('url-input')`. The new laji confirmation state (whatever local state variable holds the confirmed/unconfirmed laji selection) must be added to this same reset block per D-05.
- The component needs new local state, analogous to `selectedLogoUrl`/`bgColor`: something like `const [confirmedLaji, setConfirmedLaji] = useState<string | null>(null)` plus a UI-mode flag (e.g. `lajiPickerOpen: boolean`) for the Vaihda picker's open/closed state. Initialization should happen in the existing `useEffect` keyed on `brandingResult` (lines 549-585, guarded by `selectionInitialisedRef`) — seed `confirmedLaji` from `brandingResult.suggested_laji` if it's a valid taxonomy key, else leave it `null` (D-03's unconfirmed state).
- The "Jatka velhoon →" button's `onConfirm(...)` call (lines 460-474) currently spreads `{ ...brandingResult, selected_background_color: bgColor, selected_accent_color: accentColor }` as the first argument and `{ logoUrl: selectedLogoUrl, gallery: selectedGallery }` as the second. The confirmed laji value needs to reach `page.tsx`'s `handleConfirm` from here — either added to the second argument object or passed as a new third argument (see `page.tsx handleConfirm` section above).

## `StepPaikka.tsx` — exact current shape confirmed [VERIFIED: app/business/onboarding/StepPaikka.tsx]

```typescript
interface StepPaikkaProps {
  paikkaInfo: { nimi: string; osoite: string | null; kaupunki: string | null } | null
  paikkaId: number | null
  onNext: () => void
}
```
- No `laji` prop exists today. `paikkaInfo`'s type here is a narrower inline type than the shared `PaikkaBase` from `lib/onboardingUtils.ts` (which the `StepPaikkaPrePhase` wrapper in `page.tsx` actually fetches — `nimi, laji, osoite, kaupunki, latitude, longitude` — but only passes `paikkaInfo` through, and `StepPaikka`'s own prop type only destructures `nimi`/`osoite`/`kaupunki`, silently ignoring `laji`/coordinates already present on the object).
- **D-06 placement note:** `StepPaikka` renders BEFORE `AnalysoiSivusto` in the flow (`pagePhase: 'paikka' → 'analyze' → 'wizard'`), so it is NOT the component that fires when the user clicks "Ohita" inside `AnalysoiSivusto` — `onSkip` is a prop on `AnalysoiSivusto`/`PrePhase`, wired to `page.tsx`'s `handleSkip` (lines 214-217), which currently just does `setBrandingData(null); setPagePhase('wizard')`. The skip-path manual picker (D-06) therefore most naturally inserts as a UI shown either (a) inline inside `AnalysoiSivusto`'s skip-triggering branches (`'url-input'`/`'analyzing'`/`'error'`/`'timeout'` phases, lines 988-1060, where `onSkip` buttons already exist) before calling `onSkip`, or (b) as a new tiny step rendered by `page.tsx` between `pagePhase: 'analyze'` and `'wizard'` when `handleSkip` fires, before navigating into the wizard. Reusing `StepPaikka.tsx` directly is awkward since it renders earlier in the flow and has no current laji UI — the planner should treat "where exactly" as the open discretion item it already is, but note both viable insertion points discovered here.

## Common Pitfalls

### Pitfall 1: Forgetting `submit/route.ts` currently never touches `laji` at all
**What goes wrong:** A plan that only adds `laji` to `save-step`'s `ALLOWED_FIELDS` but forgets the `submit/route.ts` UPDATE will stage the confirmed value in `onboarding_draft.laji` and then silently drop it — `liikuntapaikat.laji` stays `'Muu'` forever, looking like the feature "doesn't work" with no error anywhere.
**Why it happens:** `submit/route.ts`'s `.update({...})` payload (lines 75-87) is a fixed object literal; adding a new draft field requires an explicit new key in that literal, unlike `save-step` which is field-agnostic via its `[field]: value` computed property.
**How to avoid:** Explicitly add `laji` handling to the `submit/route.ts` UPDATE payload as its own task/checklist item, separate from the `save-step` ALLOWED_FIELDS task.
**Warning signs:** Manual QA confirms a laji suggestion, submits, but the venue still shows `'Muu'` afterward.

### Pitfall 2: Null-overwrite regression on `liikuntapaikat.laji` (success criterion 4)
**What goes wrong:** If `submit/route.ts`'s UPDATE unconditionally includes `laji: draft.laji ?? null`, any onboarding flow where the draft never got a `laji` value (e.g. resumed old drafts, or any future flow that bypasses the new UI) will overwrite an existing/correct `laji` back to `null`/falsy — directly violating success criterion 4 ("existing extractions work regression-free... even if Claude's response omits the laji field").
**Why it happens:** `??` only catches `undefined`/`null` on the left side at read time, not "key absent from update payload" — if the key is always present in the object literal, Supabase's PostgREST will always write it.
**How to avoid:** Use conditional spread to omit the key entirely when `draft.laji` is falsy: `...(draft.laji ? { laji: draft.laji } : {})`, mirroring how other optional draft-derived fields in the same UPDATE already handle absence (e.g. `kuvaus`, `puhelin` use `?.trim() ?? null` because overwriting those to null IS the intended "blank if not provided" behavior — laji is different because `create-paikka` already seeded a real value that must not be clobbered).
**Warning signs:** A regression test or manual QA where a venue's laji is set, an onboarding resubmission happens without revisiting the laji picker, and laji reverts.

### Pitfall 3: Claude returning a non-taxonomy string instead of `null`
**What goes wrong:** Claude (an LLM) may return free text like `"sulkapallo"` or `"Padel ja tennis"` instead of one of the 9 keys, even with explicit prompt instructions. If the validator doesn't strictly check membership in `Object.keys(lajiKonfig)`, an arbitrary string could reach `business_branding.suggested_laji` and, if the UI naively trusts it, render a non-existent "ehdotus" label or — worse — let it flow through to `liikuntapaikat.laji` unconfirmed, violating AI-06 criterion 1 ("ei vapaata tekstiä").
**Why it happens:** LLMs do not perfectly follow enum constraints, especially under a generic/cheap model (`claude-haiku-4-5`) tuned for cost over strict instruction-following.
**How to avoid:** Server-side allowlist validation exactly as D-07 specifies — `typeof result.laji === 'string' && VALID_LAJI_KEYS.includes(result.laji) ? result.laji : null`. Never pass through unchecked.
**Warning signs:** A `suggested_laji` value in the database that doesn't match any `lajiKonfig` key — should be impossible if validation is correct; if seen, the validator has a bug.

### Pitfall 4: Reanalysis race with stale `confirmedLaji` state (D-05)
**What goes wrong:** Like the documented logo/color reset issue (`selectionInitialisedRef`), if the new laji confirmation state isn't included in `onReanalyze`'s reset block, a second "Analysoi uudelleen" run will silently keep the FIRST analysis's confirmed/unconfirmed laji state forever, even though `brandingResult` itself got reset and refetched.
**Why it happens:** `onReanalyze` doesn't remount the component (same root cause as the documented `selectionInitialisedRef` comment in the existing code) — state must be reset manually, not relied upon to reset via key-based remount.
**How to avoid:** Add the new laji state setters to the exact same reset block (lines 955-971) alongside the existing five resets.
**Warning signs:** Re-analyzing a different URL still shows the previous URL's laji suggestion/confirmation.

### Pitfall 5: Free-text Vaihda input bypassing the same validation that suggested_laji goes through
**What goes wrong:** D-02 explicitly allows free text in the Vaihda picker as a user-facing escape hatch — but if `save-step`'s field-specific validation for `laji` is too permissive (e.g. accepts any non-empty string with no length cap), it could allow excessively long or malformed input into `onboarding_draft.laji`, which then flows unchanged into `liikuntapaikat.laji` at submit.
**Why it happens:** Unlike `aukioloajat` (which has `isValidAukioloajat`), `laji` has no analogous shape validator yet — CONTEXT.md itself notes "likely just non-empty string... since free text is allowed per D-02."
**How to avoid:** Add a length cap (e.g. 100 chars, matching the `nimi`/`osoite` pattern in `create-paikka/route.ts` which uses `.trim().slice(0, 500)`) and a non-empty-string check in `save-step/route.ts`'s field-specific validation block (alongside the existing `aukioloajat`/`hinnasto` checks at lines 80-88).
**Warning signs:** Extremely long or empty-string `laji` values reaching the database.

## Code Examples

### Existing allowlist validation pattern (template for suggested_laji)
```typescript
// Source: lib/branding/analyzer.ts lines 41-42, 111-124 (existing code, verbatim)
const VALID_LOGO_TYPES: LogoType[] = ['wordmark', 'icon', 'combination', 'unknown']
const VALID_COLOR_ROLES: ColorRole[] = ['background', 'primary', 'secondary', 'accent', 'text', 'unknown']

const rawLogos = Array.isArray(result.logos) ? result.logos : []
const logos: BrandingAnalysisResult['logos'] = rawLogos
  .filter((l): l is { index: number; type?: unknown } =>
    typeof l?.index === 'number' && Number.isInteger(l.index) &&
    l.index >= 0 && l.index < logoCandidatesBuffers.length)
  .map((l) => ({
    index: l.index,
    type: VALID_LOGO_TYPES.includes(l.type as LogoType) ? (l.type as LogoType) : 'unknown',
  }))
```

### Existing field-specific save-step validation pattern (template for laji)
```typescript
// Source: app/api/business/onboarding/save-step/route.ts lines 79-88 (existing code, verbatim)
if (field === 'aukioloajat' && !isValidAukioloajat(value)) {
  return NextResponse.json({ error: 'aukioloajat: invalid shape or time format' }, { status: 400 })
}
if (field === 'hinnasto') {
  const rows = value as unknown[]
  if (!Array.isArray(rows) || rows.length > 20) {
    return NextResponse.json({ error: 'hinnasto: max 20 rows' }, { status: 400 })
  }
}
// NEW pattern for laji:
// if (field === 'laji') {
//   if (typeof value !== 'string' || value.trim().length === 0 || value.length > 100) {
//     return NextResponse.json({ error: 'laji: invalid value' }, { status: 400 })
//   }
// }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `liikuntapaikat.laji` hardcoded `'Muu'` at creation, never updated | Phase 55 adds the first real write path, gated on explicit confirmation | This phase | First time `laji` becomes a user-controllable field during onboarding |

**Deprecated/outdated:** Nothing in this phase deprecates prior code — `create-paikka/route.ts`'s `laji: 'Muu'` insert remains correct as the pre-confirmation default and is explicitly NOT removed per CONTEXT.md.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The skip-path manual picker (D-06) is best inserted either inline in `AnalysoiSivusto`'s skip-triggering phases or as a new step between `page.tsx`'s `'analyze'` and `'wizard'` phases | StepPaikka.tsx section | If the planner picks a different placement, no functional harm, but UX flow could feel disjointed; this is explicitly Claude's Discretion per CONTEXT.md, not a hard finding |
| A2 | `confirmedLaji` local state plus a `lajiPickerOpen` boolean is sufficient new state for `AnalysoiSivusto.tsx` | AnalysoiSivusto.tsx section | Low risk — this is a reasonable minimal-state design suggestion, not a verified requirement; planner may design the state shape differently |

**If this table is empty:** N/A — see above for the two low-risk implementation-detail assumptions; all factual/schema claims in this document were verified directly against the codebase in this research session.

## Open Questions

1. **Exact wording/copy for the suggestion card and "unconfirmed" state**
   - What we know: D-01 specifies "Ehdotettu laji: {label}" with Vahvista/Vaihda actions; D-03 specifies the unconfirmed state must have no pre-confirmed pick and no Vahvista target.
   - What's unclear: exact Finnish copy for the unconfirmed state's call-to-action text (e.g. "Valitse lajikategoria" vs. something else) — not specified in CONTEXT.md.
   - Recommendation: planner/implementer chooses copy consistent with the existing Finnish UI tone in `AnalysoiSivusto.tsx` (e.g. "Lajia ei tunnistettu automaattisesti — valitse lajikategoria" mirroring the existing "Logoa ei löytynyt automaattisesti..." pattern at line 230).

2. **Whether the skip-path picker should block continuing to the wizard, or be optional-but-strongly-prompted**
   - What we know: D-06 says laji must not stay permanently stuck at `'Muu'` for skip-path users — the picker must exist and be "presented before final submit."
   - What's unclear: whether it's a hard gate (cannot proceed without picking) or a soft prompt (can skip again, leaving `'Muu'`).
   - Recommendation: given AI-06 and success criterion 3's emphasis on explicit confirmation, and D-06's own framing ("otherwise laji stays permanently Muu with zero way to fix it"), the planner should treat this as needing at minimum a one-time strongly-prompted picker at the wizard's final step (mirroring where `varauslinkki`/other final fields are confirmed) rather than a hard block — consistent with the rest of onboarding's "everything is editable, nothing is mandatory to literally block submission" philosophy (e.g. hinnasto/aukioloajat are also optional).

## Environment Availability

Not applicable — no new external dependencies, services, or CLI tools. All required infrastructure (Anthropic API, Supabase, Next.js Route Handlers) is already configured and operating in this codebase from Phases 44-54.

## Validation Architecture

**CORRECTION (orchestrator, post-research fact-check):** The table below in the original research pass claimed no test framework exists in this project. That is factually wrong — verified directly against the repo: `vitest.config.ts` exists at root, `package.json`'s `"test"` script is `vitest run`, `vitest: "^4.1.7"` is a devDependency, and there are 12 existing `*.test.ts` files including `lib/branding/analyzer.test.ts` — the exact module this phase extends with `suggested_laji`. The corrected tables below replace the original (wrong) ones.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 [VERIFIED: package.json, vitest.config.ts] |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/branding/analyzer.test.ts` |
| Full suite command | `npm test` |
| Estimated runtime | ~3-6 seconds |

**Directly relevant existing test files to extend (not create from scratch):**
- `lib/branding/analyzer.test.ts` — already tests `analyzeWithClaude`'s `VALID_LOGO_TYPES`/`VALID_COLOR_ROLES` allowlist-and-filter pattern (e.g. `'defaults an invalid logo type to "unknown"'`, `'filters non-hex colors and defaults an invalid role to "unknown"'`). The `suggested_laji` allowlist behavior (criterion 1) is unit-testable here with the identical mock-Claude-response pattern already used — just add `laji` to the mocked JSON response and assert `result.suggested_laji`.
- `tests/api/update-paikka.test.ts` — establishes the project's Route Handler test pattern: mock `next/server`'s `NextResponse.json`, mock `@/lib/supabaseAdmin.server` with a chainable builder keyed by table name, import the route's exported handler AFTER mocks are set up. New files for `submit`/`save-step` route tests should mirror this exact pattern.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-06 (criterion 1) | `suggested_laji` is always one of the 9 taxonomy keys or `null`, never free text, even when Claude returns an out-of-taxonomy string | unit | `npx vitest run lib/branding/analyzer.test.ts -t "laji"` | ❌ Wave 0 (extend existing `analyzer.test.ts`) |
| AI-06 (criterion 3, partial) / Pitfall 2 | `submit/route.ts`'s `liikuntapaikat` UPDATE omits the `laji` key entirely when `draft.laji` is falsy — never sends `laji: null` and clobbers an existing value | unit (API route) | `npx vitest run tests/api/submit.test.ts -t "does not overwrite laji"` | ❌ Wave 0 (new file, mirror `update-paikka.test.ts` mock pattern) |
| AI-06 (criterion 3, partial) | `submit/route.ts` DOES write `laji` into `liikuntapaikat` when `draft.laji` is set (closes Pitfall 1 — the "never touches laji at all today" gap) | unit (API route) | `npx vitest run tests/api/submit.test.ts -t "writes confirmed laji"` | ❌ Wave 0 (same new file) |
| AI-06 (criterion 3, partial) | `save-step/route.ts` rejects empty-string / >100-char `laji` values (Pitfall 5 — free-text Vaihda escape hatch must still be bounded) | unit (API route) | `npx vitest run tests/api/save-step.test.ts -t "laji"` | ❌ Wave 0 (new file, mirror `update-paikka.test.ts`'s field-validation tests) |
| AI-06 (criterion 2) | Suggestion card renders distinctly; Vahvista/Vaihda both work; unconfirmed state forces Vaihda (D-03) | manual-only (UAT) | n/a — no component-level test infra in this project (no React Testing Library / jsdom component tests found, only route + lib unit tests) | N/A — manual UAT |
| AI-06 (criterion 4) | Logo/color/price/hours extraction regression-free when `laji` is omitted from Claude's response | unit (extends existing) | `npx vitest run lib/branding/analyzer.test.ts` (existing suite already asserts `logos`/`colors`/`prices`/`opening_hours` shape independent of other fields — add one assertion that omitting `laji` from the mocked Claude response doesn't throw and other fields stay intact) | ✅ existing file, add one test |

### Sampling Rate
- **After every task commit:** `npx vitest run lib/branding/analyzer.test.ts` (or the specific new file the task touched)
- **After every plan wave:** `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green, plus manual UAT walkthrough of confirm/change/skip paths (criterion 2 has no automated coverage)
- **Max feedback latency:** ~6 seconds

### Wave 0 Gaps
- `tests/api/submit.test.ts` — does not exist yet. New file required, mirroring `tests/api/update-paikka.test.ts`'s mock-builder pattern (mock `supabaseAdmin.auth.getUser`, mock chainable `.from('liikuntapaikat').update(...)`), to cover the Pitfall 1/Pitfall 2 null-overwrite regression risk — this is the single highest-value automated test in this phase given it guards success criterion 4 directly.
- `tests/api/save-step.test.ts` — does not exist yet (today `save-step/route.ts` has zero dedicated test coverage of any field, not just `laji`). New file required if the planner wants automated coverage of the new `laji` field-validation block; alternatively this can stay manual-only if the planner judges the existing `update-paikka.test.ts` route-level coverage pattern sufficient precedent without a new file — planner's discretion, but criterion-1-adjacent free-text bounding (Pitfall 5) is cheap to automate given the established mock pattern.
- `lib/branding/analyzer.test.ts` — exists, extend with `laji` cases (allowlist-pass, invalid-string-to-null, missing-field-to-null, criterion-4 omission-doesn't-break-other-fields).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes (inherited, unchanged) | Existing JWT verification via `supabaseAdmin.auth.getUser(token)` at every Route Handler boundary — no new auth surface introduced |
| V3 Session Management | no | No session changes |
| V4 Access Control | yes (inherited, unchanged) | Existing `business_paikka_links` ownership check pattern in `save-step`/`submit`/`analyze-website` routes — `laji` writes ride the same ownership-checked routes, no new IDOR surface |
| V5 Input Validation | yes | New: `laji` value from Claude must pass the `lajiKonfig` allowlist server-side (analyzer.ts); new: `laji` value from the user's free-text Vaihda input must pass length/non-empty validation server-side (save-step/route.ts) |
| V6 Cryptography | no | No cryptography changes |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Prompt injection via scraped site content causing Claude to return an attacker-controlled `laji` string outside the taxonomy | Tampering | Server-side allowlist validation against `Object.keys(lajiKonfig)` in `analyzer.ts` — identical mitigation already in place for `logo.type`/`color.role` (existing pattern, this phase extends it) |
| Free-text Vaihda picker input used as an XSS/stored-content vector | Tampering / Elevation of Privilege | `laji` is rendered as plain text (category label), never as HTML/markdown — React's default JSX text-node escaping is sufficient; no `dangerouslySetInnerHTML` path exists or should be introduced. Length-cap server-side validation (Pitfall 5) bounds storage abuse. |
| IDOR — a business writing `laji` for a venue it doesn't own via `save-step` | Tampering / Elevation of Privilege | Already mitigated — `save-step/route.ts`'s existing `business_paikka_links` ownership check (lines 93-102) applies uniformly to every `ALLOWED_FIELDS` member, `laji` included, with zero new code needed for this specific check |

## Sources

### Primary (HIGH confidence)
- `lib/lajit.ts` — read directly, confirmed exact export shape and 9 keys [VERIFIED: codebase read]
- `lib/branding/analyzer.ts` — read directly, confirmed `BrandingAnalysisResult` shape and validation pattern (steps 6-7) [VERIFIED: codebase read]
- `lib/branding/prompt.ts` — read directly, confirmed `BRANDING_ANALYSIS_PROMPT` exact JSON schema and field-rules sections [VERIFIED: codebase read]
- `lib/branding/brandingResult.ts` — read directly, confirmed `BrandingResult` type and `buildBrandingPreview` [VERIFIED: codebase read]
- `app/api/business/analyze-website/route.ts` — read directly, confirmed GET `.select()` column list and UPSERT shape in `runAnalysis` [VERIFIED: codebase read]
- `app/api/business/onboarding/save-step/route.ts` — read directly, confirmed `ALLOWED_FIELDS`, validation pattern, ownership check [VERIFIED: codebase read]
- `app/api/business/onboarding/submit/route.ts` — read directly, confirmed UPDATE payload does NOT currently touch `laji` [VERIFIED: codebase read]
- `app/business/onboarding/AnalysoiSivusto.tsx` — read directly in full (1065 lines), confirmed exact `editContent`/`handleQuickAccept`/`onReanalyze` structure and line numbers [VERIFIED: codebase read]
- `app/business/onboarding/page.tsx` — read directly in full (263 lines), confirmed exact `handleConfirm`/`handleSkip`/`PrePhase`/`StepPaikkaPrePhase` structure [VERIFIED: codebase read]
- `app/business/onboarding/StepPaikka.tsx` — read directly in full (65 lines), confirmed exact prop shape and absence of laji UI [VERIFIED: codebase read]
- `app/api/business/create-paikka/route.ts` — read directly, confirmed hardcoded `laji: 'Muu'` insert (line 63) [VERIFIED: codebase read]
- `supabase/migrations/20260616110000_business_branding_selected_logo_url.sql`, `20260616100000_business_branding_plural_and_paikka_scoping.sql`, `20260606000000_onboarding.sql`, `20260617000000_renumber_onboarding_steps.sql` — read directly, confirmed naming convention and SQL style [VERIFIED: codebase read]
- `package.json` — confirmed `@anthropic-ai/sdk` version `^0.97.1` [VERIFIED: package.json]

### Secondary (MEDIUM confidence)
None used — this phase required zero external documentation lookups; all relevant patterns existed in the local codebase already.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all reuse of existing, already-vetted libraries
- Architecture: HIGH — every integration point read directly from source with exact line numbers
- Pitfalls: HIGH — derived from direct comparison of `save-step` vs. `submit` route current behavior, not speculation

**Research date:** 2026-06-23
**Valid until:** 30 days (stable codebase, no fast-moving external dependency in scope)
