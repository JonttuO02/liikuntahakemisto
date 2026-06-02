---
phase: 26-filtterit
verified: 2026-06-02T00:00:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open search overlay, observe laji pill with no filter active — text should cycle through sport names every ~2 seconds"
    expected: "Pill text changes every 2 seconds cycling through all sports in LAJIT_FILTTERI (minus 'Kaikki'); animation is opacity crossfade"
    why_human: "setInterval carousel animation cannot be verified by static grep; requires browser observation"
  - test: "Tap the laji pill — chip list should expand below; tap a chip to select it; re-tap same chip to deselect"
    expected: "Chip list animates in (opacity + y: -4 to 0); selected chip is bg-[#111111] text-white; unselected chip is glass rounded-full text-[rgba(17,17,17,0.45)]; de-selecting a chip restores it to unselected style"
    why_human: "Toggle state and animation rendering requires browser interaction to verify"
  - test: "With exactly 1 laji selected, observe the laji pill"
    expected: "Pill text is static (no animation) and shows the selected sport name; pill background is bg-[#111111] text-white"
    why_human: "Single-select static behavior requires browser observation; cannot verify carousel pause from static code"
  - test: "With 2+ laji selected, observe the laji pill"
    expected: "Pill text cycles only through selected sport names every ~2 seconds; badge showing selection count appears (e.g. '2')"
    why_human: "Multi-select cycling behavior requires browser with real selections active"
  - test: "With kaupunki pill visible (requires 3+ distinct kaupunki values in data), tap kaupunki pill and select a city"
    expected: "Selecting a city filters the place list to that city; tapping the same chip again resets to 'Kaikki'; singleSelect closes chip list after tap"
    why_human: "Kaupunki conditional render (kaupungit.length > 2) and single-select close behavior requires live data and browser interaction"
---

# Phase 26: Filtterit Verification Report

**Phase Goal:** Filtteririvi näyttää vain paikkakunta- ja lajivalinnan; aktiiviset valinnat pyörivät karusellimaisesti filtteripainikkeessa
**Verified:** 2026-06-02
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | searchKertakaynti and searchAukinyt state variables no longer exist in Etusivu.tsx | VERIFIED | `grep "searchKertakaynti\|searchAukinyt"` returns 0 matches |
| 2 | getOpenStatus and isMembershipOnly imports are removed from Etusivu.tsx | VERIFIED | `grep "getOpenStatus\|isMembershipOnly"` returns 0 matches |
| 3 | searchLaji is typed string[] with empty array meaning "all" | VERIFIED | Line 342: `useState<string[]>([])` |
| 4 | searchSuodatettu useMemo uses `searchLaji.length === 0 || searchLaji.some(...)` predicate | VERIFIED | Lines 762–763 — functionally equivalent to plan spec; `.some()` with lowercase normalization on both sides |
| 5 | sessionStorage saves with `_v: 2` field; restore rejects any state without it | VERIFIED | Line 428: `_v: 2` in save object; line 539: `if (s._v !== 2) { sessionStorage.removeItem(...); return }` |
| 6 | sessionStorage restore uses `Array.isArray(s.searchLaji)` guard | VERIFIED | Line 541: `if (Array.isArray(s.searchLaji)) setSearchLaji(s.searchLaji)` |
| 7 | Filter row shows two FilterCarouselPill usages replacing select dropdowns; no `<select>`, no "Kertakäynti OK", no "Auki nyt" | VERIFIED | `grep "Kertakäynti\|Auki nyt\|<select"` returns 0; FilterCarouselPill at lines 1406 and 1414 |
| 8 | FilterCarouselPill implements ambient carousel (all items when 0 selected), static (1 selected), cycling (2+ selected) | VERIFIED | Lines 244–255: `if (selected.length === 1) return` skips interval; `items = selected.length > 1 ? selected : allItems`; displayText branches for all three states |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/Etusivu.tsx` | Filter state refactor + FilterCarouselPill component | VERIFIED | File modified; `FilterCarouselPillProps` interface at line 225, `FilterCarouselPill` function at line 233, wired at lines 1406 and 1414 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `searchLaji state` | `searchSuodatettu useMemo` | `searchLaji.length === 0 \|\| searchLaji.some(s => s.toLowerCase() === p.laji.toLowerCase())` | WIRED | Line 762 — uses `.some()` instead of `.includes()` but functionally identical with correct lowercase normalization |
| `handleCardClick` | `sessionStorage` | `_v: 2` field in saved state object | WIRED | Line 428: `_v: 2` is first field in state object |
| `sessionStorage restore useEffect` | `setSearchLaji` | `Array.isArray(s.searchLaji)` guard | WIRED | Line 541 |
| `LajiPill idx state` | `AnimatePresence` | `key={selected.length === 1 ? 'static' : idx}` on `motion.span` | WIRED | Line 269 |
| `chip onClick` | `setSearchLaji` | `prev.includes(item) ? prev.filter(l => l !== item) : [...prev, item]` | WIRED | Line 1419 |
| `kaupunki pill chip onClick` | `setSearchKaupunki` | `item === searchKaupunki ? 'Kaikki' : item` | WIRED | Line 1411 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `FilterCarouselPill` allItems (laji) | `LAJIT_FILTTERI.filter(l => l !== 'Kaikki')` | Static constant from `@/lib/lajit` | Static constant — intentional; not a DB query stub | FLOWING (static source by design) |
| `FilterCarouselPill` allItems (kaupunki) | `kaupunkiItems` | `kaupungit.filter(k => k !== 'Kaikki')` — derived from `deriveKaupungit(paikat)` where `paikat` is server-fetched Supabase data | Real DB data flowing through prop | FLOWING |
| `searchSuodatettu` | `paikat` prop | Server component passes real Supabase rows | Real DB rows | FLOWING |

### Behavioral Spot-Checks

Step 7b SKIPPED for carousel animation and chip interaction behavior — these require a running browser. Static checks on all other behaviors passed (see truths table). TypeScript compilation state not re-run here; both summaries report 0 errors and no source changes occurred after those checks.

### Probe Execution

No probe scripts declared in plan frontmatter. No `scripts/*/tests/probe-*.sh` discovered in repository. Step 7c: N/A.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FILTER-02 | 26-01-PLAN.md | Filtterit yksinkertaistetaan: vain paikkakunta + laji; kertakäynti OK ja auki nyt poistetaan; sessionStorage _v:2 | SATISFIED | Dead state variables absent; searchLaji is string[]; `_v:2` in save+restore; no dead buttons in JSX |
| FILTER-03 | 26-02-PLAN.md | Filtteripainike näyttää aktiiviset valinnat karuselli-animaatiolla | SATISFIED (code) / NEEDS HUMAN (runtime behavior) | FilterCarouselPill component implemented with setInterval carousel, AnimatePresence crossfade, chip expansion — runtime cycling and animation are human-only checks |

Both FILTER-02 and FILTER-03 are accounted for. No orphaned requirements for Phase 26.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or placeholder strings found in the modified file relevant to phase 26 changes. No stub implementations (empty return null, return {}, hardcoded empty arrays that flow to user-visible output without a data source).

Note: `displayItems` at line 250 is assigned but not used directly in rendering (rendering uses `displayText`). This is benign — `displayItems` is a derived variable that informs the carousel count but the text computation is done separately. Not a stub indicator.

### Human Verification Required

### 1. Ambient carousel cycling (laji pill — 0 selections)

**Test:** Open search overlay, observe laji pill with no filter active for 4–5 seconds
**Expected:** Pill text changes every 2 seconds cycling through all sports in LAJIT_FILTTERI (minus 'Kaikki'); animation is opacity crossfade (no translation)
**Why human:** setInterval + AnimatePresence animation requires browser observation

### 2. Chip list expand / chip toggle

**Test:** Tap the laji pill to expand chip list; tap a chip to select; tap again to deselect
**Expected:** Chip list animates in (opacity + y); selected chip has `bg-[#111111] text-white` background; unselected chip has glass style; tapping same chip deselects it
**Why human:** AnimatePresence expand animation and visual chip styles require live browser rendering to confirm

### 3. Single-selection static display

**Test:** Select exactly one laji chip; observe pill button
**Expected:** Pill text is static — no animation, shows selected sport name; pill is dark (`bg-[#111111] text-white`); no count badge
**Why human:** Requires confirming the `selected.length === 1` branch pauses the carousel interval

### 4. Multi-selection cycling

**Test:** Select 2 or more laji chips; observe pill button
**Expected:** Pill text cycles only through selected sport names every ~2 seconds; count badge (e.g. "2") appears inside the pill
**Why human:** Requires confirming the `selected.length > 1` branch cycles only selected values

### 5. Kaupunki pill single-select behavior

**Test:** If kaupunki pill is visible (requires 3+ cities in data), tap it, select a city; observe list filtering; tap same chip again
**Expected:** City filter applies; chip list closes after selection (singleSelect=true); tapping selected city chip again resets to 'Kaikki'
**Why human:** Requires live data with 3+ distinct kaupunki values and browser interaction for the close-on-select behavior

---

### Gaps Summary

No gaps found. All 8 must-have truths are VERIFIED in the codebase. Both requirement IDs (FILTER-02, FILTER-03) are fully implemented. The only outstanding items are runtime/animation behaviors that require browser observation, hence status `human_needed` rather than `passed`.

**Key observation:** Plan 26-01 key_links specified `searchLaji.includes(p.laji.toLowerCase())` as the filter predicate pattern, but the actual implementation uses `searchLaji.some(s => s.toLowerCase() === p.laji.toLowerCase())`. This is a correct deviation — `.some()` with symmetric case normalization is more robust than `.includes()` (which would only normalize the stored values, not the data values). This is not a failure; it is a quality improvement over the plan spec.

---

_Verified: 2026-06-02_
_Verifier: Claude (gsd-verifier)_
