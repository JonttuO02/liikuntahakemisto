# Requirements: Liikuntahakemisto v2.2

**Defined:** 2026-06-16
**Core Value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Milestone:** v2.2 Onboarding-tekoälyn parannukset

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Scraping Pipeline

- [x] **SCRAP-06**: Scraper follows same-origin links from the homepage to pricing/hours/contact subpages (capped at 3-5 pages)
- [x] **SCRAP-07**: Every followed link and fetch redirect is re-validated against the SSRF guard before fetching (not just the entry URL)
- [x] **SCRAP-08**: Claude prompt receives labeled multi-page content with per-page truncation budgets, instead of one flat 8000-char slice
- [x] **SCRAP-09**: Scraper extracts general page images (not just logo candidates) for gallery prefill

### Schema

- [x] **BRDDB-03**: `business_branding` gains `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color` columns
- [x] **BRDDB-04**: `business_branding`'s `logo_type` CHECK constraint fixed to match the analyzer's actual enum values
- [x] **BRDDB-05**: `business_branding`'s unique constraint re-keyed to include `paikka_id` (fixes silent multi-venue branding overwrite)

### Selection UI

- [x] **ONBOARD-14**: User selects one logo from multiple AI-found candidates (instead of auto-pick)
- [x] **ONBOARD-15**: User selects 2 colors from the extracted palette — background + accent (instead of one auto-picked color)
- [x] **ONBOARD-16**: Scraped gallery images prefill the Mediat step's photo selection
- [x] **ONBOARD-17**: New `PATCH /api/business/branding` route validates logo/color selections against the business's own stored analysis result

### Preview & Bugfixes

- [x] **PREV-02**: Step 6 preview renders `CalloutCard` instead of the unused `PaikkaKortti`, with a fallback for venues missing coordinates
- [x] **PREV-03**: A shared contrast-safe logo display primitive is used in AnalysoiSivusto's logo-candidate picker, fixing white/transparent logo invisibility against its fixed white background (DiagonaalKortti/PaikkaSheet already have working contrast via user-selected brand color and are out of scope — corrected 2026-06-17 during Phase 49 discussion)

### Flow

- [x] **FLOW-01**: `StepPaikka` renders before the URL-analysis step in the onboarding flow
- [x] **FLOW-02**: User can quick-accept the AI analysis results and skip remaining wizard steps, submitting directly to the admin approval queue
- [x] **FLOW-03**: Quick-accept reuses the existing submit route's ownership/validation/draft-cleanup invariants unmodified — AI results are mapped into an `onboarding_draft` row first, then the existing submit route runs exactly as it does for a full-wizard submission, not a parallel write path
- [x] **FLOW-04**: In-flight drafts created under the old step order resume correctly after the reorder ships

### Live Preview

- [x] **LIVEPREV-01**: Each wizard step updates a shared live-preview state on field change
- [x] **LIVEPREV-02**: Desktop shows the live preview side-by-side with the active step's edit form
- [x] **LIVEPREV-03**: Mobile shows a toggle between edit form and live preview (no side-by-side)
- [x] **LIVEPREV-04**: Live preview renders via `CalloutCard`/`DiagonaalKortti` using current in-progress (unsaved) field values, in both onboarding mode and EditMode

**D-03 scope correction (2026-06-18, Phase 51 discussion):** EditMode's `PreviewModal.tsx` click-to-open flow (`PaikkaKortti`/`DiagonaalKortti`/`PaikkaSheet`) is replaced by the same live `CalloutCard`/`DiagonaalKortti` preview used in onboarding — EditMode is explicitly in scope for LIVEPREV-02/03/04, not excluded. `PreviewModal.tsx` itself is kept (the `/business` dashboard at `app/business/page.tsx` still renders it independently) but its only call site inside `WizardInner.tsx`'s EditMode is removed.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Headless browser / Playwright-based scraping | Target subpages are static server-rendered HTML; incompatible with Vercel Hobby `waitUntil` 10s budget |
| New state management library (Zustand/Redux/Jotai) for live preview | React Context + reducer scoped to the wizard tree is sufficient at this scale |
| Form library adoption | No existing usage in codebase; introducing one for live preview alone would be inconsistent |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCRAP-06 | Phase 47 | Complete |
| SCRAP-07 | Phase 47 | Complete |
| SCRAP-08 | Phase 47 | Complete |
| SCRAP-09 | Phase 47 | Complete |
| BRDDB-03 | Phase 47 | Complete |
| BRDDB-04 | Phase 47 | Complete |
| BRDDB-05 | Phase 47 | Complete |
| ONBOARD-14 | Phase 48 | Complete |
| ONBOARD-15 | Phase 48 | Complete |
| ONBOARD-16 | Phase 48 | Complete |
| ONBOARD-17 | Phase 48 | Complete |
| PREV-02 | Phase 49 | Complete |
| PREV-03 | Phase 49 | Complete |
| FLOW-01 | Phase 50 | Complete |
| FLOW-02 | Phase 48 | Complete |
| FLOW-03 | Phase 48 | Complete |
| FLOW-04 | Phase 50 | Complete |
| LIVEPREV-01 | Phase 51 | Complete |
| LIVEPREV-02 | Phase 51 | Complete |
| LIVEPREV-03 | Phase 51 | Complete |
| LIVEPREV-04 | Phase 51 | Complete |

**Coverage:**

- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-16*
*Last updated: 2026-06-16 after roadmap creation (Phases 47-51 mapped, 21/21 requirements, 0 orphans)*
