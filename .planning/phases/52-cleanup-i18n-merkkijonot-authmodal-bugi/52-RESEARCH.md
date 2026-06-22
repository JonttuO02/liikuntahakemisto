# Phase 52: Cleanup — i18n-merkkijonot & AuthModal-bugi - Research

**Researched:** 2026-06-22
**Domain:** i18n string verification + JS operator-precedence bug verification (no new code, primarily an audit phase)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Codebase scouting (done during this discussion) found that 3 of the 4 named components — `AuthModal.tsx`, `CalloutCard.tsx`, and `app/paikat/[id]/page.tsx` — already fully use `next-intl` (`useTranslations`/`getTranslations`) for every user-visible string, and the EN translations in `messages/en.json` are correct (verified `Auth`, `PaikkaKortti`, `PaikkaPage` namespaces).
- **D-02:** The AuthModal precedence bug (CLEAN-07) is **already fixed** — `git blame app/components/AuthModal.tsx` shows the `(message.includes(A) || message.includes(B)) && message.includes('6')` parenthesization was corrected in commit `85eea7a8` (2026-06-04), well before this v3.0 roadmap was written. The equivalent logic in `app/business/rekisteroidy/page.tsx` is also already correctly parenthesized.
- **D-03 (user decision):** Scope stays exactly as ROADMAP.md states it — only the 4 named components/files (`AuthModal`, `CalloutCard`, `app/paikat/[id]/page.tsx`, `DiagonaalKortti`). No broader sweep of the rest of the app for hardcoded Finnish strings — that's explicitly out of scope for this phase. User rejected widening scope when offered the option.
- **D-04 (user decision):** Given D-01/D-02, the planner/researcher must **verify each success criterion against the actual current code** rather than assume implementation work is needed from the ROADMAP wording alone. Where a criterion already holds true, the plan should confirm it with evidence (file + line references) rather than write redundant code.
- **D-05 (user decision):** `DiagonaalKortti.tsx` line 224 has `alt={`Kuva: ${paikka.nimi}`}` — a hardcoded Finnish string ("Kuva:" = "Image:") in an `<img>` alt attribute. This is screen-reader-only / fallback-only text, not visible to sighted users. **User explicitly decided NOT to fix this now** — "Texts that are not visible for users don't have to be fixed at this time. It can be done later." This is captured as a deferred idea, not in this phase's scope.

### Claude's Discretion
- If the researcher/planner find any other hardcoded Finnish strings within the 4 named files/components that weren't surfaced during this discussion's scouting, fix them as part of this phase (they're in-scope by file, even if not explicitly named above). **Research outcome: none found** — see Phase Requirements and Summary sections below.
- How to format/document the "already fixed, verified" evidence in the plan (e.g., a verification checklist vs. inline file/line citations) is left to the planner.

### Deferred Ideas (OUT OF SCOPE)
- **DiagonaalKortti.tsx alt text fix** — `alt={`Kuva: ${paikka.nimi}`}` (line 224) is a hardcoded Finnish screen-reader string. User decided this can wait for a future cleanup phase since it's not visible to sighted users. When picked up later: either add a `venuePhotoAlt` i18n key with `{name}` interpolation, or mark the image `alt="" aria-hidden` (decorative) since the venue name is already shown as visible text on the card — pick whichever the team prefers at that time.
</user_constraints>

## Summary

This phase's ROADMAP wording implies implementation work, but independent verification against the current codebase (not just CONTEXT.md's prior scouting) confirms: **all 3 success criteria already hold true in the current code.** No source code changes are required to satisfy CLEAN-06 or CLEAN-07. The phase's actual deliverable is a verification artifact (file+line evidence) proving this, plus a deliberate decision to leave one known item (`DiagonaalKortti.tsx` line 224 `alt` text) unfixed per user instruction (D-05).

I independently re-read all 4 named files (`AuthModal.tsx`, `CalloutCard.tsx`, `app/paikat/[id]/page.tsx`, `DiagonaalKortti.tsx`) end-to-end, re-ran `git show` on the precedence-fix commit, cross-checked the AuthModal-equivalent logic in `app/business/rekisteroidy/page.tsx`, and grepped all 4 files for Finnish-specific characters (`äöåÄÖÅ`) to catch anything CONTEXT.md's scouting might have missed. Result: zero new hardcoded user-visible Finnish strings found beyond the already-known, already-deferred `DiagonaalKortti.tsx:224` alt text. All Finnish-character matches in `DiagonaalKortti.tsx` outside line 224 are code comments (not rendered to users).

**Primary recommendation:** Plan this phase as a verification-and-document phase, not an implementation phase. Tasks should produce evidence (file/line citations, git commit references) confirming each success criterion, explicitly close out CLEAN-06/CLEAN-07 as already-satisfied, and leave the deferred alt-text item untouched and documented as out-of-scope. If a `tdd_mode`/nyquist gate requires an automated check, add one lightweight unit test for `mapError`'s precedence logic (currently zero test coverage exists for it) — this is the only piece of "new work" genuinely justified by this phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| UI string localization (AuthModal, CalloutCard, paikkasivu, DiagonaalKortti) | Browser / Client (client components) + Frontend Server (SSR for `app/paikat/[id]/page.tsx`) | — | `AuthModal.tsx`/`CalloutCard.tsx`/`DiagonaalKortti.tsx` are `'use client'` components using `useTranslations()`; `app/paikat/[id]/page.tsx` is an RSC using `getTranslations()` server-side. Both are next-intl's standard split — no API/backend involvement. |
| Error-message classification (`mapError`/`mapBusinessError`) | Browser / Client | — | Pure client-side string-matching function operating on Supabase Auth SDK error messages already received in the browser; no server round-trip needed to classify. |
| Translation source of truth | N/A (static JSON, bundled at build time) | — | `messages/en.json` / `messages/fi.json` are static resources read by next-intl's provider at request/render time — not a runtime "tier" in the traditional sense, but worth noting plans should never need to touch the API/DB tier for this phase. |

## Standard Stack

### Core
No new libraries are introduced by this phase. The project's existing i18n stack is sufficient and already fully applied to the 4 named files.

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-intl` | `^4.13.0` [VERIFIED: package.json] | Client (`useTranslations`) + server (`getTranslations`) i18n for Next.js App Router | Already the project's chosen i18n library across the entire codebase (CONTEXT.md D-01, confirmed independently) |

**Installation:** None required — `next-intl` is already a dependency (`package.json` line 26).

## Package Legitimacy Audit

Not applicable — this phase installs no new external packages. `next-intl` is a pre-existing dependency, not a new install.

## Architecture Patterns

### System Architecture Diagram

```
EN-locale user request
        │
        ▼
┌───────────────────────────┐
│ next-intl middleware/      │  (locale resolution — pre-existing,
│ provider (app-level,       │   not touched by this phase)
│ outside the 4 named files) │
└──────────┬─────────────────┘
           │ locale = 'en'
           ▼
┌─────────────────────────────────────────────┐
│ RSC: app/paikat/[id]/page.tsx                │
│  const t = await getTranslations('PaikkaPage')│ ──► reads messages/en.json["PaikkaPage"]
│  renders t('location'), t('showOnMap'), etc. │
└─────────────────┬─────────────────────────────┘
                   │ passes Liikuntapaikka data down (no string handoff)
                   ▼
┌─────────────────────────────────────────────┐      ┌─────────────────────────────────────┐
│ Client: app/components/CalloutCard.tsx        │      │ Client: app/components/DiagonaalKortti.tsx│
│  const t = useTranslations('PaikkaKortti')    │      │  const t = useTranslations('PaikkaKortti') │
│  const tLajit = useTranslations('Lajit')      │      │  const tLajit = useTranslations('Lajit')    │
│  renders t('membershipOnly') etc.             │      │  renders t('openNow'), t('closed'), etc.    │
│                                                │      │  ⚠ line 224: alt={`Kuva: ${nimi}`} — NOT    │
│                                                │      │    routed through next-intl (deferred D-05)│
└────────────────────────────────────────────────┘      └──────────────────────────────────────────────┘

Separately, on user-initiated auth action:
┌─────────────────────────────────────────────┐
│ Client: app/components/AuthModal.tsx          │
│  const t = useTranslations('Auth')            │
│  supabase.auth.signInWithPassword/signUp      │
│        │ (Supabase SDK call, browser-side)    │
│        ▼ on error: error.message (EN string   │
│          from Supabase, locale-independent)   │
│  mapError(error.message)                       │  ──► pure function, string match → key
│        │                                       │
│        ▼                                       │
│  t(mapError(...))                              │  ──► looks up messages/en.json["Auth"][key]
│  setError(translatedString)                    │
└─────────────────────────────────────────────┘
```

### Recommended Project Structure
No structural changes — this phase touches existing files only, no new files/folders.

### Pattern: Verification-only phase task structure
**What:** Tasks assert (via grep/read + git history) that code already satisfies a requirement, rather than writing new code.
**When to use:** When CONTEXT.md (D-04) explicitly instructs verification over blind implementation.
**Example:**
```bash
# Verification task pattern — confirm via tooling, not assumption
grep -n 'useTranslations\|getTranslations' app/components/AuthModal.tsx
git show 85eea7a -- app/components/AuthModal.tsx   # confirm precedence fix commit
```

### Anti-Patterns to Avoid
- **Re-implementing already-correct i18n:** Do not add redundant `useTranslations` calls or duplicate message keys to "fix" something that already works — this risks introducing regressions (e.g., duplicate keys in `messages/en.json`/`fi.json`) for zero behavioral change.
- **Widening scope beyond the 4 named files:** D-03 explicitly locks scope to `AuthModal.tsx`, `CalloutCard.tsx`, `app/paikat/[id]/page.tsx`, `DiagonaalKortti.tsx`. Do not grep the rest of the app for Finnish strings as part of this phase.
- **"Fixing" the deferred alt-text without a decision:** `DiagonaalKortti.tsx:224` is explicitly deferred (D-05) — touching it would violate the user's documented decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale-aware string lookup | A custom dictionary/switch-statement i18n shim | `next-intl`'s `useTranslations`/`getTranslations` (already used everywhere) | Already the established pattern; introducing a second mechanism for any leftover string would fragment the i18n approach |

**Key insight:** There is nothing to hand-roll in this phase — it's a verification phase, not a build phase.

## Common Pitfalls

### Pitfall 1: Assuming ROADMAP wording implies undone work
**What goes wrong:** Planner reads "fix AuthModal's error-message classification" in the ROADMAP/phase description and creates implementation tasks to "fix" a bug that was already fixed 18 days earlier (2026-06-04, commit `85eea7a8`).
**Why it happens:** ROADMAP.md was likely drafted from an older debt list (STATE.md's "Carry-Forward" section references "P30-GAP"/"P30-BUG" from Phase 30's verification, written before the Phase 30 follow-up commits `0f4f375`, `ffdd05a`, `85eea7a` actually closed those gaps).
**How to avoid:** Always re-verify the current file state and git history before writing tasks — never trust a backlog/roadmap line item's premise without checking the code first (this is exactly what CONTEXT.md's D-04 already instructs).
**Warning signs:** A "bug fix" task with no actual diff to apply.

### Pitfall 2: Conflating code comments with user-visible strings
**What goes wrong:** A blind grep for Finnish characters (`äöåÄÖÅ`) in `DiagonaalKortti.tsx` returns 5 matches; treating all 5 as i18n violations would create false-positive "fix" tasks for code comments (lines 63, 71-72, 146-147) that no user ever sees.
**Why it happens:** Naive grep doesn't distinguish JSX text/attribute content from `//` comments.
**How to avoid:** Manually inspect each match's context — only `alt={`Kuva: ${paikka.nimi}`}` (line 224) is rendered to a user (as a screen-reader-only `alt` attribute); the rest are developer comments explaining clip-path math.
**Warning signs:** A task list with more than 1 fix item for `DiagonaalKortti.tsx`.

### Pitfall 3: Missing test coverage for the precedence fix means future regressions go undetected
**What goes wrong:** `mapError`/`mapBusinessError`'s precedence logic has no unit test. A future refactor could silently reintroduce the `A || B && C` bug and nothing would catch it until a real user hits the edge case (a Supabase error message containing the literal substring "password" alone without "6", which is the original bug's exact failure mode).
**Why it happens:** The original fix (commit `85eea7a8`) shipped without an accompanying test.
**How to avoid:** Add a small `mapError.test.ts` (or equivalent) unit test asserting the precedence behavior explicitly, since `vitest` is already configured in this project (see Validation Architecture below).
**Warning signs:** Zero test files currently exist under `app/components/__tests__/` or `lib/**/*.test.ts` for this logic.

## Code Examples

### Verified: `mapError` precedence logic (current, correct)
```typescript
// Source: app/components/AuthModal.tsx lines 27-33 (current HEAD)
if (
  (message.includes('Password should be at least') ||
    message.includes('password')) &&
  message.includes('6')
) {
  return 'errorWeakPassword'
}
```

### Verified: equivalent logic in business registration (current, correct)
```typescript
// Source: app/business/rekisteroidy/page.tsx lines 20-23 (current HEAD)
if (
  (message.includes('Password should be at least') || message.includes('password')) &&
  message.includes('6')
) {
  return 'errorWeakPassword'
}
```

### Verified: i18n usage pattern across all 4 files (current, correct)
```typescript
// AuthModal.tsx line 38 (client)
const t = useTranslations('Auth')

// CalloutCard.tsx lines 74-75 (client)
const t = useTranslations('PaikkaKortti')
const tLajit = useTranslations('Lajit')

// app/paikat/[id]/page.tsx line 38 (server, async)
const t = await getTranslations('PaikkaPage')

// DiagonaalKortti.tsx lines 43-44 (client)
const t = useTranslations('PaikkaKortti')
const tLajit = useTranslations('Lajit')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Hardcoded Finnish strings in AuthModal/CalloutCard/paikkasivu/DiagonaalKortti, broken precedence in `mapError` | Fully i18n'd via `next-intl`, precedence parenthesized correctly | Phase 30 follow-up commits, 2026-06-04 (`0f4f375`, `ffdd05a`, `85eea7a8`) — before this v3.0 milestone was even scoped | The ROADMAP.md line item for Phase 52 describes a state of the code that no longer exists; this phase's real job is verification + documentation, not implementation |

**Deprecated/outdated:** None — no library or pattern changes involved.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | — | — | All claims in this research were independently verified via direct file reads, `git show`/`git log`, and `grep` against the current working tree — none are based on unverified training knowledge or external sources. |

**This table is empty:** All claims in this research were verified directly against the current codebase state (file reads, git history, grep) — no user confirmation needed for any factual claim. (Note: the *deferred* alt-text fix approach in CONTEXT.md's "Deferred Ideas" section offers two implementation options for a *future* phase — that is a forward-looking design choice, not a claim about current state, and is explicitly out of scope here.)

## Open Questions

1. **Should a regression test be added for `mapError`'s precedence logic even though it's not strictly required by CLEAN-07's wording?**
   - What we know: CLEAN-07 says "precedence-bugi korjattu" (precedence bug fixed) — past tense, already satisfied. No test currently exists.
   - What's unclear: Whether the phase's definition of done requires net-new test coverage, or whether documenting/verifying the existing fix is sufficient.
   - Recommendation: Given `nyquist_validation: true` in `.planning/config.json`, add one lightweight `vitest` unit test for `mapError` (and optionally `mapBusinessError`) covering the exact precedence-bug regression case. This is cheap (single pure function, no mocking needed) and closes the one real gap found in this research (Pitfall 3). Treat as in-scope "supporting work" rather than scope creep, since it directly hardens CLEAN-07's already-fixed behavior.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 [VERIFIED: package.json + `npx vitest --version`] |
| Config file | `vitest.config.ts` (project root) — `include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts']` |
| Quick run command | `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts` (once created) |
| Full suite command | `npx vitest run` |

**Note:** `package.json` has no `"test"` script defined — `npx vitest run` must be invoked directly (or the planner should add a `"test": "vitest run"` script as a trivial setup task). No test files exist anywhere in the project outside `node_modules` — this is genuinely greenfield test infrastructure for the codebase, not specific to this phase.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-06 | EN-locale user sees English strings in AuthModal/CalloutCard/paikkasivu/DiagonaalKortti (no hardcoded Finnish) | manual-only (visual/file-assertion) | `grep -n 'useTranslations\|getTranslations' <file>` + manual EN-locale screenshot/click-through per the existing Nyquist UAT pattern used elsewhere in this project | N/A — file/line assertion, no test file needed |
| CLEAN-07 | `mapError`/`mapBusinessError` precedence produces correct classification when message matches multiple conditions | unit | `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts -t "weak password"` | ❌ Wave 0 — file does not exist, must be created |

**Justification for CLEAN-06 being manual-only:** This requirement is "does the user see English text" — already proven via file+line citation (every string in the 4 files routes through `t()`/`tLajit()` calls bound to verified namespaces in `messages/en.json`). A unit test asserting `messages/en.json` has all required keys would be testing the JSON file's structure, not actual rendered behavior — lower value than the direct verification already performed in this research. If the planner wants an automated guard, a simple "all `t()`/`tLajit()` keys used in these 4 files exist in both `en.json` and `fi.json`" script-based check is a reasonable middle ground, but is not strictly required since both have already been manually cross-checked exhaustively in this research.

### Sampling Rate
- **Per task commit:** `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts` (once the test exists)
- **Per wave merge:** `npx vitest run` (full suite — currently 0 other tests, so this is fast)
- **Phase gate:** Full suite green before `/gsd-verify-work`; CLEAN-06 verified via the file+line evidence table already compiled in this research (re-confirm no drift occurred between research and execution)

### Wave 0 Gaps
- [ ] `app/components/__tests__/AuthModal.mapError.test.ts` — covers CLEAN-07 (precedence regression test for `mapError`); consider also covering `mapBusinessError` from `app/business/rekisteroidy/page.tsx` in the same file or a sibling test, since both have the identical bug-prone pattern.
- [ ] `package.json` `"scripts"."test"` entry — currently missing; add `"test": "vitest run"` so `npm test` works (trivial setup, not a blocker, but worth doing while touching this area).
- [ ] No shared fixtures/conftest-equivalent needed — `mapError` is a pure function with zero dependencies.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no (this phase doesn't change auth flow logic, only error-message *display* text and a string-matching helper) | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no — `mapError`/`t()` only consume/display pre-existing Supabase Auth SDK error strings and static translation keys; no new user input is parsed | — |
| V6 Cryptography | no | — |

**Rationale for "no" across the board:** This phase touches zero authentication logic, zero session/token handling, and zero new input surfaces. It only verifies (a) that display strings are correctly localized and (b) that a pure string-classification function's boolean logic is correct. Neither introduces an attack surface change. No threat-pattern table is needed.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| CLEAN-06 | EN-locale käyttäjä ei näe kovakoodattuja suomenkielisiä merkkijonoja AuthModal/CalloutCard/paikkasivu/DiagonaalKortti-komponenteissa | Verified via direct file read of all 4 files + grep for Finnish characters: zero user-visible hardcoded Finnish strings exist except the explicitly deferred `DiagonaalKortti.tsx:224` (D-05, out of scope). All other strings route through `next-intl` with confirmed-correct EN translations in `messages/en.json` (`Auth`, `PaikkaKortti`, `PaikkaPage`, `Lajit` namespaces, lines 77-97, 9-22, 282-291, 306-316 respectively). |
| CLEAN-07 | AuthModal-virheviestien luokittelun operaattori-precedence-bugi korjattu (`A \|\| B && C` → `(A \|\| B) && C`) | Verified via `git show 85eea7a8` (2026-06-04): exact diff shows the precedence fix applied to `AuthModal.tsx`. Current code (lines 27-33) confirms `(A || B) && C` form is live. Equivalent logic in `app/business/rekisteroidy/page.tsx` (lines 20-23, `mapBusinessError`) independently confirmed to use the same correct parenthesization. No remaining fix needed; recommend adding regression test coverage (see Validation Architecture, Pitfall 3). |

## Sources

### Primary (HIGH confidence)
- Direct file reads of `app/components/AuthModal.tsx`, `app/components/CalloutCard.tsx`, `app/paikat/[id]/page.tsx`, `app/components/DiagonaalKortti.tsx` (current working tree, 2026-06-22)
- `git show 85eea7a8` — exact diff of the precedence-bug fix commit
- `git log --oneline --follow -- app/components/AuthModal.tsx` — confirms commit chronology (Phase 30 fixes precede this v3.0 phase)
- Direct file read of `app/business/rekisteroidy/page.tsx` (lines 1-60)
- Direct file read of `messages/en.json` (Auth, PaikkaKortti, PaikkaPage, Lajit namespaces)
- `grep` for Finnish-specific characters (`äöåÄÖÅ`) across all 4 named files
- `package.json` — confirms `next-intl ^4.13.0`, `vitest ^4.1.7`, absence of a `"test"` script
- `vitest.config.ts` — confirms test include globs and `@` path alias
- `npx vitest --version` — confirms Vitest 4.1.7 is runnable in this environment
- `.planning/config.json` — confirms `nyquist_validation: true`

### Secondary (MEDIUM confidence)
- None — no external documentation lookups were needed for this phase (no new libraries, no new APIs).

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack introduced; existing `next-intl`/`vitest` versions confirmed directly from `package.json` and CLI.
- Architecture: HIGH — all 4 files read in full; data flow traced directly from source.
- Pitfalls: HIGH — each pitfall is grounded in a specific, independently-reproduced finding (git history, grep results) from this research session, not external speculation.

**Research date:** 2026-06-22
**Valid until:** Effectively permanent for the verification claims (they are tied to specific git commits and file content that won't drift backward) — but re-verify file state if any other phase touches these 4 files before Phase 52 executes.
