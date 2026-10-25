import { diffDays, plusDays, plusMonths, type Day } from '../../lib/dates'
import type { Frequency, Task } from './types'

/** Adds one period of the given frequency. Months are calendar months (Jan 31 → Feb 28). */
export function addPeriod(d: Day, freq: Frequency): Day {
  switch (freq) {
    case 'once':
    case 'daily': return plusDays(d, 1)
    case 'weekly': return plusDays(d, 7)
    case 'monthly': return plusMonths(d, 1)
    case 'quarterly': return plusMonths(d, 3)
  }
}

/** Approximate length in days, used for spreading tasks over a period */
export const SPAN_DAYS: Record<Frequency, number> = { once: 1, daily: 1, weekly: 7, monthly: 30, quarterly: 90 }

/** The task turns red on this day if still not done */
export const deadlineOf = (t: Pick<Task, 'due_date' | 'frequency'>): Day => addPeriod(t.due_date, t.frequency)

export const isOpen = (t: Pick<Task, 'due_date' | 'active'>, day: Day) => t.active && t.due_date <= day

export const isOverdue = (t: Pick<Task, 'due_date' | 'frequency' | 'active'>, day: Day) =>
  isOpen(t, day) && day >= deadlineOf(t)

/** 0 when done before the deadline; deadline day itself counts as 1 day late */
export function daysLate(t: Pick<Task, 'due_date' | 'frequency'>, day: Day): number {
  const n = diffDays(day, deadlineOf(t))
  return n >= 0 ? n + 1 : 0
}

/** One-time tasks are done for good once completed (they become inactive) */
export const isDoneForGood = (t: Pick<Task, 'frequency' | 'active'>) => t.frequency === 'once' && !t.active

/** Computes what completing a task on `day` means: the completion record and the next due date (null = never again) */
export function completeOn(t: Pick<Task, 'due_date' | 'frequency'>, day: Day) {
  const late = daysLate(t, day)
  return {
    appeared_on: t.due_date,
    deadline: deadlineOf(t),
    completed_on: day,
    on_time: late === 0,
    days_late: late,
    next_due: t.frequency === 'once' ? null : addPeriod(day, t.frequency),
  }
}

/**
 * Spreads tasks of each frequency evenly over their first period so they don't
 * all appear on the same day. Daily tasks all start today.
 */
export function spreadInitialDates<T extends { frequency: Frequency }>(tasks: T[], start: Day): (T & { due_date: Day })[] {
  const counters: Record<Frequency, number> = { once: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0 }
  const totals: Record<Frequency, number> = { once: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0 }
  tasks.forEach(t => totals[t.frequency]++)
  return tasks.map(t => {
    const i = counters[t.frequency]++
    const offset = SPAN_DAYS[t.frequency] === 1 ? 0 : Math.floor((i * SPAN_DAYS[t.frequency]) / totals[t.frequency])
    return { ...t, due_date: plusDays(start, offset) }
  })
}

/** For a newly added task: the least busy day within its first period (earliest on ties). */
export function pickStartDate(freq: Frequency, existing: Pick<Task, 'due_date' | 'active'>[], start: Day): Day {
  if (SPAN_DAYS[freq] === 1) return start
  const load = new Map<Day, number>()
  existing.forEach(t => t.active && load.set(t.due_date, (load.get(t.due_date) ?? 0) + 1))
  let best = start
  let bestLoad = Infinity
  for (let i = 0; i < SPAN_DAYS[freq]; i++) {
    const d = plusDays(start, i)
    const l = load.get(d) ?? 0
    if (l < bestLoad) { best = d; bestLoad = l }
  }
  return best
}
