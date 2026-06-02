---
phase: 25-todo-overlay
verified: 2026-06-02T08:45:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the overlay: tap the Bookmark/TodoButton on the map view"
    expected: "Overlay slides in from top-right with scale animation; icon crossfades from Bookmark to X"
    why_human: "Animation rendering and visual transform-origin behavior cannot be verified by grep"
  - test: "Tap the X (TodoButton while overlay open)"
    expected: "Overlay animates closed; icon crossfades back to Bookmark"
    why_human: "Exit animation behavior requires runtime observation"
  - test: "Overlay with empty TO DO list"
    expected: "Overlay shows Bookmark icon, 'Lista on tyhjä', and 'Lisää paikkoja kirjanmerkkipainikkeella'"
    why_human: "Requires logged-out or zero-saved-items session state to observe"
  - test: "Overlay with places in TO DO list"
    expected: "DiagonaalKortti cards stagger in one by one (0.06s delay between each)"
    why_human: "Stagger animation timing requires runtime visual inspection"
  - test: "Nav-pill expanded menu — tap TO DO button"
    expected: "Overlay opens without navigating to /suosikit; nav-pill closes"
    why_human: "Navigation behavior requires browser runtime"
  - test: "Tap 'Näytä kartalla' on an overlay card"
    expected: "Map pans to venue; overlay remains open (does not close)"
    why_human: "Map pan behavior and overlay persistence require runtime observation"
  - test: "Logged-in user taps the Bookmark button on an overlay card"
    expected: "'Kävikö paikassa?' prompt appears inline; place removed from overlay list"
    why_human: "Auth state dependency and animated prompt appearance require runtime"
  - test: "Tap 'Kyllä' on the Kävikö prompt"
    expected: "Prompt fades out; InlineReviewExpanded fades in with star picker and textarea; submit disabled until star selected"
    why_human: "AnimatePresence transition between two motion.divs requires runtime"
  - test: "Submit a review via 'Jätä arvostelu'"
    expected: "'Arvostelu tallennettu' shown for ~1.5s, then slot disappears; review written to Supabase reviews table"
    why_human: "Requires live Supabase connection and authenticated session to verify end-to-end"
  - test: "Tap 'Ohita' on InlineReviewExpanded"
    expected: "Form disappears without submitting; no data written to Supabase"
    why_human: "Requires runtime and Supabase observation to confirm non-submission"
  - test: "Non-authenticated user taps Bookmark on an overlay card"
    expected: "Place is silently removed from list with no prompt (no 'Kävikö?' shown)"
    why_human: "Auth-state-conditional behavior requires runtime with logged-out session"
  - test: "Close and reopen overlay after a Kävikö prompt was shown"
    expected: "No stale prompt or review form visible on reopen"
    why_human: "closeOverlays state reset behavior requires runtime session cycling"
---

# Phase 25: TO DO Overlay Verification Report

**Phase Goal:** TO DO -lista avautuu etusivun päälle animoituna overlayina erillisen sivunavigaation sijaan; poistaminen ehdottaa arvostelua
**Verified:** 2026-06-02T08:45:00Z
**Status:** human_needed (all automated checks passed; 12 items require runtime human verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | TO DO -painike toolbarin alla avaa overlaylistauksen etusivun päälle (ei navigoi /suosikit-sivulle); /suosikit-reitti säilyy toimivana | ✓ VERIFIED | `const [todoOpen, setTodoOpen] = useState(false)` at line 268; `motion.button` at line 1150 with `onClick={() => setTodoOpen(o => !o)}`; nav-pill button calls `setTodoOpen(true)` at line 1097 (no `href`); `href="/suosikit"` count in Etusivu.tsx = 0; `/app/suosikit/page.tsx` exists and is untouched |
| 2 | Painike muuttuu X-painikkeeksi kun overlay on auki; X sulkee sen | ✓ VERIFIED | `aria-label={todoOpen ? 'Sulje TO DO -lista' : 'Avaa TO DO -lista'}` at line 1155; `AnimatePresence mode="wait"` with `key="x"` (X icon) and `key="bm"` (Bookmark icon) at lines 1157–1170; `onClick={() => setTodoOpen(o => !o)}` toggles state |
| 3 | Overlay avautuu animaatiolla (nappi "sylkee" listan ulos) ja sulkeutuu animoituna | ✓ VERIFIED | `motion.div key="todo-overlay"` at line 890–897: `initial={{ scale: 0, opacity: 0 }}`, `animate={{ scale: 1, opacity: 1 }}`, `exit={{ scale: 0, opacity: 0 }}`, `transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}`, `style={{ transformOrigin: 'top right', ... }}`; visual animation requires human check |
| 4 | TO DO -lista on visuaalisesti selvästi erottuva hakulistasta (otsikko, oma tyyli) | ✓ VERIFIED | Overlay header `<p className="text-sm font-bold text-[#111111] uppercase tracking-widest mb-4">TO DO</p>` at line 899; overlay uses `glass rounded-l-2xl` panel vs search results using a different transparent container; visual distinctiveness requires human check |
| 5 | Kun käyttäjä poistaa paikan listalta, pop-up kysyy "Kävikö paikassa?" ja tarjoaa arvostelulomakkeen | ✓ VERIFIED | `handleOverlayDelete` at lines 391–396 calls `toggleTodo(id)` then `setPendingReviewPaikkaId(id)` when `supabaseUser !== null`; `KavikoPaikassaPrompt` motion.div at lines 928–955 with "Kävikö paikassa?" text and Kyllä/Ei buttons; `InlineReviewExpanded` at lines 956–1005 with StarPicker, textarea, `supabase.from('reviews').upsert` at line 421 |

**Score: 5/5 ROADMAP success criteria verified (automated evidence)**

---

### Plan Must-Haves (25-01-PLAN.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A fixed Bookmark button appears below the nav-pill on the right side of the screen | ✓ VERIFIED | `motion.button` at line 1150 with `style={{ position: 'fixed', right: 16, top: 'calc(max(12px, env(safe-area-inset-top)) + 48px)', zIndex: 64 }}` |
| 2 | Tapping the button opens a glassmorphism overlay panel from the right showing the user's TO DO places | ✓ VERIFIED | `todoOpen && (...)` inside AnimatePresence at line 889; overlay uses `glass rounded-l-2xl` className; renders `todoPaikat = paikat.filter(p => todoIds.has(p.id))` |
| 3 | The button icon changes to X when the overlay is open | ✓ VERIFIED | `AnimatePresence mode="wait"` at line 1157; `key="x"` renders X icon when `todoOpen`, `key="bm"` renders Bookmark when `!todoOpen` |
| 4 | The overlay animates open with a scale-from-top-right effect and closes the same way | ✓ VERIFIED | `transformOrigin: 'top right'` in style at line 897; scale 0→1 on open, scale 1→0 on exit |
| 5 | DiagonaalKortti cards stagger in after the overlay opens | ✓ VERIFIED | `todoContainerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }` at line 631; `motion.div variants={todoContainerVariants}` at line 907–925 |
| 6 | The overlay has a 'TO DO' title header visually distinguishing it from search results | ✓ VERIFIED | `<p className="text-sm font-bold text-[#111111] uppercase tracking-widest mb-4">TO DO</p>` at line 899 |
| 7 | The nav-pill expanded menu 'TO DO' link opens the overlay instead of navigating to /suosikit | ✓ VERIFIED | `<button onClick={() => { setTodoOpen(true); closeOverlays() }}>` at line 1096–1102; `href="/suosikit"` count in Etusivu.tsx = 0 (verified by grep) |
| 8 | An empty-state message shows when todoIds is empty | ✓ VERIFIED | `todoPaikat.length === 0` branch at lines 900–905: Bookmark icon, "Lista on tyhjä", "Lisää paikkoja kirjanmerkkipainikkeella" |

**Score: 8/8 plan-01 must-haves verified**

### Plan Must-Haves (25-02-PLAN.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Deleting a place from the TO DO overlay shows an inline 'Kävikö paikassa?' prompt in the same card slot | ✓ VERIFIED | `KavikoPaikassaPrompt` at lines 928–955; `pendingReviewPaikkaId !== null && todoOpen` condition renders prompt inside overlay |
| 2 | The prompt only appears for logged-in users; non-authenticated users get silent deletion | ✓ VERIFIED | `handleOverlayDelete` at lines 391–396: `if (supabaseUser !== null) { setPendingReviewPaikkaId(id) }` — null check is enforced |
| 3 | Tapping 'Kyllä' replaces the prompt with an inline star-rating + comment form | ✓ VERIFIED | Kyllä button `onClick={() => { setReviewPaikkaId(pendingReviewPaikkaId); setPendingReviewPaikkaId(null) }}` at line 941; `InlineReviewExpanded` at line 956 renders when `reviewPaikkaId !== null` |
| 4 | Tapping 'Ei' dismisses the slot without showing a form | ✓ VERIFIED | Ei button `onClick={() => setPendingReviewPaikkaId(null)}` at line 948; clears prompt without setting `reviewPaikkaId` |
| 5 | Submitting the review calls the reviews Supabase upsert and removes the slot on success | ✓ VERIFIED | `supabase.from('reviews').upsert(payload, { onConflict: 'user_id,paikka_id' })` at line 421; on success `setReviewPaikkaId(null)` called after 1500ms at line 429; full payload includes `user_id, paikka_id, rating, teksti, is_anonymous, reviewer_name, visit_date, crowd_rating` |
| 6 | Tapping 'Ohita' dismisses the form slot without submitting | ✓ VERIFIED | Ohita `onClick={resetInlineReview}` at line 995; `resetInlineReview` at lines 398–404 clears `reviewPaikkaId` to null without calling upsert |

**Score: 6/6 plan-02 must-haves verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/Etusivu.tsx` | TodoButton, TodoOverlay, card stagger, empty state, nav-pill link change, KavikoPaikassaPrompt, InlineReviewExpanded | ✓ VERIFIED | All elements present with substantive implementation; 1473 lines; all state variables, handlers, and JSX found |
| `app/components/DiagonaalKortti.tsx` | `onToggleTodo` optional prop + bookmark delete button | ✓ VERIFIED | `onToggleTodo?: (id: number) => void` at line 39; button rendered conditionally at lines 144–152 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| TodoButton (motion.button) | todoOpen state | `onClick={() => setTodoOpen(o => !o)}` | ✓ WIRED | Line 1152 |
| AnimatePresence | TodoOverlay motion.div | `todoOpen` conditional render | ✓ WIRED | Lines 888–1008; `key="todo-overlay"` present |
| nav-pill TO DO button | `setTodoOpen(true)` | `onClick={() => { setTodoOpen(true); closeOverlays() }}` | ✓ WIRED | Line 1097; no remaining `href="/suosikit"` in Etusivu.tsx |
| DiagonaalKortti delete trigger (onToggleTodo) | handleOverlayDelete | overlay passes `handleOverlayDelete` as `onToggleTodo` | ✓ WIRED | Line 922: `onToggleTodo={handleOverlayDelete}`; search-list DiagonaalKortti at line 1404 has no `onToggleTodo` (backward-compatible) |
| handleOverlayDelete | pendingReviewPaikkaId state | `setPendingReviewPaikkaId(id)` when `supabaseUser !== null` | ✓ WIRED | Lines 391–396 |
| KavikoPaikassaPrompt 'Kyllä' button | reviewPaikkaId state | `onClick={() => { setReviewPaikkaId(pendingReviewPaikkaId); ... }}` | ✓ WIRED | Line 941 |
| InlineReviewExpanded submit | `supabase.from('reviews').upsert` | `handleInlineReviewSubmit` | ✓ WIRED | Lines 406–435 |
| closeOverlays | all review state | `setTodoOpen(false); setPendingReviewPaikkaId(null); setReviewPaikkaId(null)` | ✓ WIRED | Lines 318–323 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| TodoOverlay | `todoPaikat` | `paikat.filter(p => todoIds.has(p.id))` | Yes — `paikat` is server-fetched prop; `todoIds` is populated from Supabase `suosikit` table via `subscribeToAuthUser` at lines 490–507 | ✓ FLOWING |
| InlineReviewExpanded | `inlineRating`, `inlineTeksti` | React state updated via StarPicker `onChange` and textarea `onChange` | Yes — real user input, not hardcoded | ✓ FLOWING |
| InlineReviewExpanded submit | Supabase `reviews` table | `handleInlineReviewSubmit` constructs payload from real state + `supabaseUser.id` | Yes — live upsert, onConflict enforced | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for the overlay's interactive animations and auth-gated flows — these require a running browser with a live Supabase session. TypeScript compilation (`npx tsc --noEmit`) passed with zero errors (confirmed — no output produced).

---

### Probe Execution

Step 7c: No probe scripts declared or found in `scripts/*/tests/probe-*.sh`. SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TODO-03 | 25-01-PLAN.md | TO DO -lista avautuu overlay-mallilla eikä navigoi erilliselle sivulle | ✓ SATISFIED | Overlay renders inside Etusivu; `href="/suosikit"` count = 0; `/app/suosikit/page.tsx` preserved |
| TODO-04 | 25-01-PLAN.md | TO DO -painike toolbarin alapuolelle; muuttuu X-painikkeeksi | ✓ SATISFIED | TodoButton at fixed `top: calc(...+48px)`; icon crossfade Bookmark↔X via AnimatePresence |
| TODO-05 | 25-01-PLAN.md | Lista avautuu animaatiolla; Emil Kowalski principles | ✓ SATISFIED | `scale 0→1, duration: 0.2, ease: [0.25, 0.1, 0.25, 1]`; staggerChildren: 0.06; no spring physics for static overlay; runtime visual check needed |
| TODO-06 | 25-01-PLAN.md | TO DO -lista visuaalisesti erottuva hakulistasta | ✓ SATISFIED | "TO DO" uppercase header; separate `glass rounded-l-2xl` panel positioned differently from search results |
| TODO-07 | 25-02-PLAN.md | Poistaminen → "Kävikö paikassa?" pop-up + arvostelulomake | ✓ SATISFIED | `handleOverlayDelete` → `KavikoPaikassaPrompt` → `InlineReviewExpanded` → `reviews.upsert` flow fully wired |

All 5 requirements (TODO-03, TODO-04, TODO-05, TODO-06, TODO-07) for Phase 25 are accounted for across both plans. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/components/Etusivu.tsx` | 978 | `placeholder="Vapaaehtoinen kommentti"` | ℹ️ Info | HTML textarea `placeholder` attribute — not a stub; real user-facing UX label |
| `app/components/Etusivu.tsx` | 1329 | `placeholder="Hae liikuntapaikkaa..."` | ℹ️ Info | Search input `placeholder` — pre-existing, not introduced in Phase 25 |

No `TBD`, `FIXME`, or `XXX` markers found in either modified file. No stub implementations detected. The `placeholder` strings are standard HTML attributes, not code-quality markers.

**D-05 compliance confirmed:** `anyOverlayOpen = rightOpen` at line 629 — `todoOpen` is NOT included. The TO DO overlay has no backdrop; the map remains fully visible when the overlay is open.

---

### Human Verification Required

### 1. Scale animation from top-right

**Test:** Open the app in a browser. Tap the Bookmark button (fixed below the nav-pill, right side). Observe the overlay opening.
**Expected:** Overlay appears to expand outward from the top-right corner (transformOrigin 'top right'), growing from 0 to full size with a 200ms ease-out feel. Icon in the button crossfades from Bookmark to X.
**Why human:** CSS transform-origin behavior and motion.div scale animation require visual runtime inspection.

### 2. Overlay close animation

**Test:** While the overlay is open, tap the X button.
**Expected:** Overlay shrinks back toward the top-right corner and disappears; icon crossfades X → Bookmark.
**Why human:** Exit animation via AnimatePresence requires runtime observation.

### 3. Empty state appearance

**Test:** Open the overlay when logged out or with no saved places.
**Expected:** Overlay shows a dimmed Bookmark icon (w-8 h-8 at 20% opacity), "Lista on tyhjä" in muted text, and "Lisää paikkoja kirjanmerkkipainikkeella" below it.
**Why human:** Requires a session with zero todoIds.

### 4. Card stagger animation

**Test:** Open the overlay when at least 2 places are saved to the TO DO list.
**Expected:** DiagonaalKortti cards appear one after another with a ~60ms stagger — not all at once.
**Why human:** Stagger timing requires visual inspection.

### 5. Nav-pill TO DO trigger

**Test:** Tap the MoreHorizontal (three dots) nav-pill button to expand it. Tap the "TO DO" button in the expanded menu.
**Expected:** Overlay opens; nav-pill collapses; browser does NOT navigate to /suosikit.
**Why human:** Navigation behavior (absence of page transition) requires runtime observation.

### 6. Map pan from overlay card

**Test:** With the overlay open and at least one card shown, tap the MapPin icon on a DiagonaalKortti card inside the overlay.
**Expected:** Map pans/zooms to that venue. Overlay remains open — it does NOT close.
**Why human:** Map API `panTo` behavior and overlay persistence require runtime.

### 7. Kävikö paikassa? prompt (logged-in user)

**Test:** Logged in as a user with saved TO DO places, tap the Bookmark button on a card inside the TO DO overlay.
**Expected:** The place disappears from the TO DO list; a "Kävikö paikassa?" prompt slides up inside the overlay with Kyllä and Ei buttons.
**Why human:** Requires authenticated Supabase session; animated prompt appearance requires visual check.

### 8. Kyllä → InlineReviewExpanded transition

**Test:** After the Kävikö prompt appears, tap "Kyllä".
**Expected:** The prompt fades out; an expanded form fades in with a star rating picker (5 stars), a textarea, and a "Jätä arvostelu" button (disabled until at least 1 star selected).
**Why human:** AnimatePresence two-child handoff requires runtime; star picker interactivity requires browser.

### 9. Full review submission flow

**Test:** Select a star rating, optionally add text, and tap "Jätä arvostelu".
**Expected:** Button shows "Tallennetaan…"; on success shows "Arvostelu tallennettu"; slot auto-dismisses after ~1.5s. Review row appears in the Supabase `reviews` table.
**Why human:** Requires live Supabase connection and authenticated session to confirm end-to-end.

### 10. Ohita dismiss

**Test:** After the InlineReviewExpanded is shown, tap "Ohita".
**Expected:** Form disappears without submitting. No record written to Supabase `reviews`.
**Why human:** Requires runtime plus Supabase table observation to confirm non-write.

### 11. Silent deletion for non-authenticated user

**Test:** While logged out, open the TO DO overlay (if places are available). Tap the Bookmark delete button on an overlay card.
**Expected:** Place is removed from the list; no "Kävikö paikassa?" prompt appears.
**Why human:** Requires a logged-out session where todoIds still has entries (edge case requiring specific setup).

### 12. Stale state prevention on overlay close/reopen

**Test:** Trigger the Kävikö prompt or InlineReviewExpanded, then close the overlay via X. Reopen the overlay.
**Expected:** No stale prompt or form visible on reopen — overlay shows clean card list (or empty state).
**Why human:** `closeOverlays` state reset behavior requires runtime session cycling to confirm.

---

### Gaps Summary

No automated gaps found. All 14 must-haves verified programmatically. All 5 requirements satisfied. All 8 key links wired and substantive. TypeScript compiles with zero errors. No debt markers found.

The 12 human verification items are behavioral/visual checks that grep cannot confirm. They do not indicate missing implementation — all implementation is present and substantively wired.

**Note on `handleOverlayDelete` and `todoOpen` guard:** Plan 25-02 acceptance criteria specified that `handleOverlayDelete` should check `BOTH todoOpen AND supabaseUser !== null` before setting `pendingReviewPaikkaId`. The actual implementation only checks `supabaseUser !== null`. However, this deviation is functionally equivalent because `handleOverlayDelete` is exclusively passed as `onToggleTodo` to DiagonaalKortti cards rendered inside the `{todoOpen && ...}` branch. The delete button is physically unreachable when `todoOpen` is false. No functional gap exists; the guard is enforced structurally rather than explicitly.

---

_Verified: 2026-06-02T08:45:00Z_
_Verifier: Claude (gsd-verifier)_
