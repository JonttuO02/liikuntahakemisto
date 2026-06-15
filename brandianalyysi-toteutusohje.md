# Toteutusohje: Yrityssivujen automaattinen brändianalyysi

## Tavoite
Rakenna ominaisuus `/business/onboarding`-sivulle, jonka avulla yritys syöttää
olemassa olevan verkkosivunsa URL:n, ja sovellus analysoi sen automaattisesti
(logo, värimaailma, kuvat) ja esitäyttää yrityksen brändidatan. Tätä dataa
käytetään komponenteissa `CallOutCard`, `DiagonaaliKortti` ja profiilisivulla.

Toteuta vaiheittain alla olevassa järjestyksessä. **Älä rakenna kaikkea kerralla**
— tee vaihe valmiiksi, testaa, ja jatka vasta sitten seuraavaan.

---

## Vaihe 0: Kartoitus ennen koodausta
Ennen kuin kirjoitat mitään koodia, tarkista projektista:
1. Onko komponentteja `CallOutCard`, `DiagonaaliKortti` ja profiilisivu jo olemassa?
   Etsi ne ja lue niiden propsit. Brändidatan kentät pitää mapata näiden
   komponenttien tarvitsemiin propseihin.
2. Mikä on Supabase-skeeman nykyinen rakenne `businesses`-taululle?
3. Onko Supabase Storage -bucket olemassa kuville? Jos ei, sellainen tarvitaan
   logoille ja kortin kuville.

Raportoi löydökset ennen kuin jatkat. Älä oleta rakennetta — lue tiedostot.

---

## Vaihe 1: Tietokantaskeema
Luo Supabase-migraatio uudelle taululle `business_branding`.

```sql
create table business_branding (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_url text not null,
  logo_url text,                  -- Supabase Storage URL
  logo_type text check (logo_type in ('icon', 'icon_with_text', 'text_only')),
  primary_color text,             -- hex, esim. '#000000'
  secondary_color text,
  accent_color text,
  background_color text,
  text_color text,                -- kontrasti background_coloriin (suhde > 4.5)
  card_image_url text,            -- valinnainen hero/cover-kuva kortteihin
  status text not null default 'pending'
    check (status in ('pending', 'analyzing', 'analyzed', 'approved', 'failed')),
  raw_analysis jsonb,             -- mallin koko JSON-vastaus debuggaukseen
  error_message text,             -- jos status = 'failed'
  analyzed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_business_branding_business_id on business_branding(business_id);
```

Lisää RLS-politiikat samaan tapaan kuin muilla yritystauluilla projektissa
(vain yrityksen omat käyttäjät näkevät/muokkaavat omaa brändidataansa).

---

## Vaihe 2: Scraper-moduuli
Luo `lib/branding/scraper.ts`. Tämä moduuli hakee analysoitavalta sivulta
raakamateriaalin. **Ei vielä Claude API -kutsua tässä vaiheessa.**

Funktio: `scrapeWebsite(url: string)`

Vaiheet:
1. Avaa sivu Playwrightilla (jos projektissa ei ole Playwrightia, asenna se).
2. Ota koko sivun screenshot, koko 1280x800, palauta PNG base64-muodossa.
3. Kerää logokandidaatit (palauta lista base64-PNG:itä):
   - favicon (`/favicon.ico` ja `<link rel="icon">`)
   - `og:image` meta-tagi
   - kaikki `<img>`-elementit, joiden `src`, `alt` tai `class` sisältää
     sanan "logo" (case-insensitive)
4. **Kuvakonversio**: kaikki kandidaattikuvat pitää konvertoida PNG:ksi
   `sharp`-kirjastolla ennen palautusta. Erityisesti AVIF-muotoiset logot
   eivät toimi suoraan — konvertoi ne PNG:ksi. (Tämä on tunnettu ongelma
   aiemmista projekteista.)
5. Palauta objekti: `{ screenshot: string, logoCandidates: string[] }`

Virheenkäsittely: jos sivua ei saada ladattua (timeout, 404), heitä selkeä
virhe jonka kutsuja voi tallentaa `error_message`-kenttään.

**Tärkeää Framer-sivuista**: jos sivu on rakennettu Framerilla, värit eivät näy
CSS:ssä. Älä yritä parsia värejä CSS:stä lainkaan — värianalyysi tehdään
seuraavassa vaiheessa screenshotista vision-mallilla. Tämä on tahallinen
suunnitteluvalinta, ei puute.

---

## Vaihe 3: Vision-analyysi
Luo `lib/branding/analyze.ts`. Tämä ottaa scraperin tuloksen ja kutsuu
Claude API:a analysoidakseen brändin.

### Prompti
Tallenna system-prompti omaan tiedostoon `lib/branding/prompt.ts`:

```typescript
export const BRANDING_ANALYSIS_PROMPT = `Olet brändianalyysityökalu. Saat
yrityksen verkkosivun screenshotin ja joukon logokandidaattikuvia. Tehtäväsi on
poimia yrityksen visuaalinen ilme.

Tehtävät:
1. Valitse logokandidaateista todennäköisin yrityksen virallinen logo. Palauta
   sen indeksi (0-pohjainen) annetussa kuvajärjestyksessä. Logokandidaatit
   annetaan screenshotin JÄLKEEN, eli ensimmäinen logokandidaatti on indeksi 0.
2. Luokittele valittu logo:
   - "icon": pelkkä symboli/kuvake ilman tekstiä
   - "icon_with_text": symboli JA yrityksen nimi yhdessä
   - "text_only": pelkkä yrityksen nimi tekstinä, ei symbolia
3. Poimi sivun pääväripaletti hex-koodeina:
   - primary_color: hallitseva brändiväri
   - secondary_color: toissijainen väri
   - accent_color: korostusväri (napit, linkit)
   - background_color: pääasiallinen taustaväri
   - text_color: leipätekstin väri
4. Varmista että text_color on luettava background_coloria vasten
   (WCAG-kontrastisuhde vähintään 4.5:1). Jos ei ole, valitse luettavampi sävy.

Vastaa AINOASTAAN validilla JSON-objektilla. Älä lisää selityksiä, ei
Markdown-koodiblokkeja, ei mitään muuta tekstiä ennen tai jälkeen JSON:in.

Vastauksen muoto:
{
  "logo_index": 0,
  "logo_type": "icon_with_text",
  "primary_color": "#000000",
  "secondary_color": "#ffffff",
  "accent_color": "#ff5500",
  "background_color": "#f5f5f5",
  "text_color": "#1a1a1a"
}`;
```

### Analyysifunktio
Funktio: `analyzeBranding(screenshot: string, logoCandidates: string[])`

1. Rakenna API-kutsu `https://api.anthropic.com/v1/messages`:
   - `model: "claude-sonnet-4-6"`
   - `max_tokens: 1024`
   - `system: BRANDING_ANALYSIS_PROMPT`
   - `messages`: yksi user-viesti jonka `content`-array sisältää:
     - ensin screenshot (type: image, base64 PNG)
     - sitten kaikki logokandidaatit järjestyksessä (type: image, base64 PNG)
     - lopuksi tekstikenttä: "Analysoi tämä yrityssivu ohjeiden mukaisesti."
   - API-avain `process.env.ANTHROPIC_API_KEY` headerissa `x-api-key`
2. Parsi vastaus turvallisesti:
   - Poimi `data.content`-arraysta ensimmäinen `type === "text"` -blokki.
   - Poista mahdolliset ```` ```json ```` -aidat varmuuden vuoksi.
   - `JSON.parse` try/catchin sisällä. Jos parsinta epäonnistuu, heitä virhe.
3. Validoi että kaikki kentät ovat olemassa ja värit ovat validia hex-muotoa
   (`/^#[0-9a-fA-F]{6}$/`). Jos jokin puuttuu, merkitse status 'failed'.
4. Palauta jäsennelty objekti + alkuperäinen JSON `raw_analysis`-kenttään.

---

## Vaihe 4: Kuvien tallennus
Kun vision-analyysi on valinnut logon (`logo_index`):
1. Ota vastaava base64-logo `logoCandidates`-listasta.
2. Lataa se Supabase Storageen (yrityskohtaiseen kansioon, esim.
   `branding/{business_id}/logo.png`).
3. Tallenna julkinen URL `business_branding.logo_url`-kenttään.
4. Tee sama mahdolliselle kortin hero-kuvalle, jos sellainen poimitaan
   (`card_image_url`).

Älä tallenna base64-dataa suoraan tietokantaan — vain Storage-URL:t.

---

## Vaihe 5: API-reitti ja onboarding-flow
1. Luo API-reitti (esim. `app/api/business/branding/analyze/route.ts`)
   joka ottaa vastaan `{ business_id, url }` ja ajaa ketjun:
   `scrapeWebsite → analyzeBranding → tallenna kuvat → tallenna riviin`.
   - Aseta status `analyzing` heti alussa, `analyzed` lopussa,
     `failed` + `error_message` virhetilanteessa.
   - **Huom**: scraping + vision voi kestää 10-30 sekuntia. Älä jätä käyttäjää
     odottamaan synkronisesti pitkää aikaa ilman palautetta — näytä
     latausindikaattori ja pollaa statusta, tai aja taustajobina jos projektissa
     on jonojärjestelmä.

2. Lisää `/business/onboarding`-sivulle:
   - Kenttä URL:n syöttöä varten + "Analysoi"-nappi.
   - Latausindikaattori analyysin aikana (status `analyzing`).
   - **Esikatselu**: kun status = `analyzed`, renderöi `CallOutCard`,
     `DiagonaaliKortti` ja profiilisivun esikatselu poimitulla brändidatalla.
   - Manuaaliset muokkauskentät: värivalitsimet ja logon vaihtomahdollisuus,
     jotta yritys voi korjata virheet ennen hyväksyntää.
   - "Hyväksy ja julkaise" -nappi joka asettaa statuksen `approved`.

---

## Vaihe 6: Brändidatan kytkentä komponentteihin
Mappaa `business_branding`-kentät komponenttien propseihin. Tarkista vaiheessa 0
löytämäsi propsit ja yhdistä esim.:
- `CallOutCard`: logo (`logo_url` + `logo_type` sijoittelua varten), `accent_color`
- `DiagonaaliKortti`: `primary_color`, `secondary_color`, `card_image_url`, logo
- profiilisivu: koko paletti + logo + kuvat

`logo_type` ohjaa logon sijoittelua: "icon_with_text" -logo ei tarvitse erillistä
tekstimuotoista yrityksen nimeä viereen, kun taas "icon" tai "text_only" voi
vaatia eri asettelun. Toteuta tämä logiikka komponenttien sisällä.

---

## Yleiset säännöt
- Älä käytä HTML `<form>`-tageja React-komponenteissa jos projekti on muuten
  välttänyt niitä — käytä onClick/onChange-käsittelijöitä.
- Pidä prompti versionhallinnassa tiedostossa, älä tietokannassa (alkuvaiheessa).
- Testaa scraper ja analyysi 2-3 oikealla suomalaisella yrityssivulla ennen
  kuin kytket UI:n (käytä esim. paikallisen kuntosalin tai liikuntakeskuksen
  sivua). Tulosta välivaiheet konsoliin debuggausta varten.
- Käytä projektin olemassa olevia konventioita (tiedostorakenne, nimeämistyyli,
  Supabase-client-instanssi). Älä keksi uusia kuvioita jos vakiintunut on jo
  olemassa.
