# Phase 56: Claim/create-rework — luo paikka alusta + nimikäytäntö - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt
**Areas discussed:** Name normalization rules, Where the two names get written, What happens to claim entirely, Duplicate-venue safety net

---

## Name normalization rules

| Option | Description | Selected |
|--------|-------------|----------|
| Trim + collapse whitespace only | Preserve exact casing | |
| Trim + collapse + Title Case | Force Title Case on every word | |
| Trim + collapse + cap max length | Trim/collapse + enforce max length, no casing changes | ✓ |

**User's choice:** Trim + collapse + cap max length.

| Option | Description | Selected |
|--------|-------------|----------|
| 200 chars, shared lib/ helper | First shared name-normalization utility in codebase | ✓ |
| 500 chars, inline per-route | Match existing `.slice(0,500)` convention | |
| 200 chars, inline per-route | Tighter length, no new helper | |

**User's choice:** 200 chars, shared lib/ helper.

| Option | Description | Selected |
|--------|-------------|----------|
| Forward-only, no retroactive backfill | Only new writes get normalized | ✓ |
| Backfill existing rows too | One-time UPDATE on existing data | |

**User's choice:** Forward-only, no retroactive backfill.

---

## Where the two names get written

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — write directly, no new columns (recommended) | yritysNimi → company_name, toimipisteNimi → nimi | (modified) |
| No — stage both in onboarding_draft first | New columns + backfill | |

**User's choice:** Custom — confirmed the "write directly, no new columns" approach but with a key modification: `liikuntapaikat.nimi` must be the **combined** string of yritysNimi + toimipisteNimi (not toimipisteNimi alone), so cards/map pins show full company+branch identity.

| Option | Description | Selected |
|--------|-------------|----------|
| "Yritys — Toimipiste" (em dash) | e.g. "FitLife Oy — Keskusta" | |
| "Yritys Toimipiste" (space, no separator) | e.g. "FitLife Oy Keskusta" | ✓ |
| Toimipiste only if it differs meaningfully | Conditional combination | |

**User's choice:** Space-separated, no separator.

| Option | Description | Selected |
|--------|-------------|----------|
| Required — always two fields, always combined | | |
| Optional — falls back to yritysNimi alone | | ✓ |

**User's choice:** toimipisteNimi optional; falls back to yritysNimi alone if empty.

**Notes:** This deviates from `.planning/research/ARCHITECTURE.md`'s "Pattern 3" recommendation, which assumed `nimi` = branch name alone. CONTEXT.md flags this explicitly as superseding that doc on this one point.

---

## What happens to "claim" entirely

| Option | Description | Selected |
|--------|-------------|----------|
| Delete outright — route, step, and dead UI all removed | | (initially asked, redirected) |
| Keep claim-paikka route dormant, remove only the UI | | |

**User's choice (first pass):** Custom/scope-creep — proposed that claiming should no longer be removed at all, but instead changed so it sends an access-request to the controlling business account instead of activating onboarding directly.

**Claude's response:** Flagged that this contradicts ROADMAP.md's locked Phase 56 success criterion #3 (second business must still get 409 on an already-linked venue). Asked the user to choose between deferring the idea or amending the roadmap now.

| Option | Description | Selected |
|--------|-------------|----------|
| Defer the access-request idea, keep 409-reject for Phase 56 | | ✓ |
| Expand Phase 56 to include the access-request flow now | | |

**User's choice:** Defer the access-request idea; Phase 56 keeps the existing 409-reject behavior.

**Follow-up — back to the original claim-removal question:**

| Option | Description | Selected |
|--------|-------------|----------|
| Delete outright — route, steps, dead UI all removed | | ✓ |
| Keep claim-paikka route dormant, remove only the search/claim UI | | |

**User's choice:** Delete outright.

---

## Duplicate-venue safety net

| Option | Description | Selected |
|--------|-------------|----------|
| Accept the risk as-is, no detection | | (initially asked, redirected) |
| Soft warning using existing name+city query | | |

**User's choice (first pass):** Custom/scope-creep again — proposed restoring a full search step: search existing venues, and if found, ask for access to control; otherwise create from scratch.

**Claude's response:** Flagged that this now also contradicts ROADMAP.md's locked Phase 56 success criterion #1 (no existing-venue search; always create from scratch) — same underlying idea as the prior redirect, now touching a second locked criterion. Asked the user to choose between deferring everything to a new phase, or pausing to amend the roadmap.

| Option | Description | Selected |
|--------|-------------|----------|
| Defer it all to a new future phase; Phase 56 stays create-only | | ✓ |
| Stop and amend ROADMAP.md now before continuing this discussion | | |

**User's choice:** Defer it all to a new future phase; Phase 56 stays create-only.

**Follow-up — back to the original duplicate-detection question:**

| Option | Description | Selected |
|--------|-------------|----------|
| Accept the risk, no detection in Phase 56 | | ✓ |
| Soft non-blocking warning only | | |

**User's choice:** Accept the risk, no detection in Phase 56.

---

## Claude's Discretion

- Exact file/component naming when `ClaimSearchForm.tsx` is reduced to create-only (rename vs. keep name) — left to planner.
- Exact implementation shape of the `business_accounts.company_name` write path (extend `create-paikka` vs. a sibling call) — left to planner, must follow existing JWT-verified `supabaseAdmin` pattern.

## Deferred Ideas

- **Access-request workflow for already-claimed venues** — raised twice during this discussion in slightly different forms (request-on-claim, then search-then-request). Both contradict locked ROADMAP.md success criteria for Phase 56 (#1 and #3). Needs its own future phase with its own roadmap entry, success criteria, and request/grant data model. Adjacent to PROJECT.md's deferred CHAIN-01.
- **Soft duplicate-venue warning at create time** — considered, explicitly rejected for this phase (accepted the risk instead).
