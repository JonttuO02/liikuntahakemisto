# Phase 36: Hallintapaneeli - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Hyväksytyllä (tai odottavalla tai hylätyllä) yrityksellä on täysin toimiva hallintapaneeli `/business/[id]`-sivulla omien paikkatietojensa ylläpitoon ja esikatseluun. `/business`-lista näyttää kaikki paikat tilatiedoineen sekä pikaesikatselu- ja muokkausnapit. Muutokset kirjoitetaan suoraan `liikuntapaikat`-tauluun — ei erillistä hyväksyntää tarvita.

Vaatimukset: BIZPANEL-01, BIZPANEL-02, BIZPANEL-03

</domain>

<decisions>
## Implementation Decisions

### Edit flow UX (BIZPANEL-02)

- **D-01:** Muokkaus tapahtuu **reusoimalla onboarding-wizard** edit-moodissa. Polku: `/business/[id]` mounttaa saman wizard-komponenttilogiikan `edit=true`-propilla.
- **D-02:** Muokattavat vaiheet: **2–5 vain** (Mediat, Hinnasto, Aukioloajat, Yhteystiedot). Vaihe 1 (Paikka — nimi, osoite, lajityyppi) on **lukittu hyväksynnän jälkeen** — muutokset vaatisivat admin-yhteydenoton.
- **D-03:** Jokainen vaihe 2–5 saa oman **"Tallenna"-napin** joka kirjoittaa suoraan `liikuntapaikat`-tauluun (ei drafttia). Ei erillistä "Julkaise"-vaihetta.
- **D-04:** Jokaisessa muokkausvaiheessa on **"Näytä esikatselu"-nappi** joka avaa full-screen modaalin (PaikkaKortti + DiagonaalKortti + PaikkaSheet) nykyisellä julkaistulla datalla. Ei before/after-diff — näyttää mitä käyttäjät näkevät nyt.

### Routing structure (BIZPANEL-01)

- **D-05:** **Multi-route-rakenne:** `/business` = venuelista; `/business/[id]` = yksittäisen paikan hallinta (muokkauswizard + esikatselu).
- **D-06:** `/business`-lista näyttää **kaikille** paikkojen tiloille (pending / approved / rejected) sekä "Muokkaa"-napin että "Esikatselu"-pikaesikatselunapin suoraan listan rivissä.
- **D-07:** `/business/[id]` saa **leveämmän dashboard-layoutin** (max-w-2xl tai vastaava) — ei compact-kortti. Tuntuu enemmän hallintapaneelilta kuin onboarding-wizardilta.

### Save model for edits (BIZPANEL-02)

- **D-08:** Muokkaussave kirjoittaa **suoraan `liikuntapaikat`-tauluun** — ei `onboarding_draft`-välivarastoita. Uusi Route Handler: `POST /api/business/update-paikka` hyväksyy `{paikka_id, section, data}` ja päivittää vain kyseisen section kentät.
- **D-09:** Kuvat (photos): **append-malli** — uudet kuvat lisätään olemassa oleviin (max 5 kpl). Jokaisen kuvan thumbnaililla on **poistonappi** (`×`) joka poistaa kuvan Storagesta ja päivittää `photo_urls`-arrayn. Logo **korvataan** uudella (replace).
- **D-10:** Yksi unified API-endpoint kaikille sektioille (`/api/business/update-paikka`). Section-spesifinen kenttämappaus endpoint-logiiikan sisällä. Yksi auth-tarkistus, yksi tiedosto.

### Preview placement (BIZPANEL-03)

- **D-11:** Esikatselu-modaali aukeaa **full-screen modal overlaylla** (ei URL-muutosta). Näyttää julkaistun tilan (`liikuntapaikat`-data). Käytettävissä sekä `/business`-listalta (pikaesikatselu per rivi) että `/business/[id]`-muokkaussivulta (per wizard-vaihe).

### Claude's Discretion

- `/business/[id]`-sivun tarkka layout: sidebar-navigaatio vai yläreunan tab-bar eri muokkausvaiheiden välillä
- Edit-wizard: ProgressBar komponentin näyttäminen edit-moodissa (koko progressbar vs. pelkät step-labelt)
- "Tallenna"-napin sijainti per vaihe: alaosa (kuten onboarding "Seuraava") vs. ylälaitaan kiinteä toolbar
- Poistonapin confirmointidialogi kuvalle: immediate delete vs. confirm-dialog
- Append-logiikan rajan kommunikointi: miten UI kertoo että max 5 kuvaa on täynnä

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimukset ja tiekartta
- `.planning/REQUIREMENTS.md` — BIZPANEL-01, BIZPANEL-02, BIZPANEL-03 (Phase 36 requirements)
- `.planning/ROADMAP.md` §Phase 36 — Success criteria ja phase details

### Prior phase decisions (perusta)
- `.planning/phases/31-db-skeema-storage-perusta/31-CONTEXT.md` — `business_accounts`, `business_paikka_links`-skeema, `business-media` bucket, RLS-politiikat
- `.planning/phases/33-claim-paikan-luonti/33-CONTEXT.md` — `claim_status` pending/approved/rejected, `published`-sarake, claim/create Route Handler -kaavat
- `.planning/phases/34-onboarding-velhou/34-CONTEXT.md` — onboarding-wizard rakenne (vaiheet 1–6), `onboarding_draft`-taulu, media upload -kaava, Route Handler patterns
- `.planning/phases/35-admin-hyvaksyntajarjestelma/35-CONTEXT.md` — `rejection_reason`-sarake, "Hae uudelleen"-flow, admin-suojauskaava

### Olemassa oleva infrastruktuuri
- `app/business/page.tsx` — nykyinen venuelista + status-värikoodi logiikka; Phase 36 laajentaa tätä (lisää Muokkaa + Esikatselu-napit)
- `app/business/onboarding/page.tsx` (tai vastaava onboarding-wizard-sivu) — wizard-rakenne jota edit-moodi reusoi
- `app/components/PaikkaKortti.tsx` — käytetään esikatselu-modaalissa
- `app/components/DiagonaalKortti.tsx` — käytetään esikatselu-modaalissa
- `app/components/PaikkaSheet.tsx` — käytetään esikatselu-modaalissa
- `app/api/business/register/route.ts` — JWT + supabaseAdmin -kaava; kaikki uudet Route Handlerit seuraavat tätä
- `lib/supabaseAdmin.server.ts` — service role client; pakollinen `update-paikka`-Route Handlerille
- `lib/supabaseSSR.ts` — `createBrowserSupabase()` client-side session

### DB-migraatiot (referencenä)
- `supabase/migrations/20260605000000_business_accounts.sql` — `business_paikka_links`-taulun rakenne + RLS
- `supabase/migrations/20260610000003_add_logo_url_to_liikuntapaikat.sql` — `logo_url`-sarake

### Storage
- `business-media` bucket — `{business_account_id}/{paikka_id}/photos/` ja `{business_account_id}/{paikka_id}/logo/` -polkurakenne (D-11 Phase 34)

### i18n
- `messages/fi.json` ja `messages/en.json` — Business-namespace; lisättävä hallintapaneeli-tekstit (Muokkaa, Tallenna, Esikatselu, Sulje jne.)

### Design system
- `app/globals.css` — `.glass`, `.glass-hover`, `.glass-btn` utility-luokat
- `CLAUDE.md` — glassmorphism-suunnitteluohjeet, typografia, animaatioperiaatteet

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/business/onboarding/` — wizard-vaiheet 2–5 (Mediat, Hinnasto, Aukioloajat, Yhteystiedot) ovat suoraan uudelleenkäytettäviä edit-moodissa; ainoa muutos on "Tallenna" vs. "Seuraava" -nappi ja submit-logiikka
- `app/components/PaikkaKortti.tsx`, `DiagonaalKortti.tsx`, `PaikkaSheet.tsx` — esikatselu-modaalin sisältö; vaativat `Liikuntapaikka`-tyyppisen objektin (haetaan `/api/admin/applications/[id]` tai suoraan Supabasesta)
- `app/business/page.tsx` — status-värikoodi-logiikka (pending=amber, approved=green, rejected=red) reusable venuelistan rivissä
- Upload-komponentit (UploadDropZone, UploadProgressBar) — jo olemassa onboarding Step 2:sta

### Established Patterns
- **Route Handler -kaava:** `Authorization: Bearer <JWT>` → `supabaseAdmin.auth.getUser(token)` → business ownership check (`business_paikka_links` WHERE `business_account_id = uid` AND `paikka_id = ...`) → supabaseAdmin UPDATE
- **Ownership check on updates:** Ennen kuin `liikuntapaikat` päivitetään, varmistettava että `business_paikka_links`-rivi yhdistää kirjautuneen käyttäjän kyseiseen paikka_id:hen (estää muiden paikkojen muokkauksen)
- **Glass UI:** `.glass rounded-2xl p-6` — hallintapaneelin kortit
- **Wizard step URL param:** `?step=N` — sama kaava edit-moodissa

### Integration Points
- `app/business/page.tsx` — lisättävä "Muokkaa" (`→ /business/[id]`) ja "Esikatselu" (modal) -napit jokaiseen venuerivin
- Uusi sivu: `app/business/[id]/page.tsx` — edit-wizard wrapper (D-07: leveä dashboard-layout)
- Uusi Route Handler: `app/api/business/update-paikka/route.ts` — unified UPDATE `liikuntapaikat` (D-08–D-10)
- Storage delete-operaatio: kuvien poisto `business-media`-bucketista kun kuva poistetaan (D-09)
- `messages/fi.json` + `messages/en.json` — hallintapaneeli-tekstit Business-namespaceen

### Uudet tiedostot (todennäköisesti)
- `app/business/[id]/page.tsx` — leveä dashboard-layout, mounttaa edit-wizardin
- `app/api/business/update-paikka/route.ts` — unified UPDATE, section-based field mapping, ownership check
- Esikatselu-modaalikomponentti (tai reuse olemassa olevasta PaikkaSheet-pohjaisesta modaalista)

</code_context>

<specifics>
## Specific Ideas

- `/business/[id]` dashboard: leveämpi layout (max-w-2xl tai full-width sidebar-rakenteella)
- Esikatselu-modaali: sama kolmen kortin layout kuin onboarding Step 6 (PaikkaKortti + DiagonaalKortti + PaikkaSheet rinnakkain tai stackattuna)
- Muokkausnapit `/business`-listalla: "Muokkaa →" (outline-nappi) + "Esikatselu" (muted text link) per venuerivin oikeassa laidassa
- Kuvan poistonappi: `×`-ikoni kuvathumbnailin oikeassa yläkulmassa; välitön (tai confirm) delete Storage + array-update

</specifics>

<deferred>
## Deferred Ideas

- Kuvien järjestyksen muokkaus drag-and-drop:lla — monimutkaisempi, ei BIZPANEL-vaatimuksissa
- Laji-tyypin (sport type) muokkaus — Paikka-vaihe on lukittu (D-02); tarvitsisi admin-flow
- Muutoshistoria / audit log — ei v1.7:ssä
- Multi-venue ketjuadmin (yksi tili, useita toimipisteitä eri omistajilla) — Future requirements -listalla

</deferred>

---

*Phase: 36-hallintapaneeli*
*Context gathered: 2026-06-10*
