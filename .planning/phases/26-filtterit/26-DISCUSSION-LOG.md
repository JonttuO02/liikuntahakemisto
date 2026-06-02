# Phase 26: Filtterit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 26-filtterit
**Areas discussed:** Carousel chip visual, Dead state removal, SessionStorage migration

---

## Carousel chip visual

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the pill button | Search button expands — dot becomes cycling text chip | ✓ |
| Separate chip below toolbar | New fixed element below toolbar | |
| You decide | Claude picks | |

**User's choice:** Inside the search pill (pill button itself)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Active filter labels only | Cycles only non-default values (skips 'Kaikki') | |
| Count + first active | Shows '2 filtteriä' then first value | |
| All values sequentially | Always shows laji + kaupunki even if 'Kaikki' | |

**User's clarification (free text):** "Molemmille filttereille (kaupunki ja laji) tulee omat pill, niissä näkyy vuorotellen kaikki siitä kyseisestä filtteristä aktiivisena olevat vaihtoehdot. Ei lukumäärää tai tekstiä 'Kaikki'. Eli jos mitään rajausta ei ole tehty, niin vuorotellen näytetään kaikki vaihtoehdot."
**Notes:** Each filter gets its own pill. When no filter set: cycles all available options (ambient). When filtered: shows selected value(s).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Search-overlayssä | Filter row inside search overlay | ✓ |
| Toolbar-pillissä | Inside the toolbar pill button | |

**User's choice:** Search-overlayssä (filter row, not toolbar)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tap stops carousel + locks value | Tap locks current value; 2nd tap resets | |
| Carousel is ambient, tap opens list below | Carousel shows options; tap opens list; list closes after selection | ✓ |

**User's clarification:** "Karuselli on ambient, valinta tapahtuu muualla — karuselli näyttää mitä on tarjolla, mutta filtteri asetetaan jollain muulla tavalla (esim. napauttamalla karusellin alle avautuva lista)"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pill expands list below | Tap opens chip/row list below pill; supports multi-select; list closes after selection | ✓ |
| Mini sheet | Short bottom sheet panel | |
| You decide | | |

**User's clarification:** "Pillin alle laajenee lista... Mutta voidaan myös valita useita, ja silloin karuselli näyttää vuorotellen valitut"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Vain lajille | Multi-select for laji only; kaupunki stays single-select | ✓ |
| Molemmille | Both laji and kaupunki multi-select | |
| Ei kummallekaan | Single-select retained | |

**User's choice:** Multi-select vain lajille

---

| Option | Description | Selected |
|--------|-------------|----------|
| Opacity crossfade | AnimatePresence opacity, duration 0.2s | ✓ |
| Slide horisontaalisti | Text slides in from right/left | |
| You decide | | |

**User's choice:** Opacity crossfade

---

| Option | Description | Selected |
|--------|-------------|----------|
| 2 sekuntia | Same as CalloutCard (Phase 24) | ✓ |
| 3 sekuntia | Slower pace | |
| You decide | | |

**User's choice:** 2 sekuntia

---

## Dead state removal

| Option | Description | Selected |
|--------|-------------|----------|
| Poista kokonaan | Remove state vars, setters, filter logic, sessionStorage refs entirely | ✓ |
| Pidä piilossa | Keep state but hide UI buttons | |

**User's choice:** Poista kokonaan

---

| Option | Description | Selected |
|--------|-------------|----------|
| Refaktoroi kokonaan string[] | searchLaji: string[], filter/isFilterActive/sessionStorage updated | ✓ |
| Pidä searchLaji string:nä | Separate selectedLajit: Set<string> | |

**User's choice:** Kyllä, refaktoroi kokonaan

---

## SessionStorage migration

| Option | Description | Selected |
|--------|-------------|----------|
| Konvertoi automaattisesti ['padel'] | If s.searchLaji is string !== 'Kaikki', convert to [value] | |
| Nollaa vanhat sessiot | If _v !== 2, ignore all filter states | ✓ |

**User's choice:** Aktiivisesti nollaa (clear entire key if _v !== 2)
**Notes:** Old string searchLaji won't be restored since the whole key is cleared on _v mismatch.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Ohita hiljaisesti | Don't read removed fields at all | |
| Aktiivisesti nollaa | Check _v < 2 → remove entire session key | ✓ |

**User's choice:** Aktiivisesti nollaa

---

## Claude's Discretion

- Karusellin tarkat CSS-dimensiot
- Valintalistauksen tarkka tyyli (chip-grid vs. pystysuora lista)
- Kaupunki-pill käyttäytyminen jos kaupunkeja alle 3
- Valintalistauksen avautumis-/sulkeutumisanimaatio

## Deferred Ideas

- None — discussion stayed within phase scope
