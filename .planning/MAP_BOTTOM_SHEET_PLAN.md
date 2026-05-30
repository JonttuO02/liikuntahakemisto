# Kartta-animaatio refaktorointi — Bottom Sheet -arkkitehtuuri

## Konteksti

Tämä suunnitelma on tehty sen jälkeen kun animaatio-ongelmia yritettiin korjata useilla tavoilla
(height → translateY → clip-path) ilman pysyvää tulosta. Juurisyy on arkkitehtuurinen.

## Juurisyy

Google Maps ei ole suunniteltu koon muuttamiseen animaation aikana. Tiles renderöidään
canvas-elementille tiettyä viewport-kokoa varten. Wolt / Bolt / Uber eivät animoi karttaa —
kartta on AINA täysikokoinen taustalla, animoitu elementti on bottom sheet.

## Tavoitetila

```
┌──────────────────────────┐
│         NavBar           │  z-40
├──────────────────────────┤
│                          │
│   Google Maps            │  z-10  ← Aina fixed, koko ajan täysikokoinen
│   (fixed, koko ajan)     │          Ei animaatioita. Tiles aina valmiina.
│                          │
│  ┌────────────────────┐  │
│  │   Bottom Sheet     │  │  z-30  ← Tämä liikkuu, ei kartta
│  │   (liukuu y-aksel) │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

## Bottom sheet -tilat

| Tila       | Korkeus     | Sisältö                              |
|------------|-------------|--------------------------------------|
| `content`  | ~65% näytöstä | AI-widget, karuselli, filtterit    |
| `peek`     | ~110px      | drag-handle + "N paikkaa lähellä"    |
| `map`      | piilossa    | vain filtterit + X-nappi kartalla    |

## Toteutusvaiheet

### 1. Kartta täysikokoinen (Etusivu.tsx)

```tsx
// Poista: kartaAuki, fullH, kartaInteractive, kaikki map-animaatiot
// Lisää: kartta kiinteänä fixed-elementtinä

<div style={{
  position: 'fixed',
  top: NAV_H,
  left: 0, right: 0, bottom: 0,
  zIndex: 10,
}}>
  <Map
    gestureHandling="none"   // none kun sheet päällä, greedy kun 'map'-tilassa
    ...
  />
</div>
```

gestureHandling vaihtuu sheetState-tilan mukaan:
- 'content' tai 'peek': "none" (sheet peittää, ei haittaa interaktiota)
- 'map': "greedy" (kartta näkyvissä ja interaktiivinen)

### 2. Bottom sheet

```tsx
const NAV_H = 56
const PEEK_H = 110        // peek-tilan korkeus
const CONTENT_H = Math.round(fullH * 0.65)  // content-tilan korkeus

// y-arvo: kuinka paljon sheet on piilossa pohjasta
// y=0: sheet täysin auki (content-tila)
// y=fullH-PEEK_H: peek-tila  
// y=fullH: piilotettu (map-tila)

<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: fullH }}
  dragElastic={0.1}
  animate={{ y: sheetY }}
  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
  onDragEnd={(_, info) => {
    // snap-logiikka
    const velocity = info.velocity.y
    const offset = info.offset.y
    if (velocity > 300 || offset > 100) {
      // vedä alas: content → peek → map
      setSheetState(prev => prev === 'content' ? 'peek' : 'map')
    } else if (velocity < -300 || offset < -100) {
      // vedä ylös: map → peek → content
      setSheetState(prev => prev === 'map' ? 'peek' : 'content')
    }
  }}
  style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30 }}
  className="glass rounded-t-3xl"
>
  {/* Drag handle */}
  <div className="flex justify-center pt-3 pb-2">
    <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
  </div>
  
  {/* Sisältö: AI-widget, karuselli, filtterit */}
  {sheetState !== 'map' && <ContentView />}
</motion.div>
```

### 3. Kartalla näkyvät kontrollit (map-tila)

```tsx
{sheetState === 'map' && (
  <>
    {/* Sulje kartta -nappi */}
    <button
      onClick={() => setSheetState('peek')}
      className="absolute top-4 right-4 z-[35] glass-btn rounded-full ..."
    >
      <X />
    </button>
    
    {/* Filtterit */}
    <div className="absolute bottom-4 ... z-[35]">
      {/* laji-filtterit */}
    </div>
  </>
)}
```

### 4. "Näytä kartalla" -flow

```tsx
// LiikuntapaikatLista: linkki muuttuu triggaamaan state-muutoksen
// Tai pidetään ?id= URL-param joka avaa kartan

// focusId-efekti:
useEffect(() => {
  if (!focusId) return
  const target = paikat.find(p => p.id === Number(focusId))
  if (!target?.latitude) return
  // Kartta on JO täysikokoinen → tiles valmiina
  map.panTo({ lat: target.latitude, lng: target.longitude })
  map.setZoom(16)
  setSheetState('peek')  // sheet laskeutuu, kartta tulee esiin
}, [focusId])
// Ei tile-latausviivettä, ei animaatio-ongelmia
```

### 5. Lista-näkymä (?nakyma=lista)

Vaihtoehto A (suositeltu): sheet 'content'-tilassa + hakukenttä näkyvissä
  - ?nakyma=lista → setSheetState('content') + scrollaa ylös
  - Sama komponentti, eri sisältö sheetin ylälaidassa

Vaihtoehto B: Pidä erillinen LiikuntapaikatLista-overlay kuten nykyisin
  - Yksinkertaisempi, mutta kartta ei pysy "auki" taustalla samalla tavalla

### 6. Valitun paikan bottom sheet

Nykyinen toimii jo hyvin (EASE_DRAWER, drag-gesture). Pidetään ennallaan mutta
nostetaan z-indexiä: z-[60] (nykyinen) → z-[50] on ok kun bottom sheet on z-30.

## Poistettavat asiat

- `kartaAuki` state → korvataan `sheetState === 'map'`
- `fullH` state → pidetään (tarvitaan sheet-positiointiin)
- Kaikki map-animaatiot (translateY, clip-path, height, rotateX) → poistetaan
- 3D `perspective rotateX` -efekti → poistetaan kokonaan
- `kartaInteractive` → poistetaan (gestureHandling ohjautuu sheetState:n mukaan)
- Placeholder-div "Kartan tila" → poistetaan

## Säilytettävät asiat

- Markerit ja niiden animaatiot (AdvancedMarker, pin/card-vaihto)
- GPS ja MapPanController, RecenterButton
- MapAutoZoom
- AI-widget, karuselli, filtterit (siirtyvät sheettiin)
- Valitun paikan bottom sheet (lähes ennallaan)
- Yö/päivä-tila
- Kaikki lib/-tiedostot

## Tiedostot joita muutetaan

1. `app/components/Etusivu.tsx` — päämuutos
2. `app/page.tsx` — todennäköisesti ei muutoksia
3. `app/components/LiikuntapaikatLista.tsx` — ehkä pieni muutos "näytä kartalla" -linkissä

## Huomioita

- `useRef` tarvitaan map-instanssille koska MapAutoZoom-pattern ei toimi suoraan
  (map.panTo täytyy kutsua focusId-efektistä, ei erillisestä komponentista)
- Tai pidetään MapAutoZoom-pattern ja kutsutaan setAutoZoomTarget focusId-efektistä
- Bottom sheet drag täytyy testata mobiililla (touch events)
- Snap-pisteet: content (auki), peek (puoli-auki), map (piilotettu)
