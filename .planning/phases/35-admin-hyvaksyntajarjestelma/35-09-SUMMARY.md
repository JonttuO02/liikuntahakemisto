---
plan: 35-09
phase: 35-admin-hyvaksyntajarjestelma
status: complete
completed_at: "2026-06-10"
---

# Plan 35-09 Summary — /admin/[id] detail view

## What was done

**app/admin/[id]/page.tsx** — Server Component:
- Same dual auth guard as /admin/page.tsx
- Invalid (non-numeric) ID → notFound()
- Fetches full application data including business_accounts, liikuntapaikat (all fields)
- Fetches business email via supabaseAdmin.auth.admin.getUserById()
- photo_urls constructed with storageUrl() helper: SUPABASE_URL + /storage/v1/object/public/business-media/
- Displays: applicant section, venue section, photos grid, pricing, contact info
- Back link ← to /admin list

## Self-Check: PASSED

- [x] Server Component with is_admin guard
- [x] photo_urls mapped through storageUrl() for full public URLs
- [x] SectionLabel + Field helper components defined inline
- [x] All venue fields (nimi, osoite, kaupunki, laji, kuvaus, puhelin, varauslinkki, hinta_kuvaus) displayed
- [x] File compiles without TypeScript errors
