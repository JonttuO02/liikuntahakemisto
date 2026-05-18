export interface LajiKonfig {
  label: string
  badgeTw: string
  accentBg: string
}

export const lajiKonfig: Record<string, LajiKonfig> = {
  padel:         { label: 'Padel',         badgeTw: 'bg-blue-100 text-blue-700',    accentBg: 'bg-blue-500' },
  tennis:        { label: 'Tennis',        badgeTw: 'bg-green-100 text-green-700',  accentBg: 'bg-green-500' },
  jooga:         { label: 'Jooga',         badgeTw: 'bg-purple-100 text-purple-700', accentBg: 'bg-purple-500' },
  kuntosali:     { label: 'Kuntosali',     badgeTw: 'bg-orange-100 text-orange-700', accentBg: 'bg-orange-500' },
  uinti:         { label: 'Uinti',         badgeTw: 'bg-cyan-100 text-cyan-700',    accentBg: 'bg-cyan-500' },
  liikuntahalli: { label: 'Liikuntahalli', badgeTw: 'bg-indigo-100 text-indigo-700', accentBg: 'bg-indigo-500' },
  liikunta:      { label: 'Liikunta',      badgeTw: 'bg-gray-100 text-gray-600',    accentBg: 'bg-gray-400' },
}

export const LAJIT_FILTTERI = ['Kaikki', 'Padel', 'Tennis', 'Jooga', 'Kuntosali', 'Uinti', 'Liikuntahalli']
