# Phase 17: Toolbar & Haku-UX — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 17-Toolbar & Haku-UX
**Areas discussed:** List toggle — what it shows, Map filter fate, Button placement

---

## List Toggle — What It Shows

### Q1: When the user taps the dedicated list button, what appears?

| Option | Description | Selected |
|--------|-------------|----------|
| All venues — no search (Recommended) | A scrollable card list of all venues, no search input. Browse mode. | |
| Same search overlay, no input focus | Opens the existing search overlay without auto-focusing the search input. | ✓ |
| Full-screen card list replaces map | Map slides away, full-screen venue list takes over. | |

**User's choice:** Same search overlay, no input focus
**Notes:** Reuses the existing `searchOpen` overlay — simplest implementation.

---

### Q2: In list mode (opened via the list button), is the search input bar visible?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, visible but not focused (Recommended) | Search bar always part of overlay, not highlighted when opened via list button. | ✓ |
| Hidden — only shown when search button used | List mode hides search input entirely, only filter pills and card list visible. | |

**User's choice:** Yes, visible but not focused
**Notes:** Simplest — no conditional rendering of the input.

---

### Q3: If the overlay is already open, tapping the list button again should…

| Option | Description | Selected |
|--------|-------------|----------|
| Close the overlay (true toggle) | Both buttons toggle open/close consistently. | ✓ |
| Do nothing / stay open | Only X button closes. | |

**User's choice:** Close the overlay (true toggle)

---

## Map Filter Fate

### Q1: What happens to the map pin filter (aktiivinen) after SlidersHorizontal is removed?

| Option | Description | Selected |
|--------|-------------|----------|
| Merge — one filter drives both map and list (Recommended) | searchLaji also updates which pins appear on map. One state, no split. | ✓ |
| Keep aktiivinen — fold it into the unified overlay | Two separate filter concepts still exist, both inside the unified panel. | |
| Remove map filter — always show all pins | aktiivinen removed entirely. All pins always show. | |

**User's choice:** Merge — one filter drives both map and list

---

### Q2: When the search overlay is closed and a sport filter is active, the map should…

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the filter active — pins stay filtered (Recommended) | Filter persists after closing. Map shows only selected sport's pins. | ✓ |
| Reset to 'Kaikki' on close | Closing resets sport filter. Map returns to all pins. | |

**User's choice:** Keep the filter active — pins stay filtered

---

## Button Placement

### Q1: Where do the two new buttons sit?

| Option | Description | Selected |
|--------|-------------|----------|
| Both in the left toolbar (Recommended) | Left toolbar: [search+filter] [list toggle] in one glass pill. Right toolbar stays. | ✓ |
| Split — search+filter left, list toggle right | Unified button left, list toggle added to right toolbar area. | |
| New bottom-edge toolbar (above sheet handle) | Floating row above bottom sheet handle. | |

**User's choice:** Both in the left toolbar

---

### Q2: Should the toolbar still expand (old leftOpen behavior)?

| Option | Description | Selected |
|--------|-------------|----------|
| No expansion — just two icon buttons in the pill (Recommended) | Clean pill, two icons. Filter-active indicator dot on search icon. | ✓ |
| Keep expansion — show active filter + count | Pill still expands to show active filter and result count. | |

**User's choice:** No expansion — just two icon buttons in the pill

---

### Q3: What icons should represent the two buttons?

| Option | Description | Selected |
|--------|-------------|----------|
| Search+filter: Search icon | List: List icon (Recommended) | Search (already imported) + LayoutList/List from lucide-react. | ✓ |
| Search+filter: SlidersHorizontal + Search combined | List: List | Funnel + magnifying glass side by side. More explicit but busier. | |

**User's choice:** Search icon for unified button, List icon for list toggle

---

## Claude's Discretion

- Exact lucide-react icon for list toggle (`LayoutList` vs `List`)
- Active state styling when overlay is open (full `#111111` icon vs dot indicator)
- Filter-active indicator design (dot, badge, or color-only)
- Whether to rename `searchLaji` to `aktiviinenLaji`

## Deferred Ideas

None — discussion stayed within phase scope.
