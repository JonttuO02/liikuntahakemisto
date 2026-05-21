import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local before any other imports that need env vars
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
} catch {
  // .env.local not found — rely on environment variables already being set
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Virhe: NEXT_PUBLIC_SUPABASE_URL tai SUPABASE_SERVICE_ROLE_KEY puuttuu .env.local-tiedostosta')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const HINNAT: { pattern: string; hinta_kuvaus: string }[] = [
  { pattern: '%Elixia%',              hinta_kuvaus: 'Kuukausikortti 49,90 €/kk, kertakäynti 18 €' },
  { pattern: '%Fitness24Seven%',      hinta_kuvaus: 'Kuukausikortti alkaen 24,90 €/kk' },
  { pattern: '%Fressi%',              hinta_kuvaus: 'Kuukausikortti 39,90 €/kk, kertakäynti 16 €' },
  { pattern: '%EasyFit%',             hinta_kuvaus: 'Kuukausikortti alkaen 19,90 €/kk' },
  { pattern: '%Gym One%',             hinta_kuvaus: 'Kertakäynti 15 €, 10-sarjakortti 100 €' },
  { pattern: '%Treenimaailma%',       hinta_kuvaus: 'Kuukausikortti 35 €, kertakäynti 12 €' },
  { pattern: '%Tampereen Uimahalli%', hinta_kuvaus: 'Aikuinen 7 €, lapsi 3,50 €, perhe 17 €' },
  { pattern: '%Kaukaharj%',           hinta_kuvaus: 'Aikuinen 6 €, lapsi 3 €, oppilas 4 €' },
  { pattern: '%Rauhaniemi%',          hinta_kuvaus: 'Sauna 7 €, uiminen maksuton rannalla' },
  { pattern: '%Padel Center%',        hinta_kuvaus: 'Kenttävuokra 28–42 €/h (min. 2 h)' },
  { pattern: '%Padel Tampere%',       hinta_kuvaus: 'Kenttävuokra 24–38 €/h' },
  { pattern: '%Tampere Yoga%',        hinta_kuvaus: 'Kertakäynti 18 €, kuukausikortti 89 €/kk' },
  { pattern: '%Voimayoga%',           hinta_kuvaus: 'Kertakäynti 17 €, 10-tuntikortti 135 €' },
  { pattern: '%Kiipeilykeskus%',      hinta_kuvaus: 'Kertakäynti 16 €, varustevuokra 5 €/setti' },
  { pattern: '%Climbing Center%',     hinta_kuvaus: 'Päiväkortti 18 €, kuukausikortti 55 €' },
  { pattern: '%Hakametsä%',           hinta_kuvaus: 'Joukkuevuoro 220–380 €/h, ks. tampereentapahtumat.fi' },
  { pattern: '%Tampereen Jäähalli%',  hinta_kuvaus: 'Luistelulippu aikuinen 8 €, lapsi 4 €' },
  { pattern: '%Pirkkahalli%',         hinta_kuvaus: 'Toimintaperusteiset vuokrahinnat, ks. pirkkahalli.fi' },
  { pattern: '%Tenniskeskus%',        hinta_kuvaus: 'Kenttävuokra 22–28 €/h, oppitunti alkaen 45 €' },
  { pattern: '%YMCA%',                hinta_kuvaus: 'Jäsenmaksu 45 €/kk, sisältää kaikki aktiviteetit' },
]

async function main() {
  console.log(`Aloitetaan hintadatan syöttö — ${HINNAT.length} paikkaa...\n`)
  let paivitetty = 0
  let eiLoydetty = 0

  for (const { pattern, hinta_kuvaus } of HINNAT) {
    const { data, error } = await supabase
      .from('liikuntapaikat')
      .update({ hinta_kuvaus })
      .ilike('nimi', pattern)
      .select('id, nimi')

    if (error) {
      console.error(`  VIRHE [${pattern}]: ${error.message}`)
      continue
    }

    if (!data || data.length === 0) {
      console.log(`  EI LÖYDY [${pattern}]`)
      eiLoydetty++
    } else {
      for (const row of data) {
        console.log(`  ✓ ${row.nimi} — "${hinta_kuvaus}"`)
      }
      paivitetty += data.length
    }
  }

  console.log(`\nValmis! Päivitetty: ${paivitetty} riviä, ei löydetty: ${eiLoydetty} hakua`)
  if (eiLoydetty > 0) {
    console.log('Vinkki: Tarkista nimi Supabasesta ja päivitä pattern tässä scriptissä.')
  }
}

main().catch(err => {
  console.error('Odottamaton virhe:', err)
  process.exit(1)
})
