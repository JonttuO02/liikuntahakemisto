const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const
type DayKey = typeof DAY_KEYS[number]

export type OpenStatus =
  | { status: 'open'; hours: string }
  | { status: 'closed'; hours: string | null }
  | { status: 'no-data' }

export interface HourGroup {
  key: string
  label: string
  hours: string
  dayKeys: string[]
}

export function getOpenStatus(
  aukioloajat: Record<string, { open: string; close: string }> | null | undefined,
  now: Date = new Date()
): OpenStatus {
  if (!aukioloajat) return { status: 'no-data' }

  const dayKey: DayKey = DAY_KEYS[now.getDay()]
  const entry = aukioloajat[dayKey]

  if (!entry || !entry.open || !entry.close) {
    const hasAnyData = Object.values(aukioloajat).some(v => v.open && v.close)
    if (!hasAnyData) return { status: 'no-data' }
    return { status: 'closed', hours: null }
  }

  const nowMins = now.getHours() * 60 + now.getMinutes()
  const openMins = parseInt(entry.open.split(':')[0]) * 60 + parseInt(entry.open.split(':')[1])
  const closeMins = parseInt(entry.close.split(':')[0]) * 60 + parseInt(entry.close.split(':')[1])

  const isOpen = closeMins < openMins
    ? nowMins >= openMins || nowMins < closeMins
    : nowMins >= openMins && nowMins < closeMins

  const rangeStr = entry.open + '–' + entry.close
  return { status: isOpen ? 'open' : 'closed', hours: rangeStr }
}

const ORDERED_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const FI_ABBR: Record<string, string> = {
  monday: 'Ma', tuesday: 'Ti', wednesday: 'Ke', thursday: 'To',
  friday: 'Pe', saturday: 'La', sunday: 'Su'
}

export function formatGroupedHours(
  aukioloajat: Record<string, { open: string; close: string }> | null | undefined
): HourGroup[] {
  if (!aukioloajat) return []

  const groups: HourGroup[] = []
  let i = 0

  while (i < ORDERED_DAYS.length) {
    const dayKey = ORDERED_DAYS[i]
    const entry = aukioloajat[dayKey]
    const hours = (entry?.open && entry?.close) ? entry.open + '–' + entry.close : 'suljettu'

    let j = i + 1
    while (j < ORDERED_DAYS.length) {
      const nextKey = ORDERED_DAYS[j]
      const nextEntry = aukioloajat[nextKey]
      const nextHours = (nextEntry?.open && nextEntry?.close) ? nextEntry.open + '–' + nextEntry.close : 'suljettu'
      if (nextHours !== hours) break
      j++
    }

    const span = ORDERED_DAYS.slice(i, j) as unknown as string[]
    const label = span.length === 1 ? FI_ABBR[span[0]] : FI_ABBR[span[0]] + '–' + FI_ABBR[span[span.length - 1]]
    groups.push({ key: span.join('-'), label, hours, dayKeys: [...span] })
    i = j
  }

  return groups
}
