// Sport icon image paths. Files served from /public/icons/.
// SVG files sourced from final_sports_svg_exports.zip — original design artwork.
// These are PNG-embedded SVGs; rendered via <img> tags (no CSS color inheritance needed).
export const SPORT_ICONS: Record<string, string> = {
  padel: '/icons/padel.svg',
  kuntosali: '/icons/kuntosali.svg',
  jooga: '/icons/jooga.svg',
  uinti: '/icons/uinti.svg',
  tennis: '/icons/tennis.svg',
  liikuntahalli: '/icons/liikuntahalli.svg',
  liikunta: '/icons/liikunta.svg',
  kiipeily: '/icons/kiipeily.svg',
  jääkiekko: '/icons/jääkiekko.svg',
  fallback: '/icons/liikunta.svg',
}

export function SportIcon({
  laji,
  size = 16,
  className,
}: {
  laji: string
  size?: number
  className?: string
}) {
  const src = SPORT_ICONS[laji] ?? SPORT_ICONS['fallback']
  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt=""
      aria-hidden="true"
    />
  )
}
