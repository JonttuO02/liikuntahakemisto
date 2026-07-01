---
status: diagnosed
trigger: "Investigate issue: paikkasheet-dismisses-search-todo-overlay — Opening PaikkaSheet from the search results list or the TO DO (favorites) overlay closes that underlying list/overlay, instead of layering the sheet on top of it."
created: 2026-07-01T00:00:00Z
updated: 2026-07-01T00:16:00Z
---

## Current Focus

hypothesis: CONFIRMED — Etusivu.tsx's onOpen handlers passed to DiagonaalKortti explicitly call setSearchOpen(false) / setTodoOpen(false) before setValittu(clicked), unmounting the AnimatePresence-wrapped list/overlay instead of leaving it mounted underneath PaikkaSheet (which already has a higher z-index).
test: Traced onOpen prop wiring for both call sites (search results list card, TODO overlay card) and confirmed z-index stacking would already support layering without the explicit close calls.
expecting: n/a — root cause confirmed, diagnose-only mode.
next_action: Return ROOT CAUSE FOUND diagnosis (goal: find_root_cause_only — no fix applied).

## Symptoms

expected: Opening PaikkaSheet from a card in the search results list or the TO DO overlay should NOT close that underlying list/overlay. The sheet should open on top of it. Closing the sheet should return the user directly to the list/overlay they were browsing, not to the closed/collapsed base state.
actual: When opening PaikkaSheet from the list or todo overlay, the list or todo overlay that was browsed is closed as PaikkaSheet is opened. This forces the user to always reopen the list after opening any PaikkaSheet, interrupting the browsing flow.
errors: None reported
reproduction: Test 2 in .planning/phases/62-venuepage-konsolidaatio/62-UAT.md
started: Discovered during UAT of Phase 62 (venuepage-konsolidaatio)

## Eliminated

## Evidence

- timestamp: 2026-07-01T00:05:00Z
  checked: app/components/PaikkaSheet.tsx (full read)
  found: PaikkaSheet itself has no knowledge of / control over the search list or TODO overlay. It renders as a fixed-position sheet at zIndex 66 (preview mode aside), driven purely by whether it's mounted (AnimatePresence in parent). onClose only calls the passed-in onClose callback (parent's setValittu(null)); it does not touch any list/overlay state.
  implication: The dismiss behavior must originate in the parent (Etusivu.tsx), specifically in how/when valittu is set and whether searchOpen/todoOpen are simultaneously cleared.

- timestamp: 2026-07-01T00:10:00Z
  checked: app/components/Etusivu.tsx lines 1370-1433 (search results list block) and lines 965-1034 (TODO overlay block)
  found: |
    Search results list card: `onOpen={(clicked) => { setSearchOpen(false); setValittu(clicked) }}` (lines 1422-1425).
    TODO overlay card: `onOpen={(clicked) => { setTodoOpen(false); setValittu(clicked) }}` (line 1026).
    Both explicitly clear the overlay's open flag (searchOpen / todoOpen) in the SAME handler that opens PaikkaSheet (setValittu). Since both overlays are wrapped in `<AnimatePresence>{condition && (...)}</AnimatePresence>`, setting the flag false unmounts (exit-animates away) the list/overlay entirely rather than leaving it mounted underneath the sheet.
  implication: This is the direct, deterministic cause of the reported symptom — not a z-index/stacking issue, not a race condition. It is unconditional application logic.

- timestamp: 2026-07-01T00:12:00Z
  checked: z-index stacking — search-results container (zIndex 59), TODO overlay (zIndex 62), PaikkaSheet backdrop (zIndex 65) and PaikkaSheet itself (zIndex 66)
  found: PaikkaSheet's zIndex (65/66) is already higher than both the search-results list (59) and the TODO overlay (62). If the two setSearchOpen(false)/setTodoOpen(false) calls were removed (or made conditional), PaikkaSheet would naturally layer on top without any z-index changes needed.
  implication: The fix is isolated to the two onOpen handlers in Etusivu.tsx — no restructuring of stacking context or overlay architecture required. Closing the sheet (onClose -> setValittu(null)) does not currently restore searchOpen/todoOpen, which is exactly why the user has to manually reopen the list after every PaikkaSheet visit, matching the reported symptom precisely.

- timestamp: 2026-07-01T00:14:00Z
  checked: app/components/DiagonaalKortti.tsx lines 245-260
  found: onOpen is wired to the full-card click/keydown handler (the LEFT info panel per Test 1's description); onShowMap is a separate stopPropagation'd handler on the photo/map-icon area. Confirms onOpen is exactly the trigger UAT Test 2 describes ("opening PaikkaSheet from a card in the search results list or the TO DO overlay").
  implication: No other code path opens PaikkaSheet from these two surfaces — the two onOpen handler sites identified are the complete and sole cause.

- timestamp: 2026-07-01T00:15:00Z
  checked: .planning/phases/62-venuepage-konsolidaatio/62-UAT.md Test 1 vs Test 2
  found: Test 1 ("CR-01 regression fix confirmation") explicitly asserts "the overlay you tapped from should be dismissed rather than remaining visible underneath the sheet" and passed. Test 2 asserts the opposite (should NOT dismiss) and failed. Both describe the same onOpen call sites.
  implication: This is a product-intent conflict, not just a bug — Test 1 was written/passed against the dismiss-on-open behavior that Test 2 now says is wrong. Any fix must reconcile with Test 1's original CR-01 intent (which was likely just "tapping the info panel must trigger onOpen at all," not specifically "and must dismiss") — flagged for the fixing agent/human, not resolved here per find_root_cause_only mode.

## Resolution

root_cause: |
  In app/components/Etusivu.tsx, the onOpen callbacks passed to DiagonaalKortti for both the search-results list (lines 1422-1425) and the TODO overlay (line 1026) unconditionally call setSearchOpen(false) / setTodoOpen(false) in the same handler that opens PaikkaSheet via setValittu(clicked). Because both overlays are conditionally rendered inside <AnimatePresence>{flag && (...)}</AnimatePresence>, clearing the flag unmounts the list/overlay instead of leaving it mounted underneath PaikkaSheet. PaikkaSheet's own z-index (65/66) is already higher than the search-results list (59) and TODO overlay (62), so simply not clearing the flag would let it layer correctly. Additionally, PaikkaSheet's onClose (-> setValittu(null)) never restores searchOpen/todoOpen, so once dismissed the user lands on the base map/sheet state instead of back in the list — matching the reported symptom exactly.
fix: 
verification: 
files_changed: []
