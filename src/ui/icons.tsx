const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const CheckIcon = () => <svg viewBox="0 0 24 24" {...s} strokeWidth={3.2}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const PlusIcon = () => <svg viewBox="0 0 24 24" {...s} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>
export const ChevIcon = () => <svg className="chev" viewBox="0 0 8 14" {...s}><path d="M1 1l6 6-6 6" /></svg>
export const ArrowIcon = ({ dir }: { dir: 'prev' | 'next' }) => (
  // RTL: "previous" points right
  <svg viewBox="0 0 24 24" {...s} strokeWidth={2.4}>{dir === 'prev' ? <path d="M9 5l7 7-7 7" /> : <path d="M15 5l-7 7 7 7" />}</svg>
)
export const GripIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
)
export const TodayTab = () => <svg viewBox="0 0 28 28" {...s} strokeWidth={1.8}><rect x="4" y="4" width="20" height="20" rx="6" /><path d="M9.5 14.5l3 3 6-7" /></svg>
export const CalendarTab = () => <svg viewBox="0 0 28 28" {...s} strokeWidth={1.8}><rect x="4" y="6" width="20" height="18" rx="4" /><path d="M4 11h20M9.5 3.5v5M18.5 3.5v5" /></svg>
export const StatsTab = () => <svg viewBox="0 0 28 28" {...s} strokeWidth={1.8}><path d="M6 23V14M12 23V6M18 23v-6M24 23V10" /></svg>
export const SettingsTab = () => <svg viewBox="0 0 28 28" {...s} strokeWidth={1.8}><path d="M5 8h18M5 14h18M5 20h18" /><circle cx="10" cy="8" r="2.2" fill="var(--tabbar)" /><circle cx="18" cy="14" r="2.2" fill="var(--tabbar)" /><circle cx="12" cy="20" r="2.2" fill="var(--tabbar)" /></svg>
