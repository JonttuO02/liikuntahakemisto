# Phase 57: Dashboard-redirect-korjaus & Kesken-tila - Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 3 (1 component file with 3 internal edit sites, 2 i18n message files)
**Analogs found:** 3 / 3 (all patterns are self-contained within the same file being modified — this is a same-file pattern-extension phase, not a new-file phase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `app/business/page.tsx` (`checkState()` redirect removal) | component (client, data-fetch effect) | request-response | same file, `links` query block (lines 202-209) | exact (in-file) |
| `app/business/page.tsx` (`VenueRow` badge ternary) | component | CRUD (status display) | same file, existing `claim_status` ternary (lines 110-122) | exact (in-file) |
| `app/business/page.tsx` (`VenueRow` action buttons / Jatka CTA) | component | request-response (navigation) | same file, existing `muokkaaCta`/`esikatseluCta` buttons (lines 126-141) | exact (in-file) |
| `messages/fi.json` / `messages/en.json` (`Business` namespace) | config (i18n messages) | CRUD (static key-value) | same files, existing `statusApproved`/`statusPending`/`statusRejected`/`muokkaaCta` keys | exact |

There is no separate "new file" to scaffold in this phase — all changes are localized edits inside `app/business/page.tsx` plus two i18n JSON additions. The closest analog for every new piece of logic is the adjacent existing logic in the very same functions, which is the strongest possible match.

## Pattern Assignments

### `app/business/page.tsx` — `checkState()` redirect removal (D-01)

**Analog:** the same function, immediately following query block (lines 202-209)

**Current code to delete** (lines 189-200):
```typescript
      // If an incomplete draft exists, resume the onboarding wizard.
      // This handles both first-time users and multi-venue users mid-onboarding.
      const { data: drafts } = await supabase
        .from('onboarding_draft')
        .select('id')
        .eq('business_account_id', user.id)
        .limit(1)

      if (drafts && drafts.length > 0) {
        router.push('/business/onboarding')
        return
      }
```

**Replacement pattern** — instead of an early-return redirect, fetch the **set of `paikka_id`s that have a draft row** and keep it as state so `VenueRow` can branch on it per-row. Follow the exact same supabase query shape already used for `links` (lines 202-209), just selecting `paikka_id` instead of the full join:

```typescript
      // Fetch paikka_ids with an in-progress onboarding draft (D-02/D-03).
      // Existence of a draft row = "Kesken", regardless of claim_status.
      const { data: drafts } = await supabase
        .from('onboarding_draft')
        .select('paikka_id')
        .eq('business_account_id', user.id)

      const keskenPaikkaIds = new Set((drafts ?? []).map(d => d.paikka_id))

      // Fetch all linked venues with their approval status and rejection reason
      const { data: links } = await supabase
        .from('business_paikka_links')
        .select('paikka_id, claim_status, rejection_reason, liikuntapaikat(id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls)')
        .eq('business_account_id', user.id)
        .order('created_at', { ascending: true })

      setVenueLinks((links as unknown as VenueLink[]) ?? [])
      setKeskenPaikkaIds(keskenPaikkaIds)
      setLoading(false)
```

New state to add near the other `useState` declarations (line 165 area), following the existing `useState<VenueLink[]>([])` convention:
```typescript
  const [keskenPaikkaIds, setKeskenPaikkaIds] = useState<Set<number>>(new Set())
```

**Note:** `router` import (`useRouter`, line 4) becomes unused once the `router.push('/business/onboarding')` call is removed — check whether `router` is used elsewhere in the file before removing the import (it is not referenced elsewhere in the read excerpt, so the import and the `const router = useRouter()` declaration at line 164 should be removed too, unless ESLint/TS strict mode requires keeping it for another reason discovered during implementation).

---

### `app/business/page.tsx` — `VenueRow` badge ternary (D-02 through D-06)

**Analog:** existing ternary, lines 110-122 (same function)

**Current pattern** (lines 110-122):
```typescript
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${
          link.claim_status === 'approved'
            ? 'bg-green-100 text-green-700'
            : link.claim_status === 'rejected'
            ? 'bg-red-50 text-red-600'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {link.claim_status === 'approved'
            ? t('statusApproved')
            : link.claim_status === 'rejected'
            ? t('statusRejected')
            : t('statusPending')}
        </span>
```

**Replacement pattern** — add a `isKesken` check that takes precedence over the `pending` fallback (per D-04: Kesken and pending are mutually exclusive, draft existence always wins over the amber Pending branch). `VenueRow` needs a new prop `isKesken: boolean` computed by the caller (`keskenPaikkaIds.has(link.paikka_id)`):

```typescript
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${
          isKesken
            ? 'bg-[rgba(17,17,17,0.08)] text-[rgba(17,17,17,0.55)]'
            : link.claim_status === 'approved'
            ? 'bg-green-100 text-green-700'
            : link.claim_status === 'rejected'
            ? 'bg-red-50 text-red-600'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {isKesken
            ? t('statusKesken')
            : link.claim_status === 'approved'
            ? t('statusApproved')
            : link.claim_status === 'rejected'
            ? t('statusRejected')
            : t('statusPending')}
        </span>
```

Caller site (line 279-285, inside `venueLinks.map`) needs the new prop threaded through:
```typescript
              <VenueRow
                key={link.paikka_id}
                link={link}
                t={t}
                isKesken={keskenPaikkaIds.has(link.paikka_id)}
                onPreview={setPreviewPaikka}
                onReapply={handleReapply}
              />
```

And the `VenueRow` function signature (lines 93-103) needs `isKesken: boolean` added to its props type, following the existing prop-typing convention:
```typescript
function VenueRow({
  link,
  t,
  isKesken,
  onPreview,
  onReapply,
}: {
  link: VenueLink
  t: TBusiness
  isKesken: boolean
  onPreview: (p: Liikuntapaikka) => void
  onReapply: (paikkaId: number) => void
}) {
```

---

### `app/business/page.tsx` — Action buttons / Jatka CTA (D-08, D-09)

**Analog:** existing action-button block, lines 126-141 (same function, immediately below the badge)

**Current pattern** (lines 126-141):
```typescript
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          disabled={!link.liikuntapaikat}
          onClick={() => { if (link.liikuntapaikat) onPreview(link.liikuntapaikat as unknown as Liikuntapaikka) }}
          className="text-xs text-[rgba(17,17,17,0.45)] hover:text-[#111111] underline-offset-2 hover:underline [transition:color_150ms] disabled:opacity-40 disabled:pointer-events-none"
        >
          {t('esikatseluCta')}
        </button>
        <a
          href={'/business/' + link.paikka_id}
          className="text-xs font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full px-3 py-1 [transition:border-color_150ms_var(--ease-out)]"
        >
          {t('muokkaaCta')}
        </a>
      </div>
```

**Replacement pattern** — reuses the exact existing `disabled:opacity-40 disabled:pointer-events-none` pattern already on the preview button (line 131) to disable Esikatselu on Kesken rows (D-09, claude's discretion = disable rather than hide, to preserve the row layout per UI-SPEC "Layout impact" note), and swaps the `<a href>` target/label for Jatka (D-08):

```typescript
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          disabled={isKesken || !link.liikuntapaikat}
          onClick={() => { if (link.liikuntapaikat) onPreview(link.liikuntapaikat as unknown as Liikuntapaikka) }}
          className="text-xs text-[rgba(17,17,17,0.45)] hover:text-[#111111] underline-offset-2 hover:underline [transition:color_150ms] disabled:opacity-40 disabled:pointer-events-none"
        >
          {t('esikatseluCta')}
        </button>
        <a
          href={isKesken ? '/business/onboarding?paikka_id=' + link.paikka_id : '/business/' + link.paikka_id}
          className="text-xs font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full px-3 py-1 [transition:border-color_150ms_var(--ease-out)]"
        >
          {isKesken ? t('jatkaCta') : t('muokkaaCta')}
        </a>
      </div>
```

No new routing logic needed — `/business/onboarding?paikka_id=X` resume is already implemented in `app/business/WizardInner.tsx` (per CONTEXT.md D-08 and Integration Points).

---

### `messages/fi.json` / `messages/en.json` — new i18n keys

**Analog:** existing `statusPending`/`statusApproved`/`statusRejected` keys (fi.json lines 142-144, en.json lines 142-144) and `muokkaaCta` (fi.json line 207, en.json line 207), all inside the `"Business": { ... }` namespace object (starts line 98 in both files).

**Insertion point:** add new keys adjacent to `statusRejected` (line 144) and `muokkaaCta` (line 207) to keep related status/CTA keys visually grouped, matching the existing file's organization (status keys clustered together, CTA keys clustered together).

**fi.json** — insert after line 144 (`"statusRejected": "Hylätty",`):
```json
    "statusKesken": "Kesken",
```
and after line 207 (`"muokkaaCta": "Muokkaa",`):
```json
    "jatkaCta": "Jatka",
```

**en.json** — insert after line 144 (`"statusRejected": "Rejected",`):
```json
    "statusKesken": "In progress",
```
and after line 207 (`"muokkaaCta": "Edit",`):
```json
    "jatkaCta": "Continue",
```

Remember trailing commas: since these are mid-object insertions (not the last key), each new line needs a trailing comma exactly like the surrounding keys, and the file must remain valid JSON (no trailing comma on the actual last key of the object).

---

## Shared Patterns

### Badge structural pattern (color-only variation)
**Source:** `app/business/page.tsx` lines 110-122
**Apply to:** the Kesken badge — reuse `text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0` exactly; only the fill (`bg-[rgba(17,17,17,0.08)] text-[rgba(17,17,17,0.55)]`) is new, per UI-SPEC color table.

### Disabled-button pattern
**Source:** `app/business/page.tsx` line 131 (`disabled:opacity-40 disabled:pointer-events-none`)
**Apply to:** Esikatselu button on Kesken rows — no new disabled-state CSS needed, the class is already present on the button element; only the `disabled` boolean expression changes.

### i18n full-coverage convention
**Source:** `messages/fi.json` / `messages/en.json`, `Business` namespace (both files mirror each other key-for-key)
**Apply to:** any new copy — every new key must be added to both files in the same phase, per CLEAN-06/07 (no hardcoded Finnish strings, no English-only fallback).

### Supabase query shape (browser client, scoped to business_account_id)
**Source:** `app/business/page.tsx` lines 191-196 (draft query) and 202-209 (links query)
**Apply to:** the rewritten draft query (D-02/D-03) — keep the `.from(...).select(...).eq('business_account_id', user.id)` shape; only change `.select('id').limit(1)` to `.select('paikka_id')` (no `.limit(1)`, since all draft paikka_ids are now needed, not just an existence check) and remove the `if (drafts && drafts.length > 0) { router.push(...); return }` early-return entirely.

## No Analog Found

None. This phase is a constrained, same-file modification with no genuinely new architectural pattern — every change extends an existing ternary/query/button that already lives in `app/business/page.tsx`.

## Metadata

**Analog search scope:** `app/business/page.tsx`, `app/business/WizardInner.tsx` (referenced, not modified), `messages/fi.json`, `messages/en.json`
**Files scanned:** 4 read directly (page.tsx in full, fi.json/en.json Business namespace), plus CONTEXT.md/UI-SPEC.md for decision cross-referencing
**Pattern extraction date:** 2026-06-24

**Line-number drift note:** CONTEXT.md references some lines as 191-200 for the redirect block and 110-122 for the badge ternary; current file read in this pass confirms the redirect block at lines 189-200 (off by ~2 due to comment lines) and the badge ternary at lines 110-122 (exact match). Action buttons are at lines 126-141 (CONTEXT.md says 127-134/135-140, both subsumed within this range — exact match). Implementer should re-verify exact line numbers against the file state at execution time, since phase 56 may have shifted lines slightly between context-gathering and now.
