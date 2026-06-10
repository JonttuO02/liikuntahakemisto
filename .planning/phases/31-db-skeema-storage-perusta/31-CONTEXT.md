# Phase 31: DB-skeema & Storage-perusta - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Luodaan kaikki tietokantarakenteet ja tallennusinfrastruktuuri, joille jokainen myöhempi v1.7-vaihe rakentuu. Tämä on puhdas infrastruktuurivaihe — ei UI:ta, ei autentikointia, ei lomakkeita. Tuloksena ovat SQL-migraatiotiedostot ja Supabase Storage -bucket, jotka seuraavat vaiheet (32–36) voivat heti käyttää.

Vaatimukset: BIZ-02, DATA-09, DATA-10

</domain>

<decisions>
## Implementation Decisions

### business_accounts-taulu
- **D-01:** Sarakkeet: `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `company_name TEXT NOT NULL`, `approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **D-02:** Minimaalinen skeema — kaikki yritystiedot (yhteystiedot, kuvaukset, hinnaston jne.) kerätään Phase 34 -onboarding-velhossa erillisiin tauluihin tai business_paikka_links-kautta
- **D-03:** `rejection_reason TEXT` -sarake lisätään Phase 35 -migraatiolla (ei nyt) — ADMIN-03/ADMIN-04 vaativat sen vasta silloin

### business_paikka_links-taulu
- **D-04:** Sarakkeet: `id BIGSERIAL PRIMARY KEY`, `business_account_id UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE`, `paikka_id BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE`, `claim_status TEXT NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending', 'approved', 'rejected'))`, `link_type TEXT NOT NULL CHECK (link_type IN ('claim', 'created'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **D-05:** `UNIQUE(paikka_id)` — yksi paikka voi kuulua vain yhdelle yritykselle (ketjuadmin siirretty tulevaisuuteen)
- **D-06:** `claim_status` on per-paikka taso (ei account-taso) — yhdellä yrityksellä voi olla useita paikkoja eri hyväksymisvaiheissa
- **D-07:** `link_type` kertoo suoraan onko kyse olemassa olevan paikan claim-pyynnöstä (`'claim'`) vai uuden paikan luonnista (`'created'`) — Phase 35 admin-UI käyttää tätä näyttääkseen oikeat tiedot

### business_managed paikat-taulussa
- **D-08:** `ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS business_managed BOOLEAN NOT NULL DEFAULT false` — sync-skripti (`app/api/admin/sync-paikat/route.ts`) ohittaa rivit joissa `business_managed = true`
- **D-09:** Taulun nimi on `liikuntapaikat` (ei `paikat`) — yksi migraatio (`20260530000000_add_image_url_to_paikat.sql`) viittaa virheellisesti `paikat`-nimiseen tauluun, tarkistettava Supabasesta

### Supabase Storage business-media
- **D-10:** Bucket-nimi: `business-media`
- **D-11:** Polkurakenne:
  - Logo (per-yritys): `{business_account_id}/logo/logo.{ext}`
  - Kuvat (per-paikka): `{business_account_id}/{paikka_id}/images/{filename}`
- **D-12:** RLS-politiikka kirjoituksille: (1) tarkista että polun `{business_account_id}` vastaa `auth.uid()`:n `business_accounts`-riviä, (2) tarkista että `business_paikka_links` -liitoksessa on rivi jossa `business_account_id = auth.uid()` ja `paikka_id` vastaa polun `{paikka_id}`:tä
- **D-13:** Luetaan julkisesti (public read) — paikan kuvat näkyvät kaikille käyttäjille

### is_admin profiles-taulussa
- **D-14:** `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false` — lisätään nyt perusinfrana, Phase 35 voi heti käyttää
- **D-15:** Asetetaan `is_admin = true` manuaalisesti SQL-editorissa käyttäjälle `joona.orava@gmail.com` migraation jälkeen

### RLS-yleisperiaatteet
- **D-16:** Kaikki uudet taulut suojataan RLS:llä — `anon`-avaimella ei pysty lukemaan tai kirjoittamaan muiden yritysten tietoja
- **D-17:** `business_accounts` SELECT-policy: `USING (auth.uid() = user_id)` — yritys näkee vain oman tilinsä
- **D-18:** `business_paikka_links` SELECT-policy: `USING (auth.uid() = business_account_id)` — yritys näkee vain omat linkkinsä

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vaatimukset ja tiekartta
- `.planning/REQUIREMENTS.md` — BIZ-02, DATA-09, DATA-10 (Phase 31 requirements)
- `.planning/ROADMAP.md` §Phase 31 — Success criteria ja phase details

### RLS-paternit (seuraa tätä mallia)
- `supabase/migrations/20260528083110_profiles.sql` — profiles-taulun RLS: PRIMARY KEY = user_id FK, SELECT/INSERT/UPDATE policies
- `supabase/migrations/20260523_suosikit.sql` — bigserial PK + UNIQUE constraint + USING/WITH CHECK RLS
- `supabase/migrations/20260528_reviews.sql` — monimutkaisemman taulun RLS (useita sarakkeita, CHECK constraints)

### Supabase-asiakasmalli
- `lib/supabaseAdmin.server.ts` — server-only admin client (service role key) — käytettävä Storage RLS -konfiguraatioon
- `lib/supabase.ts` — anon client (read-only after RLS)

### Sync-skripti (business_managed vaikuttaa tähän)
- `app/api/admin/sync-paikat/route.ts` — Google Places sync; lisättävä ehto `WHERE business_managed = false` (tai IS NOT TRUE)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabaseAdmin.server.ts` — service role client, käytettävä kaikissa server-side operaatioissa joissa RLS pitää ohittaa (esim. admin-toiminnot Phase 35:ssä)
- `supabase/migrations/` — kaikki migraatiot samassa hakemistossa, timestampilla nimetty

### Established Patterns
- **RLS-kaava:** `ALTER TABLE x ENABLE ROW LEVEL SECURITY` → CREATE POLICY "..." ON x FOR SELECT USING(...) → FOR INSERT WITH CHECK(...) → FOR UPDATE USING(...) WITH CHECK(...)
- **Taulun nimeys:** Pääasiallinen taulu on `liikuntapaikat` (ei `paikat`). Yksi vanhentunut migraatio (`20260530000000_add_image_url_to_paikat.sql`) viittaa `paikat`-nimeen — tarkistettava Supabasesta kumpi on oikea nimi ennen `business_managed`-sarakkeen lisäystä
- **FK-ketju:** `auth.users(id)` → `profiles(user_id)` ja `suosikit(user_id)` ja `reviews(user_id)` — sama kaava `business_accounts(user_id)`-tauluun

### Integration Points
- `app/api/admin/sync-paikat/route.ts` — lisättävä `.neq('business_managed', true)` tai vastaava suodatus sync-kyselyyn
- Phase 32 (auth) rakentuu `business_accounts`-taulun varaan — FK `user_id → auth.users`
- Phase 33 (claim) kirjoittaa `business_paikka_links`-rivejä — `link_type` ja `claim_status` tästä vaihesta
- Phase 35 (admin) lukee molempia tauluja ja lisää `rejection_reason`-sarakkeen migraatiolla

</code_context>

<specifics>
## Specific Ideas

- Storage bucket RLS kirjoitetaan Supabase SQL-editorissa (ei migraatiotiedostona) — Supabase Storage policies kirjoitetaan `storage.objects`-tauluun
- `is_admin = true` asetetaan joona.orava@gmail.com:lle manuaalisesti SQL: `UPDATE profiles SET is_admin = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joona.orava@gmail.com')`

</specifics>

<deferred>
## Deferred Ideas

- `published BOOLEAN` -sarake `liikuntapaikat`-tauluun (CLAIM-03 vaatii: uusi paikka `published = false` kunnes admin hyväksyy) — lisätään Phase 33 -migraatiolla kun feature oikeasti rakennetaan
- `rejection_reason TEXT` -sarake `business_accounts`-tauluun — lisätään Phase 35 -migraatiolla
- Ketjuadmin (yksi yritystili, useita toimipisteitä eri omistajilla) — tulevaisuuteen (ks. REQUIREMENTS.md Future Requirements)

</deferred>

---

*Phase: 31-db-skeema-storage-perusta*
*Context gathered: 2026-06-05*
