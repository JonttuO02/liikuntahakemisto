# Phase 50: Flow-uudelleenjärjestys - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 9 (all existing — this phase is a pure reorder/renumber, no new files)
**Analogs found:** 9 / 9 (every file is its own analog — patterns are extracted in-place since each file already contains the exact pattern to be moved/adjusted)

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/business/onboarding/page.tsx` | component (page-level phase router) | request-response (client state machine) | itself — `PrePhase` function (lines 24-81) is the template for the new `StepPaikka` pre-phase wrapper | exact (self-analog) |
| `app/business/WizardInner.tsx` | component (numbered step router) | request-response / CRUD (draft resume) | itself — `OnboardingMode` step-rendering block (lines 239-289) | exact (self-analog) |
| `app/business/onboarding/StepPaikka.tsx` | component (read-only display) | request-response | unchanged — relocated only, no internal pattern change | exact (no-op) |
| `app/business/onboarding/AnalysoiSivusto.tsx` | component (multi-phase form) | CRUD (save-step calls) + request-response | itself — `handleQuickAccept`'s `step: 6` literal (line 305) | exact (self-analog) |
| `app/business/onboarding/StepMediat.tsx` | component (form step) | CRUD | itself — `step: 2` literal (line 191) | exact (self-analog) |
| `app/business/onboarding/StepHinnasto.tsx` | component (form step) | CRUD | itself — `step: 3` literal (line 196) | exact (self-analog) |
| `app/business/onboarding/StepAukioloajat.tsx` | component (form step) | CRUD | itself — `step: 4` literal (line 182) | exact (self-analog) |
| `app/business/onboarding/StepYhteystiedot.tsx` | component (form step) | CRUD | itself — `step: 5` literal (line 124) | exact (self-analog) |
| `app/business/onboarding/ProgressBar.tsx` | component (display) | transform (array → UI) | itself — `stepLabels` array (lines 16-23) | exact (self-analog) |
| `app/api/business/onboarding/save-step/route.ts` | route (API handler) | CRUD (UPSERT) | itself — step bounds check (line 61) | exact (self-analog) |
| new migration file `supabase/migrations/<timestamp>_renumber_onboarding_steps.sql` | migration | batch (one-time UPDATE) | `supabase/migrations/20260611000000_drop_onboarding_completed.sql` | exact — naming/comment convention |

This phase has no genuinely new files. Every "pattern" here is an in-place numeric/positional adjustment to an existing file, except the one new SQL migration file, whose analog is the most recent prior migration.

## Pattern Assignments

### `app/business/onboarding/page.tsx` (component, request-response state machine)

**Analog:** itself — `PrePhase` function, lines 20-81

**Current `PagePhase` type and `PrePhase` paikka_id resolution** (lines 10, 24-81):
```typescript
type PagePhase = 'pre' | 'wizard'

function PrePhase({
  onConfirm,
  onSkip,
  onPaikkaIdResolved,
}: {
  onConfirm: (result: BrandingResult, selections: { logoUrl: string | null; gallery: string[] }) => void | Promise<void>
  onSkip: () => void
  onPaikkaIdResolved: (paikkaId: number) => void
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function resolvePaikkaId() {
      const urlPaikkaId = searchParams.get('paikka_id')
      const parsed = urlPaikkaId ? parseInt(urlPaikkaId, 10) : null
      let resolved: number | null = parsed !== null && !isNaN(parsed) ? parsed : null

      if (!resolved) {
        const supabase = createBusinessBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: link } = await supabase
            .from('business_paikka_links')
            .select('paikka_id')
            .eq('business_account_id', user.id)
            .limit(1)
            .maybeSingle()
          if (link) resolved = link.paikka_id
        }
      }

      if (!cancelled) {
        setPaikkaId(resolved)
        if (resolved !== null) onPaikkaIdResolved(resolved)
      }
    }
    resolvePaikkaId()
    return () => { cancelled = true }
  }, [])

  if (paikkaId === null) return <PreVaiheSpinner />
  return <AnalysoiSivusto paikkaId={paikkaId} onConfirm={onConfirm} onSkip={onSkip} />
}
```

**D-01 application:** Per CONTEXT.md, `PagePhase` extends to a 3-value union (e.g. `'paikka' | 'analyze' | 'wizard'`). Build a new `StepPaikkaPrePhase` component that mirrors `PrePhase`'s exact resolution block above (URL param `paikka_id` → fallback to `business_paikka_links` lookup) but renders `<StepPaikka paikkaInfo={...} paikkaId={...} onNext={...} />` instead of `<AnalysoiSivusto>`. `paikkaInfo` (nimi/osoite/kaupunki) is NOT fetched by the existing `PrePhase` — that fetch currently lives only in `WizardInner.tsx`'s `loadDraft()` (lines 127-137 of that file, the `liikuntapaikat` select). The new pre-phase needs to either extract/duplicate that small fetch or reuse it (Claude's Discretion per D-01 sub-note).

**Render gating pattern** (lines 136-161) — extend the same `pagePhase === X &&` conditional structure to 3 branches:
```typescript
{pagePhase === 'pre' && (
  <Suspense fallback={<PreVaiheSpinner />}>
    <PrePhase onConfirm={handleConfirm} onSkip={handleSkip} onPaikkaIdResolved={setPaikkaId} />
  </Suspense>
)}
{pagePhase === 'wizard' && (
  <Suspense fallback={...}><WizardInner mode="onboarding" brandingData={brandingData} /></Suspense>
)}
```

**D-04 — `handleConfirm`'s step literal** (lines 94-126, specifically the comment block and `step: 1` at line 117):
```typescript
body: JSON.stringify({
  paikka_id: paikkaId,
  // step:1 -> save-step sets current_step:2 -> WizardInner's auto-resume
  // (savedStep > 1 && step === 1) lands the user ON Step 2 (StepMediat),
  // where the prefilled gallery/logo render. step:2 would skip Step 2 entirely.
  step: 1,
  field: 'media_urls',
  value: { logo: selections.logoUrl, photos: selections.gallery },
}),
```
Change `step: 1` → `step: 0` (so `current_step` becomes 1, landing on new Step 1/StepMediat). Update the inline comment to match the new numbering (referencing "Step 1 (StepMediat)" instead of "Step 2").

---

### `app/business/WizardInner.tsx` (component, OnboardingMode numbered step machine)

**Analog:** itself

**Step bounds + rendering block** (lines 49-50, 239-289):
```typescript
const rawStep = parseInt(searchParams.get('step') ?? '1', 10)
const step = isNaN(rawStep) || rawStep < 1 || rawStep > 6 ? 1 : rawStep
```
Per D-02, the upper bound `6` → `5`.

**Per-step render block to delete StepPaikka from and renumber** (lines 239-289):
```typescript
{step === 1 && (
  <StepPaikka paikkaInfo={paikkaInfo} paikkaId={paikkaId} onNext={() => saveAndAdvance(1)} />
)}
{step === 2 && paikkaId !== null && (
  <StepMediat paikkaId={paikkaId} initialDraft={draft} onNext={() => saveAndAdvance(2)} onPrev={() => goToStep(1)} />
)}
{step === 3 && paikkaId !== null && (
  <StepHinnasto ... onNext={() => saveAndAdvance(3)} onPrev={() => goToStep(2)} />
)}
{step === 4 && paikkaId !== null && (
  <StepAukioloajat ... onNext={() => saveAndAdvance(4)} onPrev={() => goToStep(3)} />
)}
{step === 5 && paikkaId !== null && (
  <StepYhteystiedot ... onNext={() => saveAndAdvance(5)} onPrev={() => goToStep(4)} />
)}
{step === 6 && (
  <StepEsikatselu draft={draft} paikkaInfo={paikkaInfo} brandingData={brandingData} onPrev={() => goToStep(5)} />
)}
```
New shape per D-02: delete the `step === 1 && <StepPaikka .../>` block entirely (StepPaikka is no longer rendered here). Shift every remaining block down by 1: `step === 2` → `step === 1` (StepMediat, with `onPrev` now disabled/no-back since it's the new first step — confirm against D-02's exact text, which does not mention an onPrev change but the prior step no longer exists inside the wizard), `step === 3` → `step === 2` (StepHinnasto, `onPrev={() => goToStep(1)}`), `step === 4` → `step === 3` (StepAukioloajat, `onPrev={() => goToStep(2)}`), `step === 5` → `step === 4` (StepYhteystiedot, `onPrev={() => goToStep(3)}`), `step === 6` → `step === 5` (StepEsikatselu, `onPrev={() => goToStep(4)}`). Note: the `saveAndAdvance(N)` argument values shift the same way (1,2,3,4 instead of 2,3,4,5).

**Draft resume guard** (line 121):
```typescript
if (savedStep > 1 && step === 1) {
```
Per D-02/D-06, `current_step` values are migrated so `savedStep` semantics shift down by 1 too — this comparison's literal `1` likely stays `1` (it still means "don't redirect away from step 1 if no real progress exists") but verify against the new step-1 meaning (StepMediat, not StepPaikka) during planning — this is the resume-to-correct-step logic the migration (D-06) exists to keep correct.

**Forward-skip guard** (lines 170-175) — untouched in spirit, just operates over the new 1-5 range:
```typescript
useEffect(() => {
  if (loading) return
  if (step > maxReachedStep + 1) {
    router.push('/business/onboarding?step=' + (maxReachedStep + 1))
  }
}, [step, maxReachedStep, loading, router])
```

**Preview re-fetch trigger** (line 179) — currently keyed on the StepEsikatselu's old step number 6:
```typescript
if (step !== 6) return
```
Per D-02, StepEsikatselu becomes step 5 → change this literal to `if (step !== 5) return`.

**`EditMode` is explicitly out of scope (D-05 / lines 298-438)** — tabs `[1, 2, 3, 4, 5]` (line 358) and all `router.push('/business/' + paikkaId + '?step=N')` calls inside `EditMode` must NOT be touched.

---

### `app/business/onboarding/AnalysoiSivusto.tsx` (component)

**Analog:** itself — `handleQuickAccept`, line 305

```typescript
const res = await fetch('/api/business/onboarding/save-step', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ paikka_id: paikkaId, step: 6, field, value }),
})
```
Per D-05, `step: 6` → `step: 5`. `onSkip`/`onConfirm` prop signatures (lines 16-21) are unchanged per D-03 — only the destination step number after `setPagePhase('wizard')` (handled in `page.tsx`, not here) shifts.

---

### `app/business/onboarding/StepMediat.tsx` (component)

**Analog:** itself, line 191

```typescript
body: JSON.stringify({
  paikka_id: paikkaId,
  step: 2,
  field: 'media_urls',
  value: { logo: logoUrl, photos: photoUrls },
}),
```
Per D-02, `step: 2` → `step: 1`.

---

### `app/business/onboarding/StepHinnasto.tsx` (component)

**Analog:** itself, line 196 — `step: 3` → `step: 2`.

---

### `app/business/onboarding/StepAukioloajat.tsx` (component)

**Analog:** itself, line 182 — `step: 4` → `step: 3`.

---

### `app/business/onboarding/StepYhteystiedot.tsx` (component)

**Analog:** itself, line 124:
```typescript
body: JSON.stringify({
  paikka_id: paikkaId,
  step: 5,
  field: 'yhteystiedot',
  value: { puhelin: puhelin.trim(), email: email.trim(), website: website.trim(), kuvaus: kuvaus.trim() },
}),
```
Per D-02, `step: 5` → `step: 4`.

---

### `app/business/onboarding/ProgressBar.tsx` (component, display)

**Analog:** itself, lines 16-23

```typescript
const stepLabels = [
  t('stepPlaceName'),
  t('stepMedia'),
  t('stepPricing'),
  t('stepHours'),
  t('stepContact'),
  t('stepPreview'),
]
```
Per D-08, drop the first entry (`t('stepPlaceName')`) — becomes:
```typescript
const stepLabels = [
  t('stepMedia'),
  t('stepPricing'),
  t('stepHours'),
  t('stepContact'),
  t('stepPreview'),
]
```
The rest of the component (lines 25-89: `isCompleted`/`isCurrent` helpers, the `stepLabels.map` render loop) is purely index-driven off the array — no other line changes needed. The `t('stepPlaceName')` i18n key itself must NOT be deleted from message files (still used by `StepPaikka.tsx`'s own `<h2>` per D-08).

---

### `app/api/business/onboarding/save-step/route.ts` (route, CRUD/UPSERT)

**Analog:** itself, lines 59-64

```typescript
// Validate step — must be 1–6
const parsedStep = parseInt(body.step, 10)
if (isNaN(parsedStep) || parsedStep < 1 || parsedStep > 6) {
  return NextResponse.json({ error: 'Invalid step (must be 1–6)' }, { status: 400 })
}
step = parsedStep
```
Per D-07, tighten to 1–5:
```typescript
// Validate step — must be 1–5
const parsedStep = parseInt(body.step, 10)
if (isNaN(parsedStep) || parsedStep < 1 || parsedStep > 5) {
  return NextResponse.json({ error: 'Invalid step (must be 1–5)' }, { status: 400 })
}
step = parsedStep
```
No other change needed in this file — the `current_step: step + 1` UPSERT convention (line 107) is preserved unchanged per CONTEXT.md's "Established Patterns" note; it naturally produces values in the new valid range once callers pass the renumbered `step` values.

---

### New file: `supabase/migrations/<timestamp>_renumber_onboarding_steps.sql` (migration, batch)

**Analog:** `supabase/migrations/20260611000000_drop_onboarding_completed.sql` (full file, 1 line):
```sql
ALTER TABLE business_accounts DROP COLUMN onboarding_completed;
```

**Naming convention to follow:** `<YYYYMMDDHHMMSS>_<descriptive_slug>.sql` — single-purpose file, slug describes the one DDL/DML operation performed, no header comment block in this particular analog (compare against `20260606000000_onboarding.sql`'s header style if a comment is desired — that migration uses a `--` comment block referencing D-07/decision IDs, e.g. line 12: `--   D-07: Wizard loads existing onboarding_draft on mount — resumes from current_step if draft exists.`).

**Statement to write**, per D-06:
```sql
UPDATE onboarding_draft SET current_step = current_step - 1 WHERE current_step >= 2;
```

**Schema context** (`supabase/migrations/20260606000000_onboarding.sql`, line 46):
```sql
current_step         INT     NOT NULL DEFAULT 1,
```
No `CHECK` constraint exists today — D-06/D-07 confirm no schema change is needed beyond this one-time data UPDATE; the route's bounds check (above) is the only ongoing guard.

## Shared Patterns

### Save-step fetch call shape
**Source:** every Step*.tsx file (StepMediat.tsx line 183, StepHinnasto.tsx, StepAukioloajat.tsx, StepYhteystiedot.tsx line 116) and `AnalysoiSivusto.tsx` line 299 / `page.tsx` line 106 — identical fetch shape repeated across all step components:
```typescript
const res = await fetch('/api/business/onboarding/save-step', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`, // or token from getAuthToken()
  },
  body: JSON.stringify({ paikka_id: paikkaId, step: N, field: '...', value: {...} }),
})
```
**Apply to:** every Step*.tsx and AnalysoiSivusto.tsx — only the numeric literal `N` changes per D-02/D-04/D-05; the surrounding fetch/header/error-handling structure is identical everywhere and must not be touched.

### Page-phase state machine pattern
**Source:** `app/business/onboarding/page.tsx`, `PagePhase` type (line 10) + conditional render block (lines 136-161)
**Apply to:** the new 3-phase sequence (`'paikka' | 'analyze' | 'wizard'`) — extend the existing union type and add one more `{pagePhase === 'X' && (...)}` block following the exact same Suspense-wrapping convention already used for `'pre'` and `'wizard'`.

### Pre-phase paikka_id resolution
**Source:** `app/business/onboarding/page.tsx`, `PrePhase` function body (lines 39-74)
**Apply to:** the new `StepPaikka` pre-phase wrapper — reuse this exact URL-param-then-business_paikka_links-lookup logic rather than re-deriving it (per CONTEXT.md "Reusable Assets").

## No Analog Found

None — every file in scope is a direct numeric/positional edit to existing code, and the one new file (SQL migration) has a clear, recent naming analog.

## Metadata

**Analog search scope:** `app/business/`, `app/business/onboarding/`, `app/api/business/onboarding/`, `supabase/migrations/` — all files were named explicitly in CONTEXT.md's canonical_refs, no broader Glob/Grep search was needed since this phase modifies a closed, enumerated file set.
**Files scanned:** 9 source files + 2 migration files (read directly)
**Pattern extraction date:** 2026-06-17
