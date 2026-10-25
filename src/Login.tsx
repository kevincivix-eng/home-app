import { useState } from 'react'
import { useAuth } from './lib/auth'
import { useChores } from './modules/chores/store'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(await signIn(email.trim(), password))
    setBusy(false)
  }
  return (
    <form className="login" onSubmit={submit}>
      <img className="login-logo" src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="" />
      <h1>הבית שלנו</h1>
      <p>התחברו פעם אחת – האפליקציה תזכור אתכם</p>
      {error && <div className="error-banner">{error}</div>}
      <div className="list">
        <div className="field"><input type="email" autoComplete="username" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" /></div>
        <div className="field"><input type="password" autoComplete="current-password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" /></div>
      </div>
      <button className="btn" disabled={busy || !email || !password}>{busy ? 'מתחבר…' : 'התחברות'}</button>
    </form>
  )
}

/** First sign-in on Supabase: link the auth user to a household name */
export function ProfileSetup() {
  const { userId } = useAuth()
  const { saveProfile, profiles } = useChores()
  const options = [
    { name: 'קוין', color: '#007aff' },
    { name: 'מעין', color: '#ff2d92' },
  ].filter(o => !profiles.some(p => p.name === o.name))
  return (
    <div className="login">
      <h1>מי את/ה?</h1>
      <p>כך נדע מי סימן כל משימה</p>
      {options.map(o => (
        <button key={o.name} className="btn" style={{ background: o.color }} onClick={() => saveProfile({ id: userId!, ...o })}>{o.name}</button>
      ))}
    </div>
  )
}
