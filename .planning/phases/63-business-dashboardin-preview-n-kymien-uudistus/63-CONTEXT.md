# Phase 63: Business-dashboardin & preview-näkymien uudistus - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The `/business` dashboard's venue list is rebuilt on `DiagonaalKortti` cards with status pills and icon-only action controls (replacing today's plain-text `VenueRow`). The outdated `PaikkaKortti` section in `PreviewModal` is replaced with `CalloutCard`. The edit/onboarding live-preview stack (`LivePreviewPane`) gains a third section showing the venuepage (`PaikkaSheet`). All preview surfaces — the dashboard's preview modal and the edit/onboarding live-preview — stay purely visual (no navigation or side effects from clicking within them).

**Carried forward from Phase 62 (D-07):** Removing `PaikkaKortti` from `PreviewModal` was explicitly deferred to this phase (PREV-04) — already decided, not open for debate.

</domain>

<decisions>
## Implementation Decisions

### Dashboard card — no hover/tap reveal, permanent controls panel (BIZPANEL-07)
- **D-01:** Drop the hover(desktop)/tap(mobile) reveal animation entirely. On the `/business` dashboard's own venue list, `DiagonaalKortti`'s right side (which normally shows the venue photo) is **permanently replaced** with the action controls — the photo is never shown there. The card keeps its diagonal cut-in-two silhouette.
- **D-02:** This is a **dashboard-only variant/mode** of `DiagonaalKortti` — a new prop (e.g. `variant="dashboard"` or a dedicated `controls`/`actions` prop bundle) that swaps the right panel's content. Every other usage (consumer-facing map/list cards on the main site, admin `/admin/[id]` preview, `PreviewModal`, `LivePreviewPane`) is **unchanged** and keeps the real photo.
- **D-03:** The controls panel's background color is a **computed complementary shade of `brandColor`** (extend the same `getContrastColor()`-style derivation `CalloutCard`/`DiagonaalKortti` already use for text contrast) — must visibly differ from the left panel's `brandColor` background.
- **D-04:** When a venue has no `brandColor` set yet (e.g. hasn't completed onboarding's branding-pick step), the controls panel falls back to a **light gray `.glass` surface** — matching the left panel's own no-brandColor default look.

### Status pill + secondary actions (BIZPANEL-06, BIZPANEL-07)
- **D-05:** Status pill sits in the image's bottom corner per BIZPANEL-06 — but since the dashboard variant has no image, it renders in the equivalent position on the controls panel (bottom corner of the right side).
- **D-06:** **Rejected venues:** the controls panel shows a dedicated icon button (e.g. an info/warning icon) that opens a **text popup** displaying the rejection reason. The popup includes a **CTA button** (e.g. "Korjaa tiedot") that navigates to the edit/onboarding flow for that venue. Dismissing the popup without pressing the CTA just closes it — no navigation.
- **D-07:** **Reapply is no longer an explicit separate action.** Saving edits to a rejected venue **automatically resubmits it** (flips `claim_status` back to `pending`) — no distinct "lähetä uudelleen" button/step anywhere.
  - ⚠️ **Behavioral/backend note for research & planning:** this changes more than the UI. Today `/api/business/reapply` is a distinct Route Handler the user explicitly triggers. Auto-resubmit-on-save means the edit/onboarding submit path (`app/api/business/onboarding/submit/route.ts` or equivalent) must transition `rejected` → `pending` as part of a normal save, for rejected venues specifically. Research should confirm whether the existing `/api/business/reapply` route becomes dead code (removed) or stays for a different trigger path.
- **D-08:** "Kopioi kutsulinkki" (copy invite link) becomes a **4th icon button** in the controls panel (e.g. link/share icon), shown conditionally only when the venue is `approved` and not `kesken` — same visibility condition as today.
- **D-09:** Icon choice for preview/edit/jatka/invite/rejection-info buttons is Claude's discretion (see below) — the *behavior and placement* are locked, not the specific Lucide icon.

### Whole-card click behavior (PREV-05 spirit extended to dashboard)
- **D-10:** With controls always visible (no click-catcher needed for reveal), clicking the card's **left info panel** (name/price/sport pill area) does **nothing** — fully inert. Every action lives exclusively in the controls-panel icon buttons.

### PreviewModal — CalloutCard replaces PaikkaKortti (PREV-04)
- **D-11:** `PreviewModal`'s `PaikkaKortti` section is removed and replaced with `CalloutCard`, matching `LivePreviewPane`'s existing pattern. Resulting stack order: `CalloutCard` → `DiagonaalKortti` → `PaikkaSheet` (preview mode) — same order `LivePreviewPane` will use after D-13 below.
- **D-12:** `CalloutCard` requires non-null `latitude`/`longitude` — reuse the same `?? 0` shim `LivePreviewPane` already applies when passing venue data in.

### Live-preview — add venuepage as a 3rd section (LIVEPREV-05)
- **D-13:** `PaikkaSheet` (in `preview={true}` mode, fixed 600px height per its existing preview styling) is added as a **third stacked section below** `CalloutCard` and `DiagonaalKortti` in `LivePreviewPane` — same column, same order as `PreviewModal`. No separate mobile sub-tab; the sidebar/mobile toggle view simply scrolls taller.
- **D-14:** Live-preview's `DiagonaalKortti` keeps showing the **real photo (consumer view)** — it must NOT use the new no-photo dashboard controls variant (D-01/D-02). The dashboard variant is management-only UI; live-preview shows exactly what a customer would see.

### Claude's Discretion
- Exact icon choices for preview/edit/jatka/invite-link/rejection-info buttons (e.g. Eye, Pencil, ArrowRight, Link, Info from `lucide-react`, matching existing icon usage conventions).
- Whether `/api/business/reapply` route is deleted or repurposed once auto-resubmit-on-save (D-07) is implemented — flag for `gsd-phase-researcher` to investigate current call sites before deciding.
- Exact prop naming for the dashboard-only `DiagonaalKortti` variant (e.g. `variant`, `dashboardActions`, `controls` — planner picks the most consistent name given existing props `onShowMap`, `onOpen`, `onToggleTodo`).
- Popup implementation for the rejection-reason (e.g. reuse an existing modal pattern like `PreviewModal`'s overlay, or a lighter popover) — no existing "small popup" component was found in scout; planner/researcher should check for one or establish the pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior phase context
- `.planning/phases/62-venuepage-konsolidaatio/62-CONTEXT.md` — D-07 defers PaikkaKortti removal from PreviewModal to this phase; D-05 establishes the no-op overlay pattern for DiagonaalKortti when no `onOpen` is passed (same pattern applies to the new dashboard controls panel not needing a click-catcher)

### Requirements & project rules
- `.planning/REQUIREMENTS.md` — BIZPANEL-06, BIZPANEL-07, PREV-04, LIVEPREV-05, PREV-05 (exact requirement text)
- `.planning/ROADMAP.md` — Phase 63 success criteria and dependency notes (depends on Phase 62; must land before Phase 64 since both touch `app/business/page.tsx`)
- `CLAUDE.md` — Design system (glassmorphism `.glass` utilities, monochrome `#111111` accent, 4-size/2-weight typography, animation duration/easing conventions) — the dashboard controls panel and any popup must follow these

### Components to modify
- `app/components/DiagonaalKortti.tsx` — needs the new dashboard-only variant (no-photo controls panel, status pill repositioned, brandColor-derived panel background)
- `app/business/page.tsx` — `VenueRow`/`StatusCard` logic replaced by DiagonaalKortti-card rendering; reapply/copy-invite-link/rejection-reason logic moves into the new controls panel
- `app/components/PreviewModal.tsx` — remove PaikkaKortti section, add CalloutCard section
- `app/business/onboarding/LivePreviewPane.tsx` — add PaikkaSheet as third stacked section

### Context components (read, not modified in this phase unless noted)
- `app/components/CalloutCard.tsx` — confirmed zero click handlers already (naturally purely-visual); reused as-is
- `app/components/PaikkaSheet.tsx` — `preview` prop already disables drag-dismiss, close-handle, and "Näytä kartalla" row (lines ~69-267); confirm no other click-triggering elements remain active in preview mode
- `app/business/WizardInner.tsx` — desktop sticky sidebar (`w-[360px]`) and mobile toggle (`lg:hidden` + `activeView === 'preview'`) wrapping `LivePreviewPane` — layout context for D-13
- `app/api/business/reapply/route.ts` (or equivalent) — current explicit reapply endpoint; investigate before deciding its fate per D-07's Claude's Discretion note
- `lib/branding/brandingResult.ts` — `getContrastColor()` — base for the new brandColor-derived controls-panel color (D-03)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getContrastColor()` (`lib/branding/brandingResult.ts`): already used by `CalloutCard`/`DiagonaalKortti` for text-contrast against `brandColor` — extend/reuse its color-math for deriving the controls-panel's complementary shade (D-03)
- `.glass` / `.glass-btn` utilities (`app/globals.css`): use for the no-brandColor fallback controls panel (D-04) and for icon buttons themselves
- `PreviewModal`'s existing overlay pattern (`app/components/PreviewModal.tsx`): candidate base for the rejection-reason popup if no lighter popover component exists

### Established Patterns
- `DiagonaalKortti`'s existing `onOpen`/`onShowMap`/`onToggleTodo` optional-prop pattern (absent prop → no-op, Phase 62 D-04/D-05): the dashboard variant's new controls props should follow the same "presence of prop toggles behavior" convention
- Conditional action-button visibility already exists in `VenueRow` (e.g. `link.claim_status === 'approved' && !isKesken` gating the invite-link button) — same conditions carry over to the new icon buttons (D-08)
- `deriveVenueStatus()` (`lib/venueStatus.ts`, referenced in `app/business/page.tsx`): existing helper for `kesken`/`pending`/`approved`/`rejected` status derivation — reuse for the new status pill logic, don't reimplement

### Integration Points
- `app/business/page.tsx` line ~322: `venueLinks.map(link => <VenueRow ... />)` — this render loop becomes the DiagonaalKortti-card grid/list
- `LivePreviewPane` renders inside both `WizardInner.tsx`'s desktop sidebar (`w-[360px] sticky top-6`, 2 call sites) and mobile toggle view (`lg:hidden`, 2 call sites) — D-13's third section must work in both contexts without layout breakage
- `useLivePreview()` context (`lib/livePreview/LivePreviewContext.tsx`) already supplies `livePreviewPaikka`, `brandColor`, `accentColor` consumed by `LivePreviewPane` — same data feeds the new PaikkaSheet section, no new context plumbing needed

</code_context>

<specifics>
## Specific Ideas

- The dashboard card must visually preserve the diagonal cut-in-two silhouette even with no photo on the right — the split is a brand visual, not just a photo-crop mechanism (user was explicit: "The card should still keep the visual of cut in center to two different areas").
- Both halves of the dashboard card must never render the same color — this is why D-03 (complementary derived shade) was chosen over a fixed color that could coincidentally match a user-picked `brandColor`.

</specifics>

<deferred>
## Deferred Ideas

- **"Block business accounts from logging into customer site"** (existing todo, `2026-06-24-block-business-accounts-from-logging-into-customer-site.md`) — surfaced as a loose keyword match during todo cross-reference but is an auth-boundary/security topic, unrelated to this phase's dashboard/preview redesign domain. User confirmed: leave deferred, do not fold into Phase 63.

### Reviewed Todos (not folded)
- **Block business accounts from logging into customer site** — reviewed, not folded. Reason: different domain (auth/session boundary vs. dashboard UI redesign); needs its own dedicated phase per the todo file's own note ("needs its own discussion/phase").

</deferred>

---

*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Context gathered: 2026-07-01*
