import { supabase } from '../../lib/supabase'
import type { ShoppingData, ShoppingItem, ShoppingList } from './types'

export interface ShoppingBackend {
  fetchAll(): Promise<ShoppingData>
  subscribe(onChange: () => void): () => void
  addList(l: ShoppingList): Promise<void>
  updateList(id: string, patch: Partial<ShoppingList>): Promise<void>
  deleteList(id: string): Promise<void>
  addItem(i: ShoppingItem): Promise<void>
  updateItems(patches: { id: string; patch: Partial<ShoppingItem> }[]): Promise<void>
  deleteItem(id: string): Promise<void>
}

const check = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error
  return data
}

function supabaseBackend(household_id: string): ShoppingBackend {
  const sb = supabase!
  return {
    async fetchAll() {
      const [lists, items] = await Promise.all([
        sb.from('shopping_lists').select('*').eq('household_id', household_id).order('sort').order('created_at').then(check),
        sb.from('shopping_items').select('*').eq('household_id', household_id).then(check),
      ])
      return { lists, items } as ShoppingData
    },
    subscribe(onChange) {
      const ch = sb.channel(`shopping-${household_id}`)
      for (const table of ['shopping_lists', 'shopping_items'])
        ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `household_id=eq.${household_id}` }, onChange)
      ch.subscribe()
      const onVisible = () => document.visibilityState === 'visible' && onChange()
      document.addEventListener('visibilitychange', onVisible)
      return () => { sb.removeChannel(ch); document.removeEventListener('visibilitychange', onVisible) }
    },
    addList: async l => { check(await sb.from('shopping_lists').insert({ ...l, household_id })) },
    updateList: async (id, patch) => { check(await sb.from('shopping_lists').update(patch).eq('id', id)) },
    deleteList: async id => { check(await sb.from('shopping_lists').delete().eq('id', id)) },
    // household_id is set by a DB trigger from the list
    addItem: async i => { check(await sb.from('shopping_items').insert(i)) },
    updateItems: async patches => {
      await Promise.all(patches.map(async ({ id, patch }) => check(await sb.from('shopping_items').update(patch).eq('id', id))))
    },
    deleteItem: async id => { check(await sb.from('shopping_items').delete().eq('id', id)) },
  }
}

function localBackend(): ShoppingBackend {
  const KEY = 'home-app:shopping'
  const listeners = new Set<() => void>()
  const read = (): ShoppingData => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    const now = new Date().toISOString()
    return {
      lists: [['סופר', '🛒'], ['פארם', '💊'], ['בית', '🏠']].map(([name, icon], sort) => ({ id: `demo-list-${sort}`, name, icon, owner_id: null, sort, created_at: now })),
      items: [],
    }
  }
  const write = (fn: (d: ShoppingData) => void) => {
    const d = read()
    fn(d)
    try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* ignore */ }
    listeners.forEach(l => l())
  }
  return {
    fetchAll: async () => read(),
    subscribe(onChange) {
      listeners.add(onChange)
      const onStorage = (e: StorageEvent) => e.key === KEY && onChange()
      window.addEventListener('storage', onStorage)
      return () => { listeners.delete(onChange); window.removeEventListener('storage', onStorage) }
    },
    addList: async l => write(d => { d.lists.push(l) }),
    updateList: async (id, patch) => write(d => { d.lists = d.lists.map(l => (l.id === id ? { ...l, ...patch } : l)) }),
    deleteList: async id => write(d => { d.lists = d.lists.filter(l => l.id !== id); d.items = d.items.filter(i => i.list_id !== id) }),
    addItem: async i => write(d => { d.items.push(i) }),
    updateItems: async patches => write(d => {
      const byId = new Map(patches.map(p => [p.id, p.patch]))
      d.items = d.items.map(i => (byId.has(i.id) ? { ...i, ...byId.get(i.id) } : i))
    }),
    deleteItem: async id => write(d => { d.items = d.items.filter(i => i.id !== id) }),
  }
}

export const createShoppingBackend = (householdId: string): ShoppingBackend =>
  supabase ? supabaseBackend(householdId) : localBackend()
