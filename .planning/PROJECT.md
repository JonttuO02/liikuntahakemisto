# Liikuntahakemisto

## Shipped: v2.2 Onboarding-tekoälyn parannukset (2026-06-21)

**Delivered:** Monisivuinen scraper-putki SSRF-uudelleenvalidoinnilla ja plural-skeemalla (logo_candidates, image_urls, värit); käyttäjä valitsee logon ja 2 väriä useista AI-kandidaateista validoidun PATCH-reitin kautta; galleriakuvat esitäyttävät Mediat-vaiheen; Step 6 -esikatselu vaihdettu `CalloutCard`:iin + kontrastiturvallinen logoprimitiivi; `StepPaikka` siirretty ennen URL-analyysiä + pikahyväksyntä admin-jonoon; jaettu live-esikatselun tila kaikissa velhon vaiheissa (desktop split-view, mobiili toggle) sekä onboarding- että EditModessa, ulottuen myös pre-wizard-analyysinäytölle (Phase 51.1 gap-fix). 21/21 vaatimusta toimitettu, 6 vaihetta, 22 plania, 211 committia, 3 päivää (2026-06-16 → 2026-06-19).

---

## Shipped: v2.0 Business UX & Navigation (2026-06-15)

**Delivered:** Täydellinen business-navigaatioympäristö — `BusinessNav` glass pill kaikilla `/business/*`-reiteillä (kuluttaja-NavBar poistettu), post-login redirect `/business/kirjaudu` → `/business`, `/business`-hallintapaneeli statuskortti + paikkalistaus + pikatoimintokortit, `/business/map` täysruutu-kartta Supercluster-klusteroinnilla + kaksivaiheinen pinni-interaktio (zoom → CalloutCard → PaikkaSheet), `/business/profiili` lukuvain tilitiedot + puhelinnumeron muokkaus + FI/EN-kielivalitsin + uloskirjautuminen (sb-biz-* isolaatio). 9/9 vaatimusta toimitettu, 3 vaihetta, 55 committia.

---

## Shipped: v2.1 AI-pohjainen yrityssivuanalyysi (2026-06-16)

**Delivered:** Täysi AI-pohjainen yrityssivuanalyysi — `business_branding`-taulu Supabasessa FK `business_accounts`-tauluun + RLS; `POST /api/business/analyze-website` HTML-haku `fetch`:llä + SSRF-suojaus + `sharp`-konversio + yksi Claude API -kutsu (vision + teksti) + `waitUntil` fire-and-forget; pre-vaihe `AnalysoiSivusto` 6-tila kone (url-input → analyzing → preview/error) 30-yrityksen pollauksella; velhointegraatio steps 3–5 esitäytöllä; DiagonaalKortti brändiväreillä YIQ-kontrastilla. 14/14 vaatimusta toimitettu, 3 vaihetta, 76 committia.

---

## Shipped: v1.9 Auth-Separaatio & Cleanup (2026-06-12)

**Delivered:** Auth-sessioiden täydellinen eristys `sb-biz-*`-cookie-nimiavaruudella; path-conditional middleware refresh; `/business/kirjaudu` dedikoitu kirjautumissivu; kaikki `/business/*`-reitit migroitu business-asiakkaaseen; `WizardInner` konsolidoitu yhdeksi komponentiksi (`mode: 'onboarding' | 'edit'`); testitilien siivousmigraatio luotu.

---

## What This Is

Suomalainen liikuntapalveluiden hakemisto ja löytämisalusta. Kokoaa suomalaisten kaupunkien liikuntapalvelut yhteen — aukioloajat, hinnat, GPS-pohjainen sijaintihaku, ja sääpohjainen AI-suositus. Käyttäjät voivat luoda tilin, tallentaa suosikkipaikkoja ja saada personoituja AI-suosituksia. Sovellus toimii offline-tilassa ja on asennettavissa kotinäyttöön (PWA). Tarkoitettu sekä paikallisille että matkailijoille jotka etsivät kertakäyntiä läheltä — kolmessa kaupungissa (Tampere, Helsinki, Turku).

## Shipped: v1.7 Yritysportaali (2026-06-11)

**Delivered:** Täysi yritysportaali — business_accounts + business_paikka_links + business-media Storage; rekisteröintilomake + JWT-varmennettu API + AuthModal-ohjaus; claim/create-paikka + published=false gating; 6-vaiheinen onboarding-velhou draft-persistoinnilla + kuva/logo-uploadilla + step-forward URL-suojalla; Resend-sähköposti-ilmoitukset + /admin-panel + approve/reject/reapply; /business hallintapaneeli paikkalistauksineen, muokkausvelhoineen ja esikatselulla.

## Shipped: v1.6 Kielituki, Ikonit & Sheet-redesign (2026-06-04)

**Delivered:** next-intl FI/EN kielituki (NEXT_LOCALE-cookie, kielivalitsin profiilisivulla), `lib/sportIcons.tsx` SVG-ikonit kaikille lajeille (Lucide poistettu), PaikkaSheet hero-karuselli + hinnasto + collapsible arvostelut, DiagonaalKortti & PaikkaKortti placeholderit ja marquee-hinnastokaruselli, navigaatio/filtteri/sheet-bugifixit.

## Shipped: v1.5 Visuaalinen elävöitys & UX-hienosäätö (2026-06-02)

**Delivered:** Outfit-fontti, AktiiviLogo sininen sweep-animaatio, SportPin siniset karttapinnit + orbit-kiiltoanimaatio, CalloutCard 160px pystysuuntainen kirjainanimaatio, TO DO overlay etusivulle glassmorphism-panelilla + arvosteluprompt, FilterCarouselPill karuselli-animaatiolla.

## Shipped: v1.4 UX-parannukset & Profiili (2026-05-31)

**Delivered:** Kertakäynti OK -filtteri (hintasuodattimet poistettu), paikka kuva listakorttiin (image_url), AI-widgetille enemmän tilaa, pin-ikoni-nappi listakorttiin karttakohdistukseen, navigaatiokorjaukset (back-scroll, "Näytä kartalla", toolbar-cleanup), suosikit → TO DO kirjanmerkki-ikonilla, kiinnostuksen kohteet profiiliin + AI-personointi.

## Shipped: v1.3 AKTIIVI — Redesign & Polish (2026-05-30)

**Delivered:** AKTIIVI-rebrand kaikissa metadateissa, animoitu logo-vesileima bottom sheetissä, unified toolbar (Search+LayoutList), yhtenäiset punaset SVG-ikonipinnit, sama-osoite-klusterointi, CalloutCard clip-path spike + PaikkaSheet layoutId-laajeneminen.

## Shipped: v1.2 UI-uudistus & Arvostelut (2026-05-28)

**Delivered:** Hakupaneeli etusivulle (LiikuntapaikatLista poistettu), DiagonaalKortti diagonal split -korttimalli, /profiili-sivu kotikaupunki-kentällä, AI kotona/reissussa -konteksti, arvostelusysteemi (tähtiarvosana + teksti + anonyymi/julkinen + käyntipäivä + ruuhka-arvio, max 1/käyttäjä/paikka).

## Core Value

Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.

## Requirements

### Validated (v1.0)

- ✓ Liikuntapaikkojen listausnäkymä lajifiltterillä — existing
- ✓ Karttatoggle (lista ↔ kartta) — existing
- ✓ Google Maps -karttakomponentti pineineen — existing
- ✓ Paikan profiilisivu (detail view) — existing
- ✓ Supabase-backend paikkatiedoille — existing
- ✓ Google Places API -integraatio automaattiseen datahakuun — existing
- ✓ PaikkaKortti-komponentti (nimi, laji, osoite, CTA) — existing
- ✓ Mobiilinavigaatio (BottomNav + NavBar) — existing
- ✓ Framer Motion -animaatiot (scroll, card hover, filter) — existing
- ✓ SEC-01: /api/hae-paikat Authorization-suojattu — v1.0
- ✓ SEC-02: URL-routaus yhtenäinen (?nakyma=kartta) — v1.0
- ✓ SEC-03: RLS-politiikat, anon-avain read-only — v1.0
- ✓ SEC-04: Ystävälliset virhesivut suomeksi — v1.0
- ✓ MAP-01: GPS-sijaintihaku + Tampere-fallback — v1.0
- ✓ MAP-02: Etäisyysmerkkijono palvelukorteilla — v1.0
- ✓ MAP-03: @vis.gl/react-google-maps, ei double-load — v1.0
- ✓ DATA-01: Aukioloajat Google Places -haulla Supabaseen — v1.0
- ✓ DATA-02: 7+ lajikategoriaa tietokannassa — v1.0
- ✓ DATA-03: Top 20 hinnat syötetty Supabaseen — v1.0
- ✓ DATA-04: Schema: hinta_kuvaus, aukioloajat, lajit_lista, featured — v1.0
- ✓ UI-01: Aukioloajat palvelukortilla ilman klikkaamista — v1.0
- ✓ UI-02: "Auki nyt" badge + filter — v1.0
- ✓ UI-03: "Kertakäynti OK" badge — v1.0
- ✓ UI-04: Profiilisivu: täydet aukioloajat + hinta — v1.0
- ✓ AI-01: Claude Haiku sääsuositus suomeksi — v1.0
- ✓ AI-02: Non-blocking AI widget, fallback heti — v1.0
- ✓ AI-03: sessionStorage cache, ei re-fetch samana päivänä — v1.0
- ✓ ADS-01: featured boolean -kenttä Supabasessa — v1.0

### Validated (v1.1)

- ✓ LEGAL-01: GDPR-tietosuojasivu (/tietosuoja) — v1.1
- ✓ ADS-02: "Sponsoroitu"-badge featured-paikoille listassa ja kartalla — v1.1
- ✓ AI-04: AI-widgetissä näkyy paikkakunnan nimi lämpötilan vieressä — v1.1
- ✓ UI-05: Listakortissa näytetään kertakäyntihinta; muuten "vain jäsenyys" — v1.1
- ✓ UI-06: Hintatiedot kortin yläosassa, useampi hinta omilla riveillään — v1.1
- ✓ UI-07: "Varaa aika" poistettu listakortista; profiilisivulla URL-teksti — v1.1
- ✓ UI-08: Lajifiltteri pudotusvalikko (yksivalinta) — v1.1
- ✓ DATA-07: Kaupunki-kenttä skeemassa + kaupunkifiltteri UI:ssa — v1.1
- ✓ MAP-04: Re-center-nappi karttanäkymässä — v1.1
- ✓ MAP-05: GPS-tarkkuusrengas sijaintimerkissä — v1.1
- ✓ MAP-06: Zoom-perusteinen pin→info-kortti-muutos — v1.1
- ✓ MAP-07: "Näytä kartalla" avaa oman karttanäkymän zoomattuna — v1.1
- ✓ AUTH-01: Supabase Auth kirjautuminen (email + Google OAuth) — v1.1
- ✓ AUTH-02: Suosikit Supabasessa, synkkaantuu laitteiden välillä — v1.1
- ✓ AUTH-03: Personoitu AI-suosittelu suosikkien perusteella — v1.1
- ✓ DATA-05: Helsinki-alueen liikuntapaikat tietokannassa — v1.1
- ✓ DATA-06: Turku-alueen liikuntapaikat tietokannassa — v1.1
- ✓ PWA-01: Service worker + offline-tuki perusnäkymille — v1.1
- ✓ PWA-02: Web App Manifest + "Lisää kotinäyttöön" -prompt — v1.1

### Validated (v1.2)

- ✓ UI-09: Hakukenttä etusivun vasemmasta toolbarista (ei erillistä listasivua) — Phase 12
- ✓ UI-10: Hakutulokset korttilistana etusivulla (diagonaalinen korttimalli) — Phase 12
- ✓ UI-11: /?nakyma=lista poistettu; LiikuntapaikatLista-komponentti poistettu — Phase 12
- ✓ UI-12: Uusi korttimalli — vasen: tiedot, oikea: Google Static Maps snapshot — Phase 13
- ✓ REVIEW-01: Kirjautunut käyttäjä voi jättää arvostelun (tähtiarvosana + teksti), max 1/paikka — Phase 15
- ✓ REVIEW-02: Arvostelija valitsee näkyykö nimi vai anonyymi — Phase 15
- ✓ REVIEW-03: Arvostelu sisältää käyntipäivän + ruuhka-arvion — Phase 15
- ✓ REVIEW-04: Paikan profiilisivu näyttää arvostelut + tähtiarvosanojen keskiarvo — Phase 15
- ✓ AI-05: Kotikaupunki profiiliin; AI-suositus tunnistaa kotona/reissussa-kontekstin — Phase 14

### Validated (v1.3)

- ✓ BRAND-01: Sovelluksen brändinimi → AKTIIVI (meta-tagit, manifest, otsikko) — Phase 16
- ✓ UI-13: Bottom sheet -uloke aina näkyvissä, toimii avauspainikkeena — Phase 16
- ✓ UI-14: AKTIIVI-logo ulokkeessa ja sheetin yläreunassa auki-tilassa — Phase 16
- ✓ UI-15: Logon tekstiväri vaihtuu animaatiolla joka kerta kun sheet avataan (5 sporttista liukuväriä) — Phase 16
- ✓ UI-16: Sulkiessa väri pysyy — ei resetoidu — Phase 16
- ✓ UI-17: Haku + filtterit yhdistetty yhteen nappiin, toimii kartta- ja listanäkymässä — Phase 17
- ✓ UI-18: Erillinen nappi lista-näkymän toggle — Phase 17
- ✓ MAP-08: Pinnit yhtenäinen väri + custom SVG -ikonit lajeittain — Phase 18
- ✓ MAP-09: Sama-osoite-pinnit klusteriksi — Phase 18
- ✓ MAP-10: Pinnikortti laajenee in-place animaatiolla — ei alareuna-kortti — Phase 18

### Validated (v1.4)

- ✓ FILTER-01: Hintasuodattimet poistettu; tilalle "Kertakäynti OK" -filtteri — Phase 19
- ✓ UI-19: Listakortissa kartta-snapshot korvattu paikka kuvalla (image_url Supabasesta, placeholder fallback) — Phase 19
- ✓ UI-20: Bottom sheetin mainos-kortit pienennetty; AI-widgetille enemmän tilaa yläosaan — Phase 19
- ✓ UI-21: Listakorttiin pin-ikoni-nappi: sulkee listan ja kohdistaa kartan paikan koordinaatteihin — Phase 19
- ✓ NAV-01: Paikan profiilisivun "Takaisin hakemistoon" palaa listaan entiseen scroll-kohtaan — Phase 20
- ✓ NAV-02: "Näytä kartalla" kohdistaa paikan koordinaatteihin ilman GPS-recenteriä; bottomsheet pysyy kiinni — Phase 20
- ✓ NAV-03: Etusivu latautuu bottomsheet kiinni; aukeaa automaattisesti animoituna heti — Phase 20
- ✓ NAV-04: Suosikit- ja Profiili-sivujen toolbarista poistettu haku-painike — Phase 20
- ✓ NAV-05: Suosikit/TODO-sivun "Takaisin hakemistoon" korjattu oikeaan kohteeseen — Phase 20
- ✓ TODO-01: Suosikit uudelleennimetty TO DO -listaksi; sydän → kirjanmerkki-ikoni — Phase 21
- ✓ TODO-02: /suosikit-sivu näyttää TO DO -paikat käyttäjälle — Phase 21
- ✓ PROFILE-01: Käyttäjä lisää profiiliin kiinnostuksen kohteet (lajit lib/lajit.ts, monivalinta) — Phase 22
- ✓ PROFILE-02: AI-suositus käyttää kiinnostuksen kohteita personointiin — Phase 22
- ✓ DATA-08: image_url-kenttä paikat-tauluun Supabasessa — Phase 19

### Validated (v1.5)

- ✓ MAP-11: Karttapinnit sininen sporttinen liukuväri (#38bdf8→#0284c7); valkoinen ympyrä säilyy — v1.5
- ✓ MAP-12: Pinneille @keyframes spinOrbit orbit-kiiltoanimaatio (transform/opacity only) — v1.5
- ✓ MAP-13: Klusteripinnit samalla sinisellä teemalla inline HTML -rakenteella — v1.5
- ✓ MAP-14: CalloutCard 160×160px; kirjain kerrallaan animaatio laji ↔ paikan nimi (2s interval) — v1.5
- ✓ MAP-15: Laji-ikonit värillisinä karttapinneissä + callout-kortissa (DiagonaalKortti deferred) — v1.5
- ✓ UI-22: Outfit-fontti via --font-sans CSS-muuttuja, nolla downstream-muutosta — v1.5
- ✓ UI-23: AktiiviLogo sininen sweep auto-loop (0.6s reveal, 3s tauko), 32px — v1.5
- ✓ TODO-03: TO DO overlay etusivun päälle, /suosikit-reitti säilyy — v1.5
- ✓ TODO-04: TodoButton fixed toolbarin alla, Bookmark/X crossfade — v1.5
- ✓ TODO-05: Scale-animaatio top-right origosta, stagger 0.06s korttilistaus — v1.5
- ✓ TODO-06: "TO DO" header + glassmorphism panel, visuaalisesti erottuva — v1.5
- ✓ TODO-07: "Kävikö paikassa?" → InlineReviewExpanded Supabase upsert — v1.5
- ✓ FILTER-02: searchKertakaynti/searchAukinyt poistettu, searchLaji string[], sessionStorage _v:2 — v1.5
- ✓ FILTER-03: FilterCarouselPill karuselli-animaatiolla aktiivisille valinnoille — v1.5

### Validated (v1.6)

- ✓ NAV-06: `/suosikit`-sivu poistettu kokonaan (route, komponentit, navigointilinkit) — v1.6
- ✓ NAV-07: TO DO -painike toolbarista poistettu — v1.6
- ✓ FILTER-04: FilterCarouselPill hieman harmaa tausta — v1.6
- ✓ FILTER-05: Kummituselementti pillin alla korjattu — v1.6
- ✓ SEARCH-01: "Ei tuloksia" ja "Tyhjennä haku" poistettu tekstihausta — v1.6
- ✓ UI-24: Korttilistauksen alareunaan fade-häivytys — v1.6
- ✓ MAP-16: Klusterin klikkaus → zoom (paitsi sama-sijaintisille) — v1.6
- ✓ SHEET-04: "Avaa paikkasivu selaimessa" poistettu — v1.6
- ✓ SHEET-05: Sheet alemmaksi, TO DO -painike näkyy taustalla — v1.6
- ✓ SHEET-06: Sheetin avaamisen viive korjattu — v1.6
- ✓ ICON-01: Uudet SVG-ikonit kaikille lajeille (`lib/sportIcons.tsx`) — v1.6
- ✓ ICON-02: Uudet ikonit käytössä kaikkialla: filtteripilli, kortit, karttapinnit, CalloutCard — v1.6
- ✓ UI-25: PaikkaKortti: rullaava hinnastokaruselli alareunaan — v1.6
- ✓ UI-26: DiagonaalKortti: logo-placeholder vasempaan yläkulmaan — v1.6
- ✓ UI-27: DiagonaalKortti: kuva-placeholder oikealle — v1.6
- ✓ SHEET-01: PaikkaSheet hero-osio: kuvien karuselli + nimi/osoite päälle — v1.6
- ✓ SHEET-02: Hinnasto hero-osion alle — v1.6
- ✓ SHEET-03: Arvosteluwidget collapsed oletuksena — v1.6
- ✓ I18N-01: Käyttäjä voi vaihtaa käyttöliittymäkielen profiilisivulla — v1.6
- ✓ I18N-02: Valittu kieli tallennetaan `NEXT_LOCALE`-cookieen ja säilyy sivulatausten välillä — v1.6
- ✓ I18N-03: Kaikki UI-tekstitykset näytetään valitulla kielellä; kartta/filtterivalinnat säilyvät — v1.6

### Validated (v1.7)

- ✓ **BIZ-01**: Yritys voi rekisteröityä palveluun erillisellä lomakkeella — v1.7
- ✓ **BIZ-02**: `business_accounts` + `business_paikka_links`; yksi tili, useita paikkoja — v1.7
- ✓ **BIZ-03**: Kirjautunut yritys ohjataan automaattisesti `/business`-hallintapaneeliin — v1.7
- ✓ **CLAIM-01**: Yritys hakee olemassa olevan paikan nimellä/osoitteella ja lähettää claim-pyynnön — v1.7
- ✓ **CLAIM-02**: Jos paikkaa ei löydy, yritys luo uuden paikan — v1.7
- ✓ **CLAIM-03**: Claim-paikka pysyy näkyvänä; uusi paikka piilotettu kunnes admin hyväksyy — v1.7
- ✓ **ONBOARD-01**: Automaattinen onboarding-velhou ensimmäisellä kirjautumisella; ei voi ohittaa — v1.7
- ✓ **ONBOARD-02**: Vaihe 1 — Paikka: hae tai luo; esitäytetty nimi/osoite — v1.7
- ✓ **ONBOARD-03**: Vaihe 2 — Mediat: 1–5 kuvaa + logo Supabase Storageen; edistymispalkki — v1.7
- ✓ **ONBOARD-04**: Vaihe 3 — Hinnasto kategorioittain; vähintään yksi hintarivi pakollinen — v1.7
- ✓ **ONBOARD-05**: Vaihe 4 — Aukioloajat; Google Places -data esitäytettynä — v1.7
- ✓ **ONBOARD-06**: Vaihe 5 — Yhteystiedot: puhelin, sähköposti, website, kuvaus (max 300 merkkiä) — v1.7
- ✓ **ONBOARD-07**: Vaihe 6 — Esikatselu: PaikkaKortti, DiagonaalKortti, PaikkaSheet — v1.7
- ✓ **ADMIN-01**: Rekisteröityminen + claim-pyyntö lähettää sähköposti-ilmoituksen adminille — v1.7
- ✓ **ADMIN-02**: `/admin`-sivu listaa odottavat hakemukset: tiedot + paikka + kuvat — v1.7
- ✓ **ADMIN-03**: Admin hyväksyy tai hylkää syyllä; yritys voi hakea uudelleen — v1.7
- ✓ **ADMIN-04**: Hyväksytty/hylätty yritys saa vahvistussähköpostin — v1.7
- ✓ **ADMIN-05**: `/admin` näkyy vain `is_admin = true` -käyttäjälle — v1.7
- ✓ **BIZPANEL-01**: `/business` näyttää yrityksen paikat ja niiden tilan — v1.7
- ✓ **BIZPANEL-02**: Yritys muokkaa kaikkia onboarding-tietoja hallintapaneelista; muutokset heti — v1.7
- ✓ **BIZPANEL-03**: Hallintapaneelissa esikatselu-näkymä: PaikkaKortti, DiagonaalKortti, PaikkaSheet — v1.7
- ✓ **DATA-09**: `business_managed`-boolean; sync-skripti ohittaa managed-paikat — v1.7
- ✓ **DATA-10**: Supabase Storage `business-media`-bucket; RLS per yritys — v1.7

### Validated (v1.9)

- ✓ **AUTHSEP-01–07**: Auth-sessioiden eristys `sb-biz-*`-nimiavaruudella; middleware path-conditional refresh; `/business/kirjaudu`; kaikki business-reitit eriytetty — v1.9
- ✓ **CLEAN-01**: Testitilien siivousmigraatio luotu (suoritus manuaalisesti) — v1.9
- ✓ **CLEAN-02**: WizardInner konsolidoitu `OnboardingWizardInner` + `EditWizardInner` → yksi `WizardInner(mode)` — v1.9
- ✓ **CLEAN-03–05**: update-paikka claim_status -rajoitus poistettu; step-skip-suoja; onboarding_completed kuollut koodi poistettu — v1.9 (pre-existing, verified)

### Validated (v2.0)

- ✓ **BIZNAV-01**: Business user sees a dedicated BusinessNav (Dashboard / Kartta / Profiili / Kirjaudu ulos) on all `/business/*` pages — v2.0
- ✓ **BIZNAV-02**: Consumer NavBar is not rendered on any `/business/*` page — v2.0
- ✓ **BIZUX-02**: User is redirected to `/business` dashboard after successful login at `/business/kirjaudu` — v2.0
- ✓ **BIZUX-03**: `/business` dashboard shows approval status card, venue list with status badges, and quick-action links — v2.0
- ✓ **BIZUX-04**: `/business/map` shows a full-screen map with all venues and "Omat paikat" toggle filter; tapping a pin opens PaikkaSheet — v2.0
- ✓ **BIZPRO-01**: `/business/profiili` displays company name, email, and account type — v2.0
- ✓ **BIZPRO-02**: `/business/profiili` allows editing contact info (phone, email, website) saved to `business_accounts` — v2.0
- ✓ **BIZPRO-03**: `/business/profiili` provides FI/EN language toggle persisted in NEXT_LOCALE cookie — v2.0
- ✓ **BIZPRO-04**: `/business/profiili` sign-out button clears `sb-biz-*` session and redirects to `/business/kirjaudu` — v2.0

### Validated (v2.1)

- ✓ **BRDDB-01**: `business_branding`-taulu Supabasessa: brändidata (logo_url, logo_type, värit, raw_analysis) + status-seuranta (`pending → analyzing → analyzed → failed`), FK `business_accounts`-tauluun — v2.1
- ✓ **BRDDB-02**: RLS-politiikat `business_branding`-taululle: yritys näkee ja muokkaa vain omaa brändidataansa — v2.1
- ✓ **SCRAP-01**: Sovellus hakee yrityksen verkkosivun HTML:n palvelinpuolella `fetch`:llä oikealla User-Agent-headerilla — v2.1
- ✓ **SCRAP-02**: Sovellus poimii brändivärit `<meta name="theme-color">`:stä ja CSS `:root`-muuttujista (ulkoiset `.css`-tiedostot noudetaan rinnakkain) — v2.1
- ✓ **SCRAP-03**: Sovellus kerää logo-kandidaatit HTML:stä: favicon, `og:image`, ja `<img>`-elementit joiden src/alt/class sisältää "logo" — v2.1
- ✓ **SCRAP-04**: Yksi Claude API -kutsu analysoi logo-kandidaatit (vision) + HTML-tekstisisällön → palauttaa logovalinnan, logo-tyypin, värit, hinnaston ja aukioloajat strukturoituna JSON:na — v2.1
- ✓ **SCRAP-05**: Logo-kandidaatit muunnetaan PNG:ksi `sharp`:lla ennen Claude-kutsua (SVG, AVIF, WebP -tuki) — v2.1
- ✓ **ONBOARD-08**: Uusi "Analysoi sivusto" -näkymä ennen 6-vaiheista velhoa — käyttäjä syöttää verkkosivun URL:n ja käynnistää analyysin — v2.1
- ✓ **ONBOARD-09**: "Analysoi"-nappi asettaa statuksen `analyzing` ja näyttää latausindikaattorin; virhetilanteessa (`failed`) selkeä virheilmoitus ja mahdollisuus ohittaa ja jatkaa manuaalisesti — v2.1
- ✓ **ONBOARD-10**: Analyysin tulokset näytetään pre-vaiheen esikatselussa (logo, väripaletti, poimitut hinnat ja aukioloajat) ennen kuin käyttäjä jatkaa velhoon — v2.1
- ✓ **ONBOARD-11**: Poimittu hinnasto esitäyttää Hinnasto-vaiheen (step 3) rivit muokattavina kenttinä — v2.1
- ✓ **ONBOARD-12**: Poimitut aukioloajat esitäyttävät Aukioloajat-vaiheen (step 4) muokattavina kenttinä — v2.1
- ✓ **ONBOARD-13**: Verkkosivun URL esitäyttää Yhteystiedot-vaiheen (step 5) website-kentän — v2.1
- ✓ **PREV-01**: Esikatselu (step 6) renderöi `CalloutCard`:n ja `DiagonaalKortti`:n poimitulla logolla ja brändiväreillä kun brändidataa on saatavilla; fallback olemassa olevaan renderöintiin jos dataa ei ole — v2.1

### Validated (v2.2)

- ✓ **LIVEPREV-01**: Jokainen velhon vaihe päivittää jaettua live-esikatselun tilaa kentän muuttuessa — v2.2 (Phase 51)
- ✓ **LIVEPREV-02**: Desktopilla live-esikatselu näkyy rinnakkain aktiivisen vaiheen muokkauslomakkeen kanssa — v2.2 (Phase 51)
- ✓ **LIVEPREV-03**: Mobiilissa toggle muokkauslomakkeen ja live-esikatselun välillä (ei rinnakkainasettelua) — v2.2 (Phase 51)
- ✓ **LIVEPREV-04**: Live-esikatselu renderöityy `CalloutCard`/`DiagonaalKortti`:lla käyttäen nykyisiä, tallentamattomia kentän arvoja — sekä onboarding- että EditModessa, mukaan lukien AI-sivuanalyysi-poluilla (kolme korjauskierrosta: CR-01 blob-URL-staleness, WR-01 EditModen save-then-navigate-staleness, toinen CR-01 brändipolun hinnasto/aukioloajat/yhteystiedot-ohitus) — v2.2 (Phase 51)
- ✓ **Live-esikatselu AnalysoiSivusto-näytöllä** (ei muodollista REQ-ID:tä — Phase 51:n alun perin rajaama puute, havaittu käyttäjän testissä): "Analysoi sivustosi" -tulosnäyttö (jossa pikahyväksyntä tapahtuu) näyttää nyt saman live-esikatselun kuin velho — logo/väri/galleria-valinnat päivittyvät reaaliajassa ennen "Hyväksy ja lähetä" -painiketta — v2.2 (Phase 51.1)

### Future (deferred from v1.1 + v1.7)

- Automaattinen väriteemat kuvista (color extraction Hero + kortit)
- Maksullisuus / sponsored-paketti yrityksille
- Ketjuadmin (yksi tili, useita toimipisteitä eri omistajilla)
- Suosikkipaikat-sivu kirjautuneelle käyttäjälle (/suosikit)
- Kartta: etäisyyspohjainen suodatus
- Käyttäjäprofiili ja asetukset (laaja)

### Cleanup candidates (deferred at v2.2 close — fold into a small early phase of next milestone)

- **P23-GAP** (never fixed, found in Phase 23 verification): `AktiiviLogo.tsx` redesigned correctly but orphaned — never imported in `Etusivu.tsx`; bottom sheet still shows the old static SVG watermark (lines 906-933). A prior wiring attempt was reverted in Phase 16.
- **P30-GAP** (never fixed, found in Phase 30 verification): hardcoded Finnish strings still visible to EN-locale users in `AuthModal.tsx`, `Etusivu.tsx` CalloutCard, `app/paikat/[id]/page.tsx` location row, `DiagonaalKortti.tsx` aria-label.
- **P30-BUG** (same report): `AuthModal.tsx` line 27 operator-precedence bug in error-message classification — `A || B && C` should be `(A || B) && C`.
- 22 other open verification/UAT items from phases 20-44 (mostly `human_needed` manual checkpoints never re-confirmed) — see `.planning/STATE.md` Deferred Items table for the full list; low priority unless a related area is touched again.

### Out of Scope

- Varausjärjestelmä — linkitetään palveluntarjoajan omaan sivuun
- Reaaliaikainen paikkatieto (kapasiteetti, jonot) — vaatii venue-API-integraation per paikka
- Mobiiliappi (iOS/Android) — web-first ensin, PWA riittää
- Maksujärjestelmä — ei osteta sovelluksessa
- Klusterointi (cluster markers) — korvattu zoom-perusteisella pin→kortti-muutoksella
- Push-ilmoitukset — ei tarvetta v1.1:ssä
- Anonyymi Supabase-tili — suosikit vaativat oikean kirjautumisen

## Context

**Nykytila:** v2.2 Onboarding-tekoälyn parannukset toimitettu 2026-06-21. Kaikki 21 v2.2-vaatimusta toteutettu. Scraper seuraa monisivuisesti hinnasto/aukioloajat/yhteystiedot-alasivuja SSRF-uudelleenvalidoinnilla; käyttäjä valitsee logon ja 2 väriä useista kandidaateista; galleria esitäyttää Mediat-vaiheen; StepPaikka edeltää URL-analyysiä; jaettu live-esikatselun tila näkyy reaaliajassa kaikissa vaiheissa (myös pre-wizard-analyysinäytöllä). 22 plania (phases 47–51.1), 211 committia, 3 päivää.

**Data-arkkitehtuuri:** Google Places API hakee automaattisesti aukioloajat → upsertit Supabaseen. Kertakäyntihinnat manuaalisesti top 20 palvelulle. AI-widget: Claude Haiku + Open-Meteo, sessionStorage-cache per kalenteripäivä + per kaupunki. Supabase Auth käyttäjätaulut + suosikit (user_id → paikka_id). Sync-skripti tukee ?kaupunki= parametria Helsinki/Turku/Tampere-datalle.

**Tekninen ympäristö:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind v3, Framer Motion, Supabase (Postgres + RLS + Auth + @supabase/ssr), Google Maps/Places API, Open-Meteo, @anthropic-ai/sdk, @serwist/next + serwist (PWA), Vitest.

**Data ops (manuaaliset):** `/api/admin/sync-paikat?kaupunki=Helsinki|Turku|Tampere` — aukioloajat, `npx tsx scripts/seed-hinnat.ts` — hinnat.

## Constraints

- **Stack**: Next.js 14 + Supabase + Tailwind v3 — ei vaihdeta runkoa
- **Design**: Glassmorphism + Indigo-väripaletti (CLAUDE.md), Emil Kowalski -animaatiofilosofia
- **Data**: GOOGLE_PLACES_API_KEY server-only, kartta client-side (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
- **Kirjautuminen**: Supabase Auth — suosikit vaativat tilin, kaikki muu toimii anonyymisti
- **PWA**: Serwist (@serwist/next + serwist) — next-pwa ja @ducanh2912/next-pwa hylätty

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router + Supabase | Nopea kehitys, skaalautuva, hyvä SSR-tuki | ✓ Toimii hyvin |
| Kartta etusivun pääominaisuus | GPS-pohjainen löytäminen on ydinkokemus | ✓ Toteutettu bottom sheet -arkkitehtuurilla |
| Ei kirjautumista v1:ssä | Matala kynnys, nähdään käyttö ennen pakottamista | ✓ Kaikki anonyymi v1.0:ssa |
| Tampere-first | Fokus ensin, skaalaus myöhemmin | ✓ v1.0 Tampere; v1.1 +Helsinki +Turku |
| Sääpohjainen AI-suosittelu | Erilaistava ominaisuus, Open-Meteo ilmainen | ✓ Claude Haiku + sessionStorage + personointi |
| Mainostila bisnesmalliksi | Käyttäjille ilmainen, liikunta-ala kohderyhmä | ✓ Sponsoroitu-badge v1.1 |
| @vis.gl/react-google-maps | Korvasi @react-google-maps/api — ei double-load flashia | ✓ MAP-03 |
| lib/aukiolo.ts single source of truth | Aukioloaika-logiikka yhdessä paikassa, TDD | ✓ Vitest + 100% coverage |
| sessionStorage cache aina (myös fallback) | AI-03: ei re-fetch samana päivänä riippumatta Claude-tilasta | ✓ Bugi korjattu UAT:ssa |
| Supabase Auth per-request createServerClient | Ei jaeta auth-singletoneja requestien välillä | ✓ Phase 9 |
| toggleSuosikki kutsuu getUser() joka kerta | Vältää vanhentuneen auth-staten closureen jääminen | ✓ Phase 9 |
| AI route: GET anon / POST kirjautunut | Cache-avain sisältää suosikkimäärän suffiksin | ✓ Phase 9 |
| Map focus URL: /?id=<paikka_id> | Ei ?nakyma=kartta (dead param per CLAUDE.md); sheet ei aukea | ✓ Phase 8 |
| Serwist PWA (ei next-pwa) | next-pwa ja @ducanh2912/next-pwa hylätty/abandoned | ✓ Phase 11 |
| themeColor viewport exportissa | Next.js 14 metadata deprecation vältetty | ✓ Phase 11 |
| offline/page.tsx käyttää <a href> | SW voi interceptoida kun client-side router ei saatavilla | ✓ Phase 11 |
| kotikaupunki erillisessä profiles-taulussa | user_id FK → auth.users; browser client + RLS writes (anon key) | ✓ Phase 14 |
| buildReissuKonteksti palauttaa string \| null | null = ei kotikaupunkia → prompt identtinen Phase 9:n kanssa | ✓ Phase 14 |
| reviews SELECT USING(true) | Arvostelut ovat julkisia (REVIEW-04); poikkeaa profiles/suosikit-mallista | ✓ Phase 15 |
| reviewer_name = email prefix (split('@')[0]) | T-15-02: user_id ja täysi sähköposti eivät koskaan renderöidy julkisesti | ✓ Phase 15 |
| computeAvgRating palauttaa raakakeskiarvon | Pyöristys renderöintiaikaan — helppo testata tasavertaisesti | ✓ Phase 15 |
| onConflict: 'user_id,paikka_id' upsertissä | Max 1 arvostelu/käyttäjä/paikka compositeUNIQUE:lla | ✓ Phase 15 |
| Pin color #ef4444 kaikille pinneille | Laji erotetaan ikonikuvalla, ei värillä — visuaalinen yhtenäisyys | ✓ Phase 18 |
| Record<string,T[]> klusteroinnissa | TS 5.9.3 Map<K,V> generic regression workaround | ✓ Phase 18 |
| CalloutCard clip-path: path() spike | ResizeObserver mittaa korkeus, laskee polun — ei erillisiä elementtejä | ✓ Phase 18 |
| translateX(-50%) erilliseen wrapper-diviin | layoutId-elementti ei saa omistaa conflictoivaa CSS-transformia | ✓ Phase 18 |
| next-intl without-routing | Säilyttää URL-sopimuksen; ei URL-pohjaista locale-routingia | ✓ Phase 30 |
| NEXT_LOCALE-cookie (httpOnly, sameSite:lax) | SSR-yhteensopiva; middleware lukee ennen renderöintiä; ei localStorage | ✓ Phase 30 |
| SVG path-string (lib/sportIcons.tsx, ei @svgr/webpack) | Turbopack-yhteensopiva; lib/lajit.ts puhdas SPORT_ICONS:sta | ✓ Phase 28 |
| Kielivalitsin profiilisivulla ainoastaan | Eksplisiittinen vaihto — ei auto-detection; vähemmän kompleksisuutta | ✓ Phase 30 |
| Math.min(fullH*0.82, fullH-108) sheet height | 108px gap pitää TODO-painikkeen (100px + 8px safety) aina näkyvissä | ✓ Phase 27 |
| Compile-time key coverage assertion (IN-05) | en.json kattaa kaikki fi.json-avaimet — löytyy build-ajassa, ei runtime | ✓ Phase 30 |
| Business auth sama Supabase Auth | Ei erillistä Supabase-projektia; rooli `business_accounts`-taulusta, ei auth.users.metadata | ✓ Phase 31 |
| Storage RLS: SECURITY DEFINER julkisessa skeemassa | Hosted Supabase ei salli storage-skeeman suoraa viittausta politiikoissa | ✓ Phase 31 |
| JWT verify ennen Route Handler -logiikkaa | `supabaseAdmin.auth.getUser(token)` — ei luoteta client-supplied user_id:hen | ✓ Phase 32 |
| Draft table wizard-tilaksi | `onboarding_draft` paikka_id-scopettuna — tukee multi-venue-tilejä, kestää sivulataukset | ✓ Phase 34 |
| Admin-hyväksyntä ensimmäiseen rekisteröintiin; muokkaukset heti | Ei re-approval -vaatimusta tavallisille muutoksille — vähemmän kitkaaa | ✓ Phase 35 |
| Reapply: UPDATE rejected → pending (ei INSERT) | Composite UNIQUE rajoite business_paikka_links:ssä — uusi INSERT rikkoisi sen | ✓ Phase 35 |
| paikka_id URL-parametrina edit/onboarding-velhossa | Estää cross-venue draft -kontaminaation; mahdollistaa suoran linkityksen | ✓ Phase 36 |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-06-21 — v2.2 milestone shipped and archived*
