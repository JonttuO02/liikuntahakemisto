# Phase 42 — Dashboard & Map

**Goal**: Business users have a useful dashboard home and a standalone map to explore venues  
**Milestone**: v2.0 Business UX & Navigation  
**Requirements**: BIZUX-03, BIZUX-04  
**Depends on**: Phase 41 complete (BusinessNav present, /business/kirjaudu redirect in place)

---

## Success Criteria

1. The `/business` dashboard shows a card reflecting the current approval state (pending / approved / rejected) with a reapply CTA when rejected
2. The dashboard lists the business's venues with per-venue status badges (pending / approved / rejected)
3. The dashboard has quick-action links to the map (`/business/map`) and to each venue's edit wizard
4. `/business/map` renders a full-screen map showing all published venues
5. A pill toggle on `/business/map` switches between "Kaikki paikat" and "Omat paikat", filtering pins to the business's own venues
6. Tapping a map pin on `/business/map` opens PaikkaSheet for that venue

---

## Wave Structure

```
Wave 1 — Dashboard redesign (no dependencies)
  42-01-PLAN.md — Dashboard redesign + i18n additions

Wave 2 — New /business/map route (no external dependencies, can run after wave 1)
  42-02-PLAN.md — /business/map full-screen map + PaikkaSheet integration
```

Wave 2 can start independently since it creates new files. Both waves touch i18n files — Wave 1 adds dashboard keys, Wave 2 adds map keys. Run sequentially to avoid merge conflicts on messages/*.json.

---

## Plan Index

| Plan | Title | Wave | Status |
|------|-------|------|--------|
| 42-01-PLAN.md | Dashboard redesign | 1 | Not started |
| 42-02-PLAN.md | /business/map route | 2 | Not started |

---

## Threat Model

- **Auth bypass on map data**: `/business/map` fetches all published venues (public data) — no auth required for "Kaikki paikat". "Omat paikat" filter uses `createBusinessBrowserClient().auth.getUser()` client-side — if unauthenticated, fallback to empty array (no error throw).
- **PaikkaSheet in business context**: PaikkaSheet accepts `todo` / `onToggleTodo` props designed for consumer use. Pass `todo={false}` and a no-op handler — never wire up bookmark mutations in the business map context.
- **RLS on liikuntapaikat**: Anon key can read `published=true` rows. Business map uses anon key for "Kaikki paikat" — this is correct and intentional.
