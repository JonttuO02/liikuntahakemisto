# Phase 20: Navigaatio-korjaukset - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 20-navigaatio-korjaukset
**Areas discussed:** Scroll restoration (NAV-01), Auto-open timing (NAV-03)

---

## Scroll restoration (NAV-01)

### Q1: Implementation approach

| Option | Description | Selected |
|--------|-------------|----------|
| sessionStorage | Save full search state before navigation, restore on Etusivu mount. Works even for direct URL access. | ✓ |
| router.back() | Client component calls router.back(). Browser handles scroll. Fails if user opened /paikat/ID directly. | |
| Restore state only (no scroll) | Reopen search overlay with same filters but scroll to top. | |

**User's choice:** sessionStorage (Recommended)

---

### Q2: What to restore

| Option | Description | Selected |
|--------|-------------|----------|
| Full state | scrollTop + all filters (haku, laji, kertakaynti, aukinyt, kaupunki) + searchOpen=true | ✓ |
| Scroll + open only | scrollTop + searchOpen=true; filters reset to defaults | |

**User's choice:** Full state (Recommended)

---

### Q3: When to save state

| Option | Description | Selected |
|--------|-------------|----------|
| onClick on DiagonaalKortti link | Save on click handler before navigation. Clean and explicit. | ✓ |
| beforeunload event | Listen to window beforeunload in Etusivu. Catches all navigations but side-effect approach. | |

**User's choice:** onClick on DiagonaalKortti link (Recommended)

---

## Auto-open timing (NAV-03)

### Q1: When should animation start

| Option | Description | Selected |
|--------|-------------|----------|
| Next tick (0ms delay) | Initialize to 'closed', useEffect [] sets to 'open' immediately. Spring animation plays. | ✓ |
| Short delay (200–400ms) | setTimeout gives map a moment to load. More intentional but adds pause. | |
| You decide | Implementer picks timing. | |

**User's choice:** Next tick (0ms delay) (Recommended)

---

### Q2: focusId guard (NAV-02 + NAV-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Guard in auto-open effect | `if (!focusId) setSheetPhase('open')` — two separate effects, clean and predictable. | ✓ |
| Merge into one effect | Combine auto-open and focusId logic. Fewer effects but harder to read. | |

**User's choice:** Guard in the auto-open effect (Recommended)

---

## Claude's Discretion

- Exact sessionStorage JSON structure
- scrollTop container ref strategy
- Auto-open effect ordering relative to other effects (React guarantees mount order)

## Deferred Ideas

- Hakunapin lisääminen /suosikit ja /profiili -sivujen left-toolbariin — vaatisi layout-tason refaktoroinnin
- window.scrollY-tason scroll-palauttaminen (jos lista muuttuu page-level scrolliksi)
