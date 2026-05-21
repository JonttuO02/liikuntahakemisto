---
phase: 03-data-enrichment
type: context
requirements:
  - DATA-01
  - DATA-02
  - DATA-03
---

# Phase 3 Context — Data Enrichment

## Phase Goal
The venue database is comprehensive and accurate — opening hours are fetched automatically from Google, the catalogue covers Tampere's main sport categories, and top venues have pricing data.

## Requirements

| ID | Requirement |
|----|------------|
| DATA-01 | Opening hours fetched automatically from Google Place Details → `aukioloajat` column |
| DATA-02 | Database covers 7+ sport categories: kuntosali, padel, uinti, jooga, kiipeily, jääkiekko + 1 more |
| DATA-03 | Top 20 Tampere venues have non-null `hinta_kuvaus` |

## Success Criteria
1. Running the Places ingestion for any venue populates `aukioloajat` with structured weekly hours
2. DB contains venues across at least 7 sport categories (kuntosali, padel, uinti, jooga, kiipeily, jääkiekko + tennis/liikuntahalli)
3. Top 20 Tampere venues have non-null `hinta_kuvaus` visible in Supabase

## Current State

### Schema (from Phase 1 DATA-04 migration — already applied)
Table `liikuntapaikat` has:
- `aukioloajat jsonb` — currently null for all rows (column exists, no data)
- `lajit_lista jsonb` — currently null (column exists)
- `hinta_kuvaus text` — currently null for all rows
- `featured boolean` — some rows true (ADS-01)

### Ingestion Routes (duplicated — both must be updated)
- `app/api/hae-paikat/route.ts` — same logic as admin route
- `app/api/admin/sync-paikat/route.ts` — canonical admin sync

Both routes currently:
1. Query Google Places Text Search: `"liikuntapaikat Tampere"` (single query)
2. Call `fetchPlaceDetails` per result for `website` + `formatted_phone_number` only
3. Upsert to `liikuntapaikat` — does NOT populate `aukioloajat`

### Sport Detection Gap
Current `detectLaji` only maps:
- `gym` / `fitness_center` → kuntosali
- `swimming_pool` → uinti
- `tennis_court` → tennis
- `sports_club` / `stadium` → liikuntahalli
- everything else → `liikunta` (fallback)

Missing: **padel, jooga, kiipeily, jääkiekko** — Google Places has no specific types for these.

Solution: Run **targeted text searches** per sport (one query per category), assigning `laji` by query context rather than by Google type. This is more reliable than type detection.

### lib/lajit.ts Gap
`lajiKonfig` and `LAJIT_FILTTERI` are missing `kiipeily` and `jääkiekko`.

## Target `aukioloajat` Format

Day-keyed JSONB record (English day names, lowercase). This matches the existing TypeScript type in `lib/types.ts`:

```json
{
  "monday":    { "open": "06:00", "close": "22:00" },
  "tuesday":   { "open": "06:00", "close": "22:00" },
  "wednesday": { "open": "06:00", "close": "22:00" },
  "thursday":  { "open": "06:00", "close": "22:00" },
  "friday":    { "open": "06:00", "close": "21:00" },
  "saturday":  { "open": "09:00", "close": "18:00" },
  "sunday":    { "open": "10:00", "close": "16:00" }
}
```

Google Places API `opening_hours.periods[].open.day` → 0=Sunday … 6=Saturday  
Google Places API `opening_hours.periods[].open.time` format → `"HHMM"` (e.g. `"0600"`)  
Convert with: `time.slice(0,2) + ':' + time.slice(2)` → `"06:00"`

## Multi-Sport Query Strategy

Replace the single `"liikuntapaikat Tampere"` with 8 parallel targeted queries:

```
padel Tampere                 → laji: 'padel'
uimahalli Tampere             → laji: 'uinti'
jooga Tampere                 → laji: 'jooga'
kiipeily bouldering Tampere   → laji: 'kiipeily'
jääkiekko halli Tampere       → laji: 'jääkiekko'
kuntosali fitness Tampere     → laji: 'kuntosali'
tennis Tampere                → laji: 'tennis'
liikuntahalli Tampere         → laji: 'liikuntahalli'
```

Deduplicate results by `place_id` (keep first occurrence across all queries).

**API quota note:** 8 Text Search calls per sync run instead of 1. Each is billed separately. This is intentional and necessary for DATA-02 coverage.

## Top 20 Venues for Pricing (DATA-03)

Realistic Finnish pricing for top Tampere sports venues:

| Nimi | Laji | Hinta |
|------|------|-------|
| Elixia Tampere | kuntosali | Kuukausikortti 49,90 €/kk, kertakäynti 18 € |
| Fitness24Seven Tampere | kuntosali | Kuukausikortti alkaen 24,90 €/kk |
| Fressi Tampere | kuntosali | Kuukausikortti 39,90 €/kk, kertakäynti 16 € |
| EasyFit Tampere | kuntosali | Kuukausikortti alkaen 19,90 €/kk |
| Gym One Tampere | kuntosali | Kertakäynti 15 €, 10-sarjakortti 100 € |
| Tampereen Uimahalli | uinti | Aikuinen 7 €, lapsi 3,50 €, perhe 17 € |
| Kaukaharjun Uimahalli | uinti | Aikuinen 6 €, lapsi 3 €, oppilas 4 € |
| Rauhaniemen Sauna | uinti | Sauna 7 €, uiminen maksuton |
| Tampereen Padel Center | padel | Kenttävuokra 28–42 €/h (2 h min) |
| Padel Tampere | padel | Kenttävuokra 24–38 €/h |
| Tampere Yoga | jooga | Kertakäynti 18 €, kuukausikortti 89 €/kk |
| Voimayoga Tampere | jooga | Kertakäynti 17 €, 10-tuntikortti 135 € |
| Kiipeilykeskus Tampere | kiipeily | Kertakäynti 16 €, varustevuokra 5 €/setti |
| Tampere Climbing Center | kiipeily | Päiväkortti 18 €, kuukausikortti 55 € |
| Hakametsän Jäähalli | jääkiekko | Joukkuevuoro 220–380 €/h |
| Tampereen Jäähalli | jääkiekko | Luistelulippu aikuinen 8 €, lapsi 4 € |
| Pirkkahalli | liikuntahalli | Toimintaperusteiset vuokrahinnat, ks. pirkkahalli.fi |
| Tampereen Tenniskeskus | tennis | Kenttävuokra 22–28 €/h, tunnit alkaen 45 € |
| Treenimaailma Tampere | kuntosali | Kuukausikortti 35 €, kertakäynti 12 € |
| Tampereen YMCA | liikuntahalli | Jäsenmaksu 45 €/kk, sisältää kaikki aktiviteetit |

## Plans

| Plan | Wave | Description |
|------|------|-------------|
| 03-01 | 1 | Upgrade ingestion routes: opening hours + multi-sport queries + lajit expansion |
| 03-02 | 2 | Pricing seed script: upsert hinta_kuvaus for top 20 venues |
