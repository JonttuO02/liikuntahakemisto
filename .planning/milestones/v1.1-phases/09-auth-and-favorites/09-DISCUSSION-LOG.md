# Phase 9: Auth & Favorites - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 09-auth-and-favorites
**Areas discussed:** Sign-in UI form, Heart button placement, NavBar auth state, AI favorites flow

---

## Sign-in UI form

### Q1: How should the auth form appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal overlay | Glass-surface modal, AnimatePresence, consistent with bottom-sheet | ✓ |
| Dedicated /kirjaudu page | Full page, simpler routing | |
| You decide | Let planner pick | |

**User's choice:** Modal overlay

---

### Q2: How does the modal get triggered?

| Option | Description | Selected |
|--------|-------------|----------|
| Heart click when signed out | Action-driven trigger, auto-completes after auth | ✓ |
| Explicit 'Kirjaudu' button in NavBar only | NavBar-only trigger, hearts hidden/greyed | |
| Both: NavBar button + heart click | Both triggers, modal from either | |

**User's choice:** Heart click when signed out (primary trigger)

---

### Q3: Single modal or two separate modals?

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle: single modal | One modal, Kirjaudu/Luo tili tab switch | ✓ |
| Two separate modals | Separate flows | |
| You decide | Let Claude pick | |

**User's choice:** Toggle: single modal, tab/link to switch

---

### Q4: Post-sign-in behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal closes, router.refresh(), heart auto-completes | Seamless, pending action applied | ✓ |
| Modal closes, user must re-tap heart | Simpler, no pending state | |
| You decide | Let Claude determine | |

**User's choice:** Modal closes, page refreshes session, heart action auto-completes

---

## Heart button placement

### Q1: Which surfaces get the heart?

| Option | Description | Selected |
|--------|-------------|----------|
| All three: list cards + map sheet + profile page | Full AUTH-02 coverage | ✓ |
| List cards + profile page only | Skip map bottom sheet | |

**User's choice:** All three surfaces

---

### Q2: What does the heart look like for signed-out users?

| Option | Description | Selected |
|--------|-------------|----------|
| Heart visible, unfilled, tapping opens auth modal | Always visible, natural | ✓ |
| Heart hidden when signed out | No affordance | |
| Heart visible, greyed out, tooltip | Mobile tooltip complexity | |

**User's choice:** Heart visible but unfilled, tapping opens auth modal

---

### Q3: Heart position on list card?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-right corner, absolute positioned | Standard e-commerce, no layout impact | ✓ |
| Bottom row, next to CTA | Inline flow, shifts layout | |
| You decide | Let Claude pick | |

**User's choice:** Top-right corner, absolute positioned over card

---

## NavBar auth state

### Q1: What shows in NavBar when signed in?

| Option | Description | Selected |
|--------|-------------|----------|
| Email/initials + 'Kirjaudu ulos' in dropdown | Minimal, reuses dropdown | ✓ |
| Avatar bubble in top-right | More prominent, requires layout change | |
| You decide | Let Claude pick | |

**User's choice:** User's email/initials + 'Kirjaudu ulos' in hamburger dropdown

---

### Q2: Does NavBar dropdown show 'Kirjaudu' when signed out?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes: 'Kirjaudu' link opens auth modal | Secondary trigger, improves discoverability | ✓ |
| No NavBar auth entry | Minimal NavBar | |

**User's choice:** Yes, 'Kirjaudu' link in dropdown opens auth modal

---

### Q3: How does NavBar know auth state?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side: middleware + getUser() via layout | Correct, validates session | ✓ |
| Client-side: useSession hook | Simpler but unvalidated until getUser() | |

**User's choice:** Server-side: middleware sets cookie, NavBar reads via server component parent

---

## AI favorites flow

### Q1: How do favorites reach /api/saasuositus?

| Option | Description | Selected |
|--------|-------------|----------|
| Client fetches favorites, sends in request body | Simple, fits existing client-to-route pattern | ✓ |
| Server route reads session cookie, queries favorites itself | More secure, slower | |
| You decide | Let Claude pick | |

**User's choice:** Client fetches favorites, sends them in request body

---

### Q2: What does the AI prompt change look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Append favorites list to existing system prompt | Minimal change, max 5-10 | ✓ |
| New prompt template branch | More tailored, doubles maintenance | |
| You decide | Let Claude write minimal addition | |

**User's choice:** Append favorites list to existing system prompt

---

### Q3: Signed-out users (no favorites)?

| Option | Description | Selected |
|--------|-------------|----------|
| No change — same generic recommendation | Consistent, no widget complexity | ✓ |
| Widget shows 'Kirjaudu personoidaksesi' hint | More discoverable, adds UI complexity | |

**User's choice:** No change for signed-out users — same generic recommendation

---

## Claude's Discretion

- Exact favorites table name (suosikit preferred)
- Whether to enable Supabase email confirmation or skip for MVP
- Heart icon details (Lucide Heart, fill state)
- Heart animation (whileTap scale 0.9)
- Whether suosikki state loads eagerly or lazily in Etusivu
- Exact JSX position of heart in bottom-sheet
- Behavior of `app/suosikit/page.tsx` stub (redirect vs. "Kirjaudu ensin")

## Deferred Ideas

- Dedicated /suosikit favorites list page — v1.2
- Password reset flow — v1.2
- Käyttäjäprofiili / settings page — v1.2
- Social login beyond Google — out of scope
- Anonymous Supabase favorites — explicitly excluded per REQUIREMENTS.md
