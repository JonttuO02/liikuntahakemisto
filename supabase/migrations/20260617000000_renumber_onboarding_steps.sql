-- One-time data migration for Phase 50 step reorder (FLOW-04)
--
-- Decision log:
--   D-06: StepPaikka moves out of the numbered wizard and becomes a page-level pre-phase,
--         shifting every remaining wizard step down by 1 (StepMediat 2->1 ... StepEsikatselu 6->5).
--         In-flight onboarding_draft rows at current_step >= 2 must be decremented by 1 so they
--         resume on the correct step under the new numbering. Drafts at current_step = 1 (still on
--         the old StepPaikka) are left unchanged at 1 — under the new flow, current_step = 1 with an
--         un-started wizard means "show the StepPaikka pre-phase," which is exactly where that user
--         already was.
--
-- This is a one-time data migration only — no DDL, no CHECK constraint. D-07's tightened bounds
-- check lives in app/api/business/onboarding/save-step/route.ts, not in the schema.

UPDATE onboarding_draft SET current_step = current_step - 1 WHERE current_step >= 2;
