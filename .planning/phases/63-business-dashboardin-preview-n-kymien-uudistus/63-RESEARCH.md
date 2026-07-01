# Phase 63: Business-dashboardin & preview-näkymien uudistus - Research

**Researched:** 2026-07-01
**Domain:** Next.js 14 App Router business dashboard UI redesign (card components, brand-color theming, purely-visual preview surfaces, auto-resubmit-on-save backend behavior)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard card — no hover/tap reveal, permanent controls panel (BIZPANEL-07)**
- **D-01:** Drop the hover(desktop)/tap(mobile) reveal animation entirely. On the `/business` dashboard's own venue list, `DiagonaalKortti`'s right side (which normally shows the venue photo) is **permanently replaced** with the action controls — the photo is never shown there. The card keeps its diagonal cut-in-two silhouette.
- **D-02:** This is a **dashboard-only variant/mode** of `DiagonaalKortti` — a new prop (e.g. `variant="dashboard"` or a dedicated `controls`/`actions` prop bundle) that swaps the right panel's content. Every other usage (consumer-facing map/list cards on the main site, admin `/admin/[id]` preview, `PreviewModal`, `LivePreviewPane`) is **unchanged** and keeps the real photo.
- **D-03:** The controls panel's background color is a **computed complementary shade of `brandColor`** (extend the same `getContrastColor()`-style derivation `CalloutCard`/`DiagonaalKortti` already use for text contrast) — must visibly differ from the left panel's `brandColor` background.
- **D-04:** When a venue has no `brandColor` set yet (e.g. hasn't completed onboarding's branding-pick step), the controls panel falls back to a **light gray `.glass` surface** — matching the left panel's own no-brandColor default look.

**Status pill + secondary actions (BIZPANEL-06, BIZPANEL-07)**
- **D-05:** Status pill sits in the image's bottom corner per BIZPANEL-06 — but since the dashboard variant has no image, it renders in the equivalent position on the controls panel (bottom corner of the right side).
- **D-06:** **Rejected venues:** the controls panel shows a dedicated icon button (e.g. an info/warning icon) that opens a **text popup** displaying the rejection reason. The popup includes a **CTA button** (e.g. "Korjaa tiedot") that navigates to the edit/onboarding flow for that venue. Dismissing the popup without pressing the CTA just closes it — no navigation.
- **D-07:** **Reapply is no longer an explicit separate action.** Saving edits to a rejected venue **automatically resubmits it** (flips `claim_status` back to `pending`) — no distinct "lähetä uudelleen" button/step anywhere.
  - ⚠️ Behavioral/backend note: this changes more than the UI. Today `/api/business/reapply` is a distinct Route Handler the user explicitly triggers. Auto-resubmit-on-save means the edit/onboarding submit path must transition `rejected` → `pending` as part of a normal save, for rejected venues specifically. **Research finding (this document): the correct hook point is `app/api/business/update-paikka/route.ts`, not `onboarding/submit/route.ts` or a repurposed `reapply` route — see Pitfall 1.**
- **D-08:** "Kopioi kutsulinkki" (copy invite link) becomes a **4th icon button** in the controls panel (e.g. link/share icon), shown conditionally only when the venue is `approved` and not `kesken` — same visibility condition as today.
- **D-09:** Icon choice for preview/edit/jatka/invite/rejection-info buttons is Claude's discretion (see below) — the *behavior and placement* are locked, not the specific Lucide icon.

**Whole-card click behavior (PREV-05 spirit extended to dashboard)**
- **D-10:** With controls always visible (no click-catcher needed for reveal), clicking the card's **left info panel** (name/price/sport pill area) does **nothing** — fully inert. Every action lives exclusively in the controls-panel icon buttons.

**PreviewModal — CalloutCard replaces PaikkaKortti (PREV-04)**
- **D-11:** `PreviewModal`'s `PaikkaKortti` section is removed and replaced with `CalloutCard`, matching `LivePreviewPane`'s existing pattern. Resulting stack order: `CalloutCard` → `DiagonaalKortti` → `PaikkaSheet` (preview mode) — same order `LivePreviewPane` will use after D-13.
- **D-12:** `CalloutCard` requires non-null `latitude`/`longitude` — reuse the same `?? 0` shim `LivePreviewPane` already applies when passing venue data in.

**Live-preview — add venuepage as a 3rd section (LIVEPREV-05)**
- **D-13:** `PaikkaSheet` (in `preview={true}` mode, fixed 600px height per its existing preview styling) is added as a **third stacked section below** `CalloutCard` and `DiagonaalKortti` in `LivePreviewPane` — same column, same order as `PreviewModal`. No separate mobile sub-tab; the sidebar/mobile toggle view simply scrolls taller.
- **D-14:** Live-preview's `DiagonaalKortti` keeps showing the **real photo (consumer view)** — it must NOT use the new no-photo dashboard controls variant (D-01/D-02). The dashboard variant is management-only UI; live-preview shows exactly what a customer would see.

### Claude's Discretion
- Exact icon choices for preview/edit/jatka/invite-link/rejection-info buttons (e.g. Eye, Pencil, ArrowRight, Link, Info from `lucide-react`, matching existing icon usage conventions).
- Whether `/api/business/reapply` route is deleted or repurposed once auto-resubmit-on-save (D-07) is implemented — flag for `gsd-phase-researcher` to investigate current call sites before deciding. **Resolved by this research: delete it — see Pitfall 1.**
- Exact prop naming for the dashboard-only `DiagonaalKortti` variant (e.g. `variant`, `dashboardActions`, `controls` — planner picks the most consistent name given existing props `onShowMap`, `onOpen`, `onToggleTodo`).
- Popup implementation for the rejection-reason (e.g. reuse an existing modal pattern like `PreviewModal`'s overlay, or a lighter popover) — no existing "small popup" component was found in scout; planner/researcher should check for one or establish the pattern. **Resolved by this research: base it on `AuthModal.tsx`'s lighter dialog pattern — see Architecture Patterns, Pattern 3.**

### Deferred Ideas (OUT OF SCOPE)
- **"Block business accounts from logging into customer site"** (existing todo, `2026-06-24-block-business-accounts-from-logging-into-customer-site.md`) — surfaced as a loose keyword match during todo cross-reference but is an auth-boundary/security topic, unrelated to this phase's dashboard/preview redesign domain. User confirmed: leave deferred, do not fold into Phase 63.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| BIZPANEL-06 | `/business`-dashboardin paikkalista korvataan DiagonaalKortti-korteilla; status-pillit sijoitetaan kortin kuvan alakulmaan | Architecture Patterns Pattern 1 (optional-prop-bundle variant), Pitfall 4 (status pill is new UI, not a relocation — with exact color/label source to copy from `VenueRow`), Code Examples (bottom-corner button positioning to mirror) |
| BIZPANEL-07 | Hover (desktop) / tap (mobiili) paljastaa kortin oikealta piilotetun lisäosan pyöreillä ikonipainikkeilla (preview/edit/jatka) — ei tekstipainikkeita | Architecture Patterns Pattern 1 and Pattern 2 (controls panel + `getPanelShade()` background derivation), Don't Hand-Roll (reuse `handleCopyInviteLink`, `deriveVenueStatus`) |
| PREV-04 | Business-paikkalistan preview-modaalin vanhentunut PaikkaKortti-näkymä poistetaan, korvataan CalloutCardilla | Architecture Patterns (System Architecture Diagram — target stack order), Pitfall 5 (`?? 0` lat/lng shim required for `CalloutCard`'s non-nullable prop type) |
| LIVEPREV-05 | Edit- ja onboarding-vaiheiden live-preview laajennetaan sisältämään venuepage (PaikkaSheet) CalloutCardin ja DiagonaalKortin lisäksi | System Architecture Diagram (target 3-section stack), Pitfall 3 (booking-link preview-guard gap must be fixed before/alongside adding this section, or the new section ships with an active navigation escape hatch) |
| PREV-05 | Kaikki preview-näkymät (business-dashboardin preview-modaali, edit/onboarding-livepreview) ovat puhtaasti visuaalisia — klikkaus ei laukaise navigointia tai toimintoja | Pitfall 3 (confirmed pre-existing violation in `PaikkaSheet`'s booking link, exact line location and fix), Security Domain (XSS-safe rendering of rejection reason text), Validation Architecture (test coverage split: automated for D-07 backend half, manual click-audit for the visual half) |
</phase_requirements>

## Summary

This phase is almost entirely a codebase-internal refactor of existing, already-working components — no new libraries, no new API integrations, no new external dependencies. The five requirements decompose into two clean tracks: (1) a **new no-photo dashboard variant** of `DiagonaalKortti` that replaces `app/business/page.tsx`'s plain-text `VenueRow`/`StatusCard` with icon-button cards (BIZPANEL-06, BIZPANEL-07), and (2) **three purely-visual preview-surface fixes** — swap `PaikkaKortti`→`CalloutCard` in `PreviewModal` (PREV-04), add `PaikkaSheet` as a third stacked section in `LivePreviewPane` (LIVEPREV-05), and closing a real click-through hole in `PaikkaSheet`'s preview mode that lets users navigate away via the booking link (PREV-05).

The most consequential finding is on the "Claude's Discretion" item about `/api/business/reapply`: **the route is dead code once D-07 ships**, because the actual edit-save path for approved/rejected venues (`app/api/business/update-paikka/route.ts`, called from `EditMode` in `WizardInner.tsx`) currently has **no claim_status side effect at all** — it only writes section fields. D-07's auto-resubmit-on-save must be added as new logic *inside* `update-paikka/route.ts` (flip `rejected`→`pending` + clear `rejection_reason`, scoped to the venue being saved), not as a repurposing of the reapply route. Separately, `onboarding/submit/route.ts` (the *initial* onboarding-completion path for `kesken` venues) already unconditionally resets `claim_status` to `pending` — that code path is unrelated to D-07 and needs no changes.

The second consequential finding is a **pre-existing PREV-05 violation**: `PaikkaSheet.tsx`'s booking-link button (`<a target="_blank" href={paikka.varauslinkki}>`) has no `!preview` guard, unlike the close/bookmark buttons and the "show on map" row which are already correctly suppressed in preview mode. This must be fixed as part of PREV-05's "purely visual" requirement, or the third `LivePreviewPane` section (LIVEPREV-05) will ship with an active external-navigation escape hatch.

**Primary recommendation:** Add a `dashboardActions` (or similarly-named) optional prop bundle to `DiagonaalKortti` that swaps the right panel from photo to icon-button controls when present; extend `getContrastColor`'s pattern in `lib/branding/brandingResult.ts` with a new exported `getPanelShade()`-style helper built on the same `darkenHex`/`lightenHex` math already private to `CalloutCard.tsx` (do not reinvent color math); fix `PaikkaSheet`'s booking-link preview gap; and land `update-paikka/route.ts`'s auto-resubmit logic with matching test coverage in the existing `tests/api/update-paikka.test.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard card rendering (DiagonaalKortti variant) | Browser / Client | — | Pure presentational React component, no data fetching |
| Controls-panel color derivation (D-03) | Browser / Client | — | Pure function of `brandColor` prop, computed client-side like `getContrastColor` already is |
| Rejection-reason popup (D-06) | Browser / Client | — | Local component state (open/closed), no server round-trip needed — reason text already loaded with `venueLinks` |
| Auto-resubmit-on-save (D-07) | API / Backend | Database / Storage | `update-paikka/route.ts` Route Handler mutates `business_paikka_links.claim_status` — must happen server-side (service-role key) per project's Supabase-writes constraint |
| CalloutCard / PaikkaSheet preview sections | Browser / Client | — | Already-existing purely-visual components; wiring is presentational only |
| Copy-invite-link (D-08) | Browser / Client | — | `navigator.clipboard.writeText` — already implemented in `VenueRow`, only relocating |

## Standard Stack

### Core
No new libraries. This phase uses only what's already installed and used by the exact files it touches:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.2.35 (locked, `[VERIFIED: package.json]`) | App Router, Route Handlers | Already the project's framework |
| lucide-react | ^1.16.0 (locked, `[VERIFIED: package.json]`) | Icon buttons (preview/edit/jatka/invite/rejection-info) | Already used everywhere in the codebase (`DiagonaalKortti`, `PaikkaSheet`, `AuthModal`) |
| framer-motion | ^12.38.0 (locked, `[VERIFIED: package.json]`) | Card hover/tap, popup enter/exit, AnimatePresence | Already the project's only animation library |
| next-intl | ^4.13.0 (locked, `[VERIFIED: package.json]`) | `t('Business.xxx')` translation keys | Already the project's i18n solution |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | — |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled popup (`role="dialog"` div) | `@radix-ui/react-popover` / `@base-ui-components/react` Popover | Not installed; project already has two working hand-rolled dialog patterns (`AuthModal`, `PreviewModal`) — adding a new dependency for one small popup contradicts the "no new runtime dependencies" v3.1 constraint recorded in STATE.md |

**Installation:**
No installation needed — zero new packages for this phase.

**Version verification:** All versions above read directly from `package.json` in the working tree via `node -e "require('./package.json')"` — this is the ground truth for this repo, not a registry lookup, since no new packages are proposed. `[VERIFIED: package.json]`.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** All work is confined to existing components (`DiagonaalKortti.tsx`, `PreviewModal.tsx`, `LivePreviewPane.tsx`, `PaikkaSheet.tsx`, `business/page.tsx`, `update-paikka/route.ts`) and existing dependencies already declared in `package.json`. Per the Package Legitimacy Gate protocol, this section is skipped when a phase installs no packages.

**Packages removed due to [SLOP] verdict:** none (n/a — no packages evaluated)
**Packages flagged as suspicious [SUS]:** none (n/a — no packages evaluated)

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  /business (BusinessPage)                                           │
│                                                                       │
│   venueLinks.map(link => ...)                                       │
│        │                                                             │
│        ▼                                                             │
│   DiagonaalKortti (variant: dashboardActions)      ◄── D-01..D-10   │
│     ├── LEFT panel: brandColor bg (unchanged)                       │
│     ├── RIGHT panel: NO photo — controls panel instead              │
│     │     background = getPanelShade(brandColor) OR .glass fallback │
│     │     ├── [preview icon]  → onPreview(paikka) → setPreviewPaikka│
│     │     ├── [edit/jatka icon] → <a href=.../business/[id] | ...>  │
│     │     ├── [invite-link icon] (conditional: approved && !kesken) │
│     │     │      → handleCopyInviteLink()                           │
│     │     └── [rejection-info icon] (conditional: rejected)         │
│     │            → opens RejectionReasonPopup                       │
│     │                 ├── shows rejection_reason text                │
│     │                 └── CTA "Korjaa tiedot" → /business/[id]      │
│     └── status pill (bottom corner of controls panel, D-05)         │
│        │
│        ▼ (click preview icon)
│   <AnimatePresence><PreviewModal paikka={previewPaikka} /></...>    │
│        ├── CalloutCard (replaces PaikkaKortti — PREV-04)            │
│        ├── DiagonaalKortti (real photo — consumer view)             │
│        └── PaikkaSheet preview={true}  (unchanged, already there)   │
│
│  /business/[id] (EditMode via WizardInner) — save any section
│        │
│        ▼
│   POST /api/business/update-paikka  { paikka_id, section, data }
│        ├── ownership check (existing)
│        ├── section-based update to liikuntapaikat (existing)
│        └── NEW (D-07): if business_paikka_links.claim_status === 'rejected'
│                → UPDATE claim_status='pending', rejection_reason=null
│
│   LivePreviewPane (sidebar, both onboarding + edit modes)
│        ├── CalloutCard        (existing)
│        ├── DiagonaalKortti    (existing, real photo — D-14)
│        └── PaikkaSheet preview={true}   ◄── NEW 3rd section (LIVEPREV-05)
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
No new files/folders required — all changes are edits to existing files:
```
app/
├── components/
│   ├── DiagonaalKortti.tsx      # add dashboard-variant prop bundle + controls panel
│   ├── PreviewModal.tsx         # swap PaikkaKortti section → CalloutCard
│   ├── PaikkaSheet.tsx          # fix booking-link preview guard (PREV-05)
│   └── RejectionReasonPopup.tsx # NEW — small popup component (D-06), if not inlined into DiagonaalKortti
├── business/
│   ├── page.tsx                 # VenueRow/StatusCard replaced by DiagonaalKortti-card grid
│   └── onboarding/LivePreviewPane.tsx  # add PaikkaSheet as 3rd section
├── api/business/
│   ├── update-paikka/route.ts   # add auto-resubmit-on-save (D-07)
│   └── reapply/route.ts         # DELETE (dead code after D-07 — see Pitfall 1)
lib/
└── branding/brandingResult.ts   # add getPanelShade()-style export (D-03), alongside getContrastColor
```

### Pattern 1: Optional-prop-bundle variant switching (existing convention)
**What:** `DiagonaalKortti` already switches behavior based on prop *presence*, not a discrete `mode` enum: `onOpen` present → click-catcher navigates; absent → no-op overlay (Phase 62 D-04/D-05). `onToggleTodo` present → bookmark button renders; absent → nothing renders.
**When to use:** Follow this exact convention for the new dashboard-controls panel — e.g. a single optional prop object (`dashboardActions?: { status, onPreview, onEditOrContinue, onCopyInviteLink?, onShowRejectionInfo? }`) whose presence swaps the RIGHT panel from photo-mode to controls-mode. This keeps every other call site (`Etusivu.tsx`, `PreviewModal`, `LivePreviewPane`, `admin/[id]`) completely untouched, matching D-02's explicit "unchanged" requirement.
**Example:**
```typescript
// Source: app/components/DiagonaalKortti.tsx (existing pattern, lines 245-255)
{onOpen ? (
  <div role="button" tabIndex={0} onClick={() => onOpen(paikka)} ... />
) : (
  <div className="absolute inset-0 block z-10" />
)}
```

### Pattern 2: Contrast-aware color derivation from a single brand color
**What:** `getContrastColor(hex)` (`lib/branding/brandingResult.ts`) returns pure black/white via YIQ luminance — used today by both `CalloutCard` and `DiagonaalKortti` for *text* contrast against `brandColor`. `CalloutCard.tsx` separately has **unexported** `darkenHex(hex, amount)` and `lightenHex(hex, amount)` helpers used to build its accent ring's conic-gradient.
**When to use:** D-03 needs a *panel background* shade that (a) visibly differs from `brandColor` and (b) is a "complementary shade" — not literal text-contrast black/white, and not a full hue-rotation (unnecessary complexity, not what "complementary shade" means in the user's framing per the Specific Ideas section: "must never render the same color", not "must be the color wheel's opposite hue"). The simplest correct approach: reuse `getContrastColor(brandColor)` to decide direction (light color → darken; dark color → lighten), then apply the existing `darkenHex`/`lightenHex` math at a fixed amount (e.g. 0.25–0.35) to `brandColor` itself. This is a two-line composition of code that already exists and is already proven to work, just needs to be exported from a shared module instead of staying private to `CalloutCard.tsx`.
**Example:**
```typescript
// Source: app/components/CalloutCard.tsx lines 34-56 (private helpers — extract to lib/branding/brandingResult.ts)
function darkenHex(hex: string, amount: number): string { /* ... */ }
function lightenHex(hex: string, amount: number): string { /* ... */ }

// NEW composition for D-03 (suggested addition to brandingResult.ts):
export function getPanelShade(brandColor: string, amount = 0.3): string {
  return getContrastColor(brandColor) === '#000000'
    ? darkenHex(brandColor, amount)   // brandColor reads as "light" → darken it for the panel
    : lightenHex(brandColor, amount)  // brandColor reads as "dark" → lighten it for the panel
}
```

### Pattern 3: Lightweight dialog without a UI library (AuthModal pattern — recommended base for D-06 popup)
**What:** `AuthModal.tsx` is a **smaller, more appropriate base** for the rejection-reason popup than `PreviewModal.tsx` (which is a large, page-length modal). `AuthModal` demonstrates the full lightweight-popup pattern already proven in this codebase: `role="dialog"` + `aria-modal="true"`, `AnimatePresence` backdrop + panel fade/slide, Escape-key handler via `useEffect`, backdrop-click-to-close, `stopPropagation` isn't even needed because the panel isn't nested inside another clickable region here.
**When to use:** Base the rejection-reason popup (D-06) on this exact structure: small `max-w-sm` glass panel, X close button, body text (rejection reason), one CTA button. No new dependency needed.
**Example:**
```typescript
// Source: app/components/AuthModal.tsx lines 141-178 (structure to mirror, trimmed to relevant parts)
<AnimatePresence>
  {open && (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" aria-modal="true" role="dialog">
      <motion.div className="absolute inset-0 bg-[rgba(0,0,0,0.40)]" onClick={handleClose} ... />
      <motion.div className="relative glass rounded-2xl p-6 w-full max-w-sm mx-4" ...>
        <button onClick={handleClose} className="glass-btn w-7 h-7 rounded-full ..."><X /></button>
        {/* body content + CTA button */}
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Adding a `mode`/`variant` string enum to `DiagonaalKortti` instead of an optional prop bundle:** breaks the established "prop presence toggles behavior" convention (Phase 62 D-04/D-05) and forces every existing call site to pass an explicit `variant="default"` — unnecessary churn on 4+ files that D-02 explicitly says must stay unchanged.
- **Repurposing `/api/business/reapply/route.ts` instead of writing new logic in `update-paikka/route.ts`:** the reapply route's entire design (find-rejected-row, 24h cooldown, single explicit trigger) is architecturally a *different* operation from "flip status as a side effect of an unrelated section save." Trying to call the reapply endpoint from inside `update-paikka` (or vice-versa) creates two Route Handlers each partially responsible for the same state transition — confusing and untestable. Add the logic directly where the save happens.
- **Building a full modal/dialog component library abstraction for one popup:** D-06 needs exactly one dialog. `AuthModal`'s inline pattern is already proven, small, and dependency-free — do not introduce a generic `<Popover>` primitive for a single use case.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text/background contrast color | New luminance math | `getContrastColor()` (`lib/branding/brandingResult.ts`) | Already YIQ-correct, already used by `CalloutCard` + `DiagonaalKortti` |
| Lighten/darken a hex color | New color-math | `darkenHex`/`lightenHex` (currently private to `CalloutCard.tsx` — extract, don't duplicate) | Already proven, already handles edge cases (clamping 0-255, regex validation) |
| Venue status derivation (kesken/pending/approved/rejected) | New status logic in the dashboard card | `deriveVenueStatus()` (`lib/venueStatus.ts`) | Single source of truth already used by `business/page.tsx`; has existing test coverage (`lib/venueStatus.test.ts`) |
| Copy-to-clipboard invite link | New clipboard logic | Existing `handleCopyInviteLink()` pattern in `VenueRow` (`navigator.clipboard.writeText` + 2s "copied" toggle) | Already works, just relocate into the new controls panel |
| Dialog/popup shell | New Popover dependency | `AuthModal.tsx`'s hand-rolled dialog structure | Proven pattern in this exact codebase, zero new dependencies (matches v3.1's "no new runtime dependencies" constraint) |

**Key insight:** Every visual and logical primitive this phase needs already exists somewhere in the codebase in working form. The task is consolidation and relocation, not invention — the main engineering judgment call is *where* the new dashboard variant's props live and *how* `update-paikka/route.ts` gains its one new conditional branch.

## Runtime State Inventory

> This phase is a UI/component refactor, not a rename/refactor/migration of identifiers, database schema, or infrastructure naming. The Runtime State Inventory trigger (rename/rebrand/string-replacement/migration) does not apply.

**Not applicable.** No renamed strings, no schema changes, no new env vars, no OS-level registrations. The one behavioral/data change (D-07's `claim_status` flip) is a new code path, not a migration of existing data — verified by reading `update-paikka/route.ts` in full: it currently has zero `claim_status` writes, so there is nothing to migrate, only new logic to add.

## Common Pitfalls

### Pitfall 1: Assuming `/api/business/reapply` still has active callers
**What goes wrong:** A planner might try to "wire the new rejection-info popup's CTA to call `/api/business/reapply`" since that's the only existing status-flip endpoint visible in the codebase.
**Why it happens:** The route still exists, is fully functional, and its name (`reapply`) sounds exactly like what D-06's CTA needs.
**How to avoid:** Per D-07 ("no distinct lähetä uudelleen button/step anywhere") and D-06 (CTA navigates to the edit flow, does NOT itself resubmit), the rejection-info popup's CTA must be a plain navigation link to `/business/{paikka_id}` (or `/business/onboarding?paikka_id=...` for kesken venues) — **not** a fetch call. The actual status flip happens later, automatically, the next time the user saves any section via `update-paikka`. `grep -rn "reapply" app/` (excluding `.claude/worktrees/`) confirms the only current callers are `business/page.tsx`'s `handleReapply` (invoked by `StatusCard`'s and `VenueRow`'s "Hae uudelleen" buttons) — both of which D-07 removes. After removal, `app/api/business/reapply/route.ts` and its route folder become fully unreferenced.
**Warning signs:** Any new fetch call to `/api/business/reapply` in the dashboard-card or popup code; leaving `route.ts` in place with zero remaining callers (dead code, should be deleted per D-07's explicit "Claude's Discretion" resolution guidance — the discretion is *resolved* by this research: delete it).

### Pitfall 2: Forgetting the 24h reapply cooldown was a deliberate anti-flood measure
**What goes wrong:** Deleting `reapply/route.ts` silently drops the `COOLDOWN_MS = 24 * 60 * 60 * 1000` guard (`supabase/migrations/20260610000004_reapply_cooldown.sql` + the route's cooldown check) with no replacement — a business could now flip-flop `rejected`→`pending`→(admin rejects again)→edit-save→`pending` indefinitely, once per section-save, with no rate limit at all.
**Why it happens:** The cooldown lived entirely inside the reapply route being deleted; `update-paikka/route.ts` has no equivalent concept today.
**How to avoid:** This is a genuine product-behavior gap CONTEXT.md does not address — flag it explicitly for the planner/user rather than silently dropping the safeguard. Two options: (a) accept the removal (a "save" is a legitimate user action per-section, arguably less spam-prone than a dedicated reapply button since it requires actually editing something), or (b) port the same cooldown check into `update-paikka/route.ts`'s new conditional branch. Documented in Open Questions below — **do not decide silently**.
**Warning signs:** No mention of cooldown/rate-limiting in the phase's plan; `20260610000004_reapply_cooldown.sql` migration becoming pure dead weight (harmless — it only added a column/index, not a trigger — but worth noting in the plan's assumptions).

### Pitfall 3: Missing the existing PREV-05 violation in `PaikkaSheet`'s booking link
**What goes wrong:** LIVEPREV-05 is implemented by simply adding `<PaikkaSheet preview={true} .../>` to `LivePreviewPane`, assuming `preview={true}` already makes everything inert (as the CONTEXT.md's open question #6 hoped to confirm). It does NOT — the booking-link `<a target="_blank" href={paikka.varauslinkki}>` (PaikkaSheet.tsx, "Booking link" section) has no `!preview` condition, unlike the close/bookmark buttons (`{!preview && (...)}`) and the "show on map" row (`paikka.latitude != null && paikka.longitude != null && !preview`).
**Why it happens:** The booking link was added in an earlier phase focused on the standalone sheet, before `preview` mode's "purely visual" contract (introduced when `PreviewModal` first used `PaikkaSheet`) was fully audited against every interactive element.
**How to avoid:** Add `!preview &&` to the `isSafeUrl(paikka.varauslinkki)` conditional (or otherwise disable/hide the button when `preview`). Verified by reading `PaikkaSheet.tsx` lines 246-257 directly — confirmed present in current code, not a hypothetical.
**Warning signs:** Manual/UAT test: open `PreviewModal` or `LivePreviewPane` for a venue with a `varauslinkki` set, click "Varaa aika" — if it opens a new tab, PREV-05 is violated. This same bug already exists today in `PreviewModal` (which already renders `PaikkaSheet preview={true}`), so it is pre-existing scope, not phase-63-introduced, but PREV-05 explicitly requires it be fixed as part of this phase since it names "kaikki preview-näkymät" (all preview surfaces).

### Pitfall 4: Status pill assumed to already exist in `DiagonaalKortti`
**What goes wrong:** BIZPANEL-06 says "status-pillit sijoitetaan kortin kuvan alakulmaan" (status pills placed in the image's bottom corner) in a tone that implies an existing pill is being repositioned. Reading the full current `DiagonaalKortti.tsx` (280 lines) confirms **no status pill exists there today** — status pills currently only exist in `VenueRow`'s separate badge (`business/page.tsx` lines 122-138) and `StatusCard`'s banner. This is new UI to build, not a relocation within `DiagonaalKortti`.
**Why it happens:** BIZPANEL-06's Finnish wording reads naturally as a repositioning instruction because the *overall dashboard-list* already has a status concept (just not on the card itself).
**How to avoid:** Design the new status pill from scratch using `VenueRow`'s existing 4-state color logic (`bg-[rgba(17,17,17,0.08)] text-[rgba(17,17,17,0.55)]` kesken / `bg-green-100 text-green-700` approved / `bg-red-50 text-red-600` rejected / `bg-amber-100 text-amber-700` pending) as the copy-source for colors and `t('statusKesken'|'statusApproved'|'statusRejected'|'statusPending')` for labels — both already exist and are correct, just need a new `text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full` pill positioned absolutely in the controls panel's bottom corner (D-05), mirroring how `DiagonaalKortti`'s existing bottom-corner buttons (`onShowMap`, `onToggleTodo`) are positioned (`absolute bottom-2/bottom-3 left-2/right-3 z-20`).
**Warning signs:** Note that `VenueRow`'s pending-status color (`bg-amber-100 text-amber-700`) technically conflicts with CLAUDE.md's stated rule that amber is reserved exclusively for the "Sponsoroitu" badge — this conflict **predates** Phase 63 and is out of this phase's scope to fix; carrying the existing color forward for consistency is correct, introducing a *new* amber usage elsewhere would not be.

### Pitfall 5: `PreviewModal`'s `CalloutCard` needs the same `?? 0` lat/lng shim `LivePreviewPane` already uses
**What goes wrong:** `CalloutCard`'s prop type is `p: Liikuntapaikka & { latitude: number; longitude: number }` (non-nullable) — passing a raw `Liikuntapaikka` (whose `latitude`/`longitude` are `number | null`) straight into `PreviewModal`'s new CalloutCard section will fail TypeScript compilation.
**Why it happens:** `PreviewModal` currently passes the same `paikka` object to `PaikkaKortti` and `DiagonaalKortti`, both of which accept nullable lat/lng — `CalloutCard` is stricter.
**How to avoid:** D-12 already flags this — reuse `LivePreviewPane`'s exact shim: `{ ...paikka, latitude: paikka.latitude ?? 0, longitude: paikka.longitude ?? 0 }`.
**Warning signs:** TypeScript build error on `PreviewModal.tsx` referencing `CalloutCard`'s prop type.

## Code Examples

### DiagonaalKortti's existing bottom-corner button positioning (reuse exactly for the new status pill / icon buttons)
```typescript
// Source: app/components/DiagonaalKortti.tsx lines 257-275 (existing, verified)
{hasCoords && (
  <button
    onClick={e => { e.stopPropagation(); e.preventDefault(); onShowMap?.(paikka) }}
    aria-label={t('showOnMap')}
    className={`absolute bottom-2 left-2 z-20 w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease] ${accentColor ? '' : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'}`}
    style={accentColor ? { backgroundColor: accentColor, color: accentContrastText } : undefined}
  >
    <MapPin className="w-3.5 h-3.5" />
  </button>
)}
```

### `VenueRow`'s existing invite-link copy logic (relocate verbatim into the new controls panel)
```typescript
// Source: app/business/page.tsx lines 107-114 (existing, verified)
const [copied, setCopied] = useState(false)
function handleCopyInviteLink() {
  const url = window.location.origin + '/business/liity?paikka_id=' + link.paikka_id
  navigator.clipboard.writeText(url)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

### `update-paikka/route.ts`'s existing ownership-check pattern (extend, don't replace, for D-07)
```typescript
// Source: app/api/business/update-paikka/route.ts lines 38-51 (existing, verified)
const { data: linkRow, error: linkError } = await supabaseAdmin
  .from('business_paikka_links')
  .select('paikka_id')   // NEW: also select claim_status here for D-07's branch
  .eq('business_account_id', user.id)
  .eq('paikka_id', paikka_id)
  .maybeSingle()
if (!linkRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
// ... NEW: after the section update succeeds, if linkRow.claim_status === 'rejected':
//   UPDATE business_paikka_links SET claim_status='pending', rejection_reason=null,
//   submitted_at=now() WHERE business_account_id=user.id AND paikka_id=paikka_id
//   AND claim_status='rejected'  (same optimistic WHERE-guard pattern as reapply/route.ts
//   line 77-78, protects against concurrent duplicate saves)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Explicit "Hae uudelleen" (reapply) button + dedicated Route Handler with 24h cooldown | Implicit auto-resubmit as a side effect of any section save | This phase (D-07) | Removes one user-facing step, removes the explicit rate-limit unless ported (see Pitfall 2) |
| `VenueRow` plain-text list item | `DiagonaalKortti` dashboard-variant card | This phase (BIZPANEL-06/07) | Dashboard now visually matches the consumer-facing card language everywhere else in the app |
| `PaikkaKortti` in `PreviewModal` | `CalloutCard` in `PreviewModal` | This phase (PREV-04) | Matches `LivePreviewPane`'s existing 2-card pattern, removes the broken `/paikat` link noted in Phase 62's D-07 deferral |

**Deprecated/outdated:**
- `PaikkaKortti` usage inside `PreviewModal`: being removed this phase (PREV-04). Note `PaikkaKortti.tsx` itself is NOT deleted — it's still used elsewhere (main list view `LiikuntapaikatLista`) per CLAUDE.md's card structure section; only `PreviewModal`'s specific usage is removed.
- `app/api/business/reapply/route.ts`: becomes fully dead code after D-07 ships (see Pitfall 1) — recommend deletion, not just leaving unreferenced.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Complementary shade" (D-03) is best satisfied by darken-or-lighten of `brandColor` itself (reusing `CalloutCard`'s existing `darkenHex`/`lightenHex`), not a true hue-rotation/complementary-color-wheel calculation | Architecture Patterns, Pattern 2 | If the user actually wants a hue-shifted complementary color (opposite side of the color wheel), the darken/lighten approach would still satisfy "must never render the same color" (Specifics section) but may not match the user's mental model of "complementary" — low risk since D-03's own wording says "extend the same getContrastColor()-style derivation," which is a luminance-based technique, not a hue-wheel one |
| A2 | Deleting `/api/business/reapply/route.ts` (rather than leaving it unreferenced) is the correct disposition | Pitfall 1, State of the Art | Low risk — grep confirms zero non-planning-doc callers once `business/page.tsx`'s two "Hae uudelleen" buttons are removed per D-07; if a future phase wants an explicit re-trigger UI, it would need new logic anyway since the cooldown/lookup semantics no longer match the new auto-resubmit flow |
| A3 | The 24h reapply cooldown does NOT need to be ported into `update-paikka/route.ts`'s new logic, since D-07/CONTEXT.md is silent on it | Pitfall 2 | Medium risk — if the user did implicitly expect the cooldown preserved (anti-flood protection for the admin queue), shipping without it re-opens a spam vector Phase ~57/reapply-cooldown was built to close. Flagged explicitly in Open Questions — planner should surface this to the user rather than silently deciding either way |
| A4 | Icon-button popup for D-06 should be a brand-new small component (not reusing `PreviewModal`'s large overlay) based on `AuthModal`'s structure | Architecture Patterns, Pattern 3 | Low risk — this is explicitly Claude's Discretion per CONTEXT.md; `AuthModal` is objectively the closer size/complexity match, but `PreviewModal`'s pattern would also technically work if the planner prefers one less new component |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Should the 24-hour reapply cooldown be preserved when auto-resubmit-on-save replaces the explicit reapply button?**
   - What we know: The cooldown exists today specifically to prevent flooding the admin approval queue with rapid repeated resubmissions (`reapply/route.ts` comment, `20260610000004_reapply_cooldown.sql` migration). D-07 removes the only call site that enforces it.
   - What's unclear: CONTEXT.md doesn't address this — it's a genuine gap between "auto-resubmit-on-save" as a UX simplification and the anti-abuse reasoning that motivated the original cooldown.
   - Recommendation: Surface to the user/planner as an explicit decision point before implementation: (a) drop the cooldown entirely (lower risk if edit-and-save requires deliberate user effort per section, unlike a single reapply-button click), or (b) port the same `updated_at`-based 24h check into `update-paikka/route.ts`'s new branch. Given no real users yet (per STATE.md's "given no real users yet" precedent from Phase 59), (a) is the lower-friction default, but this should be a stated decision, not a silent omission.

2. **Should `PaikkaSheet`'s booking-link fix (Pitfall 3) be scoped as part of this phase's PREV-05 work, or flagged as a separate pre-existing bug fix?**
   - What we know: The bug already affects `PreviewModal` today (pre-dates Phase 63), and PREV-05's requirement text ("Kaikki preview-näkymät ... ovat puhtaasti visuaalisia") explicitly covers "business-dashboardin preview-modaali" — which already exists and already has this hole.
   - What's unclear: Whether the user considers this in-scope "fix it because PREV-05 says so" or out-of-scope "pre-existing bug, separate ticket."
   - Recommendation: Treat as in-scope — PREV-05 is being verified/re-affirmed this phase specifically because `LivePreviewPane` is gaining a third `PaikkaSheet` section, and shipping a known click-through hole in the same breath as declaring "purely visual" would fail the phase's own acceptance criteria. One-line fix (`&& !preview` on the existing conditional).

## Environment Availability

Skipped — this phase has no external tool/service/runtime dependencies beyond the project's own Next.js dev/build toolchain, which is already running (per `npm run dev`/`npm run build` scripts already in use throughout prior phases).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest` via `vitest.config.ts`, `[VERIFIED: package.json + vitest.config.ts]`) |
| Config file | `vitest.config.ts` — `environment: 'node'`, includes `lib/**/*.test.ts`, `app/**/__tests__/*.test.ts`, `tests/**/*.test.ts` |
| Quick run command | `npx vitest run tests/api/update-paikka.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZPANEL-06 | Dashboard card renders DiagonaalKortti with status pill in bottom corner | manual-only (visual UI, no component test harness exists for DiagonaalKortti in this repo) | — | N/A — component tests not established for this file |
| BIZPANEL-07 | Controls panel always visible (no hover/tap reveal), all 4 icon buttons present per status | manual-only (visual UI) | — | N/A |
| PREV-04 | `PreviewModal` renders `CalloutCard` instead of `PaikkaKortti` | manual-only (visual UI, snapshot-free codebase convention) | — | N/A |
| LIVEPREV-05 | `LivePreviewPane` renders `PaikkaSheet` as 3rd section | manual-only (visual UI) | — | N/A |
| PREV-05 | No click inside any preview surface triggers navigation or a side effect | unit (route/logic) + manual (visual click-through audit) | `npx vitest run tests/api/update-paikka.test.ts` for the D-07 backend half; manual click-audit for the visual half | ✅ existing test file, needs new cases added |
| D-07 (auto-resubmit-on-save, backend half of PREV-05/BIZPANEL-06 status flow) | `update-paikka` flips `rejected`→`pending` on any section save | unit | `npx vitest run tests/api/update-paikka.test.ts` | ✅ exists — extend with a "rejected venue save resets claim_status" case, mirroring `tests/api/submit.test.ts`'s existing mock structure for `business_paikka_links` |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/update-paikka.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- No new test files needed — `tests/api/update-paikka.test.ts` already exists with the exact chainable-Supabase-mock pattern needed to add D-07's new branch (see its existing structure: `mockMaybeSingle`, `mockUpdate`, `mockUpdateEq`, `mockGetUser`). Add a case where the ownership-check mock returns a row with `claim_status: 'rejected'` and assert a second `.update()` call resets it to `'pending'`.
- No component-level test harness exists for `DiagonaalKortti`, `PreviewModal`, `LivePreviewPane`, or `PaikkaSheet` today (the whole codebase's frontend testing convention is manual/UAT-only for visual components, automated-only for API routes and `lib/` pure functions — matching the existing `lib/venueStatus.test.ts` / `lib/branding/brandingResult.test.ts` pattern). This phase should follow that same convention rather than introducing new component-testing infrastructure.

*(Gaps found: one test-extension task, no new test files/framework needed.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no (new code) | Unaffected — existing JWT-verification pattern in `update-paikka/route.ts` (`supabaseAdmin.auth.getUser(token)`) is reused unchanged |
| V3 Session Management | no | Unaffected |
| V4 Access Control | yes | `update-paikka/route.ts`'s existing ownership check (E-01: "any linked claimant may save") already gates the new D-07 branch — no new access-control surface, but the new claim_status write must stay inside the same already-verified `business_account_id` + `paikka_id` scope, never trusting a client-supplied `claim_status` value |
| V5 Input Validation | no (new inputs) | The new logic reads `claim_status`/`rejection_reason` server-side from the DB (via the already-authenticated `business_account_id`), not from request body — no new untrusted input surface introduced |
| V6 Cryptography | no | Not applicable — no new crypto/secrets handling |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client sends `claim_status` directly in the `update-paikka` request body to self-approve/self-clear rejection without an actual rejected row existing | Tampering / Elevation of Privilege | Do NOT accept `claim_status` as a request field — the new D-07 logic must derive "was this venue rejected?" from a server-side `SELECT` (already-existing `linkRow` query, extended to also select `claim_status`), never from client input. This mirrors the existing `reapply/route.ts`'s correct pattern (looks up `claim_status = 'rejected'` server-side, never trusts a client flag). |
| Concurrent duplicate section-saves both flip `claim_status` and both send duplicate admin notification emails | Denial of Service (minor — notification spam) | Use the same `WHERE claim_status = 'rejected'` guard on the UPDATE that `reapply/route.ts` already uses (line 77-78: `.eq('id', rejectedLink.id).eq('claim_status', 'rejected')`) so only the first of two racing requests actually performs the transition; check `updateError`/row-count before sending any notification email, consistent with `onboarding/submit/route.ts`'s existing non-critical-email-failure pattern |
| Rejection-reason popup (D-06) renders `rejection_reason` as raw HTML instead of text | Tampering (stored XSS if an admin's rejection reason ever contained HTML) | Render as plain text (React's default JSX text interpolation, `{rejectionReason}`), never `dangerouslySetInnerHTML` — matches how `StatusCard`/`VenueRow` already render this exact field today (verified: `t('dashboardStatusRejectedBody', { reason: rejectedLink.rejection_reason })` is a next-intl interpolation, not raw HTML) |

## Sources

### Primary (HIGH confidence)
- `app/components/DiagonaalKortti.tsx` (full file read) — current props, clip-path silhouette implementation, `getContrastColor` usage, click-catcher pattern, bottom-corner button positioning
- `app/business/page.tsx` (full file read) — `VenueRow`/`StatusCard` current implementation, `handleReapply`, status pill color logic, invite-link copy logic
- `app/api/business/reapply/route.ts` (full file read) — cooldown logic, ownership/lookup pattern
- `app/api/business/update-paikka/route.ts` (full file read) — confirmed no existing `claim_status` mutation, section-based update pattern, ownership check
- `app/api/business/onboarding/submit/route.ts` (full file read) — confirmed unconditional `claim_status: 'pending'` reset (unrelated code path to D-07)
- `app/business/WizardInner.tsx` (full file read) — confirmed `EditMode` uses `update-paikka` via `editMode={true}` step components, not `onboarding/submit`
- `app/business/[id]/page.tsx` (full file read) — confirmed `/business/[id]` renders `WizardInner mode="edit"`
- `app/components/PreviewModal.tsx` (full file read) — current stack order (`PaikkaKortti` → `DiagonaalKortti` → `PaikkaSheet`)
- `app/business/onboarding/LivePreviewPane.tsx` (full file read) — current 2-section stack, `useLivePreview()` context usage
- `app/components/PaikkaSheet.tsx` (full file read, lines 1-345) — confirmed preview-mode guards on close/bookmark/show-on-map, confirmed MISSING guard on booking link
- `app/components/CalloutCard.tsx` (full file read) — confirmed zero click handlers, confirmed private `darkenHex`/`lightenHex` helpers, confirmed non-nullable lat/lng prop type
- `app/components/AuthModal.tsx` (full file read) — lightweight dialog pattern candidate for D-06
- `lib/branding/brandingResult.ts` (full file read) — `getContrastColor()` implementation (YIQ formula)
- `lib/venueStatus.ts` (full file read) — `deriveVenueStatus()` logic
- `messages/fi.json` `Business` namespace (full dump) — confirmed existing translation keys (`reapplyCta`, `rejectionReasonLabel`, `previewLabelCallout`, etc.) and absence of keys needed for new icon-button aria-labels/CTA text
- `tests/api/update-paikka.test.ts`, `tests/api/submit.test.ts` (read) — existing Vitest chainable-mock pattern for Route Handler tests
- `package.json`, `vitest.config.ts` (read) — verified exact installed versions and test-runner config
- `app/globals.css` (grepped) — `.glass`/`.glass-btn`/`.glass-hover` exact CSS definitions

### Secondary (MEDIUM confidence)
- `.planning/phases/62-venuepage-konsolidaatio/62-CONTEXT.md` — D-05/D-07 prior-phase decisions carried forward
- `.planning/STATE.md` — v3.1 "no new runtime dependencies" constraint, Phase 59's "no real users yet" precedent

### Tertiary (LOW confidence)
- None — all findings in this document are verified by direct file reads in this session, not training-data recall or web search (this phase is 100% internal-codebase research with zero external dependency questions).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages, all versions read directly from `package.json`
- Architecture: HIGH — every pattern cited was read in full from the actual files being modified, not inferred
- Pitfalls: HIGH — Pitfalls 1, 3, 4, 5 are all confirmed by direct code inspection (not speculation); Pitfall 2 is a flagged product-decision gap, correctly marked as an open question rather than asserted as fact

**Research date:** 2026-07-01
**Valid until:** 30 days (stable internal codebase, no external API/library version drift risk since no new dependencies are introduced)
