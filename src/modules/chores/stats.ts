import { plusDays, type Day } from '../../lib/dates'
import { daysLate, isOverdue } from './schedule'
import type { ChoresData, Task } from './types'

export interface TaskStats {
  task: Task
  count: number
  onTime: number
  late: number
  /** null when nothing was completed in range */
  rate: number | null
  avgLate: number
  postponed: number
  overdueNow: number
  byPerson: Record<string, number>
  /** higher = more neglected */
  troubleScore: number
}

export function rangeStart(days: number | null, today: Day): Day | null {
  return days == null ? null : plusDays(today, -days + 1)
}

export function computeStats(d: ChoresData, from: Day | null, today: Day) {
  const comps = d.completions.filter(c => !from || c.completed_on >= from)
  const events = d.events.filter(e => (!from || e.created_at.slice(0, 10) >= from) && e.to_date > e.from_date)

  const perTask: TaskStats[] = d.tasks.map(task => {
    const cs = comps.filter(c => c.task_id === task.id)
    const late = cs.filter(c => !c.on_time)
    const byPerson: Record<string, number> = {}
    cs.forEach(c => (byPerson[c.done_by] = (byPerson[c.done_by] ?? 0) + 1))
    const overdueNow = isOverdue(task, today) ? daysLate(task, today) : 0
    const postponed = events.filter(e => e.task_id === task.id).length
    return {
      task, count: cs.length, onTime: cs.length - late.length, late: late.length,
      rate: cs.length ? (cs.length - late.length) / cs.length : null,
      avgLate: late.length ? late.reduce((s, c) => s + c.days_late, 0) / late.length : 0,
      postponed, overdueNow, byPerson,
      troubleScore: late.length + postponed + (overdueNow ? 1 + Math.min(overdueNow, 30) / 10 : 0),
    }
  })

  const byPerson: Record<string, number> = {}
  const byCategory = new Map<string, Record<string, number>>()
  comps.forEach(c => {
    byPerson[c.done_by] = (byPerson[c.done_by] ?? 0) + 1
    const cat = d.tasks.find(t => t.id === c.task_id)?.category ?? 'אחר'
    const row = byCategory.get(cat) ?? {}
    row[c.done_by] = (row[c.done_by] ?? 0) + 1
    byCategory.set(cat, row)
  })

  const onTime = comps.filter(c => c.on_time).length
  return {
    total: comps.length,
    rate: comps.length ? onTime / comps.length : null,
    overdueNow: d.tasks.filter(t => isOverdue(t, today)).length,
    byPerson,
    byCategory: [...byCategory.entries()].sort((a, b) => sum(b[1]) - sum(a[1])),
    perTask,
    trouble: perTask.filter(s => s.troubleScore > 0).sort((a, b) => b.troubleScore - a.troubleScore).slice(0, 5),
    best: perTask.filter(s => s.count >= 2).sort((a, b) => b.rate! - a.rate! || b.count - a.count).slice(0, 5),
  }
}

export const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)
export const pct = (r: number | null) => (r == null ? '–' : `${Math.round(r * 100)}%`)
export const rateClass = (r: number | null) => (r == null ? '' : r >= 0.8 ? 'good' : r >= 0.5 ? 'mid' : 'bad')
