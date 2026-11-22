import { describe, expect, it } from 'vitest'
import { cycleWeek, dayRhythm, planWeekStart, startForWeek } from './plan'

// 2026-11-20 is a Friday
describe('meal plan weeks', () => {
  it('a plan week starts on Friday', () => {
    expect(planWeekStart('2026-11-20')).toBe('2026-11-20')
    expect(planWeekStart('2026-11-22')).toBe('2026-11-20') // Sunday
    expect(planWeekStart('2026-11-26')).toBe('2026-11-20') // Thursday
    expect(planWeekStart('2026-11-27')).toBe('2026-11-27')
  })

  it('cycles through 4 weeks and wraps around', () => {
    const start = '2026-11-20'
    expect(cycleWeek('2026-11-22', start)).toBe(1)
    expect(cycleWeek('2026-11-27', start)).toBe(2)
    expect(cycleWeek('2026-12-11', start)).toBe(4)
    expect(cycleWeek('2026-12-18', start)).toBe(1)
    expect(cycleWeek('2026-11-13', start)).toBe(4) // before the start
  })

  it('can make the current week any week of the cycle', () => {
    expect(cycleWeek('2026-11-24', startForWeek(3, '2026-11-24'))).toBe(3)
  })

  it('weekend dishes are cooked Fri/Sat, midweek on Tue/Wed', () => {
    expect(dayRhythm('2026-11-20')).toMatchObject({ eat: 'weekend', cook: 'weekend' })
    expect(dayRhythm('2026-11-22')).toMatchObject({ eat: 'weekend', cook: null })
    expect(dayRhythm('2026-11-24')).toMatchObject({ eat: 'weekend', cook: 'midweek' })
    expect(dayRhythm('2026-11-26')).toMatchObject({ eat: 'midweek', cook: null })
  })
})
