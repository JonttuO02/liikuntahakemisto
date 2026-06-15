---
plan: 43-03
status: complete
completed_at: "2026-06-15"
---

# Plan 43-03 Summary — RSC Page + BusinessProfiiliClient

## What was built
- `app/business/profiili/page.tsx` — async RSC with auth guard, fetches company_name + contact_phone via createBusinessServerClient, redirects unauthenticated/no-account users
- `app/business/profiili/BusinessProfiiliClient.tsx` — client component with 4 sections: read-only account info, phone edit (type=tel, UPDATE not upsert), language toggle (changeLocaleAction + router.refresh), sign-out (sb-biz-* only)

## Verification (human smoke test)
- BIZPRO-01: company name, email, Yritystili badge visible ✓
- BIZPRO-02: phone saves and persists after reload ✓
- BIZPRO-03: language toggle changes UI strings immediately ✓
- BIZPRO-04: sign-out clears business session, redirects to /business/kirjaudu ✓
- Auth guard: unauthenticated request redirects to /business/kirjaudu ✓
- npx tsc --noEmit: exits 0 ✓
