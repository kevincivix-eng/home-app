import { useMemo, useState } from 'react'
import { daysText, shortDate } from '../../lib/dates'
import { Avatar } from '../../ui/Avatar'
import { ChevIcon } from '../../ui/icons'
import { Sheet } from '../../ui/Sheet'
import { computeStats, pct, rangeStart, rateClass, sum, type TaskStats } from './stats'
import { useChores } from './store'
import { FREQ_LABEL, FREQUENCIES, type Profile } from './types'

const RANGES: { label: string; days: number | null }[] = [
  { label: '30 יום', days: 30 },
  { label: '90 יום', days: 90 },
  { label: 'שנה', days: 365 },
  { label: 'הכל', days: null },
]

export function StatsScreen() {
  const store = useChores()
  const { today, profiles } = store
  const [range, setRange] = useState(1)
  const [detail, setDetail] = useState<TaskStats | null>(null)
  const from = rangeStart(RANGES[range].days, today)
  const s = useMemo(() => computeStats(store, from, today), [store, from, today])

  return (
    <div className="screen">
      <h1 className="large-title">סטטיסטיקה</h1>
      <div className="seg" style={{ marginBottom: 16 }}>
        {RANGES.map((r, i) => <button key={r.label} className={i === range ? 'on' : ''} onClick={() => setRange(i)}>{r.label}</button>)}
      </div>

      <div className="kpis">
        <div className="kpi"><div className="v">{s.total}</div><div className="l">משימות בוצעו</div></div>
        <div className="kpi"><div className={`v rate ${rateClass(s.rate)}`} style={{ textAlign: 'start', fontSize: 26 }}>{pct(s.rate)}</div><div className="l">בוצעו בזמן</div></div>
        <div className="kpi"><div className="v" style={{ color: s.overdueNow ? 'var(--red)' : undefined }}>{s.overdueNow}</div><div className="l">באיחור כרגע</div></div>
      </div>

      <div className="section-header big">מי עושה יותר</div>
      <div className="share">
        <ShareBar counts={s.byPerson} profiles={profiles} />
        <div className="legend">
          {profiles.map(p => (
            <span key={p.id}><i style={{ background: p.color }} />{p.name} · {s.byPerson[p.id] ?? 0} ({pct(s.total ? (s.byPerson[p.id] ?? 0) / s.total : null)})</span>
          ))}
        </div>
      </div>

      {s.byCategory.length > 0 && (
        <div className="section">
          <div className="section-header">לפי קטגוריה</div>
          <div className="list">
            {s.byCategory.map(([cat, counts]) => (
              <div key={cat} className="cell plain">
                <div className="cell-body">
                  <div className="cell-title">{cat}</div>
                  <div className="cell-sub">{profiles.map(p => `${p.name} ${counts[p.id] ?? 0}`).join(' · ')}</div>
                </div>
                <div style={{ width: 110 }}><ShareBar counts={counts} profiles={profiles} thin /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header big">מה אנחנו דוחים</div>
        {s.trouble.length === 0
          ? <div className="banner">אין עדיין משימות שנדחו או בוצעו באיחור 👏</div>
          : <div className="list">{s.trouble.map(t => <StatRow key={t.task.id} s={t} onOpen={() => setDetail(t)} />)}</div>}
        <div className="section-footer">דירוג לפי ביצועים באיחור, דחיות ידניות ואיחור נוכחי.</div>
      </div>

      <div className="section">
        <div className="section-header big">במה אנחנו טובים</div>
        {s.best.length === 0
          ? <div className="banner">צריך לפחות שני ביצועים של משימה כדי לדרג אותה.</div>
          : <div className="list">{s.best.map(t => <StatRow key={t.task.id} s={t} onOpen={() => setDetail(t)} />)}</div>}
      </div>

      {FREQUENCIES.map(f => {
        const rows = s.perTask.filter(t => t.task.frequency === f)
        if (!rows.length) return null
        return (
          <div className="section" key={f}>
            <div className="section-header">כל המשימות · {FREQ_LABEL[f]}</div>
            <div className="list">{rows.map(t => <StatRow key={t.task.id} s={t} onOpen={() => setDetail(t)} />)}</div>
          </div>
        )
      })}

      <TaskHistory s={detail} onClose={() => setDetail(null)} from={from} />
    </div>
  )
}

function ShareBar({ counts, profiles, thin }: { counts: Record<string, number>; profiles: Profile[]; thin?: boolean }) {
  const total = sum(counts)
  return (
    <div className="share-bar" style={thin ? { height: 8, margin: 0 } : undefined} title={profiles.map(p => `${p.name}: ${counts[p.id] ?? 0}`).join(', ')}>
      {total === 0
        ? <div style={{ flex: 1, background: 'var(--fill)' }} />
        : profiles.map(p => (counts[p.id] ? <div key={p.id} style={{ flex: counts[p.id], background: p.color }} /> : null))}
    </div>
  )
}

function StatRow({ s, onOpen }: { s: TaskStats; onOpen: () => void }) {
  const { profiles } = useChores()
  const parts = [
    s.count ? `${s.count} ביצועים` : 'לא בוצעה',
    s.late ? `איחור ממוצע ${daysText(Math.round(s.avgLate))}` : null,
    s.postponed ? `נדחתה ${s.postponed}×` : null,
    s.overdueNow ? `באיחור כרגע` : null,
  ].filter(Boolean)
  return (
    <button className="cell plain" onClick={onOpen}>
      <div className="cell-body">
        <div className="cell-title">{s.task.title}</div>
        <div className="cell-sub">{parts.join(' · ')}</div>
      </div>
      <div style={{ width: 56 }}><ShareBar counts={s.byPerson} profiles={profiles} thin /></div>
      <span className={`rate ${rateClass(s.rate)}`} aria-label="אחוז בזמן">{pct(s.rate)}</span>
      <ChevIcon />
    </button>
  )
}

function TaskHistory({ s, onClose, from }: { s: TaskStats | null; onClose: () => void; from: string | null }) {
  const { completions, events, profileById, profiles } = useChores()
  if (!s) return null
  const cs = completions.filter(c => c.task_id === s.task.id && (!from || c.completed_on >= from)).reverse()
  const evs = events.filter(e => e.task_id === s.task.id && (!from || e.created_at.slice(0, 10) >= from)).reverse()
  return (
    <Sheet open onClose={onClose}>
      <div className="sheet-title">{s.task.title}</div>
      <div className="sheet-sub">{FREQ_LABEL[s.task.frequency]} · {pct(s.rate)} בזמן · {s.count} ביצועים</div>

      <div className="share" style={{ marginBottom: 16 }}>
        <ShareBar counts={s.byPerson} profiles={profiles} />
        <div className="legend">{profiles.map(p => <span key={p.id}><i style={{ background: p.color }} />{p.name} · {s.byPerson[p.id] ?? 0}</span>)}</div>
      </div>

      <div className="section">
        <div className="section-header">היסטוריית ביצוע</div>
        {cs.length === 0 ? <div className="banner">אין ביצועים בטווח הזה.</div> : (
          <div className="list">
            {cs.map(c => (
              <div key={c.id} className="cell plain">
                <Avatar p={profileById(c.done_by)} />
                <div className="cell-body">
                  <div className="cell-title">{shortDate(c.completed_on)} · {profileById(c.done_by)?.name}</div>
                  <div className="cell-sub">הופיעה {shortDate(c.appeared_on)}{c.marked_by !== c.done_by ? ` · סומן ע״י ${profileById(c.marked_by)?.name}` : ''}</div>
                </div>
                <span className={`rate ${c.on_time ? 'good' : 'bad'}`} style={{ fontSize: 13 }}>{c.on_time ? 'בזמן ✓' : `איחור ${daysText(c.days_late)}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {evs.length > 0 && (
        <div className="section">
          <div className="section-header">הזזות תאריך</div>
          <div className="list">
            {evs.map(e => (
              <div key={e.id} className="cell plain">
                <Avatar p={profileById(e.by)} />
                <div className="cell-body"><div className="cell-title">{shortDate(e.from_date)} ← {shortDate(e.to_date)}</div></div>
                <span className="cell-value">{e.to_date > e.from_date ? 'נדחתה' : 'הוקדמה'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="action-group"><button className="action primary" onClick={onClose}>סגור</button></div>
    </Sheet>
  )
}
