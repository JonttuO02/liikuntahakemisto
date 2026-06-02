---
phase: 25
phase_name: TO DO overlay
status: draft
created: 2026-06-02
requirements: [TODO-03, TODO-04, TODO-05, TODO-06, TODO-07]
design_system: glassmorphism (globals.css utilities)
tool: none (custom glassmorphism, no shadcn)
---

# UI-SPEC — Phase 25: TO DO Overlay

## Locked Decisions (pre-confirmed from 25-CONTEXT.md — do not re-ask)

| ID | Decision |
|----|----------|
| D-01 | TO DO button is a fixed, independent button on the right side, BELOW the MoreHorizontal nav-pill trigger. Not inside the nav-pill expanded menu. |
| D-02 | Button shows icon only — no text, no badge. Closed state: `Bookmark` icon. Open state: `X` icon. Style: `glass rounded-full`, same as other toolbar elements. |
| D-03 | Overlay is partial, slides from the right — approx 80% screen width, full height from below toolbar to bottom edge. Map stays visible on the left. |
| D-04 | Content uses DiagonaalKortti components (same as /suosikit). Overlay has its own "TO DO" title to distinguish from search results (TODO-06). |
| D-05 | No backdrop — map is visible on the left without any darkening or blur. |
| D-06 | Overlay opens with scale effect from button — transform-origin at top right, scale(0) → scale(1). Closes scale(1) → scale(0). duration: 0.2, ease [0.25, 0.1, 0.25, 1]. |
| D-07 | DiagonaalKortti cards stagger in after overlay opens — opacity+y stagger, staggerChildren: 0.06. initial: { opacity: 0, y: 14 } → animate: { opacity: 1, y: 0 }. |
| D-08 | When user deletes a place, the card slot transforms INLINE to a "Kävikö paikassa? [Kyllä] [Ei]" component. No modal, no navigation. |
| D-09 | "Kyllä" → ReviewForm expands inline in the same slot. User can leave review without leaving the overlay. |
| D-10 | Review prompt shown ONLY to logged-in users (supabaseUser !== null). Non-authenticated users: deletion happens normally without prompt. |

---

## 1. Component Inventory

### 1.1 TodoButton (new — inline in Etusivu.tsx)

Fixed toolbar button that opens/closes the TO DO overlay.

| Property | Value |
|----------|-------|
| Element | `<button>` wrapped in `motion.button` |
| Position | `fixed`, `right: 16px`, `top: calc(max(12px, env(safe-area-inset-top)) + 48px)` (40px nav-pill height + 8px gap) |
| Size | 40 × 40px (matches existing toolbar buttons) |
| Shape | `rounded-full` |
| Surface | `.glass-btn` class from globals.css |
| z-index | 64 (same as existing toolbar) |
| Icon (closed) | `Bookmark` from lucide-react, 16 × 16px |
| Icon (open) | `X` from lucide-react, 16 × 16px |
| Icon color | `text-[rgba(17,17,17,0.7)]` default, `text-[#111111]` hover |
| Hover transition | `[transition:color_150ms_ease]` |
| Tap animation | `whileTap={{ scale: 0.95 }}` |
| Aria label (closed) | `"Avaa TO DO -lista"` |
| Aria label (open) | `"Sulje TO DO -lista"` |

### 1.2 TodoOverlay (new — inline in Etusivu.tsx)

Partial-screen panel sliding from the right.

| Property | Value |
|----------|-------|
| Element | `motion.div` inside `AnimatePresence` |
| Position | `fixed`, `right: 0`, `top: max(60px, env(safe-area-inset-top) + 48px)`, `bottom: 0` |
| Width | `calc(100vw - 56px)` (leaves ~56px of map visible on the left) |
| Max width | `420px` (prevents over-wide on tablet/desktop) |
| Border radius | `rounded-l-2xl` (left side only; right side is flush with screen edge) |
| Surface | `.glass` from globals.css |
| z-index | 62 (above map z-50, below toolbar z-64) |
| Padding | `p-4` (16px all sides) |
| Overflow | `overflow-y-auto` |
| Backdrop | none (D-05) |
| Box shadow | inherited from `.glass` (0 4px 20px rgba(0,0,0,0.09)) |

#### Overlay Header

| Property | Value |
|----------|-------|
| Title text | `"TO DO"` |
| Title style | `text-sm font-bold text-[#111111] uppercase tracking-widest` |
| Title margin | `mb-4` (16px below) |
| Close button | Not needed — TodoButton toggles (X icon when open) |

### 1.3 TodoCardList (new — inline container in Etusivu.tsx)

`motion.div` container with stagger animation wrapping DiagonaalKortti cards.

| Property | Value |
|----------|-------|
| Element | `motion.div` with `variants` |
| Layout | `flex flex-col gap-3` |
| Stagger | `staggerChildren: 0.06` |
| Container initial | `{ opacity: 1 }` (container itself does not animate) |

### 1.4 DiagonaalKortti (existing — reused unchanged)

Used inside the overlay exactly as defined in `app/components/DiagonaalKortti.tsx`. No visual changes.

| Property | Value |
|----------|-------|
| Height | `h-32` (128px — existing) |
| Width | fills overlay column (100% of overlay inner width) |
| Variants | `diagonaalKorttiVariants` (existing export from DiagonaalKortti.tsx) |
| Hover | `scale: 1.02`, `duration: 0.18`, `ease: 'easeOut'` (existing) |

Note: DiagonaalKortti receives `onShowMap` callback to pan the map — overlay does NOT close on map-pan.

### 1.5 KavikoPaikassaPrompt (new — inline state inside overlay)

Replaces a DiagonaalKortti slot when user deletes a place. Shown only to logged-in users (D-08, D-10).

| Property | Value |
|----------|-------|
| Element | `motion.div` |
| Height | `h-32` (128px — matches DiagonaalKortti height for no reflow) |
| Surface | `glass rounded-2xl` |
| Layout | `flex items-center justify-between px-4` |
| Animation in | `initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}`, `duration: 0.22`, `ease: [0.23, 1, 0.32, 1]` |
| Question text | `"Kävikö paikassa?"` — `text-sm font-bold text-[#111111]` |
| "Kyllä" button | `bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-4 py-2 rounded-full` |
| "Ei" button | `border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-4 py-2 rounded-full` |
| Button gap | `gap-2` |
| Button tap | `whileTap={{ scale: 0.95 }}` |

### 1.6 InlineReviewExpanded (new — inline state, replaces KavikoPaikassaPrompt)

Shown after user taps "Kyllä" in KavikoPaikassaPrompt (D-09). Uses a simplified subset of ReviewForm.

| Property | Value |
|----------|-------|
| Element | `motion.div` |
| Surface | `glass rounded-2xl` |
| Layout | `flex flex-col gap-3 p-4` |
| Animation in | `initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}`, `duration: 0.22`, `ease: [0.23, 1, 0.32, 1]` |
| Fields shown | Star rating (`StarPicker`) + optional comment textarea only (trimmed from full ReviewForm) |
| Submit button | `bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-4 py-2 rounded-full self-start` |
| Cancel link | `text-sm text-[rgba(17,17,17,0.45)] underline` — "Ohita" dismisses slot without review |
| Success state | Slot fades out after successful submit (`opacity: 0`, `duration: 0.2`) then removes from list |

### 1.7 TodoEmptyState (new — shown when todoIds is empty)

| Property | Value |
|----------|-------|
| Element | `div` |
| Layout | `flex flex-col items-center justify-center h-40 gap-3` |
| Icon | `Bookmark` from lucide-react, 32 × 32px, `text-[rgba(17,17,17,0.2)]` |
| Primary text | `"Lista on tyhjä"` — `text-sm font-bold text-[rgba(17,17,17,0.45)]` |
| Secondary text | `"Lisää paikkoja kirjanmerkkipainikkeella"` — `text-sm text-[rgba(17,17,17,0.35)]` leading-normal |

---

## 2. Typography

All text in this phase follows the project's 4-size, 2-weight constraint.

| Role | Class | Usage |
|------|-------|-------|
| Overlay title | `text-sm font-bold text-[#111111] uppercase tracking-widest` | "TO DO" header |
| Question text | `text-sm font-bold text-[#111111]` | "Kävikö paikassa?" |
| Button labels | `text-sm font-bold` | "Kyllä", "Ei", "Ohita", "Jätä arvostelu" |
| Micro / label cap | `text-[10px] font-bold text-[#111111] uppercase tracking-widest` | Form field labels in InlineReviewExpanded |
| Empty state primary | `text-sm font-bold text-[rgba(17,17,17,0.45)]` | "Lista on tyhjä" |
| Empty state secondary | `text-sm text-[rgba(17,17,17,0.35)]` | Instruction text |
| DiagonaalKortti text | unchanged — see DiagonaalKortti.tsx | Card venue name, price, status |

Weights used: 400 (normal) and 700 (bold). No 600 (semibold). No new font sizes beyond the 4 established sizes.

Line heights: `leading-snug` on card titles (existing in DiagonaalKortti), `leading-normal` on empty state secondary text.

---

## 3. Color and Surface

| Surface | Value | Class / Rule |
|---------|-------|--------------|
| Overlay panel background | `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.60) 50%, rgba(240,240,245,0.80) 100%)` | `.glass` |
| TodoButton surface | `linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 100%)` | `.glass-btn` |
| KavikoPaikassaPrompt surface | same as overlay (`.glass`) | `.glass rounded-2xl` |
| InlineReviewExpanded surface | same as overlay (`.glass`) | `.glass rounded-2xl` |
| Overlay border (left side) | `rgba(255,255,255,0.9)` | from `.glass` border definition |
| Primary CTA ("Kyllä", submit) | `#111111` bg, white text | `bg-[#111111] text-white` |
| Primary CTA hover | `#333333` | `hover:bg-[#333333]` |
| Secondary CTA ("Ei") | transparent bg, `rgba(0,0,0,0.12)` border | `border border-[rgba(0,0,0,0.12)]` |
| Secondary CTA text | `#111111` | `text-[#111111]` |
| Icon default | `rgba(17,17,17,0.7)` | `text-[rgba(17,17,17,0.7)]` |
| Icon hover / active | `#111111` | `text-[#111111]` |
| Empty state icon | `rgba(17,17,17,0.2)` | `text-[rgba(17,17,17,0.2)]` |
| Empty state primary text | `rgba(17,17,17,0.45)` | `text-[rgba(17,17,17,0.45)]` |
| Empty state secondary text | `rgba(17,17,17,0.35)` | `text-[rgba(17,17,17,0.35)]` |
| Cancel / dismiss link | `rgba(17,17,17,0.45)` | `text-[rgba(17,17,17,0.45)]` |
| Destructive (delete action) | No destructive color in this overlay — deletion triggers inline prompt, no red UI | — |

No new colors introduced. All values are from the established glassmorphism palette.

---

## 4. Spacing and Layout

### 8-point scale used in this phase

| Token | px | Used for |
|-------|-----|---------|
| 2 | 8px | Gap between KavikoPaikassa buttons |
| 3 | 12px | Gap between overlay header and card list |
| 4 | 16px | Overlay padding (p-4), overlay header margin-bottom (mb-4) |
| 3 gap | 12px | Gap between DiagonaalKortti cards (gap-3) |
| 10 | 40px | TodoButton size (w-10 h-10) |

### TodoButton positioning

```
top: calc(max(12px, env(safe-area-inset-top)) + 48px)
  └─ 12px  — existing toolbar top
  └─ 40px  — nav-pill height
  └─ 8px   — gap between nav-pill and TodoButton
right: 16px
```

### Overlay dimensions

```
width:      calc(100vw - 56px)   // 56px map peek on left
max-width:  420px                // tablet/desktop cap
top:        max(60px, env(safe-area-inset-top) + 48px)
bottom:     0
right:      0
padding:    16px (all sides)
```

### KavikoPaikassaPrompt slot

```
height: 128px  (h-32 — matches DiagonaalKortti)
padding: 16px horizontal (px-4)
layout: flex row, items-center, justify-between
button gap: 8px (gap-2)
```

### InlineReviewExpanded slot

```
padding: 16px (p-4)
inner gap: 12px (gap-3)
textarea: w-full, 3 rows
```

---

## 5. Animation and Motion

All animations follow CLAUDE.md Emil Kowalski principles: fast, purposeful, physically grounded.

### 5.1 TodoOverlay open/close (D-06)

```tsx
// AnimatePresence wraps the overlay
<AnimatePresence>
  {todoOpen && (
    <motion.div
      key="todo-overlay"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ transformOrigin: 'top right' }}
    >
      {/* overlay content */}
    </motion.div>
  )}
</AnimatePresence>
```

| Property | Value |
|----------|-------|
| Duration | 0.2s |
| Ease | `[0.25, 0.1, 0.25, 1]` |
| Transform origin | `top right` (anchors scale to button position) |
| Properties animated | `scale` + `opacity` |
| Spring physics | none |

### 5.2 DiagonaalKortti card stagger (D-07)

```tsx
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

// Use existing diagonaalKorttiVariants from DiagonaalKortti.tsx:
// hidden: { opacity: 0, y: 14 }
// show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }
```

Cards use `variants="diagonaalKorttiVariants"` with `initial="hidden"` and `animate="show"` — the container's stagger propagates to children automatically.

Stagger fires after overlay open animation completes — handled by `AnimatePresence` sequencing (overlay scale completes at ~200ms, stagger begins immediately after).

| Property | Value |
|----------|-------|
| staggerChildren | 0.06 (within ≤ 0.08s limit) |
| Child initial | `{ opacity: 0, y: 14 }` |
| Child animate | `{ opacity: 1, y: 0 }` |
| Child duration | 0.22s |
| Child ease | `[0.23, 1, 0.32, 1]` |

### 5.3 KavikoPaikassaPrompt enter

```tsx
initial={{ opacity: 0, y: 14 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
```

Replaces the deleted DiagonaalKortti slot with no height jump — both elements are `h-32`.

### 5.4 InlineReviewExpanded enter

```tsx
initial={{ opacity: 0, y: 14 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
```

Height is not constrained to 128px — grows to accommodate form fields. Use opacity+y only; do not animate height.

### 5.5 TodoButton icon swap

```tsx
// Wrap icon in AnimatePresence for crossfade
<AnimatePresence mode="wait">
  {todoOpen
    ? <motion.span key="x" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}><X /></motion.span>
    : <motion.span key="bm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}><Bookmark /></motion.span>
  }
</AnimatePresence>
```

| Property | Value |
|----------|-------|
| Duration | 0.12s |
| Mode | `"wait"` (old icon exits before new enters) |

### 5.6 TodoButton tap

```tsx
whileTap={{ scale: 0.95 }}
```

No hover scale — consistent with filter button rule in CLAUDE.md.

### 5.7 Rules respected

- No `spring` physics (no direct drag/cursor tracking in this feature)
- No `layout` animations (h-32 fixed height prevents reflow)
- `AnimatePresence` keys: `"todo-overlay"`, `"x"` / `"bm"` — all stable
- No `height: auto` animation — InlineReviewExpanded grows by opacity+y only

---

## 6. Copywriting (Finnish)

All user-facing strings for this phase.

### Overlay

| Element | String |
|---------|--------|
| Overlay title | `TO DO` |
| TodoButton aria-label (closed) | `Avaa TO DO -lista` |
| TodoButton aria-label (open) | `Sulje TO DO -lista` |

### Empty state

| Element | String |
|---------|--------|
| Primary | `Lista on tyhjä` |
| Secondary | `Lisää paikkoja kirjanmerkkipainikkeella` |

### Delete review prompt (KavikoPaikassaPrompt — logged-in users only)

| Element | String |
|---------|--------|
| Question | `Kävikö paikassa?` |
| Confirm button | `Kyllä` |
| Decline button | `Ei` |

### InlineReviewExpanded

| Element | String |
|---------|--------|
| Form field label — rating | `TÄHTIARVOSANA` |
| Form field label — comment | `KOMMENTTI` |
| Submit button | `Jätä arvostelu` |
| Submitting state | `Tallennetaan…` |
| Cancel / skip link | `Ohita` |
| Success message | `Arvostelu tallennettu` |
| Error message | `Tallennus epäonnistui. Yritä uudelleen.` |

### Destructive confirmation

No separate destructive confirmation dialog. Deletion is immediate; the KavikoPaikassaPrompt is the post-deletion UX (not a pre-deletion gate).

---

## 7. Registry

Tool: none (no shadcn). No third-party component registries used. All components are project-native or from lucide-react (already installed).

New lucide-react icons required for this phase:

- `Bookmark` — TodoButton closed state (already imported in Etusivu.tsx)
- `X` — TodoButton open state (already imported in Etusivu.tsx)

No new icon library additions needed.

---

## 8. Implementation Notes

### Tailwind class references

```tsx
// TodoButton
className="w-10 h-10 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
style={{ position: 'fixed', right: 16, top: 'calc(max(12px, env(safe-area-inset-top)) + 48px)', zIndex: 64 }}

// TodoOverlay
className="fixed right-0 bottom-0 glass rounded-l-2xl overflow-y-auto p-4"
style={{ top: 'max(60px, env(safe-area-inset-top) + 48px)', width: 'calc(100vw - 56px)', maxWidth: 420, zIndex: 62 }}

// Overlay header
className="text-sm font-bold text-[#111111] uppercase tracking-widest mb-4"

// Card list container (motion.div with stagger variants)
className="flex flex-col gap-3"

// KavikoPaikassaPrompt
className="glass rounded-2xl h-32 flex items-center justify-between px-4"

// KavikoPaikassa "Kyllä" button
className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-4 py-2 rounded-full [transition:background-color_150ms_var(--ease-out)]"

// KavikoPaikassa "Ei" button
className="border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-4 py-2 rounded-full [transition:background-color_150ms_var(--ease-out)]"

// InlineReviewExpanded
className="glass rounded-2xl flex flex-col gap-3 p-4"

// Empty state wrapper
className="flex flex-col items-center justify-center h-40 gap-3"

// Empty state icon
className="w-8 h-8 text-[rgba(17,17,17,0.2)]"  // Bookmark icon

// Empty state primary
className="text-sm font-bold text-[rgba(17,17,17,0.45)]"

// Empty state secondary
className="text-sm text-[rgba(17,17,17,0.35)] text-center leading-normal"
```

### State management (existing in Etusivu.tsx)

- `todoIds: Set<number>` — existing; filter `paikat` by this set for overlay content
- `toggleTodo(id)` — existing; call for deletion (removes from todoIds)
- `supabaseUser` — existing; gate KavikoPaikassaPrompt on `supabaseUser !== null`
- New state: `todoOpen: boolean` — controls overlay visibility
- New state: `pendingReviewPaikkaId: number | null` — tracks which deleted slot is in KavikoPaikassa/InlineReview state

### Blast-radius note

Only `app/components/Etusivu.tsx` changes. The href="/suosikit" inside the nav-pill expanded menu (line ~912) is converted to an `onClick` that sets `todoOpen = true` and closes the nav-pill. The `/suosikit` route itself (`app/suosikit/page.tsx`) is untouched.

### z-index stack in this phase

| Layer | z-index |
|-------|---------|
| Map (Google Maps) | 0–10 |
| Map toolbar controls | 50 |
| Todo overlay | 62 |
| Toolbar (nav-pill, TodoButton) | 64 |

### DiagonaalKortti width in overlay

The overlay inner width is `calc(100vw - 56px - 32px)` after `p-4` padding (32px = 16px × 2). DiagonaalKortti fills this width naturally with `w-full` (no max-width needed — the overlay max-width cap handles desktop).

### InlineReviewExpanded — simplified vs full ReviewForm

Use a stripped version of ReviewForm: star rating + optional comment textarea only. Omit: visit date picker, crowd rating buttons, anonymous toggle. These are secondary fields that add visual weight inappropriate for the overlay context. The full form remains available on the profile page (`/paikat/[id]`).

---

## 9. Requirements Cross-Reference

| REQ-ID | What this spec covers |
|--------|-----------------------|
| TODO-03 | Section 1.2 (TodoOverlay), Section 5.1 (scale animation), Section 8 (Etusivu blast-radius) |
| TODO-04 | Section 1.1 (TodoButton), Section 4 (positioning), Section 8 (z-index) |
| TODO-05 | Section 5.1 (overlay scale), Section 5.2 (card stagger), Section 5.5 (icon swap) |
| TODO-06 | Section 1.2 (overlay title "TO DO"), Section 3 (glass surface distinct from list view) |
| TODO-07 | Section 1.5 (KavikoPaikassaPrompt), Section 1.6 (InlineReviewExpanded), Section 5.3–5.4 (animations), Section 6 (Finnish strings) |
