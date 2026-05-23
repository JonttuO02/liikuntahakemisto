---
phase: 9
plan: "09-02"
subsystem: auth
tags: [auth, modal, glass, supabase, navbar]
dependency_graph:
  requires: ["09-01"]
  provides: ["AuthModal component", "server auth state in layout", "NavBar auth UI"]
  affects: ["app/layout.tsx", "app/components/NavBar.tsx"]
tech_stack:
  added: []
  patterns: ["async RSC layout with getUser()", "server-to-client prop drilling for auth email", "AnimatePresence backdrop+panel animation"]
key_files:
  created:
    - app/components/AuthModal.tsx
  modified:
    - app/layout.tsx
    - app/components/NavBar.tsx
decisions:
  - "NavBar mounted as fragment wrapper (<></>) to allow AuthModal outside sticky header div — avoids z-index stacking context issues"
  - "userEmail: string | null prop (not full User object) passed to NavBar for serializability"
  - "layout.tsx made async; uses getUser() (validated) not getSession() (unvalidated cookie)"
metrics:
  duration: "115s (~2 min)"
  completed: "2026-05-23T05:43:02Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 9 Plan 02: AuthModal + server auth wiring — yhteenveto

**Toteutus lyhyesti:** Glass-modaali sähköposti/salasana- ja Google OAuth -kirjautumisella, asynkroninen layout.tsx joka hakee käyttäjätiedot palvelimelta per-request, NavBar näyttää kirjautumistilan hamburger-valikossa.

## Toteutetut tehtävät

| Tehtävä | Nimi | Commit | Tiedostot |
|---------|------|--------|-----------|
| T-02-1 | AuthModal glass component | fe8a961 | app/components/AuthModal.tsx (uusi, 278 riviä) |
| T-02-2 | Async layout with server auth fetch | 9ce2215 | app/layout.tsx |
| T-02-3 | NavBar auth state in hamburger dropdown | 544b84c | app/components/NavBar.tsx |

## Mitä rakennettiin

### AuthModal (`app/components/AuthModal.tsx`)
Uusi `'use client'`-komponentti. Täysi glass-modaali:
- Taustasumupeitto `bg-[rgba(0,0,0,0.40)]` AnimatePresence-häivytyksellä (0.2s)
- Paneeli `.glass rounded-2xl p-6 w-full max-w-sm mx-4` liu'ulla ylös (y 24→0, 0.25s)
- `mode: 'signin' | 'signup'` -tila vaihtolinkin kanssa
- Google OAuth -nappi (glass-btn, Google G -SVG, "Jatka Googlella")
- "TAI" -erotinrivi (text-[10px] font-bold uppercase tracking-widest)
- Sähköposti- ja salasanakentät (border-[rgba(0,0,0,0.12)] rounded-lg h-10 text-sm)
- Virheviesti: text-sm text-red-600, AnimatePresence-häivytys
- Lähetysnappi: bg-[#111111] hover:bg-[#333333], latauksen aikana opacity-60 + "Kirjaudutaan..."/"Luodaan tiliä..."
- Sulkeminen: taustaklikkaus, X-nappi, Escape-näppäin
- Onnistumisessa: `onSuccess(pendingPaikkaId ?? null)`, sulkee modaalin, `router.refresh()`
- Suomenkieliset virheilmoitukset mappattuna Supabasen englanniksi tulevista virheistä

### layout.tsx (päivitetty)
- `RootLayout` muutettu `async`-funktioksi
- Hakee `cookies()` ja luo `createServerSupabase(cookieStore)`
- Kutsuu `supabase.auth.getUser()` (ei getSession — validoitu tarkistus)
- Välittää `userEmail={user?.email ?? null}` NavBarille propina

### NavBar.tsx (päivitetty)
- Hyväksyy `userEmail: string | null` -propin layout.tsx:stä
- Lisätty `authModalOpen`-tila ja `useRouter` hook
- Kirjautuneena ulos: User-ikoni-nappi avaa auth-modaalin
- Kirjautuneena sisään: katkaisttu sähköposti (max-w-[120px]) + LogOut-nappi kutsuu `signOut()` + `router.refresh()`
- Heart-linkki /suosikit säilyy molemmissa tiloissa
- AuthModal mountattu komponentin juuren ulkopuolelle (fragment-kääreen sisällä) sticky-headerin ulkopuolelle z-indeksointikontekstiongelmien välttämiseksi

## Poikkeamat suunnitelmasta

Ei poikkeamia — suunnitelma toteutettiin täsmälleen kirjoitetun mukaan.

## Google OAuth — manuaalinen asennusvaihe

Google OAuth vaatii manuaalisen konfiguroinnin ennen kuin se toimii:
1. Lisää `{SUPABASE_PROJECT_URL}/auth/v1/callback` Google Cloud Consolen sallittuihin uudelleenohjaus-URI:hin
2. Lisää sovelluksen origin Supabase Auth → URL Configuration → Redirect URLs -listaan

Sähköposti/salasana-kirjautuminen toimii itsenäisesti ilman tätä konfiguraatiota.

## Tietoturva-analyysi

- `getUser()` käytetty `getSession()`:n sijaan — validoi session palvelimella, ei luota pelkkään evästeeseen
- `userEmail` (string) välitetään propina, ei koko `User`-objektia — minimoi serialisoitavan datan
- `middleware.ts` (09-01) virkistää session-evästeen joka pyynnöllä
- `router.refresh()` kirjautumisen/uloskirjautumisen jälkeen pakottaa RSC:n uudelleenrenderöinnin päivitetyllä `user`-tilalla

## Tunnettuja stubeja

Ei stubeja — AuthModal on täysin toiminnallinen. Google OAuth:n toimivuus riippuu manuaalisesta cloud-konfiguraatiosta.

## Uhat

Ei uusia uhkia suunnitelman ulkopuolelta.

## Self-Check: PASSED

- [x] app/components/AuthModal.tsx on olemassa
- [x] app/layout.tsx päivitetty (async + getUser)
- [x] app/components/NavBar.tsx päivitetty (userEmail prop + AuthModal)
- [x] Commit fe8a961 olemassa (T-02-1)
- [x] Commit 9ce2215 olemassa (T-02-2)
- [x] Commit 544b84c olemassa (T-02-3)
- [x] `npm run build` läpäisty
