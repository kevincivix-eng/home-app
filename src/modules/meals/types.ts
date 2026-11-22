import type { Day } from '../../lib/dates'

/** weekend = cooked Fri/Sat, eaten until Tuesday; midweek = cooked Tue/Wed, eaten until Thursday */
export type Slot = 'weekend' | 'midweek'
export const SLOTS: Slot[] = ['weekend', 'midweek']
export const SLOT_LABEL: Record<Slot, string> = { weekend: 'עוגני סופ״ש', midweek: 'השלמת אמצע שבוע' }
export const SLOT_WHEN: Record<Slot, string> = {
  weekend: 'מבשלים בשישי–שבת, מחזיק עד שלישי',
  midweek: 'מבשלים בשלישי–רביעי בערב, לרביעי–חמישי',
}

export const WEEKS = [1, 2, 3, 4] as const
/** Ingredients with week 0 are the pantry basics, checked once a month */
export const PANTRY_WEEK = 0

export interface MealPlan {
  /** A Friday on which week 1 of the cycle began */
  cycle_start: Day
  week_titles: string[]
}

export interface RecipeIngredient {
  name: string
  amount: string | null
}

export interface Dish {
  id: string
  /** null = in the dish bank, not on the menu */
  week: number | null
  slot: Slot
  title: string
  note: string | null
  cook_time: string | null
  servings: string | null
  ingredients: RecipeIngredient[]
  steps: string[]
  sort: number
  created_at: string
}

export interface Ingredient {
  id: string
  week: number
  section: string
  name: string
  amount: string | null
  sort: number
  created_at: string
}

export interface MealsData {
  /** null until the household saves its plan */
  plan: MealPlan | null
  dishes: Dish[]
  ingredients: Ingredient[]
}
