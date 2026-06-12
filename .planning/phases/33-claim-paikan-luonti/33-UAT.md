---
phase: 33
phase_name: Claim & paikan luonti
uat_started: 2026-06-11
status: in_progress
tests_total: 6
tests_passed: 0
tests_failed: 0
tests_skipped: 0
---

# Phase 33 UAT — Claim & paikan luonti

**Goal:** Verify that a business user can claim an existing venue or create a new one, with correct visibility rules and status placeholders.

**Success Criteria:**
1. Business user can search for an existing venue and submit a claim — venue stays visible to public throughout
2. If no venue found by search, user can create a new venue — saved as published=false, not visible before admin approval
3. Both claim and new venue are linked to the business account via business_paikka_links

---

## Test Cases

| # | Description | Status | Notes |
|---|-------------|--------|-------|
| T-01 | Claim flow: search → select → submit → pending status shown | PASS | Redirects to onboarding wizard instead of pending placeholder — intentional, kept as-is |
| T-02 | Claimed venue remains visible on public homepage | PASS | |
| T-03 | "Jo hallittu" indicator on already-claimed venues in search | PASS | |
| T-04 | Create flow: fill nimi+osoite+kaupunki → submit → pending status shown | PASS | Redirects to onboarding wizard — consistent with T-01 |
| T-05 | Newly created venue NOT visible on homepage (published=false) | — | |
| T-06 | Returning business user with linked venue sees Path B (status), not search UI | — | |

---

## Test Results

