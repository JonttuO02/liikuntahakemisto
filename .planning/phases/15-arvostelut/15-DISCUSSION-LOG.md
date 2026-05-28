# Phase 15: Arvostelut - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 15-arvostelut
**Areas discussed:** ReviewForm placement, Star rating UI, Review list display, Date picker & crowd rating

---

## ReviewForm Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New .glass card below existing card | Separate section below info card — clear visual separation | ✓ |
| Inside the existing .glass card | Reviews appended to same card as hours/price/phone | |
| Full-width section with its own heading | Distinct section, not a .glass card | |

**User's choice:** New .glass card below the existing info card

| Option | Description | Selected |
|--------|-------------|----------|
| Show locked form with 'Kirjaudu arvostellaksesi' CTA | Form visible but locked, login button shown | ✓ |
| Show only reviews list; hide form completely | Form hidden from logged-out users | |
| Replace form with an inline login prompt card | Small .glass card with auth CTA | |

**User's choice:** Locked form with CTA for logged-out users

| Option | Description | Selected |
|--------|-------------|----------|
| Show existing review with Edit button | User can update their review | ✓ |
| Show 'You've reviewed this place' message, no editing | Review locked after submission | |
| Hide the form entirely once reviewed | Form disappears after review | |

**User's choice:** Show existing review with an Edit button — reviews are editable

---

## Star Rating UI

| Option | Description | Selected |
|--------|-------------|----------|
| 5 clickable star icons, fill on click/hover | Classic pattern, works on mobile | ✓ |
| 5 large number buttons (1 2 3 4 5) | Simpler, very clear on mobile | |
| Horizontal slider 1–5 | Drag to select, may feel imprecise | |

**User's choice:** 5 clickable star icons with fill on click/hover

| Option | Description | Selected |
|--------|-------------|----------|
| Stars + numeric average + review count | e.g. ★★★★☆ 4.2 (17 arvostelua) | ✓ |
| Filled stars only (rounded to nearest whole) | Visual only, no number | |
| Numeric only (no star icons) | e.g. '4.2 / 5' | |

**User's choice:** Stars + numeric average + review count

---

## Review List Display

| Option | Description | Selected |
|--------|-------------|----------|
| Newest first (created_at DESC) | Most recent reviews at top | ✓ |
| Highest rated first | Best reviews surface first | |
| User's own review pinned first, rest newest | Own review always visible at top | |

**User's choice:** Newest first

| Option | Description | Selected |
|--------|-------------|----------|
| Show all reviews (no limit) | All reviews on load | |
| Show first 5, 'Näytä kaikki' button | Keeps page manageable | ✓ |
| Show first 3, load more on scroll | Infinite scroll pattern | |

**User's choice:** Show first 5, "Näytä kaikki" button

| Option | Description | Selected |
|--------|-------------|----------|
| Stars + name/Anonyymi + visit date + crowd rating + text | Full info per card | |
| Stars + name/Anonyymi + text only | Minimal card | ✓ |
| Stars + text only | Absolute minimum | |

**User's choice:** Stars + name/Anonyymi + text only (date and crowd captured in DB but not displayed)

---

## Date Picker & Crowd Rating

| Option | Description | Selected |
|--------|-------------|----------|
| Native <input type="date"> | Browser-native, zero dependencies | |
| Custom date picker component | More polished | ✓ |
| Text input (YYYY-MM-DD placeholder) | Simplest, poor mobile UX | |

**User's choice:** Custom date picker — researcher picks best fit for Next.js 14 + Tailwind v3

| Option | Description | Selected |
|--------|-------------|----------|
| 3 pill/chip buttons (toggle style) | Matches existing filter pill pattern | ✓ |
| Dropdown/select | Compact but less visual | |
| Radio buttons with labels | Classic form, less polished | |

**User's choice:** 3 pill/chip toggle buttons: "Hiljaista" / "Sopivasti" / "Ruuhkaista"

| Option | Description | Selected |
|--------|-------------|----------|
| Researcher picks best fit | Lightest option for Next.js 14 + Tailwind v3 | ✓ |
| react-day-picker | Popular, headless, works with Tailwind | |
| Keep native after all | Native <input type=date> | |

**User's choice:** Researcher picks best fit

---

## Claude's Discretion

- Supabase migration column names and exact schema
- RLS policies wording
- Component file split (ReviewForm / ReviewList / StarPicker as separate or combined)
- Error state messages when DB write fails
- Empty state when venue has no reviews yet

## Deferred Ideas

- Sorting by highest rated (newest-first only in v1.2)
- Displaying visit date and crowd rating per review card (captured but not shown)
- Infinite scroll pagination
- Review moderation / reporting
- "Verified visit" badge (out of scope per REQUIREMENTS.md)
