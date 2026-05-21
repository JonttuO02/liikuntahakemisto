---
phase: 04-service-information-ui
plan: 02
status: done
---

# 04-02 Summary — PaikkaKortti enrichments

## What was done

Updated `app/components/PaikkaKortti.tsx` with 7 changes:

1. **Added import** — `getOpenStatus` from `@/lib/aukiolo`
2. **Extracted `PaikkaKorttiProps` interface** — added `aukinyt?: boolean` prop alongside existing `paikka` and `distanceStr`
3. **Replaced `hinta` variable** — now derives `openStatus`, `hasDropIn`, `hintaTeksti`, and `priceToShow` from paikka fields
4. **Drop-in badge** — sport badge wrapped in a flex row; "Kertakäynti OK" pill shown when `hinta_kuvaus` contains "kertakäynti"
5. **Open status row** — inserted between venue name and address:
   - `open` → green dot + "Auki nyt · HH:MM–HH:MM"
   - `closed` → muted "Suljettu"
   - `no-data` → "Aukioloajat lisätään pian" (or "Aukioloajat tuntematon" when `aukinyt` prop is true)
6. **Price display** — uses `priceToShow` (hinta_kuvaus → hintateksti fallback → "Lisätään pian"); font changed to `font-bold`
7. **CTA text** — "Varaa →" corrected to "Varaa aika →"

## Verification

- `npx tsc --noEmit` — exit code 0, no errors
- `npx vitest run lib/aukiolo.test.ts` — 11/11 tests passed

## Files changed

- `app/components/PaikkaKortti.tsx` — all 7 changes applied
