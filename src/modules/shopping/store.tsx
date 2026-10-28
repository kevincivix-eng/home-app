import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { compressImage } from '../../lib/photos'
import { useHousehold } from '../../lib/household'
import { createShoppingBackend } from './backend'
import { guessCategory, sameName } from './categories'
import type { ShoppingData, ShoppingItem, ShoppingList } from './types'

const uid = () => crypto.randomUUID()
const EMPTY: ShoppingData = { lists: [], items: [] }
const ACTIVE_KEY = 'home-app:shopping-list'

interface ShoppingStore extends ShoppingData {
  loading: boolean
  error: string | null
  /** lists this user sees: shared + own personal */
  visibleLists: ShoppingList[]
  activeList: ShoppingList | undefined
  setActiveList(id: string): void
  /** Adds a product to the list – reuses it from the catalog if it already exists */
  addByName(listId: string, name: string): Promise<void>
  setNeeded(item: ShoppingItem, needed: boolean): Promise<void>
  toggleCart(item: ShoppingItem): Promise<void>
  updateItem(id: string, patch: Partial<ShoppingItem>): Promise<void>
  deleteItem(id: string): Promise<void>
  setPhoto(item: ShoppingItem, file: File): Promise<void>
  removePhoto(item: ShoppingItem): Promise<void>
  photoUrl(path: string): Promise<string>
  /** Everything in the cart goes back to the catalog */
  finishShopping(listId: string): Promise<number>
  addList(l: Pick<ShoppingList, 'name' | 'icon' | 'owner_id'>): Promise<void>
  updateList(id: string, patch: Partial<ShoppingList>): Promise<void>
  deleteList(id: string): Promise<void>
}

const Ctx = createContext<ShoppingStore>(null!)
export const useShopping = () => useContext(Ctx)

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const { household } = useHousehold()
  const backend = useMemo(() => createShoppingBackend(household!.id), [household?.id])
  const [data, setData] = useState<ShoppingData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(() => { try { return localStorage.getItem(ACTIVE_KEY) } catch { return null } })

  const refresh = useCallback(async () => {
    try { setData(await backend.fetchAll()); setError(null) } catch (e) { console.error(e); setError('בעיה בחיבור לשרת') } finally { setLoading(false) }
  }, [backend])

  useEffect(() => {
    refresh()
    return backend.subscribe(refresh)
  }, [backend, refresh])

  const mutate = useCallback(async (local: (d: ShoppingData) => ShoppingData, remote: () => Promise<void>) => {
    setData(local)
    try { await remote() } catch (e) { console.error(e); setError('השמירה נכשלה') }
    await refresh()
  }, [refresh])

  const patchItems = useCallback((patches: { id: string; patch: Partial<ShoppingItem> }[]) => {
    const byId = new Map(patches.map(p => [p.id, p.patch]))
    return mutate(
      d => ({ ...d, items: d.items.map(i => (byId.has(i.id) ? { ...i, ...byId.get(i.id) } : i)) }),
      () => backend.updateItems(patches),
    )
  }, [mutate, backend])

  const visibleLists = useMemo(
    () => data.lists.filter(l => !l.owner_id || l.owner_id === userId).sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at)),
    [data.lists, userId],
  )
  const activeList = visibleLists.find(l => l.id === activeId) ?? visibleLists[0]

  const store: ShoppingStore = {
    ...data, loading, error, visibleLists, activeList,
    setActiveList(id) { setActiveId(id); try { localStorage.setItem(ACTIVE_KEY, id) } catch { /* ignore */ } },

    async addByName(listId, raw) {
      const name = raw.trim()
      if (!name) return
      const existing = data.items.find(i => i.list_id === listId && sameName(i.name, name))
      if (existing) {
        if (!existing.needed) await patchItems([{ id: existing.id, patch: { needed: true, in_cart: false } }])
        return
      }
      const item: ShoppingItem = {
        id: uid(), list_id: listId, name, category: guessCategory(name, data.items),
        needed: true, in_cart: false, quantity: null, note: null, image_path: null, times_bought: 0, last_bought_at: null,
        created_at: new Date().toISOString(),
      }
      await mutate(d => ({ ...d, items: [...d.items, item] }), () => backend.addItem(item))
    },

    setNeeded: (item, needed) => patchItems([{ id: item.id, patch: needed ? { needed: true, in_cart: false } : { needed: false, in_cart: false, quantity: null } }]),
    toggleCart: item => patchItems([{ id: item.id, patch: { in_cart: !item.in_cart } }]),
    updateItem: (id, patch) => patchItems([{ id, patch }]),
    deleteItem: id => {
      const old = data.items.find(i => i.id === id)?.image_path
      return mutate(d => ({ ...d, items: d.items.filter(i => i.id !== id) }), async () => {
        await backend.deleteItem(id)
        if (old) await backend.removePhoto(old)
      })
    },

    async setPhoto(item, file) {
      const path = await backend.uploadPhoto(item.id, await compressImage(file))
      await patchItems([{ id: item.id, patch: { image_path: path } }])
      if (item.image_path) await backend.removePhoto(item.image_path)
    },
    async removePhoto(item) {
      if (!item.image_path) return
      const old = item.image_path
      await patchItems([{ id: item.id, patch: { image_path: null } }])
      await backend.removePhoto(old)
    },
    photoUrl: path => backend.photoUrl(path),

    async finishShopping(listId) {
      const now = new Date().toISOString()
      const bought = data.items.filter(i => i.list_id === listId && i.needed && i.in_cart)
      await patchItems(bought.map(i => ({
        id: i.id,
        patch: { needed: false, in_cart: false, quantity: null, times_bought: i.times_bought + 1, last_bought_at: now },
      })))
      return bought.length
    },

    async addList(l) {
      const list: ShoppingList = { ...l, id: uid(), sort: Math.max(0, ...data.lists.map(x => x.sort)) + 1, created_at: new Date().toISOString() }
      await mutate(d => ({ ...d, lists: [...d.lists, list] }), () => backend.addList(list))
      store.setActiveList(list.id)
    },
    updateList: (id, patch) => mutate(d => ({ ...d, lists: d.lists.map(l => (l.id === id ? { ...l, ...patch } : l)) }), () => backend.updateList(id, patch)),
    deleteList: id => mutate(d => ({ ...d, lists: d.lists.filter(l => l.id !== id), items: d.items.filter(i => i.list_id !== id) }), () => backend.deleteList(id)),
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
