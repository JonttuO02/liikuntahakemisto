# Phase 29: Kortit & sheet redesign — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 29-Kortit & sheet redesign
**Areas discussed:** Hero section layout, Price carousel content, DiagonaalKortti placeholders, Review widget collapse

---

## Hero section layout

### Drag handle + controls placement

| Option | Description | Selected |
|--------|-------------|----------|
| Floating over hero image | Drag handle at top, close/bookmark as floating chips over the image | ✓ |
| Keep header row below image | Current badge+buttons row stays, image is new | |
| You decide | Claude picks | |

**User's choice:** Floating over the hero image

---

### Venue name + address position

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom of image, dark gradient overlay | Name/address at bottom of hero with gradient | ✓ |
| Below the image, outside hero | Text below image as regular content | |
| Centered on image, glass pill | Name centered on image in a glass pill | |

**User's choice:** Bottom of image, dark gradient overlay

---

### Hero size and slide count

| Option | Description | Selected |
|--------|-------------|----------|
| 220px tall, 3 slides + dots | Standard height, 3 placeholders | |
| 180px tall, 1 slide | Compact, single placeholder | |
| 220px tall, 1 slide | Hero height, no multi-slide | |
| Regular photo size (user free text) | 16:9 aspect ratio (wider than tall) | ✓ |

**User's choice:** "the size should be a regular photo size (more wide than height)" → interpreted as 16:9 aspect ratio

---

### Slide count

| Option | Description | Selected |
|--------|-------------|----------|
| 3 slides + dot indicators | 3 gray+camera placeholders, dot navigation | ✓ |
| 1 slide, no dots | Single placeholder | |

**User's choice:** 3 slides + dot indicators

---

### Sport badge

| Option | Description | Selected |
|--------|-------------|----------|
| Move to image overlay top-left | Badge floats over hero | |
| Remove from sheet entirely | Badge not shown anywhere in sheet | ✓ |
| Keep below hero | Badge stays in content area | |

**User's choice:** Remove it from the sheet entirely

---

## Price carousel content

### Slide content

| Option | Description | Selected |
|--------|-------------|----------|
| Each newline in hinta_kuvaus is one slide | Split on \n, each line = one marquee item | ✓ |
| hinta_kuvaus + hinta_min/max as separate slides | Two slide types | |
| Just horizontal scroll of price block | Minimal change | |

**User's choice:** Each newline in hinta_kuvaus is one slide

---

### Scroll behavior

| Option | Description | Selected |
|--------|-------------|----------|
| User-dragged (overflow-x scroll, snap) | User swipes to see more | |
| Auto-scrolling (marquee-style, continuous) | Pills scroll automatically | ✓ |
| Auto-scroll + pauses on hover/tap | Auto with pause | |

**User's choice:** Auto-scrolling (marquee-style, continuous)

---

### Pill visual style

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text, no pill border | Text scrolling with separator | ✓ |
| Small glass pill per price line | Rounded glass chip per item | |
| You decide | Claude picks | |

**User's choice:** Plain text, no pill border

---

### Single-line / no-data behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Single line, still scrolls (loops) | Marquee even with 1 item | |
| Static text, no animation | Only animate when 2+ lines | ✓ |
| Hide carousel row for single-line | Row disappears for single-line | |

**User's choice:** Static text, no animation

---

## DiagonaalKortti placeholders

### Logo placeholder position

| Option | Description | Selected |
|--------|-------------|----------|
| Top-left, replaces sport pill | Logo takes pill spot | |
| Top-left, above sport pill | Logo above pill | |
| Top-left, pill below logo | Logo top, pill below | |
| Top left, sport pill on its right side (user free text) | Logo and pill side-by-side in top row | ✓ |

**User's choice:** "Top left, sport pill on its right side" → logo box left, sport pill right in same row

---

### Logo placeholder size

| Option | Description | Selected |
|--------|-------------|----------|
| 32×32px, rounded corners | Small square | |
| 40×40px, rounded corners | Slightly larger | ✓ |
| Same height as sport pill row | Flush with pill | |

**User's choice:** 40×40px, rounded corners

---

### Right panel replacement

| Option | Description | Selected |
|--------|-------------|----------|
| Gray placeholder + camera icon | Same style as sheet hero | ✓ |
| Gray placeholder, no icon | Flat gray only | |
| Keep sport-color bg, remove icon | Sport accent color stays | |

**User's choice:** Gray placeholder box + camera icon (same as sheet hero placeholder)

---

## Review widget collapse

### Collapsed state appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Star average + count + chevron | "★ 4.2 (12 arvostelua) >" | ✓ |
| First review preview | Truncated first review | |
| Just count button | Count only | |

**User's choice:** Star average + count + chevron arrow button

---

### Zero reviews state

| Option | Description | Selected |
|--------|-------------|----------|
| "☆ Kirjoita ensimmäinen arvostelu >" | Encourages first review | |
| "★ Ei arvosteluja" (static, no chevron) | Informational, no tap | ✓ |
| Hide section entirely | No widget when 0 reviews | |

**User's choice:** "★ Ei arvosteluja" (static, no chevron)

---

### Expand animation

| Option | Description | Selected |
|--------|-------------|----------|
| AnimatePresence height animation | Opacity + height:auto | ✓ |
| Simple toggle, no animation | Instant show/hide | |
| You decide | Claude picks | |

**User's choice:** AnimatePresence height animation (opacity + height: auto)

---

## Claude's Discretion

None — all areas had clear user selections.

## Deferred Ideas

- Real images in hero carousel and DiagonaalKortti right panel
- Logo API (real company logos via website_domain)
- Auto-advance hero carousel
