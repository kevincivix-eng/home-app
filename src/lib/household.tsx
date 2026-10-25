import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEMO_PROFILES } from '../modules/chores/backend'
import type { Profile } from '../modules/chores/types'
import { useAuth } from './auth'
import { supabase } from './supabase'

export interface Household {
  id: string
  name: string
  invite_code: string
  created_by: string | null
}
export type Role = 'owner' | 'member'
export interface Member extends Profile { role: Role }

export const PERSON_COLORS = ['#007aff', '#ff2d92', '#af52de', '#ff9500', '#00a6a6', '#5856d6']

interface HouseholdCtx {
  loading: boolean
  profile: Profile | null
  households: Household[]
  household: Household | null
  members: Member[]
  isOwner: boolean
  saveProfile(p: Omit<Profile, 'id'>): Promise<void>
  createHousehold(name: string): Promise<string | null>
  joinHousehold(code: string): Promise<string | null>
  switchHousehold(id: string): void
  renameHousehold(name: string): Promise<void>
  regenerateInvite(): Promise<void>
  removeMember(userId: string): Promise<void>
  makeOwner(userId: string): Promise<void>
  leave(): Promise<void>
  deleteHousehold(): Promise<void>
}

const Ctx = createContext<HouseholdCtx>(null!)
export const useHousehold = () => useContext(Ctx)

const ACTIVE_KEY = 'home-app:household'
const getActive = () => { try { return localStorage.getItem(ACTIVE_KEY) } catch { return null } }
const setActive = (id: string | null) => { try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY) } catch { /* ignore */ } }

export const inviteLink = (code: string) => `${location.origin}${import.meta.env.BASE_URL}?join=${code}`

/** Demo mode: a fixed household with two people, no server */
const DEMO_HOUSEHOLD: Household = { id: 'demo', name: 'הבית שלנו (דמו)', invite_code: 'DEMO1234', created_by: 'demo-kevin' }

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeId, setActiveId] = useState<string | null>(getActive)
  const [members, setMembers] = useState<Member[]>([])

  const load = useCallback(async () => {
    if (!userId) return
    if (!supabase) {
      setProfile(DEMO_PROFILES.find(p => p.id === userId) ?? DEMO_PROFILES[0])
      setHouseholds([DEMO_HOUSEHOLD])
      setActiveId('demo')
      setMembers(DEMO_PROFILES.map((p, i) => ({ ...p, role: i === 0 ? 'owner' : 'member' })))
      setLoading(false)
      return
    }
    const [{ data: prof }, { data: mships }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('household_members').select('households(*)').eq('user_id', userId),
    ])
    setProfile(prof)
    const hs = ((mships ?? []) as unknown as { households: Household }[]).map(m => m.households).filter(Boolean)
    setHouseholds(hs)
    const active = hs.find(h => h.id === getActive()) ?? hs[0] ?? null
    setActiveId(active?.id ?? null)
    setActive(active?.id ?? null)
    if (active) {
      const { data } = await supabase.from('household_members').select('role, profiles(*)').eq('household_id', active.id)
      setMembers(((data ?? []) as unknown as { role: Role; profiles: Profile }[])
        .filter(m => m.profiles).map(m => ({ ...m.profiles, role: m.role })))
    } else setMembers([])
    setLoading(false)
  }, [userId])

  useEffect(() => { setLoading(true); load() }, [load, activeId])

  // Someone joined / left / renamed → refresh
  useEffect(() => {
    if (!supabase || !activeId) return
    const ch = supabase.channel(`household-${activeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${activeId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'households', filter: `id=eq.${activeId}` }, load)
      .subscribe()
    return () => { supabase!.removeChannel(ch) }
  }, [activeId, load])

  const household = households.find(h => h.id === activeId) ?? null
  const isOwner = members.some(m => m.id === userId && m.role === 'owner')
  const sb = supabase!

  const value: HouseholdCtx = {
    loading, profile, households, household, members, isOwner,

    async saveProfile(p) {
      if (!supabase) return
      const { error } = await sb.from('profiles').upsert({ id: userId!, ...p })
      if (error) throw error
      await load()
    },
    async createHousehold(name) {
      const { data, error } = await sb.rpc('create_household', { p_name: name })
      if (error) return 'לא הצלחנו ליצור משק בית'
      setActive(data.id); setActiveId(data.id)
      await load()
      return null
    },
    async joinHousehold(code) {
      const { data, error } = await sb.rpc('join_household', { p_code: code })
      if (error) return error.message.includes('invalid') ? 'קוד ההזמנה לא נמצא' : 'לא הצלחנו להצטרף'
      setActive(data.id); setActiveId(data.id)
      await load()
      return null
    },
    switchHousehold(id) { setActive(id); setActiveId(id) },
    async renameHousehold(name) {
      await sb.from('households').update({ name: name.trim() }).eq('id', activeId!)
      await load()
    },
    async regenerateInvite() {
      await sb.rpc('regenerate_invite', { p_household: activeId })
      await load()
    },
    async removeMember(uid) {
      await sb.from('household_members').delete().eq('household_id', activeId!).eq('user_id', uid)
      await load()
    },
    async makeOwner(uid) {
      await sb.from('household_members').update({ role: 'owner' }).eq('household_id', activeId!).eq('user_id', uid)
      await load()
    },
    async leave() {
      await sb.from('household_members').delete().eq('household_id', activeId!).eq('user_id', userId!)
      setActive(null); setActiveId(null)
      await load()
    },
    async deleteHousehold() {
      await sb.from('households').delete().eq('id', activeId!)
      setActive(null); setActiveId(null)
      await load()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
