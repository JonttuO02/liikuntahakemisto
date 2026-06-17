---
phase: 49
slug: esikatselu-ja-kontrastikorjaukset
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-17
---

# Phase 49 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| AI-supplied `candidate.url` → `<img src>` | Logo candidate URLs originate from the scraper/analyzer pipeline (external website content) and are rendered as image sources in the browser. | External-origin URL string, rendered as image source only (no script context) |
| draft/branding data → `CalloutCard` props in Step 6 | Draft venue fields (name, sport, price) sourced from the business owner's own onboarding draft are rendered into a static preview card. | Same-tenant draft data, presentation-only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-49-01 | Information Disclosure | `ContrastSafeLogo` `<img src={candidate.url}>` | accept | URL rendered only as `<img>` source (no script context); candidate URLs already validated/SSRF-guarded by Phase 47 pipeline before reaching this picker. Presentation-only change, no new data source/sink. | closed |
| T-49-02 | Tampering | npm/pip/cargo installs | accept | No package installs in this plan — `ContrastSafeLogo` uses only React + existing project imports. | closed |
| T-49-03 | Information Disclosure | Step 6 `CalloutCard` preview | accept | Renders only the business owner's own draft fields back to themselves; no cross-tenant data, no new data source. Presentation-only swap of an already-rendered preview. | closed |
| T-49-04 | Denial of Service | `CalloutCard` null-coordinate render | mitigate | `?? 0` type-satisfaction shim guarantees non-null `latitude`/`longitude` are always passed to `CalloutCard`. Verified present in `app/business/onboarding/StepEsikatselu.tsx` (`latitude: draftAsPaikka.latitude ?? 0, longitude: draftAsPaikka.longitude ?? 0`); `CalloutCard`'s render body never reads these fields, so the shim is sufficient. | closed |
| T-49-05 | Tampering | npm/pip/cargo installs | accept | No package installs — plan swaps an existing import and adds two i18n strings; no new dependency. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks beyond the disposition rationale recorded in the Threat Register above (T-49-01, T-49-02, T-49-03, T-49-05 — each is a presentation-only or no-new-dependency change with rationale inline).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-17 | 5 | 5 | 0 | /gsd-secure-phase (plan-time register, verified against implementation) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-17
