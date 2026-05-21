'use client'

import type { HourGroup } from '@/lib/aukiolo'

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export default function HoursTable({ groups }: { groups: HourGroup[] }) {
  const todayKey = DAY_KEYS[new Date().getDay()]
  return (
    <div className="flex flex-col gap-1">
      {groups.map(group => {
        const isToday = group.dayKeys.includes(todayKey)
        return (
          <p key={group.key}
             className={isToday
               ? 'text-sm font-bold text-[#111111]'
               : 'text-sm text-[rgba(17,17,17,0.65)]'}>
            {group.label} {group.hours}
          </p>
        )
      })}
    </div>
  )
}
