---
phase: 24-callout-kortti-ikonit
plan: 01
status: complete
completed: 2026-06-02
commit: 8ad0377
---

# Summary — CalloutCard redesign

## What was built

CalloutCard-komponentti Etusivu.tsx:ssä uudistettiin kokonaan. Lopullinen toteutus iteroi käyttäjäpalautteen perusteella alkuperäistä suunnitelmaa laajemmaksi:

- **Koko**: 160×160px neliömäinen kupla (+ 11px häntä) — alkuperäinen suunnitelma oli vain leventää 130→160px
- **Layout**: pystysuuntainen (avatar vasemmassa yläkulmassa, teksti alla koko leveydellä) — alkuperäinen oli vaaka
- **Animaatio**: kirjain kerrallaan slide-in oikealta (stagger 22ms/kirjain) — alkuperäinen oli opacity fade
- **Sanankatkaisu**: kukin sana `whitespace-nowrap`-spanissa, välilyönnit niiden ulkopuolella
- **Z-index-bugi korjattu**: callout-markerin `zIndex` nostettu 1→5 jotta muut pinnit eivät piihoudu päälle
- **Piikki keskitetty**: koordinaatit 55/65/75 → 70/80/90 (center x=80 on 160px kortilla)

## Toteutetut muutokset

`app/components/Etusivu.tsx`:
- Lisätty `CHAR_VARIANTS` + `TEXT_CONTAINER_VARIANTS` moduulitason vakioina
- Lisätty `SPORT_ICONS` dict (7 lajia → Lucide-ikoni)
- Lisätty lucide-react-importit: Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity + `LucideIcon` type
- `CalloutCard`-funktio kirjoitettu kokonaan uusiksi
- `AdvancedMarker zIndex`: `nearestCardId === p.id ? 5 : 1`

## Requirements

- MAP-14 ✅ — callout-kortti suurempi ja vaihtaa tietoja automaattisesti
- MAP-15 ✅ (osittainen, callout-kortti) — laji-ikonit värillisinä

## Muuttumattomia tiedostoja

- `app/components/SportPin.tsx` ✅
- `app/components/PaikkaKortti.tsx` ✅
- `app/components/DiagonaalKortti.tsx` ✅
