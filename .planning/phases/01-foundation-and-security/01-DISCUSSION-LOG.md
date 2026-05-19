# Phase 1: Foundation & Security — Discussion Log

**Date:** 2026-05-19
**Areas discussed:** Supabase RLS + kirjoitusoikeudet, URL-routaus, Siivoustyön laajuus, Virhe- ja lataussivu

---

## Area 1: Supabase RLS + kirjoitusoikeudet

| Question | Options presented | Selection |
|----------|-------------------|-----------|
| Miten API route kirjoittaa Supabaseen kun RLS on päällä? | Service role routessa / Erillinen admin-endpoint / Sinä päätät | Erillinen admin-endpoint |
| Miten /api/admin/sync-paikat suojataan? | Bearer header + ADMIN_SECRET / Vain localhost / Next.js middleware | Authorization: Bearer -header + ADMIN_SECRET env var |
| Mikä RLS-politiikka? | SELECT kaikille, kirjoitus ei kenelleenkään / SELECT kaikille, muut autentikoituneille / Sinä päätät | SELECT kaikille, muut vain autentikoituneille |

---

## Area 2: URL-routaus

| Question | Options presented | Selection |
|----------|-------------------|-----------|
| Mikä on oikea URL-rakenne? | / + ?nakyma=lista + ?nakyma=kartta / / + ?nakyma=kartta / Sinä päätät | / + ?nakyma=lista + ?nakyma=kartta |
| Miten page.tsx päättää? | nakyma==='lista'\|\|'kartta' → LiikuntapaikatLista / Erillinen /lista ja /kartta -reitit / Sinä päätät | nakyma==='lista'\|\|'kartta' → LiikuntapaikatLista |

---

## Area 3: Siivoustyön laajuus

| Question | Options presented | Selection |
|----------|-------------------|-----------|
| Mitkä refaktoroinnit Phase 1:een? | Liikuntapaikka-tyyppi / hintateksti / lajiVari fix / tw-animate-css + lucide-react poisto | Kaikki neljä |

---

## Area 4: Virhe- ja lataussivu

| Question | Options presented | Selection |
|----------|-------------------|-----------|
| Mitä loading.tsx näyttää? | Skeleton-kortit / Indigo-spinner / Sama kuin etusivu | Skeleton-kortit |
| Mitä error.tsx näyttää? | Ystävällinen viesti + nappi / Minimaalinen / Animoitu brändin mukaan | Animoitu virheviesti brändin mukaan |

---

*No deferred ideas.*
