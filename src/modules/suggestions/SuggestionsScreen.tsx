import { useCallback, useEffect, useMemo, useState } from 'react'
import { relativeDay, toDay } from '../../lib/dates'
import { useHousehold } from '../../lib/household'
import { ChevIcon } from '../../ui/icons'
import { Page } from '../../ui/Page'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { useChores } from '../chores/store'
import { createSuggestionsBackend, STATUS_LABEL, type Suggestion } from './backend'

const isHandled = (s: Suggestion) => s.status === 'done' || s.status === 'declined'

export function SuggestionsScreen({ onBack }: { onBack: () => void }) {
  const { household } = useHousehold()
  const { me, today } = useChores()
  const toast = useToast()
  const backend = useMemo(() => createSuggestionsBackend(household!.id), [household?.id])
  const [list, setList] = useState<Suggestion[]>([])
  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [showHandled, setShowHandled] = useState(false)

  const refresh = useCallback(async () => {
    try { setList(await backend.fetchAll()) } catch (e) { console.error(e); toast({ text: 'טעינת ההצעות נכשלה' }) }
  }, [backend, toast])
  useEffect(() => { refresh(); return backend.subscribe(refresh) }, [backend, refresh])

  const run = async (action: Promise<void>) => {
    try { await action } catch (e) { console.error(e); toast({ text: 'השמירה נכשלה' }) }
    await refresh()
  }

  const send = async () => {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    await run(backend.add({
      id: crypto.randomUUID(), body, created_by: me?.id ?? null, status: 'open',
      reply: null, reviewed_at: null, resolved_at: null, created_at: new Date().toISOString(),
    }))
    toast({ text: 'ההצעה נשמרה' })
  }

  const open = list.filter(s => !isHandled(s))
  const handled = list.filter(isHandled)
  const current = list.find(s => s.id === selected) ?? null
  const row = (s: Suggestion) => <SuggestionRow key={s.id} s={s} today={today} onOpen={() => setSelected(s.id)} />

  return (
    <Page title="הצעות לשיפור" subtitle="מה היה עוזר לכם באפליקציה?" onBack={onBack}>
      <div className="section">
        <div className="list suggestion-compose">
          <textarea
            dir="auto"
            rows={3}
            maxLength={1000}
            placeholder="כתבו כאן מה לשפר או להוסיף"
            aria-label="הצעה חדשה"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
        </div>
        <button className="btn" style={{ marginTop: 10 }} disabled={!draft.trim()} onClick={send}>שליחת ההצעה</button>
      </div>

      {open.length > 0 ? (
        <div className="section">
          <div className="section-header big">פתוחות <span className="count">{open.length}</span></div>
          <div className="list">{open.map(row)}</div>
        </div>
      ) : !handled.length && <div className="empty"><div className="big">💡</div>עוד אין הצעות.</div>}

      {handled.length > 0 && (
        <div className="section">
          <button className={`disclosure${showHandled ? ' open' : ''}`} onClick={() => setShowHandled(!showHandled)} aria-expanded={showHandled}>
            <span className="disclosure-title">טופלו</span>
            <span className="count">{handled.length}</span>
            <span style={{ marginInlineStart: 'auto', display: 'grid' }}><ChevIcon /></span>
          </button>
          {showHandled && <div className="list">{handled.map(row)}</div>}
        </div>
      )}

      <Sheet open={!!current} onClose={() => setSelected(null)}>
        {current && (
          <SuggestionActions
            key={current.id}
            s={current}
            onClose={() => setSelected(null)}
            onUpdate={patch => run(backend.update(current.id, patch))}
            onRemove={() => run(backend.remove(current.id))}
          />
        )}
      </Sheet>
    </Page>
  )
}

function SuggestionRow({ s, today, onOpen }: { s: Suggestion; today: string; onOpen: () => void }) {
  const { profileById } = useChores()
  const author = s.created_by ? profileById(s.created_by)?.name : undefined
  return (
    <button className="cell plain" onClick={onOpen}>
      <div className="cell-body">
        <div className="suggestion-body" dir="auto">{s.body}</div>
        <div className="cell-sub">
          {author && `${author} · `}{relativeDay(toDay(new Date(s.created_at)), today)}
          <span className="pill">{STATUS_LABEL[s.status]}</span>
        </div>
        {s.reply && <div className="suggestion-reply" dir="auto">{s.reply}</div>}
      </div>
    </button>
  )
}

function SuggestionActions({ s, onClose, onUpdate, onRemove }: {
  s: Suggestion
  onClose: () => void
  onUpdate: (patch: Partial<Suggestion>) => void
  onRemove: () => void
}) {
  const [body, setBody] = useState(s.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const changed = body.trim() !== s.body && !!body.trim()
  const act = (patch: Partial<Suggestion>) => { onUpdate(patch); onClose() }
  const resolve = (status: 'done' | 'declined') => act({ status, resolved_at: new Date().toISOString() })
  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>סגירה</button>
        <div className="sheet-title">הצעה</div>
        {/* changed text is a new request, so it comes up for review again */}
        <button className="link-btn bold" disabled={!changed} onClick={() => act({ body: body.trim(), reviewed_at: null })}>שמירה</button>
      </div>
      <div className="list section suggestion-compose">
        <textarea dir="auto" rows={4} maxLength={1000} aria-label="תוכן ההצעה" value={body} onChange={e => setBody(e.target.value)} />
      </div>
      {s.reply && <div className="section-footer" style={{ margin: '0 16px 12px' }} dir="auto">{s.reply}</div>}
      <div className="action-group">
        {isHandled(s)
          ? <button className="action" onClick={() => act({ status: 'open', resolved_at: null, reviewed_at: null })}>פתיחה מחדש</button>
          : (
            <>
              <button className="action" onClick={() => resolve('done')}>סימון כטופלה</button>
              <button className="action" onClick={() => resolve('declined')}>לא ניישם</button>
            </>
          )}
        {confirmDelete
          ? <button className="action destructive primary" onClick={() => { onRemove(); onClose() }}>למחוק לצמיתות?</button>
          : <button className="action destructive" onClick={() => setConfirmDelete(true)}>מחיקה</button>}
      </div>
    </>
  )
}
