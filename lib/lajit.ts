export interface LajiKonfig {
  label: string
  badgeTw: string
  accentBg: string
  color: string
}

export const lajiKonfig: Record<string, LajiKonfig> = {
  padel:         { label: 'Padel',         badgeTw: 'text-white', accentBg: 'bg-[#3b82f6]', color: '#3b82f6' },
  tennis:        { label: 'Tennis',        badgeTw: 'text-white', accentBg: 'bg-[#16a34a]', color: '#16a34a' },
  jooga:         { label: 'Jooga',         badgeTw: 'text-white', accentBg: 'bg-[#8b5cf6]', color: '#8b5cf6' },
  kuntosali:     { label: 'Kuntosali',     badgeTw: 'text-white', accentBg: 'bg-[#f97316]', color: '#f97316' },
  uinti:         { label: 'Uinti',         badgeTw: 'text-white', accentBg: 'bg-[#06b6d4]', color: '#06b6d4' },
  liikuntahalli: { label: 'Liikuntahalli', badgeTw: 'text-white', accentBg: 'bg-[#6b7280]', color: '#6b7280' },
  liikunta:      { label: 'Liikunta',      badgeTw: 'text-white', accentBg: 'bg-[#6b7280]', color: '#6b7280' },
}

export const LAJIT_FILTTERI = ['Kaikki', 'Padel', 'Tennis', 'Jooga', 'Kuntosali', 'Uinti', 'Liikuntahalli']

// Used by Kartta.tsx InfoWindow — renders outside React DOM, Tailwind classes don't apply there
export function getInfoWindowStyle(laji: string): { background: string; color: string } {
  const styles: Record<string, { background: string; color: string }> = {
    padel:         { background: '#dbeafe', color: '#1d4ed8' },
    tennis:        { background: '#dcfce7', color: '#15803d' },
    jooga:         { background: '#ede9fe', color: '#6d28d9' },
    kuntosali:     { background: '#ffedd5', color: '#c2410c' },
    uinti:         { background: '#cffafe', color: '#0e7490' },
    liikuntahalli: { background: '#f3f4f6', color: '#374151' },
    liikunta:      { background: '#f3f4f6', color: '#374151' },
  }
  return styles[laji] ?? { background: '#f3f4f6', color: '#374151' }
}
