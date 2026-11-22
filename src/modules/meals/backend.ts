import { supabase } from '../../lib/supabase'
import type { Dish, Ingredient, MealPlan, MealsData } from './types'

export interface MealsBackend {
  fetchAll(): Promise<MealsData>
  subscribe(onChange: () => void): () => void
  savePlan(p: MealPlan): Promise<void>
  addDishes(d: Dish[]): Promise<void>
  updateDish(id: string, patch: Partial<Dish>): Promise<void>
  deleteDish(id: string): Promise<void>
  addIngredients(i: Ingredient[]): Promise<void>
  updateIngredient(id: string, patch: Partial<Ingredient>): Promise<void>
  deleteIngredient(id: string): Promise<void>
}

const check = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error
  return data
}

function supabaseBackend(household_id: string): MealsBackend {
  const sb = supabase!
  const h = { household_id }
  return {
    async fetchAll() {
      const [plans, dishes, ingredients] = await Promise.all([
        sb.from('meal_plans').select('cycle_start, week_titles').eq('household_id', household_id).then(check),
        sb.from('meal_dishes').select('*').eq('household_id', household_id).order('sort').order('created_at').then(check),
        sb.from('meal_ingredients').select('*').eq('household_id', household_id).order('sort').order('created_at').then(check),
      ])
      return { plan: (plans as MealPlan[])[0] ?? null, dishes, ingredients } as MealsData
    },
    subscribe(onChange) {
      const ch = sb.channel(`meals-${household_id}`)
      for (const table of ['meal_plans', 'meal_dishes', 'meal_ingredients'])
        ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `household_id=eq.${household_id}` }, onChange)
      ch.subscribe()
      const onVisible = () => document.visibilityState === 'visible' && onChange()
      document.addEventListener('visibilitychange', onVisible)
      return () => { sb.removeChannel(ch); document.removeEventListener('visibilitychange', onVisible) }
    },
    savePlan: async p => { check(await sb.from('meal_plans').upsert({ ...p, ...h, updated_at: new Date().toISOString() })) },
    addDishes: async d => { check(await sb.from('meal_dishes').insert(d.map(x => ({ ...x, ...h })))) },
    updateDish: async (id, patch) => { check(await sb.from('meal_dishes').update(patch).eq('id', id)) },
    deleteDish: async id => { check(await sb.from('meal_dishes').delete().eq('id', id)) },
    addIngredients: async i => { check(await sb.from('meal_ingredients').insert(i.map(x => ({ ...x, ...h })))) },
    updateIngredient: async (id, patch) => { check(await sb.from('meal_ingredients').update(patch).eq('id', id)) },
    deleteIngredient: async id => { check(await sb.from('meal_ingredients').delete().eq('id', id)) },
  }
}

function localBackend(): MealsBackend {
  const KEY = 'home-app:meals'
  const listeners = new Set<() => void>()
  const read = (): MealsData => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* fall through */ }
    return { plan: null, dishes: [], ingredients: [] }
  }
  const write = async (fn: (d: MealsData) => void) => {
    const d = read()
    fn(d)
    localStorage.setItem(KEY, JSON.stringify(d))
    listeners.forEach(l => l())
  }
  return {
    fetchAll: async () => read(),
    subscribe(onChange) {
      listeners.add(onChange)
      return () => { listeners.delete(onChange) }
    },
    savePlan: p => write(d => { d.plan = p }),
    addDishes: x => write(d => { d.dishes.push(...x) }),
    updateDish: (id, patch) => write(d => { d.dishes = d.dishes.map(x => (x.id === id ? { ...x, ...patch } : x)) }),
    deleteDish: id => write(d => { d.dishes = d.dishes.filter(x => x.id !== id) }),
    addIngredients: x => write(d => { d.ingredients.push(...x) }),
    updateIngredient: (id, patch) => write(d => { d.ingredients = d.ingredients.map(x => (x.id === id ? { ...x, ...patch } : x)) }),
    deleteIngredient: id => write(d => { d.ingredients = d.ingredients.filter(x => x.id !== id) }),
  }
}

export const createMealsBackend = (householdId: string) => (supabase ? supabaseBackend(householdId) : localBackend())
