# Research Summary — v3.0 "Oma tietokanta (Google Places -irtautuminen)"

**Project:** Liikuntahakemisto — local sports venue directory with business self-service onboarding  
**Milestone:** v3.0 — Decommission Google Places, implement manual venue entry + AI category classification  
**Domain:** Multi-tenant SaaS (Next.js 14 + Supabase) — migrating from API-sourced to user-submitted data  
**Researched:** 2026-06-22  
**Confidence:** MEDIUM-HIGH

---

## Executive Summary

v3.0 represents a fundamental shift: from syncing venue data via Google Places to having businesses manually enter their own venues. Five interrelated initiatives: (1) remove Google Places sync route and data, (2) implement map-pin + Places Autocomplete location picker, (3) rework claim/create to create-only with company/branch naming, (4) add AI sport-category to existing Claude call, (5) fix dashboard redirect bug.

**Recommended approach:** No new npm dependencies (all stack elements exist or load dynamically). Prioritize data integrity via explicit row provenance checks before deletion. Keep onboarding focused with single map component and additive Claude prompt.

**Central risk:** Cascade deletion through 5 FK relationships if business_managed=false used as proxy for "is Google data". Must cross-reference business_paikka_links.link_type to distinguish unclaimed Google rows from business-claimed rows carrying Google-origin data.

**Success requires:** Strict phase sequencing: (1) redirect fix + cleanup decision (early, independent), (2) Sijainti location step, (3) Claude extension, (4) claim/create rework with backfill, (5) integration testing.

---

## Key Findings

### Stack: No New Packages

- **@vis.gl/react-google-maps (already installed)** — Add 'places' to existing APIProvider
- **google.maps.places.AutocompleteSuggestion (runtime-loaded)** — Modern replacement for deprecated Autocomplete
- **google.maps.Geocoder (Maps JS API core)** — Already available via APIProvider
- **@anthropic-ai/sdk (already installed)** — Extend single Claude call with sport-category JSON field (additive)

### Features: Three Layers Ship Together

Must have: Location picker, single venue-name, dashboard never auto-redirects
Should have: Company/branch naming, per-venue badge, reverse-geocode auto-fill
Defer: Ketjuadmin, duplicate detection, auto-splitting

### Architecture: Reuse Existing Patterns

- **StepSijainti.tsx (NEW)** — Map pin + Places Autocomplete, bidirectional sync
- **StepPaikka.tsx (REWORK)** — Collects company + branch names with live preview
- **app/business/page.tsx (FIX)** — Remove redirect, show per-venue "Kesken" badges
- **Migration order (CRITICAL):** Redirect fix → sijainti column → Sijainti code → claim/create rework → testing

### Critical Pitfalls (Top 5 of 9)

1. **Cascade deletion via naive business_managed filter** — Must query link_type first to categorize rows
2. **Sync removal removes hours freshness** — Decide unclaimed venue fate before route removal
3. **Double Maps JS API load** — Verify /business/onboarding inside existing provider tree
4. **Session tokens per keystroke** — Multiplies billing 10-100x; use useRef + monitor
5. **Storing place_id violates ToS** — Destructure only {lat, lng, osoite} before writes

---

## Implications for Roadmap: 5 Phases

**Phase 1: Redirect Fix + Cleanup** (independent, early)  
**Phase 2: Sijainti Location Picker** (foundation for new create flow)  
**Phase 3: Claude Sport Category** (ready for Paikka integration)  
**Phase 4: Claim/Create Rework + Backfill** (largest, depends on 2-3)  
**Phase 5: Integration Testing** (validates all together)

All phases have HIGH-confidence grounding. No research-phase tasks needed.

---

## Confidence & Gaps

**Overall: MEDIUM-HIGH** — Codebase-grounded, minor gaps on cost/ToS empirics

- Stack: MEDIUM-HIGH (empirical billing validation deferred to post-launch)
- Features: MEDIUM-HIGH (naming UX uncertain until UAT)
- Architecture: HIGH (backfill untested with real data)
- Pitfalls: HIGH (Pitfalls 4 & 5 need live Google docs re-check)

**During planning:** (1) Implement Places API cost monitoring, (2) Pre-deploy staging validation, (3) Re-check Google ToS, (4) Confirm screenshot status.

---

## Ready for Roadmap

Status: Synthesis complete. All four research documents synthesized. 5-phase structure derived.

Research completed: 2026-06-22
