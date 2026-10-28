export interface ShoppingList {
  id: string
  name: string
  icon: string
  /** null = shared with the household */
  owner_id: string | null
  sort: number
  created_at: string
}

export interface ShoppingItem {
  id: string
  list_id: string
  name: string
  category: string
  /** on the list right now */
  needed: boolean
  /** picked up during the current shopping trip */
  in_cart: boolean
  quantity: number | null
  note: string | null
  times_bought: number
  last_bought_at: string | null
  created_at: string
}

export interface ShoppingData {
  lists: ShoppingList[]
  items: ShoppingItem[]
}
