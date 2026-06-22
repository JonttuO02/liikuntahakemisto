# Phase 53: Google Places -datan ja synkkauksen poisto - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 53-google-places-datan-ja-synkkauksen-poisto
**Areas discussed:** Fate of unclaimed Google rows, Cron/schedule removal, business_managed column fate, Reviews/suosikit audit depth

---

## Fate of unclaimed Google rows

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete | Removes rows entirely; cascades to reviews/suosikit; irreversible without backup | ✓ |
| Soft delete (published=false) | Row stays, reviews/suosikit preserved, hidden from search | |
| Keep with staleness signal | Row stays fully visible, flagged as possibly outdated | |

**Follow-up question:** Are reviews/suosikit on these venues expected to have real users attached?

| Option | Description | Selected |
|--------|-------------|----------|
| Mostly empty / seed-only | Low-stakes cascade loss | |
| Some real user data exists | Worth weighing more carefully | |
| Not sure — audit first | Let row counts inform the decision | |
| Other (free text) | — | ✓ |

**User's choice:** Hard delete. Free-text follow-up: "All reviews/suosikit data is only made as test purposes so all of those can be deleted."
**Notes:** Removes the need for soft-delete/staleness-signal complexity — confirmed disposable data simplifies the deletion to a straightforward provenance-checked DELETE.

---

## Cron/schedule removal

| Option | Description | Selected |
|--------|-------------|----------|
| Manual only — I run it myself | No automated scheduler | |
| Vercel dashboard cron | Configured outside vercel.json, needs removal there | |
| Not sure — I'll check | Will verify before phase execution | ✓ (initial) |

**Follow-up:** Claude explained how to check Vercel dashboard → Settings → Cron Jobs.

| Option | Description | Selected |
|--------|-------------|----------|
| I'll check before execution | Note as pre-execution checklist item | |
| Already confident it's manual-only | Proceed assuming no scheduler | |
| Other (free text) | — | ✓ |

**User's choice:** "I dont even have vercel account or this project linked to vercel."
**Notes:** Definitively resolves the question — there is no Vercel project link at all, so no Vercel Cron Jobs config can exist. No external scheduler of any kind. Decommission simplifies to deleting the route file only.

---

## business_managed column fate

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it untouched | Out of scope for DATA-11/12 | |
| Audit references, decide after | Grep usages, defer column changes | |
| Drop it now if unused elsewhere | Drop as part of this phase's migration | |
| Other (free text) | — | ✓ |

**User's choice:** "What is business_managed used for?" — Claude ran a grep and found it's used in `PaikkaSheet.tsx`, `PaikkaKortti.tsx`, `DiagonaalKortti.tsx` (verified-business `BadgeCheck` badge), `app/page.tsx`, `app/business/map/page.tsx`, `app/api/business/create-paikka/route.ts`, `lib/branding/brandingResult.ts`, `lib/types.ts`.

After seeing the grep results, re-asked with the recommended option highlighted:

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it untouched (recommended) | Verified-business badge flag, unrelated to Google-data decommission | ✓ |
| Revisit later, separate phase | Note as deferred idea for any future rename/clarification | |

**Notes:** Confirms Anti-Pattern 3 from `.planning/research/ARCHITECTURE.md` — the column is load-bearing well beyond the sync route's exclusion filter.

---

## Reviews/suosikit audit depth

| Option | Description | Selected |
|--------|-------------|----------|
| Row-count SELECT before/after (recommended) | Quick count comparison, no formal backup | ✓ |
| Full pg_dump backup first | Extra safety net despite disposable data | |

**User's choice:** Row-count SELECT before/after.
**Notes:** Consistent with the "test data, disposable" finding from the venue-fate discussion — a full backup was judged unnecessary overhead.

---

## Claude's Discretion

- Exact SQL/migration structure (SELECT-first dry-run, then DELETE) — left to planner/executor.
- Whether the deletion runs as a one-off SQL script/Supabase migration vs. a small admin endpoint — implementation detail for planning.

## Deferred Ideas

- business_managed rename/clarification (e.g. to `is_verified_business`) — future phase, not bundled with Phase 53.
- GOOGLE_PLACES_API_KEY removal — natural follow-up cleanup once route + data are gone, not part of DATA-11/12's stated scope.
