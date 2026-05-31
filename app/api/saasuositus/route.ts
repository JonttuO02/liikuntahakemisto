import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SUOMI_KAUPUNGIT } from '@/lib/constants'
import { buildReissuKonteksti } from '@/lib/buildReissuKonteksti'
import { buildKiinnostuksetKonteksti } from '@/lib/buildKiinnostuksetKonteksti'

const client = new Anthropic()

const DAY_FI = ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'] as const

function getTimeBasedFallback(kaupunki: string): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 11)  return `Huomenta · Löydä paras liikuntapaikka ${kaupunki}lta`
  if (h >= 11 && h < 17) return `Hei · Löydä paras liikuntapaikka ${kaupunki}lta`
  return `Iltaa · Löydä paras liikuntapaikka ${kaupunki}lta`
}

interface WeatherData {
  temp: number
  code: number
  day: string
  weatherDesc: string
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  let temp = 15
  let code = 0

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`,
      { next: { revalidate: 1800 } }
    )
    if (res.ok) {
      const d = await res.json()
      temp = Math.round(d.current.temperature_2m)
      code = d.current.weather_code
    }
  } catch {}

  const day = DAY_FI[new Date().getDay()]

  const weatherDesc =
    code === 0  ? 'aurinkoinen' :
    code <= 3   ? 'puolipilvinen' :
    code <= 48  ? 'pilvinen' :
    code <= 67  ? 'sateinen' :
    code <= 77  ? 'luminen' :
    'pilvinen'

  return { temp, code, day, weatherDesc }
}

function lookupCity(kaupunki: string): { lat: number; lng: number } {
  return SUOMI_KAUPUNGIT.find(c => c.nimi === kaupunki) ?? { lat: 61.4978, lng: 23.7610 }
}

export async function GET(request: Request) {
  const rawKaupunki = new URL(request.url).searchParams.get('kaupunki') ?? 'Tampere'
  const kaupunki = rawKaupunki.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80).trim() || 'Tampere'
  const city = lookupCity(kaupunki)
  const { temp, code, day, weatherDesc } = await fetchWeather(city.lat, city.lng)

  let text: string
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Tänään on ${day} ${kaupunki}ssa. Lämpötila on ${temp}°C ja sää on ${weatherDesc}. Kirjoita YKSI lyhyt suomenkielinen lause joka suosittelee sopivaa liikuntapalvelua tai -lajia tähän säähän ${kaupunki}ssa. Mainitse "${kaupunki}" tai viittaa liikuntapaikan löytämiseen. Älä käytä emojeja.`,
      }],
    })
    const block = msg.content[0]
    text = block.type === 'text' ? block.text.trim() : getTimeBasedFallback(kaupunki)
  } catch {
    return NextResponse.json({ text: getTimeBasedFallback(kaupunki), temp, code, fallback: true })
  }

  return NextResponse.json({ text, temp, code, fallback: false })
}

export async function POST(request: Request) {
  let suosikit: string[] = []
  let kaupunki = 'Tampere'
  let kotikaupunki: string | undefined
  let kiinnostukset: string[] = []
  try {
    const body = await request.json()
    suosikit = Array.isArray(body.suosikit)
      ? body.suosikit
          .slice(0, 10)
          .filter((s: unknown): s is string => typeof s === 'string')
          .map((s: string) => s.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80))
      : []
    if (typeof body.kaupunki === 'string') kaupunki = body.kaupunki.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80).trim() || 'Tampere'
    // Sanitize kotikaupunki — same allowlist as suosikit names (T-14-08)
    if (typeof body.kotikaupunki === 'string' && body.kotikaupunki.trim()) {
      kotikaupunki = body.kotikaupunki
        .replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '')
        .slice(0, 80)
        .trim()
    }
    // Sanitize kiinnostukset — same allowlist and limits as suosikit array (T-22-03)
    kiinnostukset = Array.isArray(body.kiinnostukset)
      ? body.kiinnostukset
          .slice(0, 10)
          .filter((s: unknown): s is string => typeof s === 'string')
          .map((s: string) => s.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80))
      : []
  } catch {}

  const city = lookupCity(kaupunki)
  const { temp, code, day, weatherDesc } = await fetchWeather(city.lat, city.lng)

  const suosikkiLista = suosikit.length
    ? `\nKäyttäjän suosikit: ${suosikit.join(', ')}.`
    : ''

  const reissuKonteksti = buildReissuKonteksti(kotikaupunki, kaupunki)
  const kiinnostuksetKonteksti = buildKiinnostuksetKonteksti(kiinnostukset)

  const prompt = `Tänään on ${day} ${kaupunki}ssa. Lämpötila on ${temp}°C ja sää on ${weatherDesc}. Kirjoita YKSI lyhyt suomenkielinen lause joka suosittelee sopivaa liikuntapalvelua tai -lajia tähän säähän ${kaupunki}ssa. Mainitse "${kaupunki}" tai viittaa liikuntapaikan löytämiseen. Älä käytä emojeja.${suosikkiLista}${reissuKonteksti}${kiinnostuksetKonteksti}`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = msg.content[0]
    const text = block.type === 'text' ? block.text.trim() : getTimeBasedFallback(kaupunki)
    return NextResponse.json({ text, temp, code, fallback: false })
  } catch {
    return NextResponse.json({ text: getTimeBasedFallback(kaupunki), temp, code, fallback: true })
  }
}
