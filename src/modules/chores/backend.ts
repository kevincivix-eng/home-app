import { supabase } from '../../lib/supabase'
import type { ChoresData, Completion, Profile, Task, TaskEvent } from './types'

/** Storage-agnostic API. IDs are generated client-side so both backends behave the same. */
export interface Backend {
  fetchAll(): Promise<ChoresData>
  subscribe(onChange: () => void): () => void
  addTasks(tasks: Task[]): Promise<void>
  updateTask(id: string, patch: Partial<Task>): Promise<void>
  deleteTask(id: string): Promise<void>
  addCompletion(c: Completion): Promise<void>
  deleteCompletion(id: string): Promise<void>
  addEvent(e: TaskEvent): Promise<void>
}

const check = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error
  return data
}

function supabaseBackend(household_id: string): Backend {
  const sb = supabase!
  const h = { household_id }
  return {
    async fetchAll() {
      const [tasks, completions, events] = await Promise.all([
        sb.from('tasks').select('*').eq('household_id', household_id).order('created_at').then(check),
        sb.from('completions').select('*').eq('household_id', household_id).order('completed_at').then(check),
        sb.from('task_events').select('*').eq('household_id', household_id).order('created_at').then(check),
      ])
      return { tasks, completions, events } as ChoresData
    },
    subscribe(onChange) {
      const ch = sb.channel(`chores-${household_id}`)
      for (const table of ['tasks', 'completions', 'task_events'])
        ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `household_id=eq.${household_id}` }, onChange)
      ch.subscribe()
      // iOS suspends PWAs in the background – refresh when coming back
      const onVisible = () => document.visibilityState === 'visible' && onChange()
      document.addEventListener('visibilitychange', onVisible)
      return () => { sb.removeChannel(ch); document.removeEventListener('visibilitychange', onVisible) }
    },
    addTasks: async tasks => { check(await sb.from('tasks').insert(tasks.map(t => ({ ...t, ...h })))) },
    updateTask: async (id, patch) => { check(await sb.from('tasks').update(patch).eq('id', id)) },
    deleteTask: async id => { check(await sb.from('tasks').delete().eq('id', id)) },
    addCompletion: async c => { check(await sb.from('completions').insert({ ...c, ...h })) },
    deleteCompletion: async id => { check(await sb.from('completions').delete().eq('id', id)) },
    addEvent: async e => { check(await sb.from('task_events').insert({ ...e, ...h })) },
  }
}

/** Demo mode: everything lives in this browser's localStorage */
export const DEMO_PROFILES: Profile[] = [
  { id: 'demo-kevin', name: 'קוין', color: '#007aff' },
  { id: 'demo-maayan', name: 'מעין', color: '#ff2d92' },
]

function localBackend(): Backend {
  const KEY = 'home-app:chores'
  const listeners = new Set<() => void>()
  const read = (): ChoresData => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { tasks: [], completions: [], events: [] }
  }
  const write = (fn: (d: ChoresData) => void) => {
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
    addTasks: async tasks => write(d => { d.tasks.push(...tasks) }),
    updateTask: async (id, patch) => write(d => { d.tasks = d.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)) }),
    deleteTask: async id => write(d => {
      d.tasks = d.tasks.filter(t => t.id !== id)
      d.completions = d.completions.filter(c => c.task_id !== id)
      d.events = d.events.filter(e => e.task_id !== id)
    }),
    addCompletion: async c => write(d => { d.completions.push(c) }),
    deleteCompletion: async id => write(d => { d.completions = d.completions.filter(c => c.id !== id) }),
    addEvent: async e => write(d => { d.events.push(e) }),
  }
}

export const isDemo = !supabase
export const createBackend = (householdId: string): Backend => (supabase ? supabaseBackend(householdId) : localBackend())
