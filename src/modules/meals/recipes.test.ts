import { describe, expect, it } from 'vitest'
import { stepMinutes } from './CookMode'
import { DEFAULT_DISHES } from './defaults'

describe('recipes', () => {
  it('finds the minutes in a step for the timer', () => {
    expect(stepMinutes('מבשלים 30 דקות על אש נמוכה')).toBe(30)
    expect(stepMinutes('צורבים 3–4 דקות לכל צד')).toBe(4)
    expect(stepMinutes('מבשלים 18-20 דקות')).toBe(20)
    expect(stepMinutes('מערבבים היטב')).toBeNull()
  })

  it('every default dish has a full recipe, and the bank has alternatives', () => {
    for (const d of DEFAULT_DISHES) {
      expect(d.ingredients.length, d.title).toBeGreaterThan(2)
      expect(d.steps.length, d.title).toBeGreaterThan(3)
    }
    expect(DEFAULT_DISHES.filter(d => d.week === null).length).toBe(8)
  })
})
