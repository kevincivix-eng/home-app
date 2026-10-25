import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from './lib/auth'
import { PERSON_COLORS, useHousehold } from './lib/household'

const JOIN_KEY = 'home-app:join'

/** Invite code from "?join=CODE" – kept across the email-confirmation round trip */
export function pendingJoinCode(): string {
  try {
    const fromUrl = new URLSearchParams(location.search).get('join')
    if (fromUrl) {
      localStorage.setItem(JOIN_KEY, fromUrl)
      history.replaceState(null, '', location.pathname)
    }
    return localStorage.getItem(JOIN_KEY) ?? ''
  } catch { return '' }
}
export const clearJoinCode = () => { try { localStorage.removeItem(JOIN_KEY) } catch { /* ignore */ } }

function Frame({ title, sub, children, onSubmit }: { title: string; sub?: ReactNode; children: ReactNode; onSubmit?: (e: FormEvent) => void }) {
  return (
    <form className="login" onSubmit={e => { e.preventDefault(); onSubmit?.(e) }}>
      <img className="login-logo" src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="" />
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
      {children}
    </form>
  )
}

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(() => (pendingJoinCode() ? 'signup' : 'login'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ error?: string; info?: string }>({})
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true); setMsg({})
    const e = email.trim()
    if (mode === 'login') setMsg({ error: (await signIn(e, password)) ?? undefined })
    else if (mode === 'signup') {
      const r = await signUp(e, password)
      setMsg(r === 'confirm' ? { info: `שלחנו מייל אישור ל-${e}. לחצו על הקישור במייל ואז התחברו כאן.` } : { error: r ?? undefined })
      if (r === 'confirm') setMode('login')
    } else {
      const r = await resetPassword(e)
      setMsg(r ? { error: r } : { info: 'שלחנו מייל עם קישור לבחירת סיסמה חדשה.' })
    }
    setBusy(false)
  }

  const titles = { login: 'התחברות', signup: 'הרשמה', forgot: 'איפוס סיסמה' }
  return (
    <Frame title="הבית שלנו" sub={pendingJoinCode() ? 'הוזמנתם להצטרף למשק בית – הירשמו או התחברו' : 'ניהול משק הבית, ביחד'} onSubmit={submit}>
      {mode !== 'forgot' && (
        <div className="seg">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>התחברות</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>הרשמה</button>
        </div>
      )}
      {msg.error && <div className="error-banner">{msg.error}</div>}
      {msg.info && <div className="banner" style={{ margin: 0 }}>{msg.info}</div>}
      <div className="list">
        <div className="field"><input type="email" autoComplete="username" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" /></div>
        {mode !== 'forgot' && (
          <div className="field">
            <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'סיסמה (לפחות 6 תווים)' : 'סיסמה'} value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
          </div>
        )}
      </div>
      <button className="btn" disabled={busy || !email || (mode !== 'forgot' && password.length < 6)}>{busy ? '...' : titles[mode]}</button>
      {mode === 'login' && <button type="button" className="link-btn" style={{ fontSize: 15 }} onClick={() => { setMode('forgot'); setMsg({}) }}>שכחתי סיסמה</button>}
      {mode === 'forgot' && <button type="button" className="link-btn" style={{ fontSize: 15 }} onClick={() => { setMode('login'); setMsg({}) }}>חזרה להתחברות</button>}
    </Frame>
  )
}

export function NewPasswordScreen() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <Frame title="סיסמה חדשה" onSubmit={async () => setError(await updatePassword(password))}>
      {error && <div className="error-banner">{error}</div>}
      <div className="list"><div className="field"><input type="password" autoComplete="new-password" placeholder="סיסמה חדשה" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" /></div></div>
      <button className="btn" disabled={password.length < 6}>שמירה</button>
    </Frame>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="chips" style={{ justifyContent: 'center' }}>
      {PERSON_COLORS.map(c => (
        <button key={c} type="button" aria-label={c} onClick={() => onChange(c)}
          style={{ width: 36, height: 36, borderRadius: 18, background: c, outline: c === value ? '3px solid var(--text)' : 'none', outlineOffset: 2 }} />
      ))}
    </div>
  )
}

export function ProfileSetup() {
  const { saveProfile } = useHousehold()
  const { signOut } = useAuth()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PERSON_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  return (
    <Frame title="נעים להכיר" sub="איך לקרוא לך? כך יראו בני הבית מי ביצע כל משימה" onSubmit={() => saveProfile({ name: name.trim(), color }).catch(() => setError('השמירה נכשלה'))}>
      {error && <div className="error-banner">{error}</div>}
      <div className="list"><div className="field"><input placeholder="השם שלך" value={name} onChange={e => setName(e.target.value)} maxLength={40} /></div></div>
      <ColorPicker value={color} onChange={setColor} />
      <button className="btn" disabled={!name.trim()} style={{ background: color }}>המשך</button>
      <button type="button" className="link-btn" style={{ fontSize: 15 }} onClick={signOut}>התנתקות</button>
    </Frame>
  )
}

export function HouseholdSetup({ onCancel, onDone = onCancel }: { onCancel?: () => void; onDone?: () => void }) {
  const { createHousehold, joinHousehold, profile } = useHousehold()
  const { signOut } = useAuth()
  const [code, setCode] = useState(pendingJoinCode)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setError(null)
    const e = await fn()
    if (e) setError(e); else { clearJoinCode(); onDone?.() }
    setBusy(false)
  }
  return (
    <Frame title={`היי ${profile?.name ?? ''}`} sub="הצטרפו למשק בית קיים עם קוד הזמנה, או צרו חדש">
      {error && <div className="error-banner">{error}</div>}
      <div className="section-header">יש לי קוד הזמנה</div>
      <div className="list"><div className="field"><input placeholder="לדוגמה: K7M2QX9P" value={code} onChange={e => setCode(e.target.value.toUpperCase())} dir="ltr" style={{ letterSpacing: 2 }} /></div></div>
      <button type="button" className="btn" disabled={busy || code.trim().length < 6} onClick={() => run(() => joinHousehold(code))}>הצטרפות</button>
      <div className="section-header" style={{ marginTop: 16 }}>או משק בית חדש</div>
      <div className="list"><div className="field"><input placeholder="שם משק הבית (למשל: הבית של קוין ומעין)" value={name} onChange={e => setName(e.target.value)} maxLength={60} /></div></div>
      <button type="button" className="btn secondary" disabled={busy || !name.trim()} onClick={() => run(() => createHousehold(name))}>יצירת משק בית</button>
      {onCancel
        ? <button type="button" className="link-btn" style={{ fontSize: 15 }} onClick={onCancel}>ביטול</button>
        : <button type="button" className="link-btn" style={{ fontSize: 15 }} onClick={signOut}>התנתקות</button>}
    </Frame>
  )
}
