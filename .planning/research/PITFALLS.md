# Domain Pitfalls — v1.8 Yritysportaali v2

**Domain:** Adding role-based routing, dual-mode UX, business data publication, and wizard refactor to an existing Next.js 14 + Supabase app.
**Researched:** 2026-06-11
**Codebase version:** Post-v1.7; middleware.ts exists but only refreshes session, /admin is client-guarded only, OnboardingWizardInner and EditWizardInner are separate duplicated orchestrators.

---

## Critical Pitfalls

### Pitfall 1: Middleware redirect loop when checking role from database

**What goes wrong:** The middleware calls `supabase.auth.getUser()` (correct), then does a DB lookup to `profiles` or `business_accounts` to check role, and redirects. If the DB lookup is slow or the matcher is too broad, every request — including the redirect destination — runs the DB query, creating O(n) DB calls per page load. If the redirect destination itself is inside the matcher, you get an infinite loop: middleware fires → DB lookup → redirect to /business → middleware fires again.

**Why it happens:** Next.js middleware runs on every matched request including the destination of a redirect. The matcher in the current codebase already matches all non-static routes. Adding a DB query inside middleware that conditionally redirects to a path also inside the matcher triggers the loop.

**Consequences:** Every user sees a 500 or infinite redirect. Consumer users are also affected — middleware runs for them too. Cold-start latency on every request because edge runtime makes a Supabase HTTP call (getUser already does one; a DB lookup makes it two).

**Prevention:**
- Never query `business_accounts` or `profiles` inside middleware. Middleware should only inspect the JWT. Role data belongs in the JWT (via Supabase Custom Access Token Hook) or should be handled at the page/layout level via a server component that reads cookies.
- The existing pattern in `/business/page.tsx` — client-side `useEffect` checking `business_accounts` — is acceptable for the business dashboard. Extend this pattern rather than moving checks into middleware.
- If server-side role gating is needed for `/business/*`, use a Server Component layout (`app/business/layout.tsx`) that calls `createServerSupabase(cookieStore)` + `getUser()` + one DB check. Server component layouts do not trigger middleware loops.
- Keep the middleware strictly to session refresh (`getUser()` → cookie update) as it is today. Add role logic only in layouts or pages.

**Detection:** Rapid-fire Network tab requests all returning 307, growing infinitely. Console shows "ERR_TOO_MANY_REDIRECTS".

---

### Pitfall 2: Flash of wrong UI — consumer homepage briefly rendered for logged-in business users

**What goes wrong:** `app/page.tsx` is a Server Component that fetches paikat and renders `<Etusivu>`. If a business user hits `/`, they see the consumer map for 200–400 ms before a client-side redirect fires. This is both confusing UX and a hydration landmine if the redirect causes a layout change mid-render.

**Why it happens:** The current `/business/page.tsx` is a Client Component with a `useEffect` that checks business role. Any server-rendered page will paint before that check resolves. v1.8 wants to show business users a dashboard instead of the consumer map — if the detection stays client-only, the flash is unavoidable.

**Consequences:** Business user sees consumer map flash. If `<Etusivu>` mounts GPS logic and AI widget before the redirect, those fire unnecessarily. If the redirect is then to `/business`, the user sees two full-page transitions.

**Prevention:**
- In `app/page.tsx`, call `createServerSupabase(cookieStore)`, call `getUser()`, then query `business_accounts`. If row exists, `return redirect('/business')`. This is a server-side redirect (no flash) before any HTML is painted.
- The risk: adding a DB query to `app/page.tsx` adds latency for every consumer page load (the majority). Mitigation: add a `is_business` custom claim to the JWT via Supabase Auth Hook so the check is JWT-only — no DB hit. If the Auth Hook approach is deferred, accept the single extra DB query on `/` for logged-in users only (anonymous users skip it because `getUser()` returns null).
- Do NOT add a `useEffect` redirect inside `<Etusivu>` — this flash is what we are trying to avoid.

**Detection:** Open DevTools Network tab as a business user hitting `/`. If you see the consumer page HTML in the first response before a 307, the flash is happening.

---

### Pitfall 3: Approval + sync race condition overwrites just-published business data

**What goes wrong:** Admin approves → `approve/route.ts` sets `published=true` → business data is now live. Meanwhile the cron/manual `sync-paikat` script runs (or is triggered by someone). The sync script queries `business_managed=true` to skip managed venues. But: `claim-paikka/route.ts` does **not** set `business_managed=true` (this is the existing W1 warning from v1.7 audit). For claimed venues (link_type='claim'), only `onboarding/submit` sets `business_managed=true`. If admin approves before onboarding submit completes, the venue is `published=true` but `business_managed=false`. The next sync run will upsert Google Places data over the business-entered data.

**Why it happens:** The approval and sync paths are decoupled. The sync script's guard is `business_managed=true`, but this flag is not set atomically with approval. There is a window between claim creation and onboarding submit completion where the flag is missing. The v1.8 plan adds "business data syncs to paikat after admin approval" — this publication step must ensure `business_managed=true` is set atomically with `published=true`.

**Consequences:** Business owner's carefully entered hours, prices, and descriptions silently overwritten by Google Places data the next time sync runs. Business owner sees their data disappear without explanation.

**Prevention (specific to this codebase):**
- In `approve/route.ts` Step 6, when setting `published=true`, also set `business_managed=true` in the same UPDATE call: `update({ published: true, business_managed: true })`. One atomic call.
- As belt-and-suspenders (the W1 tech debt): in `claim-paikka/route.ts`, also set `business_managed=true` on the `liikuntapaikat` UPDATE. This closes the sync window even before onboarding submit.
- The v1.8 "sync onboarding draft data to paikat on approval" feature should run inside `approve/route.ts` as a sequential supabaseAdmin call sequence. Do not introduce a separate async job — partial writes will leave `published=true` with stale data (see Pitfall 4).

**Detection:** Check `business_managed` column for recently-approved claimed venues in Supabase table editor. If `false` after approval, the window is open.

---

### Pitfall 4: Partial write on approval — published=true with no business data synced yet

**What goes wrong:** v1.8 will add "sync business data to paikat on approval." The approval route currently does: (1) set `claim_status='approved'`, (2) optionally set `published=true`, (3) send email. The new sync step will be a third write. If step 2 succeeds but the sync write (step 3) fails, the venue is now public but showing Google Places placeholder data rather than the business's onboarding data.

**Why it happens:** Supabase does not support multi-table transactions via the JS client (`supabase-js`). Each `.update()` call is a separate HTTP request. There is no rollback if the second one fails.

**Consequences:** Venue is live (`published=true`) with stale or null business data. Business owner contacts support confused about missing data. Admin must manually trigger re-sync or set `published=false`.

**Prevention:**
- Write a Postgres function (via Supabase `rpc()`) that performs both updates in one transaction: approve the link, publish the venue, and copy the draft data fields — all inside `BEGIN; ... COMMIT;`. Call it from `approve/route.ts` as `supabaseAdmin.rpc('approve_business_link', { link_id, paikka_id })`.
- Alternatively, accept the partial-write risk and make it recoverable: log a structured error when the sync step fails, surface it in `/admin` UI, and ensure sync is idempotent (it already is). Do not silently continue on failure.
- Do not put the sync write behind a `try/catch` that swallows the error and returns `{ ok: true }` — the admin will believe the venue is live and correct when it isn't.

**Detection:** Health check query: `SELECT id, nimi, published, business_managed, image_url FROM liikuntapaikat WHERE published=true AND business_managed=true AND image_url IS NULL` — venues with null image after approval indicate partial write if the business had uploaded photos.

---

## Moderate Pitfalls

### Pitfall 5: Wizard refactor breaks the onboarding flow via prop-contract drift

**What goes wrong:** `OnboardingWizardInner` and `EditWizardInner` both import the same step components (`StepMediat`, `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`) but pass different props. Merging into a single `WizardInner(mode: 'onboarding' | 'edit')` requires normalizing the prop interface of each step. Any prop renaming or type change that isn't mirrored identically breaks whichever mode wasn't tested first.

**Why it happens:** The step components were written for onboarding first; edit added them via `import` without refactoring the contracts. `StepMediat` in edit mode uses `paikka.photo_urls` (from server snapshot); in onboarding mode it uses `initialDraft?.media_urls`. These are different shapes hitting the same component.

**Consequences:** Silent data loss (wrong field read), TypeScript errors hidden by `as unknown as X` casts that already exist in the codebase, or onboarding working while edit regresses.

**Prevention:**
- Before merging orchestrators, document the prop contract for each step component. Make TypeScript strict — remove any `as unknown` casts.
- Refactor in this order: (1) normalize step component props, (2) write tests for each step in both modes, (3) merge orchestrators. Do not merge orchestrators first.
- The existing `OnboardingDraft` type in `lib/onboardingUtils.ts` is the shared data shape — ensure both modes converge on it rather than introducing a second draft shape.
- Keep the URL contract intact: onboarding uses `?step=N&paikka_id=N`, edit uses `/business/[id]?step=N`. The merged orchestrator accepts `paikkaId` as a prop (from route segment for edit, from URL/draft for onboarding).

**Detection:** After merge, run the full onboarding flow (register → claim → wizard steps 1–6 → submit) AND the full edit flow (business panel → Muokkaa → save each section). Any 500 or 403 from `save-step` or `update-paikka` indicates a prop-contract regression.

---

### Pitfall 6: `onboarding_completed` dead column causes incorrect gate logic in v1.8 code

**What goes wrong:** `business_accounts.onboarding_completed` is written by `onboarding/submit` route but never read. The actual gate in `app/business/page.tsx` is draft-presence: if `onboarding_draft` row exists, redirect to wizard. Any v1.8 code that reads `onboarding_completed` to decide routing behavior will be wrong — the column says `true` even for users currently mid-onboarding on a second venue.

**Why it happens:** D-03 contract in the codebase says `onboarding_completed` gates `/business`, but the actual implementation uses draft presence. Two sources of truth for the same gate.

**Prevention:**
- v1.8 tech debt cleanup: either (a) delete the `onboarding_completed` column and all code that writes it, replacing with explicit draft-presence check everywhere, or (b) redefine and document it clearly. Do not add any new v1.8 code that reads this column for routing decisions.

---

### Pitfall 7: `getSession()` vs `getUser()` — admin middleware adds a security regression if done wrong

**What goes wrong:** `app/admin/page.tsx` uses `supabase.auth.getSession()` on the client side. `getSession()` does not re-validate the JWT with the Auth server — it trusts the local cookie. If v1.8 adds middleware for `/admin` and uses `getSession()` instead of `getUser()`, an attacker with a locally-modified cookie can reach the route before the API 403 fires.

**Why it happens:** `getSession()` is faster (no network call) and is commonly used in examples. The difference from `getUser()` is subtle and poorly documented in older examples.

**Consequences for v1.8:** Any middleware using `getSession()` for the is_admin check provides only client-cookie-level security (easily bypassed) rather than server-validated security.

**Prevention:**
- The v1.8 middleware for `/admin` must call `supabase.auth.getUser()` (not `getSession()`). The existing `middleware.ts` already calls `getUser()` — extend that pattern.
- For the is_admin check: do NOT query the `profiles` table in middleware (see Pitfall 1). Add `is_admin` to the JWT via a Supabase Custom Access Token Hook. This allows a zero-DB-hit admin check in middleware by reading a JWT claim. If the Auth Hook is deferred, keep /admin with client-side guard + API 403 (current accepted state).

---

### Pitfall 8: Dual-mode UX breaks the consumer homepage by over-scoping the route restructure

**What goes wrong:** v1.8 wants a business dashboard for logged-in business users and the consumer map for everyone else. The temptation is to restructure `app/page.tsx` with a complex conditional tree or introduce new layout route groups `(business)/` and `(consumer)/`. Both approaches risk breaking `<Etusivu>` — a ~600-line Client Component with GPS hooks, AI widget, map, bottomsheet, and deeply coupled state.

**Why it happens:** `<Etusivu>` was stabilized over v1.4–v1.6. Any change to how `app/page.tsx` renders or which layout wraps it can affect the bottomsheet animation, GPS auto-request on mount, AI widget non-blocking load, and sessionStorage-based scroll restoration.

**Consequences:** Map stops rendering, GPS fails to request, AI widget stops loading, bottomsheet state resets on every navigation — caused by a layout restructuring meant only to add a business dashboard.

**Prevention:**
- Keep `app/page.tsx` structurally identical to v1.7 for consumers. The only addition is a single early-return server-side redirect for business users (before the `supabase.from('liikuntapaikat')` query).
- Test after adding the redirect: load `/` as an anonymous user and confirm the consumer map renders identically to v1.7. The redirect code path must only fire when `getUser()` returns a user AND `business_accounts` row exists.
- "Avaa kartta ilman consumer-featureja" means adding a link inside `/business` — not modifying the consumer map route.

---

### Pitfall 9: Created venues without place_id generate duplicates on next sync run

**What goes wrong:** After approval + publication of a created venue (link_type='created', no `place_id`), if sync-paikat is run for the same city and happens to find the same physical venue via Google Places, the upsert `onConflict: 'place_id'` has nothing to match (place_id is NULL) and INSERTs a new row — creating a duplicate.

**Why it happens:** Created venues don't have a Google Places place_id. The sync uses `place_id` as the upsert key. NULL is not a match target for `onConflict`.

**Consequences:** Duplicate venue rows. Consumer users see the same gym twice on the map.

**Prevention:**
- For created venues: if the business adds their venue's Google Places place_id during onboarding (or admin adds it during review), the upsert deduplicates correctly.
- Alternatively: ensure created venues are always `business_managed=true` after approval (Pitfall 3/4 fixes ensure this). The sync already skips `business_managed=true` rows in the pre-filter step — so as long as the approval write is atomic, created venues are protected. Verify this assumption holds by checking: does the sync pre-filter use `place_id` or `id`? It uses `place_id` (the managedSet is built from `place_id` values). Created venues with NULL place_id will not be in the managedSet. The insert will create a duplicate if Google Places finds the same physical venue.
- Fix: in the sync pre-filter, also exclude rows where `business_managed=true AND place_id IS NULL` by joining on `nimi+osoite+kaupunki` similarity, OR by adding a `UNIQUE` constraint on `(nimi, kaupunki)` for created venues, OR by requiring admins to add place_id during approval for created venues.

---

### Pitfall 10: `NextResponse` cookie forwarding lost when adding redirect logic to middleware

**What goes wrong:** When extending middleware to add redirect logic, the common mistake is to return a new `NextResponse.redirect()` directly without copying the cookies from the existing `supabaseResponse`. If `getUser()` triggered a token refresh, the `Set-Cookie` header is only on `supabaseResponse` — the new redirect response has no cookies.

**Why it happens:** `@supabase/ssr` writes refreshed tokens to the `supabaseResponse` object created inside `setAll`. Returning a different response object loses those cookie updates.

**Consequences:** Token refresh silently fails. Next request still has the expired token. On high-traffic pages this causes double-refresh errors (single-use refresh tokens consumed by parallel requests).

**Prevention:**
```typescript
// WRONG — loses refreshed cookies:
if (isBusinessUser) return NextResponse.redirect(new URL('/business', request.url))

// CORRECT — carries refreshed cookies into the redirect:
if (isBusinessUser) {
  const redirectResponse = NextResponse.redirect(new URL('/business', request.url))
  supabaseResponse.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirectResponse
}
return supabaseResponse
```

**Detection:** After adding redirect logic, log in as a business user and watch Network tab for `Set-Cookie` headers on the redirect response. If absent when a token refresh was expected, the cookie-forwarding is broken.

---

## Minor Pitfalls

### Pitfall 11: `onboarding_draft` delete in submit route uses `business_account_id` only — wrong draft deleted for multi-venue users

**What goes wrong:** Step 6 of `onboarding/submit/route.ts` deletes the draft with `.eq('business_account_id', user.id)` only, without filtering by `paikka_id`. For a business adding a second venue, this could delete the wrong draft row if two drafts exist simultaneously.

**Prevention:** Change the delete to `.eq('business_account_id', user.id).eq('paikka_id', draft.paikka_id)`. This is the same scoping pattern used in `saveAndAdvance` in `OnboardingWizardInner`.

---

### Pitfall 12: Business dashboard "Avaa kartta" link bounces off the server-side business redirect

**What goes wrong:** If "Avaa kartta" is a link to `/`, a business user hits the server-side redirect (added in Pitfall 2 prevention) and bounces back to `/business`. The feature is self-defeating.

**Prevention:** Options: (a) add `?skipBusinessRedirect=1` query param and skip the redirect for that specific param, (b) create a dedicated `/kartta` route that renders the map without the business redirect guard, (c) implement "open map" as an overlay or modal within `/business` without a full route change. Option (b) is cleanest for maintainability.

---

### Pitfall 13: `image_url` becomes stale after photo edit in `/business/[id]`

**What goes wrong:** `onboarding/submit` sets `image_url = draft.media_urls?.photos?.[0]`. Later, the business owner edits photos via the edit wizard. `update-paikka/route.ts` updates `photo_urls` but does NOT update `image_url`. PaikkaKortti shows `image_url` as the primary photo — after a photo edit, the list card still shows the old first photo.

**Prevention:** In `update-paikka/route.ts`, when `section='mediat'`, include `image_url: d.photo_urls?.[0] ?? null` in `updatePayload`. One-line fix.

---

### Pitfall 14: `/profiili` consumer-specific fields shown to business users

**What goes wrong:** The profile page always renders sport interest checkboxes and home city selector — consumer-only concepts. Business users visiting `/profiili` see irrelevant UI.

**Prevention:** Do the same `business_accounts` check in the profile page (client `useEffect` or server component check) and conditionally hide consumer sections. Keep auth/password management visible for all users.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Tech debt: wizard refactor | Prop-contract drift between onboarding/edit modes (P5); wrong draft deleted (P11) | Document step prop contracts before merging; fix delete clause filter first |
| Tech debt: claim business_managed fix | Sync window still open (P3) | One-line fix: add `business_managed: true` to claim-paikka UPDATE |
| Tech debt: /admin server middleware | getSession vs getUser regression (P7); DB lookup loop (P1) | Use getUser only; no DB lookup in middleware — use JWT claim or layout server component |
| Tech debt: onboarding_completed cleanup | Dead column misleads future code (P6) | Delete column or clearly redefine; remove from submit route |
| Julkistaminen: approval + data sync | Partial write (P4); sync race (P3) | Atomic approval+sync write via Postgres function; add business_managed=true atomically |
| Business UX: dashboard homepage | Flash of wrong UI (P2); consumer homepage broken by route change (P8) | Server-side redirect in page.tsx only; do not touch Etusivu props |
| Business UX: "Avaa kartta" | Business redirect loop if linked to / (P12) | Dedicated /kartta route |
| Business UX: /profiili redesign | Consumer fields shown to business users (P14) | Role-check in profile page; conditional section render |
| Any middleware change | Lost token refresh on redirect response (P10) | Copy supabaseResponse cookies onto redirect response before returning |

---

## Sources

- Supabase SSR advanced guide (token refresh, cookie handling): https://supabase.com/docs/guides/auth/server-side/advanced-guide
- Supabase getUser vs getSession security: https://github.com/orgs/supabase/discussions/23224
- Supabase custom claims RBAC (JWT-based role in middleware): https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Next.js middleware redirect loop patterns: https://github.com/nextauthjs/next-auth/discussions/4136
- Edge runtime DB lookup limitations for role checks: https://dev.to/sayankhan313/edge-runtime-vs-nodejs-in-nextjs-lessons-from-role-based-auth-middleware-1nph
- Supabase race condition / SERIALIZABLE isolation: https://github.com/orgs/supabase/discussions/30334
- @supabase/ssr setAll / NextResponse.next pitfall (setAll not on ResponseCookies): https://github.com/supabase/supabase/issues/27505
- v1.7 Milestone Audit (primary source for existing tech debt and known gaps): `.planning/v1.7-MILESTONE-AUDIT.md`
- Source code reviewed: `middleware.ts`, `approve/route.ts`, `sync-paikat/route.ts`, `claim-paikka/route.ts`, `onboarding/submit/route.ts`, `update-paikka/route.ts`, `app/business/page.tsx`, `EditWizardInner.tsx`, `OnboardingWizardInner.tsx`, `app/page.tsx`, `lib/supabaseSSR.ts`
