---
phase: 16-brandi-logo-uloke
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/layout.tsx
  - app/manifest.ts
  - app/tietosuoja/page.tsx
autonomous: true
requirements: [BRAND-01]

must_haves:
  truths:
    - "Browser tab shows 'AKTIIVI' in every page title"
    - "PWA install prompt and home screen icon show 'AKTIIVI'"
    - "og:title is 'AKTIIVI' (auto-derived from metadata.title)"
    - "Privacy policy body text contains no 'Liikuntahakemisto'"
    - "manifest start_url is '/' (not the dead /?nakyma=lista param)"
  artifacts:
    - path: "app/layout.tsx"
      provides: "Next.js metadata title + description"
      contains: "AKTIIVI"
    - path: "app/manifest.ts"
      provides: "PWA manifest name/short_name/start_url"
      contains: "AKTIIVI"
    - path: "app/tietosuoja/page.tsx"
      provides: "Privacy policy page"
      contains: "AKTIIVI"
  key_links:
    - from: "app/layout.tsx"
      to: "browser tab title"
      via: "Next.js Metadata.title"
      pattern: "title:.*AKTIIVI"
    - from: "app/manifest.ts"
      to: "PWA install name"
      via: "MetadataRoute.Manifest name field"
      pattern: "name:.*AKTIIVI"
---

<objective>
Rebrand all user-visible metadata from "Liikuntahakemisto" to "AKTIIVI".

Purpose: Establish the new brand name across browser title, og:title, PWA manifest, and
privacy policy before the logo component lands. This is a pure text/config change with
zero risk of breaking the UI.

Output: Three modified files — layout.tsx, manifest.ts, tietosuoja/page.tsx — all
containing "AKTIIVI" where "Liikuntahakemisto" previously appeared. Also fixes the dead
start_url in manifest.ts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/16-brandi-logo-uloke/16-CONTEXT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Next.js metadata and PWA manifest to AKTIIVI</name>
  <files>app/layout.tsx, app/manifest.ts</files>
  <action>
    In app/layout.tsx (per D-01, D-03):
    - Change metadata.title from 'Liikuntahakemisto' to 'AKTIIVI'
    - Change metadata.description from 'Löydä liikuntapaikat läheltäsi Tampereella' to
      'Löydä liikuntapaikat läheltäsi — AKTIIVI'
    - No separate openGraph block needed; og:title auto-derives from title (D-03)

    In app/manifest.ts (per D-01, D-02):
    - Change name from 'Liikuntahakemisto' to 'AKTIIVI'
    - Change short_name from 'Liikunta' to 'AKTIIVI'
    - Change start_url from '/?nakyma=lista' to '/' (D-02 — dead param fix)
    - Leave all other fields (display, background_color, theme_color, icons) unchanged
  </action>
  <verify>
    <automated>grep -n "AKTIIVI" app/layout.tsx app/manifest.ts</automated>
  </verify>
  <done>
    Both files contain "AKTIIVI". grep confirms: layout.tsx has AKTIIVI in title and
    description lines; manifest.ts has AKTIIVI in name and short_name, and start_url is '/'.
    No "Liikuntahakemisto" remains in either file.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update privacy policy body text to AKTIIVI</name>
  <files>app/tietosuoja/page.tsx</files>
  <action>
    In app/tietosuoja/page.tsx (per D-01):
    - Replace every occurrence of "Liikuntahakemisto" with "AKTIIVI" in body text
    - The rekisterinpitäjä paragraph at line 34 reads "rekisterinpitäjä on Liikuntahakemisto" —
      change to "rekisterinpitäjä on AKTIIVI"
    - Do not change any structural markup, CSS classes, or other content
  </action>
  <verify>
    <automated>grep -c "Liikuntahakemisto" app/tietosuoja/page.tsx</automated>
  </verify>
  <done>
    grep -c returns 0 — no remaining "Liikuntahakemisto" occurrences in the file.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Static metadata → browser | No user input; pure config change, no injection surface |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-16P1-01 | Tampering | app/manifest.ts start_url | accept | Changing from dead param to '/' — no security regression, start_url is informational for PWA install |
| T-16P1-02 | Information Disclosure | og:title / metadata.title | accept | Public brand name, not sensitive; auto-derivation means no divergence between title and og:title |
</threat_model>

<verification>
1. Run `grep -rn "Liikuntahakemisto" app/layout.tsx app/manifest.ts app/tietosuoja/page.tsx` — must return zero matches
2. Run `grep -n "AKTIIVI" app/layout.tsx app/manifest.ts app/tietosuoja/page.tsx` — must show hits in all three files
3. Run `grep "start_url" app/manifest.ts` — must show `start_url: '/'`
4. `npm run build` exits 0 (no TypeScript errors from the edits)
</verification>

<success_criteria>
- "Liikuntahakemisto" is gone from layout.tsx, manifest.ts, and tietosuoja/page.tsx
- metadata.title is 'AKTIIVI', metadata.description references AKTIIVI
- manifest name and short_name are both 'AKTIIVI', start_url is '/'
- Build passes without errors
</success_criteria>

<output>
Create `.planning/phases/16-brandi-logo-uloke/16-01-SUMMARY.md` when done
</output>

---
phase: 16-brandi-logo-uloke
plan: 02
type: execute
wave: 2
depends_on: [16-01]
files_modified:
  - app/components/AktiiviLogo.tsx
autonomous: true
requirements: [UI-14, UI-15, UI-16]

must_haves:
  truths:
    - "AktiiviLogo renders bold SVG text 'AKTIIVI' with gradient fill"
    - "Gradient changes on each render when gradientIndex prop changes"
    - "5 gradients cycle: Fire, Ocean, Neon, Sunset, Electric"
    - "Gradient color transition takes ~0.5s ease-out (D-14)"
    - "Component works standalone without any sheet wiring"
  artifacts:
    - path: "app/components/AktiiviLogo.tsx"
      provides: "Standalone SVG logo with gradient animation"
      exports: ["default AktiiviLogo"]
  key_links:
    - from: "AktiiviLogo.tsx"
      to: "SVG linearGradient stops"
      via: "gradientIndex prop selects from GRADIENTS array"
      pattern: "GRADIENTS\\[gradientIndex"
---

<objective>
Create the AktiiviLogo component — a standalone SVG wordmark with animated gradient fill
that accepts a gradientIndex prop and transitions between 5 sporty gradient definitions.

Purpose: This component is the visual heart of the rebrand. It must work as a pure
presentational component so it can be dropped into both the closed pill tab and the open
sheet header without coupling to the sheet state machine.

Output: app/components/AktiiviLogo.tsx — a client component accepting `{ gradientIndex: number }`
that renders an SVG with animated gradient text fill.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/16-brandi-logo-uloke/16-CONTEXT.md
@app/components/ActaLogo.tsx
</context>

<interfaces>
<!-- Reference for SVG + Framer Motion pattern from ActaLogo.tsx -->

From app/components/ActaLogo.tsx:
- SVG with explicit viewBox, height/width style
- motion.text with Framer Motion animate props
- linearGradient in SVG defs: fill="url(#gradId)" on text element

AktiiviLogo.tsx signature to create:
  interface AktiiviLogoProps {
    gradientIndex: number  // 0–4, selects from GRADIENTS array
  }
  export default function AktiiviLogo({ gradientIndex }: AktiiviLogoProps)

GRADIENTS constant (from D-13):
  [
    { name: 'Fire',     start: '#FF7B00', end: '#E63946' },
    { name: 'Ocean',    start: '#00B4D8', end: '#0077B6' },
    { name: 'Neon',     start: '#C9F400', end: '#00D68F' },
    { name: 'Sunset',   start: '#FF6CA8', end: '#BE2ED6' },
    { name: 'Electric', start: '#7B2FFF', end: '#0055FF' },
  ]
</interfaces>

<tasks>

<task type="auto">
  <name>Task 3: Create AktiiviLogo.tsx with animated gradient SVG paths</name>
  <files>app/components/AktiiviLogo.tsx</files>
  <action>
    Create a new 'use client' component at app/components/AktiiviLogo.tsx.

    The real AKTIIVI logo SVG is at app/AKTIIVI-logo-rounded.svg (black strokes,
    transparent background — correct for light/glass pill surface). It uses path-based
    strokes (stroke="#000000"), NOT fill or SVG text. The gradient must be applied via
    stroke="url(#aktiivi-grad)" on all path elements.

    The logo has 10 path elements:
    - Path 1: top arc decoration (M215 332 C 320 248 545 235 836 235 C 1127 235 1352 248 1457 332)
    - Path 2: wave/swoosh below (M155 490 L531.4 703.5 Q601 743 ...)
    - Paths 3-10: the AKTIIVI letter strokes (A, K, T, I, I, V, I)
    Full path data is in app/AKTIIVI-logo-rounded.svg — copy it verbatim.

    Render an SVG with:
    - viewBox="0 0 1672 940"
    - role="img" aria-label="AKTIIVI"
    - style: height 28, width auto (fits in the 44px HANDLE_H tab with 8px vertical padding)
    - preserveAspectRatio="xMidYMid meet"

    Inside SVG:
    - Two linearGradient definitions in defs:
        id="grad-prev"  gradientUnits="userSpaceOnUse" x1="155" y1="430" x2="1517" y2="430"
        id="grad-curr"  gradientUnits="userSpaceOnUse" x1="155" y1="430" x2="1517" y2="430"
      Each has two stops (offset 0% and 100%). Colors set from GRADIENTS[prevIndex] and
      GRADIENTS[currIndex % 5] respectively.
    - clipPath id="sweep-clip" — contains a plain <rect> x="0" y="0" height="940"
      whose `width` is driven by a Framer Motion animated value (0 → 1672 on transition).
    - Decorative paths (arc + wave): stroke="#111111", no clipPath.
    - Letter paths rendered TWICE:
        Layer 1 (below):  stroke="url(#grad-prev)"  — always full width, no clip
        Layer 2 (above):  stroke="url(#grad-curr)"  — wrapped in <g clipPath="url(#sweep-clip)">
      On first mount (prevIndex === currIndex): Layer 1 is transparent/zero or Layer 2 is
      at full width so no flash — simplest: initialize sweepWidth to 1672 and skip animation
      when prevIndex === currIndex.
    - All paths: fill="none" strokeLinecap="round" strokeLinejoin="round"
      strokeWidth 37 for paths 1–2, strokeWidth 33 for letter paths.

    Sweep animation technique (D-14 — clipPath wipe left-to-right):
    - Internal state: prevIndexRef = useRef(gradientIndex % 5), sweepWidth animated value
    - Import { useRef, useEffect } from 'react' and { useAnimate } from 'framer-motion'
      OR use { animate } from 'framer-motion' to animate a state value imperatively.
      PREFERRED: use useRef for the rect element + Framer Motion's animate() to drive its
      width attribute directly:
        const rectRef = useRef<SVGRectElement>(null)
        On gradientIndex change → animate(rectRef.current, { width: 1672 }, { duration: 0.55, ease: 'easeInOut' })
        On animation complete → prevIndexRef.current = gradientIndex % 5 → force re-render
          to swap grad-prev colors → reset rect width to 0 (no animation) ready for next sweep
    - A cleaner alternative if animating SVG rect width with Framer Motion proves tricky:
        use useState(sweepWidth=1672) + useEffect that sets sweepWidth=0 then after one frame
        sets it back to 1672 via CSS transition. But the Framer Motion direct animate() is
        preferred for precise timing control.

    GRADIENTS constant (unchanged from D-13):
      [
        { name: 'Fire',     start: '#FF7B00', end: '#E63946' },
        { name: 'Ocean',    start: '#00B4D8', end: '#0077B6' },
        { name: 'Neon',     start: '#C9F400', end: '#00D68F' },
        { name: 'Sunset',   start: '#FF6CA8', end: '#BE2ED6' },
        { name: 'Electric', start: '#7B2FFF', end: '#0055FF' },
      ]

    ActaLogo.tsx: leave it on disk unchanged — NavBar.tsx still imports it (D-05).
    AktiiviLogo.tsx is a NEW file alongside it, not a replacement.
  </action>
  <verify>
    <automated>node -e "const fs = require('fs'); const c = fs.readFileSync('app/components/AktiiviLogo.tsx','utf8'); if(!c.includes('GRADIENTS')) throw new Error('GRADIENTS missing'); if(!c.includes('gradientIndex')) throw new Error('prop missing'); if(!c.includes('sweep-clip')) throw new Error('clipPath missing'); if(!c.includes('grad-prev')) throw new Error('prev gradient missing'); if(!c.includes('grad-curr')) throw new Error('curr gradient missing'); console.log('OK')"</automated>
  </verify>
  <done>
    AktiiviLogo.tsx exists, accepts gradientIndex prop, renders two gradient defs (grad-prev +
    grad-curr), renders letter paths in two layers (prev below, curr clipped above), and
    animates the clip rect width from 0 to 1672 on each prop change. Arc and wave paths are
    always stroke="#111111". ActaLogo.tsx is untouched.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| gradientIndex prop | Integer from parent; modulo 5 guards against out-of-range values |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-16P2-01 | Tampering | gradientIndex input | mitigate | Use `gradientIndex % 5` (always positive with Math.abs or keep parent constrained to 0–4 via modulo on increment) |
| T-16P2-02 | Denial of Service | SVG CSS transition | accept | CSS transitions are GPU-composited; no layout reflow; no jank risk |
</threat_model>

<verification>
1. AktiiviLogo.tsx exists at app/components/AktiiviLogo.tsx
2. Component compiles: `npx tsc --noEmit` shows no errors in the new file
3. GRADIENTS array has exactly 5 entries with the hex stops from D-13
4. ActaLogo.tsx is unchanged (NavBar.tsx still works)
</verification>

<success_criteria>
- AktiiviLogo.tsx is a standalone SVG component accepting gradientIndex: number
- Gradient stop hex values exactly match D-13 specifications
- CSS transition 0.5s ease-out on stop fill colors
- No dependency on Etusivu.tsx state — pure presentational component
</success_criteria>

<output>
Create `.planning/phases/16-brandi-logo-uloke/16-02-SUMMARY.md` when done
</output>

---
phase: 16-brandi-logo-uloke
plan: 03
type: execute
wave: 3
depends_on: [16-02]
files_modified:
  - app/components/Etusivu.tsx
autonomous: true
requirements: [UI-13, UI-14, UI-15, UI-16]

must_haves:
  truths:
    - "The 44px tab is always visible at bottom of screen even when sheet is fully closed"
    - "Tapping the closed pill opens the sheet"
    - "AktiiviLogo is visible in the closed pill (centered horizontally)"
    - "AktiiviLogo appears in the sheet header when the sheet is open"
    - "Gradient index increments each time sheetPhase transitions to 'open'"
    - "Gradient does not reset when sheet closes — index persists in useRef"
    - "The old w-10 h-1 drag bar div is gone"
    - "Closed pill is centered horizontally on screen"
  artifacts:
    - path: "app/components/Etusivu.tsx"
      provides: "Bottom sheet with logo tab"
      contains: "AktiiviLogo"
  key_links:
    - from: "Etusivu.tsx gradIndex"
      to: "AktiiviLogo gradientIndex prop"
      via: "useState + useEffect on sheetPhase"
      pattern: "gradIndex"
    - from: "sheetPhase"
      to: "gradIndex increment"
      via: "useEffect watching sheetPhase (with mounted guard)"
      pattern: "sheetPhase.*open.*setGradIndex"
---

<objective>
Wire AktiiviLogo into Etusivu's bottom sheet — replace the drag bar, center the closed
pill, and implement the gradient cycle logic that persists across sheet open/close.

Purpose: This plan delivers the four UI requirements (UI-13 through UI-16). The sheet
already has the right architecture (sheetPhase state machine, pillInset, HANDLE_H=44);
this plan surgically modifies the drag-handle div and adds the gradient index ref.

Output: Modified Etusivu.tsx with AktiiviLogo replacing the drag bar, centered pill
closed state, and gradient index management.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/16-brandi-logo-uloke/16-CONTEXT.md
@app/components/AktiiviLogo.tsx
</context>

<interfaces>
<!-- Key contracts in Etusivu.tsx the executor must know -->

From app/components/Etusivu.tsx (current state):

Constants (line 31):
  const HANDLE_H = 44

State (line 103):
  const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('open')

Pill geometry (lines 131-133):
  const contentH  = Math.round(fullH * 0.82)
  const PILL_W    = 160
  const pillInset = Math.round((fullW - PILL_W) / 2)

Animation values (lines 136-139):
  const sheetAnimY      = sheetPhase === 'open' ? 0 : sheetPhase === 'sliding' ? contentH : contentH - HANDLE_H
  const sheetAnimLeft   = sheetPhase === 'closed' ? pillInset : 0
  const sheetAnimRight  = sheetPhase === 'closed' ? pillInset : 0
  const sheetAnimRadius = sheetPhase === 'closed' ? '24px 24px 24px 24px' : '24px 24px 0px 0px'

Sheet motion.div (lines 638-660) — the wrapper the logo handle lives inside:
  className="glass"
  style={{ position: 'fixed', bottom: 0, height: contentH, zIndex: 60, overflow: 'hidden' }}

Handle div (lines 654-660) — to be replaced:
  <div className="flex justify-center pt-3 pb-2"
       style={{ cursor: sheetPhase === 'open' ? 'grab' : 'pointer' }}
       onClick={() => { if (sheetPhase !== 'open') setSheetPhase('open') }}>
    <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
  </div>

AktiiviLogo component signature (from plan 02):
  import AktiiviLogo from './AktiiviLogo'
  <AktiiviLogo gradientIndex={number} />
</interfaces>

<tasks>

<task type="auto">
  <name>Task 4: Add gradient index ref and sheetPhase effect in Etusivu</name>
  <files>app/components/Etusivu.tsx</files>
  <action>
    Add gradient state management to Etusivu (per D-11, D-12):

    1. Add import: import AktiiviLogo from './AktiiviLogo'

    2. After the existing state declarations (around line 120), add:
       const [gradIndex, setGradIndex] = useState(0)

       Rationale: AktiiviLogo handles its own sweep animation internally on prop change —
       no remounting needed, so no gradKey. A plain useState is sufficient; each increment
       triggers a prop update that the component animates.

    3. Add a mounted guard ref to skip the initial mount trigger (sheetPhase starts as 'open'
       on mount, but there is nothing to sweep from on first load):
       const gradMounted = useRef(false)

    4. Add a useEffect watching sheetPhase (per D-12), placed after existing useEffects:
       useEffect(() => {
         if (!gradMounted.current) { gradMounted.current = true; return }
         if (sheetPhase === 'open') setGradIndex(i => (i + 1) % 5)
       }, [sheetPhase])

       The mounted guard means: gradient 0 (Fire) is displayed on first load with no
       animation; the sweep fires from the first time the user closes and reopens the sheet.

    Do not change sheetTransition, pillInset, or any other animation values in this task.
  </action>
  <verify>
    <automated>grep -n "gradIndex\|gradMounted\|AktiiviLogo" app/components/Etusivu.tsx</automated>
  </verify>
  <done>
    Etusivu.tsx contains gradIndex useState, gradMounted useRef, the useEffect with mounted
    guard that increments gradIndex on sheetPhase 'open', and the AktiiviLogo import.
    grep confirms all four. No gradKey or gradIndexRef.current in the file.
  </done>
</task>

<task type="auto">
  <name>Task 5: Replace drag bar with AktiiviLogo, center closed pill</name>
  <files>app/components/Etusivu.tsx</files>
  <action>
    Two surgical edits to the motion.div sheet wrapper area (around lines 131-139 and
    654-660):

    EDIT A — Center the closed pill (per D-09):
    Replace the current pillInset-based animation values:
      sheetAnimLeft   = sheetPhase === 'closed' ? pillInset : 0
      sheetAnimRight  = sheetPhase === 'closed' ? pillInset : 0

    With a width + centered approach. Change the animated values to:
      sheetAnimLeft   = sheetPhase === 'closed' ? '50%' : '0%'
      sheetAnimRight  = sheetPhase === 'closed' ? '0%' : '0%'

    And add a transform to the motion.div animate prop:
      x: sheetPhase === 'closed' ? '-50%' : '0%'

    ALTERNATIVE simpler approach (prefer this if the above conflicts with Framer Motion's
    left/right animation):
    Keep pillInset for left/right but compute it differently. The logo "AKTIIVI" at
    fontSize 28, letterSpacing 4 renders to approximately 130px wide. A comfortable pill
    is logo + 32px padding each side = ~194px total. Set:
      PILL_W = 194
      pillInset = Math.round((fullW - PILL_W) / 2)

    PILL_W is already defined at line 132. Change it from 160 to 194. This widens the
    closed pill to fit the wordmark comfortably while keeping the existing left/right
    spring animation logic intact. This is the preferred approach (simpler, no Framer
    Motion transform conflicts).

    EDIT B — Replace drag bar with AktiiviLogo (per D-07):
    In the drag handle div (lines 654-660), replace the inner `<div className="w-10 h-1 ...">` 
    with AktiiviLogo:

    Keep the outer div structure (flex justify-center, pt-3 pb-2, cursor, onClick) intact.
    Only replace the inner div child:

    FROM:
      <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />

    TO:
      <AktiiviLogo gradientIndex={gradIndex} />

    No key prop — the component stays mounted and animates the sweep internally when
    gradIndex changes. Do not add key={} here.

    No other changes to the sheet structure, drag handlers, or content area.
  </action>
  <verify>
    <automated>grep -n "w-10 h-1" app/components/Etusivu.tsx</automated>
  </verify>
  <done>
    grep for "w-10 h-1" returns zero matches — the drag bar div is gone. AktiiviLogo
    renders in its place with gradientIndex and key props. PILL_W is 194 (or the centering
    approach achieves equivalent visual centering). Build passes: `npm run build` exits 0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| gradIndex useState | Integer 0–4, incremented via setGradIndex(i => (i+1) % 5); never user-controlled |
| onClick on closed pill | Calls setSheetPhase('open') — no URL params, no external data |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-16P3-01 | Denial of Service | gradIndex setState on every sheetPhase open | accept | One setState per user tap; negligible cost; no loop |
| T-16P3-02 | Tampering | PILL_W constant change | accept | Changes visual width only; no functional or security impact |
| T-16P3-03 | Elevation of Privilege | sheet tap-to-open onClick | accept | Opens the sheet UI only; no data mutation, no auth bypass |
</threat_model>

<verification>
1. `grep -c "w-10 h-1" app/components/Etusivu.tsx` returns 0
2. `grep -n "AktiiviLogo" app/components/Etusivu.tsx` shows import line and usage line
3. `grep -n "gradIndex\|gradMounted" app/components/Etusivu.tsx` shows useState and useRef
4. `npm run build` exits 0
5. Manual smoke test (checkpoint follows as a separate human-verify step):
   - Open the app in browser
   - Sheet closed pill is visible, centered, contains "AKTIIVI" wordmark
   - Tap the pill — sheet opens, logo is visible in the header area
   - Close the sheet, reopen — gradient has changed
   - Open 5 more times — cycle completes and returns to first gradient
</verification>

<success_criteria>
- The `w-10 h-1` drag bar div no longer exists in Etusivu.tsx
- AktiiviLogo is rendered in the handle div with gradientIndex and key props
- PILL_W is 194 (or equivalent centering logic achieves pill centered on screen)
- gradIndex increments on each 'open' transition (after first mount)
- Build passes
</success_criteria>

<output>
Create `.planning/phases/16-brandi-logo-uloke/16-03-SUMMARY.md` when done
</output>
