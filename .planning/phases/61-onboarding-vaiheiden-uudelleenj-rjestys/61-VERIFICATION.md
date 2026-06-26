---
phase: 61-onboarding-vaiheiden-uudelleenj-rjestys
verified: 2026-06-26T10:00:00Z
status: passed
score: 12/12
behavior_unverified: 0
overrides_applied: 0
---

# Phase 61: Onboarding-vaiheiden uudelleenjärjestys — Verification Report

**Phase Goal:** Onboarding-virta on uudelleenjärjestetty: paikan nimi + verkko-osoite ensin (AI-analyysi taustalla), sijainti seuraavaksi, ei erillistä preview-vaihetta
**Verified:** 2026-06-26T10:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | StepPaikka.tsx poistettu pääkoodista | VERIFIED | Glob löytää tiedoston vain `.claude/worktrees/`-polusta; pääkoodistossa ei tuontia, tsc:n läpäisy vahvistaa |
| 2 | StepEsikatselu.tsx poistettu pääkoodista | VERIFIED | Sama kuin yllä — vain worktree-polku; jäljellä olevat viittaukset ovat kommentteja, ei tuonteja |
| 3 | create-paikka hyväksyy pelkän nimen (sijainti valinnainen) | VERIFIED | route.ts rivi 57: `if (!yritysNimi) return 400`; koordinaatit parsitaan null:iksi kun puuttuvat — kommentti "coordinates are all optional at creation (ONBOARD-18/20)" |
| 4 | update-paikka-reitillä on sijainti-osio koordinaattien tallennukseen | VERIFIED | route.ts rivit 135–155: `else if (section === 'sijainti')` — validoi lat ±90 / lng ±180 + omistajuusportti |
| 5 | SijaintiPicker: disableDefaultUI + räätälöity teardrop-pini | VERIFIED | SijaintiPicker.tsx rivi 121: `disableDefaultUI` (ei arvoa tarvita); rivit 127–143: SVG teardrop `fill="#111111"` `left:-12 bottom:0 pointerEvents:none` |
| 6 | page.tsx tilakone: nimi-url → sijainti → wizard (analyze ei normaalipolulla) | VERIFIED | PagePhase-tyyppi: `'nimi-url' \| 'sijainti' \| 'analyze' \| 'laji-skip' \| 'wizard'`; alkutila `'nimi-url'`; yksikään `setPagePhase` ei enää kutsu `'analyze'` — analyze-lohko on saavuttamaton dead code |
| 7 | Kolme reittikorjausta: setPagePhase('analyze') korvattu | VERIFIED | (1) fast-forward rivi 313: `url ? 'wizard' : 'laji-skip'`; (2) sijainti onNext rivi 371: `websiteUrl ? setPagePhase('wizard') : handleSkip()`; (3) handleBackToPrePhase rivi 352: `websiteUrl ? 'sijainti' : 'laji-skip'` |
| 8 | aiTriggered-varoitin estää kaksoisanalyysin | VERIFIED | page.tsx rivit 322–331: `if (!aiTriggered) { fetch('/api/business/analyze-website'...); setAiTriggered(true) }` — yhteys F-07 commitiin 583bfc6 |
| 9 | StepYhteystiedot: verkko-osoitekenttä piilotettu onboarding-tilassa | VERIFIED | StepYhteystiedot.tsx rivi 181: `{editMode && (<input type="url" ...>)}`; `editMode` oletusarvo on `false` — kenttä ei näy onboardingissa, näkyy edit-tilassa |
| 10 | WizardInner: 4-askelinen wizard; inline submit step 4:stä | VERIFIED | rivi 68: `rawStep > 4 ? 1 : rawStep`; rivi 71: `Math.min(Math.max(n,1),4)`; rivi 82: `Math.min(draft.current_step,4)`; rivi 151: `Math.min(savedStep,4)`; rivi 337: `onNext={handleYhteystiedotSubmit}` step 4:lle |
| 11 | handleYhteystiedotSubmit lähettää ja ohjaa /business | VERIFIED | WizardInner rivit 228–250: POST `/api/business/onboarding/submit` → `if (data.ok) router.push('/business')` — throw jos res ei ok (F-06) |
| 12 | ProgressBar näyttää "Lähetys" viimeisenä virstanpylväänä | VERIFIED | ProgressBar.tsx rivi 21: `t('stepSubmit')` stepLabels[4]:ssa — vanha `t('stepPreview')` korvattu |
| TypeScript | `npx tsc --noEmit` läpäisee ilman virheitä | VERIFIED | Bash-ajo ei tulostanut virheitä |

**Score:** 12/12 truths verified

---

### Poikkeama ROADMAP SC-02:sta (informaatio, ei gap)

**ROADMAP SC-02 sanoo:** "jos verkko-osoite annettiin, AI-analyysin tulokset näytetään tarkasteltavaksi **omana stepinä** sijainti-stepin jälkeen"

**Toteutus:** analyze-lohko on olemassa page.tsx:ssä (`{pagePhase === 'analyze' && ...}`) mutta on saavuttamaton — mikään koodipoluista ei enää kutsu `setPagePhase('analyze')`. AI käynnistyy taustalla handleNimiUrlNext:ssä ja virta menee suoraan wizardiin.

**Arvio:** Tämä on **tarkoituksellinen tuotemuutos** joka hyväksyttiin UAT:ssa. UAT testi 4 merkitsi näkyvän analyze-vaiheen suurena ongelmana; Plans 05 ja 06 olivat nimenomaan UAT-aukkojen korjauksia. UAT testi 7 ("AI-data näkyy wizardissa") läpäistiin. ROADMAP-teksti on vanhentunut — se tulisi päivittää heijastamaan toteutettua käyttäytymistä: "AI-analyysi käynnistyy taustalla; tulokset ovat käytettävissä wizardissa."

Tätä ei luokitella gapiksi koska poikkeama on täysin dokumentoitu UAT-hyväksytty tuotepäätös.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/business/onboarding/StepNimiJaURL.tsx` | Uusi eka pre-vaiheen komponentti | VERIFIED | Olemassa, substantiivinen, käytetty page.tsx:ssä |
| `app/business/onboarding/StepSijainti.tsx` | Sijainnin kerääjä | VERIFIED | Olemassa, substantiivinen, käytetty page.tsx:ssä |
| `app/components/SijaintiPicker.tsx` | disableDefaultUI + teardrop | VERIFIED | Molemmat lisäykset vahvistettu koodissa |
| `app/business/onboarding/page.tsx` | Uusi tilakone | VERIFIED | PagePhase-unioni päivitetty, kaikki kolme reittikorjausta |
| `app/api/business/create-paikka/route.ts` | Vain nimi vaadittu | VERIFIED | Validointi sallii null-koordinaatit |
| `app/api/business/update-paikka/route.ts` | sijainti-osio | VERIFIED | else if (section === 'sijainti') läsnä koordinaattivalidoinnilla |
| `app/business/WizardInner.tsx` | 4-askelinen wizard + inline submit | VERIFIED | Kaikki 4 numeerista rajausta muutettu (5→4), handleYhteystiedotSubmit lisätty |
| `app/business/onboarding/ProgressBar.tsx` | stepSubmit-otsikko | VERIFIED | stepLabels[4] käyttää t('stepSubmit') |
| `StepPaikka.tsx` | POISTETTU | VERIFIED | Ei löydy pääkoodistosta; vain worktree |
| `StepEsikatselu.tsx` | POISTETTU | VERIFIED | Ei löydy pääkoodistosta; vain worktree |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `page.tsx` | `StepNimiJaURL` | import + JSX render | WIRED |
| `page.tsx` | `StepSijainti` | import + JSX render | WIRED |
| `page.tsx` | `WizardInner` | import + `onBackToAnalyze={handleBackToPrePhase}` | WIRED |
| `StepSijainti` | `/api/business/update-paikka` | `fetch POST section:'sijainti'` | WIRED |
| `page.tsx` | `/api/business/analyze-website` | fire-and-forget POST handleNimiUrlNext | WIRED |
| `WizardInner` (step 4) | `/api/business/onboarding/submit` | handleYhteystiedotSubmit | WIRED |
| `SijaintiPicker` | `@vis.gl/react-google-maps Map` | `disableDefaultUI` + custom AdvancedMarker | WIRED |

---

### Behavioral Spot-Checks

| Behavior | Check | Result |
|----------|-------|--------|
| TypeScript clean | `npx tsc --noEmit` | PASS — ei tulostetta |
| StepPaikka poistettu | Glob `**/StepPaikka.tsx` pääkoodistossa | PASS — vain worktree |
| StepEsikatselu poistettu | Glob `**/StepEsikatselu.tsx` pääkoodistossa | PASS — vain worktree |
| create-paikka name-only | Lue route.ts: validointi | PASS — vain yritysNimi vaaditaan |
| update-paikka sijainti | Lue route.ts: else if section=sijainti | PASS — lohko löytyy |
| Kaikki commitit olemassa | `git log` 10 pääcommitilla | PASS — kaikki 10 löytyi |

---

### Requirements Coverage

| Requirement | Plan | Status | Evidence |
|-------------|------|--------|---------|
| ONBOARD-18 (create name-only) | 61-01 | SATISFIED | create-paikka vain yritysNimi vaaditaan |
| ONBOARD-19 (AI background) | 61-04 | SATISFIED | handleNimiUrlNext fires analyze-website taustalla |
| ONBOARD-20 (sijainti step) | 61-02 | SATISFIED | StepSijainti + update-paikka sijainti-osio |
| ONBOARD-21 (sijainti → wizard) | 61-05 | SATISFIED | setPagePhase('wizard') sijainti onNext:ssä |
| ONBOARD-22 (preview poistettu) | 61-03 | SATISFIED | StepEsikatselu poistettu, inline submit |
| ONBOARD-23 (URL pois yhteystiedoista) | 61-03 | SATISFIED | website-kenttä {editMode && ...} portissa |
| ONBOARD-24 (SUBMIT-virstanpylväs) | 61-03 | SATISFIED | ProgressBar.tsx stepLabels[4]=t('stepSubmit') |

---

### Anti-Patterns Found

Ei blockereitä.

| File | Pattern | Severity | Note |
|------|---------|----------|------|
| `page.tsx` rivi 380 | `{pagePhase === 'analyze' && ...}` — dead code (saavuttamaton lohko) | Info | Intentional — analyze-vaihe poistettu forward-polulta UAT:n perusteella; lohko voitaisiin siivota jossain vaiheessa mutta ei blokkeroi toiminnallisuutta |
| `61-05 SUMMARY.md` | Väittää analyze on "saavutettavissa deep-linkeillä" — virheellinen | Info | pagePhase on React-tila ei URL-param, joten deep-link ei vaikuta siihen. Dokumentaatiovirhe, ei koodivirhe |

---

### Human Verification Required

Ei vaadita — kaikki 12 totuutta varmennettu ohjelmallisesti tai koodianalyysillä. UAT (7 testiä) suoritettiin jo kehityksen aikana ja Plans 05/06 sulkivat löydetyt aukot.

---

### Gaps Summary

Ei gappeja. Kaikki 12 totuutta VERIFIED. TypeScript puhdas. Kaikki 10 pääcommittia olemassa.

**Informaatiohuomio:** ROADMAP SC-02:n sanamuoto ("AI-tulokset omana stepinä sijainti-stepin jälkeen") on vanhentunut. Toteutettu käyttäytyminen — AI taustalla, suoraan wizardiin — hyväksyttiin UAT-testissä 4. ROADMAP tulisi päivittää seuraavan milestone-auditing yhteydessä.

---

_Verified: 2026-06-26T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
