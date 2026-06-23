# Phase 56: Claim/create-rework — luo paikka alusta + nimikäytäntö - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Rework the onboarding entry point so a business **always creates a venue from scratch** — the existing "search for an existing venue to claim" flow is removed entirely. The create form collects two distinct, separately-stored name fields (`yritysNimi` / company, `toimipisteNimi` / branch) instead of one combined `nimi` input, with normalization applied so names are consistently formatted. The existing `UNIQUE(paikka_id)` conflict behavior (second business gets 409) is preserved unchanged.

Requirements: CLAIM-04, CLAIM-05.

**Explicitly NOT in scope for this phase** (see Deferred Ideas): any search-for-existing-venue UI, any access-request/grant workflow between business accounts for a shared venue, retroactive backfill/reformatting of existing name data, and duplicate-venue detection at create time.

</domain>

<decisions>
## Implementation Decisions

### Name normalization (CLAIM-05)
- **D-01:** Normalize `yritysNimi` and `toimipisteNimi` by trimming + collapsing internal whitespace + capping max length. **No casing transformation** (preserve user's exact casing — avoids mangling stylized names like "CrossFit" or Finnish suffixes like "Oy"/"Ay").
- **D-02:** Max length: **200 characters**.
- **D-03:** Build this as a **shared helper** (new file, e.g. `lib/normalizeNimi.ts`) rather than inline per-route — this is the first shared name-normalization utility in the codebase (today every route trims inline: `create-paikka`, `register`, `save-step`). Use it in `create-paikka` and any future edit route that touches these fields.
- **D-04:** **Forward-only** — do NOT backfill/reformat existing `business_accounts.company_name` or `liikuntapaikat.nimi` values retroactively. Normalization applies only to new writes from this phase onward.

### Where the two names get written
- **D-05:** `yritysNimi` → `UPDATE business_accounts.company_name` (JWT-verified write, following `create-paikka`'s existing verification pattern — this route currently only *reads* `company_name` for the admin email, it doesn't write it yet).
- **D-06:** `toimipisteNimi` → contributes to `liikuntapaikat.nimi`, but **`nimi` must be the combined string of both names**, not `toimipisteNimi` alone — venue cards/map pins should show full company+branch identity, not just the branch name.
- **D-07:** Combined format: **`"{yritysNimi} {toimipisteNimi}"`** — space-separated, no dash or other separator. Example: `"FitLife Oy Keskusta"`.
- **D-08:** `toimipisteNimi` is **optional**. If left empty, `nimi = yritysNimi` alone (trimmed, no trailing space artifact from the empty branch part).
- **D-09:** **Zero new columns / zero migration** required for this — `business_accounts.company_name` and `liikuntapaikat.nimi` already exist. The combination happens at write time in `create-paikka` (or wherever the create form submits).
- **Note on ROADMAP success criterion #4** ("pre-existing onboarding_draft/pending rows show filled, not empty, name fields thanks to backfill"): given D-09 (no new columns), this criterion is **satisfied as a structural no-op** — there is no new field that could be empty, since `company_name` and `nimi` already have values from the old flow. Flag this explicitly during verification rather than building an unnecessary backfill migration.

### What happens to "claim" (search-existing-venue)
- **D-10:** Delete outright: `app/api/business/claim-paikka/route.ts`, the `'search'` and `'claim'` steps in `ClaimSearchForm.tsx`, and the `is_claimed`/"JO HALLITTU" badge logic in the search-results UI. `ClaimSearchForm` becomes create-only (component may be renamed during planning — that's a planner-level call).
- **D-11:** The existing `409` conflict behavior is preserved: if a second business attempts to create against a `paikka_id` already linked via `business_paikka_links` (which shouldn't normally be reachable once search is gone, but the constraint stays as a safety net), the existing Postgres `23505` → 409 handling pattern (already used in `claim-paikka` and must be copied into any new write path per PITFALLS.md Pitfall 7) still applies.
- **D-12:** The `reapply` route (`app/api/business/reapply/route.ts`, UPDATE-not-INSERT on rejected→pending) is **unaffected** by this phase — it's a separate concern from claim-search removal.

### Duplicate-venue detection at create time
- **D-13:** **No detection in this phase.** Creating a venue from scratch does not check for similar existing names/addresses. Accepted as a known trade-off — real duplicate-avoidance belongs to the deferred search+access-request phase (see Deferred Ideas), not bolted onto the create form here.

### Claude's Discretion
- Exact file/component naming when `ClaimSearchForm.tsx` is reduced to create-only (rename vs. keep the name) is left to the planner.
- Exact implementation of the `yritysNimi`/`toimipisteNimi` → `business_accounts.company_name` write path (extend `create-paikka` directly vs. a small sibling call) is left to the planner — must follow the JWT-verified `supabaseAdmin` pattern already established in `create-paikka`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap / requirements
- `.planning/ROADMAP.md` §"Phase 56: Claim/create-rework — luo paikka alusta + nimikäytäntö" — exact goal and 4 success criteria. **Important:** criterion #4's backfill language is addressed by D-09's note above — confirm during verification that it's a structural no-op, don't build an unneeded migration.
- `.planning/REQUIREMENTS.md` — CLAIM-04, CLAIM-05.

### Research (already resolved much of this phase's data-model question)
- `.planning/research/ARCHITECTURE.md` — "Pattern 3: Where company-name vs. branch-name belongs" (the section this phase's D-05/D-06/D-09 are grounded in — confirms zero-migration approach, though this discussion's D-06/D-07 extend it: `nimi` is now a *combination*, not branch-name alone, which the ARCHITECTURE.md doc did not anticipate — downstream agents should treat D-06/D-07 as superseding ARCHITECTURE.md's literal wording on this one point).
- `.planning/research/PITFALLS.md` Pitfall 7 (lines 159-176) — `UNIQUE(paikka_id)` constraint must not be loosened; any new write path to `business_paikka_links` must handle `23505` the same way `claim-paikka` does.
- `.planning/research/PITFALLS.md` Pitfall 8 (lines 183-205) — in-flight `onboarding_draft`/pending rows under the old single-`nimi` shape; relevant context for why ROADMAP success criterion #4 exists, even though D-09 means no actual backfill code is needed.

### Prior-phase context
- `.planning/phases/54-sijainti-karttapinni-osoitehaku-onboardingissa/54-CONTEXT.md` — Phase 54 already wired `SijaintiPicker` into `ClaimSearchForm`'s `create` step (lat/lng + address + city). This phase (56) must **reuse** that component when restructuring `ClaimSearchForm`, not rebuild it. Phase 54's context explicitly states it deferred the claim/create *structural* rework to Phase 56.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/SijaintiPicker.tsx` (wired in by Phase 54) — map+autocomplete location picker already integrated into `ClaimSearchForm`'s create step. Keep as-is; only the surrounding form structure changes.
- `INPUT_CLASS` / `SELECT_CLASS` / `CTA_CLASS` constants at the top of `ClaimSearchForm.tsx` — reuse for the new combined yritys/toimipiste name inputs.
- `AnimatePresence mode="wait"` opacity-only crossfade — existing step-transition pattern in `ClaimSearchForm.tsx`, follow for whatever steps remain after claim/search removal.

### Established Patterns
- JWT-verification + `supabaseAdmin` write pattern in `app/api/business/create-paikka/route.ts` (verify `Authorization` header → `supabaseAdmin.auth.getUser(token)` → confirm `business_accounts` row exists → write with verified `user.id`, never trust body for identity). The new `business_accounts.company_name` UPDATE must follow this exact pattern.
- Atomicity/rollback pattern in `create-paikka/route.ts` (lines ~78-89): if the `business_paikka_links` INSERT fails after the `liikuntapaikat` INSERT succeeded, the venue row is deleted to avoid orphans. Preserve this if restructuring the route.
- Inline trim+slice convention (`.trim().slice(0, N)`) used in `create-paikka`, `register`, `save-step` routes — D-03 introduces the first shared helper, but the calling convention (call it right before the DB write) should match.

### Integration Points
- `app/business/page.tsx` — renders `ClaimSearchForm` in two places (lines ~301, ~342: the "no venues yet" dashboard branches). Confirm both call sites still work once the component is create-only.
- `app/api/business/create-paikka/route.ts` — current body shape `{nimi, osoite, kaupunki, latitude, longitude}`. Must change to accept `{yritysNimi, toimipisteNimi, osoite, kaupunki, latitude, longitude}` (or similar), compute combined `nimi` per D-06/D-07, and add the `business_accounts.company_name` UPDATE per D-05.
- `app/business/onboarding/StepPaikka.tsx` — read-only summary step, displays whatever `nimi`/`osoite`/`kaupunki` ended up on the venue. No changes needed here (it already just displays `paikkaInfo.nimi`), but verify it reads correctly once `nimi` is a combined string.

</code_context>

<specifics>
## Specific Ideas

No visual mockup was provided for the restructured create form. Follow CLAUDE.md's existing glassmorphism design system and the form conventions already established in `ClaimSearchForm.tsx`'s `create` step — no new visual language.

The combined-name decision (D-06/D-07) was the one substantive deviation from the existing ARCHITECTURE.md research: the user explicitly wants venue cards/map pins to show both company and branch identity in one string ("FitLife Oy Keskusta"), not just the branch name as originally researched.

</specifics>

<deferred>
## Deferred Ideas

- **Access-request workflow for already-claimed venues** — during discussion, the user twice proposed restoring a form of "claim": search existing venues, and if a match is found, send a request to the controlling `business_account_id` for shared/transferred access (rather than the current hard 409 reject). This directly contradicts ROADMAP.md's locked Phase 56 success criteria #1 ("no existing-venue search; always create from scratch") and #3 ("second business still gets 409"). Explicitly deferred to its **own future phase** — it needs its own roadmap entry, success criteria, and a request/grant data model (new table or new `business_paikka_links` semantics, notification to the venue's current owner, approve/deny UI). Adjacent to PROJECT.md's already-deferred CHAIN-01 ("Ketjuadmin — yksi tili, useita toimipisteitä eri omistajilla") but inverse in shape (multiple accounts wanting one venue, vs. one account wanting multiple venues) — worth scoping together with CHAIN-01 when that work is eventually picked up.
- **Soft duplicate-venue warning at create time** (non-blocking "a similar venue already exists" notice using a lightweight name+city query) — considered and explicitly rejected for this phase (D-13); revisit only if the deferred access-request phase above doesn't fully address duplicate-avoidance on its own.

### Reviewed Todos (not folded)
None — `todo.match-phase` returned 0 matches for Phase 56.

</deferred>

---

*Phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt*
*Context gathered: 2026-06-24*
