import { diffDays, fromDay, plusDays, type Day } from '../../lib/dates'
import type { Slot } from './types'

const FRIDAY = 5

/** A plan week runs Friday → Thursday: the Friday on or before `day` */
export function planWeekStart(day: Day): Day {
  return plusDays(day, -((fromDay(day).getDay() - FRIDAY + 7) % 7))
}

/** Which week of the 4-week cycle (1–4) `day` falls in */
export function cycleWeek(day: Day, cycleStart: Day): number {
  const weeks = Math.floor(diffDays(planWeekStart(day), planWeekStart(cycleStart)) / 7)
  return (((weeks % 4) + 4) % 4) + 1
}

/** The cycle start that makes the week containing `day` be week `n` */
export const startForWeek = (n: number, day: Day): Day => plusDays(planWeekStart(day), -(n - 1) * 7)

/** What the family eats on `day`, and what (if anything) gets cooked */
export function dayRhythm(day: Day): { eat: Slot; cook: Slot | null; cookNote?: string } {
  switch (fromDay(day).getDay()) {
    case 5: case 6: return { eat: 'weekend', cook: 'weekend' }
    case 0: case 1: return { eat: 'weekend', cook: null }
    case 2: return { eat: 'weekend', cook: 'midweek', cookNote: 'הערב, לרביעי–חמישי' }
    case 3: return { eat: 'midweek', cook: 'midweek', cookNote: 'אם לא הכנתם אתמול, מבשלים היום' }
    default: return { eat: 'midweek', cook: null }
  }
}
