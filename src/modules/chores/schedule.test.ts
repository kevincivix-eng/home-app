import { describe, expect, it } from 'vitest'
import { addPeriod, completeOn, daysLate, deadlineOf, isOpen, isOverdue, pickStartDate, spreadInitialDates } from './schedule'

const task = (due_date: string, frequency: any = 'daily') => ({ due_date, frequency, active: true })

describe('addPeriod', () => {
  it('adds calendar periods', () => {
    expect(addPeriod('2026-10-25', 'daily')).toBe('2026-10-26')
    expect(addPeriod('2026-10-25', 'weekly')).toBe('2026-11-01')
    expect(addPeriod('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(addPeriod('2026-11-30', 'quarterly')).toBe('2027-02-28')
  })
})

describe('open / overdue', () => {
  it('daily task appearing today is open and turns red tomorrow', () => {
    const t = task('2026-10-25')
    expect(isOpen(t, '2026-10-24')).toBe(false)
    expect(isOpen(t, '2026-10-25')).toBe(true)
    expect(isOverdue(t, '2026-10-25')).toBe(false)
    expect(isOverdue(t, '2026-10-26')).toBe(true)
  })
  it('weekly task turns red a week after it appeared', () => {
    const t = task('2026-10-25', 'weekly')
    expect(deadlineOf(t)).toBe('2026-11-01')
    expect(isOverdue(t, '2026-10-31')).toBe(false)
    expect(isOverdue(t, '2026-11-01')).toBe(true)
  })
  it('inactive tasks are never open', () => {
    expect(isOpen({ ...task('2026-10-01'), active: false }, '2026-10-25')).toBe(false)
  })
})

describe('completeOn', () => {
  it('on time completion, next due counted from completion day', () => {
    const r = completeOn(task('2026-10-25', 'weekly'), '2026-10-28')
    expect(r).toMatchObject({ on_time: true, days_late: 0, deadline: '2026-11-01', next_due: '2026-11-04' })
  })
  it('early completion is on time and resets the next round from today', () => {
    const r = completeOn(task('2026-11-10', 'monthly'), '2026-10-25')
    expect(r).toMatchObject({ on_time: true, days_late: 0, appeared_on: '2026-11-10', next_due: '2026-11-25' })
  })
  it('late completion counts days late', () => {
    expect(daysLate(task('2026-10-25'), '2026-10-26')).toBe(1)
    const r = completeOn(task('2026-10-25', 'weekly'), '2026-11-03')
    expect(r).toMatchObject({ on_time: false, days_late: 3, next_due: '2026-11-10' })
  })
})

describe('spreading', () => {
  it('spreads each frequency over its period', () => {
    const tasks = [
      ...Array.from({ length: 7 }, () => ({ frequency: 'daily' as const })),
      ...Array.from({ length: 7 }, () => ({ frequency: 'weekly' as const })),
      ...Array.from({ length: 3 }, () => ({ frequency: 'quarterly' as const })),
    ]
    const r = spreadInitialDates(tasks, '2026-10-25')
    expect(r.filter(t => t.frequency === 'daily').every(t => t.due_date === '2026-10-25')).toBe(true)
    expect(new Set(r.filter(t => t.frequency === 'weekly').map(t => t.due_date)).size).toBe(7)
    expect(r.filter(t => t.frequency === 'quarterly').map(t => t.due_date)).toEqual(['2026-10-25', '2026-11-24', '2026-12-24'])
  })
  it('new task goes to the least busy day', () => {
    const existing = [task('2026-10-25'), task('2026-10-26'), task('2026-10-28')]
    expect(pickStartDate('weekly', existing, '2026-10-25')).toBe('2026-10-27')
    expect(pickStartDate('daily', existing, '2026-10-25')).toBe('2026-10-25')
  })
})
