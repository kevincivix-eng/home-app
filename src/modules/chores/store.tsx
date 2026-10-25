import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { useHousehold } from '../../lib/household'
import { type Day } from '../../lib/dates'
import { useToday } from '../../lib/useToday'
import { createBackend } from './backend'
import { DEFAULT_TASKS } from './defaults'
import { completeOn, pickStartDate, spreadInitialDates } from './schedule'
import type { ChoresData, Completion, Frequency, Profile, Task } from './types'

const uid = () => crypto.randomUUID()
const EMPTY: ChoresData = { tasks: [], completions: [], events: [] }

interface Store extends ChoresData {
  profiles: Profile[]
  loading: boolean
  error: string | null
  today: Day
  me: Profile | undefined
  profileById(id: string): Profile | undefined
  complete(task: Task, doneBy?: string): Promise<Completion>
  undo(c: Completion): Promise<void>
  moveTask(task: Task, to: Day): Promise<void>
  addTask(t: { title: string; frequency: Frequency; category: string; owner_id: string | null; due_date?: Day }): Promise<void>
  updateTask(id: string, patch: Partial<Task>): Promise<void>
  deleteTask(id: string): Promise<void>
  loadDefaults(): Promise<void>
}

const Ctx = createContext<Store>(null!)
export const useChores = () => useContext(Ctx)

export function ChoresProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const { household, members: profiles } = useHousehold()
  const backend = useMemo(() => createBackend(household!.id), [household?.id])
  const today = useToday()
  const [data, setData] = useState<ChoresData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setData(await backend.fetchAll())
      setError(null)
    } catch (e) {
      console.error(e)
      setError('בעיה בחיבור לשרת')
    } finally {
      setLoading(false)
    }
  }, [backend])

  useEffect(() => {
    if (!userId) return
    setData(EMPTY)
    setLoading(true)
    refresh()
    return backend.subscribe(refresh)
  }, [userId, backend, refresh])

  /** Apply locally right away for a snappy UI, then persist and re-sync */
  const mutate = useCallback(async (local: (d: ChoresData) => ChoresData, remote: () => Promise<void>) => {
    setData(local)
    try { await remote() } catch (e) { console.error(e); setError('השמירה נכשלה') }
    await refresh()
  }, [refresh, backend])

  const me = profiles.find(p => p.id === userId)

  const store = useMemo<Store>(() => ({
    ...data, profiles, loading, error, today, me,
    profileById: id => profiles.find(p => p.id === id),

    async complete(task, doneBy = userId!) {
      const r = completeOn(task, today)
      const c: Completion = {
        id: uid(), task_id: task.id,
        appeared_on: r.appeared_on, deadline: r.deadline, completed_on: r.completed_on,
        completed_at: new Date().toISOString(),
        done_by: doneBy, marked_by: userId!, on_time: r.on_time, days_late: r.days_late,
      }
      // Recurring → schedule the next round; one-time → done for good
      const patch: Partial<Task> = r.next_due ? { due_date: r.next_due } : { active: false }
      await mutate(
        d => ({ ...d, completions: [...d.completions, c], tasks: d.tasks.map(t => (t.id === task.id ? { ...t, ...patch } : t)) }),
        async () => { await backend.addCompletion(c); await backend.updateTask(task.id, patch) },
      )
      return c
    },

    async undo(c) {
      await mutate(
        d => ({ ...d, completions: d.completions.filter(x => x.id !== c.id), tasks: d.tasks.map(t => (t.id === c.task_id ? { ...t, due_date: c.appeared_on, active: true } : t)) }),
        async () => { await backend.deleteCompletion(c.id); await backend.updateTask(c.task_id, { due_date: c.appeared_on, active: true }) },
      )
    },

    async moveTask(task, to) {
      if (to === task.due_date) return
      const e = { id: uid(), task_id: task.id, from_date: task.due_date, to_date: to, by: userId!, created_at: new Date().toISOString() }
      await mutate(
        d => ({ ...d, events: [...d.events, e], tasks: d.tasks.map(t => (t.id === task.id ? { ...t, due_date: to } : t)) }),
        async () => { await backend.updateTask(task.id, { due_date: to }); await backend.addEvent(e) },
      )
    },

    async addTask({ due_date, ...t }) {
      const task: Task = {
        ...t, id: uid(), active: true, created_at: new Date().toISOString(),
        due_date: due_date ?? pickStartDate(t.frequency, data.tasks, today),
      }
      await mutate(d => ({ ...d, tasks: [...d.tasks, task] }), () => backend.addTasks([task]))
    },

    async updateTask(id, patch) {
      await mutate(d => ({ ...d, tasks: d.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)) }), () => backend.updateTask(id, patch))
    },

    async deleteTask(id) {
      await mutate(
        d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id), completions: d.completions.filter(c => c.task_id !== id), events: d.events.filter(e => e.task_id !== id) }),
        () => backend.deleteTask(id),
      )
    },

    async loadDefaults() {
      const now = new Date().toISOString()
      const existing = new Set(data.tasks.map(t => t.title))
      const tasks: Task[] = spreadInitialDates(DEFAULT_TASKS.filter(t => !existing.has(t.title)), today)
        .map(t => ({ ...t, id: uid(), active: true, created_at: now }))
      await mutate(d => ({ ...d, tasks: [...d.tasks, ...tasks] }), () => backend.addTasks(tasks))
    },
  }), [data, profiles, loading, error, today, me, userId, mutate, backend])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
