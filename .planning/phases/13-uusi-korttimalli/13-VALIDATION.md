---
phase: 13
slug: uusi-korttimalli
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.7 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run lib/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/` — confirms utility functions not broken
- **After every plan wave:** Run `npx vitest run` — full suite
- **Before `/gsd:verify-work`:** Full suite must be green + visual verification of DiagonaalKortti in browser
- **Max feedback latency:** ~5 seconds (lib tests only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | UI-11 | — | lat/lng are number not string; no URL injection | Manual (visual) | `npx vitest run lib/` (smoke) | ❌ W0 N/A | ⬜ pending |
| 13-01-02 | 01 | 1 | UI-11 | — | Fallback renders when lat/lng = null | Manual (visual) | n/a | ❌ N/A | ⬜ pending |
| 13-02-01 | 02 | 2 | UI-11 | — | Entire card is a Link to /paikat/{id} | Manual (click) | n/a | ❌ N/A | ⬜ pending |
| 13-02-02 | 02 | 2 | UI-11 | — | MAP-06 zoom-cards unchanged after import swap | Manual (visual) | n/a | ❌ N/A | ⬜ pending |
| 13-02-03 | 02 | 2 | UI-11 | — | Static Maps image loads (referrer test) | Manual (Network tab) | n/a | ❌ N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- No new Wave 0 infrastructure required — existing Vitest setup covers lib/ utilities
- DiagonaalKortti is a pure UI component; environment: 'node' Vitest config cannot test React components without jsdom (out of scope for this phase)

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Diagonal split renders correctly (60/40, seamless join) | UI-11 | CSS clip-path is visual — no headless assertion possible | Render card list in browser; confirm diagonal join has no 1px seam; test at 100% and 110% zoom |
| Fallback right panel (no lat/lng) | UI-11 | Visual render check | Find a place without coordinates; confirm lajiKonfig.color fills right panel with icon centered |
| Static Maps image loads | UI-11 | Requires live API key + network | Open DevTools Network tab; confirm `staticmap` request returns 200 with image |
| MAP-06 zoom-cards unaffected | UI-11 | Visual check of map marker cards | Pan map and zoom — confirm zoom-level marker cards still render correctly |
| Card click navigates to /paikat/{id} | UI-11 | Browser interaction | Click anywhere on card; confirm navigation to correct profile page |
| h-32 height consistent across all cards | UI-11 | Visual scan of card list | Scroll through list; confirm no card taller or shorter than others |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
