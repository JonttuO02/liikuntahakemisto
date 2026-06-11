# Phase 38: Business Data Publication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 38-business-data-publication
**Areas discussed:** Badge timing, Trigger scope, Badge visual, Sync protection

---

## Badge Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Only after approval | Set business_managed=true at approval time only via trigger. Remove DEBT-02 business_managed write from claim route. Badge is truthful — only approved venues get checkmark. | ✓ |
| At claim-submit time | Badge appears as soon as a business submits a claim — before admin approves. Simpler (DEBT-02 already done), but premature: badge shows on pending/rejected venues too. | |
| Use is_approved column instead | Add a separate is_approved column. Trigger sets it at approval. | |

**User's choice:** Only after approval
**Notes:** STATE.md flagged this explicitly. DEBT-02 (Phase 37) set business_managed at claim time — Phase 38 partially undoes that. Trigger becomes the single owner of the flag.

Follow-up — created venues:

| Option | Description | Selected |
|--------|-------------|----------|
| At approval only | Trigger sets business_managed=true for all venue types at approval. Created venues stay false until approved. Consistent: badge only post-approval. | ✓ |
| At creation time is fine | Created venues aren't published until approval, so badge never shows pre-approval anyway. Set at create time. | |

**User's choice:** At approval only

---

## Trigger Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Trigger sets both fields; route keeps nothing | Trigger handles all publication. Remove Step 6 from approve route. DB is source of truth. | ✓ |
| Trigger + route Step 6 both set published | Belt-and-suspenders. Redundant. | |

**User's choice:** Trigger sets both fields; route keeps nothing

Follow-up — conditional on link_type:

| Option | Description | Selected |
|--------|-------------|----------|
| Unconditional for all approvals | Always UPDATE published=true AND business_managed=true. For claim venues published is already true (idempotent). Simpler trigger. | ✓ |
| Conditional on link_type | IF link_type='created' THEN set published. Adds branching logic. | |

**User's choice:** Unconditional for all approvals

---

## Badge Visual

| Option | Description | Selected |
|--------|-------------|----------|
| BadgeCheck | Lucide BadgeCheck — shield/badge shape with checkmark. Signals verified/trusted business. | ✓ |
| CheckCircle2 | Lucide CheckCircle2 — circle with checkmark. More generic 'done/verified' feel. | |
| ShieldCheck | Lucide ShieldCheck — shield with checkmark. More security-oriented feel. | |

**User's choice:** BadgeCheck

Follow-up — color/size:

| Option | Description | Selected |
|--------|-------------|----------|
| #111111 (black), 14px | Matches card title color. Subtle, professional. Consistent with monochrome design system. | ✓ |
| Indigo, 14px | Picks up nav/hero indigo palette. | |
| Green (#16a34a), 14px | Same as 'Auki nyt' indicator — risk of confusion with open-status. | |

**User's choice:** #111111 (black), 14px — using currentColor for context-appropriate inheritance

Follow-up — PaikkaSheet hero color:

| Option | Description | Selected |
|--------|-------------|----------|
| White in hero, black elsewhere | PaikkaSheet hero has white text — badge inherits currentColor or explicit white. Context-appropriate. | ✓ |
| Always black | Consistent everywhere but barely visible on indigo hero background. | |

**User's choice:** White in hero, black elsewhere

---

## Sync Protection

| Option | Description | Selected |
|--------|-------------|----------|
| Skip entirely when business_managed=true | Filter out business_managed venues before upsert. Zero writes to approved venues. | ✓ |
| Partial field protection | Upsert only non-editable fields for business_managed venues. Complex. | |
| ignoreDuplicates upsert | Non-obvious and fragile. | |

**User's choice:** Skip entirely when business_managed=true

Follow-up — how to fetch exclusion list:

| Option | Description | Selected |
|--------|-------------|----------|
| Query before upsert | Fetch all place_ids where business_managed=true at sync start. Build exclusion Set. | ✓ |
| Add .neq filter to upsert | Not directly possible with Supabase upsert — same as option 1 in practice. | |

**User's choice:** Query before upsert

---

## Claude's Discretion

- Migration timestamp and filename for the trigger migration
- Whether to wrap trigger UPDATE in BEGIN/EXCEPTION/END block for safe failure handling
- Exact layout for the inline badge (ml-1 vs gap-1 flex wrapper)

## Deferred Ideas

None — discussion stayed strictly within the four PUB requirements.
