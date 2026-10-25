import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

interface Auth {
  /** auth user id (Supabase) or demo profile id */
  userId: string | null
  email?: string
  ready: boolean
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
  /** demo mode only */
  setDemoUser(id: string): void
}

const Ctx = createContext<Auth>(null!)
export const useAuth = () => useContext(Ctx)

const DEMO_KEY = 'home-app:demo-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string>()
  const [ready, setReady] = useState(false)

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
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null)
      setEmail(session?.user.email)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value: Auth = {
    userId, email, ready,
    async signIn(email, password) {
      const { error } = await supabase!.auth.signInWithPassword({ email, password })
      return error ? 'אימייל או סיסמה שגויים' : null
    },
    async signOut() { await supabase?.auth.signOut() },
    setDemoUser(id) {
      try { localStorage.setItem(DEMO_KEY, id) } catch { /* ignore */ }
      setUserId(id)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
