# Phase 41: Navigation Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 41-navigation-foundation
**Areas discussed:** Nav visual style, Nav links completeness, Active state highlighting

---

## Nav visual style

| Option | Description | Selected |
|--------|-------------|----------|
| Dark horizontal bar | bg-[#111111] strip, full width, white text links | |
| Glass top bar | Same .glass-nav as consumer NavBar but horizontal | |
| Minimal text nav | White background, borderless link row | |
| Glass pill (consumer pattern) | Same NavPill.tsx pattern (MoreHorizontal expand) | ✓ |

**User's choice:** Same glass pill design as the current consumer nav (NavPill.tsx). The user clarified that NavBar.tsx is an old/dead file — the actual consumer nav is the fixed glass pill system inside Etusivu.tsx and NavPill.tsx.

**Notes:** User also requested that NavBar.tsx, NavBarServer.tsx, and ActaLogo.tsx be deleted as dead files. The user noted "ACTA" is no longer the brand name — it's now "AKTIIVI". Those files contain the old branding and are not referenced anywhere.

---

## Nav links completeness

| Option | Description | Selected |
|--------|-------------|----------|
| Single glass pill top-right (Profiili + Kirjaudu ulos) | MoreHorizontal pill, business links expand left | ✓ |
| Sticky full-width glass bar | All links always visible | |
| Two pills (left + right) | Mirror consumer layout exactly | |

**User's choice (pill layout):** Single top-right glass pill with Profiili + Kirjaudu ulos. Kartta as a separate fixed bottom-left button.

**User's choice (Dashboard):** "AKTIIVI Business" brand text/logo in the top-left linking to /business. User clarified /business IS the dashboard page — no separate dashboard page.

**User's choice (Kartta):** Show the map button now, linking to /business/map. Acceptable to 404 until Phase 42 ships.

**Notes:** User also requested "AKTIIVI" branding (not "ACTA") for the top-left brand element.

---

## Active state highlighting

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — bold/filled on active route | usePathname() detects current route, active item gets bold/filled | ✓ |
| No active state | All links look the same | |

**User's choice:** Active state highlighting — active nav item gets `text-[#111111] font-bold` styling. Use `usePathname()` to detect current route.

---

## Claude's Discretion

- Exact pixel values for bottom-left Kartta button positioning (safe-area-inset pattern)
- Whether to extract the kirjaudu form as a separate client component file or keep inline
- Icon for Kartta button (Map from lucide-react)
- Exact "AKTIIVI Business" label markup (text-only vs combined with AktiiviLogo)
- Sign-out navigation: `router.push('/business/kirjaudu')` after signOut (vs router.refresh)

## Deferred Ideas

None — discussion stayed within phase scope.
