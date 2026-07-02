---
phase: 64
slug: hallintaoikeuspyynn-t-dashboard-ui
status: draft
shadcn_initialized: true
preset: "style=base-nova, baseColor=neutral, iconLibrary=lucide, cssVariables=true, rsc=true"
created: 2026-07-02
---

# Phase 64 — UI Design Contract

> Visual and interaction contract for the "team management" popup (ACCESS-04 pending requests + ACCESS-07 sub-manager removal) on the `/business` dashboard's `DiagonaalKortti` cards, plus the invite-link signup name field (D-05).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json` present, style `base-nova`) |
| Preset | `style=base-nova, baseColor=neutral, iconLibrary=lucide, cssVariables=true, rsc=true` — pre-existing project config, not re-run for this phase |
| Component library | Base UI (per shadcn `base-nova` style / CLAUDE.md note: "shadcn Base UI doesn't support `asChild`") — **not directly used this phase.** All new UI (popup, buttons, rows) is hand-rolled Tailwind + the project's `.glass`/`.glass-btn` utility classes, matching `RejectionReasonPopup.tsx`/`DiagonaalKortti.tsx`/`app/admin/[id]/page.tsx` exactly. No new shadcn component is installed. |
| Icon library | `lucide-react` ^1.16.0 (already installed) — `Users` (entry-point icon), `Check`/`X` (approve/reject inline icons if used), `Trash2` or `X` (remove-member icon), `X` (popup close, matches `RejectionReasonPopup`) |
| Font | Inter (`next/font/google`, `--font-sans`) for all text this phase. `font-serif` (display headings) is NOT used — this phase has no hero/display-heading surface. |

---

## Spacing Scale

Declared values (must be multiples of 4), reused as-is from the existing codebase — no new scale introduced:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-glyph inset, row internal gaps |
| sm | 8px | `gap-2` between icon buttons, between row elements |
| md | 16px | `gap-3`/`p-4`-scale spacing between popup sections |
| lg | 24px | Popup panel padding (`p-6`, matches `RejectionReasonPopup`) |
| xl | 32px | not used this phase |
| 2xl | 48px | not used this phase |
| 3xl | 64px | not used this phase |

Exceptions:
- `w-7 h-7` (28px) icon buttons — established `DiagonaalKortti`/`RejectionReasonPopup` icon-touch-target size. Applies to: the new entry-point `Users` icon on `DiagonaalKortti`'s `dashboardActions` panel, the popup's close button, and each row's remove-icon button. Do not introduce a different icon-button size in this phase.
- `h-9 px-4` (36px) pill buttons — Approve/Reject buttons inside the popup, matching `app/admin/[id]/page.tsx`'s existing Hyväksy/Hylkää buttons exactly (do not reuse `RejectionReasonPopup`'s `h-10 px-6` CTA size, which is for a single full-width-ish CTA, not a paired inline action set).

---

## Typography

Reused from CLAUDE.md's declared 4-size system — **do not introduce a 5th size or a 3rd weight (600/semibold is forbidden project-wide).**

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label (micro/badge) | 10px (`text-[10px]`) | 700 bold | 1.2 — section labels (`Odottavat pyynnöt` / `Nykyinen tiimi`, uppercase `tracking-widest`), role badges (`Omistaja`/`Jäsen`), status pill on `DiagonaalKortti` (unchanged) |
| Body | 14px (`text-sm`) | 400 normal (member email/role meta) or 700 bold (member display name, button labels) | 1.5 — popup row content, empty/error state body copy |
| Heading | 20px (`text-xl`) | 700 bold | 1.2 — popup title ("Tiimin hallinta"), matches `RejectionReasonPopup`'s `h2` exactly |
| Display | 28–36px (`text-3xl sm:text-4xl font-serif`) | 700 bold | 1.2 | **Not used in this phase** — no hero/display surface introduced. Declared here only for project-wide consistency confirmation. |

---

## Color

Reused from CLAUDE.md's glassmorphism palette — no new colors introduced.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#ffffff` | Page background (unchanged, `/business` dashboard) |
| Secondary (30%) | `rgba(255,255,255,0.60–0.95)` via `.glass` | Popup panel surface (`glass rounded-2xl p-6`), backdrop `rgba(0,0,0,0.40)` behind it |
| Accent (10%) | `#111111` | Entry-point `Users` icon (default/hover text via `.glass-btn` or `panelChipBg`/`panelShadeContrastText` when a `panelShade` is present), popup title text, Approve button fill (`bg-[#111111] hover:bg-[#333333]`), close button hover text |
| Destructive | `#dc2626` (`text-red-600`) | Reject button (`text-red-600 border border-red-200 hover:border-red-400`, outline pill — matches `app/admin/[id]/page.tsx` exactly), remove-member icon default state, remove-confirm button fill (`bg-red-600 hover:bg-red-700 text-white`) |

Accent reserved for: the entry-point `Users` icon button, the popup's `h2` title, the Approve button fill, and the popup close button's hover state. **Never** applied to Reject or Remove controls — those are always `red-600` (destructive), matching the existing admin approve/reject precedent. The owner's disabled remove icon (D-14) uses a third, neutral state: `opacity-40 pointer-events-none text-[rgba(17,17,17,0.35)]` (CLAUDE.md's "Foreground disabled" token) — not accent, not destructive.

---

## Copywriting Contract

All strings go through `next-intl`'s existing `Business` namespace (`messages/fi.json` / `messages/en.json`), Finnish primary + English translation required for every new key — matching every prior phase's i18n pattern. Tone: short, direct, no exclamation marks except on explicit success states (matches `dashboardStatusRejectedTitle`-style existing copy).

| Element | Copy (fi) | Copy (en) |
|---------|-----------|-----------|
| Entry-point icon `aria-label` | "Hallinnoi tiimiä" | "Manage team" |
| Popup title (`h2`) | "Tiimin hallinta" | "Team management" |
| Section label — pending | "Odottavat pyynnöt" | "Pending requests" |
| Section label — team | "Nykyinen tiimi" | "Current team" |
| Empty state (pending) heading | *(no separate heading — single-line body, matches project's compact empty-state convention)* | — |
| Empty state (pending) body | "Ei odottavia pyyntöjä. Uudet hallintaoikeuspyynnöt tähän paikkaan näkyvät tässä." | "No pending requests. New access requests for this venue will appear here." |
| Primary CTA (Approve) | "Hyväksy" | "Approve" |
| Reject button | "Hylkää" | "Reject" |
| Owner's own row label | "(Sinä) Omistaja" | "(You) Owner" |
| Member row role badge | "Jäsen" | "Member" |
| Remove-icon `aria-label` (active) | "Poista käyttöoikeus" | "Remove access" |
| Remove-icon `aria-label` (disabled, owner row) | "Omistajaa ei voi poistaa" | "The owner cannot be removed" |
| Destructive confirmation (inline row, D-10) | "Poistetaanko {nimi} paikan hallinnoijista? Käyttäjä menettää pääsyn välittömästi eikä toimintoa voi perua." → buttons: "Vahvista poisto" / "Peruuta" | "Remove {name} as a manager of this venue? Access is revoked immediately and this cannot be undone." → buttons: "Confirm removal" / "Cancel" |
| Error state (approve/reject/remove request fails) | "Toiminto epäonnistui. Yritä hetken kuluttua uudelleen." | "Something went wrong. Please try again in a moment." |
| Error state (already processed, 409) | "Pyyntö on jo käsitelty." | "This request has already been processed." |
| Invite-signup name field label (D-05) | "Nimi" | "Name" |
| Invite-signup name field placeholder | "Etu- ja sukunimi" | "First and last name" |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none — no new shadcn components installed this phase | not required |
| third-party | none | not applicable |

No new npm packages and no shadcn `add`/`view` calls are needed for this phase (confirmed in `64-RESEARCH.md`: zero new dependencies, hand-rolled Tailwind only).

---

## Component & Interaction Notes

*(Extends the template with phase-specific prescriptive detail the planner/executor need — not part of the 6-dimension checker gate, but load-bearing for implementation.)*

### Entry-point icon (`DiagonaalKortti` `dashboardActions` panel)
- New optional prop, e.g. `onManageTeam?: () => void`, rendered as a 5th possible icon in the existing `flex items-center gap-2` row (`Eye` → `Pencil` → `Link2`/`AlertCircle` (mutually exclusive) → **`Users`, always last**).
- Same button shape as every existing icon in that panel: `w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease]`, with the `panelShade ? {backgroundColor: panelChipBg, color: panelShadeContrastText} : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'` conditional exactly as the other four buttons use.
- Visibility per D-02: render only when the venue has ≥1 pending request OR ≥1 team member beyond the owner. No numeric badge/dot on the icon itself — D-04 explicitly rejects an in-app notification system; showing/hiding the icon is the only signal.
- **Pitfall 6 (from RESEARCH.md):** up to 4 icons can render simultaneously (Preview + Edit + CopyInviteLink + Team). Verify the panel does not wrap to a second row at both `w-full` (mobile) and `sm:w-[396px]` (desktop) before considering the task done.

### Popup (`TeamManagementPopup`, new component)
- Scaffolding copied from `RejectionReasonPopup.tsx` exactly: `fixed inset-0 z-[80]` wrapper, `aria-modal="true" role="dialog"`, backdrop `motion.div` (`bg-[rgba(0,0,0,0.40)]`, `duration: 0.2`), Escape-key `useEffect` listener, backdrop-click-to-close, `X` close button top-right (`glass-btn w-7 h-7 rounded-full ... absolute top-4 right-4`).
- Panel: `glass rounded-2xl p-6 w-full max-w-md mx-4` (wider than `RejectionReasonPopup`'s `max-w-sm` — this popup holds two list sections, not one paragraph). Panel transition identical: `initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}} transition={{duration:0.25, ease:[0.25,0.1,0.25,1]}}`.
- If row count grows, cap the panel body at a fixed max-height with `overflow-y-auto` rather than letting the popup grow unbounded — no specific pixel value mandated by upstream artifacts; use a sensible cap (e.g. `max-h-[60vh]`) and confirm no clipping on mobile `items-end` layout.
- Layout inside panel, top to bottom: `h2` title → "Odottavat pyynnöt" section label + rows (or empty-state body) → "Nykyinen tiimi" section label + rows. Sections separated by `gap-3`/a hairline `border-t border-[rgba(0,0,0,0.07)]` (CLAUDE.md's default border token).

### Pending-request row
- Layout: display name (bold, `text-sm font-bold text-[#111111]`, fallback to email if `display_name` is null) on the left, Approve + Reject buttons on the right (`flex gap-2`, `h-9 px-4 rounded-full text-sm font-bold`, exact classes from `app/admin/[id]/page.tsx` lines 169–184 — Approve filled `bg-[#111111] hover:bg-[#333333] text-white`, Reject outline `text-red-600 border border-red-200 hover:border-red-400`).
- No reason-input step for reject in this popup (D-13 — differs from the admin page's two-step reject-with-reason flow; this is intentionally a simpler one-click reject).
- On click, buttons show a disabled/loading state (`disabled:opacity-60`, matching admin precedent) while the fetch is in flight; on success, the row is removed from the list (optimistic or refetch — planner's call, not a visual-contract concern).

### Current-team row
- Layout: display name (bold) + role badge (`text-[10px] font-bold uppercase tracking-widest`, "Omistaja"/"Jäsen") on the left, remove icon button (`w-7 h-7 rounded-full`, `Trash2` or `X` glyph, `text-red-600` default / `hover:text-red-700`) on the right.
- Owner's own row: always present, labeled "(Sinä) Omistaja", remove icon rendered but `opacity-40 pointer-events-none text-[rgba(17,17,17,0.35)]` (disabled state, D-14) — never omitted from the list.
- Remove click → inline two-state confirm (no separate modal — matches `Don't Hand-Roll` guidance in RESEARCH.md): the row's right side swaps to "Vahvista poisto" (filled `bg-red-600 hover:bg-red-700 text-white`, `h-9 px-4 rounded-full text-sm font-bold`) + "Peruuta" (plain text, `text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111]`), matching the admin page's `rejectingOpen` two-state pattern exactly.

### Invite-link signup name field (D-05)
- Plain text `<input>` in `app/business/rekisteroidy`'s existing form, same visual style as its other fields: `border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] w-full` (matches the admin rejection-reason input's exact class list, the closest existing text-input precedent in this codebase).
- Only shown/required on the invite-path branch of the form (when `paikka_id` is present per the wiring fix in RESEARCH.md Pitfall 1) — not added to the default (non-invite) registration path (per RESEARCH.md Open Question 2's recommendation, kept invite-path-only per D-05's literal scope).

