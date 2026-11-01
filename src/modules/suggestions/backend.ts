import { supabase } from '../../lib/supabase'

export type SuggestionStatus = 'open' | 'planned' | 'done' | 'declined'

export const STATUS_LABEL: Record<SuggestionStatus, string> = {
  open: 'ממתינה',
  planned: 'בפיתוח',
  done: 'טופלה',
  declined: 'לא ניישם',
}

export interface Suggestion {
  id: string
  body: string
  created_by: string | null
  status: SuggestionStatus
  /** The answer shown in the app */
  reply: string | null
  /** Set once raised with the developer; cleared when the text changes or it is reopened */
  reviewed_at: string | null
  resolved_at: string | null
  created_at: string
}

export interface SuggestionsBackend {
  fetchAll(): Promise<Suggestion[]>
  subscribe(onChange: () => void): () => void
  add(s: Suggestion): Promise<void>
  update(id: string, patch: Partial<Suggestion>): Promise<void>
  remove(id: string): Promise<void>
}

const check = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error
  return data
}

function supabaseBackend(household_id: string): SuggestionsBackend {
  const sb = supabase!
  return {
    fetchAll: async () => check(await sb.from('suggestions').select('*').eq('household_id', household_id).order('created_at', { ascending: false })) as Suggestion[],
    subscribe(onChange) {
      const ch = sb.channel(`suggestions-${household_id}`)
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions', filter: `household_id=eq.${household_id}` }, onChange)
      ch.subscribe()
      return () => { sb.removeChannel(ch) }
    },
    add: async s => { check(await sb.from('suggestions').insert({ ...s, household_id })) },
    update: async (id, patch) => { check(await sb.from('suggestions').update(patch).eq('id', id)) },
    remove: async id => { check(await sb.from('suggestions').delete().eq('id', id)) },
  }
}

function localBackend(): SuggestionsBackend {
  const KEY = 'home-app:suggestions'
  const listeners = new Set<() => void>()
  const read = (): Suggestion[] => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  }
  const write = (list: Suggestion[]) => {
    localStorage.setItem(KEY, JSON.stringify(list))
    listeners.forEach(l => l())
  }
  return {
    fetchAll: async () => read(),
    subscribe(onChange) {
      listeners.add(onChange)
      return () => { listeners.delete(onChange) }
    },
    add: async s => write([s, ...read()]),
    update: async (id, patch) => write(read().map(s => (s.id === id ? { ...s, ...patch } : s))),
    remove: async id => write(read().filter(s => s.id !== id)),
  }
}

export const createSuggestionsBackend = (householdId: string) => (supabase ? supabaseBackend(householdId) : localBackend())
