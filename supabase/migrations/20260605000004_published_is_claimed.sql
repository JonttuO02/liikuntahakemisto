-- D-09 (33-CONTEXT.md): published-sarake kontrolloi uusien paikkojen näkyvyyttä käyttäjille.
--   DEFAULT true: olemassa olevat paikat pysyvät näkyvänä heti migraation jälkeen.
--   Uusille paikoille asetetaan published = false luontivaiheessa (create-paikka Route Handler).
--   app/api/hae-paikat/route.ts lisää .eq('published', true) -suodattimen (Plan 33-04).
--
-- D-07 (33-CONTEXT.md): is_claimed-sarake mahdollistaa "Jo hallittu" -merkinnän hakutuloksissa
--   ilman RLS-ongelmia. business_paikka_links-taulun SELECT-policy estää kirjautunutta
--   käyttäjää näkemästä muiden yritysten linkkejä, mutta is_claimed on julkisesti luettava
--   suoraan liikuntapaikat-taulusta.
--   DEFAULT false: kaikki olemassa olevat paikat alkavat hallitsemattomina.
--   claim-paikka ja create-paikka Route Handlerit asettavat is_claimed = true
--   business_paikka_links-insertin yhteydessä.
--
-- Ei uusia RLS-politiikkoja: 20260519000001_enable_rls.sql:n public_read-policy
--   (USING (true), ei sarakelistaa) kattaa kaikki liikuntapaikat-sarakkeet mukaanlukien
--   nämä uudet. Sama koskee authenticated_insert, authenticated_update, authenticated_delete.

ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN NOT NULL DEFAULT false;
