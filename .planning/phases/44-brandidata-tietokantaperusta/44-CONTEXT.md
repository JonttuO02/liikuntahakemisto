# Phase 44: Brändidatan tietokantaperusta - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Luodaan `business_branding`-taulu Supabasessa kolonneineen, uniqueness-rajoituksineen ja RLS-politiikoineen. Faasi on puhdas tietokantafaasi — ei koodia, ei Route Handlereitä, ei UI:ta.

</domain>

<decisions>
## Implementation Decisions

### Taulun skeema
- **D-01:** Taulun nimi: `business_branding`
- **D-02:** PK: `id uuid primary key default gen_random_uuid()`
- **D-03:** FK: `business_account_id uuid not null references business_accounts(user_id) on delete cascade` — ei `businesses`-tauluun
- **D-04:** Kolumnit: `logo_url text`, `logo_type text check (logo_type in ('icon', 'icon_with_text', 'text_only'))`, `colors jsonb` (värit JSON-taulukkona, ei erillisiä värikolumneja), `raw_analysis jsonb`, `status text`, `website_url text`, `error_message text`, `analyzed_at timestamptz`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- **D-05:** Status-arvot: `check (status in ('pending', 'analyzing', 'analyzed', 'failed'))` — ei `approved`-arvoa
- **D-06:** `colors`-kentän rakenne: `string[]` (hex-värikoodejen taulukko) — tarkka muoto määritelty Faasin 45 success criteriassa

### Rivin yksilöllisyys
- **D-07:** `UNIQUE(business_account_id)` — yksi branding-rivi per yritys. Faasi 45 tekee UPSERT:in (ei INSERT+INSERT).

### Lisäkolumnit (toteutusohjeesta)
- **D-08:** `error_message text` — erillinen virheviestisarake debuggauksen helpottamiseksi. Faasi 45 tallentaa tähän virhetilanteessa.
- **D-09:** `analyzed_at timestamptz` — päivitetään kun status asetetaan `analyzed`. Kertoo milloin viimeisin onnistunut analyysi ajettiin.

### RLS-politiikat
- **D-10:** Kolme politiikkaa: SELECT, INSERT, UPDATE — tasan BRDDB-02:n vaatimus
- **D-11:** Ehto: `auth.uid() = business_account_id` kaikissa kolmessa
- **D-12:** Ei DELETE-politiikkaa — poistaminen service role -avaimella (kuten muutkin admin-operaatiot)
- **D-13:** INSERT-politiikassa `WITH CHECK`, SELECT/UPDATE-politiikassa `USING` (sama malli kuin `business_accounts` ja `onboarding_draft`)

### Indeksi
- **D-14:** `create index idx_business_branding_business_account_id on business_branding(business_account_id)` — tavalliset hakupolut käyttävät tätä

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimusmäärittely
- `.planning/ROADMAP.md` §"Phase 44: Brändidatan tietokantaperusta" — success criteria kolonneineen
- `.planning/REQUIREMENTS.md` §BRDDB-01, §BRDDB-02 — tarkka vaatimusteksti

### Toteutusohje (sovellettavin osin)
- `brandianalyysi-toteutusohje.md` §"Vaihe 1: Tietokantaskeema" — pohjarakenne; huom. tässä ohjeessa `business_id → businesses` on **korvattu** `business_account_id → business_accounts` (STATE.md v2.1-päätös). `approved`-status ei kuulu tähän milestoneen.

### Skeema-analogit (olemassa olevat migraatiot)
- `supabase/migrations/20260605000000_business_accounts.sql` — RLS-kolmikko-malli (SELECT/INSERT/UPDATE), business_accounts-taulun PK = `user_id`
- `supabase/migrations/20260606000000_onboarding.sql` — `onboarding_draft` RLS-malli ml. DELETE-politiikka; tässä faasin ei DELETE-politiikkaa

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/20260605000000_business_accounts.sql` — kopioi RLS-politiikka-rakenne suoraan, vaihda taulu ja FK-sarakenimi
- `supabase/migrations/20260606000000_onboarding.sql` — `onboarding_draft`-malli JSONB-sarakkeilla ja `updated_at`

### Established Patterns
- `business_accounts.user_id` on UUID PRIMARY KEY (ei erillinen `id`) → FK pitää viitata `business_accounts(user_id)`, ei `business_accounts(id)`
- Kaikki kirjoitukset branding-tauluun tulevat Route Handlereista service role -avaimella → RLS-INSERT/UPDATE-politiikat ovat defense-in-depth, ei päävirtaa
- Migraatiotiedostojen nimeäminen: `YYYYMMDDNNNNNN_kuvaus.sql` — viimeisin `20260615000000`

### Integration Points
- Faasi 45 (Scraper & Claude API -putki) käyttää tätä taulua tallentaakseen analyysin tuloksen — UPSERT business_account_id-avaimella
- Faasi 46 (Pre-vaihe UI) lukee `business_branding`-taulusta preview-datan onboarding-ennen-wizard-vaiheessa

</code_context>

<specifics>
## Specific Ideas

- Migraatiotiedoston nimeksi jotain kuten `20260615000001_business_branding.sql` (seuraava tiedosto päivämäärähierarkiassa)
- Skeema-malli (sovellettuna STATE.md-päätöksillä):

```sql
create table business_branding (
  id                   uuid primary key default gen_random_uuid(),
  business_account_id  uuid not null references business_accounts(user_id) on delete cascade,
  website_url          text not null,
  logo_url             text,
  logo_type            text check (logo_type in ('icon', 'icon_with_text', 'text_only')),
  colors               jsonb,
  raw_analysis         jsonb,
  status               text not null default 'pending'
    check (status in ('pending', 'analyzing', 'analyzed', 'failed')),
  error_message        text,
  analyzed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint business_branding_unique_account unique (business_account_id)
);

create index idx_business_branding_business_account_id
  on business_branding(business_account_id);
```

</specifics>

<deferred>
## Deferred Ideas

- `approved`-status (yrittäjä hyväksyy analyysin tuloksen) — deferred, ei kuulu tähän milestoneen
- DELETE-politiikka branding-taululle — deferred, tehdään service role -avaimella tarvittaessa
- `card_image_url` -kenttä hero/cover-kuvalle — toteutusohjeessa mainittu mutta ei ROADMAPissa; deferred Faasin 46 UI-integrointiin saakka

</deferred>

---

*Phase: 44-Brändidatan tietokantaperusta*
*Context gathered: 2026-06-15*
