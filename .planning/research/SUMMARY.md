# Research Summary — v3.0 "Oma tietokanta (Google Places -irtautuminen)"

**Project:** Liikuntahakemisto — local sports venue directory with business self-service onboarding  
**Milestone:** v3.0 — Decommission Google Places, implement manual venue entry + AI category classification  
**Researched:** 2026-06-22  
**Confidence:** MEDIUM-HIGH (grounded in codebase, minor ToS/cost validation gaps)

---

## Executive Summary

v3.0 represents a data-model shift: from syncing venue data via Google Places to having businesses manually enter their own venues. Five interrelated initiatives: (1) remove Google Places sync route/data, (2) implement map-pin + Places Autocomplete location picker, (3) rework claim/create to create-only with company/branch naming, (4) add AI sport-category classification to Claude call, (5) fix dashboard redirect bug.

**Recommended approach:** Avoid new npm dependencies (all stack elements exist), prioritize data integrity (explicit row provenance checks before deletion), keep onboarding scope focused (single map component, additive Claude prompt).

**Central risk:** Cascade deletion through 5 FK relationships if business_managed=false used naively. Every cleanup decision must cross-reference business_paikka_links.link_type to distinguish unclaimed Google rows from business-claimed rows that still carry Google-origin data.

**Success requires:** Strict phase sequencing: (1) redirect fix + cleanup decommission (early, independent), (2) Sijainti location step, (3) Claude extension, (4) claim/create rework + backfill, (5) integration testing. Each layer touched (migrations, routes, components, prompt), making isolation critical.

---

## Key Findings Summary

### Stack: No New Packages

- @vis.gl/react-google-maps (already installed) — add 'places' to existing APIProvider
- google.maps.places.AutocompleteSuggestion (runtime-loaded) — modern replacement for deprecated Autocomplete
- google.maps.Geocoder (Maps JS API core) — already available via APIProvider
- @anthropic-ai/sdk (already installed) — extend single Claude call with sport-category field (additive)

### Features: Three Layers Ship Together

Must have: Location picker + venue name + no forced redirect  
Should have: Company/branch naming pattern + per-venue badge + reverse-geocode auto-fill  
Defer: Ketjuadmin, duplicate detection, auto-splitting

### Architecture: Reuse Existing Patterns

Page-level pre-phases, thin onboarding_draft staging table, UNIQUE(paikka_id) constraint handling. Migration order critical: redirect fix → sijainti column → Sijainti code → claim/create rework → testing.

### Pitfalls: Top 5 of 9

1. Cascade deletion via naive business_managed filter — query link_type first
2. Sync removal removes hours freshness — decide unclaimed venue fate before deletion
3. Double Maps JS API load — verify /business/onboarding inside provider tree
4. Session tokens per keystroke — multiplies billing 10-100x, use useRef + monitor
5. Storing place_id violates ToS — destructure only {lat, lng, osoite} before writes

---

## Implied Roadmap: 5 Phases

**Phase 1: Redirect Fix + Cleanup** (independent, early)  
**Phase 2: Sijainti Location Step** (foundation for new create flow)  
**Phase 3: Claude Sport Category** (ready for Paikka integration)  
**Phase 4: Claim/Create Rework + Backfill** (largest, depends on 2-3)  
**Phase 5: Integration Testing** (validates all together)

No research-phases needed. All HIGH-confidence architectural grounding. Proceed to PLAN + EXECUTE + VERIFY per phase.

---

## Confidence & Gaps

**Overall: MEDIUM-HIGH** — Codebase-grounded, minor gaps on ToS/cost empirics

| Area | Confidence | Gap |
|------|-----------|-----|
| Stack | MEDIUM-HIGH | Session-token billing not empirically verified |
| Features | MEDIUM-HIGH | Naming convention UX uncertain until UAT |
| Architecture | HIGH | Backfill strategy untested with real data |
| Pitfalls | HIGH | Pitfalls 4 & 5 need live Google docs re-check |

**During planning:** (1) Implement Places API cost monitoring, (2) Pre-deploy staging validation of backfill, (3) Re-check Google ToS, (4) Confirm branding-analyzer screenshot status.

---

## Ready for Roadmap

Status: Synthesis complete. All four research documents (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md) synthesized.

Next: Validate 5-phase structure, run /gsd-plan-phase for each phase with research flags noted.

**Research completed:** 2026-06-22
