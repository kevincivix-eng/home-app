import { useState } from 'react'
import { longDate, plusDays, relativeDay } from '../../lib/dates'
import { PlusIcon } from '../../ui/icons'
import { DoneRow, TaskActions, TaskEditor, TaskRow } from './components'
import { daysLate, isOpen, isOverdue } from './schedule'
import { useChores } from './store'
import { FREQ_LABEL, FREQUENCIES, type Task } from './types'

export function TodayScreen() {
  const { tasks, completions, today, loading, loadDefaults } = useChores()
  const [selected, setSelected] = useState<Task | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [showAllDone, setShowAllDone] = useState(false)

  const active = tasks.filter(t => t.active)
  const open = active.filter(t => isOpen(t, today))
  const overdue = open.filter(t => isOverdue(t, today)).sort((a, b) => daysLate(b, today) - daysLate(a, today))
  const onTrack = open.filter(t => !isOverdue(t, today))
  const upcoming = active
    .filter(t => t.due_date > today && t.due_date <= plusDays(today, 7))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
  const doneToday = completions.filter(c => c.completed_on === today).reverse()
  const titleOf = (id: string) => tasks.find(t => t.id === id)?.title ?? 'משימה שנמחקה'

  return (
    <div className="screen">
      <div className="header-row">
        <div>
          <h1 className="large-title">היום</h1>
          <div className="subtitle">{longDate(today)}{open.length > 0 && ` · ${open.length} פתוחות`}</div>
        </div>
        <button className="icon-btn" aria-label="משימה חדשה" onClick={() => setEditing('new')}><PlusIcon /></button>
      </div>

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
            <div className="list">{list.map(t => <TaskRow key={t.id} task={t} onOpen={() => setSelected(t)} />)}</div>
          </div>
        )
      })}

      {tasks.length > 0 && open.length === 0 && (
        <div className="empty"><div className="big">✨</div>הכל בוצע! אין משימות פתוחות.</div>
      )}

      {doneToday.length > 0 && (
        <div className="section">
          <div className="section-header big">בוצע היום <span className="count">{doneToday.length}</span></div>
          <div className="list">
            {(showAllDone ? doneToday : doneToday.slice(0, 5)).map(c => <DoneRow key={c.id} c={c} title={titleOf(c.task_id)} />)}
            {doneToday.length > 5 && (
              <button className="cell plain" onClick={() => setShowAllDone(!showAllDone)} style={{ color: 'var(--tint-strong)' }}>
                {showAllDone ? 'הצג פחות' : `הצג את כל ה-${doneToday.length}`}
              </button>
            )}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="section">
          <div className="section-header big">בשבוע הקרוב <span className="count">{upcoming.length}</span></div>
          <div className="list">
            {upcoming.map(t => (
              <button key={t.id} className="cell plain" onClick={() => setSelected(t)}>
                <div className="cell-body">
                  <div className="cell-title">{t.title}</div>
                  <div className="cell-sub"><span className="pill">{FREQ_LABEL[t.frequency]}</span></div>
                </div>
                <span className="cell-value">{relativeDay(t.due_date, today)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <TaskActions task={selected} onClose={() => setSelected(null)} onEdit={setEditing} />
      <TaskEditor task={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
