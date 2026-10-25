import { useState } from 'react'
import { longDate, plusDays } from '../../lib/dates'
import { Avatar } from '../../ui/Avatar'
import { ChevIcon, PlusIcon } from '../../ui/icons'
import { GlassButton, Page } from '../../ui/Page'
import { DoneRow, TaskActions, TaskEditor, TaskRow } from './components'
import { daysLate, isOpen, isOverdue } from './schedule'
import { useChores } from './store'
import { FREQ_LABEL, FREQUENCIES, type Profile, type Task } from './types'

export function TodayScreen() {
  const { tasks, completions, today, loading, loadDefaults, me, profiles } = useChores()
  const [selected, setSelected] = useState<Task | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [showAllDone, setShowAllDone] = useState(false)
  const [showAllFuture, setShowAllFuture] = useState(false)

  // Main view: shared tasks + my personal ones. Others' personal tasks live in a collapsed section.
  const mine = (t: Task) => !t.owner_id || t.owner_id === me?.id
  const active = tasks.filter(t => t.active && mine(t))
  const open = active.filter(t => isOpen(t, today))
  const overdue = open.filter(t => isOverdue(t, today)).sort((a, b) => daysLate(b, today) - daysLate(a, today))
  const onTrack = open.filter(t => !isOverdue(t, today))
  // Not due yet: either done and waiting for the next round, or scheduled but not done yet
  const lastCompletion = new Map(completions.map(c => [c.task_id, c]))
  const waiting = active.filter(t => t.due_date > today)
  const done = waiting
    .filter(t => lastCompletion.has(t.id))
    .map(t => ({ task: t, c: lastCompletion.get(t.id)! }))
  // one-time tasks completed this past week stay visible (and undoable)
  const weekAgo = plusDays(today, -7)
  const doneOnce = tasks
    .filter(t => t.frequency === 'once' && !t.active && mine(t) && (lastCompletion.get(t.id)?.completed_on ?? '') >= weekAgo)
    .map(t => ({ task: t, c: lastCompletion.get(t.id)! }))
  done.push(...doneOnce)
  done.sort((a, b) => b.c.completed_at.localeCompare(a.c.completed_at))
  const others = profiles.filter(p => p.id !== me?.id)
    .map(p => ({ p, list: tasks.filter(t => t.active && t.owner_id === p.id).sort((a, b) => a.due_date.localeCompare(b.due_date)) }))
    .filter(x => x.list.length > 0)
  const future = waiting.filter(t => !lastCompletion.has(t.id)).sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <Page
      title="היום"
      subtitle={<>{longDate(today)}{open.length > 0 && ` · ${open.length} פתוחות`}</>}
      actions={<GlassButton label="משימה חדשה" onClick={() => setEditing('new')}><PlusIcon /></GlassButton>}
    >

      {!loading && tasks.length === 0 && (
        <div className="empty">
          <div className="big">🏠</div>
          <p>עוד אין משימות.</p>
          <button className="btn" onClick={loadDefaults}>טען את רשימת המשימות שלנו</button>
          <p style={{ fontSize: 13 }}>המשימות יפוזרו על פני התקופה כדי שלא יופיעו כולן באותו יום.</p>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="section">
          <div className="section-header big" style={{ color: 'var(--red)' }}>באיחור <span className="count">{overdue.length}</span></div>
          <div className="list">{overdue.map(t => <TaskRow key={t.id} task={t} onOpen={() => setSelected(t)} />)}</div>
        </div>
      )}

      {FREQUENCIES.map(f => {
        const list = onTrack.filter(t => t.frequency === f)
        if (!list.length) return null
        return (
          <div className="section" key={f}>
            <div className="section-header big">{FREQ_LABEL[f]} <span className="count">{list.length}</span></div>
            <div className="list">{list.map(t => <TaskRow key={t.id} task={t} showFreq={false} onOpen={() => setSelected(t)} />)}</div>
          </div>
        )
      })}

      {tasks.length > 0 && open.length === 0 && (
        <div className="empty"><div className="big">✨</div>הכל בוצע! אין משימות פתוחות.</div>
      )}

      {done.length > 0 && (
        <div className="section">
          <div className="section-header big">בוצע <span className="count">{done.length}</span></div>
          <div className="list">
            {(showAllDone ? done : done.slice(0, 7)).map(({ task, c }) => (
              <DoneRow key={task.id} c={c} title={task.title} task={task} onOpen={() => setSelected(task)} />
            ))}
            {done.length > 7 && (
              <button className="cell plain" onClick={() => setShowAllDone(!showAllDone)} style={{ color: 'var(--tint-strong)' }}>
                {showAllDone ? 'הצג פחות' : `הצג את כל ה-${done.length}`}
              </button>
            )}
          </div>
        </div>
      )}

      {future.length > 0 && (
        <div className="section">
          <div className="section-header big">משימות עתידיות <span className="count">{future.length}</span></div>
          <div className="list">
            {(showAllFuture ? future : future.slice(0, 7)).map(t => <TaskRow key={t.id} task={t} early onOpen={() => setSelected(t)} />)}
            {future.length > 7 && (
              <button className="cell plain" onClick={() => setShowAllFuture(!showAllFuture)} style={{ color: 'var(--tint-strong)' }}>
                {showAllFuture ? 'הצג פחות' : `הצג את כל ה-${future.length}`}
              </button>
            )}
          </div>
          <div className="section-footer">אפשר לסמן כבוצע לפני הזמן – הפעם הבאה תיספר מיום הביצוע.</div>
        </div>
      )}

      {others.length > 0 && <OthersSection others={others} onOpen={setSelected} />}

      <TaskActions task={selected} onClose={() => setSelected(null)} onEdit={setEditing} />
      <TaskEditor task={editing} onClose={() => setEditing(null)} />
    </Page>
  )
}

const OTHERS_KEY = 'home-app:others-open'

/** Other members' personal tasks – collapsed by default, remembered per device */
function OthersSection({ others, onOpen }: { others: { p: Profile; list: Task[] }[]; onOpen: (t: Task) => void }) {
  const { today } = useChores()
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OTHERS_KEY) === '1' } catch { return false } })
  const toggle = () => { setOpen(!open); try { localStorage.setItem(OTHERS_KEY, open ? '0' : '1') } catch { /* ignore */ } }
  const openCount = others.reduce((n, o) => n + o.list.filter(t => t.due_date <= today).length, 0)
  return (
    <div className="section">
      <button className={`disclosure${open ? ' open' : ''}`} onClick={toggle} aria-expanded={open}>
        <span className="disclosure-title">משימות של בני הבית</span>
        <span className="count">{openCount > 0 ? `${openCount} פתוחות` : ''}</span>
        <span style={{ marginInlineStart: 'auto', display: 'grid' }}><ChevIcon /></span>
      </button>
      {open && others.map(({ p, list }) => (
        <div key={p.id}>
          <div className="member-head"><Avatar p={p} /> {p.name}</div>
          <div className="list">{list.map(t => <TaskRow key={t.id} task={t} early onOpen={() => onOpen(t)} />)}</div>
        </div>
      ))}
    </div>
  )
}
