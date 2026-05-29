---
phase: 18-kartan-pinnit-korttianimaatio
plan: "see sub-plans 18-01, 18-02, 18-03"
type: execute
wave: 1
depends_on: ["17-01"]
files_modified:
  - lib/sportPins.ts
  - app/components/Etusivu.tsx
autonomous: true
requirements:
  - MAP-08
  - MAP-09
  - MAP-10

must_haves:
  truths:
    - "All map pins are red (#ef4444) regardless of sport type"
    - "Sport type is communicated only by a dark-stroked SVG icon in a white circle inside the pin"
    - "Multiple venues at the same coordinates (±0.0001°) appear as a single numbered cluster pin"
    - "Tapping a cluster pin shows a glass popup listing all venues at that address"
    - "Tapping a pin (zoom >= 16) or its mini-card opens an in-place expanded card above the pin"
    - "No bottom-sheet slides up from the bottom when a pin is tapped"
    - "Map stays centered on the venue during and after card expansion"
  artifacts:
    - path: "lib/sportPins.ts"
      provides: "pinUrl with fixed red color + white circle + dark icon; clusterPinUrl(count) for numbered cluster pins"
      exports: ["pinUrl", "clusterPinUrl"]
    - path: "app/components/Etusivu.tsx"
      provides: "clustering logic, expanded in-place card, cluster popup; bottom sheet removed"
      contains: "groupByCoords"
  key_links:
    - from: "app/components/Etusivu.tsx"
      to: "lib/sportPins.ts"
      via: "pinUrl import (color param removed), new clusterPinUrl import"
    - from: "AdvancedMarker render loop"
      to: "valittu state"
      via: "three-way AnimatePresence: pin | mini-card | expanded"
    - from: "Map onClick"
      to: "setValittu(null) + setExpandedCluster(null)"
      via: "extended onClick handler"
---

# Phase 18 Overview

This is the index file for Phase 18. The phase is split into 3 sequential plans:

- `18-01-PLAN.md` — MAP-08: Unified red pins with sport SVG icons (Wave 1)
- `18-02-PLAN.md` — MAP-09: Same-address clustering with popup (Wave 2, depends on 18-01)
- `18-03-PLAN.md` — MAP-10: In-place card expansion, bottom sheet removal (Wave 3, depends on 18-02)

Execute in order: 18-01 → 18-02 → 18-03.
