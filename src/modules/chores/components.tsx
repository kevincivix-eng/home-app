import { useState, type ReactNode } from 'react'
import { daysText, plusDays, relativeDay, shortDate, untilDay, type Day } from '../../lib/dates'
import { Avatar } from '../../ui/Avatar'
import { CheckIcon } from '../../ui/icons'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { CATEGORIES } from './defaults'
import { addPeriod, daysLate, deadlineOf, isOverdue } from './schedule'
import { useChores } from './store'
import { FREQ_LABEL, FREQUENCIES, type Completion, type Frequency, type Task } from './types'

/** Short status line: "באיחור 3 ימים" / "עד יום שישי" / "מופיעה מחר" */
export function dueText(t: Task, today: Day): ReactNode {
  if (t.due_date > today) return `מופיעה ${relativeDay(t.due_date, today)}`
  if (isOverdue(t, today)) return <span className="late">באיחור {daysText(daysLate(t, today))}</span>
  const lastDay = plusDays(deadlineOf(t), -1)
  return `עד ${untilDay(lastDay, today)}`
}

/** Complete a task and offer undo */
export function useCompleteTask() {
  const { complete, undo, profileById, today } = useChores()
  const toast = useToast()
  return async (t: Task, doneBy?: string) => {
    const c = await complete(t, doneBy)
    const who = profileById(c.done_by)?.name
    const next = t.frequency === 'once' ? '' : ` · חוזרת ${relativeDay(addPeriod(today, t.frequency), today)}`
    toast({ text: `✓ ${t.title}${who ? ` · ${who}` : ''}${next}`, action: { label: 'ביטול', run: () => undo(c) } })
  }
}

/** `early`: also show the checkbox on a future task, to complete it ahead of time */
export function TaskRow({ task, onOpen, extra, lead, early, showFreq = true }: { task: Task; onOpen: () => void; extra?: ReactNode; lead?: ReactNode; early?: boolean; showFreq?: boolean }) {
  const { today } = useChores()
  const completeTask = useCompleteTask()
  const [checking, setChecking] = useState(false)
  const open = task.due_date <= today
  const overdue = isOverdue(task, today)
  return (
    <div className={`cell${overdue ? ' overdue' : ''}`}>
      {lead}
      {(open || early) && (
        <button
          className={`check${checking ? ' on' : ''}`}
          aria-label={`סמן "${task.title}" כבוצע${open ? '' : ' (מוקדם)'}`}
          onClick={() => { setChecking(true); setTimeout(() => completeTask(task), 180) }}
        >
          {checking && <CheckIcon />}
        </button>
      )}
      <button className="cell-body" onClick={onOpen} style={{ textAlign: 'start' }}>
        <div className="cell-title">{task.title}</div>
        <div className="cell-sub">
          {dueText(task, today)}
          {showFreq && <span className="pill">{FREQ_LABEL[task.frequency]}</span>}
          {task.owner_id && <OwnerPill id={task.owner_id} />}
          {task.category !== 'כללי' && <span className="pill">{task.category}</span>}
        </div>
      </button>
      {extra}
    </div>
  )
}

/** A completion. With `task`, also shows when it comes back and opens the task's actions on tap */
/** "אישי" for my own personal task, the owner's name for someone else's */
function OwnerPill({ id }: { id: string }) {
  const { me, profileById } = useChores()
  const p = profileById(id)
  return id === me?.id
    ? <span className="pill personal">אישי</span>
    : <span className="pill personal" style={p ? { background: `color-mix(in srgb, ${p.color} 16%, transparent)`, color: p.color } : undefined}>{p?.name ?? 'אישי'}</span>
}

export function DoneRow({ c, title, task, onOpen }: { c: Completion; title: string; task?: Task; onOpen?: () => void }) {
  const { undo, profileById, completions, today } = useChores()
  const latest = completions.filter(x => x.task_id === c.task_id).at(-1)?.id === c.id
  const doneBy = profileById(c.done_by)
  const markedBy = profileById(c.marked_by)
  return (
    <div className="cell done">
      <button className="check on" disabled={!latest} aria-label="בטל סימון" onClick={() => latest && undo(c)}>
        <CheckIcon />
      </button>
      <button className="cell-body" onClick={onOpen} disabled={!onOpen} style={{ textAlign: 'start', color: 'inherit' }}>
        <div className="cell-title">{title}</div>
        <div className="cell-sub">
          {doneBy?.name}{c.marked_by !== c.done_by && markedBy ? ` (סומן ע״י ${markedBy.name})` : ''}
          {task && ` · ${relativeDay(c.completed_on, today)}`}
          {!c.on_time && <span className="pill" style={{ color: 'var(--red)' }}>באיחור {daysText(c.days_late)}</span>}
        </div>
        {task && <div className="cell-sub">{task.frequency === 'once' ? 'חד פעמית – הושלמה' : `חוזרת ${relativeDay(task.due_date, today)}`}</div>}
      </button>
      <Avatar p={doneBy} />
    </div>
  )
}

/** Action sheet for a task: who did it, postpone, pick date, edit */
export function TaskActions({ task, onClose, onEdit }: { task: Task | null; onClose: () => void; onEdit: (t: Task) => void }) {
  const { profiles, today, moveTask } = useChores()
  const completeTask = useCompleteTask()
  const toast = useToast()
  if (!task) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const open = task.due_date <= today
  const move = (d: Day) => {
    moveTask(task, d)
    toast({ text: `"${task.title}" הועברה ל${relativeDay(d, today)}` })
    onClose()
  }
  return (
    <Sheet open onClose={onClose}>
      <div className="sheet-title">{task.title}</div>
      <div className="sheet-sub">{FREQ_LABEL[task.frequency]} · {task.category} · {open ? dueText(task, today) : `מופיעה ב-${shortDate(task.due_date)}`}</div>
      <div className="action-group">
        {profiles.map(p => (
          <button key={p.id} className="action primary" onClick={() => { completeTask(task, p.id); onClose() }}>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Avatar p={p} /> {open || task.frequency === 'once' ? 'בוצע' : 'בוצע מוקדם'} ע״י {p.name}</span>
          </button>
        ))}
      </div>
      {!open && task.frequency !== 'once' && <div className="section-footer" style={{ margin: '-2px 16px 10px' }}>סימון מוקדם מאפס את הספירה – הפעם הבאה תיקבע מהיום.</div>}
      <div className="action-group">
        {!open && <button className="action" onClick={() => move(today)}>הקדם להיום</button>}
        <button className="action" onClick={() => move(plusDays(task.due_date > today ? task.due_date : today, 1))}>
          {task.due_date > today ? 'דחה ביום' : 'דחה למחר'}
        </button>
        <label className="action" style={{ display: 'block', position: 'relative' }}>
          בחר תאריך…
          <input
            type="date"
            min={today}
            defaultValue={task.due_date}
            onChange={e => e.target.value && move(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0 }}
          />
        </label>
        <button className="action" onClick={() => { onClose(); onEdit(task) }}>עריכת משימה</button>
      </div>
      <div className="action-group">
        <button className="action primary" onClick={onClose}>סגור</button>
      </div>
    </Sheet>
  )
}

/** Add (task === 'new') or edit a task */
export function TaskEditor({ task, onClose }: { task: Task | 'new' | null; onClose: () => void }) {
  return (
    <Sheet open={!!task} onClose={onClose}>
      {task && <EditorBody key={task === 'new' ? 'new' : task.id} task={task} onClose={onClose} />}
    </Sheet>
  )
}

function EditorBody({ task, onClose }: { task: Task | 'new'; onClose: () => void }) {
  const { addTask, updateTask, deleteTask, today, me, profileById } = useChores()
  const isNew = task === 'new'
  const [owner, setOwner] = useState<string | null>(isNew ? null : task.owner_id ?? null)
  const otherOwner = !isNew && task.owner_id && task.owner_id !== me?.id ? profileById(task.owner_id) : undefined
  const [title, setTitle] = useState(isNew ? '' : task.title)
  const [frequency, setFrequency] = useState<Frequency>(isNew ? 'weekly' : task.frequency)
  const [category, setCategory] = useState(isNew ? 'כללי' : task.category)
  const [date, setDate] = useState(isNew ? '' : task.due_date)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async () => {
    const t = { title: title.trim(), frequency, category, owner_id: owner }
    if (isNew) await addTask({ ...t, due_date: date || undefined })
    else await updateTask(task.id, { ...t, due_date: date || task.due_date })
    onClose()
  }

  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">{isNew ? 'משימה חדשה' : 'עריכת משימה'}</div>
        <button className="link-btn bold" disabled={!title.trim()} onClick={save}>{isNew ? 'הוסף' : 'שמור'}</button>
      </div>

      <div className="list section">
        <div className="field">
          <input autoFocus={isNew} placeholder="שם המשימה" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="section">
        <div className="section-header">של מי</div>
        <div className="seg">
          <button className={owner === null ? 'on' : ''} onClick={() => setOwner(null)}>משותפת לבית</button>
          {otherOwner && <button className={owner === otherOwner.id ? 'on' : ''} onClick={() => setOwner(otherOwner.id)}>אישית של {otherOwner.name}</button>}
          {me && <button className={owner === me.id ? 'on' : ''} onClick={() => setOwner(me.id)}>אישית שלי</button>}
        </div>
        {owner && <div className="section-footer">משימה אישית מופיעה רק לך במסך הראשי. בני הבית יכולים לראות אותה בקטע סגור בתחתית.</div>}
      </div>

      <div className="section">
        <div className="section-header">תדירות</div>
        <div className="seg seg-tight">
          {FREQUENCIES.map(f => (
            <button key={f} className={f === frequency ? 'on' : ''} onClick={() => setFrequency(f)}>{FREQ_LABEL[f]}</button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">קטגוריה</div>
        <div className="list chips">
          {CATEGORIES.map(c => (
            <button key={c} className={`chip${c === category ? ' on' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="list">
          <div className="field">
            <label>{frequency === 'once' ? 'בתאריך' : isNew ? 'מתחילה ב' : 'מופיעה ב'}</label>
            <input type="date" value={date} min={isNew ? today : undefined} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        {isNew && !date && (
          <div className="section-footer">{frequency === 'once' ? 'בלי תאריך – המשימה תופיע כבר היום.' : 'אם לא נבחר תאריך – המשימה תשובץ אוטומטית ליום הכי פנוי.'}</div>
        )}
      </div>

      {!isNew && (
        <div className="action-group">
          <button className="action" onClick={() => { updateTask(task.id, { active: !task.active }); onClose() }}>
            {task.active ? 'השהה משימה (לא תופיע)' : 'הפעל מחדש'}
          </button>
          {confirmDelete
            ? <button className="action destructive primary" onClick={() => { deleteTask(task.id); onClose() }}>למחוק לצמיתות כולל היסטוריה?</button>
            : <button className="action destructive" onClick={() => setConfirmDelete(true)}>מחק משימה</button>}
        </div>
      )}
    </>
  )
}
