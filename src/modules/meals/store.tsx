import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useHousehold } from '../../lib/household'
import { useToday } from '../../lib/useToday'
import { useToast } from '../../ui/Toast'
import { createMealsBackend } from './backend'
import { DEFAULT_DISHES, DEFAULT_INGREDIENTS, DEFAULT_TITLES } from './defaults'
import { cycleWeek, planWeekStart, startForWeek } from './plan'
import type { Dish, Ingredient, MealPlan, MealsData } from './types'

const uid = () => crypto.randomUUID()
const EMPTY: MealsData = { plan: null, dishes: [], ingredients: [] }

interface MealsStore extends MealsData {
  loading: boolean
  /** The saved plan, or a fresh one where this week is week 1 */
  activePlan: MealPlan
  currentWeek: number
  weekTitle(week: number): string
  setCurrentWeek(week: number): Promise<void>
  renameWeek(week: number, title: string): Promise<void>
  /** Returns the new dish's id */
  addDish(d: Omit<Dish, 'id' | 'sort' | 'created_at'>): Promise<string>
  /** `replacement` takes `current`'s place on the menu; `current` goes to the dish bank */
  swapDish(current: Dish, replacement: Dish): Promise<void>
  updateDish(id: string, patch: Partial<Dish>): Promise<void>
  deleteDish(id: string): Promise<void>
  addIngredient(i: Pick<Ingredient, 'week' | 'section' | 'name' | 'amount'>): Promise<void>
  updateIngredient(id: string, patch: Partial<Ingredient>): Promise<void>
  deleteIngredient(id: string): Promise<void>
  loadDefaults(): Promise<void>
}

const Ctx = createContext<MealsStore>(null!)
export const useMeals = () => useContext(Ctx)

export function MealsProvider({ children }: { children: ReactNode }) {
  const { household } = useHousehold()
  const backend = useMemo(() => createMealsBackend(household!.id), [household?.id])
  const today = useToday()
  const toast = useToast()
  const [data, setData] = useState<MealsData>(EMPTY)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setData(await backend.fetchAll()) } catch (e) { console.error(e); toast({ text: 'טעינת התפריט נכשלה' }) } finally { setLoading(false) }
  }, [backend, toast])

  useEffect(() => {
    refresh()
    return backend.subscribe(refresh)
  }, [backend, refresh])

  const mutate = useCallback(async (local: (d: MealsData) => MealsData, remote: () => Promise<void>) => {
    setData(local)
    try { await remote() } catch (e) { console.error(e); toast({ text: 'השמירה נכשלה' }) }
    await refresh()
  }, [refresh, toast])

  const activePlan: MealPlan = data.plan ?? { cycle_start: planWeekStart(today), week_titles: ['', '', '', ''] }
  const savePlan = (patch: Partial<MealPlan>) => {
    const plan = { ...activePlan, ...patch }
    return mutate(d => ({ ...d, plan }), () => backend.savePlan(plan))
  }
  const nextSort = (list: { sort: number }[]) => Math.max(0, ...list.map(x => x.sort)) + 1

  const store: MealsStore = {
    ...data, loading, activePlan,
    currentWeek: cycleWeek(today, activePlan.cycle_start),
    weekTitle: week => activePlan.week_titles[week - 1] ?? '',

    setCurrentWeek: week => savePlan({ cycle_start: startForWeek(week, today) }),
    renameWeek(week, title) {
      const week_titles = [0, 1, 2, 3].map(i => (i === week - 1 ? title.trim() : activePlan.week_titles[i] ?? ''))
      return savePlan({ week_titles })
    },

    async addDish(x) {
      const dish: Dish = { ...x, id: uid(), sort: nextSort(data.dishes), created_at: new Date().toISOString() }
      await mutate(d => ({ ...d, dishes: [...d.dishes, dish] }), () => backend.addDishes([dish]))
      return dish.id
    },
    async swapDish(current, replacement) {
      const into = { week: current.week, slot: current.slot, sort: current.sort }
      const out = { week: null, sort: replacement.sort }
      await mutate(
        d => ({ ...d, dishes: d.dishes.map(x => (x.id === replacement.id ? { ...x, ...into } : x.id === current.id ? { ...x, ...out } : x)) }),
        async () => { await backend.updateDish(replacement.id, into); await backend.updateDish(current.id, out) },
      )
    },
    updateDish: (id, patch) => mutate(d => ({ ...d, dishes: d.dishes.map(x => (x.id === id ? { ...x, ...patch } : x)) }), () => backend.updateDish(id, patch)),
    deleteDish: id => mutate(d => ({ ...d, dishes: d.dishes.filter(x => x.id !== id) }), () => backend.deleteDish(id)),

    async addIngredient(x) {
      const ing: Ingredient = { ...x, id: uid(), sort: nextSort(data.ingredients), created_at: new Date().toISOString() }
      await mutate(d => ({ ...d, ingredients: [...d.ingredients, ing] }), () => backend.addIngredients([ing]))
    },
    updateIngredient: (id, patch) => mutate(d => ({ ...d, ingredients: d.ingredients.map(x => (x.id === id ? { ...x, ...patch } : x)) }), () => backend.updateIngredient(id, patch)),
    deleteIngredient: id => mutate(d => ({ ...d, ingredients: d.ingredients.filter(x => x.id !== id) }), () => backend.deleteIngredient(id)),

    async loadDefaults() {
      const now = new Date().toISOString()
      const plan: MealPlan = { cycle_start: activePlan.cycle_start, week_titles: DEFAULT_TITLES }
      const dishes: Dish[] = DEFAULT_DISHES.map((x, sort) => ({ ...x, id: uid(), sort, created_at: now }))
      const ingredients: Ingredient[] = DEFAULT_INGREDIENTS.map((x, sort) => ({ ...x, id: uid(), sort, created_at: now }))
      await mutate(
        d => ({ plan, dishes: [...d.dishes, ...dishes], ingredients: [...d.ingredients, ...ingredients] }),
        async () => { await backend.savePlan(plan); await backend.addDishes(dishes); await backend.addIngredients(ingredients) },
      )
    },
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
