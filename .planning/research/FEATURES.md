# Feature Research

**Domain:** Business onboarding for a local-listing / directory marketplace — manual venue creation, map-based location placement, dashboard draft-resume UX, naming conventions for self-entered chain/single-location business names
**Researched:** 2026-06-22
**Milestone:** v3.0 Oma tietokanta (Google Places -irtautuminen)
**Confidence:** MEDIUM-HIGH (Google Business Profile guidelines are HIGH confidence/official; general onboarding-UX and map-picker patterns are MEDIUM — synthesized from multiple industry sources, not a single authoritative spec; codebase findings are HIGH confidence since they're read directly from the actual implementation)

## Context From Existing Codebase

Before recommending anything, three load-bearing facts from the current implementation constrain every recommendation below:

1. **`app/business/page.tsx` (lines 191-200) currently has the exact bug item 3 asks to fix**: on every dashboard load it queries `onboarding_draft` for the logged-in business, and if *any* row exists it unconditionally `router.push('/business/onboarding')` — no UI, no opt-out, no per-venue indicator. This must become a dashboard-visible badge per venue, not a redirect.
2. **`onboarding_draft` is already venue-scoped** (`UNIQUE(business_account_id, paikka_id)`, FK to `liikuntapaikat.id`) — multi-venue draft tracking needs no new schema, only a query change (fetch all drafts, not just check existence) and UI to surface them per `VenueRow`.
3. **`ClaimSearchForm.tsx`'s `create` step already collects `nimi` (single name field) + `osoite` (free-text address) + `kaupunki` (dropdown)** — this is the exact flow item 2 and 3 of FEATURES below replace. The "search for existing venue" step (`step: 'search'`) becomes dead code once Google-sourced venues are deleted — there is nothing left to search.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Map pin + address-autocomplete combined location picker | Every modern local-listing/marketplace onboarding (Uber Eats merchant signup, DoorDash, Airbnb host map step, Google Business Profile) pairs a search box with a draggable/clickable pin — users expect to type an address AND fine-tune visually | MEDIUM | Bidirectional sync: autocomplete selection moves pin + zooms map; pin drag/click reverse-geocodes back into the address field. Use Google Places Autocomplete (per STACK.md, ephemeral use only) + click listener on existing `@vis.gl/react-google-maps` instance. Store only `lat/lng` + the user-typed address string — no Places `place_id` retained (per milestone goal of full Google Places decoupling) |
| Single required venue name field at creation time | Every directory/marketplace (Yelp Add Business, Google Business Profile, Foursquare) requires exactly one "name" field before anything else — it's the anchor identity of the listing | LOW | Already exists (`createNimi` in `ClaimSearchForm`) — keep as the single source-of-truth field, see naming-convention section below for how chains should fill it |
| "Cannot find / does not exist yet → create new" entry path | Standard pattern across Yelp, Google Business Profile, TripAdvisor — but in this milestone it becomes the *only* path since the searchable database of Google-sourced venues is being deleted entirely | LOW | This isn't really "table stakes to add" — it's the entire claim flow collapsing into create-only. See Anti-Features below: do not keep a non-functional search step |
| Required-field validation before submit (name, address/pin) | Universal form-UX expectation — users get inline errors, not silent failures | LOW | Already exists (`errorNameRequired`, `errorAddressRequired` in `ClaimSearchForm`) — extend to require a pin placement too |
| Visible status/progress indicator for incomplete setup tasks | Progress bars and incomplete-state framing are a documented universal SaaS-onboarding pattern (Zeigarnik effect: visible incompleteness drives completion) — directly informs item 3 | LOW-MEDIUM | Reuse existing `ProgressBar.tsx` step-indicator pattern from the wizard; just needs new placement on `VenueRow` in the dashboard |
| Dashboard never blocks access to existing functional views behind a forced wizard | Users expect dashboards to be the home base; forced redirects to setup flows (without an explicit "skip"/"later" affordance) are a widely criticized anti-pattern in onboarding UX literature | LOW | This is literally the bug being fixed — replace the `router.push` redirect with a badge + resume CTA |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Explicit "Yrityksen nimi" (company/brand) + "Toimipisteen nimi" (branch/location) two-field pattern for chains | Solves the exact chain-naming ambiguity that generic directories get wrong (see naming convention section) — sports-venue chains (e.g. a gym franchise with several Tampere locations) are common in this domain and a single free-text name field produces inconsistent, duplicate-looking listings ("Liikuntakeskus X Hervanta" vs "X Hervannan toimipiste" vs "X — Hervanta") | MEDIUM | New optional UI fields composing into the existing single `nimi` column (no schema split needed — see Naming Convention section) to avoid migrating every reader of `liikuntapaikat.nimi` (cards, map pins, search, SEO titles) |
| Per-venue onboarding-progress badge directly inside the existing venue list (not a separate "drafts" page) | Surfaces actionable state exactly where the business owner already looks (BIZPANEL-01 dashboard) — zero new navigation, lower cognitive load than a generic "drafts" inbox | LOW-MEDIUM | Render inline in `VenueRow`: badge ("Onboarding kesken") + "Jatka" CTA linking to `/business/onboarding?paikka_id=X`. Reuses existing claim_status badge visual language (amber/green/red pills already in `VenueRow`) |
| Reverse-geocode-assisted address text (auto-fills the free-text address field from the dropped pin) | Reduces manual typing error vs a fully free-text address field; still keeps human-authored text per milestone's "tallennetaan vain lat/lng + käyttäjän kirjoittama osoite" requirement | LOW-MEDIUM | Use Google Geocoding API reverse lookup only to *suggest* text into the address input on pin-drop — user can edit/override it, so the stored value stays "user-written" even if seeded by reverse geocoding |
| AI sport/category suggestion at onboarding (PROJECT.md target feature, adjacent to this question's scope) | Not one of the 4 items asked about directly, but shares the same StepPaikka/onboarding surface — flagged here only as a sequencing dependency, not designed in this document | — | See Dependencies section — do not conflate with the Sijainti step's own scope |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Keeping a "search existing venues" step even with an empty/near-empty table | Feels safer to preserve the existing UI shape (`ClaimSearchForm`'s `search` → `claim` → `create` three-step state machine) and avoid touching working code | After the Google-sourced data deletion, the search step will almost always return zero results (only previously self-created venues remain) — this adds a dead click-through step, increases time-to-create, and the `is_claimed`/`claim` UI branch becomes unreachable dead code that still needs maintaining | Collapse `ClaimSearchForm` to a single `create`-only flow (remove `step: 'search'` and `step: 'claim'` entirely, plus `/api/business/claim-paikka` becomes unused — flag for removal in this milestone's cleanup phase) |
| Auto-redirecting straight back into onboarding whenever a draft exists (current behavior) | Seems like "helpful" forced continuity — guarantees the business finishes setup | Removes user agency, breaks the dashboard's role as home base, makes it impossible to view other venues' status, manage profile, or use the map while one venue's onboarding is incomplete — this is the literal bug being fixed in item 3 | Always render the dashboard; show a non-blocking per-venue "kesken" badge + explicit "Jatka onboardingia" button |
| Free-text "branch name" field with zero guidance, no template/example | Looks like maximum flexibility for businesses | Produces inconsistent display names across the directory (some show "Liikuntakeskus X", others "X Hervanta", others "X - Hervannan toimipiste, 2 krs") which look unprofessional side-by-side on a map/list and hurts search/sport-filter UX | Provide a clear composed-name convention with a live preview of how the name renders on `PaikkaKortti`/map pin before submit (see Naming Convention) |
| Allowing the pin to be placed without ever opening the map (lat/lng defaulted to city centroid or geocoded-only) | Saves a step, feels faster for businesses in a hurry | Produces systematically wrong pin clusters at city center — a known failure mode of geocode-only location entry; defeats the entire purpose of MAP-* features (Sponsored badge, distance sort, GPS recenter) since this venue's distance numbers would be wrong | Always require an explicit pin placement (click or drag) before allowing "Next"; autocomplete only assists, never fully substitutes for the pin |
| Allowing onboarding resume only via re-finding/re-searching the venue (old claim-flow pattern) | Matches the old `ClaimSearchForm`-driven UX where users found-then-resumed | Forces the business to remember which venue name they used and search for it again — friction that increases abandonment, defeats the purpose of item 3 | Resume must be a one-tap link from the dashboard's per-venue badge — no search step required |

## Feature Dependencies

```
[Map pin + autocomplete location step]
    └──requires──> [StepPaikka rework: collect nimi + lat/lng + osoite together, not via ClaimSearchForm pre-step]
                       └──requires──> [Schema: liikuntapaikat.latitude/longitude already exist (confirmed in app/business/page.tsx VenueLiikuntapaikka type) — no new columns needed for coordinates]

[Claim-flow collapse to create-only]
    └──requires──> [Google Places venue data deletion (separate milestone task — must land before or alongside this, or ClaimSearchForm's search step still returns stale claimable rows)]
    └──conflicts──> [Keeping /api/business/claim-paikka route and is_claimed UI branch — both become dead code]

[Dashboard draft-resume badge]
    └──requires──> [Query change in app/business/page.tsx: fetch onboarding_draft rows (not just .limit(1) existence check), join/match against venueLinks by paikka_id]
    └──enhances──> [Existing VenueRow status-badge visual pattern (claim_status pills) — extend with a 4th visual state, not a parallel system]

[Naming convention (Yritys — Toimipiste pattern)]
    └──enhances──> [StepPaikka / create-venue form UI — add a second optional input + live-preview composition]
    └──conflicts──> [Single free-text nimi field with no structure — cannot coexist with a clean chain-naming guarantee]

[AI sport/category suggestion (PROJECT.md adjacent feature, not designed here)]
    └──shares-surface-with──> [StepPaikka rework] — sequence both StepPaikka changes (location + AI category) in the same phase to avoid touching this component twice
```

### Dependency Notes

- **Map pin step requires StepPaikka rework, not a new component bolted onto ClaimSearchForm:** Since `ClaimSearchForm`'s search/claim machinery is being removed, the location-and-name collection logically belongs in (or replaces) `StepPaikka.tsx` inside the wizard itself, run once per new venue, rather than as a pre-wizard gate. This avoids splitting venue-creation logic across two different components with two different submit paths.
- **Claim-flow collapse requires the Google Places data deletion to land first (or at least the same phase):** if old Google-sourced rows remain queryable, the dead "search" step will still show results, contradicting the "every business creates from scratch" requirement and confusing testers.
- **Dashboard badge enhances rather than replaces the existing status-pill pattern:** `VenueRow` already renders a `claim_status` pill (approved/rejected/pending). The new "onboarding kesken" indicator should visually sit alongside or above that pill as a distinct state (a venue can simultaneously be "pending admin approval" AND have no draft, or have a draft and not yet be submitted at all — these are different axes and must not be merged into one enum).
- **Naming convention conflicts with leaving `nimi` as unstructured free text:** any chain-naming guidance is cosmetic/voluntary unless the UI actively composes the string for the user. Recommend a light-touch solution (template + live preview, see below) rather than a backend schema split, to avoid migrating every reader of `liikuntapaikat.nimi` (PaikkaKortti, DiagonaalKortti, map pins, SEO `<title>`, search `ilike`).
- **AI sport/category suggestion shares StepPaikka's surface:** both this feature and the map/Sijainti step touch `StepPaikka.tsx` — sequence them in the same phase rather than two separate phases that each re-touch the same component.

## Naming Convention Recommendation (Concrete, Implementable)

Based on Google Business Profile's official multi-location guidance (HIGH confidence — official source) and observed patterns from Yelp/marketplace onboarding (MEDIUM confidence — industry convention, not a single spec):

**Rule set to implement in the create-venue form:**

1. **Single-location business:** one name field, no special handling. E.g. `"Tampereen Squash-keskus"`.
2. **Chain / multi-location business:** present **two inputs** in the create form:
   - `Yrityksen nimi` (brand name) — e.g. `"FitLife Gym"`
   - `Toimipisteen sijainti` (location/branch identifier) — e.g. `"Hervanta"` or `"Keskusta"`
   - The form **auto-composes** the stored `nimi` field as `"{Yrityksen nimi} {Toimipisteen sijainti}"` (space-separated, Google's own pattern: `"Starbucks Stockholm"`, not a dash) — show this composed string live as a preview label above the submit button, consistent with the live-preview convention already established elsewhere in the wizard (`LivePreviewPane.tsx` per CLAUDE.md).
   - **Do not** default to em-dash or pipe separators (`"FitLife Gym — Hervanta"`) — Google's own examples and most directory conventions use a plain space-joined city/branch suffix, which reads more naturally in Finnish address-adjacent contexts and avoids inconsistent dash/space rendering across truncated card/pin labels.
3. **Detect "is this a chain" with a simple yes/no toggle**, not automatic inference — asking the business directly ("Onko tämä yksi useista toimipisteistä?") is simpler and more reliable than trying to detect duplicate brand names server-side, and avoids a false-positive UX where a single coincidentally-named venue gets treated as a chain.
4. **Capitalization rule:** Title Case for the composed name, normalized server-side on save (first letter of each significant word capitalized; Finnish stopwords like `ja`, `tai` lowercase) — prevents all-caps or all-lowercase manual entry from degrading visual consistency on cards/map pins. Implement as a pure function (e.g. `lib/nimiNormalisointi.ts`) following the existing `lib/lajit.ts`/`lib/aukiolo.ts` single-source-of-truth convention already established in this codebase, rather than inline formatting in the form component — keeps it testable and lets it also be applied to AI-suggested names (the website-scraper AI step may also propose a venue name).
5. **Do not enforce uniqueness server-side at MVP** — two different "Liikuntakeskus" chains in different cities can legitimately share a brand name; rely on `osoite`/`kaupunki` + map position for disambiguation, consistent with how the existing same-address pin-clustering (MAP-09) already disambiguates visually.

## MVP Definition

### Launch With (v1 — this milestone)

- [ ] Sijainti step: map + Places Autocomplete combined picker (click-to-pin, search-to-pin+zoom), storing only `lat/lng` + user-edited address text — essential per milestone goal of full Google Places sync decoupling
- [ ] `ClaimSearchForm` collapsed to create-only (remove search/claim branches, dead-code `/api/business/claim-paikka`) — essential because there is nothing left to search once Google-sourced rows are deleted
- [ ] Chain naming: two-field (`Yrityksen nimi` + `Toimipisteen sijainti`) input with yes/no chain toggle, client-composed `nimi`, live preview — essential to avoid an immediate naming-quality regression once Google's canonical names disappear
- [ ] Name normalization function (Title Case, Finnish stopword handling) applied on save — essential, low cost, prevents a visible quality drop on day one
- [ ] `/business` dashboard: remove auto-redirect; add per-venue "Onboarding kesken" badge + "Jatka" resume link — essential, this is literally the reported bug

### Add After Validation (v1.x)

- [ ] Reverse-geocode-assisted address text auto-fill on pin drop (nice UX polish, not blocking — manual address typing already satisfies the requirement)
- [ ] Server-side duplicate-name/duplicate-location fuzzy warning ("a venue with a similar name already exists nearby — is this the same place?") — valuable once enough self-sourced data accumulates to make false-duplicate creation a real risk
- [ ] Admin-side surfacing of which venues are "draft, never submitted" vs "submitted, pending" — useful for admin queue triage once volume grows

### Future Consideration (v2+)

- [ ] Ketjuadmin (single account managing multiple branches with shared brand identity/logo across locations) — already flagged as deferred in PROJECT.md "Future" section; the naming convention above is designed to not block this later feature (brand name input can later become a shared `chains` table FK without breaking existing composed-name strings already saved)
- [ ] Automatic chain detection via fuzzy brand-name matching across existing venues — defer until there's enough self-sourced volume to make this useful rather than noisy

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Map + autocomplete Sijainti step | HIGH | MEDIUM | P1 |
| Collapse claim-flow to create-only | HIGH | LOW | P1 |
| Dashboard draft-resume badge (fix auto-redirect bug) | HIGH | LOW | P1 |
| Chain naming two-field pattern + live preview | MEDIUM-HIGH | MEDIUM | P1 |
| Name normalization (Title Case) function | MEDIUM | LOW | P1 |
| Reverse-geocode address auto-fill | MEDIUM | LOW-MEDIUM | P2 |
| Duplicate-venue fuzzy warning | MEDIUM | MEDIUM | P3 |
| Ketjuadmin (shared multi-branch account) | MEDIUM | HIGH | P3 (already deferred) |

**Priority key:**
- P1: Must have for this milestone's launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor / Reference Pattern Analysis

| Feature | Google Business Profile | Yelp for Business | Our Approach |
|---------|--------------------------|--------------------|---------------|
| Chain naming | Same brand name across all locations in a country; location suffix only if it's part of the *official* registered name (e.g. "Starbucks Stockholm") | Single free-text name field, no formal chain guidance; relies on manual moderation to catch duplicates | Two-field input (brand + branch) composed into one stored string with a plain-space join, mirroring Google's own real-world pattern, but exposed as guided UI rather than a moderation-after-the-fact fix |
| Location entry | Pin placement required; supports both address-search and manual drag | Address typed, geocoded automatically server-side, no visible pin-drop step for the business owner | Map pin (click/drag) + Places Autocomplete combined, bidirectional sync — gives the business owner direct visual confirmation, matching Google's own flow |
| "No existing listing found" path | Always falls back to "Add your business" creation form | "Add business with this name" link below search, or full "Add your business to Yelp" flow | Entire claim flow becomes create-only since the underlying searchable Google-sourced table is removed in this milestone — no fallback branch needed, just one path |
| Resuming incomplete setup | Profile dashboard shows "complete your profile" prompts inline on the business's own profile card, not a forced redirect | Dashboard nudges incomplete profiles via banners, not redirects | Per-venue badge inline in the existing `VenueRow` list, with explicit resume CTA — never a forced redirect (this is the bug fix) |

## Sources

- Google Business Profile official naming guidelines (HIGH confidence — official docs): [Guidelines for representing your business on Google](https://support.google.com/business/answer/3038177?hl=en)
- PinMeTo — Google Business Profile multi-location naming explainer (MEDIUM confidence — third-party summary, cross-checked against the official source above): [Google Business Profile Name Guidelines for Multi-location Chains](https://www.pinmeto.com/blog/google-business-profile-name-guidelines/)
- Yelp for Business — claim/add-business flow (MEDIUM confidence — vendor marketing + support docs): [Search or add your business | Yelp for Business](https://biz.yelp.com/claim), [How to Add or Claim a Yelp Business Listing — BrightLocal](https://www.brightlocal.com/learn/how-to-add-or-claim-a-yelp-business-listing/)
- Geoapify — location-picker pattern (address autocomplete + draggable pin + reverse geocoding) (MEDIUM confidence — vendor technical blog, consistent with general industry pattern): [Leaflet Location Picker with Address Autocomplete, Geolocation, and Draggable Pin](https://dev.to/geoapify-maps-api/leaflet-location-picker-with-address-autocomplete-geolocation-and-draggable-pin-with-geoapify-1gfa)
- Google Maps Platform — official Places Autocomplete address-form example (HIGH confidence — official docs): [Place Autocomplete Address Form | Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-addressform)
- Onboarding/abandonment UX patterns, Zeigarnik effect framing for incomplete-state indicators (MEDIUM confidence — aggregated industry blog consensus, not a single primary source): [Appcues — Onboarding UX: 10 patterns, best practices, and real examples](https://www.appcues.com/blog/user-onboarding-ui-ux-patterns), [Appcues — User Onboarding Best Practices](https://www.appcues.com/blog/user-onboarding-best-practices)
- Existing codebase, read directly as primary source (HIGH confidence): `app/business/page.tsx`, `app/components/ClaimSearchForm.tsx`, `app/business/onboarding/StepPaikka.tsx`, `supabase/migrations/20260606000000_onboarding.sql`

---
*Feature research for: Liikuntahakemisto v3.0 — self-sourced venue data model (Google Places decoupling), onboarding/dashboard/naming features*
*Researched: 2026-06-22*
