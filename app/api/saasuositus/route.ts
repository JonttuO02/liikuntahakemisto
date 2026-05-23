import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const DAY_FI = ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'] as const

function getTimeBasedFallback(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 11)  return 'Huomenta · Löydä paras liikuntapaikka Tampereelta'
  if (h >= 11 && h < 17) return 'Hei · Löydä paras liikuntapaikka Tampereelta'
  return 'Iltaa · Löydä paras liikuntapaikka Tampereelta'
}

interface WeatherData {
  temp: number
  code: number
  day: string
  weatherDesc: string
}

async function fetchWeather(): Promise<WeatherData> {
  let temp = 15
  let code = 0

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=61.4978&longitude=23.7610&current=temperature_2m,weather_code',
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

export async function GET() {
  const { temp, code, day, weatherDesc } = await fetchWeather()

  let text: string
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Tänään on ${day} Tampereella. Lämpötila on ${temp}°C ja sää on ${weatherDesc}. Kirjoita YKSI lyhyt suomenkielinen lause joka suosittelee sopivaa liikuntapalvelua tai -lajia tähän säähän Tampereella. Mainitse "Tampere" tai viittaa liikuntapaikan löytämiseen. Älä käytä emojeja.`,
      }],
    })
    const block = msg.content[0]
    text = block.type === 'text' ? block.text.trim() : getTimeBasedFallback()
  } catch {
    return NextResponse.json({ text: getTimeBasedFallback(), temp, code, fallback: true })
  }

  return NextResponse.json({ text, temp, code, fallback: false })
}

export async function POST(request: Request) {
  let suosikit: string[] = []
  try {
    const body = await request.json()
    suosikit = Array.isArray(body.suosikit)
      ? body.suosikit
          .slice(0, 10)
          .filter((s): s is string => typeof s === 'string')
          .map((s: string) => s.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80))
      : []
  } catch {}

  const { temp, code, day, weatherDesc } = await fetchWeather()

  const suosikkiLista = suosikit.length
    ? `\nKäyttäjän suosikit: ${suosikit.join(', ')}.`
    : ''

  const prompt = `Tänään on ${day} Tampereella. Lämpötila on ${temp}°C ja sää on ${weatherDesc}. Kirjoita YKSI lyhyt suomenkielinen lause joka suosittelee sopivaa liikuntapalvelua tai -lajia tähän säähän Tampereella. Mainitse "Tampere" tai viittaa liikuntapaikan löytämiseen. Älä käytä emojeja.${suosikkiLista}`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = msg.content[0]
    const text = block.type === 'text' ? block.text.trim() : getTimeBasedFallback()
    return NextResponse.json({ text, temp, code, fallback: false })
  } catch {
    return NextResponse.json({ text: getTimeBasedFallback(), temp, code, fallback: true })
  }
}
