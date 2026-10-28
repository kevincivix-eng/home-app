import { useState, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { HouseholdProvider, useHousehold } from './lib/household'
import { AuthScreen, clearJoinCode, HouseholdSetup, NewPasswordScreen, pendingJoinCode, ProfileSetup } from './Onboarding'
import { CalendarScreen } from './modules/chores/CalendarScreen'
import { isOverdue } from './modules/chores/schedule'
import { SettingsScreen } from './modules/chores/SettingsScreen'
import { StatsScreen } from './modules/chores/StatsScreen'
import { ChoresProvider, useChores } from './modules/chores/store'
import { TodayScreen } from './modules/chores/TodayScreen'
import { ShoppingScreen } from './modules/shopping/ShoppingScreen'
import { ShoppingProvider } from './modules/shopping/store'
import { CalendarTab, CartTab, SettingsTab, StatsTab, TodayTab } from './ui/icons'
import { ToastProvider } from './ui/Toast'

/** Each module gets its own tab here */
const TABS: { id: string; label: string; icon: (p: { on?: boolean }) => ReactNode; screen: () => ReactNode }[] = [
  { id: 'today', label: 'היום', icon: TodayTab, screen: TodayScreen },
  { id: 'shopping', label: 'קניות', icon: CartTab, screen: ShoppingScreen },
  { id: 'calendar', label: 'לוח', icon: CalendarTab, screen: CalendarScreen },
  { id: 'stats', label: 'סטטיסטיקה', icon: StatsTab, screen: StatsScreen },
  { id: 'settings', label: 'הגדרות', icon: SettingsTab, screen: SettingsScreen },
]

function Shell() {
  const { tasks, today, loading, error, me } = useChores()
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('tab') ?? 'today' } catch { return 'today' } })
  const go = (id: string) => { setTab(id); try { sessionStorage.setItem('tab', id) } catch { /* ignore */ } }

  if (loading) return null

  const overdue = tasks.filter(t => (!t.owner_id || t.owner_id === me?.id) && isOverdue(t, today)).length
  const Screen = TABS.find(t => t.id === tab)!.screen
  return (
    <div className="app">
      {error && <div className="error-banner" style={{ position: 'fixed', top: 'calc(var(--safe-top) + 4px)', insetInline: 16, zIndex: 50 }}>{error}</div>}
      <Screen key={tab} />
      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.id} className={`tab${t.id === tab ? ' active' : ''}`} onClick={() => go(t.id)}>
            {t.icon({ on: t.id === tab })}
            {t.id === 'today' && overdue > 0 && <span className="badge-dot">{overdue}</span>}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Gate() {
  const { ready, userId, recovering } = useAuth()
  if (!ready) return null
  if (recovering) return <NewPasswordScreen />
  if (!userId) return <AuthScreen />
  return <HouseholdProvider><HouseholdGate /></HouseholdProvider>
}

function HouseholdGate() {
  const { loading, profile, household } = useHousehold()
  // Arrived through an invite link while already in a household
  const [joining, setJoining] = useState(() => !!pendingJoinCode())
  if (loading) return null
  if (!profile) return <ProfileSetup />
  if (!household) return <HouseholdSetup />
  if (joining) return <HouseholdSetup onCancel={() => { clearJoinCode(); setJoining(false) }} />
  return <ChoresProvider key={household.id}><ShoppingProvider><Shell /></ShoppingProvider></ChoresProvider>
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
