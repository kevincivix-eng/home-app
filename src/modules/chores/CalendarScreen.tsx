import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { fromDay, longDate, MONTHS, plusDays, toDay, type Day } from '../../lib/dates'
import { ArrowIcon, GripIcon } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { DoneRow, TaskActions, TaskEditor, TaskRow } from './components'
import { isOverdue } from './schedule'
import { useChores } from './store'
import type { Task } from './types'

const DOW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

/** 6 weeks starting on the Sunday on/before the 1st of the month */
function monthGrid(year: number, month: number): Day[] {
  const first = new Date(year, month, 1)
  const start = toDay(new Date(year, month, 1 - first.getDay()))
  return Array.from({ length: 42 }, (_, i) => plusDays(start, i))
}

export function CalendarScreen() {
  const { tasks, completions, today, moveTask } = useChores()
  const toast = useToast()
  const [cursor, setCursor] = useState(() => { const d = fromDay(today); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selectedDay, setSelectedDay] = useState<Day>(today)
  const [showDaily, setShowDaily] = useState(false)
  const [dragging, setDragging] = useState<Task | null>(null)
  const [actionTask, setActionTask] = useState<Task | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const days = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor])
  const visible = tasks.filter(t => t.active && (showDaily || t.frequency !== 'daily'))
  const byDay = useMemo(() => {
    const m = new Map<Day, Task[]>()
    visible.forEach(t => m.set(t.due_date, [...(m.get(t.due_date) ?? []), t]))
    return m
  }, [visible])
  const dayTasks = byDay.get(selectedDay) ?? []
  const dayDone = completions.filter(c => c.completed_on === selectedDay)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )
  const onDragStart = (e: DragStartEvent) => {
    setDragging(tasks.find(t => t.id === e.active.id) ?? null)
    navigator.vibrate?.(10)
  }
  const onDragEnd = (e: DragEndEvent) => {
    const task = tasks.find(t => t.id === e.active.id)
    const to = e.over?.id as Day | undefined
    setDragging(null)
    if (!task || !to || to === task.due_date) return
    if (to < today) { toast({ text: 'אי אפשר להעביר לתאריך שעבר' }); return }
    moveTask(task, to)
    toast({ text: `"${task.title}" הועברה ל-${fromDay(to).getDate()}/${fromDay(to).getMonth() + 1}` })
  }

  const shift = (n: number) => setCursor(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  return (
    <div className="screen">
      <h1 className="large-title">לוח</h1>
      <div className="subtitle">גררו משימה ליום אחר כדי להזיז אותה</div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="cal">
          <div className="cal-head">
            <h2>{MONTHS[cursor.m]} {cursor.y}</h2>
            <div className="cal-nav">
              <button className="icon-btn" aria-label="חודש קודם" onClick={() => shift(-1)}><ArrowIcon dir="prev" /></button>
              <button className="icon-btn" aria-label="חודש הבא" onClick={() => shift(1)}><ArrowIcon dir="next" /></button>
            </div>
          </div>
          <div className="cal-grid">
            {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
            {days.map(d => (
              <DayCell
                key={d} day={d} today={today}
                inMonth={fromDay(d).getMonth() === cursor.m}
                selected={d === selectedDay}
                tasks={byDay.get(d) ?? []}
                onSelect={() => setSelectedDay(d)}
              />
            ))}
          </div>
        </div>

        <div className="section-header big">
          {selectedDay === today ? 'היום' : longDate(selectedDay)}
          <button className="link-btn" style={{ fontSize: 15 }} onClick={() => setShowDaily(!showDaily)}>
            {showDaily ? 'הסתר יומיות' : 'הצג יומיות'}
          </button>
        </div>
        {dayTasks.length === 0 && dayDone.length === 0 && <div className="banner">אין משימות ביום הזה.</div>}
        {dayTasks.length > 0 && (
          <div className="list section">
            {dayTasks.map(t => <DraggableRow key={t.id} task={t} onOpen={() => setActionTask(t)} />)}
          </div>
        )}
        {dayDone.length > 0 && (
          <div className="section">
            <div className="section-header">בוצעו ביום זה</div>
            <div className="list">{dayDone.map(c => <DoneRow key={c.id} c={c} title={tasks.find(t => t.id === c.task_id)?.title ?? ''} />)}</div>
          </div>
        )}

        <DragOverlay dropAnimation={null}>
          {dragging && <div className="drag-overlay"><GripIcon />{dragging.title}</div>}
        </DragOverlay>
      </DndContext>

      <TaskActions task={actionTask} onClose={() => setActionTask(null)} onEdit={setEditing} />
      <TaskEditor task={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function DayCell({ day, today, inMonth, selected, tasks, onSelect }: {
  day: Day; today: Day; inMonth: boolean; selected: boolean; tasks: Task[]; onSelect: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day })
  const shown = tasks.slice(0, 3)
  const cls = ['cal-day', !inMonth && 'other', day === today && 'today', selected && 'selected', isOver && 'drop-over'].filter(Boolean).join(' ')
  return (
    <button ref={setNodeRef} className={cls} onClick={onSelect} aria-label={`${longDate(day)}, ${tasks.length} משימות`}>
      <span className="num">{fromDay(day).getDate()}</span>
      <span className="load">
        {shown.map(t => <i key={t.id} className={isOverdue(t, today) ? 'red' : ''} />)}
        {tasks.length > 3 && <em className="more">+{tasks.length - 3}</em>}
      </span>
    </button>
  )
}

function DraggableRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} className={isDragging ? 'dragging' : ''}>
      <TaskRow
        task={task}
        onOpen={onOpen}
        lead={<span className="drag-handle" {...listeners} {...attributes} aria-label="גרור"><GripIcon /></span>}
      />
    </div>
  )
}
