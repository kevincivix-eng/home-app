import { useState, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { Login, ProfileSetup } from './Login'
import { CalendarScreen } from './modules/chores/CalendarScreen'
import { isOverdue } from './modules/chores/schedule'
import { SettingsScreen } from './modules/chores/SettingsScreen'
import { StatsScreen } from './modules/chores/StatsScreen'
import { ChoresProvider, useChores } from './modules/chores/store'
import { TodayScreen } from './modules/chores/TodayScreen'
import { CalendarTab, SettingsTab, StatsTab, TodayTab } from './ui/icons'
import { ToastProvider } from './ui/Toast'

/** Future modules (shopping list, ...) get their own tab here */
const TABS: { id: string; label: string; icon: () => ReactNode; screen: () => ReactNode }[] = [
  { id: 'today', label: 'היום', icon: TodayTab, screen: TodayScreen },
  { id: 'calendar', label: 'לוח', icon: CalendarTab, screen: CalendarScreen },
  { id: 'stats', label: 'סטטיסטיקה', icon: StatsTab, screen: StatsScreen },
  { id: 'settings', label: 'הגדרות', icon: SettingsTab, screen: SettingsScreen },
]

function Shell() {
  const { tasks, today, me, loading, error } = useChores()
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('tab') ?? 'today' } catch { return 'today' } })
  const go = (id: string) => { setTab(id); try { sessionStorage.setItem('tab', id) } catch { /* ignore */ } }

  if (loading) return null
  if (supabase && !me) return <ProfileSetup />

  const overdue = tasks.filter(t => isOverdue(t, today)).length
  const Screen = TABS.find(t => t.id === tab)!.screen
  return (
    <div className="app">
      {error && <div className="error-banner" style={{ position: 'fixed', top: 'calc(var(--safe-top) + 4px)', insetInline: 16, zIndex: 50 }}>{error}</div>}
      <Screen key={tab} />
      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.id} className={`tab${t.id === tab ? ' active' : ''}`} onClick={() => go(t.id)}>
            {t.icon()}
            {t.id === 'today' && overdue > 0 && <span className="badge-dot">{overdue}</span>}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Gate() {
  const { ready, userId } = useAuth()
  if (!ready) return null
  if (!userId) return <Login />
  return <ChoresProvider><Shell /></ChoresProvider>
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  )
}
