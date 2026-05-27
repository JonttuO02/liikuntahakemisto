# Phase 11: PWA - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Sovelluksesta tulee asennettava PWA: Web App Manifest + service worker (Serwist) mahdollistavat "Lisää kotinäyttöön" -toiminnon ja offline-tilan, jossa listanäkymä latautuu aiemmin välimuistiin tallennettuine liikuntapaikkakortteineen.

Requirements: PWA-01, PWA-02.

**Out of scope:** Muiden sivujen (/, /paikat/[id]) offline-tuki, iOS-kohtaiset asennusohjeet, push-ilmoitukset, todellisten brändiikoneiden generointi (deferred).

</domain>

<decisions>
## Implementation Decisions

### Serwist-kirjasto (locked)
- **D-01:** Kirjasto on Serwist (`@serwist/next` + `serwist`) — next-pwa ja @ducanh2912/next-pwa ovat hylättyjä, niitä ei käytetä.
- **D-02:** Service worker on poistettu käytöstä dev-moodissa (`disable: process.env.NODE_ENV === 'development'`).
- **D-03:** Service worker suodattaa pois `_rsc`-pyynnöt (Next.js RSC requests), jotta client-side navigointi ei hajoa.
- **D-04:** `next dev` (ei `--turbo`) — Serwist vaatii webpackin.

### Välimuistaus
- **D-05:** Välimuistauksen kohde: ainoastaan listanäkymä (`/?nakyma=lista`). Etusivu (/) ja profiilisivut eivät ole offline-scope tässä vaiheessa.
- **D-06:** Navigaatiostrategia: **NetworkFirst** listanäkymälle — käyttäjä saa aina tuoreen datan kun on verkossa; välimuistista fallback vain offline-tilassa.
- **D-07:** Välimuistin vanheneminen: 24 tuntia — yli 24h vanha snapshot hylätään, jolloin offline-tilassa näytetään /offline-sivu.
- **D-08:** Staattiset resurssit (`/_next/static/**`): **precached** Serwistin installTime-vaiheessa, aggressiivinen CacheFirst + pitkä TTL (1 vuosi — Next.js content-hash takaa ylikirjoituksen uusissa buildeissa).

### Asennusprompt
- **D-09:** Android: selaimen natiivi A2HS-banneri/mini-infobar riittää — ei omaa UI:ta, ei `beforeinstallprompt`-interceptointia.
- **D-10:** iOS: ei ohjeita — käyttäjät löytävät Share → Add to Home Screen itse.
- **D-11:** Manifest `display: "standalone"` — asennettu versio näyttää natiivisovellukselta ilman selaimen osoitepalkkia.

### Offline-fallback
- **D-12:** Kaikki välimuistin ulkopuoliset sivut offline-tilassa saavat custom `/offline`-sivun (ei selaimen natiivia virhesivua, ei redirectiä).
- **D-13:** `/offline`-sivu precachataan SW:n asennusvaiheessa — on aina saatavilla offline-tilassa.
- **D-14:** `/offline`-sivun sisältö: minimaalinen — logo + suomenkielinen viesti "Ei verkkoyhteyttä. Tarkista yhteys ja yritä uudelleen." + "Yritä uudelleen" -nappi. Tyyli seuraa `app/not-found.tsx`-sivun rakennetta ja glassmorphism-designia.

### PWA-ikonit
- **D-15:** Ikonit ovat **placeholder** — oikeat brändi-ikonit tehdään myöhemmin kun nimi ja logo on päätetty.
- **D-16:** Placeholder-ikonit generoidaan ohjelmallisesti: yksinkertainen indigo-neliö (#4F46E5, projektin indigo-600) ilman SVG-konvertointia. Kaksi kokoa: `public/icon-192x192.png` ja `public/icon-512x512.png`. Käytetään Node.js:n Canvas API:a tai pureimage-kirjastoa (devDep) skriptissä `scripts/generate-pwa-icons.mjs`.
- **D-17:** Manifest viittaa ikoneihin, `theme_color: "#4F46E5"`, `background_color: "#ffffff"`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PWA-kirjasto
- `.planning/STATE.md` § "Active Decisions" — PWA-kirjasto (Serwist), dev-mode disable, _rsc exclusion, --turbo-rajoitus — KAIKKI jo päätetty
- `next.config.mjs` — tällä hetkellä tyhjä; pitää kääriä `withSerwist`-wrapperin sisään

### Vaatimukset
- `.planning/REQUIREMENTS.md` — PWA-01, PWA-02
- `.planning/ROADMAP.md` — Phase 11 success criteria (installability + offline listing + no RSC breakage)

### Offline-sivun tyylimalli
- `app/not-found.tsx` — suomenkielinen virhe-UI, rakenne ja tyyli malliksi /offline-sivulle
- `app/error.tsx` — toinen esimerkki Finnish error UX:stä
- `CLAUDE.md` — glassmorphism-utilities (.glass, .glass-btn), typografia, väripaletti — /offline-sivu noudattaa näitä

### Arkkitehtuuri
- `app/layout.tsx` — manifest-linkki ja PWA-metatagit lisätään tänne (tai Next.js 14 metadata API:lla)
- `app/globals.css` — glassmorphism-utilities joita /offline-sivu käyttää

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/not-found.tsx` — suomenkielinen, tyylitelty virhe-UI glassmorphism-designilla; `/offline`-sivu seuraa tätä rakennetta täsmälleen
- `app/acta-symbol.svg` — olemassa (vaikka placeholder-ikoni on ohjelmoitu indigosta, varsinainen SVG on saatavilla myöhempää brändipäivitystä varten)
- `lib/utils.ts` (`cn()`) — Tailwind-luokkien yhdistely, käytettävissä /offline-sivulla

### Established Patterns
- Next.js 14 App Router `metadata` API — manifest-linkki ja `themeColor` lisätään `app/layout.tsx`:n `export const metadata`-objektiin, ei manuaalisilla `<link>`-tageilla
- Error-sivut ovat server componentteja (`app/not-found.tsx`, `app/error.tsx`) — `/offline`-sivu samoin
- Kaikki tekstit suomeksi — offline-viesti suomeksi

### Integration Points
- `next.config.mjs` — withSerwist-wrapper käärii olemassa olevan tyhjän konfigin
- `app/layout.tsx` — `metadata.manifest` osoittaa `/manifest.webmanifest`-tiedostoon; `metadata.themeColor` asetetaan tässä
- `public/` — ikonitiedostot (`icon-192x192.png`, `icon-512x512.png`) ja manifest (`manifest.webmanifest`) sijoitetaan tänne
- `app/offline/page.tsx` — uusi sivu, Serwist ohjaa sinne offline-fallbackina

</code_context>

<specifics>
## Specific Ideas

### Placeholder-ikonien generointi
Skripti `scripts/generate-pwa-icons.mjs` generoi ohjelmoiden indigo (#4F46E5) -neliön kahdessa koossa — ei tarvita ulkoista designtyökalua tai SVG-konversiota. Esimerkki pureimage-kirjastolla:
```js
// 192x192 ja 512x512, täytetty #4F46E5
```
Ajetaan kerran ennen buildaamista / planin suoritusta.

### Serwist Next.js -integraatio
Olemassa oleva `next.config.mjs` on täysin tyhjä — `withSerwist` voidaan lisätä puhtaasti ilman konflikteja. Serwist-konfiguraatiossa: `swSrc: 'app/sw.ts'`, `swDest: 'public/sw.js'`, `disable: process.env.NODE_ENV === 'development'`.

### /offline-sivun rakenne
Seuraa `app/not-found.tsx`-mallia: server component, `<main className="min-h-screen flex flex-col items-center justify-center">`, glassmorphism-kortti `.glass`, suomenkielinen teksti, `<a href="/">` -nappi retry-logiikalla.

</specifics>

<deferred>
## Deferred Ideas

- **Oikeat brändi-ikonit** — generoidaan kun nimi ja logo on päätetty; tämän vaiheen ikonit ovat selvästi väliaikaisia
- **Etusivun (/) offline-tuki** — Google Maps vaatii verkkoa joka tapauksessa, joten hyöty olisi marginaalinen; voidaan lisätä myöhemmin
- **Profiilisivujen (/paikat/[id]) runtime-caching** — käyttäjän vierailemien sivujen automaattinen cachetus; hyödyllinen mutta ei phase 11 -scope
- **iOS-asennusohjeet** — "Paina Jaa → Lisää kotinäyttöön" -tooltip tai banner; deferred koska iOS-käyttäjät ovat tottuneita tapaan
- **Custom Android install prompt UI** — MoreHorizontal-toolbariin integroitu "Asenna"-painike; browser-native riittää nyt

</deferred>

---

*Phase: 11-pwa*
*Context gathered: 2026-05-27*
