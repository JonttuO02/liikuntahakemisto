# Phase 36: Hallintapaneeli — Master Plan

**Phase goal:** Hyväksytyllä yrityksellä on täysin toimiva `/business`-hallintapaneeli omien paikkatietojensa ylläpitoon ja esikatseluun.

**Requirements:** BIZPANEL-01, BIZPANEL-02, BIZPANEL-03

**Wave structure overview:**
| Wave | Plans | Autonomous |
|------|-------|------------|
| 1 | 36-01, 36-02 | yes, yes |
| 2 | 36-03, 36-04 | yes, yes |
| 3 | 36-05 | yes |
| 4 | 36-06 | yes |
| 5 | 36-07 | yes |

---

## Plan 36-01: i18n — hallintapaneeli edit keys

**Wave:** 1 (parallel with 36-02 — no shared files)
**Requirements:** BIZPANEL-01, BIZPANEL-02, BIZPANEL-03
**Estimated complexity:** low

### Goal

Add all Finnish and English translation keys that the edit wizard, preview modal, and venue list buttons need in the Business namespace.

### Tasks

1. Open `messages/fi.json`. Inside the `"Business"` object, append the following keys after `"reapplyCta"`:

   ```
   "editTitle": "Muokkaa paikan tietoja"
   "editStep2Label": "Mediat"
   "editStep3Label": "Hinnasto"
   "editStep4Label": "Aukioloajat"
   "editStep5Label": "Yhteystiedot"
   "saveCta": "Tallenna"
   "saving": "Tallennetaan..."
   "saveSuccess": "Tiedot tallennettu"
   "previewCta": "Näytä esikatselu"
   "previewClose": "Sulje esikatselu"
   "editBackToList": "← Takaisin"
   "editLockedStep1": "Paikan perustiedot (nimi, osoite, laji) ovat lukittu hyväksynnän jälkeen. Muutoksia varten ota yhteyttä ylläpitoon."
   "muokkaaCta": "Muokkaa"
   "esikatseluCta": "Esikatselu"
   "photoDeleteAlt": "Poista kuva"
   "photoMaxReached": "Max 5 kuvaa lisätty"
   ```

2. Open `messages/en.json`. Inside the `"Business"` object, append the same keys with English translations after `"reapplyCta"`:

   ```
   "editTitle": "Edit venue information"
   "editStep2Label": "Media"
   "editStep3Label": "Pricing"
   "editStep4Label": "Opening hours"
   "editStep5Label": "Contact details"
   "saveCta": "Save"
   "saving": "Saving..."
   "saveSuccess": "Information saved"
   "previewCta": "Show preview"
   "previewClose": "Close preview"
   "editBackToList": "← Back"
   "editLockedStep1": "Basic venue information (name, address, sport type) is locked after approval. Contact support to make changes."
   "muokkaaCta": "Edit"
   "esikatseluCta": "Preview"
   "photoDeleteAlt": "Delete photo"
   "photoMaxReached": "Max 5 images added"
   ```

### Acceptance Criteria

- Both `messages/fi.json` and `messages/en.json` are valid JSON (no syntax errors).
- All 15 keys listed above are present in both files inside the `"Business"` namespace.
- No existing keys are modified or removed.
- `npx tsc --noEmit` passes (no TS errors introduced).

### Files Changed

- `messages/fi.json` — append 15 hallintapaneeli edit keys to Business namespace
- `messages/en.json` — append 15 hallintapaneeli edit keys to Business namespace

---

## Plan 36-02: Route Handler — POST /api/business/update-paikka

**Wave:** 1 (parallel with 36-01 — no shared files)
**Requirements:** BIZPANEL-02
**Estimated complexity:** medium

### Goal

Create the unified POST route handler that the edit wizard calls to persist per-section changes directly to `liikuntapaikat`, with JWT auth and ownership verification (per D-08, D-10).

### Tasks

1. Create `app/api/business/update-paikka/route.ts` as a Next.js Route Handler. The handler must:

   **Auth (mirror `app/api/business/register/route.ts` exactly):**
   - Read `Authorization: Bearer <token>` header.
   - Call `supabaseAdmin.auth.getUser(token)` — if `authError || !user`, return `{ error: 'Unauthorized' }` with status 401.

   **Ownership check:**
   - Parse body as JSON. Extract `paikka_id: number`, `section: string`, `data: unknown`.
   - Validate that `paikka_id` is a positive integer; return 400 if not.
   - Query `business_paikka_links` via `supabaseAdmin`: `SELECT 1 WHERE business_account_id = user.id AND paikka_id = paikka_id`. If no row found, return `{ error: 'Forbidden' }` with status 403.

   **Section-based field mapping** (per D-10) — build `updatePayload` object from `section` value:
   - `"mediat"`: accept `{ logo_url?: string | null, photo_urls?: string[] }` from `data`. Validate `photo_urls` is an array with max 5 items. Set `updatePayload = { logo_url, photo_urls }`.
   - `"hinnasto"`: accept `{ hinta_min?: number | null, hinta_max?: number | null, hinta_kuvaus?: string | null }` from `data`. Validate numeric types. Set `updatePayload = { hinta_min, hinta_max, hinta_kuvaus }`.
   - `"aukioloajat"`: accept `data` as a JSONB-compatible object (Record of day keys to `{ open, close }`). Set `updatePayload = { aukioloajat: data }`.
   - `"yhteystiedot"`: accept `{ puhelin?: string, varauslinkki?: string, kuvaus?: string }` from `data`. Trim all strings; cap `kuvaus` at 300 chars server-side. Set `updatePayload = { puhelin, varauslinkki, kuvaus }`.
   - Any other section value: return `{ error: 'Invalid section' }` with status 400.

   **UPDATE:**
   - Call `supabaseAdmin.from('liikuntapaikat').update(updatePayload).eq('id', paikka_id)`.
   - If Supabase error, return `{ error: 'Update failed', detail: error.message }` with status 500.
   - On success, return `{ ok: true }` with status 200.

2. Verify the handler is reachable. Run:
   ```
   curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/business/update-paikka -H "Content-Type: application/json" -d '{}'
   ```
   Expect 401 (no token). Confirms the file is registered and auth guard fires.

### Acceptance Criteria

- `app/api/business/update-paikka/route.ts` exists and exports a named `POST` function.
- Request without Authorization header returns HTTP 401.
- Request with valid token but `paikka_id` not linked to that user returns HTTP 403.
- Request with `section: "hinnasto"` and valid data updates only `hinta_min`, `hinta_max`, `hinta_kuvaus` in `liikuntapaikat` (no other columns touched).
- `photo_urls` array with more than 5 items returns HTTP 400.
- Unknown `section` value returns HTTP 400.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/api/business/update-paikka/route.ts` — new POST Route Handler (create)

---

## Plan 36-03: PreviewModal component + Esikatselu buttons on /business list

**Wave:** 2 (blocked on Wave 1 — needs i18n keys from 36-01)
**Requirements:** BIZPANEL-03, BIZPANEL-01
**Estimated complexity:** medium

### Goal

Create a reusable full-screen preview overlay component (per D-11) that renders PaikkaKortti + DiagonaalKortti + PaikkaSheet from live `liikuntapaikat` data. Wire an "Esikatselu" button to each venue row in `/business/page.tsx` (per D-06).

### Tasks

1. Create `app/components/PreviewModal.tsx` as a `'use client'` component.

   **Props interface:**
   ```typescript
   interface PreviewModalProps {
     paikka: Liikuntapaikka
     onClose: () => void
   }
   ```

   **Structure:** Fixed full-screen overlay with `z-50`. Use Framer Motion `AnimatePresence` + `motion.div` for fade-in/out (`initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}`). No URL change.

   **Layout:**
   - Overlay background: `fixed inset-0 z-50 bg-black/50 overflow-y-auto`.
   - Inner panel: `min-h-full flex items-start justify-center py-8 px-4`.
   - Content box: `.glass rounded-2xl p-6 w-full max-w-xl mx-auto flex flex-col gap-6`.
   - Header row: title (`text-xl font-bold`) from `t('Business.previewCta')` + close button (`×`) on the right that calls `onClose`. Close button: `text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms]`.
   - Three preview sections, each with a label (`text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]`) and the component below:
     - Label `t('Business.previewLabelCard')` → `<PaikkaKortti paikka={paikka} />`
     - Label `t('Business.previewLabelDiag')` → `<DiagonaalKortti paikka={paikka} />`
     - Label `t('Business.previewLabelSheet')` → `<PaikkaSheet paikka={paikka} preview={true} todo={false} onClose={() => {}} onToggleTodo={() => {}} />`
   - Close button at bottom: `t('Business.previewClose')`, outlined pill style (`border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full h-10 px-6 text-sm font-bold text-[#111111] w-full [transition:border-color_150ms_var(--ease-out)]`).
   - Clicking the overlay background (not the panel) also calls `onClose`. Implement with `onClick` on the overlay div, `stopPropagation` on the panel div.

   Import: `import type { Liikuntapaikka } from '@/lib/types'`, `import PaikkaKortti from '@/app/components/PaikkaKortti'`, `import DiagonaalKortti from '@/app/components/DiagonaalKortti'`, `import PaikkaSheet from '@/app/components/PaikkaSheet'`, `import { motion, AnimatePresence } from 'framer-motion'`, `import { useTranslations } from 'next-intl'`.

2. Extend `app/business/page.tsx`:

   **Data shape change:** Extend the `VenueLink` type to include full `Liikuntapaikka` fields needed for preview. Change the Supabase query's `liikuntapaikat(nimi)` select to:
   ```
   liikuntapaikat(id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls)
   ```

   Update `VenueLink` type to reflect the richer `liikuntapaikat` shape.

   **State:** Add `previewPaikka: Liikuntapaikka | null` state (default `null`). When non-null, render `<PreviewModal paikka={previewPaikka} onClose={() => setPreviewPaikka(null)} />` wrapped in `<AnimatePresence>` at the top of the return.

   **Per-row UI (in the venue list map):** After the status badge, add a row of action buttons (per D-06, all statuses get both buttons):
   - "Esikatselu"-button: `onClick={() => setPreviewPaikka(link.liikuntapaikat as Liikuntapaikka)}`. Style: `text-xs text-[rgba(17,17,17,0.45)] hover:text-[#111111] underline-offset-2 hover:underline [transition:color_150ms]`.
   - "Muokkaa"-link placeholder: `<a href={/business/${link.paikka_id}} ...>`. Style: `text-xs font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full px-3 py-1 [transition:border-color_150ms_var(--ease-out)]`. Use i18n keys `t('muokkaaCta')` and `t('esikatseluCta')` from 36-01.

   Note: The "Muokkaa" link in this plan is a placeholder `<a href>`. It will become functional when 36-04 creates the `/business/[id]` page. The link is correct now — it just 404s until Wave 2 completes.

### Acceptance Criteria

- `app/components/PreviewModal.tsx` exists and exports a default React component.
- Clicking "Esikatselu" on any venue row opens the modal with that venue's PaikkaKortti rendered inside.
- Clicking the overlay backdrop closes the modal.
- Clicking the close button (×) closes the modal.
- Modal is not rendered when `previewPaikka` is null.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/components/PreviewModal.tsx` — new full-screen preview overlay (create)
- `app/business/page.tsx` — extend VenueLink type, richer Supabase select, Esikatselu button, Muokkaa link placeholder, PreviewModal integration

---

## Plan 36-04: /business/[id] server page + EditWizardInner client shell

**Wave:** 2 (parallel with 36-03 — no shared files)
**Requirements:** BIZPANEL-01, BIZPANEL-02
**Estimated complexity:** medium

### Goal

Create the server component that owns auth-guarding and data fetching for the per-venue edit page, and the client shell that handles tab-bar navigation between edit steps (per D-05, D-07).

### Tasks

1. Create `app/business/[id]/page.tsx` as a Next.js **server component** (no `'use client'`).

   **Auth guard:** Use the established SSR client pattern from `@/lib/supabaseSSR`:
   ```typescript
   import { createServerSupabase } from '@/lib/supabaseSSR'
   import { cookies } from 'next/headers'
   // ...
   const cookieStore = cookies()
   const supabase = createServerSupabase(cookieStore)
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) redirect('/business/rekisteroidy')
   ```
   This is the exact pattern used in `NavBarServer.tsx` and other server components — do NOT import `createServerClient` from `@supabase/ssr` directly. If no session, redirect to `/business/rekisteroidy`.

   Check that a `business_accounts` row exists for the user using `supabaseAdmin` (import from `@/lib/supabaseAdmin.server`) — if not, redirect to `/business/rekisteroidy`.

   **Params:** `params: { id: string }` (Next.js 14 synchronous params — project is on Next.js 14.2.x). Parse `paikkaId = parseInt(params.id, 10)`.

   **Ownership check:** Query `business_paikka_links` via `supabaseAdmin` for `business_account_id = user.id AND paikka_id = paikkaId`. If no row, call `notFound()` from `next/navigation`.

   **Fetch paikka:** Query `liikuntapaikat` via `supabaseAdmin`:
   ```
   SELECT id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls
   WHERE id = paikkaId
   ```
   If not found, call `notFound()`.

   **Render:** Return a page with `max-w-2xl mx-auto` layout (per D-07):
   ```tsx
   <main className="min-h-screen bg-white px-4 py-12">
     <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
       <EditWizardInner paikka={paikka} paikkaId={paikkaId} />
     </div>
   </main>
   ```

   Import `EditWizardInner` from `'./EditWizardInner'`.

2. Create `app/business/[id]/EditWizardInner.tsx` as a `'use client'` component.

   **Props:**
   ```typescript
   interface EditWizardInnerProps {
     paikka: Liikuntapaikka
     paikkaId: number
   }
   ```

   **State:** `step` derived from `useSearchParams().get('step')` — default to `'1'`. `router` from `useRouter`.

   **Tab-bar navigation (per D-07, Claude's Discretion: tab-bar):**
   Render a horizontal tab bar above the step content. 5 tabs: Step 1 (locked), Steps 2–5 (editable). Each tab is a button that calls `router.push('/business/' + paikkaId + '?step=' + n)`. Active tab: `bg-[#111111] text-white`, inactive: `text-[rgba(17,17,17,0.45)] hover:text-[#111111]`. Tab style: `text-sm font-bold rounded-full px-4 py-2 [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]`.

   Tab labels from i18n (using `useTranslations('Business')`): Step 1 `stepPlaceName`, Step 2 `editStep2Label`, Step 3 `editStep3Label`, Step 4 `editStep4Label`, Step 5 `editStep5Label`.

   **Back link:** `<a href="/business">` with text `t('editBackToList')`. Style: `text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms] mb-4 inline-block`.

   **Step routing with AnimatePresence:**
   - `step === '1'`: Render a locked read-only view of Step 1 data (nimi, osoite, laji). Use a `.glass rounded-2xl p-6` card. Show `t('editLockedStep1')` notice in muted text. No form inputs — only display.
   - Steps 2–5: Render `<div className="text-sm text-[rgba(17,17,17,0.45)] p-6">Lataa...</div>` placeholder — steps will be wired in Wave 3 (36-05, 36-06). Leave clear `{/* TODO: wire StepMediat editMode in 36-05 */}` comments for each step.

   **Title:** `<h1 className="text-xl font-bold text-[#111111]">{t('editTitle')}</h1>` above the tab bar.

   Import `type { Liikuntapaikka } from '@/lib/types'`.

### Acceptance Criteria

- Visiting `/business/[id]` with a valid session and ownership link renders the page without error.
- Visiting `/business/[id]` without a session redirects to `/business/rekisteroidy`.
- Visiting `/business/[id]` where the id is not linked to the user returns 404.
- Tab bar renders 5 tabs; clicking a tab changes `?step=N` in the URL.
- Step 1 shows a read-only locked notice, no editable inputs.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/business/[id]/page.tsx` — new server component with auth guard + ownership check + paikka fetch (create)
- `app/business/[id]/EditWizardInner.tsx` — new client component with tab-bar, back link, step routing shell (create)

---

## Plan 36-05: Edit-mode StepMediat

**Wave:** 3 (blocked on Wave 2 — EditWizardInner must exist before steps are wired)
**Requirements:** BIZPANEL-02
**Estimated complexity:** medium

### Goal

Extend `StepMediat` to support `editMode` — loads existing photos from `paikka` data (not draft), supports per-photo Storage delete + array update, enforces max-5 cap with inline message, and saves via `POST /api/business/update-paikka` with `section: "mediat"` (per D-09, D-03).

### Tasks

1. Extend `app/business/onboarding/StepMediat.tsx`:

   **Add `editMode` prop to `StepMediatProps`:**
   ```typescript
   interface StepMediatProps {
     paikkaId: number
     initialDraft?: OnboardingDraft | null
     initialPaikka?: Liikuntapaikka | null   // new: for edit mode
     editMode?: boolean                        // new
     onNext: () => void
     onPrev: () => void
     onSaveSuccess?: () => void               // new: called after successful edit-mode save
   }
   ```

   **Edit mode initialization:**
   When `editMode` is true, initialize state from `initialPaikka` instead of `initialDraft`:
   - `existingLogoUrl`: `initialPaikka?.logo_url ?? null`
   - `existingPhotoUrls`: `initialPaikka?.photo_urls ?? []`

   **Photo max-5 cap enforcement in edit mode:**
   Total = `existingPhotoUrls.length + photoFiles.length`. When total reaches 5, disable the UploadDropZone for photos and render an inline message below it:
   ```tsx
   <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('photoMaxReached')}</p>
   ```
   Pass `disabled={totalPhotos >= 5}` to the photos UploadDropZone (add a `disabled` prop to UploadDropZone if it does not already have one — check the component first; if it has `disabled`, use it; if not, add a `disabled?: boolean` prop that adds `pointer-events-none opacity-60` to the root).

   **Per-photo Storage delete (edit mode only):**
   The existing photo thumbnail `×` button in edit mode must delete the file from Supabase Storage before removing it from the local state. Sequence:
   1. Derive the Storage path from the URL. The URL pattern is `https://<project>.supabase.co/storage/v1/object/public/business-media/<path>`. Strip the public URL prefix to get `<path>`.
   2. Call `supabase.storage.from('business-media').remove([path])`. Log error but do not block state update if Storage delete fails (the URL is already in DB; state update + save will fix the array).
   3. Remove the URL from `existingPhotoUrls` state.

   **Edit mode save (handleSave — new function for edit mode):**
   When `editMode` is true, the footer shows a `t('saveCta')` button instead of `t('nextCta')`. Clicking "Tallenna" calls `handleSave()`:
   1. Upload any new `logoFiles[0]` and `photoFiles` to Storage (same upload logic as `handleNext`, reuse or extract helper).
   2. Build final `{ logo_url, photo_urls }` from `existingLogoUrl` + uploaded new photos.
   3. `POST /api/business/update-paikka` with `{ paikka_id, section: 'mediat', data: { logo_url, photo_urls } }` and `Authorization: Bearer <token>`.
   4. On success: show inline success message (`t('saveSuccess')`) for 2 seconds via `useState<boolean>`, then call `onSaveSuccess?.()`.
   5. On error: show `t('errorUploadFailed')`.

   **Footer in edit mode:** Replace "Seuraava" button with "Tallenna" button. Keep "Edellinen" as-is (tab navigation, does NOT auto-save). Optionally show "Näytä esikatselu" as a text button that calls `onShowPreview?.()` — wire this in 36-07.

2. Wire `StepMediat` into `app/business/[id]/EditWizardInner.tsx` for step 2:

   Replace the `{/* TODO: wire StepMediat editMode in 36-05 */}` placeholder with:
   ```tsx
   {currentStep === '2' && (
     <StepMediat
       paikkaId={paikkaId}
       initialPaikka={paikka}
       editMode={true}
       onNext={() => router.push('/business/' + paikkaId + '?step=3')}
       onPrev={() => router.push('/business/' + paikkaId + '?step=1')}
       onSaveSuccess={() => { /* local state update or toast — handled by StepMediat inline */ }}
     />
   )}
   ```

### Acceptance Criteria

- In edit mode, existing `photo_urls` from `paikka` appear as thumbnails with `×` delete buttons.
- Clicking `×` deletes the photo from Storage and removes it from the displayed list.
- When total photos (existing + new selections) is 5, the photo drop zone is disabled and the "Max 5 kuvaa lisätty" message appears.
- Clicking "Tallenna" sends `POST /api/business/update-paikka` with `section: "mediat"`.
- A success message appears after save and disappears after ~2 seconds.
- Onboarding mode (no `editMode` prop) is completely unchanged — existing tests/flows unaffected.
- If `disabled` prop was added to `UploadDropZone`, it is optional with `default false`; onboarding callers pass no `disabled` prop and their behavior is unchanged.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/business/onboarding/StepMediat.tsx` — add `editMode`, `initialPaikka`, `onSaveSuccess` props; edit-mode save logic; Storage delete on photo remove; max-5 cap with inline message
- `app/business/[id]/EditWizardInner.tsx` — wire StepMediat for step 2

---

## Plan 36-06: Edit-mode StepHinnasto + StepAukioloajat + StepYhteystiedot

**Wave:** 4 (blocked on Wave 3 / 36-05 — both 36-05 and 36-06 modify `app/business/[id]/EditWizardInner.tsx`; sequencing eliminates the shared-file write conflict)
**Requirements:** BIZPANEL-02
**Estimated complexity:** medium

### Goal

Extend steps 3, 4, and 5 to support `editMode` — each initializes from live `paikka` data, gets a "Tallenna"-button that calls `update-paikka`, and shows inline success/error feedback (per D-03).

### Tasks

1. Extend `app/business/onboarding/StepHinnasto.tsx`:

   **Add props:**
   ```typescript
   initialPaikkaHinnasto?: Array<{ kategoria: string; hinta: string; lisatieto?: string }> | null
   editMode?: boolean
   onSaveSuccess?: () => void
   ```

   When `editMode` is true and `initialPaikkaHinnasto` is provided, prefer it over `initialHinnasto` (draft) for state initialization.

   The hinnasto in `liikuntapaikat` is stored as `hinta_min`, `hinta_max`, `hinta_kuvaus` — NOT as a structured array. For edit mode, the `data` sent to `update-paikka` must be `{ hinta_min, hinta_max, hinta_kuvaus }`. The editor still uses the row-based table UI; derive `hinta_min`/`hinta_max`/`hinta_kuvaus` from the rows on save:
   - `hinta_min`: minimum numeric value from non-empty `hinta` fields (parse as float).
   - `hinta_max`: maximum numeric value from non-empty `hinta` fields.
   - `hinta_kuvaus`: join non-empty rows as `"Kategoria: €X"` — or simply serialize the rows array as a compact JSON string capped at 200 chars. Keep consistent with what admin/preview reads.

   **Edit-mode footer:** Show "Tallenna" button instead of "Seuraava". Clicking it calls `handleSave()` — `POST /api/business/update-paikka` with `{ paikka_id, section: 'hinnasto', data: { hinta_min, hinta_max, hinta_kuvaus } }`. On success, show `saveSuccess` inline for 2 seconds then call `onSaveSuccess?.()`. Keep `hasAnyPrice` gate active — "Tallenna" disabled when no price row has a value.

2. Extend `app/business/onboarding/StepAukioloajat.tsx`:

   **Add props:**
   ```typescript
   editMode?: boolean
   onSaveSuccess?: () => void
   ```

   When `editMode` is true, `existingAukioloajat` is passed from `paikka.aukioloajat` (same shape already). The initialization `useEffect` already handles this correctly — no change to initialization logic needed.

   **Edit-mode save:** `POST /api/business/update-paikka` with `{ paikka_id, section: 'aukioloajat', data: openDaysObject }`. On success, show inline `saveSuccess` for 2 seconds and call `onSaveSuccess?.()`.

   **Edit-mode footer:** "Tallenna" instead of "Seuraava".

3. Extend `app/business/onboarding/StepYhteystiedot.tsx`:

   **Add props:**
   ```typescript
   editMode?: boolean
   onSaveSuccess?: () => void
   ```

   When `editMode` is true, initialize from `paikka` data passed via `initialYhteystiedot` prop (already exists — just pass `{ puhelin: paikka.puhelin, varauslinkki: paikka.varauslinkki, kuvaus: paikka.kuvaus }` from `EditWizardInner`).

   **Edit-mode save:** `POST /api/business/update-paikka` with `{ paikka_id, section: 'yhteystiedot', data: { puhelin, varauslinkki: website, kuvaus } }`. Note: the `yhteystiedot` section maps `varauslinkki` from the `website` input field — the `liikuntapaikat` column is `varauslinkki` but the form field is labeled "website". Ensure the Route Handler mapping in 36-02 accepts `varauslinkki` (not `website`) in the `data` object.

   **Edit-mode footer:** "Tallenna" instead of "Seuraava".

4. Wire steps 3–5 into `app/business/[id]/EditWizardInner.tsx`:

   Replace the three `{/* TODO */}` placeholders with actual step components:
   ```tsx
   {currentStep === '3' && (
     <StepHinnasto
       paikkaId={paikkaId}
       editMode={true}
       initialHinnasto={null}
       onNext={() => router.push('/business/' + paikkaId + '?step=4')}
       onPrev={() => router.push('/business/' + paikkaId + '?step=2')}
     />
   )}
   {currentStep === '4' && (
     <StepAukioloajat
       paikkaId={paikkaId}
       editMode={true}
       existingAukioloajat={paikka.aukioloajat ?? null}
       initialDraftAukioloajat={null}
       onNext={() => router.push('/business/' + paikkaId + '?step=5')}
       onPrev={() => router.push('/business/' + paikkaId + '?step=3')}
     />
   )}
   {currentStep === '5' && (
     <StepYhteystiedot
       paikkaId={paikkaId}
       editMode={true}
       initialYhteystiedot={{ puhelin: paikka.puhelin ?? '', website: paikka.varauslinkki ?? '', kuvaus: paikka.kuvaus ?? '' }}
       onNext={() => router.push('/business/' + paikkaId + '?step=1')}
       onPrev={() => router.push('/business/' + paikkaId + '?step=4')}
     />
   )}
   ```

   For StepHinnasto edit-mode, pass `initialPaikkaHinnasto` constructed from `paikka.hinta_kuvaus` if available, or `null` — the step will show empty rows for the business to fill in, which is acceptable for the first edit session.

### Acceptance Criteria

- In edit mode, StepAukioloajat pre-fills from `paikka.aukioloajat`.
- In edit mode, StepYhteystiedot pre-fills puhelin, varauslinkki, kuvaus from paikka.
- Clicking "Tallenna" in any of steps 3–5 calls `POST /api/business/update-paikka` with the correct section name.
- Success inline message appears and disappears after ~2 seconds.
- Error message appears if the API call fails.
- Onboarding mode is completely unchanged for each component.
- Steps 3–5 are accessible via tab-bar on `/business/[id]`.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/business/onboarding/StepHinnasto.tsx` — add `editMode`, `onSaveSuccess` props; edit-mode save to update-paikka; "Tallenna" footer
- `app/business/onboarding/StepAukioloajat.tsx` — add `editMode`, `onSaveSuccess` props; edit-mode save to update-paikka; "Tallenna" footer
- `app/business/onboarding/StepYhteystiedot.tsx` — add `editMode`, `onSaveSuccess` props; edit-mode save to update-paikka; "Tallenna" footer
- `app/business/[id]/EditWizardInner.tsx` — wire steps 3–5 with correct props

---

## Plan 36-07: Final wiring — Muokkaa buttons + PreviewModal in edit steps + integration smoke test

**Wave:** 5 (blocked on Wave 4 — all steps must be wired before final integration)
**Requirements:** BIZPANEL-01, BIZPANEL-02, BIZPANEL-03
**Estimated complexity:** low

### Goal

Complete the integration: confirm the "Muokkaa" links on `/business` page navigate correctly to `/business/[id]`, add the per-step "Näytä esikatselu" button inside `EditWizardInner`, and run through the smoke test checklist to verify the full flow end-to-end.

### Tasks

1. Verify and finalize `app/business/page.tsx` — the "Muokkaa" link added in 36-03 should now route to the working `/business/[id]` page. Confirm the `href` uses `link.paikka_id` (already a number; append directly: `href={'/business/' + link.paikka_id}`).

   No code change needed unless the link was written with a bug in 36-03. If it was written correctly, just verify.

2. Add "Näytä esikatselu" button to `app/business/[id]/EditWizardInner.tsx`:

   Add `previewOpen: boolean` state. When `true`, render `<PreviewModal paikka={paikka} onClose={() => setPreviewOpen(false)} />` wrapped in `<AnimatePresence>`.

   Add a "Näytä esikatselu" button in the tab-bar row (right-aligned, next to the tab buttons):
   ```tsx
   <button
     type="button"
     onClick={() => setPreviewOpen(true)}
     className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] underline-offset-2 hover:underline [transition:color_150ms] ml-auto"
   >
     {t('previewCta')}
   </button>
   ```

   Import `PreviewModal` from `'@/app/components/PreviewModal'` and `AnimatePresence` from `framer-motion`.

   Note: The preview shows the **server-fetched `paikka` data** (state at page load), not the unsaved form state. This matches D-11 ("shows published/saved state"). After a "Tallenna" save, the user sees the in-step success message; to see the updated preview they close and reopen the modal (which re-uses the prop data — a full page refresh is needed to see new preview data). This is acceptable per D-11 and avoids complex state threading.

3. Run the end-to-end smoke test checklist. Verify each item manually in the running dev server (`npm run dev`):

   **BIZPANEL-01:**
   - [ ] `/business` loads and lists all venues for the test business account
   - [ ] Each venue row shows correct status badge (pending/approved/rejected)
   - [ ] "Esikatselu" button opens PreviewModal with PaikkaKortti, DiagonaalKortti, PaikkaSheet
   - [ ] PreviewModal closes on backdrop click and × button
   - [ ] "Muokkaa" link navigates to `/business/[id]`

   **BIZPANEL-02:**
   - [ ] `/business/[id]` renders with tab-bar (5 tabs, Step 1 locked)
   - [ ] Tab 2 (Mediat): existing photos shown as thumbnails, × deletes, new upload appends, max-5 cap disables zone, "Tallenna" saves to `update-paikka`
   - [ ] Tab 3 (Hinnasto): "Tallenna" saves to `update-paikka`, section=hinnasto
   - [ ] Tab 4 (Aukioloajat): pre-filled from paikka data, "Tallenna" saves
   - [ ] Tab 5 (Yhteystiedot): pre-filled from paikka data, "Tallenna" saves
   - [ ] "← Takaisin" returns to `/business`

   **BIZPANEL-03:**
   - [ ] "Näytä esikatselu" button in EditWizardInner opens PreviewModal
   - [ ] Preview shows PaikkaKortti + DiagonaalKortti + PaikkaSheet for the current paikka

   **Security:**
   - [ ] Visiting `/business/[id]` without auth redirects to `/business/rekisteroidy`
   - [ ] `POST /api/business/update-paikka` with no token returns 401
   - [ ] `POST /api/business/update-paikka` with valid token but wrong paikka_id returns 403

### Acceptance Criteria

- All smoke test checklist items above pass.
- No TypeScript errors (`npx tsc --noEmit` clean).
- No console errors in the browser during the happy-path flow.
- All three BIZPANEL requirements are demonstrably fulfilled.

### Files Changed

- `app/business/page.tsx` — verify Muokkaa link correctness (may be no-op if 36-03 was correct)
- `app/business/[id]/EditWizardInner.tsx` — add `previewOpen` state, "Näytä esikatselu" button, PreviewModal render

---

## Source Audit

| Source | Item | Covered by |
|--------|------|-----------|
| GOAL | `/business`-hallintapaneeli paikkatietojen ylläpitoon ja esikatseluun | 36-03, 36-04, 36-05, 36-06, 36-07 |
| BIZPANEL-01 | `/business` näyttää paikkalistaus + tilatiedot | 36-03 (Esikatselu + Muokkaa buttons), 36-07 |
| BIZPANEL-02 | Muokkaus kaikille onboarding-tiedoille, välittömästi julkaistaan | 36-02 (API), 36-05 (mediat), 36-06 (hinnasto/aukioloajat/yhteystiedot) |
| BIZPANEL-03 | Esikatselu-näkymä hallintapaneelissa | 36-03 (PreviewModal), 36-07 (per-step preview) |
| D-01 | Edit mode reuses onboarding wizard components with editMode=true | 36-05, 36-06 |
| D-02 | Only steps 2–5 editable; Step 1 locked after approval | 36-04 (locked Step 1 UI) |
| D-03 | Each step 2–5 has own "Tallenna" button, writes directly to liikuntapaikat | 36-05, 36-06 |
| D-04 | "Näytä esikatselu" per step opens full-screen modal | 36-07 |
| D-05 | Multi-route: /business = venuelista; /business/[id] = single venue management | 36-04 |
| D-06 | All venue statuses show Muokkaa + Esikatselu buttons | 36-03 |
| D-07 | /business/[id] uses wider dashboard layout (max-w-2xl) | 36-04 |
| D-08 | New Route Handler: POST /api/business/update-paikka | 36-02 |
| D-09 | Photos: append model + per-photo delete. Logo: replace semantics | 36-05 |
| D-10 | One unified endpoint for all sections; section-based field mapping | 36-02 |
| D-11 | Preview modal = full-screen overlay, no URL change, shows published/saved state | 36-03 |
| RESEARCH | No new migrations needed (all columns exist) | n/a — confirmed |
| RESEARCH | No Storage bucket changes needed (business-media exists) | n/a — confirmed |
