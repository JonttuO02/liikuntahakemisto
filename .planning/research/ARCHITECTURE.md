# Architecture Patterns — v1.8 Yritysportaali v2

**Project:** AKTIIVI — liikuntahakemisto
**Researched:** 2026-06-11
**Milestone:** v1.8 Julkistaminen & UX
**Confidence:** HIGH — based on direct codebase inspection

---

## 1. Role Detection: Where Should the Business Role Check Live?

### Current State

`middleware.ts` calls `supabase.auth.getUser()` to refresh the session cookie but performs no routing. Business role is checked client-side in `app/business/page.tsx` (useEffect → `business_accounts` table lookup) and `app/admin/page.tsx` (useEffect → `/api/admin/applications` which verifies `is_admin`). The admin page does a client-side redirect via `router.replace('/')` when not authorized.

### The Tradeoff Matrix

| Layer | Latency | Can read DB | Redirects before render | Caveats |
|---|---|---|---|---|
| `middleware.ts` | Fastest (~0ms extra) | No — anon key only, cannot query `business_accounts` | Yes — `NextResponse.redirect()` before any RSC | Cannot query custom tables; session cookie must be set (may not be on first hit) |
| `app/layout.tsx` (RSC) | Fast — same request | Yes — server-side Supabase client | No — renders then redirects via `redirect()` | Adds DB call to every layout render |
| Route-specific `page.tsx` (RSC) | Fast | Yes | Yes — `redirect()` before streaming | Most targeted; no layout overhead |
| Client `useEffect` (current pattern) | Slow — full round trip after paint | Yes | No — spinner shown first | Flash of wrong content; always a bounce |

### Recommendation: Server Component at `app/business/layout.tsx`

Create `app/business/layout.tsx` as an async Server Component. On every request inside `/business/*`:

1. Call `createServerSupabase(cookieStore)` (already in `lib/supabaseSSR.ts`).
2. `getUser()` — if no session, `redirect('/business/rekisteroidy')`.
3. Query `business_accounts` for `user_id` — if no row, `redirect('/business/rekisteroidy')`.
4. Pass the account data down as props or via a `BusinessContext` provider.

**Do not add role detection to `middleware.ts`** — it can only read session cookies, not the `business_accounts` table. You would still need a second DB hop in the layout.

**Do not promote admin detection to middleware either** — same constraint. The admin check at `/admin` routes stays as-is (Route Handler JWT + `is_admin` from `profiles`), which is already correct and server-side.

**Homepage redirect (BIZ-03 "business user away from homepage"):** This is the most contentious piece. Two options:

Option A — Middleware redirect on `/`: After `getUser()` succeeds, make a second `supabaseAdmin` call (service key) in middleware to check `business_accounts`. Works but adds 30–80ms to every homepage load for every user, and requires embedding service key in edge middleware (not recommended — service key must never reach the edge).

Option B — Client-side check in `Etusivu` (recommended): On mount, `subscribeToAuthUser` already runs. Add a single `business_accounts.maybeSingle()` query there. If the user is a business account, `router.replace('/business')`. This matches the existing pattern, costs one extra DB call only for logged-in users, and requires zero middleware changes. The flash is acceptable because the current homepage auto-opens the sheet after 700ms anyway — the redirect fires well before that.

**Verdict:** Use `app/business/layout.tsx` (RSC) for all `/business/*` protection. Use a client-side check in `Etusivu` for the homepage → `/business` redirect. Never touch middleware for role routing.

---

## 2. Dual-Mode Map: Hiding BottomSheet + AI Widget for Business Users

### Current State

`Etusivu` is a single 1700-line client component that owns all state: sheet phase, AI widget, GPS, filters, TODO overlay, auth, weather. The sheet content (AI widget, Karuselli, filter pill, card list) is rendered inside a conditionally visible `motion.div` controlled by `sheetPhase`. The sheet itself auto-opens after 700ms on mount.

### Option Analysis

**Prop drilling from `app/page.tsx`:** `app/page.tsx` is a server component. It does not know the user's business role (no auth check there currently). Even if it did, passing `isBusinessUser` down through `Etusivu` props would require `Etusivu` to selectively suppress the sheet, the AI effect, Karuselli, and the TODO overlay — all deeply embedded in a 1700-line component. This is high-risk refactor territory.

**Context provider:** A `BusinessContext` providing `{ isBusinessUser: boolean }` solves the prop threading but still requires `Etusivu` to consume the context and add conditional branches. The component already has 20+ useState declarations; adding more conditional render paths increases complexity without a clean seam.

**Separate route (recommended):** Introduce `app/business/map/page.tsx` — a minimal map page that renders the Google Map, GPS recenter, and a single "Avaa kartta" affordance, but no sheet, no AI widget, no Karuselli, no TODO. This page is accessed from the business dashboard and reuses the existing `@vis.gl/react-google-maps` `Map` + `SportPin` + `AdvancedMarker` components directly.

The key insight: Etusivu's map is not a reusable map component — it is the entire consumer experience. A business user's "map view" is a read-only directory lookup, not a personalized consumer app. The correct architectural seam is a route boundary, not a prop toggle.

**Implementation path:**
- Extract `KarttatYdin` from `Etusivu` into `app/components/KarttatYdin.tsx` — handles Map, SportPin clustering, AdvancedMarker, GPS pan, RecenterButton, CalloutCard, PaikkaSheet (click-to-view). This is purely map-focused.
- `Etusivu` wraps `KarttatYdin` + adds sheet/AI/filter overlay on top.
- `app/business/map/page.tsx` uses `KarttatYdin` directly with no overlay.

**Verdict:** Separate route with a shared `KarttatYdin` component. Do not conditionally hide parts of `Etusivu`. The extraction is also long-term health work (Etusivu is overloaded).

---

## 3. Publication Pipeline: Syncing Business Data to `paikat` After Approval

### Current State

`/api/admin/approve/route.ts` already:
- Sets `business_paikka_links.claim_status = 'approved'`
- For `link_type = 'created'`, sets `published = true` on `liikuntapaikat`

The approval does NOT currently copy business data (images, hinnasto, aukioloajat, kuvaus) to `liikuntapaikat`. That sync happens when the business submits the onboarding wizard (`/api/business/onboarding/submit`), which runs before approval. The submit route sets `business_managed = true` and writes all fields.

For "business data overwrites Google Places data on approval" (v1.8 goal), the missing piece is: after approval, force `published = true` AND ensure all business-supplied fields from the `onboarding_draft` are written to `liikuntapaikat`. But the draft is deleted after submit. So the source of truth after submit is already `liikuntapaikat` itself.

### Pattern Options

**Supabase database trigger/function:** A BEFORE/AFTER UPDATE trigger on `business_paikka_links` that fires when `claim_status` transitions to `'approved'`. Pros: atomic, no extra round trips. Cons: Supabase hosted environment limits trigger complexity; debugging triggers is opaque; this logic has email side effects (send approval email) that cannot run in a trigger.

**Extend `/api/admin/approve` Route Handler (recommended):** The approve route already runs as a privileged server action with `supabaseAdmin`. Add a step after setting `claim_status = 'approved'` that reads the current `liikuntapaikat` row for `business_managed = true` and ensures `published = true`. For claim-type venues (already published), no additional action is needed. For created-type venues, the current code already sets `published = true`.

The data sync itself is already done by `onboarding/submit`. What v1.8 needs is: if the business edits data AFTER submit but BEFORE approval, a re-submit mechanism. The `EditWizardInner` already calls `/api/business/update-paikka` on save — this writes directly to `liikuntapaikat` regardless of approval state. So post-approval data is always current.

**Verdict:** No separate pipeline needed. The approve route already handles publication. The `onboarding/submit` + `update-paikka` routes handle data sync. What v1.8 needs is:
1. Confirm the approve route also sets `published = true` for `claim_type = 'claim'` venues (currently it only does `link_type = 'created'` — claims are already published, which is correct per CLAIM-03).
2. Add the `business_managed = true` flag write to `liikuntapaikat` in the approve step for claim-type venues (currently only set by `onboarding/submit`, not by approve). This is the one gap: a claim venue that skips the onboarding/submit step would lack `business_managed = true`.

Single addition to `/api/admin/approve`: after `claim_status = 'approved'`, always do `UPDATE liikuntapaikat SET business_managed = true WHERE id = link.paikka_id`.

---

## 4. Wizard Refactor: Extracting Shared Logic from OnboardingWizardInner + EditWizardInner

### Current Duplication

| Concern | OnboardingWizardInner | EditWizardInner |
|---|---|---|
| Auth guard | useEffect → getUser + business_accounts check | useEffect → getUser + business_accounts check |
| Draft fetch | Complex: URL param → business_paikka_links → onboarding_draft | Not applicable (uses paikka prop) |
| Route/step URL navigation | `goToStep(n)` with paikka_id param | `router.push('/business/' + paikkaId + '?step=' + n)` |
| Step components | StepPaikka, StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot, StepEsikatselu (6 steps) | StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot (4 steps, no StepPaikka/StepEsikatselu) |
| Forward-skip guard | Yes — maxReachedStep | No — free navigation |
| Local state after save | Re-fetches draft | Uses local state (localHinnasto, localAukioloajat, etc.) |

### Extraction Pattern

The clean seam in Next.js App Router for this case is a **shared hook**, not a shared wrapper component.

Create `lib/useWizardAuth.ts`:

```typescript
// Returns: { authChecked: boolean } — redirects to /business/rekisteroidy if no valid session
export function useWizardAuth(): { authChecked: boolean }
```

This replaces the duplicated `useEffect + getUser + business_accounts` block in both wizards. It is a pure auth guard with no routing or step logic.

Do NOT create a `WizardShell` wrapper component that tries to unify both wizards' layouts. The two have fundamentally different UX: onboarding has a linear ProgressBar + forward-skip guard; edit has a tab bar + free navigation. Forcing them into one component would require complex branching that is worse than the current duplication.

The step components (StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot) are already shared via imports from `app/business/onboarding/` into `EditWizardInner`. They accept an `editMode?: boolean` prop to switch behavior. This is the right pattern — keep it.

**What to refactor for v1.8:**
1. Extract `useWizardAuth` hook (replaces ~10 lines of duplicated logic, high value for low risk).
2. Clean the `onboarding_completed` flag from `business_accounts` — v1.8 tech debt item. The `/business` page currently checks for the presence of an `onboarding_draft` row to decide whether to resume onboarding. The `onboarding_completed` column on `business_accounts` was also set by `onboarding/submit` but is never read (the draft-check pattern superseded it). Remove the writes or the column — do not leave dead state that will confuse future phases.
3. The `StepPaikka` guard in `OnboardingWizardInner` (URL-skipping prevention via `maxReachedStep`) should be documented with a comment, not abstracted — it is onboarding-specific logic with no edit-mode equivalent.

**Note on `business/layout.tsx` interaction:** Once `app/business/layout.tsx` (RSC) provides the auth guard at the route level, the `useWizardAuth` hook becomes redundant for routes under `/business/*`. In that case, the hook's role is eliminated and the `authChecked` spinner in the wizards can be removed. The RSC layout redirects before the page renders — no client-side auth check needed. This means the ideal order is: build `layout.tsx` first, then strip the auth useEffect from both wizards directly (without the intermediate hook step).

**Verdict:** If building `business/layout.tsx`, skip `useWizardAuth` and just delete the auth useEffect from both wizards after the layout is in place. If for some reason layout.tsx is deferred, extract the hook as an interim step.

---

## 5. Verification Badge: `business_managed` Across Cards Without Prop Drilling

### Current State

`business_managed` is a column in `liikuntapaikat` (Postgres boolean). It is set to `true` by `create-paikka` and `onboarding/submit` routes. It is NOT in `lib/types.ts` (the `Liikuntapaikka` type). It is NOT selected in `app/page.tsx`'s Supabase query. It therefore does not reach any card component.

`PaikkaKortti`, `DiagonaalKortti`, and `PaikkaSheet` all receive `paikka: Liikuntapaikka`. They render badges based on other fields (`featured`, `hinta_kuvaus`). The verification badge must appear in all three.

### The Prop-Drilling Problem

If you add `business_managed?: boolean` to `Liikuntapaikka` and select it in `app/page.tsx`, the field flows through:
- `app/page.tsx` → `Etusivu` (as part of the `paikat` array) → DiagonaalKortti, PaikkaKortti, PaikkaSheet

That is NOT prop drilling — that is normal data flow. `Etusivu` already passes `paikka` objects to all three components. No intermediate component needs to be aware of `business_managed`; it just rides along in the type.

The concern in the question is presumably about whether adding `business_managed` to the Supabase SELECT query in `app/page.tsx` causes regressions. It does not — adding one column to a SELECT is additive. The type must be updated.

### Recommendation

**Step 1:** Add `business_managed?: boolean | null` to `Liikuntapaikka` in `lib/types.ts`.

**Step 2:** Add `business_managed` to the SELECT in `app/page.tsx`'s Supabase query.

**Step 3:** In `PaikkaKortti`, `DiagonaalKortti`, and `PaikkaSheet`, render the verification badge when `paikka.business_managed === true`. Use the existing badge row pattern (like `featured` → "Sponsoroitu" badge). Suggested: a small blue checkmark badge inline with the venue name or in the badge row, using the glassmorphism color system (not amber, reserved for Sponsoroitu; not green, reserved for "Auki nyt").

**What NOT to do:** Do not create a separate context or a custom hook that fetches `business_managed` independently in each card. Do not query Supabase from a card component for this flag. The data is already available at page load time.

**PreviewModal path:** `PreviewModal` and `StepEsikatselu` show `PaikkaKortti`, `DiagonaalKortti`, and `PaikkaSheet` in preview mode. They receive a `paikka` object assembled from the draft. Since a business venue is by definition `business_managed = true`, hard-code `business_managed: true` in the preview assembly — this ensures the badge shows in the wizard preview as well.

---

## Integration Points: New vs Modified Components

### New Components

| Component | Location | Purpose |
|---|---|---|
| `app/business/layout.tsx` | New file | RSC auth guard for all `/business/*` routes |
| `app/business/map/page.tsx` | New file | Business-facing map view (no consumer features) |
| `app/components/KarttatYdin.tsx` | New file | Shared map core extracted from Etusivu |
| `lib/useWizardAuth.ts` | New file (optional) | Shared auth guard hook — only needed if layout.tsx deferred |

### Modified Components

| Component | Change | Risk |
|---|---|---|
| `lib/types.ts` | Add `business_managed?: boolean \| null` to `Liikuntapaikka` | Very low — additive |
| `app/page.tsx` | Add `business_managed` to SELECT, pass through Etusivu | Very low — additive |
| `app/components/PaikkaKortti.tsx` | Render verification badge when `paikka.business_managed` | Low |
| `app/components/DiagonaalKortti.tsx` | Same | Low |
| `app/components/PaikkaSheet.tsx` | Same | Low |
| `app/api/admin/approve/route.ts` | Add `SET business_managed = true` for all approved venues | Low — additive step |
| `app/components/Etusivu.tsx` | Add business-user redirect check on mount | Low — client-side only |
| `app/business/onboarding/OnboardingWizardInner.tsx` | Remove auth useEffect (layout.tsx handles it) | Medium — requires careful testing |
| `app/business/[id]/EditWizardInner.tsx` | Same | Medium |
| `app/business/page.tsx` | Simplified — layout.tsx handles auth; remove redundant client-side checks | Medium |

### Unmodified Components

`StepMediat`, `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`, `StepEsikatselu`, `StepPaikka`, `PreviewModal` — all step and preview components stay unchanged. The shared step components already have `editMode` prop for behavioral switching.

---

## Build Order (Dependency-Aware)

The dependency chain is strict:

```
1. lib/types.ts — add business_managed
   ↓
2. app/page.tsx — add to SELECT
   ↓
3. PaikkaKortti + DiagonaalKortti + PaikkaSheet — render verification badge
   (badge visible end-to-end; zero risk)

4. api/admin/approve — add business_managed write for claim-type venues
   (independent of above; required before going live)

5. app/business/layout.tsx — RSC auth guard
   (prerequisite for steps 6, 7, 8)
   ↓
6. OnboardingWizardInner + EditWizardInner — remove auth useEffect
   (layout handles it; simplifies both components)
   ↓
7. app/business/page.tsx — strip redundant client-side auth checks
   ↓
8. Etusivu — add business-user redirect on mount
   (needs /business to be a working protected route)

9. KarttatYdin extraction + app/business/map/page.tsx
   (most complex; comes after all auth work is verified)
```

**Phase ordering rationale:**

Start with the type + query + badge work (steps 1–3) because it is purely additive, zero risk, and delivers visible value (verification tick) immediately without touching any auth or routing code.

The `approve` route addition (step 4) is independent but must be live before v1.8 ships to production, as it closes the gap where claim-type venues don't get `business_managed = true` written by the admin action.

The `business/layout.tsx` server-side guard (step 5) is the central prerequisite for the wizard simplification and the map route. It must be verified working (redirect chain: no session → `/business/rekisteroidy`, no business_accounts row → `/business/rekisteroidy`) before downstream work.

The `KarttatYdin` extraction (step 9) is the highest-risk item because it requires restructuring the 1700-line `Etusivu`. Do this last, after all other v1.8 pieces are verified working. Risk mitigation: build `app/business/map/page.tsx` first as a minimal standalone map (even duplicating a bit of map setup code temporarily), then extract `KarttatYdin` as a polish step.

---

## Architecture Decisions to Record

| Decision | Rationale |
|---|---|
| `business/layout.tsx` RSC guard, not middleware | Middleware cannot query `business_accounts` table without service key at edge |
| Homepage business redirect is client-side in Etusivu | Avoids adding DB call to every homepage load; existing `subscribeToAuthUser` pattern makes it natural |
| Separate `/business/map` route, not Etusivu prop | `Etusivu` is not a composable map component; route boundary is the correct seam |
| `business_managed` rides in `Liikuntapaikka` type | No intermediate components need awareness; data flows naturally from page.tsx through paikat array |
| No shared wizard shell; only shared auth removal | Two wizards have incompatible UX (linear vs tab); once layout.tsx handles auth, no shared hook needed |
| Approve route adds `business_managed = true` write | Closes the gap for claim-type venues that bypass `onboarding/submit` |
| `onboarding_completed` column removed or writes removed | Dead state — the draft-check pattern superseded it; leaving it causes confusion |

---

## Sources

- Direct codebase inspection: `middleware.ts`, `app/business/page.tsx`, `app/business/onboarding/OnboardingWizardInner.tsx`, `app/business/[id]/EditWizardInner.tsx`, `app/admin/page.tsx`, `app/api/admin/approve/route.ts`, `app/api/business/onboarding/submit/route.ts`, `app/components/Etusivu.tsx`, `app/components/PaikkaKortti.tsx`, `app/components/DiagonaalKortti.tsx`, `app/components/PaikkaSheet.tsx`, `lib/types.ts`, `lib/supabaseSSR.ts`, `app/layout.tsx`, `lib/onboardingUtils.ts`
- Next.js App Router: route segment layouts as auth guards is the documented pattern for protecting route segments without middleware
- Supabase SSR: `createServerClient` in RSC layouts is the canonical server-side auth pattern; service key must never reach Edge Runtime
- Confidence: HIGH for all five questions — based on direct code inspection, not inference
