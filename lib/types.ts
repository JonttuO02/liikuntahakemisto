export type Liikuntapaikka = {
  id: number
  nimi: string
  laji: string
  osoite: string | null
  kaupunki: string | null
  latitude: number | null
  longitude: number | null
  hinta_min: number | null
  hinta_max: number | null
  varauslinkki: string | null
  kuvaus: string | null
  puhelin: string | null
  // Phase 1 schema additions (DATA-04) — optional for forward compatibility
  hinta_kuvaus?: string | null
  aukioloajat?: Record<string, { open: string; close: string }> | null
  lajit_lista?: string[] | null
  featured?: boolean | null
  image_url?: string | null
}

export type Suosikki = {
  id: number
  user_id: string
  paikka_id: number
  created_at: string
}
