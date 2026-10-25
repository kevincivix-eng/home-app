import type { Day } from '../../lib/dates'

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'
export const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'quarterly']
export const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'יומי',
  weekly: 'שבועי',
  monthly: 'חודשי',
  quarterly: 'רבעוני',
}

export interface Profile {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  frequency: Frequency
  category: string
  /** The day the task (re)appears in the open list */
  due_date: Day
  active: boolean
  created_at: string
}

export interface Completion {
  id: string
  task_id: string
  /** due_date of the task at the moment it was completed */
  appeared_on: Day
  deadline: Day
  completed_on: Day
  completed_at: string
  done_by: string
  marked_by: string
  on_time: boolean
  days_late: number
}

/** Logged whenever a task's date is moved manually (postponed / brought forward) */
export interface TaskEvent {
  id: string
  task_id: string
  from_date: Day
  to_date: Day
  by: string
  created_at: string
}

export interface ChoresData {
  profiles: Profile[]
  tasks: Task[]
  completions: Completion[]
  events: TaskEvent[]
}
