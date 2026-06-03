// Sport icon image paths. Files served from /public/icons/.
// PNG files sourced from urheiluikonit_era1.zip — high quality, transparent background.
export const SPORT_ICONS: Record<string, string> = {
  padel: '/icons/padel.png',
  kuntosali: '/icons/kuntosali.png',
  jooga: '/icons/jooga.png',
  uinti: '/icons/uinti.png',
  tennis: '/icons/tennis.png',
  liikuntahalli: '/icons/liikuntahalli.png',
  liikunta: '/icons/liikunta.png',
  kiipeily: '/icons/kiipeily.png',
  jääkiekko: '/icons/jääkiekko.png',
  fallback: '/icons/liikunta.png',
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
