---
phase: 19
slug: filtteri-lista-paikka-ux
uat_session: 1
started: "2026-05-30"
updated: "2026-05-31"
status: complete
passed: 7
issues: 0
---

# Phase 19 UAT — Filtteri, lista & paikka-UX

## Requirements under test
- FILTER-01: Kertakäynti-filtteri korvaa hintasuodattimet
- UI-19: Paikka kuva (image_url) DiagonaalKortin oikeassa paneelissa
- UI-20: AI-widget kaksirivi + Karuselli pienempi
- UI-21: Pin-nappi DiagonaalKortissa → sulkee listan, zoomaa karttaan

## Test Results

| # | Requirement | Test | Result | Notes |
|---|-------------|------|--------|-------|
| T-01 | FILTER-01 | Hintasuodattimet poissa, "Kertakäynti OK" näkyy | PASS | |
| T-02 | FILTER-01 | Kertakäynti OK toggle toimii (filtteröi / nollaa) | PASS | |
| T-03 | UI-19 | DiagonaalKortti oikea puoli: laji-väri fallback (ei image_url:ia DB:ssä) | PASS | |
| T-04 | UI-20 | AI-widget: sää Row 1 + AI-teksti Row 2 | PASS | |
| T-05 | UI-20 | Karuselli-kortit näyttävät pienemmiltä | PASS | |
| T-06 | UI-21 | Pin-nappi näkyy listakorteissa | PASS | |
| T-07 | UI-21 | Pin-nappi: sulkee listan ja zoomaa karttaan | PASS | Re-tested 2026-05-31 after Phase 20 NAV-03 — behaviour correct |

## Issues Found

None — all 7 tests passed.

## Summary

| Result | Count |
|--------|-------|
| Passed | 7     |
| Issues | 0     |
| Skipped| 0     |
