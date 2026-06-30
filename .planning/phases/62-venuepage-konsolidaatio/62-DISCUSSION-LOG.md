# Phase 62: Venuepage-konsolidaatio - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 62-venuepage-konsolidaatio
**Areas discussed:** "Näytä kartalla" link fate, Card-to-sheet wiring scope

---

## "Näytä kartalla" link fate

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it | PaikkaSheet sits on top of the map — user closes sheet to see map. /?id=X still works from other surfaces. | |
| Add to PaikkaSheet | Add "Näytä kartalla" action inside PaikkaSheet navigating to /?id=X | ✓ |

**User's choice:** Add to PaikkaSheet

| Placement option | Description | Selected |
|-----------------|-------------|----------|
| Inside the sheet content (as a row) | SheetRow with map icon, between Description and Reviews | ✓ |
| In the hero overlay (top area) | Small icon in top-right alongside close + bookmark buttons | |
| You decide | Leave placement to planning | |

**User's choice:** Inside the sheet content (as a SheetRow)

| Condition option | Description | Selected |
|----------------|-------------|----------|
| Only when venue has coordinates | Guard: paikka.latitude != null && paikka.longitude != null | ✓ |
| Always show it | Show even without coordinates | |

**User's choice:** Only when venue has coordinates

**Notes:** Mirrors the exact condition used on the old venue page.

---

## Card-to-sheet wiring scope

| Option | Description | Selected |
|--------|-------------|----------|
| Make clicks no-op in preview contexts | DiagonaalKortti: if no onOpen callback, overlay link becomes non-navigating. Phase 63 redesigns PreviewModal (PREV-04). | ✓ |
| Phase 62 doesn't touch preview contexts | Only fix Etusivu's DiagonaalKortti; leave PreviewModal/admin/LivePreviewPane with broken /paikat links until Phase 63. | |

**User's choice:** Make clicks no-op in preview contexts

| PaikkaKortti option | Description | Selected |
|--------------------|-------------|----------|
| Same no-op treatment for PaikkaKortti | Consistent with DiagonaalKortti — both get onOpen prop | |
| Leave PaikkaKortti as-is | Phase 63 removes PaikkaKortti from PreviewModal (PREV-04). Broken link acceptable temporarily. | ✓ |

**User's choice:** Leave PaikkaKortti as-is — Phase 63 handles it

**Notes:** Phase 62 only touches DiagonaalKortti for the no-op behavior. PaikkaKortti's /paikat links remain broken temporarily in the business-side PreviewModal until Phase 63 removes PaikkaKortti entirely.

---
