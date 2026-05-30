---
slug: auth-session-loss-suosikit
status: resolved
created: "2026-05-27"
updated: "2026-05-27"
trigger: "Phase 9 auth bugs — sessio katoaa navigoinnissa, suosikit-sivu tyhjä, NavBar näyttää 'Kirjaudu' vaikka kirjautunut"
---

# Debug Session: auth-session-loss-suosikit

## Symptoms

- **Expected:** Toggle suosikki päälle/pois — sydän mustaksi ja takaisin valkoiseksi (kirjautuneena)
- **Actual:**
  - Suosikit-sivu näyttää tyhjää vaikka suosikkeja on lisätty
  - Sessio katoaa navigoinnissa — NavBar näyttää 'Kirjaudu' vaikka käyttäjä on kirjautunut
- **Timeline:** Ei ole koskaan toiminut oikein end-to-end (bugi alusta asti)
- **Reproduction:** Kirjaudu sisään → navigoi sivulta toiselle → NavBar resetoituu; mene /suosikit → tyhjä sivu
- **DB state:** suosikit-taulu ON olemassa

## Architecture Context

- `createBrowserSupabase()` = singleton, käyttää `storage: localStorage` (ei cookieita)
  - Syy: cookie-pohjainen auth aiheutti "sessio katoaa F5:n jälkeen" -ongelman
  - `signInWithPassword`-promise roikkui → bypassattu AuthModalissa SIGNED_IN-eventillä
- `createServerSupabase()` = lukee cookieita → ei koskaan näe localStoragessa olevaa sessiota
- Middleware: `getUser()` cookie-clientilla → ei löydä sessiota (localStorage-sessio näkymätön)
- NavBar: `onAuthStateChange` pysyvä subscription
- HeartButton, LiikuntapaikatLista, Etusivu: INITIAL_SESSION-pohjainen alustus

## Previous Fix Attempts (ei toimineet)

1. HeartButton: lisätty `createBrowserSupabase()` toggle()-funktion sisään
2. SuosikitPage: muutettu client-side auth checkiksi
3. LiikuntapaikatLista + HeartButton + Etusivu + SuosikitClient: vaihdettu getSession/getUser → INITIAL_SESSION onAuthStateChange-eventissä
4. Filtteröity TOKEN_REFRESHED pois onAuthStateChange-käsittelijästä
5. localStorage storage adapter otettu käyttöön session pysyvyyden takia

## Current Focus

hypothesis: "createBrowserSupabase käyttää localStoragea mutta createServerSupabase lukee cookieita — server-side rendering hakee SSR:ssä null-käyttäjän, ja hydraation jälkeen client-side state on ristiriidassa"
next_action: "RESOLVED — see Resolution below"
reasoning_checkpoint: ""

## Resolution

**Root cause:** `lib/supabaseSSR.ts` forcibly overrode `@supabase/ssr`'s default cookie-based storage adapter with `storage: window.localStorage`. This made the browser client store auth tokens in `localStorage` while every server-side path (middleware `getUser()`, layout `createServerSupabase()`, SSR components) reads from cookies — so the server always saw an unauthenticated user. Session appeared to "disappear" on navigation because SSR re-rendered with null user, overriding the client state.

**Root cause 2 (secondary):** `SuosikitClient` only showed an auth-gate or an empty "no favorites" placeholder — it never fetched the actual `suosikit` rows from the database when a user was authenticated.

**Fix applied:**
1. `lib/supabaseSSR.ts` — removed `storage: window.localStorage` override; reverted to `@supabase/ssr` default cookie storage. The `signInWithPassword` hanging-promise issue that prompted the localStorage workaround is already handled in `AuthModal` via the `SIGNED_IN` event listener pattern (promise result is not awaited for success).
2. `app/suosikit/SuosikitClient.tsx` — added `loadFavorites(userId)` function that queries `suosikit` joined with `liikuntapaikat(*)` and displays the actual list. Added a full three-state UI: loading / unauthenticated / authenticated-with-list.

**Files changed:**
- `lib/supabaseSSR.ts`
- `app/suosikit/SuosikitClient.tsx`

**Note for next session:** All `onAuthStateChange` callbacks project-wide have pre-existing TypeScript `noImplicitAny` errors on the `event` and `session` parameters. These are not related to the auth session bug and should be fixed as a separate cleanup task (add `import type { AuthChangeEvent, Session } from '@supabase/supabase-js'` and type the callback parameters).

**Note on existing localStorage sessions:** Users who were signed in under the old localStorage-based auth will need to sign in again — their tokens are in localStorage but the new client reads/writes cookies only.
