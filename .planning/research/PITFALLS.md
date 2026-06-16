# Pitfalls Research

**Domain:** Adding onboarding-AI improvements to an existing Next.js 14 + Supabase business onboarding wizard (Liikuntahakemisto v2.2)
**Researched:** 2026-06-16
**Confidence:** HIGH (codebase-verified) for architecture/schema pitfalls; MEDIUM for general web-scraping/SSRF/prompt-cost pitfalls (cross-checked against current code + general security practice)

This research is scoped to **integration risk** — mistakes that occur specifically because these 7 features are being bolted onto an existing, shipped system (`onboarding_draft` table, SSRF guard, single-call Claude pipeline, `business_branding` table, `WizardInner`/`StepEsikatselu`). Generic "how to scrape a website" advice is omitted in favor of what breaks *this* codebase.

## Critical Pitfalls

### Pitfall 1: Reordering StepPaikka before URL-analysis breaks the `onboarding_draft` FK and the `business_branding` key

**What goes wrong:**
`onboarding_draft.paikka_id` is `NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE` with `UNIQUE(business_account_id, paikka_id)` (`supabase/migrations/20260606000000_onboarding.sql`). Today, `AnalysoiSivusto` runs in `page.tsx` as a `pagePhase: 'pre' | 'wizard'` state machine **before** `WizardInner` mounts — at that point no `paikka_id` exists yet, so the v2.1 pipeline correctly keyed `business_branding` by `business_account_id` only (not `paikka_id`). If StepPaikka is moved to run before URL-analysis, the wizard will create/claim a `paikka` first, then analysis happens with a known `paikka_id` in context — but `business_branding` rows are still upserted with `onConflict: 'business_account_id'`, meaning **a business with multiple venues will silently overwrite branding analysis from venue A with venue B's results** the moment they onboard a second location. This is an existing single-tenant assumption (the schema decision predates multi-venue branding) that reordering exposes rather than causes, but the reorder is exactly the trigger that surfaces it in this milestone, because pulling StepPaikka earlier in the flow encourages exactly the "analyze per venue" mental model the schema doesn't support yet.

**Why it happens:**
The "move step X before step Y" framing in planning treats wizard steps as if they're stateless UI ordering, but two different persistence layers are involved (`onboarding_draft` rows scoped per-venue, `business_branding` scoped per-business) and they were designed assuming a specific entry sequence (URL analysis happens pre-paikka, so it has no `paikka_id` to scope against).

**How to avoid:**
- Before reordering, decide explicitly: does `business_branding` become `paikka_id`-scoped (requires a migration adding `paikka_id` + new unique constraint, and a backfill/RLS policy update) or does it stay business-scoped with reorder forbidden for multi-venue accounts?
- If StepPaikka moves first, the wizard's `paikkaId` is known when `AnalysoiSivusto` mounts — pass it through and add `paikka_id` to the `business_branding` upsert `onConflict` target as part of the SAME migration that does the reorder. Don't ship the UI reorder and the schema change in separate phases — they're coupled.
- Add a regression test: business account with 2 venues, onboard venue A with analysis, then onboard venue B with different analysis — assert venue A's branding row is untouched.

**Warning signs:**
- Any PR diff that touches step ordering in `WizardInner.tsx` / `page.tsx` without touching `supabase/migrations/` or `lib/branding/`.
- `business_branding` queries anywhere still filtering by `business_account_id` alone after the reorder ships.

**Phase to address:**
Earliest phase (schema/data-integrity) — must land before the live-preview and quick-accept phases, since those build on top of whatever the post-reorder draft/branding shape is.

---

### Pitfall 2: `maxReachedStep` / `current_step` skip-guard breaks silently when steps are renumbered or made conditional

**What goes wrong:**
`WizardInner.tsx`'s forward-skip guard (`step > maxReachedStep + 1 → redirect`) and `ProgressBar`'s `completedSteps` array are both hardcoded around a fixed `1..6` range, and `current_step` stored in `onboarding_draft` is a plain integer compared with `>` arithmetic. The reorder (StepPaikka moves, a quick-accept shortcut skips most steps, live-preview toggles steps on mobile) all change what "step N" means mid-flight for users who have an **existing in-progress draft** created under the old step numbering. A user who saved a draft at `current_step: 3` (old "Hinnasto") before deploy will, after deploy, resume at whatever step 3 means in the new order — which could be a completely different step, silently pre-filling the wrong UI or skipping fields they hadn't actually completed.

**Why it happens:**
`current_step` is an opaque integer, not a named step identifier. The skip-guard and resume-routing logic (`if (savedStep > 1 && step === 1) router.push(...)`) trust that integer across deploys with no migration or versioning.

**How to avoid:**
- Add a `flow_version` (or `step_key` string instead of integer) column to `onboarding_draft` so in-flight drafts created under the old step order can be detected and either migrated or forced to restart from a safe step.
- At minimum, write a one-time migration that nulls/resets `current_step` for any draft with `updated_at` before the deploy date of the reorder, forcing a safe resume at step 1 rather than landing on a renumbered step.
- Keep `maxReachedStep` derived from a step *key* (`'paikka' | 'mediat' | 'hinnasto' | ...`) rather than a raw index once the order is no longer fixed (quick-accept and mobile-conditional steps make the index non-deterministic).

**Warning signs:**
- QA testing only ever creates fresh drafts after the reorder ships — never tests resuming an old draft created before deploy.
- `current_step` used in `===`/`>` comparisons anywhere outside `WizardInner.tsx` (grep for `current_step` and `maxReachedStep`).

**Phase to address:**
Same phase as the reorder (draft/schema phase) — this is a direct consequence of changing step order in a system with persisted, resumable state.

---

### Pitfall 3: "Quick accept" shortcut bypasses the draft→liikuntapaikat atomic-commit invariant the rest of the system relies on

**What goes wrong:**
The existing submit flow (`app/api/business/onboarding/submit/route.ts`) has load-bearing invariants: it verifies `business_paikka_links` ownership server-side (supabaseAdmin bypasses RLS), builds `hinta_kuvaus` from structured `hinnasto` JSON, validates `varauslinkki` protocol (XSS guard, WR-06), and only deletes the draft **after** the `liikuntapaikat` update succeeds (so failures are retryable, not data-destroying). A "quick accept" path that submits straight to the admin queue without going through most wizard steps will be tempted to either (a) write directly to `liikuntapaikat`/`business_paikka_links` bypassing this Route Handler, duplicating none of those validations, or (b) call the same submit endpoint with a mostly-empty draft, producing a `liikuntapaikat` row with null `hinta_kuvaus`, no `varauslinkki`, no photos — and worse, *prematurely flips `claim_status` back to `'pending'`* (Step 5a in submit route) even though the admin queue item the quick-accept flow is supposedly creating directly may use a different status field, causing two competing "this needs admin attention" signals.

**Why it happens:**
"Skip most steps and submit straight to the queue" sounds like a UI-only shortcut, but the submit Route Handler conflates "wizard is complete" with "data is ready to commit." A shortcut needs its own decision about which fields are mandatory minimums (likely just: venue identity + a way to contact the business) vs. fields the admin queue can tolerate being null.

**How to avoid:**
- Define an explicit "minimum viable draft" shape for quick-accept (e.g., `paikka_id` + at least a URL/contact) and validate it server-side in the submit Route Handler — don't let the client decide what's "good enough."
- Reuse the same submit Route Handler rather than building a parallel write path, so ownership checks, retry-safety (draft preserved on failure), and the email notification all still apply. Add a `submission_type: 'full' | 'quick'` flag passed through so the admin queue UI can show "needs follow-up" badges for quick-accept items missing optional data.
- Re-examine Step 5a's `claim_status = 'pending'` reset — a quick-accept item should land in the admin queue with one unambiguous status, not risk a second write racing the first.

**Warning signs:**
- New code path in `app/api/business/` that writes to `liikuntapaikat` or `business_paikka_links` without first checking `business_paikka_links` ownership the way `submit/route.ts` does.
- Admin queue UI needs to special-case "is this a quick-accept row" by inferring from null fields rather than an explicit flag.

**Phase to address:**
Mid-milestone phase, after the reorder/schema phase is stable — quick-accept is a new *consumer* of the draft→commit pipeline, so the pipeline's contract should be settled first.

---

### Pitfall 4: Following links to subpages multiplies SSRF surface — the existing guard only validates the single entry URL

**What goes wrong:**
The current SSRF guard in `app/api/business/analyze-website/route.ts` validates the **user-submitted** `url` (protocol check + private-IP/hostname blocklist) before calling `scrapeWebsite(url)`. `scrapeWebsite` already resolves *relative* URLs against the entry URL for CSS files, favicons, and `og:image` (`new URL(href, url).href`) — but those resolved URLs are fetched **without re-running the SSRF check**, because today they're same-origin-ish artifacts (stylesheets, images) discovered on the page the user already proved they control via the validated entry URL. The instant the scraper starts **following `<a href>` links to other pages** (pricing/hours/contact subpages) to satisfy the new "follow links" requirement, this changes: an attacker-controlled or compromised page can include a link such as `<a href="http://169.254.169.254/latest/meta-data/">Hinnasto</a>` or `<a href="http://internal-admin.corp/">Yhteystiedot</a>`, and naive "follow same-looking links" logic will fetch it server-side with no IP/hostname revalidation — full SSRF against the entry-URL guard's blind spot. Worse, a redirect on the *subpage* fetch (the entry URL passed validation, but `fetch()` follows redirects by default) can land on a private address the original check never saw.

**Why it happens:**
The mental model "we already validated the URL" is applied to the wrong scope — the validation covers the entry point, not every URL subsequently discovered and fetched. Multi-page crawling turns a single trust boundary into N trust boundaries (one per followed link), and `fetch()`'s default redirect-following silently expands that further.

**How to avoid:**
- Extract the SSRF validation logic (currently inline in `route.ts`, lines ~106-133) into a shared function (e.g. `lib/branding/ssrfGuard.ts`) and call it for **every** URL the scraper is about to fetch — entry URL, every followed subpage link, and ideally every image/CSS URL too (defense in depth, even though those are same-origin today).
- Set `redirect: 'manual'` on subpage `fetch()` calls (or at minimum `redirect: 'follow'` combined with re-validating `res.url` after fetch, since `fetch` exposes the final URL) — never trust that following an already-validated URL's redirects stays safe.
- Restrict followed links to same-hostname as the entry URL (case-insensitive, exact match — not "contains" or "ends with", which is bypassable with `evil-example.fi`). Cross-origin links found on the page (e.g. social media icons, payment processor links) must never be followed.
- Cap the number of subpages followed (e.g. 3-5 max) and the total fetch time budget for the whole crawl, not just per-request timeouts — this also bounds the next pitfall (token cost).
- DNS-rebinding is already an accepted limitation for the entry URL (per the code comment, "hostname checked before DNS resolution"); multi-page crawling makes this gap proportionally larger (N requests instead of 1) — if this milestone significantly increases scraping volume, revisit whether a per-request resolved-IP check (`dns.lookup` + re-check before connecting, or a vetted SSRF-safe fetch wrapper) is now worth the complexity it was previously not worth.

**Warning signs:**
- Any new code that calls `fetch()` on a URL extracted from `<a href>` parsing without first passing it through the same hostname/private-IP checks used for the entry URL.
- Tests only use `http://example.com` style fixtures and never assert a rejected fetch when a discovered link points to `169.254.169.254`, `10.x`, or `localhost`.

**Phase to address:**
Early phase, alongside or immediately after the scraper changes — this is a security regression risk, not a feature nice-to-have, and should block merging the "follow links" capability until in place.

---

### Pitfall 5: Multi-page HTML in one Claude call causes prompt/token-cost blowup and context-window truncation

**What goes wrong:**
Today, `scrapeWebsite` truncates a single page to `htmlSnippet: strippedHtml.slice(0, 8000)` (8,000 characters, comments/script/style stripped) and sends exactly one HTML snippet plus up to 5 logo images in one Claude Haiku call. Naively extending this to "fetch homepage + pricing + hours + contact pages, concatenate their HTML, send it all in one call" multiplies the text payload by 3-5x (and real pricing/hours pages are often *more* HTML-dense than homepages — tables, embedded widgets, cookie-consent boilerplate) while keeping the same `8000`-character-style slice-and-hope truncation, which now risks **silently cutting off the page that actually contains the data being asked for** (e.g. homepage gets the full 8000 chars and the pricing subpage — the one with the actual prices — gets truncated to nothing because slicing happens on the concatenated string, not per-page). Token cost also rises roughly linearly with combined HTML size; if subpages are added without a content budget, a single onboarding analysis could send tens of thousands of characters in unstripped boilerplate (nav menus repeated on every page, footers, analytics scripts not caught by the script/style/comment strip) for Haiku to wade through, increasing both cost and the chance Claude misattributes data to the wrong page or hallucinates when truncated content is incomplete.

**Why it happens:**
"Send the AI everything we found" feels like more context = better extraction, but Claude has finite useful attention and the existing truncation strategy (flat character slice) was tuned for one page, not N concatenated pages with no boundary markers.

**How to avoid:**
- Apply the per-page truncation budget **before** concatenation, not after (e.g. each page gets its own `slice(0, N)` with N scaled down as page count grows — e.g. 4000 chars × number of pages, capped at a total ceiling like 12,000-16,000 chars rather than letting it grow unbounded).
- Label each page's HTML snippet with which subpage it came from (e.g. a clear delimiter like `\n\n--- PAGE: /hinnasto ---\n\n`) in the prompt text so Claude can correctly attribute "found these prices on the pricing page" rather than guessing — this also lets the extraction prompt instruct "prefer data found under PAGE: /hinnasto for pricing" and improves accuracy, not just cost.
- Strip *more* aggressively for subpages than today's comment/script/style strip — nav/footer/header markup duplicated across every crawled page is the single biggest avoidable token cost; consider a simple heuristic (strip repeated `<nav>`/`<footer>` blocks after the first page, or extract just `<body>` main content regions) before concatenating.
- Track and log token usage (`response.usage` from the Anthropic SDK) per analysis run during rollout so a real cost ceiling can be set, and add a hard cap (reject/truncate) if combined HTML exceeds a fixed limit — this is also defense against Pitfall 4's "fetch many pages" path being abused to run up API costs via a malicious site with hundreds of internal links.
- Keep the existing `max_tokens: 2048` output cap in mind too — if the prompt now asks Claude to extract structured data from *more* sources (more price line items, more hours entries across more pages), 2048 output tokens may become the new bottleneck, not just input size.

**Warning signs:**
- No per-analysis logging of `response.usage.input_tokens` / `output_tokens` before and after the multi-page change ships — cost regression goes unnoticed until the Anthropic bill arrives.
- The prompt template (`lib/branding/prompt.ts`) concatenates page content with no source labeling, making "the AI got Hinnasto step wrong" bug reports impossible to debug (can't tell which page Claude actually read).

**Phase to address:**
Same phase as the scraper "follow links" change — token-cost design must be part of the scraping rewrite, not bolted on after the bill spikes.

---

### Pitfall 6: General image extraction reuses logo-pipeline assumptions that don't hold for a media gallery (relative URLs, hotlinking, oversized images, format support)

**What goes wrong:**
The current logo pipeline assumes a *small, curated* candidate set (max 5 logo URLs, each run through `sharp` resize-to-512px + PNG conversion, then uploaded to Supabase Storage so the public-facing app never hotlinks the original site). Extending image extraction to "general page images for a media gallery" tempts reusing the *candidate-collection* regex approach (`<img>` tag scanning) but skipping the *conversion+storage* discipline, because there are now potentially dozens of `<img>` tags per page instead of 5 logo candidates. Specific failure modes if storage/conversion is skipped: (1) relative `src` paths (`/images/photo.jpg`, `../assets/x.png`) resolved against the wrong base if subpages are involved (a relative path on the pricing subpage resolves against the pricing subpage's URL, not the homepage's — easy to get wrong when threading page URLs through); (2) hotlinking the original site's images directly in the gallery means the gallery breaks if the business's site goes down, changes its CMS, or blocks hotlinking via `Referer`-based protection (many sites do, especially CDN-served marketing images) — this is silently broken UI, not a crash; (3) without the existing 512px `sharp` resize step, a marketing hero image could be multiple MB at full resolution, blowing up gallery page load and Supabase Storage costs; (4) the existing pipeline only handles formats `sharp` can decode reliably for *logos* (SVG/AVIF/WebP→PNG) — general page images add more format edge cases (animated GIFs flattened to a static frame with no warning, CMYK JPEGs from print-oriented marketing sites that `sharp` may mis-render).

**Why it happens:**
Logo extraction and gallery image extraction look like the "same problem, just more images," but the logo pipeline's small N let it afford full conversion+upload for every candidate; a gallery feature naturally wants more images, and "just point `<img src>` at the original" feels like the path of least resistance until hotlinking breaks in production weeks later.

**How to avoid:**
- Reuse the existing `toPngBase64`-style sharp conversion + Supabase Storage upload pattern from `lib/branding/storage.ts`/`scraper.ts` for gallery images too — never store/display a raw third-party URL in the app's own UI (mirrors the existing `SEC-46-02` principle in `analyze-website/route.ts` GET handler, which already strips `logo_url` that doesn't point to Supabase Storage — apply the same discipline to gallery photo URLs).
- Always resolve relative `src` against the **specific page URL the image was found on**, not the original entry URL — thread the page URL alongside each extracted image candidate through the pipeline (this is a direct consequence of Pitfall 4's multi-page fetching: more base URLs to get right).
- Apply a server-side max dimension + max file-size reject (mirroring the existing 512px resize for logos, but a larger ceiling appropriate for gallery photos, e.g. 1600px) and reject (not silently corrupt) decode failures, the same way logo candidates that fail `sharp` conversion are skipped today.
- Cap total gallery candidates fetched (e.g. 10-15) and run fetch+conversion in parallel with `Promise.all` + per-image timeout, mirroring how CSS files are already fetched in parallel — don't fetch dozens of images serially, which compounds the per-request 5s timeout into a multi-minute pipeline.
- Filter out obviously-irrelevant images before fetching (icon-sized images via `width`/`height` HTML attributes if present, tracking pixels, images inside `<nav>`/`<footer>`) to avoid wasting fetch/conversion budget on images no business would want in their gallery.

**Warning signs:**
- Gallery `<img>` tags in the app render a `src` starting with the business's own domain rather than `*.supabase.co/storage/...` — a hotlinking regression.
- No file-size/dimension cap before `sharp` conversion — a single multi-MB hero image silently slows the whole analysis pipeline or blows past the existing 5MB HTML-response-size style guard (which only guards HTML, not images).

**Phase to address:**
Phase covering "images beyond logo" — should land after the multi-page scraper (Pitfall 4/5) since gallery images will often come from the same followed subpages, and depends on knowing which page each image came from.

---

### Pitfall 7: Multi-candidate logo + 2-color selection UI breaks the single-value assumptions baked into storage, upload, and the contrast-fix logic

**What goes wrong:**
Today, `analyzeWithClaude` returns one `logo_index` (a single chosen winner, `-1` = none) and the pipeline immediately uploads only that one buffer (`uploadLogo(businessAccountId, logoBuffers[result.logo_index])`) and discards the rest; `business_branding.colors` stores an array but only `colors[0]` is ever read (`StepEsikatselu.tsx`: `brandingData?.colors?.[0]`) and `DiagonaalKortti` accepts a single `brandColor` prop used for one background fill. Moving to "present multiple logo candidates + 2 colors (background + accent) for user selection" means: (1) **all** logo candidates need to survive past the analysis step instead of being discarded — today only the chosen buffer is uploaded, the rest of `logoBuffers`/`logoUrls` vanish once `runAnalysis` returns, so candidate buffers must either all be uploaded to Storage (cost/cleanup question: orphaned unused-candidate images) or the *raw third-party URLs* shown to the user for selection before any upload happens (re-introducing the hotlinking-as-UI risk from Pitfall 6, but this time inside the wizard, not just the gallery); (2) the data model needs a second color field (`colors[0]` becomes "background", a new explicit `accentColor` becomes "accent") threaded through `business_branding`, the wizard's local state, `StepEsikatselu`, and `DiagonaalKortti`'s props — every one of those currently assumes "one brand color" as a scalar, not a `{background, accent}` pair; (3) user-driven *selection* implies a new write path (the user's choice needs to be persisted somewhere — likely a new mutation on `business_branding` or `onboarding_draft`) that doesn't exist today, since today's flow is fully automatic with no user override step.

**Why it happens:**
"Let the user pick from 2 colors" sounds like a small UI addition, but it requires the AI pipeline to preserve plural candidates (currently optimized to discard everything except the single winner as early as possible, which was a deliberate simplicity/cost tradeoff for v2.1) and requires every downstream consumer of "the brand color" to become aware that there are now two named roles instead of one anonymous one.

**How to avoid:**
- Decide storage strategy explicitly: either (a) upload **all** surviving logo candidates to Storage (bounded to existing max-5 candidate cap) so the selection UI shows real, durable URLs and only the unselected ones get cleaned up (or left orphaned — explicit decision, not accidental), or (b) keep candidates as raw third-party URLs for the selection step only and upload just the final choice — if (b), the selection UI's `<img src>` previews are temporarily hotlinking, which is acceptable for a short-lived in-wizard preview but must never leak into the published `liikuntapaikat.logo_url`.
- Rename the schema/type field from an anonymous `colors: string[]` to explicit roles (`background_color`, `accent_color`) at the `business_branding` table and `BrandingAnalysisResult`/`BrandingResult` type level — don't keep positional `colors[0]`/`colors[1]` indexing, which is exactly the kind of implicit contract that breaks silently when Claude returns a 1-element or 3-element array (today's code already has to guard `colors?.[0] ?? undefined`; a positional 2nd index is one Claude-response-shape-change away from `undefined` reaching `DiagonaalKortti` with no validation, unlike the `logo_index` bounds-check that already exists for the logo array).
- Add the same runtime validation discipline already present for `logo_index` (`analyzer.ts` validates bounds, `colors` filters to valid hex strings) to the new 2-color contract — validate that both selected colors are valid hex and have sufficient mutual contrast for "background vs accent" to be visually meaningful, not just "two strings."
- The user-selection write needs its own auth/ownership check mirroring the pattern already used everywhere else in this codebase (JWT verify → ownership check via `business_paikka_links` or `business_accounts.user_id` → write) — don't let a client-supplied `logo_url`/`color` selection write directly without server-side validation that the selected logo URL/color actually came from that business's own analysis result (otherwise a user could submit an arbitrary external URL as their "selected logo candidate").

**Warning signs:**
- Any new selection UI component receiving `colors[1]` or `logoBuffers[i]` via positional array index without a named field or bounds check.
- `business_branding` migration adds columns without also auditing every existing reader of `colors` (`StepEsikatselu`, `DiagonaalKortti`, `AnalysoiSivusto` preview) for positional-index assumptions.

**Phase to address:**
Dedicated phase after the multi-page scraper/prompt work (Pitfall 5) is stable — this pitfall is about *data shape* and storage lifecycle, and should be designed before the live-preview pane (Pitfall 9) starts consuming `background`/`accent` color props, since the preview pane is the main consumer of the final 2-color contract.

---

### Pitfall 8: Logo-contrast fix addresses the wrong layer if it's only patched in one component

**What goes wrong:**
The white/transparent-logo-invisible-on-white bug exists because `DiagonaalKortti`'s logo slot uses `bg-[rgba(0,0,0,0.06)]` (a very light, near-white gray) with `object-cover` on an `<img>` — a white wordmark PNG with transparent background, when `object-cover`-cropped into a small square, can end up showing mostly transparent/white pixels indistinguishable from the slot's near-white background. But the *same* `logo_url` is rendered in at least three other places observed in this codebase: `AnalysoiSivusto`'s own preview (`<img src={brandingResult.logo_url}>` with no background treatment at all — just inline, so it's *also* invisible against the wizard's white `glass` card), `StepMediat`'s existing-logo thumbnail preview, and presumably the new live-preview pane this milestone adds. A fix applied only to `DiagonaalKortti` (e.g. adding a dark/checkered backdrop there) will leave the bug reproducible in the analysis-preview screen and the live-preview pane, because each of those independently renders `<img src={logo_url}>` with its own ad-hoc surrounding background.

**Why it happens:**
The bug is described and likely will be fixed as "fix the contrast in the preview," singular, but `logo_url` is consumed by multiple independent components with no shared "logo display" primitive — each one separately decided its own background treatment (or didn't decide at all, as in `AnalysoiSivusto`).

**How to avoid:**
- Extract a single `LogoSwatch`/`LogoPreview` component (checkerboard pattern background, or a background that automatically switches between light/dark based on the logo's own luminance/alpha-channel analysis — similar in spirit to the existing `getContrastColor`/YIQ logic already used for text-on-brand-color contrast in `DiagonaalKortti`) and use it everywhere `logo_url` is rendered: `DiagonaalKortti`, `AnalysoiSivusto` preview, `StepMediat` thumbnail, and the new live-preview pane.
- If detecting "this logo is white/transparent" programmatically (rather than always showing a neutral checkerboard) — this requires inspecting actual pixel data, which `sharp` can already do server-side (e.g. compute average luminance of non-transparent pixels) at the same point the logo is converted to PNG in `scraper.ts`/`toPngBase64`, then **store that as metadata** (e.g. `business_branding.logo_is_light: boolean`) so every consumer can apply the right backdrop without re-computing it client-side or guessing.
- Don't fix this with a single hardcoded "always use a dark backdrop" change either — logos that are already dark-on-transparent would then have the *same* problem inverted.

**Warning signs:**
- Grep for `logo_url` renders (`<img src={...logo_url...}>` or equivalent) across the codebase after the "fix" ships — if more than one render site exists and only one received the fix, the bug will resurface in the others during this same milestone's QA.
- Fix implemented as a CSS-only change in `DiagonaalKortti` with no new data captured about the logo's actual luminance/transparency.

**Phase to address:**
Should be addressed in the same phase as the live-preview pane build (Pitfall 9), since the live-preview pane is a *new* render site for `logo_url` that will reproduce this bug on day one if the underlying fix isn't a shared, reusable primitive.

---

### Pitfall 9: Live-preview pane writing from 6 wizard steps causes prop-drilling sprawl, stale state, and re-render storms

**What goes wrong:**
Today, each step component (`StepMediat`, `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`) is **save-then-advance**: local component state is held privately, and the only way data crosses step boundaries is round-tripping through Supabase (`save-step` Route Handler) and `WizardInner` re-fetching the draft (`saveAndAdvance` explicitly re-queries `onboarding_draft` after every step, and there's a *separate* `useEffect` that re-fetches specifically `if (step !== 6) return` for the existing step-6 preview). This "re-fetch from DB to refresh preview" pattern works for a static, post-navigation preview but is the **wrong architecture** for a *live*, *real-time* preview that should update as the user types/uploads within a single step, not just after they click Next — naively extending the current pattern (call `save-step` + re-fetch on every keystroke) would hammer Supabase with writes on every character typed in `StepYhteystiedot`'s description field, and the existing debounce-free `handleNext`/`handleSave` functions in `StepMediat` have no debouncing at all, so this pattern doesn't scale down to a live preview cleanly. Conversely, lifting all step state into `WizardInner` (the natural fix) directly collides with the existing `EditMode`'s already-present prop-drilling pattern (`localHinnasto`, `localAukioloajat`, `localYhteystiedot`, `localLogoUrl`, `localPhotoUrls` are already individually drilled into 4 step components via `onSaveComplete` callbacks) — extending this same pattern to `OnboardingMode` for 6 steps means `WizardInner` becomes a large, frequently-re-rendering parent where *every* step's keystroke triggers a state update that re-renders the whole tree (including `ProgressBar`, the preview pane, and all currently-mounted step components), unless careful memoization is applied — and nothing in the current codebase (`AnimatePresence mode="wait"`, plain `useState`) does this memoization today.

**Why it happens:**
The existing architecture deliberately decouples steps via Supabase round-trips specifically *because* each step is independently save-and-resume-able (a core onboarding requirement — abandon and return later). A live preview wants the opposite property (instant, in-memory reactivity) and naively wiring "live" onto a save-to-DB-then-refetch model either makes the preview laggy (waits for round-trips) or makes the DB-saving model chatty (saves on every keystroke, defeating the purpose of the deliberate save-on-advance design).

**How to avoid:**
- Separate "live preview state" (in-memory, lifted to `WizardInner` or a dedicated React Context, updated synchronously on every field change) from "persisted draft state" (still saved to `onboarding_draft` only on explicit advance/blur, exactly as today) — these are two different concerns and should not share one state/save path. The preview reads from the in-memory state; the draft-resume-on-reload logic keeps reading from Supabase exactly as it does now.
- Use React Context (a `WizardPreviewContext` provider wrapping all 6 steps) instead of drilling 6 separate `localX`/`setLocalX` props through `WizardInner` — the existing `EditMode` prop-drilling pattern for 5 fields is already borderline; scaling that same approach to 6 steps' worth of fields plus a preview consumer multiplies the prop surface and the re-render blast radius further. A context purpose-built for "preview data" lets only the components that actually read preview data (the preview pane) re-render on changes, while step *input* components re-render only their own local form state.
- Memoize the preview pane's expensive children (`PaikkaKortti`, `DiagonaalKortti`, `PaikkaSheet` — all already used in `StepEsikatselu` and likely reused for live preview) with `React.memo` plus stable callback references, since these are exactly the "looks done but isn't" components that silently re-render on every keystroke if their props are new-object-literals-per-render (a real risk here: `draftAsPaikka` in `StepEsikatselu` is rebuilt fresh on every render via `buildDraftAsPaikka`/`buildBrandingPreview` with no memoization — `useMemo` this once it runs on every keystroke instead of only on step transitions).
- Debounce any writes that *do* still need to reach Supabase mid-step (e.g. autosave-while-typing, if desired) — don't reuse `handleNext`'s upload-then-save pattern verbatim for live autosave; image uploads in particular (`StepMediat`) must never fire on every keystroke or every preview update.
- For the responsive split (desktop side-by-side, mobile toggle): make sure the toggle state (which pane is visible on mobile) is independent of the actual preview *data* state — collapsing/expanding the preview pane on mobile should never trigger a re-fetch or re-build of `draftAsPaikka`, only a CSS/layout change.

**Warning signs:**
- Preview pane re-renders (visible via React DevTools profiler or simply janky typing) on every keystroke in any text input across any step.
- New `useEffect` blocks added to `WizardInner` that call `save-step` or re-fetch the draft on a timer/keystroke rather than on explicit step advancement.
- `buildDraftAsPaikka`/`buildBrandingPreview` (or their successors) called without `useMemo` once they're invoked more than once per step (i.e., once live updates start, not just on mount/step-change as today).

**Phase to address:**
Latest phase in the milestone (UI/state-architecture phase) — depends on the final shape of draft data from the reorder (Pitfall 1/2) and the 2-color/multi-logo selection contract (Pitfall 7) being settled first, since the preview pane is the primary consumer of both.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Keep `business_branding` keyed by `business_account_id` only after reordering StepPaikka earlier | No migration needed this milestone | Multi-venue businesses silently overwrite branding analysis per new venue | Only if multi-venue onboarding via the AI-analysis path is explicitly out of scope and documented as such |
| Ship quick-accept as a second write path instead of reusing `submit/route.ts` | Faster to build, no need to make the existing handler accept partial data | Two divergent code paths for ownership checks, retry-safety, and notifications; bugs fixed in one don't fix the other | Never — reuse the existing handler with a `submission_type` flag instead |
| Slice concatenated multi-page HTML with the same flat `8000`-char limit used for single-page today | No prompt-engineering work needed | Pricing/hours subpages silently truncated away, AI extraction quality regresses exactly where the milestone wants improvement | Never — this directly undermines the milestone's stated goal |
| Show raw third-party image URLs in the multi-logo/gallery selection UI without uploading to Storage first | Faster to ship, no extra Storage writes for unselected candidates | Selection UI hotlinks third-party images (breaks if site goes down); same risk if a selected-but-not-yet-submitted choice persists across a session | Acceptable ONLY for the transient in-wizard selection screen, never for anything persisted to `liikuntapaikat`/published data |
| Patch logo-contrast bug only in `DiagonaalKortti` | Smallest diff, ships fast | Bug reproduces in `AnalysoiSivusto` preview, `StepMediat` thumbnail, and the new live-preview pane | Never — extract a shared logo-display primitive instead |
| Lift all step state into `WizardInner` via individual `useState` + prop drilling (mirroring existing `EditMode` pattern) rather than Context | Matches existing code style, no new abstraction to learn | Re-render storms once preview pane subscribes to all step state; prop surface grows every time a new previewable field is added | Acceptable only if step count and previewed-field count stay small; revisit before adding more steps |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|--------------|------------------|---------------------|
| Anthropic Claude API (multi-page prompt) | Concatenating multi-page HTML with no page-source labeling | Label each page's snippet with a delimiter (`PAGE: /hinnasto`) so extraction can be attributed and debugged |
| `fetch()` following links to subpages | Trusting that the entry-URL SSRF check covers all subsequently fetched URLs | Re-run the same SSRF/private-IP/hostname check on every followed link, and restrict to same-hostname-only |
| `fetch()` default redirect behavior | Letting a validated URL's redirect chain silently land on a private address | Use `redirect: 'manual'` or re-validate `res.url` after fetch for every subpage/image fetch |
| Supabase Storage (gallery images) | Storing/rendering raw third-party image URLs in the published app instead of proxying through Storage | Always download → convert (sharp) → upload to Supabase Storage → only ever render the Storage URL in `liikuntapaikat` |
| `sharp` image conversion | Assuming all formats (CMYK JPEGs, animated GIFs) found via general `<img>` scraping behave like the curated logo-candidate formats already handled | Add explicit reject/skip handling for conversion failures, exactly as already done for SVG favicons (`toPngBase64` returns `null` on failure) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|-----------|------------|------------------|
| Concatenating N pages of HTML with the same flat per-call character budget used for 1 page | Rising Claude API cost per onboarding; Haiku responses degrade in quality/attribution | Per-page truncation budget + total ceiling, applied before concatenation | As soon as "follow links" ships if no budget change accompanies it — not a future-scale problem, an immediate one |
| Live preview pane re-building `draftAsPaikka` (or equivalent) on every keystroke with no memoization | Visible input lag while typing in any wizard step once preview is live | `useMemo`/`React.memo` around preview-consuming components, separate "live" state from "persisted" state | As soon as live-preview ships — small data volume per business, but per-keystroke rebuild cost is real even at 1 user |
| Fetching gallery image candidates serially instead of in parallel (mirroring today's serial logo-candidate loop in `scrapeWebsite`) | Onboarding analysis pipeline takes much longer once gallery extraction is added | `Promise.all` with per-image timeout, mirroring the existing parallel CSS-fetch pattern | Once gallery candidate count exceeds ~5-10 and serial fetch + sharp conversion adds up against the Vercel `waitUntil` Hobby-tier 10s budget already flagged as a known limitation in `route.ts` |
| Following many subpage links without a hard cap | A site with hundreds of internal links turns one onboarding analysis into hundreds of fetches | Hard cap (3-5 pages) + total time budget for the whole crawl | Immediately exploitable as a cost-amplification or DoS vector against the Claude API budget, not just a "scale" issue |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Validating only the entry URL for SSRF, not URLs discovered by following links | Internal network access (cloud metadata endpoints, internal admin tools) via crafted `<a href>` on a scraped page | Re-validate every followed URL with the same hostname/private-IP guard; restrict to same-hostname-only |
| Letting `fetch()` follow redirects on subpage/image fetches without re-checking the final URL | A validated public URL's redirect chain can land on a private address, bypassing the entry-point check entirely | `redirect: 'manual'` or re-validate `res.url` post-fetch for every non-entry fetch |
| Allowing user-driven logo/color "selection" to accept arbitrary client-supplied URLs/values instead of values that demonstrably came from that business's own analysis result | A malicious business user submits an arbitrary external image URL as their "selected logo," which then gets surfaced as `logo_url` to the public-facing consumer app | Server-side validate the selected value against the stored analysis result for that `business_account_id`/`paikka_id`, not just shape-validate it |
| Storing/serving raw third-party gallery image URLs directly in `liikuntapaikat.photo_urls` | Hotlinking breaks when source site changes/blocks; also a SEC-46-02-style data-origin trust issue (same class of bug already fixed once for `logo_url`) | Apply the existing `SEC-46-02` "must start with our Storage base URL" check to gallery photo URLs too, not just logo_url |
| Quick-accept bypassing the existing ownership check pattern (`business_paikka_links` lookup before any `liikuntapaikat` write) | Elevation-of-privilege — a business could submit data for a venue it doesn't own if a new write path skips the check `submit/route.ts` already has | Route all writes (including quick-accept) through the same ownership-checked Route Handler |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Resuming an old draft after a step-reorder deploy lands the user on a renumbered, wrong step | User sees unexpected/incomplete UI, may think their data was lost | Detect pre-reorder drafts (via timestamp or a flow-version column) and force a safe restart at step 1 with a clear message |
| Quick-accept submits with no follow-up signal to the business about what's still missing | Business thinks onboarding is "done" but admin queue shows an incomplete listing | Quick-accept confirmation should explicitly state what was skipped and that the admin/business will need to follow up |
| Multi-logo/2-color selection UI shown before the images are durably stored | If the user navigates away mid-selection, candidates (especially if hotlinked, not yet uploaded) may disappear or change if the source site updates | Either persist the full candidate set transiently in the draft, or make selection a fast, single-screen, hard-to-abandon step |
| Live preview pane not updating for a field because that field's state wasn't lifted/wired into the shared preview state (partial migration) | User edits a field, sees no change in preview, assumes the feature is broken | Audit all 6 steps' fields against the preview's data source before shipping — partial coverage looks like a bug, not a missing feature |
| Mobile toggle between edit and preview loses scroll position or resets the preview to a stale state | Feels janky/broken on mobile specifically | Keep preview data state independent of the visibility toggle so toggling never re-fetches or re-builds anything |

## "Looks Done But Isn't" Checklist

- [ ] **StepPaikka reorder:** Looks done when the new step order renders correctly for a fresh draft — verify it also handles resuming a draft created under the OLD step order (migration or forced-restart logic).
- [ ] **Quick-accept shortcut:** Looks done when it successfully creates an admin-queue item — verify it goes through the same ownership check and retry-safe commit pattern as the full wizard's `submit/route.ts`, not a parallel write path.
- [ ] **Multi-page scraping:** Looks done when pricing/hours subpages are successfully followed and content extracted — verify every followed URL re-runs the SSRF/private-IP check and that redirects are handled, not just the entry URL.
- [ ] **Gallery image extraction:** Looks done when images appear in the Mediat step — verify they're proxied through Supabase Storage (not hotlinked), resolved against the correct per-page base URL, and size/dimension-capped.
- [ ] **Multi-logo + 2-color selection:** Looks done when the picker UI renders candidates — verify candidates survive past the initial analysis (not discarded like today's single-winner pipeline), and that selected values are server-validated against the actual analysis result before being persisted.
- [ ] **Logo-contrast fix:** Looks done when `DiagonaalKortti` shows a white logo correctly — verify the same logo also displays correctly in `AnalysoiSivusto`'s preview, `StepMediat`'s thumbnail, and the new live-preview pane.
- [ ] **Live preview pane:** Looks done when typing in one step updates the preview — verify it doesn't cause visible re-render lag, doesn't write to Supabase on every keystroke, and that the mobile toggle never re-fetches/rebuilds preview data on visibility change alone.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|--------------------|
| `business_branding` overwritten across venues after reorder | MEDIUM | Add `paikka_id` column + new unique constraint via migration; backfill existing rows by best-effort matching to their most recent venue; going forward, key all branding queries by `(business_account_id, paikka_id)` |
| Pre-reorder draft lands user on wrong renumbered step | LOW | One-time migration resetting `current_step` to 1 (or a "safe" step) for drafts with `updated_at` before the reorder's deploy timestamp |
| Quick-accept created malformed/incomplete `liikuntapaikat` rows via a bypassed write path | MEDIUM | Backfill missing required fields manually for affected rows; retire the parallel write path and route all future quick-accepts through `submit/route.ts` with a `submission_type` flag |
| SSRF guard bypassed via a followed subpage link (discovered post-incident) | HIGH | Rotate any credentials/secrets potentially exposed via the SSRF window (e.g. if cloud metadata was reachable); patch the guard to cover all fetches immediately; audit logs for the affected time window |
| Claude token costs spike after multi-page concatenation ships unbounded | LOW–MEDIUM | Add per-page truncation + total ceiling retroactively; this is a config/prompt change, not a schema change, so it's fast to ship once noticed — the cost is mostly the unnoticed billing period before it's caught |
| Gallery images hotlinked and now broken because source site changed | MEDIUM | Re-run extraction for affected businesses to re-fetch and properly store images in Supabase Storage; in the meantime, fall back to placeholder/hide broken images gracefully rather than showing broken `<img>` tags |
| Live preview pane causes re-render performance regression in production | LOW–MEDIUM | Add `React.memo`/`useMemo` retroactively around the preview-consuming components and the object literals passed into them; usually a localized fix once profiled, not an architecture rewrite, if the live/persisted state split was done correctly to begin with |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|------------------|
| 1. Draft/branding key reorder breaks multi-venue scoping | Phase 1 (reorder + schema) | Test: 2-venue business onboards both via AI-analysis path; assert branding rows don't collide |
| 2. `current_step` skip-guard breaks for pre-reorder drafts | Phase 1 (reorder + schema) | Test: create a draft under old step semantics (or a fixture matching pre-deploy shape), deploy reorder, verify safe resume behavior |
| 3. Quick-accept bypasses commit invariants | Phase 2 (quick-accept) — after Phase 1 lands | Test: quick-accept submission goes through the same ownership-check failure path as a non-owner attempting the full wizard submit; assert 403 |
| 4. SSRF expansion via followed links | Phase 3 (scraper: follow links) — should gate merge | Test: scraped page contains a link to `169.254.169.254` / `10.0.0.5` / `localhost`; assert the crawler skips it and the analysis still completes using only safe pages |
| 5. Prompt/token-cost blowup from multi-page concatenation | Phase 3 (scraper: follow links), same phase as Pitfall 4 | Log `response.usage` before/after; assert combined HTML payload stays under the defined ceiling regardless of pages followed |
| 6. Gallery image extraction pitfalls (relative URLs, hotlinking, oversized) | Phase 4 (gallery images) — after Phase 3 | Test: relative-path image on a subpage resolves to the correct absolute URL; assert all gallery `photo_urls` start with the Supabase Storage base, never the source domain |
| 7. Multi-logo/2-color selection breaks single-value assumptions | Phase 5 (logo/color selection UI) — after Phase 3/4 | Test: selecting candidate index 2 of 4 and accent color persists correctly; assert a tampered/external `logo_url` submitted by the client is rejected server-side |
| 8. Logo-contrast fix needs a shared primitive | Phase 6 (live preview + contrast fix) | Test: render the same white/transparent logo fixture through `DiagonaalKortti`, `AnalysoiSivusto` preview, and the new live-preview pane; assert visible contrast in all three |
| 9. Live preview prop-drilling / re-render storm | Phase 6 (live preview) — last phase, depends on 1/2/7 | Profile: typing in any step's text field does not re-render unrelated step components or cause visible lag; assert preview pane updates without a Supabase round-trip per keystroke |

## Sources

- Direct codebase inspection (HIGH confidence, primary source for all schema/architecture pitfalls):
  - `app/api/business/analyze-website/route.ts` — SSRF guard scope, `business_branding` upsert key, fire-and-forget pipeline
  - `lib/branding/scraper.ts` — HTML fetch/truncation, logo candidate collection, CSS parallel fetch pattern
  - `lib/branding/analyzer.ts` — single Claude call, `logo_index`/`colors` validation pattern
  - `app/business/WizardInner.tsx` — step routing, `maxReachedStep` skip-guard, draft re-fetch-after-save pattern, existing `EditMode` prop-drilling precedent
  - `app/business/onboarding/StepPaikka.tsx`, `StepMediat.tsx`, `StepEsikatselu.tsx`, `AnalysoiSivusto.tsx` — step responsibilities, pre-paikka analysis timing, preview-build pattern
  - `app/api/business/onboarding/submit/route.ts` — atomic commit invariants, ownership check, retry-safety
  - `supabase/migrations/20260606000000_onboarding.sql` — `onboarding_draft` schema, FK/UNIQUE constraints, RLS policies
  - `app/components/DiagonaalKortti.tsx` — logo slot background treatment, existing YIQ contrast pattern for text
  - `.planning/PROJECT.md` — v2.1 delivered scope, key decisions log (D-03 through D-16, WR/CR/SEC annotations)
- General security/engineering practice (MEDIUM confidence, not independently re-verified against current OWASP/Anthropic docs in this session — recommend a follow-up phase-specific research pass on SSRF-safe fetch wrappers and Claude prompt-caching/cost-control APIs before implementing Phase 3):
  - SSRF via redirect-following and DNS rebinding is a well-documented class of bug in server-side fetch/crawl features generally.
  - Multi-document RAG-style prompting (labeling sources, per-source truncation) is standard practice for multi-page LLM extraction generally.

---
*Pitfalls research for: Onboarding-AI wizard improvements (v2.2), Liikuntahakemisto*
*Researched: 2026-06-16*
