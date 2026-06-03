'use client'

// SVG icon registry for Liikuntahakemisto sport types.
//
// Source: final_sports_svg_exports.zip contained PNG-embedded SVGs (not vector paths).
// Deviation: ZIP images are raster-based (PNG <image> embeds), incompatible with
// fill="currentColor" CSS color inheritance. Vector paths sourced from lucide-react
// v1.16.0 (ISC license) — same library already used in SportPin.tsx — ensuring full
// currentColor compatibility. kiipeily (Mountain) and jääkiekko (Snowflake) path data
// extracted from lucide-react dist/esm/icons/*.mjs. All other paths carried from
// SportPin.tsx SPORT_ICONS (also lucide-react-derived, stroke-based).
//
// All stroke/fill attributes use "currentColor" — consumers control color via CSS.
// File extension is .tsx because the SportIcon component uses JSX syntax.

export const SPORT_ICONS: Record<string, string> = {
  padel: `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  kuntosali: `<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m9.6 14.4 4.8-4.8" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  jooga: `<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  uinti: `<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  tennis: `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  liikuntahalli: `<path d="M10 12h4" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 8h4" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 21v-3a2 2 0 0 0-4 0v3" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  liikunta: `<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // Mountain icon — lucide-react v1.16.0 (ISC), path from dist/esm/icons/mountain.mjs
  kiipeily: `<path d="m8 3 4 8 5-5 5 15H2L8 3z" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // Snowflake icon — lucide-react v1.16.0 (ISC), paths from dist/esm/icons/snowflake.mjs
  // Used for jääkiekko (ice hockey) as an ice-themed icon
  jääkiekko: `<path d="m10 20-1.25-2.5L6 18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 4 8.75 6.5 6 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m14 20 1.25-2.5L18 18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m14 4 1.25 2.5L18 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m17 21-3-6h-4" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m17 3-3 6 1.5 3" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12h6.5L10 9" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m20 10-1.5 2 1.5 2" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 12h-6.5L14 15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m4 10 1.5 2L4 14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m7 21 3-6-1.5-3" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m7 3 3 6h4" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  fallback: `<circle cx="12" cy="12" r="4" fill="currentColor"/>`,
}

/**
 * Renders a sport icon as an inline SVG.
 *
 * @param laji  - Sport key matching a key in SPORT_ICONS (e.g. "padel", "uinti").
 *                Falls back to the "liikunta" icon for unknown keys.
 * @param size  - Width and height in pixels (default 16).
 * @param className - Optional CSS class applied to the <svg> element.
 *
 * dangerouslySetInnerHTML is safe: SPORT_ICONS is a compile-time constant (D-07).
 */
export function SportIcon({
  laji,
  size = 16,
  className,
}: {
  laji: string
  size?: number
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      dangerouslySetInnerHTML={{ __html: SPORT_ICONS[laji] ?? SPORT_ICONS['liikunta'] }}
    />
  )
}
