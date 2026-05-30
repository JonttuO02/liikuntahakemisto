# Phase 16: Brändi & Logo-uloke — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 16-Brändi & Logo-uloke
**Areas discussed:** Logo placeholder design, Tab layout (closed state), Gradient colors, Brand scope (tietosuoja)

---

## Logo Placeholder Design

### Q1 — What should the placeholder SVG look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Bold text 'AKTIIVI' only | Plain SVG `<text>`, no chevrons. Easy to replace. | ✓ |
| Chevrons + 'AKTIIVI' | Keep < > chevron style from ActaLogo, swap 'ACTA' for 'AKTIIVI'. | |
| Icon symbol only | Abstract shape or monogram, no text. | |

**User's choice:** Bold text 'AKTIIVI' only
**Notes:** Simpler placeholder is easier to replace when the real logo arrives.

---

### Q2 — Text size and weight?

| Option | Description | Selected |
|--------|-------------|----------|
| Same as ACTA (fontSize 40, letterSpacing 6, weight 400) | Continuity with existing ActaLogo. | |
| Compact & heavier (fontSize 28, letterSpacing 4, weight 700) | Better readability at 44px tab height. | ✓ |
| You decide | Pick whichever fits cleanest. | |

**User's choice:** Compact & heavier (fontSize 28, letterSpacing 4, weight 700)

---

### Q3 — Logo entrance animation when sheet opens?

| Option | Description | Selected |
|--------|-------------|----------|
| Static — gradient is the only animation | Logo appears instantly; gradient change is the moment. | |
| Fade in (opacity 0→1, 0.2s) | Subtle entrance. | |
| You decide | Pick what feels right. | |

**User's choice (freeform):** "The logo moves along with the bottomsheet, when its opened or closed"
**Notes:** Logo is always at the top of the sheet element — it physically slides up/down with the sheet. No separate animation logic needed. This satisfies UI-14 (logo visible in tab when closed + in header when open) naturally.

---

## Tab Layout (Closed State)

### Q1 — Where does the logo sit in the 44px tab?

| Option | Description | Selected |
|--------|-------------|----------|
| Logo centered, drag bar removed | Wordmark fills the tab center; logo IS the handle. | ✓ |
| Logo centered above drag bar | Stacked inside 44px. Gets cramped. | |
| Logo left, drag bar right | Side-by-side. | |

**User's choice:** Logo centered, drag bar removed (the existing `w-10 h-1` drag bar is removed)

---

### Q2 — Logo vs pill sizing?

| Option | Description | Selected |
|--------|-------------|----------|
| Logo scales down to fit pill | SVG viewBox scales naturally. | |
| Logo fixed size, pill clips sides | Overflow:hidden clips edges. | |
| (User freeform) | | ✓ |

**User's choice (freeform):** "Logo keeps its size all the time. Edit the animation so the pill never gets smaller than the logo. Edit the pill to fit with logo."
**Notes:** `pillInset` animation constrained so closed pill width ≥ logo width. Logo is fixed; pill adapts.

---

### Q3 — Pill horizontal position when closed?

| Option | Description | Selected |
|--------|-------------|----------|
| Centered pill — compact, logo-width only | Tab snaps to small pill centered on screen. | ✓ |
| Wide pill — most of screen width | Narrows to ~80% width. More surface area. | |
| You decide | Pick whatever looks best. | |

**User's choice:** Centered pill — compact, logo-width only

---

## Gradient Colors

### Q1 — How to define the 5 gradient stops?

| Option | Description | Selected |
|--------|-------------|----------|
| Give me a sporty palette now | Claude proposes, user confirms. | |
| I'll specify the hex values | User types the colors. | |
| You decide — vivid and sporty | Claude picks high-contrast sporty gradients. | ✓ |

**User's choice:** You decide — vivid and sporty

**Claude's selection:**
| Index | Name | Start | End |
|-------|------|-------|-----|
| 0 | Fire | `#FF7B00` | `#E63946` |
| 1 | Ocean | `#00B4D8` | `#0077B6` |
| 2 | Neon | `#C9F400` | `#00D68F` |
| 3 | Sunset | `#FF6CA8` | `#BE2ED6` |
| 4 | Electric | `#7B2FFF` | `#0055FF` |

---

## Brand Scope (tietosuoja)

### Q1 — Update "Liikuntahakemisto" in privacy policy?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — update to AKTIIVI everywhere | Consistent branding across all surfaces. | ✓ |
| No — leave legal name as-is | Legal entity name stays separate from brand. | |
| Update UI references, leave legal text | Hybrid approach. | |

**User's choice:** Yes — update to AKTIIVI everywhere

---

## Claude's Discretion

- Exact SVG viewBox dimensions for `AktiiviLogo.tsx`
- Precise `pillInset` value (derived from logo width measurement)
- SVG gradient animation technique (Framer Motion vs. CSS `<stop>` animation)

## Deferred Ideas

None.
