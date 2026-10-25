import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { relativeDay } from '../../lib/dates'
import { Avatar } from '../../ui/Avatar'
import { ChevIcon, PlusIcon } from '../../ui/icons'
import { DEMO_PROFILES, isDemo } from './backend'
import { TaskEditor } from './components'
import { DEFAULT_TASKS } from './defaults'
import { useChores } from './store'
import { FREQ_LABEL, FREQUENCIES, type Task } from './types'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function SettingsScreen() {
  const { tasks, me, today, loadDefaults } = useChores()
  const { email, signOut, setDemoUser, userId } = useAuth()
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const missingDefaults = DEFAULT_TASKS.filter(d => !tasks.some(t => t.title === d.title)).length

  return (
    <div className="screen">
      <div className="header-row">
        <h1 className="large-title">הגדרות</h1>
        <button className="icon-btn" aria-label="משימה חדשה" onClick={() => setEditing('new')}><PlusIcon /></button>
      </div>

      {isDemo && (
        <div className="banner">
          <b>מצב דמו</b> – הנתונים נשמרים רק בדפדפן הזה ולא מסתנכרנים. אחרי חיבור Supabase שני הטלפונים יראו את אותן משימות.
        </div>
      )}

      <div className="section">
        <div className="section-header">משתמש</div>
        <div className="list">
          {isDemo ? (
            <div className="cell plain">
              <div className="cell-body">אני</div>
              <div className="seg" style={{ margin: 0, width: 160 }}>
                {DEMO_PROFILES.map(p => <button key={p.id} className={p.id === userId ? 'on' : ''} onClick={() => setDemoUser(p.id)}>{p.name}</button>)}
              </div>
            </div>
          ) : (
            <>
              <div className="cell plain">
                <Avatar p={me} lg />
                <div className="cell-body"><div className="cell-title">{me?.name}</div><div className="cell-sub">{email}</div></div>
              </div>
              <button className="cell plain" style={{ color: 'var(--red)' }} onClick={signOut}>התנתקות</button>
            </>
          )}
        </div>
      </div>

      {!isStandalone() && (
        <div className="section">
          <div className="section-header">התקנה באייפון</div>
          <div className="banner" style={{ margin: 0 }}>
            ב-Safari: לחצו על כפתור השיתוף <b>⎙</b> ← <b>הוספה למסך הבית</b>. האפליקציה תיפתח במסך מלא כמו כל אפליקציה.
          </div>
        </div>
      )}

      {FREQUENCIES.map(f => {
        const list = tasks.filter(t => t.frequency === f).sort((a, b) => a.title.localeCompare(b.title, 'he'))
        if (!list.length) return null
        return (
          <div className="section" key={f}>
            <div className="section-header">משימות {FREQ_LABEL[f]}ות · {list.length}</div>
            <div className="list">
              {list.map(t => (
                <button key={t.id} className="cell plain" onClick={() => setEditing(t)} style={{ opacity: t.active ? 1 : 0.45 }}>
                  <div className="cell-body">
                    <div className="cell-title">{t.title}</div>
                    <div className="cell-sub">{t.category}{t.active ? ` · מופיעה ${relativeDay(t.due_date, today)}` : ' · מושהית'}</div>
                  </div>
                  <ChevIcon />
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {missingDefaults > 0 && tasks.length > 0 && (
        <button className="btn secondary" onClick={loadDefaults}>הוסף {missingDefaults} משימות מרשימת ברירת המחדל</button>
      )}

      <TaskEditor task={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
