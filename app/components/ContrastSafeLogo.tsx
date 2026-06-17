interface ContrastSafeLogoProps {
  src: string
  alt?: string
  className?: string
}

/**
 * Presentational primitive: renders a logo thumbnail against a fixed
 * mid-gray rgba(0,0,0,0.06) backdrop so white/transparent-background
 * logos remain visible against a white card. Mirrors the existing
 * logo-box tint used in DiagonaalKortti. Not branding-aware — takes a
 * plain URL string only.
 */
export default function ContrastSafeLogo({ src, alt, className }: ContrastSafeLogoProps) {
  return (
    <div
      className={`w-full h-12 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center overflow-hidden${className ? ` ${className}` : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ''} className="h-full w-auto object-contain" />
    </div>
  )
}
