'use client'

interface Props {
  pct: number
}

export default function UploadProgressBar({ pct }: Props) {
  if (pct === 0) return null

  return (
    <div className="w-full h-1 bg-[rgba(17,17,17,0.07)] rounded-full overflow-hidden">
      <div
        className="h-full bg-[#111111] rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
