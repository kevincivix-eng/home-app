import { useRef, useState } from 'react'
import { relativeDay } from '../../lib/dates'
import { ChevIcon, ClearIcon, SearchIcon } from '../../ui/icons'
import { Page } from '../../ui/Page'
import { matches } from '../shopping/categories'
import { dueText, TaskActions, TaskEditor } from './components'
import { isDoneForGood, isOpen, isOverdue } from './schedule'
import { useChores } from './store'
import { FREQ_LABEL, type Task } from './types'

/** Overdue, open, upcoming, then paused/finished – each by date */
const rank = (t: Task, today: string) => (!t.active ? 3 : isOverdue(t, today) ? 0 : isOpen(t, today) ? 1 : 2)

/** Search every task in the household: open, upcoming, done, paused and other members' personal ones */
export function TaskSearch({ onBack }: { onBack: () => void }) {
  const { tasks, completions, today, profileById, me } = useChores()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Task | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim()
  const results = q
    ? tasks.filter(t => matches(t.title, q)).sort((a, b) => rank(a, today) - rank(b, today) || a.due_date.localeCompare(b.due_date))
    : []
  const lastCompletion = new Map(completions.map(c => [c.task_id, c]))

  const status = (t: Task) => {
    const c = lastCompletion.get(t.id)
    const done = c ? `בוצעה ${relativeDay(c.completed_on, today)}${profileById(c.done_by) ? ` ע״י ${profileById(c.done_by)!.name}` : ''}` : null
    if (isDoneForGood(t)) return done ?? 'חד פעמית – הושלמה'
    if (!t.active) return 'מושהית'
    if (t.due_date > today && done) return `${done} · חוזרת ${relativeDay(t.due_date, today)}`
    return dueText(t, today)
  }
  // paused and finished tasks open in the editor (where they can be reactivated)
  const open = (t: Task) => (t.active ? setSelected(t) : setEditing(t))

  return (
    <Page title="חיפוש משימות" onBack={onBack}>
      <form className="search" onSubmit={e => { e.preventDefault(); inputRef.current?.blur() }}>
        <SearchIcon />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="שם של משימה"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
        />
        {query && <button type="button" className="search-clear" aria-label="ניקוי" onClick={() => { setQuery(''); inputRef.current?.focus() }}><ClearIcon /></button>}
      </form>

      {!q && <div className="empty">כל המשימות – גם עתידיות, שבוצעו, מושהות ומשימות של בני הבית.</div>}

      {results.length > 0 && (
        <div className="list">
          {results.map(t => (
            <button key={t.id} className="cell plain" onClick={() => open(t)} style={{ opacity: t.active || isDoneForGood(t) ? 1 : 0.55 }}>
              <div className="cell-body">
                <div className="cell-title">{t.title}</div>
                <div className="cell-sub">
                  {status(t)}
                  <span className="pill">{FREQ_LABEL[t.frequency]}</span>
                  {t.owner_id && <span className="pill personal">{t.owner_id === me?.id ? 'אישית שלי' : profileById(t.owner_id)?.name ?? 'אישית'}</span>}
                </div>
              </div>
              <ChevIcon />
            </button>
          ))}
        </div>
      )}

      {q && !results.length && (
        <div className="empty">
          <p>אין משימה בשם "{q}".</p>
          <button className="btn" onClick={() => setEditing('new')}>הוספת משימה בשם הזה</button>
        </div>
      )}

      <TaskActions task={selected} onClose={() => setSelected(null)} onEdit={setEditing} />
      <TaskEditor task={editing} initialTitle={q} onClose={() => setEditing(null)} />
    </Page>
  )
}
