import { describe, expect, it } from 'vitest'
import { guessCategory, matches, sameName } from './categories'

describe('guessCategory', () => {
  it('maps common products', () => {
    expect(guessCategory('חלב 3%')).toBe('מוצרי חלב וביצים')
    expect(guessCategory('עגבניות שרי')).toBe('פירות וירקות')
    expect(guessCategory('נייר טואלט')).toBe('ניקיון')
    expect(guessCategory('משחת שיניים')).toBe('טיפוח והיגיינה')
    expect(guessCategory('אקמול')).toBe('תרופות ובריאות')
    expect(guessCategory('פיתות')).toBe('לחם ומאפים')
    expect(guessCategory('שוקולד מריר')).toBe('חטיפים ומתוקים')
    expect(guessCategory('משהו לא מוכר')).toBe('אחר')
  })
  it('prefers the most specific keyword', () => {
    expect(guessCategory('פלפל שחור')).toBe('תבלינים ורטבים')
    expect(guessCategory('פלפל אדום')).toBe('פירות וירקות')
  })
  it('learns from existing products', () => {
    expect(guessCategory('במבה', [{ name: 'במבה', category: 'מזווה' }])).toBe('מזווה')
  })
})

describe('name helpers', () => {
  it('compare loosely', () => {
    expect(sameName(' חלב ', 'חלב')).toBe(true)
    expect(matches('קוטג׳ 5%', 'קוטג')).toBe(true)
  })
})
