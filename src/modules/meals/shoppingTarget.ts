import { sameName } from '../shopping/categories'
import { useShopping } from '../shopping/store'

type Product = { name: string; amount: string | null }

/** Ingredients go to the shared "סופר" list (or the first shared list), one tap at a time */
export function useShoppingTarget() {
  const shop = useShopping()
  const shared = shop.visibleLists.filter(l => !l.owner_id)
  const list = shared.find(l => l.name === 'סופר') ?? shared[0] ?? shop.visibleLists[0]
  const itemFor = (name: string) => (list ? shop.items.find(i => i.list_id === list.id && sameName(i.name, name)) : undefined)
  return {
    list,
    onList: (p: Product) => !!itemFor(p.name)?.needed,
    async toggle(p: Product) {
      if (!list) return
      const item = itemFor(p.name)
      if (item?.needed) await shop.setNeeded(item, false)
      else await shop.addMany(list.id, [{ name: p.name, note: p.amount }])
    },
  }
}
