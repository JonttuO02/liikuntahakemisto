---
plan: 29-02
phase: 29-kortit-sheet-redesign
status: complete
completed: "2026-06-04"
commits:
  - b9a249a — feat(29-02): conditional marquee price row in PaikkaKortti (UI-25)
  - a1cb3df — feat(29-02): marquee price row in DiagonaalKortti and CalloutCard
  - 2ab723c — fix(29-02): fade mask + individual price items + overflow + static position
  - 8622c50 — feat: DOM-pohjainen marquee-ylivuoto + hintapillit kaikissa korteissa
---

# Plan 29-02 Summary — PaikkaKortti marquee price row

## What was built

Conditional DOM-overflow-based marquee price row in PaikkaKortti (UI-25). The implementation evolved from the original `marqueePriceLines()` line-count guard to a DOM-measurement approach via `useOverflowMarquee` hook — this is more robust because it activates based on actual pixel overflow rather than a line count heuristic.

**Key changes:**
- `lib/priceUtils.ts`: Added `priceItemList()` helper that returns price items as individual pill strings (e.g. `["Kertakäynti 8€", "10-kortti 70€"]`)
- `lib/useOverflowMarquee.ts`: New hook — renders a hidden measurement div, compares its natural width to the container width, sets `shouldMarquee` boolean
- `app/components/PaikkaKortti.tsx`: Price block replaced with overflow-driven conditional: marquee (two-copy seamless loop with fade mask) when items overflow, static pill row otherwise
- `app/globals.css`: `@keyframes marquee` already added in Plan 01; this plan consumed it

## Deviations from plan

The plan specified `marqueePriceLines(hintaKuvaus, membershipOnly)` returning `string[] | null` based on newline count. The actual implementation uses `priceItemList()` + `useOverflowMarquee` (DOM-width detection). This is a deliberate improvement: it handles single long items that overflow, not just multi-line ones, and is immune to inconsistent `\n` vs `\\n` data.

## Acceptance criteria check

- [x] Marquee activates when price items overflow container width (≡ 2+ items in practice)
- [x] Static pill row shown when items fit — no animation
- [x] membershipOnly → "vain jäsenyys" (no marquee)
- [x] No price → "Lisätään pian"
- [x] Fade mask (`WebkitMaskImage` + `maskImage`) on left/right edges when marquee is active
- [x] Two-copy seamless loop — no visible jump
- [x] tsc + vitest clean
