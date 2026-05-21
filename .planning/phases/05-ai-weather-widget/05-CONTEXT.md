# Phase 5: AI Weather Widget - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build `/api/saasuositus` Route Handler (calls Open-Meteo + Claude Haiku server-side) and wire its output into the existing Etusivu.tsx AI widget box. Replaces the current typewriter/time-based greeting with a real weather-based Finnish sport recommendation. Adds same-day sessionStorage cache so reloads skip the API call.

No new components. No schema changes. No new pages. The widget box already exists in Etusivu.tsx — Phase 5 replaces its text content and adds caching.

</domain>

<decisions>
## Implementation Decisions

### Recommendation Content
- **D-01:** Output shape: sää + spesifi lajiehdotus + paikkavihjaus. One conversational Finnish sentence. Example: "Aurinkoinen +18°C — täydellinen päivä padel-kentälle tai lenkille ulkona."
- **D-02:** No emoji in the AI text. The weather emoji (☀️/🌧️ etc.) already displays in the right side of the widget — double emoji would be cluttered.
- **D-03:** Route Handler fetches Open-Meteo server-side (Tampere, lat=61.4978 lng=23.7610), then calls Claude Haiku with: temperature, weather_code, and day_of_week (Finnish). All three inputs go into the prompt.
- **D-04:** Prompt language: Finnish output required. Prompt instructs Claude to respond with exactly one short Finnish sentence recommending a sport or activity based on the weather, referencing "Tampere" or "löydä liikuntapaikka".

### Widget UI
- **D-05:** AI text **replaces** the typewriter animation entirely. No crossfade from typewriter — typewriter logic is removed. AI text is plain (no typewriter effect on the AI output itself).
- **D-06:** Weather emoji + temperature on the right side of the widget **stays unchanged**. The weather data can be fetched by the Route Handler and returned alongside the AI text in the same JSON response (`{ text: string, temp: number, code: number }`), OR the client can continue fetching Open-Meteo separately. Route Handler returns all three fields — client uses `temp` and `code` from the API response instead of its own Open-Meteo fetch (simplifies Etusivu.tsx).
- **D-07:** Loading state: **static placeholder text** while the API call is in-flight. Text: `"Haetaan säätietoja..."`. No skeleton, no spinner, no animation.

### Fallback Behavior
- **D-08:** If Claude API fails OR Open-Meteo fails: Route Handler returns the **time-based fallback** in the HTTP 200 response body (not an error status). Client cannot tell the difference between fallback and real AI text — it just renders whatever `text` field is returned.
- **D-09:** Fallback text matches existing `aiTeksti` logic in Etusivu.tsx (time-of-day greeting: "Huomenta · Löydä paras liikuntapaikka Tampereelta" etc.). Route Handler computes this server-side using the same hour-based logic when AI fails.
- **D-10:** Fallback is also cached — a failed API day does not trigger retry on every reload. Same sessionStorage key, same expiry.

### sessionStorage Cache
- **D-11:** Cache key: `"saasuositus-YYYY-MM-DD"` (e.g. `"saasuositus-2026-05-21"`). Built from `new Date().toISOString().slice(0, 10)` client-side.
- **D-12:** Cached value: plain text string (just `text` — not the full JSON). `temp` and `code` are NOT cached (they re-fetch live from the Route Handler on each load; they're just display values that can tolerate a fresh fetch).
  - Actually: per D-06 the client uses temp+code from the Route Handler response. On cache hit, the client shows cached text but still calls `/api/saasuositus` for temp+code display? — **Revised:** On cache hit, skip the API call entirely; use a separate lightweight client-side Open-Meteo fetch for the weather display (as currently exists in Etusivu.tsx). This keeps the cache logic simple: cache = only the AI text; weather display = always live.
- **D-13:** `try/catch` around all `sessionStorage` access — failure is silent, widget falls back to fetching from API normally.

### Architecture
- **D-14:** Route Handler: `app/api/saasuositus/route.ts` (Next.js App Router). `GET` method. No request body — server computes everything. Returns `{ text: string, temp: number, code: number }`.
- **D-15:** Widget never SSR — Etusivu.tsx is already `'use client'`. Route Handler is called via `fetch('/api/saasuositus')` inside a `useEffect` on mount. Non-blocking: placeholder renders immediately, AI text replaces it when the promise resolves.
- **D-16:** `@anthropic-ai/sdk` needs to be installed (`npm install @anthropic-ai/sdk`). Model: `claude-haiku-4-5-20251001` (latest Haiku). `ANTHROPIC_API_KEY` env var (server-only, never `NEXT_PUBLIC_`).

### Phase 4 Bug Fix (prerequisite)
- **D-17:** `app/page.tsx` Supabase select is missing `aukioloajat` and `hinta_kuvaus` columns — Phase 4 badges never show live data. Must fix this as part of Phase 5 Wave 1 (or as a standalone fix before Phase 5 execution). The fix is one line: add `aukioloajat, hinta_kuvaus` to the `.select()` string.

### Claude's Discretion
- Exact prompt wording for Claude Haiku (researcher / planner chooses — must produce 1-sentence Finnish output with sport + paikkavihjaus).
- Whether to stream the Claude response or collect it fully before returning (recommendation: collect fully — single sentence is tiny, streaming adds complexity).
- Max tokens for Claude Haiku call (recommendation: 80–120 tokens — single sentence needs no more).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing widget code
- `app/components/Etusivu.tsx` — the component that owns the AI widget box (lines 173-209); contains existing typewriter/weather logic to be replaced; `'use client'` — correct for non-blocking fetch
- `app/page.tsx` — homepage server component; passes `paikat` to Etusivu; also has Phase 4 bug (D-17)

### Constraints
- `CLAUDE.md` (AI widget section) — "never SSR, use `/api/saasuositus` Route Handler, non-blocking load"
- `.planning/REQUIREMENTS.md` — AI-01, AI-02, AI-03 (exact requirement text)

### Type / utility reference
- `lib/types.ts` — Liikuntapaikka type (not changed in this phase, but executor reads it for context)

### Phase context
- `.planning/phases/04-service-information-ui/04-CONTEXT.md` — prior phase; confirms glass design system and monochrome color tokens used in Etusivu widget

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Etusivu.tsx` weather fetch (lines 82-87): `fetch('https://api.open-meteo.com/v1/forecast?...')` — keep this for the weather display; Route Handler also fetches Open-Meteo server-side for the prompt
- `Etusivu.tsx` `aiTeksti` useMemo (lines 89-94): hour-based greeting logic — extract this as the fallback text, reuse in Route Handler's error path
- `getWeatherEmoji(code)` (lines 29-36): already in Etusivu.tsx, stays unchanged

### Established Patterns
- `'use client'` + `useEffect` for non-blocking data fetch — same pattern as GPS (`useGPS` hook); fetch on mount, set state when done
- `useState(null)` initial → state filled async — widget renders placeholder on first render, AI text on second render
- Route Handler pattern: `app/api/hae-paikat/route.ts` exists as reference — follow same `export async function GET()` pattern with `NextResponse.json()`

### Integration Points
- Route Handler `app/api/saasuositus/route.ts` → called by `Etusivu.tsx` `useEffect`
- `ANTHROPIC_API_KEY` env var → added to `.env.local` (server-only, never NEXT_PUBLIC)
- sessionStorage in `useEffect` (not during render) — Next.js SSR safe

</code_context>

<specifics>
## Specific Ideas

- Cache key format: `"saasuositus-" + new Date().toISOString().slice(0, 10)` → `"saasuositus-2026-05-21"`
- Loading placeholder text: `"Haetaan säätietoja..."`
- Fallback text (time-based): same `aiTeksti` logic already in Etusivu.tsx
- Route Handler response shape: `{ text: string, temp: number, code: number }`
- Claude model: `claude-haiku-4-5-20251001`
- Max tokens: ~100 (one short Finnish sentence)
- Weather display (right side): stays live — client-side Open-Meteo fetch in Etusivu continues as-is; Route Handler's temp/code used to populate the same display

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-ai-weather-widget*
*Context gathered: 2026-05-21*
