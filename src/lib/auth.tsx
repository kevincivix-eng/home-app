import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

interface Auth {
  /** auth user id (Supabase) or demo profile id */
  userId: string | null
  email?: string
  ready: boolean
  /** user arrived from a password-reset email and must choose a new password */
  recovering: boolean
  signIn(email: string, password: string): Promise<string | null>
  /** returns error, or 'confirm' when an email confirmation was sent */
  signUp(email: string, password: string): Promise<string | null>
  resetPassword(email: string): Promise<string | null>
  updatePassword(password: string): Promise<string | null>
  signOut(): Promise<void>
  /** demo mode only */
  setDemoUser(id: string): void
}

const Ctx = createContext<Auth>(null!)
export const useAuth = () => useContext(Ctx)

const DEMO_KEY = 'home-app:demo-user'
const appUrl = () => `${location.origin}${import.meta.env.BASE_URL}`

function translate(msg: string): string {
  if (/invalid login/i.test(msg)) return 'אימייל או סיסמה שגויים'
  if (/not confirmed/i.test(msg)) return 'צריך לאשר את כתובת המייל – בדקו את תיבת הדואר'
  if (/already registered|already exists/i.test(msg)) return 'כבר קיים חשבון עם המייל הזה'
  if (/password.*(6|characters|short)/i.test(msg)) return 'הסיסמה צריכה להכיל לפחות 6 תווים'
  if (/rate limit|too many/i.test(msg)) return 'יותר מדי ניסיונות, נסו שוב בעוד כמה דקות'
  if (/invalid.*email|email.*invalid/i.test(msg)) return 'כתובת מייל לא תקינה'
  return 'משהו השתבש, נסו שוב'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string>()
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) {
      let id = 'demo-kevin'
      try { id = localStorage.getItem(DEMO_KEY) ?? id } catch { /* ignore */ }
      setUserId(id)
      setReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
      setEmail(data.session?.user.email)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setUserId(session?.user.id ?? null)
      setEmail(session?.user.email)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value: Auth = {
    userId, email, ready, recovering,
    async signIn(email, password) {
      const { error } = await supabase!.auth.signInWithPassword({ email, password })
      return error ? translate(error.message) : null
    },
    async signUp(email, password) {
      const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } })
      if (error) return translate(error.message)
      return data.session ? null : 'confirm'
    },
    async resetPassword(email) {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: appUrl() })
      return error ? translate(error.message) : null
    },
    async updatePassword(password) {
      const { error } = await supabase!.auth.updateUser({ password })
      if (error) return translate(error.message)
      setRecovering(false)
      return null
    },
    async signOut() { await supabase?.auth.signOut() },
    setDemoUser(id) {
      try { localStorage.setItem(DEMO_KEY, id) } catch { /* ignore */ }
      setUserId(id)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
