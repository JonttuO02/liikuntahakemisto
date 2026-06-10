# Phase 35: Admin-hyväksyntäjärjestelmä - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 35-admin-hyvaksyntajarjestelma
**Areas discussed:** Sähköpostipalvelu, Admin-sivun layout, Hylkäyssyyn tallennus, Admin-suojauksen toteutus

---

## Sähköpostipalvelu

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | Moderni email API Next.js/Vercel-projekteille. Ilmainen tier 3000 viestin/kk. TypeScript SDK. | ✓ |
| Nodemailer + Gmail SMTP | Klassinen ratkaisu, ilmainen mutta toimitusvarmuus voi olla heikompi | |

**User's choice:** Resend
**Notes:** From-osoite `noreply@aktiivi.app`. Admin-ilmoitus lähetetään kahdessa vaiheessa: (1) claim/create submit, (2) onboarding Step 6 submit. "Rooli yrityksessä" -kenttä lisätään rekisteröintilomakkeeseen — kerätään rekisteröinnissä eikä claim-vaiheessa.

---

## Admin-sivun layout

| Option | Description | Selected |
|--------|-------------|----------|
| Yksinkertainen lista | Rivi per hakemus: nimi, paikka, tyyppi, päivämäärä, napit | ✓ |
| Kortit jossa kuvat | Laajemmat kortit ladatuilla kuvilla suoraan listassa | |

**Onboarding-data näyttö:**

| Option | Description | Selected |
|--------|-------------|----------|
| Ei — perustiedot riittävät | Kuvat tarkistettavissa myöhemmin hyväksynnän jälkeen | |
| Kyllä — näytä onboarding-data | Laajennettava detail-näkymä | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Laajennettava rivi (accordion) | Klikkauksella aukeava yksityiskohdat | |
| Modaali / erillinen näkymä | "Tarkastele"-nappi avaa modaalin tai /admin/[id]-sivun | ✓ |

**User's choice:** Yksinkertainen lista + modaali/erillinen sivu onboarding-datalle
**Notes:** Sisäinen työkalu vain adminille — yksinkertaisuus tärkeintä.

---

## Hylkäyssyyn tallennus

| Option | Description | Selected |
|--------|-------------|----------|
| Tietokantaan + sähköpostiin | `rejection_reason` kolumni business_paikka_linksiin + email | ✓ |
| Vain sähköpostiin | Ei DB-muutoksia, /business näyttää vain "Hylätty" | |

**Uudelleenhaku:**

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä — voi lähettää uuden hakemuksen | /business näyttää syyn + "Hae uudelleen" nappi | ✓ |
| Ei — tilin poisto tai yhteydenotto | Manuaalinen prosessi | |

**User's choice:** Tietokantaan + sähköpostiin; hylätty yritys voi hakea uudelleen
**Notes:** /business-sivulla näytetään rejection_reason + "Hae uudelleen" -nappi.

---

## Admin-suojauksen toteutus

| Option | Description | Selected |
|--------|-------------|----------|
| Server Component + Supabase-tarkistus | getUser() + is_admin query + notFound() | ✓ |
| Next.js Middleware | middleware.ts tarkistaa /admin-reitin | |

**API-tason suojaus:**

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä — is_admin tarkistus Route Handlerissa | Kaksinkertainen suojaus UI + API | ✓ |
| Riittää sivutason suojaus | Luotetaan UI-suojaukseen | |

**User's choice:** Server Component + is_admin tarkistus API-tasolla myös
**Notes:** Sama kaava kuin business/page.tsx mutta lisätään is_admin profiilikysely.

---

## Claude's Discretion

- Approve/reject API-routejen tarkka nimiavaruus
- Sähköpostiviestin HTML-rakenne ja sisältö
- `onboarding_draft`-datan hakustrategia admin-modaalissa
- Modaali vs `/admin/[id]`-sivu valinta (kumpi tahansa käy)
- "Rooli yrityksessä" -kentän toteutus: vapaa teksti vs dropdown

## Deferred Ideas

- Automaattinen admin-hyväksyntä (whitelist-domaineille)
- Hakemuksen muokkausmahdollisuus ennen uudelleenlähetystä
- Useamman adminin tuki
