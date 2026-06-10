---
plan: 35-08
phase: 35-admin-hyvaksyntajarjestelma
status: complete
completed_at: "2026-06-10"
---

# Plan 35-08 Summary — /admin page + AdminApplicationList

## What was done

**app/admin/page.tsx** — Server Component with dual auth guard:
- Auth guard: unauthenticated users → redirect('/')
- is_admin guard: non-admin users → notFound() (404)
- Fetches all `claim_status = 'pending'` applications via supabaseAdmin (bypasses RLS)
- Passes applications to AdminApplicationList client component

**app/admin/AdminApplicationList.tsx** — Client Component:
- Approve button: calls POST /api/admin/approve, removes item from list on success
- Reject flow: inline reason input → Confirm button → POST /api/admin/reject, removes item
- Uses createBrowserSupabase().auth.getSession() for JWT token at call time
- Empty state: "Ei odottavia hakemuksia."
- Error display on failed API calls

## Self-Check: PASSED

- [x] Server Component with is_admin guard
- [x] Non-admin gets 404, unauthenticated gets redirect
- [x] Approve/reject actions wire to /api/admin/approve and /api/admin/reject
- [x] Files compile without TypeScript errors
