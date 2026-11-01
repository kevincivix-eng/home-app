import { describe, expect, it } from 'vitest'
import { categoriesOf, CATEGORIES } from './defaults'

describe('categoriesOf', () => {
  it('keeps the built-in categories first and adds each new one once', () => {
    const r = categoriesOf([{ category: 'מטבח' }, { category: 'גינה' }, { category: 'גינה' }, { category: 'אופניים' }])
    expect(r).toEqual([...CATEGORIES, 'אופניים', 'גינה'])
  })
})
