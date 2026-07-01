---
status: diagnosed
phase: 63-business-dashboardin-preview-n-kymien-uudistus
source: [63-VERIFICATION.md]
started: 2026-07-01T18:35:00Z
updated: 2026-07-01T19:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard card visual correctness (status pill + controls-panel shade)
expected: Status pill text/color matches claim_status; controls panel background is getPanelShade(brandColor), clearly distinguishable from the left panel's brandColor background; falls back to plain glass panel when brandColor is unset.
result: issue
reported: "Works almost fine, but some things to fix still. The card should always be sliced into two sides even if the brand colout hasnt been set. So when its not set the background could be maybe the same gray that the image placeholder had, just without the camera icon. With approved status there appears a new button on the row but it doesnt do anything when clicking it, what button is that? I tried to test how the brandcolour works but when trying to edit one of the venues drafts there was a bug in the analyzing. I waited for a long time but it never finished the analyze. Also at this point I think it might be good idea to make atleast the business side also desktop compatible. Now on wider screen the cards are being streched, They should always keep the same right width and on desktop they could be organized into rows also."
severity: blocker

### 2. Icon-button click-through + inert left panel
expected: Icon buttons trigger their respective action (open PreviewModal / navigate to edit or onboarding / copy link to clipboard / open RejectionReasonPopup); clicking anywhere on the left info panel does nothing (D-01/D-10 — permanently visible controls, no hover/tap reveal, no click-catcher).
result: pass

### 3. RejectionReasonPopup interaction
expected: Popup opens with the correct venue's rejection_reason text (escaped, no HTML injection); backdrop click, Escape key, and the close (X) button all dismiss without navigating; 'Korjaa tiedot' CTA navigates once to the right paikka_id. Note WR-06 (63-REVIEW.md): the close button's aria-label reads "Sulje esikatselu" ("Close preview") — a copy-paste leftover, worth confirming/fixing.
result: pass

### 4. Cross-surface preview inertness click-audit
expected: PreviewModal, LivePreviewPane, and onboarding preview surfaces are purely visual — no navigation, no fetch calls, regardless of what is clicked (CalloutCard, DiagonaalKortti, PaikkaSheet's image carousel, any buttons).
result: pass

### 5. End-to-end auto-resubmit UX
expected: Saving any section (e.g. hinnasto) of a previously-rejected venue flips its status from Hylätty to Odottaa hyväksyntää (pending) immediately after the save succeeds, with no separate 'Hae uudelleen' step.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Controls panel is always visibly two-sided (split layout), even when brandColor is unset — falls back to the same neutral gray as the image placeholder (minus the camera icon) instead of a plain glass panel."
  status: failed
  reason: "User reported: the card should always be sliced into two sides even if the brand colour hasn't been set. When it's not set the background could be the same gray that the image placeholder had, just without the camera icon."
  severity: cosmetic
  test: 1
  root_cause: "DiagonaalKortti.tsx:74 sets panelShade to undefined when brandColor is falsy; the RIGHT panel wrapper (lines 239-243) then falls back to the shared .glass class, which is visually near-identical to the outer card's own .glass background (globals.css:26-33) — so the split reads as one undifferentiated panel instead of two-sided. The neutral gray the user wants already exists in the same file (no-photo image-placeholder bg-[rgba(0,0,0,0.06)], lines 307-308) but is not reused for this fallback."
  artifacts:
    - path: "app/components/DiagonaalKortti.tsx"
      issue: "panelShade fallback renders .glass class instead of the existing rgba(0,0,0,0.06) placeholder gray; panelShadeContrastText/panelChipBg (lines 75-78) also cascade from panelShade so icon-button contrast needs matching treatment"
  missing:
    - "Neutral-gray fallback constant (rgba(0,0,0,0.06), matching image-placeholder gray) applied via inline backgroundColor on the RIGHT panel wrapper when brandColor is unset, instead of the .glass class"
    - "Matching icon/button contrast values for the 4 controls so they stay legible against the new gray fallback"
  debug_session: .planning/debug/controls-panel-fallback-color.md

- truth: "Copy-invite-link icon button gives the user visible confirmation that the link was copied."
  status: failed
  reason: "User reported: with approved status there appears a new button on the row but it doesn't do anything when clicking it. User later clarified this was their own misunderstanding — the button is copy-invite-link and it does work, but there is apparently no visible feedback after copying, which made it look broken."
  severity: minor
  test: 1
  root_cause: "Button IS wired correctly (DiagonaalKortti.tsx:264-274 -> handleCopyInviteLink, app/business/page.tsx:100-105, navigator.clipboard.writeText succeeds). Only the aria-label changes on the `copied` state (2s) — invisible to a sighted mouse user. No toast/tooltip/icon-swap system exists anywhere in the codebase. Secondary: the clipboard write promise is not awaited/caught, so `copied` can flip true even if the write silently fails."
  artifacts:
    - path: "app/components/DiagonaalKortti.tsx"
      issue: "copied state (lines 264-274) only updates aria-label; no visible confirmation UI (icon swap/label/toast)"
    - path: "app/business/page.tsx"
      issue: "handleCopyInviteLink (lines 100-105) does not await/catch navigator.clipboard.writeText, so success state isn't guaranteed accurate"
  missing:
    - "Transient visible confirmation on successful copy (e.g. swap Link2 icon to a checkmark for ~2s, or inline 'Kopioitu'/'Copied' label) driven by existing `copied` state — messages/fi.json & en.json already have Business.inviteLinkCopied string, just needs to be rendered visibly, not only in aria-label"
    - "await/.catch() on navigator.clipboard.writeText so `copied` only becomes true on genuine success"
  debug_session: .planning/debug/dashboard-approved-card-dead-button.md

- truth: "Editing a draft venue and re-triggering brand-color analysis completes in reasonable time."
  status: failed
  reason: "User reported: tried to test how the brandcolour works but when trying to edit one of the venue's drafts there was a bug in the analyzing — waited a long time but it never finished the analyze."
  severity: blocker
  test: 1
  root_cause: "Two compounding pre-existing bugs (Phase 61/46-48 pipeline, NOT introduced by phase 63): (1) the 'Analysoi ->' button in WizardInner.tsx only calls onRunAnalysis -> setPagePhase('waiting'), which switches to the polling UI but never POSTs to /api/business/analyze-website to actually start a new analysis run — WaitingForAI just GET-polls a resource that was never triggered. (2) When analysis IS triggered (e.g. from step 0), runAnalysis() in analyze-website/route.ts is a fully sequential pipeline (scrape + up to 4 subpages -> Playwright screenshot -> Claude call -> sequential logo/gallery uploads) that routinely exceeds both the client's 60s poll cap (WaitingForAI, 30x2000ms) and, per an explicit code comment in the route, Vercel's 10s waitUntil budget in production — when killed mid-pipeline the catch block never runs, so business_branding.status is stuck at 'analyzing' permanently in the DB. On client timeout, WaitingForAI silently calls onSkip() and drops the user back to the same non-functional button, inviting an identical retry. Confirmed via git log: none of the 3 files on this path have any phase-63 commits; phase 63 only added the dashboard navigation that routes into this pre-existing broken flow."
  artifacts:
    - path: "app/business/onboarding/page.tsx"
      issue: "onRunAnalysis handler (line 369) only does setPagePhase('waiting'), never POSTs to start analysis; WaitingForAI's 60s timeout (lines 127-196) silently discards failure state via onSkip()"
    - path: "app/business/WizardInner.tsx"
      issue: "renders the non-functional 'Analysoi ->' button that doesn't trigger analysis"
    - path: "app/api/business/analyze-website/route.ts"
      issue: "runAnalysis() sequential pipeline (lines with documented comment at 20-25) can exceed both client poll window and production waitUntil execution budget, leaving status stuck at 'analyzing' forever with no recovery"
  missing:
    - "Make the 'Analysoi ->' button actually POST to /api/business/analyze-website before entering the 'waiting' phase, mirroring handleNimiUrlNext at step 0"
    - "Address pipeline-duration/stuck-status problem: parallelize sequential upload loops, add explicit max-duration guard with a status write, surface a clear timeout/failed state instead of silently reverting to the same retry button, reconcile client poll window with actual platform execution budget"
  debug_session: .planning/debug/business-draft-edit-analyze-hang.md

- truth: "Business dashboard is usable on desktop/wide viewports — cards keep a fixed width and lay out in a multi-column grid instead of stretching full-width."
  status: failed
  reason: "User reported: on wider screen the cards are being stretched; they should always keep the same width and on desktop could be organized into rows."
  severity: minor
  test: 1
  root_cause: "No width constraint or desktop grid breakpoint exists anywhere in the /business render chain: layout.tsx has no wrapping container, page.tsx's <main> (line 219) has no max-w-*/mx-auto, the venue-list wrapper (page.tsx:237) is a plain flex flex-col gap-3 with no sm:grid-cols-*, and DiagonaalKortti's root element (line 106) has no w-*/max-w-* class — so as a block child of a flex-col (stretch alignment) it always fills 100% of parent width. Confirmed pre-existing (predates phase 63 by ~3 weeks via git blame), not a phase-63 regression — phase 63's only DiagonaalKortti edit (commit c4d8de8a) added dashboardActions/conditional cursor-pointer, never touched width/layout classes."
  artifacts:
    - path: "app/business/page.tsx"
      issue: "<main> (line 219) has no max-w-*; venue-list wrapper (line 237) is flex flex-col gap-3 with no responsive grid"
    - path: "app/business/layout.tsx"
      issue: "no width-constraining wrapper around children"
    - path: "app/components/DiagonaalKortti.tsx"
      issue: "root motion.div (line 106) has no w-*/max-w-* class"
  missing:
    - "max-w-*/mx-auto on the <main> in app/business/page.tsx"
    - "Convert venue-list wrapper (page.tsx:237) from flex flex-col gap-3 to a responsive grid (e.g. grid gap-3 sm:grid-cols-2 lg:grid-cols-3), mirroring the existing pattern in app/loading.tsx (max-w-5xl mx-auto ... grid gap-4 sm:grid-cols-2 lg:grid-cols-3)"
    - "Check DiagonaalKortti root for min-w-0 issues once placed in a grid track"
  debug_session: .planning/debug/business-dashboard-desktop-card-stretch.md
